// Drferdi — vision, brought to life.

import type { FilteredDisease } from './pre-filter'
import type { CDSSEngineInput, CDSSEngineResult, ValidatedSuggestion } from './types'

type CandidateScore = {
  disease: FilteredDisease
  keywordScore: number
  semanticScore: number
}

type HybridResult = {
  suggestions: ValidatedSuggestion[]
  nextBestQuestions: string[]
  requiresMoreData: boolean
  counts: {
    recommended: number
    review: number
    mustNotMiss: number
    deferred: number
  }
}

type ValidationLike = {
  warnings: string[]
  suggestions: ValidatedSuggestion[]
}

function normalizeText(value: string): string {
  return value
    .trim()
    .toLowerCase()
    .replace(/[^\p{L}\p{N}\s]/gu, ' ')
    .replace(/\s+/g, ' ')
}

function buildCandidateKey(icd10: string, nama: string): string {
  return `${icd10.trim().toUpperCase()}::${normalizeText(nama)}`
}

function clamp01(value: number): number {
  if (Number.isNaN(value)) return 0
  return Math.max(0, Math.min(1, value))
}

function scaleByMax(value: number, maxValue: number): number {
  if (maxValue <= 0) return 0
  return clamp01(value / maxValue)
}

function hasValidationFlag(suggestion: ValidatedSuggestion, type: string): boolean {
  return suggestion.validation_flags?.some(flag => flag.type === type) ?? false
}

const GENERIC_RED_FLAG_TOKENS = new Set([
  'nyeri',
  'sakit',
  'demam',
  'berat',
  'akut',
  'kronik',
  'gangguan',
  'disertai',
  'dengan',
  'tanda',
  'curiga',
  'pasien',
  'perlu',
  'riwayat',
])

function redFlagMatchesContext(input: CDSSEngineInput, redFlags: string[]): boolean {
  if (redFlags.length === 0) return false

  const caseText = normalizeText(
    [
      input.keluhan_utama,
      input.keluhan_tambahan ?? '',
      ...(input.chronic_diseases ?? []),
      ...(input.allergies ?? []),
    ].join(' ')
  )

  return redFlags.some(flag => {
    const normalizedFlag = normalizeText(flag)
    if (!normalizedFlag) return false
    if (caseText.includes(normalizedFlag)) return true

    const meaningfulTokens = normalizedFlag
      .split(' ')
      .filter(token => token.length >= 4 && !GENERIC_RED_FLAG_TOKENS.has(token))

    if (meaningfulTokens.length === 0) return false

    const overlapCount = meaningfulTokens.filter(token => caseText.includes(token)).length
    return overlapCount >= 2
  })
}

function isDangerSignal(
  input: CDSSEngineInput,
  suggestion: ValidatedSuggestion,
  candidate: CandidateScore | undefined
): boolean {
  if ((suggestion.red_flags?.length ?? 0) > 0) return true
  if (
    (suggestion.recommended_actions ?? []).some(action =>
      /rujuk|segera|emergensi|igd|stabilisasi/i.test(action)
    )
  ) {
    return true
  }
  return redFlagMatchesContext(input, candidate?.disease.red_flags ?? [])
}

function explainsChiefComplaint(
  input: CDSSEngineInput,
  candidate: CandidateScore | undefined
): boolean {
  if (!candidate) return false
  const complaint = normalizeText([input.keluhan_utama, input.keluhan_tambahan ?? ''].join(' '))
  const candidateText = normalizeText(
    [
      candidate.disease.nama,
      candidate.disease.definisi,
      ...candidate.disease.gejala,
      ...candidate.disease.diagnosis_banding,
    ].join(' ')
  )

  const complaintTokens = complaint.split(' ').filter(token => token.length >= 4)
  return complaintTokens.some(token => candidateText.includes(token))
}

