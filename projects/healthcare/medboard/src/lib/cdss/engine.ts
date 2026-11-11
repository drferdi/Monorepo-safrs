/**
 * Iskandar Diagnosis Engine V2 — LLM-First Architecture
 *
 * Menggantikan V1 (keyword/IDF matcher) dengan pendekatan LLM-first:
 * - DeepSeek Reasoner sebagai reasoner utama
 * - penyakit.json (159 penyakit KKI) sebagai grounding knowledge base
 * - Structured JSON output — tidak ada string parsing fragile
 * - Red flag detection embedded dalam LLM prompt + hardcoded vitals check
 * - Pipeline lean: Load KB → Build prompt → LLM → Parse → Return
 *
 * Interface output backward compatible dengan EMR page (CDSSEngineResult).
 */

import 'server-only'

import { assessConsciousnessSeverity, getBestGCSTotal } from '../vitals/avpu-gcs-mapper'
import { detectEarlyWarningPatterns, earlyWarningsToRedFlags } from './early-warning-patterns'
import { embeddingFilterDiseases, isEmbeddingReady } from './embedding-filter'
import {
  applyHybridDecisioning,
  buildEmptyValidationSummary,
  buildProblemRepresentation,
  mergeDiseaseCandidates,
} from './hybrid'
import { calculateNEWS2, news2ToRedFlags } from './news2'
import { type FilteredDisease, getKBStats, preFilterDiseases } from './pre-filter'
import { detectSymphonySafetyGateRedFlags } from './symphony-safety-gates'
import type { CDSSAlert, CDSSEngineInput, CDSSEngineResult, ValidatedSuggestion } from './types'
import { validateLLMSuggestions } from './validation'

const SchemaType = {
  OBJECT: 'object',
  ARRAY: 'array',
  STRING: 'string',
  NUMBER: 'number',
  INTEGER: 'integer',
} as const

type Schema = Record<string, unknown>

// ── Circuit Breaker for DeepSeek ──────────────────────────────────────────────

const CIRCUIT_BREAKER_THRESHOLD = 3
const CIRCUIT_BREAKER_COOLDOWN_MS = 5 * 60 * 1000 // 5 minutes

let _dsConsecutiveFailures = 0
let _dsCircuitOpenedAt = 0

function isDeepSeekCircuitOpen(): boolean {
  if (_dsConsecutiveFailures < CIRCUIT_BREAKER_THRESHOLD) return false
  if (Date.now() - _dsCircuitOpenedAt > CIRCUIT_BREAKER_COOLDOWN_MS) {
    // Cooldown expired, allow retry (half-open state)
    _dsConsecutiveFailures = 0
    return false
  }
  return true
}

function recordDeepSeekSuccess(): void {
  _dsConsecutiveFailures = 0
}

function recordDeepSeekFailure(): void {
  _dsConsecutiveFailures++
  if (_dsConsecutiveFailures >= CIRCUIT_BREAKER_THRESHOLD) {
    _dsCircuitOpenedAt = Date.now()
  }
}

// ── DeepSeek Reasoner ─────────────────────────────────────────────────────────

type DeepSeekResult = {
  response: LLMResponse
  reasoning_content?: string
}

type LLMResponse = {
  suggestions?: Array<{
    rank?: number
    icd10_code?: string
    diagnosis_name?: string
    confidence?: number
    reasoning?: string
    key_reasons?: string[]
    missing_information?: string[]
    red_flags?: string[]
    recommended_actions?: string[]
  }>
  clinical_red_flags?: Array<{
    severity?: string
    condition?: string
    action?: string
    criteria_met?: string[]
  }>
  overall_confidence?: number
  data_quality_note?: string
}

