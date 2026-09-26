// Designed and constructed by Drferdi.
/**
 * Iskandar Diagnosis Engine V1 — LLM Reasoner (Constrained)
 * LLM is COPILOT, not PILOT. It ranks/enriches candidates from KB.
 * It does NOT generate diagnoses from nothing.
 * Hard-gate: any LLM ICD outside the KB candidate set is dropped (reranker only).
 *
 * Fallback: If LLM fails (or all suggestions invented), returns KB-only results.
 *
 * @module lib/iskandar-diagnosis-engine/llm-reasoner
 */

import { getDiagnosisEngineConfig } from './feature-flags';
import { getStoredOpenAIConfig } from './openai-key-store';
import type { MatchedCandidate } from './symptom-matcher';

import type { AIDiagnosisSuggestion } from '@/lib/api/ai-types';

// =============================================================================
// TYPES
// =============================================================================

export interface ReasonerInput {
  candidates: MatchedCandidate[];
  keluhanUtama: string;
  keluhanTambahan?: string;
  usia?: number;
  jenisKelamin?: 'L' | 'P';
  epiContext?: string;
  chronicDiseases?: string[];
}

export interface ReasonerOutput {
  suggestions: AIDiagnosisSuggestion[];
  source: 'ai' | 'local';
  modelVersion: string;
  latencyMs: number;
  dataQualityWarnings: string[];
}

// =============================================================================
// SYSTEM PROMPT
// =============================================================================

function buildSystemPrompt(epiContext: string): string {
  return `Anda adalah Iskandar Diagnosis Engine V1 (IDE) — Artificial Assisted Diagnostic Intelligence untuk Puskesmas di Indonesia.

PERAN: Menerima kandidat diagnosis dari knowledge base (KB) dan MERANKING ulang berdasarkan klinis.

ATURAN:
1. HANYA pilih dari kandidat yang diberikan — JANGAN buat diagnosis baru
2. Berikan reasoning klinis dalam Bahasa Indonesia
3. Identifikasi red flags dan recommended actions
4. Confidence 0.0–1.0 berdasarkan kesesuaian klinis
5. JANGAN fabrikasi obat, dosis, atau referensi

${epiContext}

OUTPUT FORMAT (JSON KETAT):
{
  "suggestions": [
    {
      "rank": 1,
      "diagnosis_name": "Nama diagnosis Bahasa Indonesia",
      "icd10_code": "ICD-10",
      "confidence": 0.85,
      "reasoning": "Alasan klinis",
      "red_flags": ["red flag 1"],
      "recommended_actions": ["tindakan 1"]
    }
  ]
}`;
}

function buildUserPrompt(input: ReasonerInput): string {
  let guidelinesText = '';
  const candidateList = input.candidates
    .slice(0, 5)
    .map((c, i) => {
      const text = `${i + 1}. [${c.icd10}] ${c.nama} (match: ${(c.matchScore * 100).toFixed(1)}%, gejala cocok: ${c.matchedSymptoms.join(', ')})`;
      const guideline = c.advancedGuideline as
        { pengobatan?: unknown; red_alert?: unknown } | undefined;

      if (guideline) {
        guidelinesText += `\n>>> PANDUAN KLINIS RESMI UNTUK ${c.nama} (${c.icd10}) <<<\n`;
        if (guideline.pengobatan) {
          guidelinesText += `- PENGOBATAN: ${JSON.stringify(guideline.pengobatan, null, 2)}\n`;
        }
        if (guideline.red_alert) {
          guidelinesText += `- RED ALERTS: ${JSON.stringify(guideline.red_alert, null, 2)}\n`;
        }
      }
      return text;
    })
    .join('\n');

  return `PASIEN:
- Keluhan utama: ${input.keluhanUtama}
${input.keluhanTambahan ? `- Keluhan tambahan: ${input.keluhanTambahan}` : ''}
${input.usia ? `- Usia: ${input.usia} tahun` : ''}
${input.jenisKelamin ? `- Jenis kelamin: ${input.jenisKelamin === 'L' ? 'Laki-laki' : 'Perempuan'}` : ''}
${input.chronicDiseases?.length ? `- Riwayat penyakit kronis: ${input.chronicDiseases.join(', ')}` : ''}

${candidateList.length > 0 ? `KANDIDAT DARI KB (pilih dan ranking dari daftar ini):\n${candidateList}` : 'KANDIDAT DARI KB: Tidak tersedia. Hentikan rekomendasi klinis tanpa evidence baru.'}
${guidelinesText ? `\nINFORMASI PANDUAN KLINIS LOKAL (WAJIB DIIKUTI BILA MEMILIH DIAGNOSIS INI):${guidelinesText}\nJANGAN gunakan panduan luar. HANYA gunakan dosis dan instruksi dari panduan lokal di atas.\n` : ''}
Berikan ${candidateList.length > 0 ? 'ranking ulang' : 'diagnosis'} dengan reasoning klinis. Pertimbangkan riwayat penyakit kronis dalam menentukan confidence dan red flags. Output JSON saja.`;
}

