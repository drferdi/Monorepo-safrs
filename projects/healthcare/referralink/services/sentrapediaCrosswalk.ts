import { ICD10_LEGACY_CATALOG } from '../data/icd10LegacyCatalog'
import sentrapediaDiseaseExtract from '../data/sentrapediaDiseaseExtract.json'

export type SentrapediaCrosswalkBucket = 'direct' | 'normalized' | 'editorial_only' | 'exclude'
export type SentrapediaCodePattern = 'single' | 'range' | 'multi' | 'unknown'

export interface SentrapediaDiseaseExtractEntry {
  id: number
  name: string
  category: string
  code: string
  summary: string
  referralContext: string
}

export interface SentrapediaCrosswalkEntry {
  sentrapediaId: number
  sentrapediaName: string
  sentrapediaCategory: string
  sentrapediaCode: string
  codePattern: SentrapediaCodePattern
  normalizedCodes: string[]
  bucket: SentrapediaCrosswalkBucket
  masterCode?: string
  masterOfficialLabel?: string
  rationale: string
  summary: string
  referralContext: string
  searchTerms: string[]
}

export interface SentrapediaTranslatorEnrichment {
  bucket: Extract<SentrapediaCrosswalkBucket, 'direct' | 'normalized'>
  sentrapediaId: number
  sentrapediaName: string
  sentrapediaCode: string
  sentrapediaCategory: string
  summary: string
  referralContext: string
  searchTerms: string[]
}

interface SentrapediaCrosswalkCandidate {
  masterCode: string
  masterOfficialLabel: string
  reason: string
  score: number
}

interface SentrapediaExtractDocument {
  source: string
  description: string
  entries: SentrapediaDiseaseExtractEntry[]
}

const SENTRAPEDIA_SOURCE = sentrapediaDiseaseExtract as SentrapediaExtractDocument

const MASTER_CODE_SET = new Set(
  ICD10_LEGACY_CATALOG.map((entry) => normalizeCodeDisplay(entry.code))
)

function normalizeTerm(value: string) {
  return value
    .toLocaleLowerCase('en-US')
    .replace(/[()]/g, ' ')
    .replace(/[^\p{L}\p{N}+/. -]+/gu, ' ')
    .replace(/\s+/g, ' ')
    .trim()
}

function normalizeCode(value: string) {
  return value.toLocaleUpperCase('en-US').replace(/\s+/g, '').replace(/\./g, '')
}

function normalizeCodeDisplay(value: string) {
  return value.toLocaleUpperCase('en-US').replace(/\s+/g, '')
}

function getCodeFamily(value: string) {
  const normalized = normalizeCodeDisplay(value)
  const match = normalized.match(/^[A-Z]\d{2}/)
  return match ? match[0] : ''
}

function splitCodeParts(rawCode: string) {
  return rawCode
    .split(',')
    .map((part) => part.trim())
    .filter(Boolean)
}

function getCodePattern(rawCode: string): SentrapediaCodePattern {
  if (!rawCode.trim()) return 'unknown'
  if (rawCode.includes(',')) return 'multi'
  if (rawCode.includes('-')) return 'range'
  return 'single'
}

function getNormalizedCodes(rawCode: string) {
  return splitCodeParts(rawCode).map(normalizeCodeDisplay)
}

function getRangeFamilies(rawCode: string) {
  return rawCode
    .split('-')
    .map((part) => getCodeFamily(part.trim()))
    .filter(Boolean)
}

function extractSearchTerms(name: string) {
  const normalizedName = name.replace(/\s+/g, ' ').trim()
  const variants = new Set<string>([normalizedName])
  const slashParts = normalizedName
    .split('/')
    .map((part) => part.trim())
    .filter(Boolean)
  const bracketParts = [...normalizedName.matchAll(/\(([^)]+)\)/g)].map((match) => match[1].trim())

  for (const part of slashParts) variants.add(part)
  for (const part of bracketParts) variants.add(part)

  const withoutBrackets = normalizedName
    .replace(/\([^)]*\)/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
  if (withoutBrackets) variants.add(withoutBrackets)

  return [...variants].filter(Boolean)
}

