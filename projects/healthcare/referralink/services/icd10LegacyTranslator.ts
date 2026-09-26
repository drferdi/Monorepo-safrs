import { ICD10_LEGACY_CATALOG, type Icd10LegacyCatalogEntry } from '../data/icd10LegacyCatalog'

import {
  getSentrapediaTranslatorEnrichment,
  getSentrapediaTranslatorSearchTerms,
  type SentrapediaTranslatorEnrichment,
} from './sentrapediaCrosswalk'

export type Icd10LegacyMatchKind =
  | 'exact-code'
  | 'exact-label'
  | 'possible-alias'
  | 'possible-crosswalk-term'
  | 'possible-label'

export interface Icd10LegacySearchResult {
  entry: Icd10LegacyCatalogEntry
  enrichment?: SentrapediaTranslatorEnrichment
  match: {
    kind: Icd10LegacyMatchKind
    term: string
  }
}

export function getIcd10LegacyMatchExplanation(match: Icd10LegacySearchResult['match']) {
  if (match.kind === 'exact-code') {
    return 'The entered ICD-10 code exactly matches this local reference entry.'
  }

  if (match.kind === 'exact-label') {
    return 'The entered official label exactly matches this local reference entry.'
  }

  if (match.kind === 'possible-alias') {
    return 'Matched an editorial alias. Verify the official ICD-10 tabular listing before final coding.'
  }

  if (match.kind === 'possible-crosswalk-term') {
    return 'Matched a Sentrapedia enrichment term. Keep the ICD master entry as the coding source of truth and verify final coding.'
  }

  return 'Matched part of the official label. Verify the complete label and coding context before final coding.'
}

function normalize(value: string) {
  return value.trim().toLocaleLowerCase('en-US').replace(/\s+/g, ' ')
}

function normalizeCode(value: string) {
  return normalize(value).replace(/\./g, '')
}

function rankMatch(kind: Icd10LegacyMatchKind) {
  return [
    'exact-code',
    'exact-label',
    'possible-alias',
    'possible-crosswalk-term',
    'possible-label',
  ].indexOf(kind)
}

const MAX_TRANSLATOR_RESULTS = 15

const ICD10_LEGACY_SEARCH_INDEX = ICD10_LEGACY_CATALOG.map((entry) => ({
  entry,
  enrichment: getSentrapediaTranslatorEnrichment(entry.code),
  normalizedCode: normalizeCode(entry.code),
  normalizedLabel: normalize(entry.officialLabel),
  normalizedAliases: entry.aliases.map((alias) => ({
    raw: alias,
    normalized: normalize(alias),
  })),
  normalizedCrosswalkTerms: getSentrapediaTranslatorSearchTerms(entry.code).map((term) => ({
    raw: term,
    normalized: normalize(term),
  })),
}))

function getContainsPriority(value: string, query: string) {
  if (value === query) return 0
  if (value.startsWith(query)) return 1
  return 2
}

export function searchIcd10LegacyCatalog(query: string): Icd10LegacySearchResult[] {
  const normalizedQuery = normalize(query)
  if (!normalizedQuery) return []

  const normalizedCode = normalizeCode(query)
  const results = ICD10_LEGACY_SEARCH_INDEX.flatMap(
    ({
      entry,
      enrichment,
      normalizedCode: entryCode,
      normalizedLabel,
      normalizedAliases,
      normalizedCrosswalkTerms,
    }): Icd10LegacySearchResult[] => {
      if (entryCode === normalizedCode) {
        return [{ entry, enrichment, match: { kind: 'exact-code', term: entry.code } }]
      }

      if (normalizedLabel === normalizedQuery) {
        return [{ entry, enrichment, match: { kind: 'exact-label', term: entry.officialLabel } }]
      }

      const matchingAlias = normalizedAliases.find((alias) =>
        alias.normalized.includes(normalizedQuery)
      )
      if (matchingAlias) {
        return [{ entry, enrichment, match: { kind: 'possible-alias', term: matchingAlias.raw } }]
      }

      const matchingCrosswalkTerm = normalizedCrosswalkTerms.find((term) =>
        term.normalized.includes(normalizedQuery)
      )
      if (matchingCrosswalkTerm) {
        return [
          {
            entry,
            enrichment,
            match: { kind: 'possible-crosswalk-term', term: matchingCrosswalkTerm.raw },
          },
        ]
      }

      if (normalizedLabel.includes(normalizedQuery)) {
        return [{ entry, enrichment, match: { kind: 'possible-label', term: entry.officialLabel } }]
      }

      return []
    }
  )

  return results
    .sort((left, right) => {
      const matchRank = rankMatch(left.match.kind) - rankMatch(right.match.kind)
      if (matchRank !== 0) return matchRank

      const containsRank =
        getContainsPriority(normalize(left.match.term), normalizedQuery) -
        getContainsPriority(normalize(right.match.term), normalizedQuery)
      if (containsRank !== 0) return containsRank

      const labelLengthRank = left.entry.officialLabel.length - right.entry.officialLabel.length
      if (labelLengthRank !== 0) return labelLengthRank

      return left.entry.code.localeCompare(right.entry.code)
    })
    .slice(0, MAX_TRANSLATOR_RESULTS)
}
