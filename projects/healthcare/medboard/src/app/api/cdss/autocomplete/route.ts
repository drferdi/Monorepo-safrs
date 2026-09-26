/**
 * POST /api/cdss/autocomplete
 * Clinical autocomplete dengan contextual chaining.
 * Sources: local clinical-chains.json (top 50 gejala, <1ms) → DeepSeek fallback (~15s).
 */

import { existsSync, readFileSync } from 'node:fs'
import { join } from 'node:path'
import { NextResponse } from 'next/server'
import { isCrewAuthorizedRequest } from '@/lib/server/crew-access-auth'

export const runtime = 'nodejs'

// ── Types ──────────────────────────────────────────────────────────────────

interface AutocompleteRequest {
  query: string
  context?: string[] // gejala yang sudah dipilih sebelumnya
}

export interface ClinicalChain {
  clinical_entity: string
  sifat: {
    formal: string[]
    klinis: string[]
    narasi: string[]
  }
  lokasi: string[]
  durasi: string[]
  logical_chain: string[]
  predictive_next: {
    if_unilateral: string[]
    if_bilateral: string[]
    red_flags: string[]
  }
  templates: string[]
  pemeriksaan: {
    fisik: string[]
    lab: string[]
    penunjang: string[]
  }
}

export interface AutocompleteResponse {
  source: 'local' | 'llm'
  chain: ClinicalChain
}

// ── Local dataset loader ───────────────────────────────────────────────────

let _localCache: Record<string, ClinicalChain> | null = null

function loadLocalChains(): Record<string, ClinicalChain> {
  if (_localCache) return _localCache
  const path = join(process.cwd(), 'public', 'data', 'clinical-chains.json')
  if (!existsSync(path)) {
    _localCache = {}
    return {}
  }
  try {
    _localCache = JSON.parse(readFileSync(path, 'utf-8')) as Record<string, ClinicalChain>
    return _localCache
  } catch {
    _localCache = {}
    return {}
  }
}

// Alias kata awam → key di dataset
// Shared alias map — imported from shared module
import { SYMPTOM_ALIASES } from '@/lib/cdss/symptom-aliases'

const ALIAS_MAP = SYMPTOM_ALIASES

const GENERIC_MATCH_TOKENS = new Set([
  'nyeri',
  'sakit',
  'gangguan',
  'keluhan',
  'rasa',
  'terasa',
  'bagian',
])

function normalizeText(value: string): string {
  return value.toLowerCase().trim().replace(/\s+/g, ' ')
}

function tokenizeMeaningful(value: string): string[] {
  return normalizeText(value)
    .split(' ')
    .filter(Boolean)
    .filter(token => !GENERIC_MATCH_TOKENS.has(token))
}

function scoreMatch(query: string, candidate: string): number {
  const normalizedQuery = normalizeText(query)
  const normalizedCandidate = normalizeText(candidate)

  if (!normalizedQuery || !normalizedCandidate) return 0
  if (normalizedQuery === normalizedCandidate) return 1000

  const queryTokens = normalizeText(query).split(' ').filter(Boolean)
  const candidateTokens = normalizeText(candidate).split(' ').filter(Boolean)
  const candidateTokenSet = new Set(candidateTokens)

  const queryMeaningful = tokenizeMeaningful(query)
  const candidateMeaningfulSet = new Set(tokenizeMeaningful(candidate))

  const sharedMeaningful = queryMeaningful.filter(token => candidateMeaningfulSet.has(token))
  const sharedTokens = queryTokens.filter(token => candidateTokenSet.has(token))

  if (sharedMeaningful.length === 0 && sharedTokens.length === 0) return 0

  let score = sharedMeaningful.length * 40 + sharedTokens.length * 6

  if (normalizedQuery.includes(normalizedCandidate))
    score += normalizedCandidate.length >= 4 ? 24 : 10
  if (normalizedCandidate.includes(normalizedQuery)) score += normalizedQuery.length >= 4 ? 18 : 8

  const lastMeaningfulToken = queryMeaningful.at(-1)
  if (lastMeaningfulToken && candidateMeaningfulSet.has(lastMeaningfulToken)) score += 16

  const lastQueryToken = queryTokens.at(-1)
  if (lastQueryToken && candidateTokens.at(-1) === lastQueryToken) score += 8

  return score
}