async function callDeepSeekReasoner(prompt: string): Promise<DeepSeekResult> {
  const apiKey = process.env.DEEPSEEK_API_KEY
  if (!apiKey) throw new Error('DEEPSEEK_API_KEY tidak dikonfigurasi')

  if (isDeepSeekCircuitOpen()) {
    throw new Error('DeepSeek circuit breaker OPEN — cooldown aktif setelah kegagalan beruntun')
  }

  const systemPrompt = `Kamu adalah Iskandar Engine V2 — sistem Clinical Decision Support untuk dokter umum di Puskesmas Indonesia. Jawab HANYA dalam JSON valid sesuai schema yang diminta. Jangan tambahkan markdown, komentar, atau teks di luar JSON.`

  const response = await fetch('https://api.deepseek.com/chat/completions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model: 'deepseek-reasoner',
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: prompt },
      ],
      temperature: 0.2,
      max_tokens: 4096,
    }),
    signal: AbortSignal.timeout(30000),
  })

  if (!response.ok) {
    recordDeepSeekFailure()
    const err = await response.text()
    throw new Error(`DeepSeek API error ${response.status}: ${err.slice(0, 200)}`)
  }

  const data = (await response.json()) as {
    choices: Array<{
      message: { content: string; reasoning_content?: string }
    }>
  }

  const content = data.choices?.[0]?.message?.content ?? '{}'
  const reasoningContent = data.choices?.[0]?.message?.reasoning_content

  // Strip markdown fences jika ada
  const clean = content
    .replace(/^```(?:json)?\s*/i, '')
    .replace(/\s*```$/i, '')
    .trim()

  try {
    const parsed = JSON.parse(clean) as LLMResponse
    recordDeepSeekSuccess()
    return { response: parsed, reasoning_content: reasoningContent }
  } catch {
    // Recovery: extract JSON object via regex if direct parse fails
    const jsonMatch = clean.match(/\{[\s\S]*\}/)
    if (jsonMatch) {
      const parsed = JSON.parse(jsonMatch[0]) as LLMResponse
      recordDeepSeekSuccess()
      return { response: parsed, reasoning_content: reasoningContent }
    }
    recordDeepSeekFailure()
    throw new Error('DeepSeek returned non-JSON response')
  }
}

// ── Knowledge Base Context Builder ───────────────────────────────────────────

function buildKBContext(diseases: FilteredDisease[]): string {
  return diseases
    .map(d => {
      const gejala = d.gejala.slice(0, 8).join(', ')
      const redFlags = d.red_flags.slice(0, 3).join(', ')
      const banding = d.diagnosis_banding.slice(0, 3).join(', ')
      return `${d.icd10} | ${d.nama} | ${d.definisi.substring(0, 120)} | Gejala: ${gejala}${redFlags ? ` | Red flags: ${redFlags}` : ''}${banding ? ` | Banding: ${banding}` : ''}`
    })
    .join('\n')
}

// ── Hardcoded Vital Signs Red Flag Check ──────────────────────────────────────

