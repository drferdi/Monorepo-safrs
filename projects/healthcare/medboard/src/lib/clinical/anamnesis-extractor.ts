import { z } from 'zod'

const SchemaType = {
  OBJECT: 'object',
  ARRAY: 'array',
  STRING: 'string',
  NUMBER: 'number',
} as const

type Schema = Record<string, unknown>

export const AnamnesisMissingFieldSchema = z.enum([
  'keluhan_utama',
  'onset',
  'lokasi',
  'kualitas',
  'keparahan',
  'faktor_pemicu',
  'faktor_peredam',
])

export const ClinicalAnamnesisExtractionSchema = z.object({
  keluhan_utama: z.string(),
  onset: z.string().nullable(),
  lokasi: z.string().nullable(),
  kualitas: z.string().nullable(),
  keparahan: z.number().nullable(),
  faktor_pemicu: z.array(z.string()),
  faktor_peredam: z.array(z.string()),
  chronology_summary: z.string().nullable().optional(),
  associated_symptoms: z.array(z.string()).optional(),
  pertinent_negatives: z.array(z.string()).optional(),
  functional_impact: z.string().nullable().optional(),
  red_flag_signs: z.array(z.string()).optional(),
  clinician_questions: z.array(z.string()).optional(),
  data_belum_lengkap: z.array(AnamnesisMissingFieldSchema),
})

export type AnamnesisMissingField = z.infer<typeof AnamnesisMissingFieldSchema>
export type ClinicalAnamnesisExtractionResult = z.infer<
  typeof ClinicalAnamnesisExtractionSchema
>

const EXTRACTION_SCHEMA: Schema = {
  type: SchemaType.OBJECT,
  properties: {
    keluhan_utama: {
      type: SchemaType.STRING,
      description: 'Keluhan utama yang paling dominan dan eksplisit disebut dalam input klinis.',
    },
    onset: {
      type: SchemaType.STRING,
      nullable: true,
      description: 'Durasi atau waktu mulai keluhan bila eksplisit disebut, misalnya sejak 2 hari.',
    },
    lokasi: {
      type: SchemaType.STRING,
      nullable: true,
      description: 'Lokasi anatomis utama tempat keluhan dirasakan bila ada.',
    },
    kualitas: {
      type: SchemaType.STRING,
      nullable: true,
      description: 'Karakter keluhan, misalnya berdenyut, tertusuk, atau menekan.',
    },
    keparahan: {
      type: SchemaType.NUMBER,
      nullable: true,
      description: 'Skala keparahan atau nyeri numerik 0 sampai 10 bila tersedia.',
    },
    faktor_pemicu: {
      type: SchemaType.ARRAY,
      items: { type: SchemaType.STRING },
      description: 'Hal yang memicu atau memberatkan keluhan bila disebut.',
    },
    faktor_peredam: {
      type: SchemaType.ARRAY,
      items: { type: SchemaType.STRING },
      description: 'Hal yang mengurangi atau memperbaiki keluhan bila disebut.',
    },
    chronology_summary: {
      type: SchemaType.STRING,
      nullable: true,
      description: 'Ringkasan kronologi singkat berdasarkan narasi input tanpa menambah fakta baru.',
    },
    associated_symptoms: {
      type: SchemaType.ARRAY,
      items: { type: SchemaType.STRING },
      description: 'Gejala penyerta yang secara eksplisit disebut bersama keluhan utama.',
    },
    pertinent_negatives: {
      type: SchemaType.ARRAY,
      items: { type: SchemaType.STRING },
      description: 'Gejala penting yang secara eksplisit disangkal, misalnya tanpa muntah.',
    },
    functional_impact: {
      type: SchemaType.STRING,
      nullable: true,
      description: 'Dampak keluhan terhadap aktivitas atau fungsi pasien bila disebut.',
    },
    red_flag_signs: {
      type: SchemaType.ARRAY,
      items: { type: SchemaType.STRING },
      description: 'Tanda bahaya yang memang tertulis dalam input, tanpa inferensi tambahan.',
    },
    clinician_questions: {
      type: SchemaType.ARRAY,
      items: { type: SchemaType.STRING },
      description: 'Maksimal 3 pertanyaan lanjutan untuk melengkapi field yang belum ada.',
    },
    data_belum_lengkap: {
      type: SchemaType.ARRAY,
      items: {
        type: SchemaType.STRING,
        format: 'enum',
        enum: AnamnesisMissingFieldSchema.options,
      },
      description: 'Daftar field inti anamnesis yang belum tersedia dari input dokter.',
    },
  },
  required: [
    'keluhan_utama',
    'onset',
    'lokasi',
    'kualitas',
    'keparahan',
    'faktor_pemicu',
    'faktor_peredam',
    'data_belum_lengkap',
  ],
}

