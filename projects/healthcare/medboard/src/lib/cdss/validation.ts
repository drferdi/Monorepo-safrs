import 'server-only'

import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import type { CDSSEngineInput, ValidatedSuggestion } from './types'

type PenyakitEntry = {
  nama: string
  icd10: string
  definisi?: string
  body_system?: string
  gejala?: string[]
  gejala_klinis?: string[]
  kriteria_rujukan?: string
  terapi?: Array<{ obat?: string; dosis?: string; frek?: string }>
}

type PenyakitDB = {
  penyakit?: PenyakitEntry[]
}

type SuggestionCandidate = Omit<ValidatedSuggestion, 'rag_verified'>

type ValidationIssue =
  | 'missing_icd'
  | 'icd_not_found'
  | 'name_mismatch'
  | 'sex_implausible'
  | 'pregnancy_implausible'
  | 'age_implausible'
  | 'allergy_conflict'

type SuggestionValidationDetail = {
  suggestion: ValidatedSuggestion
  issues: ValidationIssue[]
  messages: string[]
}

function toValidationFlags(
  code: string,
  issues: ValidationIssue[],
  messages: string[]
): NonNullable<ValidatedSuggestion['validation_flags']> {
  return issues.map((issue, index) => ({
    type: issue,
    code,
    message: messages[index] ?? messages[0] ?? 'Perlu review klinis lebih lanjut.',
  }))
}

export type SuggestionValidationResult = {
  suggestions: ValidatedSuggestion[]
  total_raw: number
  total_validated: number
  unverified_codes: string[]
  warnings: string[]
  details: SuggestionValidationDetail[]
}

let kbByCodeCache: Map<string, PenyakitEntry[]> | null = null

function loadKBByCode(): Map<string, PenyakitEntry[]> {
  if (kbByCodeCache) return kbByCodeCache

  const raw = readFileSync(join(process.cwd(), 'public', 'data', 'penyakit.json'), 'utf-8')
  const parsed = JSON.parse(raw) as PenyakitDB
  kbByCodeCache = new Map()

  for (const entry of parsed.penyakit ?? []) {
    if (!entry.icd10?.trim() || !entry.nama?.trim()) continue
    const code = normalizeIcdCode(entry.icd10)
    const current = kbByCodeCache.get(code) ?? []
    current.push(entry)
    kbByCodeCache.set(code, current)
  }

  return kbByCodeCache
}

function normalizeIcdCode(value: string): string {
  return value.trim().toUpperCase()
}

