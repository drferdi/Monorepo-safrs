/**
 * CDSS Format Adapter — converts between Asisten Medis and Dashboard suggestion formats.
 * Asisten Medis: DiagnosisSuggestion (api.ts) — icd_x, nama, confidence, rationale
 * Dashboard: IskandarSuggestion (clinical.ts) — icd10Code, reasoning, differentialDiagnoses
 */

import type { IskandarSuggestion } from '@/types/abyss/clinical'

/** Asisten Medis' DiagnosisSuggestion shape (from types/api.ts) */
export interface AssistDiagnosisSuggestion {
  rank: number
  icd_x: string
  nama: string
  diagnosis_name?: string
  icd10_code?: string
  confidence: number
  rationale: string
  red_flags?: string[]
}

/** Convert Asisten Medis DiagnosisSuggestion[] → Dashboard IskandarSuggestion */
export function assistToDashboardSuggestion(
  assist: AssistDiagnosisSuggestion,
  engineVersion: string
): IskandarSuggestion {
  return {
    engineVersion,
    confidence: assist.confidence,
    reasoning: assist.rationale,
    supportingEvidence: assist.red_flags ?? [],
    differentialDiagnoses: [
      {
        icd10Code: assist.icd_x,
        description: assist.diagnosis_name ?? assist.nama,
        confidence: assist.confidence,
      },
    ],
    suggestedAt: new Date().toISOString(),
  }
}

/** Convert array of Asisten Medis suggestions → Dashboard format */
export function assistToDashboardSuggestions(
  suggestions: AssistDiagnosisSuggestion[],
  engineVersion = 'ghost-iskandar-v1'
): IskandarSuggestion[] {
  return suggestions.map(s => assistToDashboardSuggestion(s, engineVersion))
}

/** Convert Dashboard IskandarSuggestion → Asisten Medis format */
export function dashboardToAssistSuggestion(
  dashboard: IskandarSuggestion,
  rank: number
): AssistDiagnosisSuggestion {
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

/** Convert array of Dashboard suggestions → Asisten Medis format */
export function dashboardToAssistSuggestions(
  suggestions: IskandarSuggestion[]
): AssistDiagnosisSuggestion[] {
  return suggestions.map((s, i) => dashboardToAssistSuggestion(s, i + 1))
}
