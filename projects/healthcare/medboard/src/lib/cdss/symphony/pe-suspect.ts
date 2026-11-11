// Copyright 2026 Sentra. All rights reserved. Proprietary and confidential.
// Designed and constructed by Drferdi.
/**
 * Pulmonary Embolism (PE) Suspect — deterministic safety gate.
 *
 * Adapts the Wells criteria into a primary-care-friendly count. When 3 or more
 * criteria are met, the gate emits a CRITICAL alert `SYMPHONY_PE_SUSPECT` with
 * `source: 'safety_gate'` and `gate: 'GATE_9_PE'`. Below threshold the gate is
 * silent — clinicians keep their own differential without a false escalation.
 *
 * The criteria use only data already available in `SymphonyAssessmentInput`:
 * latest vitals, chief/additional complaint text, medical-history strings, and
 * pregnancy status. No LLM call; no external service.
 *
 * Text matching is regex-based with Indonesian and English keywords. Patterns
 * are intentionally broad at the complaint/history layer and tight at the
 * vital-sign layer to reduce false negatives without flipping purely
 * non-specific presentations into critical alerts.
 */

import type {
  SymphonyAlert,
  SymphonyPregnancyStatus,
  SymphonyVitalsInput,
} from '@/types/abyss/symphony'

export interface SymphonyPeSuspectInput {
  latestVitals?: SymphonyVitalsInput
  chiefComplaint?: string
  additionalComplaint?: string
  medicalHistory?: string[]
  pregnancyStatus?: SymphonyPregnancyStatus
}

export type SymphonyPeSuspectCriterion =
  | 'tachycardia_gt_100'
  | 'hypoxia_spo2_lt_92'
  | 'tachypnea_rr_gt_20'
  | 'sudden_dyspnea'
  | 'pleuritic_chest_pain'
  | 'unilateral_leg_swelling'
  | 'hemoptysis'
  | 'recent_immobilization_or_surgery'
  | 'prior_dvt_or_pe'
  | 'active_pregnancy'
  | 'active_malignancy'

export interface SymphonyPeSuspectResult {
  suspect: boolean
  criteriaMet: SymphonyPeSuspectCriterion[]
  score: number
}

export const SYMPHONY_PE_SUSPECT_THRESHOLD = 3

// ── Regex patterns ────────────────────────────────────────────────────────────

const DYSPNEA_PATTERNS: RegExp[] = [
  /sesak\s+napas/i,
  /sesak\s+mendadak/i,
  /\bsesak\b/i,
  /dyspnea/i,
  /dyspnoea/i,
  /\bsob\b/i,
  /shortness\s+of\s+breath/i,
]

const PLEURITIC_CHEST_PATTERNS: RegExp[] = [
  /nyeri\s+dada\s+pleuritik/i,
  /pleuritic\s+chest/i,
  /\bpleuritik\b/i,
]

const UNILATERAL_LEG_PATTERNS: RegExp[] = [
  /bengkak\s+kaki(\s+(kiri|kanan|sebelah))?/i,
  /pembengkakan\s+tungkai/i,
  /unilateral\s+leg/i,
  /tungkai\s+(kiri|kanan|sebelah)\s+bengkak/i,
]

const HEMOPTYSIS_PATTERNS: RegExp[] = [/batuk\s+darah/i, /hemoptysis/i, /hemoptisis/i]

const IMMOBILIZATION_PATTERNS: RegExp[] = [
  /\bbedrest\b/i,
  /immobili[sz]asi/i,
  /immobili[sz]ation/i,
  /paska\s+operasi/i,
  /pasca\s+operasi/i,
  /post[-\s]?op(erative)?/i,
  /tirah\s+baring/i,
]

const PRIOR_DVT_PATTERNS: RegExp[] = [
  /\bdvt\b/i,
  /deep\s+vein\s+thrombos/i,
  /emboli\s+paru/i,
  /pulmonary\s+embolism/i,
  /riwayat\s+pe\b/i,
]