function checkVitalRedFlags(input: CDSSEngineInput): CDSSEngineResult['red_flags'] {
  const flags: CDSSEngineResult['red_flags'] = []
  const v = input.vital_signs
  if (!v) return flags

  if (v.systolic !== undefined) {
    if (v.systolic >= 180) {
      flags.push({
        severity: 'emergency',
        condition: 'Hipertensi Krisis',
        action: 'Stabilisasi segera, rujuk emergensi',
        criteria_met: [`Sistolik ${v.systolic} mmHg ≥ 180`],
        icd_codes: ['I10'],
      })
    } else if (v.systolic < 90 && v.systolic > 0) {
      flags.push({
        severity: 'emergency',
        condition: 'Hipotensi / Suspek Syok',
        action: 'Pasang IV line, cairan kristaloid, rujuk emergensi',
        criteria_met: [`Sistolik ${v.systolic} mmHg < 90`],
      })
    }
  }
  if (v.diastolic !== undefined && v.diastolic >= 120) {
    flags.push({
      severity: 'emergency',
      condition: 'Hipertensi Emergensi (Diastolik)',
      action: 'Evaluasi kerusakan organ target, stabilisasi, rujuk emergensi',
      criteria_met: [`Diastolik ${v.diastolic} mmHg ≥ 120`],
      icd_codes: ['I10'],
    })
  }
  if (v.spo2 !== undefined && v.spo2 < 90 && v.spo2 > 0) {
    flags.push({
      severity: 'emergency',
      condition: 'Hipoksia Berat',
      action: 'Oksigen segera, posisi semi-Fowler, rujuk',
      criteria_met: [`SpO2 ${v.spo2}% < 90`],
    })
  }
  if (v.heart_rate !== undefined) {
    if (v.heart_rate > 140) {
      flags.push({
        severity: 'urgent',
        condition: 'Takikardia Berat',
        action: 'EKG segera, evaluasi penyebab',
        criteria_met: [`HR ${v.heart_rate} x/mnt > 140`],
      })
    } else if (v.heart_rate < 45 && v.heart_rate > 0) {
      flags.push({
        severity: 'urgent',
        condition: 'Bradikardia Berat',
        action: 'EKG segera, atropin stand-by',
        criteria_met: [`HR ${v.heart_rate} x/mnt < 45`],
      })
    }
  }
  if (v.temperature !== undefined) {
    if (v.temperature >= 40) {
      flags.push({
        severity: 'urgent',
        condition: 'Hiperpireksia',
        action: 'Antipiretik agresif, cari sumber infeksi, pertimbangkan rujukan',
        criteria_met: [`Suhu ${v.temperature}°C ≥ 40`],
      })
    } else if (v.temperature < 35 && v.temperature > 0) {
      flags.push({
        severity: 'urgent',
        condition: 'Hipotermia',
        action:
          'Evaluasi penyebab (sepsis, hipotiroid, paparan dingin), rewarming, monitoring ketat',
        criteria_met: [`Suhu ${v.temperature}°C < 35`],
      })
    }
  }
  if (v.respiratory_rate !== undefined) {
    if (v.respiratory_rate > 30) {
      flags.push({
        severity: 'urgent',
        condition: 'Takipnea Berat',
        action: 'Evaluasi distress napas, oksigenasi, rujukan perlu dipertimbangkan',
        criteria_met: [`RR ${v.respiratory_rate} x/mnt > 30`],
      })
    } else if (v.respiratory_rate < 8 && v.respiratory_rate > 0) {
      flags.push({
        severity: 'emergency',
        condition: 'Bradipnea / Depresi Napas',
        action: 'Bantu napas, cek GCS, rujuk emergensi',
        criteria_met: [`RR ${v.respiratory_rate} x/mnt < 8`],
      })
    }
  }

  // Phase 1A: Consciousness (AVPU + GCS) red flag checks
  if (v.avpu !== undefined) {
    const severity = assessConsciousnessSeverity(v.avpu, v.gcs)
    const gcsTotal = getBestGCSTotal(v.avpu, v.gcs)

    // Label GCS correctly: "terukur" jika GCS asli tersedia, "estimasi" jika dari AVPU
    const gcsLabel = v.gcs ? `GCS terukur: ${gcsTotal}` : `GCS estimasi dari AVPU: ${gcsTotal}`

    if (severity === 'unresponsive') {
      flags.push({
        severity: 'emergency',
        condition: 'Penurunan Kesadaran Berat — Tidak Responsif',
        action: 'Amankan airway, posisi recovery, cek GCS serial, rujuk emergensi SEGERA',
        criteria_met: [
          `AVPU: ${v.avpu} (Unresponsive)`,
          gcsLabel,
          'Indikasi intubasi jika GCS ≤ 8',
        ],
      })
    } else if (severity === 'severe') {
      flags.push({
        severity: 'emergency',
        condition: 'Penurunan Kesadaran Berat',
        action:
          'Evaluasi penyebab (hipoglikemia, stroke, sepsis, intoksikasi), amankan airway, rujuk segera',
        criteria_met: [`AVPU: ${v.avpu}`, gcsLabel, 'Ambang intubasi: GCS ≤ 8'],
      })
    } else if (severity === 'impaired') {
      flags.push({
        severity: 'urgent',
        condition: 'Penurunan Kesadaran Ringan-Sedang',
        action:
          'Cek glukosa darah, evaluasi neurologis, monitoring ketat, GCS serial tiap 30 menit',
        criteria_met: [
          `AVPU: ${v.avpu}`,
          gcsLabel,
          v.avpu === 'C'
            ? 'New confusion — pertimbangkan delirium/sepsis/stroke'
            : 'Merespons suara',
        ],
      })
    }
  }

  // Phase 1A: Pain score red flag
  if (v.pain_score !== undefined && v.pain_score >= 8) {
    flags.push({
      severity: 'urgent',
      condition: 'Nyeri Berat',
      action:
        'Analgesik segera, evaluasi penyebab (abdomen akut, ACS, kolik renal), pertimbangkan rujukan',
      criteria_met: [`Skala nyeri ${v.pain_score}/10 (berat)`],
    })
  }

  return flags
}