function buildDecisionReason(suggestion: ValidatedSuggestion): string {
  switch (suggestion.decision_status) {
    case 'recommended':
      return suggestion.rag_verified
        ? 'Konsisten dengan KB lokal, konteks pasien, dan ranking hybrid.'
        : 'Masih paling relevan, tetapi tetap perlu kehati-hatian klinis.'
    case 'review':
      if (suggestion.validation_flags?.length) {
        return (
          suggestion.validation_flags[0]?.message ??
          'Perlu review dokter sebelum dipakai sebagai diagnosis kerja.'
        )
      }
      return 'Masih mungkin relevan, tetapi data klinis belum cukup kuat.'
    case 'must_not_miss':
      return 'Bukan diagnosis kerja utama, tetapi berisiko bila terlewat dan harus dipertimbangkan.'
    default:
      return 'Belum cukup kuat untuk dipakai sebagai diagnosis kerja.'
  }
}

export function buildProblemRepresentation(input: CDSSEngineInput): string {
  const snippets = [
    input.assessment_conclusion ? `sintesis dokter ${input.assessment_conclusion}` : null,
    `${input.usia} tahun`,
    input.jenis_kelamin === 'L' ? 'laki-laki' : 'perempuan',
    input.is_pregnant ? 'hamil' : null,
    `keluhan utama ${input.keluhan_utama}`,
    input.keluhan_tambahan ? `keluhan tambahan ${input.keluhan_tambahan}` : null,
    input.chronic_diseases?.length ? `komorbid ${input.chronic_diseases.join(', ')}` : null,
    input.allergies?.length ? `alergi ${input.allergies.join(', ')}` : null,
  ].filter(Boolean)

  return snippets.join('; ')
}

/**
 * Reciprocal Rank Fusion (RRF) merge strategy.
 *
 * RRF score = sum(1 / (k + rank_i)) across all lists.
 * More robust than raw score addition because it normalizes
 * different score distributions between keyword and semantic retrieval.
 *
 * k=60 is the standard constant (Cormack et al. 2009).
 */
const RRF_K = 60

export function mergeDiseaseCandidates(
  keywordCandidates: FilteredDisease[],
  semanticCandidates: FilteredDisease[],
  topN = 18
): CandidateScore[] {
  const keywordMax = Math.max(0, ...keywordCandidates.map(candidate => candidate.score))
  const semanticMax = Math.max(0, ...semanticCandidates.map(candidate => candidate.score))

  // Build RRF scores from rank positions
  const rrfScores = new Map<string, number>()
  const diseaseByKey = new Map<string, FilteredDisease>()

  for (let i = 0; i < keywordCandidates.length; i++) {
    const candidate = keywordCandidates[i]
    const key = buildCandidateKey(candidate.icd10, candidate.nama)
    const rrfContribution = 1 / (RRF_K + i + 1)
    rrfScores.set(key, (rrfScores.get(key) ?? 0) + rrfContribution)
    if (!diseaseByKey.has(key)) diseaseByKey.set(key, candidate)
  }

  for (let i = 0; i < semanticCandidates.length; i++) {
    const candidate = semanticCandidates[i]
    const key = buildCandidateKey(candidate.icd10, candidate.nama)
    const rrfContribution = 1 / (RRF_K + i + 1)
    rrfScores.set(key, (rrfScores.get(key) ?? 0) + rrfContribution)
    if (!diseaseByKey.has(key)) diseaseByKey.set(key, candidate)
  }

  // Build keyword/semantic normalized scores for hybrid decisioning downstream
  const keywordScoreMap = new Map<string, number>()
  for (const candidate of keywordCandidates) {
    const key = buildCandidateKey(candidate.icd10, candidate.nama)
    keywordScoreMap.set(
      key,
      Math.max(keywordScoreMap.get(key) ?? 0, scaleByMax(candidate.score, keywordMax))
    )
  }

  const semanticScoreMap = new Map<string, number>()
  for (const candidate of semanticCandidates) {
    const key = buildCandidateKey(candidate.icd10, candidate.nama)
    semanticScoreMap.set(
      key,
      Math.max(semanticScoreMap.get(key) ?? 0, scaleByMax(candidate.score, semanticMax))
    )
  }

  // Sort by RRF score, build CandidateScore with normalized keyword/semantic scores
  return [...rrfScores.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, topN)
    .flatMap(([key]) => {
      const disease = diseaseByKey.get(key)
      if (!disease) return []
      return [
        {
          disease,
          keywordScore: keywordScoreMap.get(key) ?? 0,
          semanticScore: semanticScoreMap.get(key) ?? 0,
        },
      ]
    })
}