const MALIGNANCY_PATTERNS: RegExp[] = [
  /\bkanker\b/i,
  /keganasan/i,
  /\bmalignan\b/i,
  /malignancy/i,
  /tumor\s+(maligna|ganas)/i,
  /\bca\s+(paru|mamae|kolon|serviks)/i,
]

function matchesAny(text: string | undefined, patterns: RegExp[]): boolean {
  if (!text) return false
  return patterns.some((p) => p.test(text))
}

function combinedComplaintText(input: SymphonyPeSuspectInput): string {
  return [input.chiefComplaint ?? '', input.additionalComplaint ?? ''].join(' ')
}

function combinedHistoryText(input: SymphonyPeSuspectInput): string {
  return (input.medicalHistory ?? []).join(' ')
}

// ── Detector ──────────────────────────────────────────────────────────────────

export function detectSymphonyPeSuspect(input: SymphonyPeSuspectInput): SymphonyPeSuspectResult {
  const criteria: SymphonyPeSuspectCriterion[] = []
  const vitals = input.latestVitals
  const complaintText = combinedComplaintText(input)
  const historyText = combinedHistoryText(input)

  if (vitals?.heartRate !== undefined && vitals.heartRate > 100) {
    criteria.push('tachycardia_gt_100')
  }
  if (vitals?.spo2 !== undefined && vitals.spo2 < 92) {
    criteria.push('hypoxia_spo2_lt_92')
  }
  if (vitals?.respiratoryRate !== undefined && vitals.respiratoryRate > 20) {
    criteria.push('tachypnea_rr_gt_20')
  }
  if (matchesAny(complaintText, DYSPNEA_PATTERNS)) {
    criteria.push('sudden_dyspnea')
  }
  if (matchesAny(complaintText, PLEURITIC_CHEST_PATTERNS)) {
    criteria.push('pleuritic_chest_pain')
  }
  if (matchesAny(complaintText, UNILATERAL_LEG_PATTERNS)) {
    criteria.push('unilateral_leg_swelling')
  }
  if (matchesAny(complaintText, HEMOPTYSIS_PATTERNS)) {
    criteria.push('hemoptysis')
  }
  if (matchesAny(historyText, IMMOBILIZATION_PATTERNS)) {
    criteria.push('recent_immobilization_or_surgery')
  }
  if (matchesAny(historyText, PRIOR_DVT_PATTERNS)) {
    criteria.push('prior_dvt_or_pe')
  }
  if (input.pregnancyStatus === 'pregnant') {
    criteria.push('active_pregnancy')
  }
  if (matchesAny(historyText, MALIGNANCY_PATTERNS)) {
    criteria.push('active_malignancy')
  }

  const score = criteria.length
  const suspect = score >= SYMPHONY_PE_SUSPECT_THRESHOLD
  return { suspect, criteriaMet: criteria, score }
}

// ── Alert adapter ─────────────────────────────────────────────────────────────

export function peSuspectToSymphonyAlerts(
  result: SymphonyPeSuspectResult,
  triggeredAt: string
): SymphonyAlert[] {
  if (!result.suspect) return []
  return [
    {
      id: 'SYMPHONY_PE_SUSPECT',
      severity: 'critical',
      title: 'Suspek emboli paru (PE)',
      reasoning: [
        `Kriteria PE terpenuhi: ${result.criteriaMet.length} dari ambang ${SYMPHONY_PE_SUSPECT_THRESHOLD}.`,
        `Kriteria terdeteksi: ${result.criteriaMet.join(', ')}.`,
        'Pertimbangkan D-dimer dan CT-PA bila tersedia; oksigen suplemen dan rujukan segera.',
      ],
      source: 'safety_gate',
      gate: 'GATE_9_PE',
      acknowledged: false,
      triggeredAt,
    },
  ]
}
