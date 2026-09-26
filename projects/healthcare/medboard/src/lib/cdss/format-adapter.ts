/**
 * CDSS Format Adapter — converts between Ghost Protocol and Dashboard suggestion formats.
 * Ghost Protocol: DiagnosisSuggestion (api.ts) — icd_x, nama, confidence, rationale
 * Dashboard: IskandarSuggestion (clinical.ts) — icd10Code, reasoning, differentialDiagnoses
 */

import type { IskandarSuggestion } from '@/types/abyss/clinical'

/** Ghost Protocol's DiagnosisSuggestion shape (from types/api.ts) */
export interface GhostDiagnosisSuggestion {
  rank: number
  icd_x: string
  nama: string
  diagnosis_name?: string
  icd10_code?: string
  confidence: number
  rationale: string
  red_flags?: string[]
}

/** Convert Ghost Protocol DiagnosisSuggestion[] → Dashboard IskandarSuggestion */
export function ghostToDashboardSuggestion(
  ghost: GhostDiagnosisSuggestion,
  engineVersion: string
): IskandarSuggestion {
  return {
    engineVersion,
    confidence: ghost.confidence,
    reasoning: ghost.rationale,
    supportingEvidence: ghost.red_flags ?? [],
    differentialDiagnoses: [
      {
        icd10Code: ghost.icd_x,
        description: ghost.diagnosis_name ?? ghost.nama,
        confidence: ghost.confidence,
      },
    ],
    suggestedAt: new Date().toISOString(),
  }
}

/** Convert array of Ghost suggestions → Dashboard format */
export function ghostToDashboardSuggestions(
  suggestions: GhostDiagnosisSuggestion[],
  engineVersion = 'ghost-iskandar-v1'
): IskandarSuggestion[] {
  return suggestions.map(s => ghostToDashboardSuggestion(s, engineVersion))
}

/** Convert Dashboard IskandarSuggestion → Ghost Protocol format */
export function dashboardToGhostSuggestion(
  dashboard: IskandarSuggestion,
  rank: number
): GhostDiagnosisSuggestion {
  const primary = dashboard.differentialDiagnoses[0]
  return {
    rank,
    icd_x: primary?.icd10Code ?? 'UNKNOWN',
    nama: primary?.description ?? '',
    confidence: dashboard.confidence,
    rationale: dashboard.reasoning,
    red_flags: dashboard.supportingEvidence,
  }
}

/** Convert array of Dashboard suggestions → Ghost format */
export function dashboardToGhostSuggestions(
  suggestions: IskandarSuggestion[]
): GhostDiagnosisSuggestion[] {
  return suggestions.map((s, i) => dashboardToGhostSuggestion(s, i + 1))
}