function buildQuestionsFromMissingInformation(suggestions: ValidatedSuggestion[]): string[] {
  const questions = new Set<string>()

  for (const suggestion of suggestions) {
    for (const info of suggestion.missing_information ?? []) {
      if (info.trim().length === 0) continue
      questions.add(info.trim())
      if (questions.size >= 5) return [...questions]
    }
  }

  return [...questions]
}

export function buildNextBestQuestions(
  input: CDSSEngineInput,
  suggestions: ValidatedSuggestion[],
  validationWarnings: string[]
): string[] {
  const questions = buildQuestionsFromMissingInformation(suggestions)

  if (!input.keluhan_tambahan?.trim()) {
    questions.push('Apa gejala penyerta utama, durasi, dan progresivitas keluhan?')
  }

  if (
    !input.vital_signs?.temperature &&
    !input.vital_signs?.heart_rate &&
    !input.vital_signs?.systolic
  ) {
    questions.push('Mohon lengkapi tanda vital utama untuk memperkuat differential diagnosis.')
  }

  if (input.jenis_kelamin === 'P' && input.usia >= 12 && input.usia <= 55 && !input.is_pregnant) {
    questions.push(
      'Pastikan status kehamilan dan tanggal haid terakhir bila keluhan mendukung konteks obstetri.'
    )
  }

  if (
    validationWarnings.some(warning =>
      /usia pasien|jenis kelamin pasien|status hamil pasien/i.test(warning)
    )
  ) {
    questions.push('Konfirmasi kembali usia, jenis kelamin biologis, dan status kehamilan pasien.')
  }

  return [...new Set(questions.filter(question => question.trim().length > 0))].slice(0, 5)
}