// ── Structured Output Schema ────────────────────────────────────────────────

const DIAGNOSIS_SCHEMA: Schema = {
  type: SchemaType.OBJECT,
  properties: {
    suggestions: {
      type: SchemaType.ARRAY,
      items: {
        type: SchemaType.OBJECT,
        properties: {
          rank: { type: SchemaType.INTEGER },
          icd10_code: { type: SchemaType.STRING },
          diagnosis_name: { type: SchemaType.STRING },
          confidence: { type: SchemaType.NUMBER, description: '0.0 - 1.0' },
          reasoning: { type: SchemaType.STRING },
          key_reasons: {
            type: SchemaType.ARRAY,
            items: { type: SchemaType.STRING },
          },
          missing_information: {
            type: SchemaType.ARRAY,
            items: { type: SchemaType.STRING },
          },
          red_flags: {
            type: SchemaType.ARRAY,
            items: { type: SchemaType.STRING },
          },
          recommended_actions: {
            type: SchemaType.ARRAY,
            items: { type: SchemaType.STRING },
          },
        },
        required: ['rank', 'icd10_code', 'diagnosis_name', 'confidence', 'reasoning'],
      },
    },
    clinical_red_flags: {
      type: SchemaType.ARRAY,
      items: {
        type: SchemaType.OBJECT,
        properties: {
          severity: {
            type: SchemaType.STRING,
            description: 'emergency | urgent | warning',
          },
          condition: { type: SchemaType.STRING },
          action: { type: SchemaType.STRING },
          criteria_met: {
            type: SchemaType.ARRAY,
            items: { type: SchemaType.STRING },
          },
        },
        required: ['severity', 'condition', 'action', 'criteria_met'],
      },
    },
    overall_confidence: { type: SchemaType.NUMBER },
    data_quality_note: { type: SchemaType.STRING },
  },
  required: ['suggestions', 'clinical_red_flags', 'overall_confidence'],
}

// ── Prompt Builder ────────────────────────────────────────────────────────────