const LOCATION_TERMS = [
  'perut kanan bawah',
  'perut kiri bawah',
  'perut kanan atas',
  'perut kiri atas',
  'dada kiri',
  'dada kanan',
  'ulu hati',
  'tenggorokan',
  'kepala',
  'dada',
  'perut',
  'pinggang',
  'punggung',
  'leher',
  'lutut',
  'kaki',
  'tangan',
  'mata',
  'telinga',
  'hidung',
]

const QUALITY_TERMS = [
  'tertusuk',
  'tertindih',
  'berdenyut',
  'terbakar',
  'kram',
  'tumpul',
  'menekan',
  'nyeri tekan',
  'panas',
  'melilit',
]

const RED_FLAG_PATTERNS: Array<{ regex: RegExp; label: string }> = [
  { regex: /\bsesak (berat|sekali)\b/i, label: 'sesak berat' },
  { regex: /\bnyeri dada\b/i, label: 'nyeri dada' },
  { regex: /\bpenurunan kesadaran\b|\bbingung berat\b|\bpingsan\b/i, label: 'penurunan kesadaran' },
  { regex: /\bkejang\b/i, label: 'kejang' },
  { regex: /\bperdarahan\b|\bmuntah darah\b|\bberak hitam\b/i, label: 'perdarahan saluran cerna' },
  { regex: /\bmuntah proyektil\b/i, label: 'muntah proyektil' },
  { regex: /\bkaku kuduk\b/i, label: 'kaku kuduk' },
  { regex: /\blemas sekali\b|\btidak bisa berdiri\b/i, label: 'kelemahan berat' },
]

const NON_SYMPTOM_SEGMENT_PATTERNS = [
  /^(?:memberat|membaik|berkurang|reda)\b/i,
  /^(?:dipicu|muncul saat|bertambah saat)\b/i,
  /^(?:bila|kalau)\b/i,
  /^(?:aktivitas\b.*terganggu|mengganggu\b|sulit\b|tidak bisa\b)/i,
]

function normalizeWhitespace(value: string): string {
  return value.replace(/\s+/g, ' ').trim()
}

function toSentenceCase(value: string): string {
  if (!value) return value
  return value.charAt(0).toUpperCase() + value.slice(1)
}

function uniqueItems(items: Array<string | null | undefined>): string[] {
  const unique: string[] = []
  for (const item of items) {
    const normalized = normalizeWhitespace(item || '').replace(/^[,.;:\-]+|[,.;:\-]+$/g, '')
    if (!normalized) continue
    const exists = unique.some((entry) => entry.toLowerCase() === normalized.toLowerCase())
    if (!exists) unique.push(normalized)
  }
  return unique
}

function cleanLeadIn(value: string): string {
  return normalizeWhitespace(value)
    .replace(/\bpasien\b/gi, '')
    .replace(/\b(datang|mengeluh|mengalami|dengan|keluhan utama|keluhan)\b/gi, '')
    .replace(/\s+/g, ' ')
    .trim()
}