// =============================================================================
// LLM CALL
// =============================================================================

async function callLLM(
  systemPrompt: string,
  userPrompt: string
): Promise<{ success: boolean; data?: { suggestions: AIDiagnosisSuggestion[] }; error?: string }> {
  const config = getDiagnosisEngineConfig();
  const stored = await getStoredOpenAIConfig();

  if (!stored.apiKey) {
    return {
      success: false,
      error: 'OpenAI belum dikonfigurasi: isi API key OpenAI di menu Pengaturan.',
    };
  }

  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), config.openaiTimeoutMs);

    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${stored.apiKey}`,
      },
      body: JSON.stringify({
        model: stored.model || config.openaiModel,
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userPrompt },
        ],
        temperature: 0.1,
        max_tokens: 800,
        response_format: { type: 'json_object' },
      }),
      signal: controller.signal,
    });

    clearTimeout(timeoutId);

    if (!response.ok) {
      const errorBody = await response.text().catch(() => '');
      throw new Error(
        `OpenAI API returned status: ${response.status} — ${errorBody.substring(0, 200)}`
      );
    }

    const result = (await response.json()) as {
      choices: Array<{ message: { content: string } }>;
    };
    const rawContent = result.choices?.[0]?.message?.content;
    if (!rawContent) {
      throw new Error('OpenAI response kosong — tidak ada content.');
    }

    const cleanContent = rawContent
      .replace(/^```json\s*/i, '')
      .replace(/```\s*$/i, '')
      .trim();
    const data = JSON.parse(cleanContent) as { suggestions: AIDiagnosisSuggestion[] };

    if (!data.suggestions || !Array.isArray(data.suggestions)) {
      throw new Error('Format JSON suggestions dari OpenAI tidak valid.');
    }

    return { success: true, data };
  } catch (error) {
    if (error instanceof DOMException && error.name === 'AbortError') {
      return {
        success: false,
        error: `OpenAI request timeout setelah ${config.openaiTimeoutMs}ms.`,
      };
    }
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown OpenAI API exception',
    };
  }
}

export async function isOpenAIAvailable(): Promise<boolean> {
  const stored = await getStoredOpenAIConfig();
  if (!stored.apiKey) return false;

  try {
    const res = await fetch('https://api.openai.com/v1/models', {
      headers: { Authorization: `Bearer ${stored.apiKey}` },
    });
    return res.ok;
  } catch {
    return false;
  }
}

// =============================================================================
// KB-ONLY FALLBACK
// =============================================================================

export function buildKBOnlySuggestions(candidates: MatchedCandidate[]): AIDiagnosisSuggestion[] {
  return candidates.slice(0, 5).map((c, index) => ({
    rank: index + 1,
    diagnosis_name: c.nama,
    icd10_code: c.icd10,
    confidence: c.matchScore,
    reasoning: c.definisi
      ? `${c.definisi.substring(0, 200)}${c.definisi.length > 200 ? '...' : ''}`
      : `Kesesuaian gejala: ${c.matchedSymptoms.slice(0, 3).join(', ')}. Match score: ${(c.matchScore * 100).toFixed(0)}%.`,
    red_flags: c.redFlags.slice(0, 3),
    recommended_actions: buildRecommendedActions(c),
  }));
}

/** ICD stem (letter + 2 digits), e.g. J06.9 → J06. Empty if unparseable. */
function icdStem(code: string | undefined): string {
  const match = String(code || '')
    .toUpperCase()
    .replace(/\s+/g, '')
    .match(/^[A-Z][0-9]{2}/);
  return match?.[0] ?? '';
}

/**
 * Resolve an LLM ICD to a KB matcher candidate (reranker membership gate).
 * Exact code match preferred; otherwise same ICD-10 category stem as a candidate.
 */
function findKbCandidate(
  candidates: MatchedCandidate[],
  icd10Code: string | undefined
): MatchedCandidate | undefined {
  const raw = String(icd10Code || '')
    .toUpperCase()
    .replace(/\s+/g, '')
    .trim();
  if (!raw) return undefined;

  const exact = candidates.find((c) => c.icd10.toUpperCase().replace(/\s+/g, '') === raw);
  if (exact) return exact;

  const stem = icdStem(raw);
  if (!stem) return undefined;

  return candidates.find((c) => icdStem(c.icd10) === stem);
}

function buildRecommendedActions(c: MatchedCandidate): string[] {
  const actions: string[] = [];
  actions.push('Lakukan pemeriksaan fisik terarah dan monitoring TTV serial');

  if (c.kriteria_rujukan) {
    actions.push(`Pertimbangkan rujukan: ${c.kriteria_rujukan.substring(0, 120)}`);
  }
  if (c.diagnosisBanding.length > 0) {
    actions.push(`Diagnosis banding: ${c.diagnosisBanding.slice(0, 3).join(', ')}`);
  }
  return actions.slice(0, 3);
}

// =============================================================================
// MAIN EXPORT
// =============================================================================

/**
 * Run LLM-augmented reasoning on KB candidates.
 * Falls back to KB-only if LLM unavailable.
 */
export async function runLLMReasoning(input: ReasonerInput): Promise<ReasonerOutput> {
  const startTime = Date.now();
  const warnings: string[] = [];

  if (!Array.isArray(input.candidates) || input.candidates.length === 0) {
    warnings.push('No KB candidates found. Returning fail-closed local result.');
    return {
      suggestions: [],
      source: 'local',
      modelVersion: 'IDE-V1-KB-empty',
      latencyMs: Date.now() - startTime,
      dataQualityWarnings: warnings,
    };
  }

  // Try LLM first
  const systemPrompt = buildSystemPrompt(input.epiContext || '');
  const userPrompt = buildUserPrompt(input);
  const llmResult = await callLLM(systemPrompt, userPrompt);

  if (llmResult.success && llmResult.data) {
    // Merge LLM reasoning with KB data — hard-gate: drop invented ICDs (reranker only).
    const inventedCodes: string[] = [];
    const enriched = llmResult.data.suggestions.flatMap((s) => {
      const kbMatch = findKbCandidate(input.candidates, s.icd10_code);
      if (!kbMatch) {
        if (s.icd10_code) inventedCodes.push(String(s.icd10_code));
        return [];
      }
      return [
        {
          ...s,
          icd10_code: kbMatch.icd10,
          rank: 0,
          // Cap LLM confidence at KB score + 0.1 (always have kbMatch here)
          confidence: Math.min(s.confidence, kbMatch.matchScore + 0.1),
          red_flags: s.red_flags || kbMatch.redFlags?.slice(0, 3) || [],
          recommended_actions: s.recommended_actions || buildRecommendedActions(kbMatch),
        },
      ];
    });

    if (inventedCodes.length > 0) {
      warnings.push(
        `Dropped ${inventedCodes.length} invented ICD(s) outside KB candidate set: ${inventedCodes.join(', ')}.`
      );
    }

    if (enriched.length === 0) {
      warnings.push('All LLM suggestions were outside KB candidates. Using KB-only results.');
      return {
        suggestions: buildKBOnlySuggestions(input.candidates),
        source: 'local',
        modelVersion: 'IDE-V1-KB',
        latencyMs: Date.now() - startTime,
        dataQualityWarnings: warnings,
      };
    }

    return {
      suggestions: enriched.slice(0, 5).map((s, i) => ({ ...s, rank: i + 1 })),
      source: 'ai',
      modelVersion: 'IDE-V1-LLM',
      latencyMs: Date.now() - startTime,
      dataQualityWarnings: warnings,
    };
  }

  // Fallback: KB-only
  if (llmResult.error) {
    warnings.push(`External LLM blocked: ${llmResult.error}. Using KB-only results.`);
  }

  return {
    suggestions: buildKBOnlySuggestions(input.candidates),
    source: 'local',
    modelVersion: 'IDE-V1-KB',
    latencyMs: Date.now() - startTime,
    dataQualityWarnings: warnings,
  };
}