export function buildPrompt(
  input: CDSSEngineInput,
  kbContext: string,
  problemRepresentation: string
): string {
  const vitalsText = input.vital_signs
    ? Object.entries(input.vital_signs)
        .filter(([, v]) => v !== undefined && v !== null)
        .map(([k, v]) => `${k}: ${v}`)
        .join(', ')
    : 'Tidak tersedia'

  const chronics = input.chronic_diseases?.join(', ') || 'Tidak ada'
  const allergies = input.allergies?.join(', ') || 'Tidak ada'
  const pregnant = input.is_pregnant ? 'Ya' : 'Tidak'
  const drugs = input.current_drugs?.join(', ') || 'Tidak ada'
  const assessmentConclusion = input.assessment_conclusion?.trim() || 'Belum ada sintesis dokter'

  // Phase 3: Structured bedside triage signs block
  const structuredSignsBlock = input.structured_signs_text
    ? `
## Tanda Klinis Terstruktur (bedside/Assist)
${input.structured_signs_text}

INSTRUKSI TAMBAHAN: Pertimbangkan tanda klinis terstruktur di atas saat mengidentifikasi red flags dan menentukan urgency. Jika ada tanda syok, distress pernapasan, HMOD, atau DKA/HHS, prioritaskan kondisi tersebut dalam asesmen.`
    : ''

  const deteriorationBlock = input.deterioration_summary_text
    ? `
## Ringkasan Deteriorasi Komposit
${input.deterioration_summary_text}

INSTRUKSI TAMBAHAN: Gunakan ringkasan deteriorasi komposit ini sebagai sinyal eskalasi bedside/trend. Jika ada composite alert dengan severity tinggi/kritis, naikkan urgency differential dan action plan sesuai bukti klinisnya. Watcher menunjukkan pola yang perlu dimonitor, bukan diagnosis pasti.`
    : ''

  // Phase 3: Trajectory context block (appended if available)
  const trajectoryBlock = input.trajectory_context
    ? `
## Konteks Trajectory Klinis (${input.trajectory_context.visitCount ?? '?'} kunjungan terakhir)
- Momentum: ${input.trajectory_context.momentumLevel}
- Pola konvergensi: ${input.trajectory_context.convergencePattern} (skor: ${input.trajectory_context.convergenceScore})
- Parameter memburuk: ${input.trajectory_context.worseningParams.join(', ') || 'tidak ada'}
- Akselerasi: ${input.trajectory_context.isAccelerating ? 'Ya — perburukan makin cepat' : 'Tidak'}
- Estimasi waktu ke kritis: ${input.trajectory_context.timeToCriticalDays !== null ? `~${input.trajectory_context.timeToCriticalDays} hari` : 'Tidak tersedia'}
- Respons terapi: ${input.trajectory_context.treatmentResponseNote}
- Ringkasan momentum: ${input.trajectory_context.narrative}

INSTRUKSI TAMBAHAN: Pertimbangkan trajectory klinis di atas dalam asesmen urgency dan rekomendasi. Jika momentum menunjukkan akselerasi atau konvergensi, tingkatkan urgency rekomendasi sesuai.`
    : ''

  const assistTrajectoryBlock = input.trajectory_summary_text
    ? `
## Ringkasan Trajectory dari Assist
${input.trajectory_summary_text}

INSTRUKSI TAMBAHAN: Ringkasan ini dihitung oleh Assist dan tidak memuat momentum, pola konvergensi, atau parameter yang memburuk; jangan menyimpulkan hal-hal itu darinya. Pertimbangkan trend dan status perburukan di atas dalam asesmen urgency.`
    : ''

  return `Kamu adalah Iskandar Engine V2 — sistem Clinical Decision Support untuk dokter umum di Puskesmas Indonesia.

## Data Pasien
- Problem representation: ${problemRepresentation}
- Sintesis asesmen dokter: ${assessmentConclusion}
- Keluhan utama: ${input.keluhan_utama}
- Keluhan tambahan: ${input.keluhan_tambahan || 'Tidak ada'}
- Usia: ${input.usia} tahun
- Jenis kelamin: ${input.jenis_kelamin === 'L' ? 'Laki-laki' : 'Perempuan'}
- Tanda vital: ${vitalsText}
- Penyakit kronik: ${chronics}
- Alergi: ${allergies}
- Hamil: ${pregnant}
- Obat saat ini: ${drugs}
${structuredSignsBlock}${deteriorationBlock}${trajectoryBlock}${assistTrajectoryBlock}
## Database Penyakit KKI — Pre-filtered berdasarkan keluhan (Format: ICD10 | Nama | Definisi singkat | Gejala | Red flags | Banding)
${kbContext}

## Instruksi
Berikan diagnosis diferensial berdasarkan keluhan pasien di atas. HANYA gunakan ICD-10 dan nama penyakit yang ada di database KKI di atas — JANGAN fabrikasi kode atau nama di luar database.

Berikan 2-5 diagnosis diferensial (minimum 2, maksimum 5). Urutkan dari yang paling probable, tetapi tetap tampilkan kondisi penting yang tidak boleh terlewat jika ada.

Confidence harus realistis: 0.1 = sangat tidak yakin, 0.5 = mungkin, 0.8 = cukup yakin, 0.9 = sangat yakin. Jika data pasien terbatas, tetap beri minimal 2 suggestion.

Juga identifikasi clinical red flags berdasarkan keluhan dan tanda vital — kondisi yang memerlukan tindakan segera atau rujukan emergensi.

Jika data klinis belum cukup, jelaskan missing information yang paling bernilai untuk menguji differential diagnosis.`
}