function findLocalMatch(query: string): ClinicalChain | null {
  const chains = loadLocalChains()
  const q = normalizeText(query)

  // Exact key match
  if (chains[q]) return chains[q]

  // Alias mapping — kata awam → key standar
  if (ALIAS_MAP[q] && chains[ALIAS_MAP[q]]) return chains[ALIAS_MAP[q]]

  let bestTarget: string | null = null
  let bestScore = 0

  // Partial alias match — cari alias paling spesifik terhadap query
  for (const [alias, target] of Object.entries(ALIAS_MAP)) {
    if (!chains[target]) continue
    const score = scoreMatch(q, alias)
    if (score > bestScore) {
      bestScore = score
      bestTarget = target
    }
  }

  // Partial key match — gunakan skor, hindari match generik hanya karena kata pertama sama
  for (const [key, chain] of Object.entries(chains)) {
    const score = scoreMatch(q, key)
    if (score > bestScore) {
      bestScore = score
      bestTarget = key
    }
  }

  return bestTarget && bestScore >= 18 ? (chains[bestTarget] ?? null) : null
}

// ── DeepSeek fallback ──────────────────────────────────────────────────────

const SYSTEM_PROMPT = `Kamu adalah Senior Medical Informatician yang membangun sistem autocomplete anamnesa klinis untuk Puskesmas Indonesia.

Hasilkan dataset JSON untuk entitas klinis yang diberikan. Output HARUS JSON persis:
{
  "clinical_entity": "nama gejala",
  "sifat": {
    "formal": ["5-8 deskripsi medis formal Bahasa Indonesia"],
    "klinis": ["5-8 terminologi klinis/medis"],
    "narasi": ["5-8 frasa deskriptif gejala dalam bahasa awam — bukan kalimat orang pertama, melainkan frasa singkat seperti: 'Batuk terus menerus', 'Panas tidak turun-turun', 'Kepala berdenyut kencang'"]
  },
  "lokasi": ["4-6 lokasi anatomis relevan, atau []"],
  "durasi": ["4-6 variasi deskripsi durasi: sejak tadi malam, sudah 3 hari, mulai 2 minggu lalu"],
  "logical_chain": ["5-8 gejala penyerta evidence-based yang paling sering menyertai"],
  "predictive_next": {
    "if_unilateral": ["gejala jika satu sisi, atau []"],
    "if_bilateral": ["gejala jika kedua sisi, atau []"],
    "red_flags": ["2-4 tanda bahaya wajib ditanyakan"]
  },
  "templates": [
    "{Pasien} datang dengan keluhan [GEJALA] sejak {Waktu}.",
    "Keluhan utama berupa [GEJALA] telah dirasakan selama {Waktu}.",
    "[GEJALA] dirasakan {Sifat}, {Lokasi}, sejak {Waktu}.",
    "Pasien mengeluhkan [GEJALA] yang {Sifat} sejak {Waktu}, disertai {Gejala_Penyerta}.",
    "Anamnesa: [GEJALA] onset {Waktu}, {Sifat}, faktor pemberat {Faktor}."
  ],
  "pemeriksaan": {
    "fisik": ["3-5 istilah medis formal singkat pemeriksaan fisik, contoh: 'Auskultasi Pulmo', 'Palpasi Abdomen', 'Nyeri Tekan McBurney', 'Tanda Rovsing'"],
    "lab": ["2-4 singkatan/istilah lab formal, contoh: 'DL', 'GDS', 'PPT', 'LED', 'CRP', 'UL', 'SGOT/SGPT', 'HbA1c', 'BUN/SK'"],
    "penunjang": ["1-3 istilah penunjang formal singkat, contoh: 'Foto Thorax AP', 'USG Abdomen', 'EKG', 'CT-Scan Kepala'"]
  }
}

Ketentuan: semua Bahasa Indonesia, variasikan sinonim ('sejak'/'mulai dirasakan'/'mengeluhkan'), sifat.narasi adalah frasa deskriptif singkat (bukan kalimat subjek-predikat orang pertama seperti "saya merasa..."), logical_chain harus evidence-based. Output hanya JSON.`