function splitComplaintSegments(text: string): string[] {
  const normalized = normalizeWhitespace(text)
    .replace(/\n+/g, ', ')
    .replace(/[;|/]+/g, ', ')
    .replace(/\s+(disertai|dibarengi|serta|keluhan lain berupa|keluhan penyerta berupa)\s+/gi, ', ')
    .replace(/\s+dan\s+/gi, ', ')

  return uniqueItems(
    normalized
      .split(',')
      .map((segment) =>
        cleanLeadIn(
          segment
            .replace(/\b(?:skala nyeri|pain score)\s*\d{1,2}(?:\s*\/\s*\d{1,2})?\b/gi, '')
            .replace(/\bnyeri\s*\d{1,2}(?:\s*\/\s*\d{1,2})?\b/gi, '')
            .replace(/\bsejak\b.*$/i, '')
            .replace(/\btidak\b.*$/i, '')
            .replace(/\btanpa\b.*$/i, '')
        )
      )
  )
    .filter((segment) => !/^\d{1,2}$/.test(segment))
    .filter((segment) => !NON_SYMPTOM_SEGMENT_PATTERNS.some((pattern) => pattern.test(segment)))
    .slice(0, 5)
}

function extractOnset(text: string): string | null {
  const patterns = [
    /\b(sejak kemarin)\b/i,
    /\b(sejak tadi (?:pagi|siang|sore|malam))\b/i,
    /\b(sejak \d+\s*(?:hari|hr|minggu|mgg|bulan|bln|tahun|thn))\b/i,
    /\b(mendadak(?: sejak [^,.;]+)?)\b/i,
    /\b(dirasakan sejak [^,.;]+)\b/i,
  ]

  for (const pattern of patterns) {
    const match = text.match(pattern)
    if (match) return normalizeWhitespace(match[1])
  }

  return null
}

function extractChronologySummary(text: string, onset: string | null): string | null {
  const chronologyMatch = text.match(
    /\b((?:muncul|dirasakan|terjadi|berawal|memberat|hilang timbul)[^,.;]{0,80})/i
  )
  if (chronologyMatch) {
    const chronology = normalizeWhitespace(chronologyMatch[1])
    if (onset && !chronology.toLowerCase().includes(onset.toLowerCase())) {
      return `${onset}, ${chronology}`
    }
    return chronology
  }
  return onset
}

function extractLocation(text: string): string | null {
  const lower = text.toLowerCase()
  for (const term of LOCATION_TERMS) {
    if (lower.includes(term)) return term
  }
  return null
}

function extractQuality(text: string): string | null {
  const lower = text.toLowerCase()
  for (const term of QUALITY_TERMS) {
    if (lower.includes(term)) return term
  }
  return null
}

function extractSeverity(text: string): number | null {
  const numericScale = text.match(/\b(?:skala nyeri|nyeri|pain score)\s*(\d{1,2})(?:\/10)?\b/i)
  if (numericScale) {
    const value = Number.parseInt(numericScale[1], 10)
    return Number.isFinite(value) ? Math.max(0, Math.min(10, value)) : null
  }

  const slashScale = text.match(/\b(\d{1,2})\/10\b/)
  if (slashScale) {
    const value = Number.parseInt(slashScale[1], 10)
    return Number.isFinite(value) ? Math.max(0, Math.min(10, value)) : null
  }

  return null
}

function extractListByPattern(text: string, patterns: RegExp[]): string[] {
  const values: string[] = []
  for (const pattern of patterns) {
    const matches = text.matchAll(pattern)
    for (const match of matches) {
      values.push(match[1] || match[0] || '')
    }
  }

  return uniqueItems(
    values.flatMap((value) =>
      value
        .split(/\s*,\s*|\s+dan\s+/i)
        .map((item) => normalizeWhitespace(item))
    )
  )
}

function extractTriggers(text: string): string[] {
  return extractListByPattern(text, [
    /\b(?:memberat saat|dipicu oleh|muncul saat|bertambah saat)\s+([^,.]+)/gi,
    /\b(?:bila|kalau)\s+([^,.]+)\s+(?:keluhan )?(?:muncul|memberat)\b/gi,
  ])
}