function getTermOverlapScore(entryTerms: string[], candidateTerms: string[]) {
  const normalizedCandidates = candidateTerms.map(normalizeTerm)
  let score = 0

  for (const entryTerm of entryTerms) {
    const normalizedEntryTerm = normalizeTerm(entryTerm)
    if (!normalizedEntryTerm) continue

    if (normalizedCandidates.includes(normalizedEntryTerm)) {
      score = Math.max(score, 36)
      continue
    }

    for (const candidateTerm of normalizedCandidates) {
      if (
        normalizedEntryTerm.includes(candidateTerm) ||
        candidateTerm.includes(normalizedEntryTerm)
      ) {
        score = Math.max(score, 24)
      }
    }
  }

  return score
}

function buildCandidate(
  entry: SentrapediaDiseaseExtractEntry
): SentrapediaCrosswalkCandidate | null {
  const codePattern = getCodePattern(entry.code)
  const normalizedCodes = getNormalizedCodes(entry.code)
  const entryTerms = extractSearchTerms(entry.name)
  const normalizedEntryName = normalizeTerm(entry.name)
  let bestCandidate: SentrapediaCrosswalkCandidate | null = null

  for (const masterEntry of ICD10_LEGACY_CATALOG) {
    const normalizedMasterCode = normalizeCode(masterEntry.code)
    const masterFamily = getCodeFamily(masterEntry.code)
    let score = 0
    let reason = ''

    if (codePattern === 'single' && normalizedCodes[0] === normalizeCodeDisplay(masterEntry.code)) {
      score = 100
      reason = 'single-code exact match with the ICD master entry'
    } else if (
      codePattern === 'single' &&
      normalizedCodes[0] &&
      (normalizedMasterCode.startsWith(normalizeCode(entry.code)) ||
        normalizeCode(entry.code).startsWith(normalizedMasterCode))
    ) {
      score = 86
      reason = 'single code needs subcategory normalization against the ICD master entry'
    } else if (
      codePattern === 'range' &&
      getRangeFamilies(entry.code).some((family) => family === masterFamily)
    ) {
      score = 76
      reason = 'range-coded entry needs narrowing before it can target the ICD master code'
    } else if (
      codePattern !== 'unknown' &&
      normalizedCodes.some(
        (codePart) => codePart === masterFamily || codePart.includes(masterFamily)
      )
    ) {
      score = 78
      reason = 'multi-code entry references the ICD master code family'
    }

    const termScore = getTermOverlapScore(entryTerms, [
      masterEntry.officialLabel,
      ...masterEntry.aliases,
    ])

    if (!score && termScore >= 24) {
      score = termScore + 32
      reason = 'clinical terminology overlaps the ICD master label but needs normalization'
    } else if (score) {
      score += termScore
    }

    if (normalizedEntryName.includes(normalizeTerm(masterEntry.officialLabel))) {
      score += 6
    }

    if (
      !bestCandidate ||
      score > bestCandidate.score ||
      (score === bestCandidate.score && masterEntry.code.length > bestCandidate.masterCode.length)
    ) {
      bestCandidate = score
        ? {
            masterCode: masterEntry.code,
            masterOfficialLabel: masterEntry.officialLabel,
            reason,
            score,
          }
        : bestCandidate
    }
  }

  return bestCandidate
}