export function applyHybridDecisioning(
  input: CDSSEngineInput,
  validation: ValidationLike,
  candidateScores: CandidateScore[]
): HybridResult {
  const candidateByExactKey = new Map(
    candidateScores.map(candidate => [
      buildCandidateKey(candidate.disease.icd10, candidate.disease.nama),
      candidate,
    ])
  )
  const candidateByCode = new Map<string, CandidateScore[]>()

  for (const candidate of candidateScores) {
    const code = candidate.disease.icd10.trim().toUpperCase()
    const current = candidateByCode.get(code) ?? []
    current.push(candidate)
    candidateByCode.set(code, current)
  }

  const scoredSuggestions = validation.suggestions.map(suggestion => {
    const exact = candidateByExactKey.get(
      buildCandidateKey(suggestion.icd10_code, suggestion.diagnosis_name)
    )
    const byCode = candidateByCode.get(suggestion.icd10_code.trim().toUpperCase()) ?? []
    const candidate = exact ?? byCode[0]
    const keywordScore = candidate?.keywordScore ?? 0
    const semanticScore = candidate?.semanticScore ?? 0

    // Weights: keyword boosted post-BM25 upgrade (was 0.34, now 0.36)
    // LLM slightly reduced (was 0.38, now 0.36) — more balanced with improved retrieval
    let score = suggestion.confidence * 0.36 + keywordScore * 0.36 + semanticScore * 0.22

    if (suggestion.rag_verified) score += 0.12
    if (explainsChiefComplaint(input, candidate)) score += 0.08
    if ((suggestion.key_reasons?.length ?? 0) >= 2) score += 0.03
    if ((suggestion.missing_information?.length ?? 0) >= 2) score -= 0.08
    if (hasValidationFlag(suggestion, 'name_mismatch')) score -= 0.18
    if (hasValidationFlag(suggestion, 'age_implausible')) score -= 0.2
    if (hasValidationFlag(suggestion, 'sex_implausible')) score -= 0.25
    if (hasValidationFlag(suggestion, 'pregnancy_implausible')) score -= 0.3
    if (hasValidationFlag(suggestion, 'allergy_conflict')) score -= 0.15
    if (
      hasValidationFlag(suggestion, 'icd_not_found') ||
      hasValidationFlag(suggestion, 'missing_icd')
    )
      score -= 0.45

    const deterministicScore = Math.round(clamp01(score) * 1000) / 1000
    const dangerSignal = isDangerSignal(input, suggestion, candidate)
    const impossibleContext =
      hasValidationFlag(suggestion, 'sex_implausible') ||
      hasValidationFlag(suggestion, 'pregnancy_implausible')
    const noGrounding =
      hasValidationFlag(suggestion, 'icd_not_found') || hasValidationFlag(suggestion, 'missing_icd')

    let decisionStatus: NonNullable<ValidatedSuggestion['decision_status']> = 'deferred'
    if (dangerSignal && !impossibleContext && deterministicScore >= 0.34) {
      decisionStatus = 'must_not_miss'
    }
    if (
      !dangerSignal &&
      !impossibleContext &&
      !noGrounding &&
      suggestion.rag_verified &&
      deterministicScore >= 0.58
    ) {
      decisionStatus = 'recommended'
    } else if (!dangerSignal && deterministicScore >= 0.28) {
      decisionStatus = 'review'
    } else if (dangerSignal && !impossibleContext) {
      decisionStatus = 'must_not_miss'
    }

    return {
      ...suggestion,
      llm_rank: suggestion.llm_rank ?? suggestion.rank,
      rank_source: 'hybrid' as const,
      deterministic_score: deterministicScore,
      decision_status: decisionStatus,
    }
  })

  const counts = {
    recommended: scoredSuggestions.filter(
      suggestion => suggestion.decision_status === 'recommended'
    ).length,
    review: scoredSuggestions.filter(suggestion => suggestion.decision_status === 'review').length,
    mustNotMiss: scoredSuggestions.filter(
      suggestion => suggestion.decision_status === 'must_not_miss'
    ).length,
    deferred: scoredSuggestions.filter(suggestion => suggestion.decision_status === 'deferred')
      .length,
  }

  const requiresMoreData =
    counts.recommended === 0 ||
    validation.warnings.length > 0 ||
    scoredSuggestions.every(suggestion => (suggestion.missing_information?.length ?? 0) > 0)

  const ordered = [
    ...scoredSuggestions
      .filter(suggestion => suggestion.decision_status === 'recommended')
      .sort((left, right) => (right.deterministic_score ?? 0) - (left.deterministic_score ?? 0)),
    ...scoredSuggestions
      .filter(suggestion => suggestion.decision_status === 'review')
      .sort((left, right) => (right.deterministic_score ?? 0) - (left.deterministic_score ?? 0)),
    ...scoredSuggestions
      .filter(suggestion => suggestion.decision_status === 'must_not_miss')
      .sort((left, right) => (right.deterministic_score ?? 0) - (left.deterministic_score ?? 0)),
    ...scoredSuggestions
      .filter(suggestion => suggestion.decision_status === 'deferred')
      .sort((left, right) => (right.deterministic_score ?? 0) - (left.deterministic_score ?? 0)),
  ].slice(0, 5)

  const suggestions = ordered.map((suggestion, index) => ({
    ...suggestion,
    rank: index + 1,
    decision_reason: buildDecisionReason(suggestion),
  }))

  return {
    suggestions,
    nextBestQuestions: buildNextBestQuestions(input, suggestions, validation.warnings),
    requiresMoreData,
    counts,
  }
}

export function buildEmptyValidationSummary(): CDSSEngineResult['validation_summary'] {
  return {
    total_raw: 0,
    total_validated: 0,
    recommended_count: 0,
    review_count: 0,
    must_not_miss_count: 0,
    deferred_count: 0,
    requires_more_data: true,
    unverified_codes: [],
    warnings: [],
  }
}