// ── Alert Builder ─────────────────────────────────────────────────────────────

let _alertCounter = 0
function makeAlertId(): string {
  return `alert-${Date.now()}-${++_alertCounter}`
}

function buildAlerts(redFlags: CDSSEngineResult['red_flags'], avgConfidence: number): CDSSAlert[] {
  const alerts: CDSSAlert[] = []

  for (const flag of redFlags) {
    alerts.push({
      id: makeAlertId(),
      type: flag.severity === 'emergency' || flag.severity === 'urgent' ? 'red_flag' : 'vital_sign',
      severity:
        flag.severity === 'emergency'
          ? 'emergency'
          : flag.severity === 'urgent'
            ? 'high'
            : 'medium',
      title: flag.condition,
      message: flag.criteria_met.join('; '),
      icd_codes: flag.icd_codes,
      action: flag.action,
    })
  }

  if (avgConfidence < 0.3 && avgConfidence > 0) {
    alerts.push({
      id: makeAlertId(),
      type: 'low_confidence',
      severity: 'info',
      title: 'Kepercayaan Rendah',
      message:
        'Saran diagnosis memiliki tingkat kepercayaan rendah. Pertimbangkan anamnesis tambahan.',
    })
  }

  alerts.push({
    id: makeAlertId(),
    type: 'guideline',
    severity: 'info',
    title: 'Disclaimer',
    message: 'Ini adalah alat bantu keputusan klinis. Keputusan akhir ada pada dokter.',
  })

  return alerts
}

// ── Fallback (no AI) ──────────────────────────────────────────────────────────

function buildFallbackResult(
  input: CDSSEngineInput,
  vitalRedFlags: CDSSEngineResult['red_flags'],
  startTime: number,
  reason: string
): CDSSEngineResult {
  const alerts = buildAlerts(vitalRedFlags, 0)
  alerts.unshift({
    id: makeAlertId(),
    type: 'validation_warning',
    severity: 'medium',
    title: 'Engine AI Tidak Tersedia',
    message: `Diagnosis AI tidak dapat dijalankan: ${reason}. Lakukan anamnesis manual.`,
  })

  return {
    suggestions: [],
    red_flags: vitalRedFlags,
    alerts,
    processing_time_ms: Date.now() - startTime,
    source: 'error',
    model_version: 'IDE-V2-FALLBACK',
    validation_summary: {
      ...buildEmptyValidationSummary(),
      warnings: [reason],
    },
    next_best_questions: [
      'Lengkapi anamnesis inti, durasi, dan progresivitas keluhan.',
      'Pastikan tanda vital utama tersedia sebelum mengambil keputusan klinis.',
    ],
  }
}

// ── Main Engine ───────────────────────────────────────────────────────────────