function normalizeText(value: string): string {
  return value
    .toLowerCase()
    .replace(/[\u2018\u2019']/g, '')
    .replace(/[^a-z0-9\s]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
}

function tokenizeMeaningful(value: string): string[] {
  const stopwords = new Set([
    'dan',
    'atau',
    'yang',
    'dengan',
    'akut',
    'kronik',
    'kronis',
    'penyakit',
    'suspek',
    'tipe',
    'type',
    'lain',
    'lainnya',
  ])

  return normalizeText(value)
    .split(' ')
    .filter(token => token.length >= 3 && !stopwords.has(token))
}

function hasSufficientNameMatch(inputName: string, canonicalName: string): boolean {
  const normalizedInput = normalizeText(inputName)
  const normalizedCanonical = normalizeText(canonicalName)

  if (!normalizedInput || !normalizedCanonical) return false
  if (normalizedInput === normalizedCanonical) return true
  if (
    normalizedInput.includes(normalizedCanonical) ||
    normalizedCanonical.includes(normalizedInput)
  ) {
    return true
  }

  const inputTokens = tokenizeMeaningful(inputName)
  const canonicalTokens = tokenizeMeaningful(canonicalName)
  if (inputTokens.length === 0 || canonicalTokens.length === 0) return false

  const canonicalSet = new Set(canonicalTokens)
  const overlap = inputTokens.filter(token => canonicalSet.has(token))
  const overlapRatio =
    overlap.length / Math.max(Math.min(inputTokens.length, canonicalTokens.length), 1)
  return overlap.length >= 2 || overlapRatio >= 0.6
}

function calculateNameSimilarity(inputName: string, canonicalName: string): number {
  const normalizedInput = normalizeText(inputName)
  const normalizedCanonical = normalizeText(canonicalName)

  if (!normalizedInput || !normalizedCanonical) return 0
  if (normalizedInput === normalizedCanonical) return 1
  if (
    normalizedInput.includes(normalizedCanonical) ||
    normalizedCanonical.includes(normalizedInput)
  ) {
    return 0.9
  }

  const inputTokens = tokenizeMeaningful(inputName)
  const canonicalTokens = tokenizeMeaningful(canonicalName)
  if (inputTokens.length === 0 || canonicalTokens.length === 0) return 0

  const canonicalSet = new Set(canonicalTokens)
  const overlap = inputTokens.filter(token => canonicalSet.has(token))
  return overlap.length / Math.max(Math.min(inputTokens.length, canonicalTokens.length), 1)
}

function detectPregnancySpecific(text: string): boolean {
  return [
    'kehamilan',
    'hamil',
    'abortus',
    'ektopik',
    'preeklam',
    'eklams',
    'hiperemesis',
    'janin',
    'trimester',
    'persalin',
    'nifas',
    'obstetri',
  ].some(keyword => text.includes(keyword))
}

function detectFemaleSpecific(text: string): boolean {
  return [
    'vagina',
    'vaginitis',
    'serviks',
    'cervix',
    'uterus',
    'uteri',
    'ovarium',
    'ovari',
    'vulva',
  ].some(keyword => text.includes(keyword))
}

function detectMaleSpecific(text: string): boolean {
  return ['prostat', 'testis', 'skrot', 'penis', 'epididim'].some(keyword => text.includes(keyword))
}

function assessAgePlausibility(input: CDSSEngineInput, text: string): string[] {
  const messages: string[] = []

  if (
    (text.includes('bayi') || text.includes('neonat') || text.includes('newborn')) &&
    input.usia > 2
  ) {
    messages.push(
      `Diagnosis lebih konsisten untuk neonatus/bayi, tetapi usia pasien ${input.usia} tahun.`
    )
  }
  if (text.includes('balita') && input.usia > 5) {
    messages.push(`Diagnosis lebih konsisten untuk balita, tetapi usia pasien ${input.usia} tahun.`)
  }
  if ((text.includes('kejang demam') || text.includes('febrile seizure')) && input.usia > 6) {
    messages.push(`Kejang demam biasanya pada anak kecil, tetapi usia pasien ${input.usia} tahun.`)
  }
  if (
    (text.includes('geriatri') || text.includes('lansia') || text.includes('usia lanjut')) &&
    input.usia < 60
  ) {
    messages.push(
      `Diagnosis lebih konsisten untuk pasien geriatri, tetapi usia pasien ${input.usia} tahun.`
    )
  }
  if (text.includes('presbiopia') && input.usia < 35) {
    messages.push(
      `Presbiopia biasanya muncul pada usia dewasa lanjut, tetapi usia pasien ${input.usia} tahun.`
    )
  }

  return messages
}

type TerapiEntry = { obat?: string; dosis?: string; frek?: string }

function checkAllergyConflict(allergies: string[], terpiList: TerapiEntry[] | undefined): string[] {
  if (!allergies || allergies.length === 0 || !terpiList || terpiList.length === 0) return []

  const normalizedAllergies = allergies.map(a => normalizeText(a))
  const conflicts: string[] = []

  for (const t of terpiList) {
    const drugName = normalizeText(t.obat ?? '')
    if (!drugName) continue

    for (const allergy of normalizedAllergies) {
      // Match if allergy term appears in drug name or vice versa
      if (
        drugName.includes(allergy) ||
        allergy.includes(drugName) ||
        // Common drug class matching
        matchesDrugClass(allergy, drugName)
      ) {
        conflicts.push(
          `Obat "${t.obat}" berpotensi konflik dengan alergi "${allergies[normalizedAllergies.indexOf(allergy)]}"`
        )
      }
    }
  }

  return conflicts
}

/** Simple drug class matching for common allergy-drug relationships */
function matchesDrugClass(allergy: string, drug: string): boolean {
  const classMap: Array<{ allergyTerms: string[]; drugTerms: string[] }> = [
    {
      allergyTerms: [
        'penisilin',
        'penicillin',
        'amoxicillin',
        'amoksisilin',
        'ampicillin',
        'ampisilin',
      ],
      drugTerms: [
        'amoxicillin',
        'amoksisilin',
        'ampicillin',
        'ampisilin',
        'penisilin',
        'penicillin',
        'amoxiclav',
        'co-amoxiclav',
      ],
    },
    {
      allergyTerms: ['sulfa', 'sulfon', 'sulfonamid', 'cotrimoxazole', 'kotrimoksazol'],
      drugTerms: ['cotrimoxazole', 'kotrimoksazol', 'sulfasalazin', 'sulfadiazin', 'trimetoprim'],
    },
    {
      allergyTerms: ['nsaid', 'ibuprofen', 'aspirin', 'asam mefenamat', 'diklofenak', 'diclofenac'],
      drugTerms: [
        'ibuprofen',
        'aspirin',
        'asam mefenamat',
        'mefenamic',
        'diklofenak',
        'diclofenac',
        'ketorolac',
        'piroxicam',
        'meloxicam',
        'natrium diklofenak',
      ],
    },
    {
      allergyTerms: ['sefalosporin', 'cephalosporin', 'cefadroxil', 'ceftriaxone', 'cefixime'],
      drugTerms: [
        'cefadroxil',
        'ceftriaxone',
        'cefixime',
        'cefotaxime',
        'cephalexin',
        'sefaleksin',
      ],
    },
    {
      allergyTerms: ['metronidazol', 'metronidazole'],
      drugTerms: ['metronidazol', 'metronidazole'],
    },
  ]

  for (const cls of classMap) {
    const allergyMatch = cls.allergyTerms.some(t => allergy.includes(t))
    const drugMatch = cls.drugTerms.some(t => drug.includes(t))
    if (allergyMatch && drugMatch) return true
  }

  return false
}

function buildEntryText(entry: PenyakitEntry): string {
  return normalizeText(
    [
      entry.nama,
      entry.definisi ?? '',
      entry.body_system ?? '',
      ...(entry.gejala ?? []),
      ...(entry.gejala_klinis ?? []),
      entry.kriteria_rujukan ?? '',
    ].join(' ')
  )
}

function validateSuggestion(
  input: CDSSEngineInput,
  candidate: SuggestionCandidate,
  entry: PenyakitEntry | undefined
): SuggestionValidationDetail {
  const code = normalizeIcdCode(candidate.icd10_code)
  const canonicalName = entry?.nama?.trim() || candidate.diagnosis_name.trim()
  const issues: ValidationIssue[] = []
  const messages: string[] = []

  if (!code) {
    issues.push('missing_icd')
    messages.push(`Suggestion #${candidate.rank} tidak memiliki ICD-10 yang valid.`)
  } else if (!entry) {
    issues.push('icd_not_found')
    messages.push(`ICD ${code} tidak ditemukan di knowledge base lokal.`)
  }

  if (entry) {
    if (!hasSufficientNameMatch(candidate.diagnosis_name, entry.nama)) {
      issues.push('name_mismatch')
      messages.push(
        `Nama diagnosis "${candidate.diagnosis_name}" tidak cocok dengan nama KB "${entry.nama}" untuk ICD ${code}.`
      )
    }

    const entryText = buildEntryText(entry)
    if (detectPregnancySpecific(entryText)) {
      if (input.jenis_kelamin !== 'P') {
        issues.push('pregnancy_implausible')
        messages.push(
          `Diagnosis ${code} memerlukan konteks kehamilan/perempuan, tetapi jenis kelamin pasien ${input.jenis_kelamin}.`
        )
      } else if (input.is_pregnant !== true) {
        issues.push('pregnancy_implausible')
        messages.push(
          `Diagnosis ${code} memerlukan konteks kehamilan, tetapi status hamil pasien tidak mendukung.`
        )
      }
    } else if (detectFemaleSpecific(entryText) && input.jenis_kelamin !== 'P') {
      issues.push('sex_implausible')
      messages.push(
        `Diagnosis ${code} lebih konsisten untuk anatomi reproduksi perempuan, tetapi jenis kelamin pasien ${input.jenis_kelamin}.`
      )
    } else if (detectMaleSpecific(entryText) && input.jenis_kelamin !== 'L') {
      issues.push('sex_implausible')
      messages.push(
        `Diagnosis ${code} lebih konsisten untuk anatomi reproduksi laki-laki, tetapi jenis kelamin pasien ${input.jenis_kelamin}.`
      )
    }

    const ageMessages = assessAgePlausibility(input, entryText)
    if (ageMessages.length > 0) {
      issues.push('age_implausible')
      messages.push(...ageMessages.map(message => `${code}: ${message}`))
    }

    // Drug-allergy cross-reference
    const allergyConflicts = checkAllergyConflict(input.allergies ?? [], entry.terapi)
    if (allergyConflicts.length > 0) {
      issues.push('allergy_conflict')
      messages.push(...allergyConflicts.map(c => `${code}: ⚠ ALERGI — ${c}`))
    }
  }

  return {
    suggestion: {
      ...candidate,
      icd10_code: code,
      diagnosis_name: canonicalName,
      rag_verified: issues.length === 0,
      validation_flags: issues.length > 0 ? toValidationFlags(code, issues, messages) : [],
    },
    issues,
    messages,
  }
}

function selectBestEntryForCandidate(
  candidate: SuggestionCandidate,
  entries: PenyakitEntry[] | undefined
): PenyakitEntry | undefined {
  if (!entries || entries.length === 0) return undefined
  if (entries.length === 1) return entries[0]

  return [...entries].sort((left, right) => {
    const rightScore = calculateNameSimilarity(candidate.diagnosis_name, right.nama)
    const leftScore = calculateNameSimilarity(candidate.diagnosis_name, left.nama)
    return rightScore - leftScore
  })[0]
}

export function validateLLMSuggestions(
  input: CDSSEngineInput,
  candidates: SuggestionCandidate[]
): SuggestionValidationResult {
  const kbByCode = loadKBByCode()
  const details = candidates.map(candidate =>
    validateSuggestion(
      input,
      candidate,
      selectBestEntryForCandidate(candidate, kbByCode.get(normalizeIcdCode(candidate.icd10_code)))
    )
  )

  const warnings = details.flatMap(detail => detail.messages)
  const unverifiedCodes = Array.from(
    new Set(
      details
        .filter(detail => !detail.suggestion.rag_verified && detail.suggestion.icd10_code)
        .map(detail => detail.suggestion.icd10_code)
    )
  )

  return {
    suggestions: details.map(detail => detail.suggestion),
    total_raw: candidates.length,
    total_validated: details.filter(detail => detail.suggestion.rag_verified).length,
    unverified_codes: unverifiedCodes,
    warnings,
    details,
  }
}