async function callDeepSeek(query: string, context: string[]): Promise<ClinicalChain> {
  const apiKey = process.env.DEEPSEEK_API_KEY
  if (!apiKey) throw new Error('DEEPSEEK_API_KEY tidak dikonfigurasi')

  const contextNote =
    context.length > 0
      ? `\nKonteks: pasien sudah menyebutkan [${context.join(', ')}] sebelumnya — sesuaikan logical_chain agar tidak mengulang dan lebih spesifik ke kemungkinan diagnosa.`
      : ''

  const res = await fetch('https://api.deepseek.com/chat/completions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model: 'deepseek-chat',
      messages: [
        { role: 'system', content: SYSTEM_PROMPT },
        {
          role: 'user',
          content: `Entitas klinis: "${query}".${contextNote} Berikan output dalam format json.`,
        },
      ],
      temperature: 0.4,
      max_tokens: 1200,
      response_format: { type: 'json_object' },
    }),
    signal: AbortSignal.timeout(20000),
  })

  if (!res.ok) {
    const err = await res.text()
    throw new Error(`DeepSeek ${res.status}: ${err.slice(0, 100)}`)
  }

  const data = (await res.json()) as {
    choices: Array<{ message: { content: string } }>
  }
  const content = data.choices?.[0]?.message?.content ?? '{}'
  const parsed = JSON.parse(content) as Partial<ClinicalChain>

  // Normalize — pastikan semua field ada
  return {
    clinical_entity: parsed.clinical_entity ?? query,
    sifat: {
      formal: parsed.sifat?.formal ?? [],
      klinis: parsed.sifat?.klinis ?? [],
      narasi: parsed.sifat?.narasi ?? [],
    },
    lokasi: parsed.lokasi ?? [],
    durasi: parsed.durasi ?? [],
    logical_chain: parsed.logical_chain ?? [],
    predictive_next: {
      if_unilateral: parsed.predictive_next?.if_unilateral ?? [],
      if_bilateral: parsed.predictive_next?.if_bilateral ?? [],
      red_flags: parsed.predictive_next?.red_flags ?? [],
    },
    templates: parsed.templates ?? [],
    pemeriksaan: {
      fisik: parsed.pemeriksaan?.fisik ?? [],
      lab: parsed.pemeriksaan?.lab ?? [],
      penunjang: parsed.pemeriksaan?.penunjang ?? [],
    },
  }
}

// ── Handler ────────────────────────────────────────────────────────────────

export async function POST(req: Request) {
  if (!isCrewAuthorizedRequest(req)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    const body = (await req.json()) as Partial<AutocompleteRequest>
    const query = (body.query ?? '').trim()
    const context = body.context ?? []

    if (!query || query.length < 2) {
      return NextResponse.json<AutocompleteResponse>({
        source: 'local',
        chain: {
          clinical_entity: '',
          sifat: { formal: [], klinis: [], narasi: [] },
          lokasi: [],
          durasi: [],
          logical_chain: [],
          predictive_next: {
            if_unilateral: [],
            if_bilateral: [],
            red_flags: [],
          },
          templates: [],
          pemeriksaan: { fisik: [], lab: [], penunjang: [] },
        },
      })
    }

    // 1. Coba local dataset dulu (<1ms)
    const local = findLocalMatch(query)
    if (local) {
      return NextResponse.json<AutocompleteResponse>({
        source: 'local',
        chain: local,
      })
    }

    // 2. Fallback DeepSeek (~15s)
    const chain = await callDeepSeek(query, context)
    return NextResponse.json<AutocompleteResponse>({ source: 'llm', chain })
  } catch {
    return NextResponse.json<AutocompleteResponse>({
      source: 'llm',
      chain: {
        clinical_entity: '',
        sifat: { formal: [], klinis: [], narasi: [] },
        lokasi: [],
        durasi: [],
        logical_chain: [],
        predictive_next: { if_unilateral: [], if_bilateral: [], red_flags: [] },
        templates: [],
        pemeriksaan: { fisik: [], lab: [], penunjang: [] },
      },
    })
  }
}