function pickPreferredIndex(indices: number[]) {
  const [firstIndex, ...remainingIndices] = indices
  if (firstIndex === undefined) {
    throw new Error('Cannot select a preferred Sentrapedia entry from an empty list.')
  }

  return remainingIndices.reduce((bestIndex, currentIndex) => {
    const currentEntry = SENTRAPEDIA_SOURCE.entries[currentIndex]
    const bestEntry = SENTRAPEDIA_SOURCE.entries[bestIndex]
    const currentScore =
      extractSearchTerms(currentEntry.name).length * 10 - currentEntry.name.length
    const bestScore = extractSearchTerms(bestEntry.name).length * 10 - bestEntry.name.length
    return currentScore > bestScore ? currentIndex : bestIndex
  }, firstIndex)
}

function buildCrosswalkReview() {
  const candidateByIndex = SENTRAPEDIA_SOURCE.entries.map((entry) => buildCandidate(entry))
  const targetToIndices = new Map<string, number[]>()
  const exactCodeToIndices = new Map<string, number[]>()

  candidateByIndex.forEach((candidate, index) => {
    if (candidate) {
      const existing = targetToIndices.get(candidate.masterCode) ?? []
      existing.push(index)
      targetToIndices.set(candidate.masterCode, existing)
    }

    const entry = SENTRAPEDIA_SOURCE.entries[index]
    if (getCodePattern(entry.code) === 'single') {
      const normalizedCode = normalizeCodeDisplay(entry.code)
      const existing = exactCodeToIndices.get(normalizedCode) ?? []
      existing.push(index)
      exactCodeToIndices.set(normalizedCode, existing)
    }
  })

  const preferredByMasterCode = new Map<string, number>()
  for (const [masterCode, indices] of targetToIndices.entries()) {
    const [firstIndex, ...remainingIndices] = indices
    if (firstIndex === undefined) continue

    const preferred = remainingIndices.reduce((bestIndex, currentIndex) => {
      const bestCandidate = candidateByIndex[bestIndex]
      const currentCandidate = candidateByIndex[currentIndex]
      if (!bestCandidate || !currentCandidate) return bestIndex
      return currentCandidate.score > bestCandidate.score ? currentIndex : bestIndex
    }, firstIndex)
    preferredByMasterCode.set(masterCode, preferred)
  }

  const preferredByExactCode = new Map<string, number>()
  for (const [normalizedCode, indices] of exactCodeToIndices.entries()) {
    preferredByExactCode.set(normalizedCode, pickPreferredIndex(indices))
  }

  return SENTRAPEDIA_SOURCE.entries.map<SentrapediaCrosswalkEntry>((entry, index) => {
    const candidate = candidateByIndex[index]
    const codePattern = getCodePattern(entry.code)
    const normalizedCodes = getNormalizedCodes(entry.code)
    const searchTerms = extractSearchTerms(entry.name)
    const exactCodeGroup =
      codePattern === 'single' ? (exactCodeToIndices.get(normalizedCodes[0] ?? '') ?? []) : []
    const preferredExactCodeIndex =
      codePattern === 'single' ? preferredByExactCode.get(normalizedCodes[0] ?? '') : undefined

    if (candidate && preferredByMasterCode.get(candidate.masterCode) === index) {
      const bucket: SentrapediaCrosswalkBucket =
        codePattern === 'single' &&
        normalizeCodeDisplay(entry.code) === normalizeCodeDisplay(candidate.masterCode)
          ? 'direct'
          : 'normalized'

      return {
        sentrapediaId: entry.id,
        sentrapediaName: entry.name,
        sentrapediaCategory: entry.category,
        sentrapediaCode: entry.code,
        codePattern,
        normalizedCodes,
        bucket,
        masterCode: candidate.masterCode,
        masterOfficialLabel: candidate.masterOfficialLabel,
        rationale: candidate.reason,
        summary: entry.summary,
        referralContext: entry.referralContext,
        searchTerms,
      }
    }

    if (candidate) {
      return {
        sentrapediaId: entry.id,
        sentrapediaName: entry.name,
        sentrapediaCategory: entry.category,
        sentrapediaCode: entry.code,
        codePattern,
        normalizedCodes,
        bucket: 'exclude',
        masterCode: candidate.masterCode,
        masterOfficialLabel: candidate.masterOfficialLabel,
        rationale:
          'another Sentrapedia entry is a clearer translator candidate for this ICD master code',
        summary: entry.summary,
        referralContext: entry.referralContext,
        searchTerms,
      }
    }

    if (
      exactCodeGroup.length > 1 &&
      preferredExactCodeIndex !== undefined &&
      preferredExactCodeIndex !== index
    ) {
      return {
        sentrapediaId: entry.id,
        sentrapediaName: entry.name,
        sentrapediaCategory: entry.category,
        sentrapediaCode: entry.code,
        codePattern,
        normalizedCodes,
        bucket: 'exclude',
        rationale: 'duplicate exact-code variant; keep the clearer sibling entry for future review',
        summary: entry.summary,
        referralContext: entry.referralContext,
        searchTerms,
      }
    }

    return {
      sentrapediaId: entry.id,
      sentrapediaName: entry.name,
      sentrapediaCategory: entry.category,
      sentrapediaCode: entry.code,
      codePattern,
      normalizedCodes,
      bucket: 'editorial_only',
      rationale:
        'not linked to the ICD master slice; keep only for Indonesian terminology and referral context',
      summary: entry.summary,
      referralContext: entry.referralContext,
      searchTerms,
    }
  })
}