function extractRelievers(text: string): string[] {
  return extractListByPattern(text, [
    /\b(?:berkurang setelah|membaik setelah|membaik dengan|reda dengan|meringankan dengan)\s+([^,.]+)/gi,
    /\b(?:istirahat|tidur|minum obat|kompres|duduk|berbaring)\b/gi,
  ])
}

function extractPertinentNegatives(text: string): string[] {
  const matches = text.matchAll(/\b(?:tidak|tanpa|disangkal)\s+([^,.]+)/gi)
  const values: string[] = []
  for (const match of matches) {
    values.push(match[1] || '')
  }

  return uniqueItems(
    values.flatMap((value) =>
      value
        .split(/\s*,\s*|\s+dan\s+/i)
        .map((item) => normalizeWhitespace(item.replace(/\bada\b/gi, '')))
    )
  ).slice(0, 4)
}

function extractFunctionalImpact(text: string): string | null {
  const patterns = [
    /\b(mengganggu [^,.]+)/i,
    /\b(sulit [^,.]+)/i,
    /\b(tidak bisa [^,.]+)/i,
    /\b(aktivitas(?: [^,.]+){0,3} terganggu)\b/i,
  ]

  for (const pattern of patterns) {
    const match = text.match(pattern)
    if (match) return normalizeWhitespace(match[1])
  }

  return null
}

function detectRedFlags(text: string): string[] {
  return uniqueItems(
    RED_FLAG_PATTERNS.filter(({ regex }) => regex.test(text)).map(({ label }) => label)
  )
}

function deriveMissingFields(
  extraction: Omit<ClinicalAnamnesisExtractionResult, 'data_belum_lengkap' | 'clinician_questions'>
): AnamnesisMissingField[] {
  const missing: AnamnesisMissingField[] = []
  if (!normalizeWhitespace(extraction.keluhan_utama)) missing.push('keluhan_utama')
  if (!extraction.onset) missing.push('onset')
  if (!extraction.lokasi) missing.push('lokasi')
  if (!extraction.kualitas) missing.push('kualitas')
  if (typeof extraction.keparahan !== 'number') missing.push('keparahan')
  if (extraction.faktor_pemicu.length === 0) missing.push('faktor_pemicu')
  if (extraction.faktor_peredam.length === 0) missing.push('faktor_peredam')
  return missing
}

function deriveClinicianQuestions(missingFields: AnamnesisMissingField[]): string[] {
  const questions: Record<AnamnesisMissingField, string> = {
    keluhan_utama: 'Apa keluhan utama yang paling mengganggu pasien saat ini?',
    onset: 'Sejak kapan keluhan mulai dirasakan dan apakah muncul mendadak atau bertahap?',
    lokasi: 'Di bagian tubuh mana keluhan paling jelas dirasakan?',
    kualitas: 'Bagaimana karakter keluhan, misalnya berdenyut, tertusuk, atau terasa menekan?',
    keparahan: 'Berapa skala keluhan atau nyeri saat ini dari 0 sampai 10?',
    faktor_pemicu: 'Apa yang biasanya memicu atau memberatkan keluhan?',
    faktor_peredam: 'Apa yang membuat keluhan berkurang atau membaik?',
  }

  return missingFields.slice(0, 3).map((field) => questions[field])
}