export async function runDiagnosisEngine(input: CDSSEngineInput): Promise<CDSSEngineResult> {
  const startTime = Date.now()
  const problemRepresentation = buildProblemRepresentation(input)
  const retrievalContext =
    [input.keluhan_tambahan?.trim(), input.assessment_conclusion?.trim()]
      .filter(Boolean)
      .join('. ') || undefined

  // 1. Hardcoded vital signs red flags (tidak butuh LLM)
  const vitalRedFlags = checkVitalRedFlags(input)

  // 1a. Symphony deterministic safety gates: PE suspect (GATE_9_PE) and
  //     Anaphylaxis (GATE_10_ANAPHYLAXIS). Net-new canonical gates from
  //     Phase A.1/A.2 of the 5-mandate roadmap. Strictly additive.
  const symphonySafetyGateFlags = detectSymphonySafetyGateRedFlags(input)

  // 1b. NEWS2 composite scoring (graduated early detection)
  // Pass consciousness + supplemental O2 + COPD status for complete NEWS2
  const news2 = calculateNEWS2({
    vitals: input.vital_signs,
    avpu: input.vital_signs?.avpu,
    supplementalO2: input.vital_signs?.supplemental_o2,
    hasCOPD: input.vital_signs?.has_copd,
  })
  const news2Flags = news2ToRedFlags(news2)

  // 1c. Disease-specific early warning patterns
  const earlyWarnings = detectEarlyWarningPatterns(input, news2)
  const earlyWarningFlags = earlyWarningsToRedFlags(earlyWarnings)

  void DIAGNOSIS_SCHEMA

  // 2. Check at least one reasoning provider tersedia
  const hasDeepSeek = !!process.env.DEEPSEEK_API_KEY
  if (!hasDeepSeek) {
    // Even without AI, NEWS2 + early warning patterns + Symphony safety gates still work
    const fallbackFlags = [
      ...vitalRedFlags,
      ...symphonySafetyGateFlags,
      ...earlyWarningFlags,
      ...news2Flags,
    ]
    return buildFallbackResult(
      input,
      fallbackFlags,
      startTime,
      'DEEPSEEK_API_KEY tidak dikonfigurasi'
    )
  }

  // 3. Candidate retrieval: keyword-first + semantic enrichment
  const keywordDiseases = preFilterDiseases(input.keluhan_utama, retrievalContext, 15)

  let semanticDiseases: FilteredDisease[] = []
  const retrievalWarnings: string[] = []
  if (isEmbeddingReady()) {
    try {
      semanticDiseases = await embeddingFilterDiseases(input.keluhan_utama, retrievalContext, 15)
    } catch (e) {
      const msg = e instanceof Error ? e.message : 'Embedding API error'
      retrievalWarnings.push(`Semantic retrieval gagal: ${msg}. Engine memakai keyword retrieval.`)
    }
  } else {
    retrievalWarnings.push('Embedding vectors belum tersedia. Engine memakai keyword retrieval.')
  }

  const diseaseCandidates = mergeDiseaseCandidates(keywordDiseases, semanticDiseases, 18)
  const diseases = diseaseCandidates.map(candidate => candidate.disease)

  if (diseases.length === 0) {
    return buildFallbackResult(input, vitalRedFlags, startTime, 'Knowledge base tidak dapat dimuat')
  }

  // 4. Build prompt (hanya kirim penyakit yang relevan)
  const kbContext = buildKBContext(diseases)
  const prompt = buildPrompt(input, kbContext, problemRepresentation)

  // 5. Call reasoning LLM: DeepSeek Reasoner only
  let parsed: LLMResponse | null = null
  let modelUsed = 'deepseek-reasoner'
  let reasoningContent: string | undefined

  // 5a. Try DeepSeek Reasoner
  try {
    const dsResult = await callDeepSeekReasoner(prompt)
    parsed = dsResult.response
    reasoningContent = dsResult.reasoning_content
  } catch (dsErr) {
    const dsMsg = dsErr instanceof Error ? dsErr.message : 'DeepSeek error'
    return buildFallbackResult(input, vitalRedFlags, startTime, `DeepSeek: ${dsMsg}`)
  }

  if (!parsed) {
    return buildFallbackResult(input, vitalRedFlags, startTime, 'LLM tidak mengembalikan output')
  }

  // 6. Map LLM suggestions ke ValidatedSuggestion[]
  const rawSuggestions = (parsed.suggestions ?? []).slice(0, 5)
  const totalRawSuggestions = rawSuggestions.length
  const mappingWarnings: string[] = []
  const mappedSuggestions: Omit<ValidatedSuggestion, 'rag_verified'>[] = rawSuggestions
    .map((s, i) => ({
      rank: s.rank ?? i + 1,
      llm_rank: s.rank ?? i + 1,
      icd10_code: s.icd10_code ?? '',
      diagnosis_name: s.diagnosis_name ?? '',
      confidence: Math.min(1, Math.max(0, s.confidence ?? 0)),
      reasoning: s.reasoning ?? '',
      key_reasons: s.key_reasons ?? [],
      missing_information: s.missing_information ?? [],
      red_flags: s.red_flags ?? [],
      recommended_actions: s.recommended_actions ?? [],
    }))
    .filter(suggestion => {
      const hasCoreFields = Boolean(
        suggestion.icd10_code.trim() && suggestion.diagnosis_name.trim()
      )
      if (!hasCoreFields) {
        mappingWarnings.push(
          `Suggestion #${suggestion.rank} dibuang karena ICD-10 atau nama diagnosis kosong.`
        )
      }
      return hasCoreFields
    })

  const validation = validateLLMSuggestions(input, mappedSuggestions)
  const hybrid = applyHybridDecisioning(input, validation, diseaseCandidates)
  const suggestions = hybrid.suggestions

  // 7. Merge red flags: vitals (hardcoded) + LLM clinical flags
  const llmRedFlags: CDSSEngineResult['red_flags'] = (parsed.clinical_red_flags ?? []).map(f => ({
    severity: (f.severity as 'emergency' | 'urgent' | 'warning') ?? 'warning',
    condition: f.condition ?? 'Kondisi kritis tidak teridentifikasi',
    action: f.action ?? 'Evaluasi klinis segera',
    criteria_met: f.criteria_met ?? [],
  }))

  // Merge all red flags: vitals → symphony safety gates → early warning → NEWS2 → LLM
  // (deduplicate by condition). Symphony safety gates come first after vitals because
  // they are deterministic net-new gates (PE suspect, Anaphylaxis) from the 5-mandate
  // roadmap and must never be pre-empted by later sources.
  const existingConditions = new Set(vitalRedFlags.map(f => f.condition))
  const mergedRedFlags = [...vitalRedFlags]

  for (const flag of [
    ...symphonySafetyGateFlags,
    ...earlyWarningFlags,
    ...news2Flags,
    ...llmRedFlags,
  ]) {
    if (!existingConditions.has(flag.condition)) {
      existingConditions.add(flag.condition)
      mergedRedFlags.push(flag)
    }
  }

  // 8. Build alerts
  const avgConfidence =
    suggestions.length > 0
      ? suggestions.reduce((sum, s) => sum + s.confidence, 0) / suggestions.length
      : 0
  const alerts = buildAlerts(mergedRedFlags, avgConfidence)

  const warnings: string[] = []
  if (parsed.data_quality_note) warnings.push(parsed.data_quality_note)
  warnings.push(...retrievalWarnings)
  warnings.push(...mappingWarnings)
  warnings.push(...validation.warnings)

  if (validation.total_validated < totalRawSuggestions) {
    alerts.unshift({
      id: makeAlertId(),
      type: 'validation_warning',
      severity: validation.total_validated === 0 ? 'high' : 'medium',
      title: 'Validasi KB Parsial',
      message: `${validation.total_validated}/${totalRawSuggestions} suggestion lolos validasi ICD, nama diagnosis, dan plausibility klinis.`,
    })
  }

  if (hybrid.requiresMoreData) {
    alerts.unshift({
      id: makeAlertId(),
      type: 'validation_warning',
      severity: 'info',
      title: 'Data Tambahan Diperlukan',
      message:
        'Diagnosis kerja masih perlu dikonfirmasi dengan anamnesis atau pemeriksaan tambahan.',
    })
  }

  return {
    suggestions,
    red_flags: mergedRedFlags,
    alerts,
    processing_time_ms: Date.now() - startTime,
    source: 'ai',
    model_version: `IDE-V2 (${modelUsed})`,
    validation_summary: {
      total_raw: totalRawSuggestions,
      total_validated: validation.total_validated,
      recommended_count: hybrid.counts.recommended,
      review_count: hybrid.counts.review,
      must_not_miss_count: hybrid.counts.mustNotMiss,
      deferred_count: hybrid.counts.deferred,
      requires_more_data: hybrid.requiresMoreData,
      unverified_codes: validation.unverified_codes,
      warnings,
    },
    next_best_questions: hybrid.nextBestQuestions,
    _reasoning_content: reasoningContent,
  }
}

// ── Status ────────────────────────────────────────────────────────────────────

export function getCDSSEngineStatus(): {
  ready: boolean
  kb_disease_count: number
  model: string
} {
  const stats = getKBStats()
  const hasKey = !!process.env.DEEPSEEK_API_KEY
  return {
    ready: stats.total > 0 && hasKey,
    kb_disease_count: stats.total,
    model: 'IDE-V2 (deepseek-reasoner)',
  }
}