export const SENTRAPEDIA_CROSSWALK_REVIEW = buildCrosswalkReview()

export const SENTRAPEDIA_CROSSWALK_SUMMARY = {
  source: SENTRAPEDIA_SOURCE.source,
  description: SENTRAPEDIA_SOURCE.description,
  totalEntries: SENTRAPEDIA_CROSSWALK_REVIEW.length,
  byBucket: SENTRAPEDIA_CROSSWALK_REVIEW.reduce<Record<SentrapediaCrosswalkBucket, number>>(
    (accumulator, entry) => {
      accumulator[entry.bucket] += 1
      return accumulator
    },
    {
      direct: 0,
      normalized: 0,
      editorial_only: 0,
      exclude: 0,
    }
  ),
  byCodePattern: SENTRAPEDIA_CROSSWALK_REVIEW.reduce<Record<SentrapediaCodePattern, number>>(
    (accumulator, entry) => {
      accumulator[entry.codePattern] += 1
      return accumulator
    },
    {
      single: 0,
      range: 0,
      multi: 0,
      unknown: 0,
    }
  ),
}

const ENRICHMENT_BY_MASTER_CODE = new Map<string, SentrapediaTranslatorEnrichment>(
  SENTRAPEDIA_CROSSWALK_REVIEW.flatMap((entry) => {
    if (!entry.masterCode || (entry.bucket !== 'direct' && entry.bucket !== 'normalized')) return []

    return [
      [
        entry.masterCode,
        {
          bucket: entry.bucket,
          sentrapediaId: entry.sentrapediaId,
          sentrapediaName: entry.sentrapediaName,
          sentrapediaCode: entry.sentrapediaCode,
          sentrapediaCategory: entry.sentrapediaCategory,
          summary: entry.summary,
          referralContext: entry.referralContext,
          searchTerms: entry.searchTerms,
        },
      ] satisfies [string, SentrapediaTranslatorEnrichment],
    ]
  })
)

export function getSentrapediaTranslatorEnrichment(code: string) {
  return ENRICHMENT_BY_MASTER_CODE.get(code)
}

export function getSentrapediaTranslatorSearchTerms(code: string) {
  return getSentrapediaTranslatorEnrichment(code)?.searchTerms ?? []
}

export function getSentrapediaCrosswalkEntriesByBucket(bucket: SentrapediaCrosswalkBucket) {
  return SENTRAPEDIA_CROSSWALK_REVIEW.filter((entry) => entry.bucket === bucket)
}

export function isIcdMasterCodeAvailable(code: string) {
  return MASTER_CODE_SET.has(normalizeCodeDisplay(code))
}