export function extractClinicalAnamnesisHeuristic(
  inputText: string
): ClinicalAnamnesisExtractionResult {
  const text = normalizeWhitespace(inputText)
  const segments = splitComplaintSegments(text)
  const keluhanUtama = toSentenceCase(segments[0] || cleanLeadIn(text).slice(0, 80) || 'Keluhan belum spesifik')
  const associatedSymptoms = uniqueItems(segments.slice(1))
  const onset = extractOnset(text)
  const chronologySummary = extractChronologySummary(text, onset)
  const lokasi = extractLocation(text)
  const kualitas = extractQuality(text)
  const keparahan = extractSeverity(text)
  const faktorPemicu = extractTriggers(text)
  const faktorPeredam = extractRelievers(text)
  const pertinentNegatives = extractPertinentNegatives(text)
  const functionalImpact = extractFunctionalImpact(text)
  const redFlagSigns = detectRedFlags(text)

  const partial = {
    keluhan_utama: keluhanUtama,
    onset,
    lokasi,
    kualitas,
    keparahan,
    faktor_pemicu: faktorPemicu,
    faktor_peredam: faktorPeredam,
    chronology_summary: chronologySummary,
    associated_symptoms: associatedSymptoms,
    pertinent_negatives: pertinentNegatives,
    functional_impact: functionalImpact,
    red_flag_signs: redFlagSigns,
  }

  const dataBelumLengkap = deriveMissingFields(partial)

  return {
    ...partial,
    clinician_questions: deriveClinicianQuestions(dataBelumLengkap),
    data_belum_lengkap: dataBelumLengkap,
  }
}

function mergeExtractionResults(
  preferred: ClinicalAnamnesisExtractionResult,
  fallback: ClinicalAnamnesisExtractionResult
): ClinicalAnamnesisExtractionResult {
  const mergedBase = {
    keluhan_utama: normalizeWhitespace(preferred.keluhan_utama) || fallback.keluhan_utama,
    onset: preferred.onset || fallback.onset,
    lokasi: preferred.lokasi || fallback.lokasi,
    kualitas: preferred.kualitas || fallback.kualitas,
    keparahan:
      typeof preferred.keparahan === 'number' ? preferred.keparahan : fallback.keparahan,
    faktor_pemicu: uniqueItems([...preferred.faktor_pemicu, ...fallback.faktor_pemicu]),
    faktor_peredam: uniqueItems([...preferred.faktor_peredam, ...fallback.faktor_peredam]),
    chronology_summary: preferred.chronology_summary || fallback.chronology_summary || null,
    associated_symptoms: uniqueItems([
      ...(preferred.associated_symptoms || []),
      ...(fallback.associated_symptoms || []),
    ]),
    pertinent_negatives: uniqueItems([
      ...(preferred.pertinent_negatives || []),
      ...(fallback.pertinent_negatives || []),
    ]),
    functional_impact: preferred.functional_impact || fallback.functional_impact || null,
    red_flag_signs: uniqueItems([
      ...(preferred.red_flag_signs || []),
      ...(fallback.red_flag_signs || []),
    ]),
  }

  const dataBelumLengkap = deriveMissingFields(mergedBase)

  return {
    ...mergedBase,
    clinician_questions: deriveClinicianQuestions(dataBelumLengkap),
    data_belum_lengkap: dataBelumLengkap,
  }
}

function buildExtractionPrompt(text: string): string {
  return [
    'Anda adalah extractor anamnesis klinis untuk workflow FKTP/Puskesmas.',
    'Tugas Anda hanya mengekstrak fakta yang benar-benar tertulis dalam input.',
    'Jangan mengarang pemeriksaan fisik, diagnosis, atau faktor yang tidak disebut.',
    'Jika data tidak ada, gunakan null atau array kosong.',
    'Untuk associated_symptoms, masukkan gejala penyerta yang eksplisit disebut.',
    'Untuk pertinent_negatives, masukkan gejala yang secara eksplisit disangkal pasien seperti "tidak muntah" atau "tanpa sesak".',
    'Untuk clinician_questions, buat maksimal 3 pertanyaan lanjutan berdasarkan field yang belum lengkap.',
    '',
    `INPUT: ${text}`,
  ].join('\n')
}

export async function extractClinicalAnamnesisRich(
  inputText: string
): Promise<{ data: ClinicalAnamnesisExtractionResult; source: 'heuristic' }> {
  const heuristic = extractClinicalAnamnesisHeuristic(inputText)
  void buildExtractionPrompt(inputText)
  void mergeExtractionResults(heuristic, heuristic)
  void EXTRACTION_SCHEMA
  return { data: heuristic, source: 'heuristic' }
}
