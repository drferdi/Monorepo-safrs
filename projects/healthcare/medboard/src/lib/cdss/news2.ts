/**
 * NEWS2 — National Early Warning Score 2
 *
 * Graduated vital signs scoring (0-3 per parameter) for early detection
 * of physiological deterioration. Catches subtle deviations that binary
 * threshold checks miss.
 *
 * Reference: Royal College of Physicians (UK), 2017
 * Paper: Ben Ida et al. "Adaptive vital signs monitoring system based on
 * the early warning score approach" (IET Smart Cities, 2021)
 *
 * Integration: Called after checkVitalRedFlags() in engine.ts.
 * NEWS2 provides graduated warning; vital red flags provide binary emergency.
 */

import { avpuToNEWS2Score } from '../vitals/avpu-gcs-mapper'
import type { AVPULevel } from '../vitals/unified-vitals'
import type { VitalSigns } from './types'

// ── Score Types ──────────────────────────────────────────────────────────────

export type NEWS2RiskLevel = 'low' | 'low_medium' | 'medium' | 'high'

export type NEWS2ParameterScore = {
  parameter: string
  value: number | string | undefined
  score: number
  unit: string
}

export type NEWS2Result = {
  aggregate_score: number
  risk_level: NEWS2RiskLevel
  parameter_scores: NEWS2ParameterScore[]
  has_extreme_single: boolean // any single parameter scored 3
  monitoring_recommendation: string
  clinical_response: string
  scoreable_parameters: number
}

// ── Scoring Functions (per parameter) ────────────────────────────────────────

function scoreRespiratoryRate(rr: number | undefined): NEWS2ParameterScore {
  if (rr === undefined)
    return { parameter: 'respiratory_rate', value: undefined, score: 0, unit: 'x/mnt' }
  let score = 0
  if (rr <= 8) score = 3
  else if (rr <= 11) score = 1
  else if (rr <= 20) score = 0
  else if (rr <= 24) score = 2
  else score = 3 // ≥25
  return { parameter: 'respiratory_rate', value: rr, score, unit: 'x/mnt' }
}

/**
 * SpO2 Scale 1 — Standard (target ≥96%)
 * For patients WITHOUT confirmed hypercapnic respiratory failure.
 */
function scoreSpO2Scale1(spo2: number | undefined): NEWS2ParameterScore {
  if (spo2 === undefined) return { parameter: 'spo2', value: undefined, score: 0, unit: '%' }
  let score = 0
  if (spo2 <= 91) score = 3
  else if (spo2 <= 93) score = 2
  else if (spo2 <= 95) score = 1
  else score = 0 // ≥96
  return { parameter: 'spo2', value: spo2, score, unit: '%' }
}

/**
 * SpO2 Scale 2 — For confirmed COPD / hypercapnic respiratory failure
 * Target range: 88-92%. Scores deviation from this range.
 * Reference: RCP NEWS2 2017, Section 7.2
 */
function scoreSpO2Scale2(spo2: number | undefined): NEWS2ParameterScore {
  if (spo2 === undefined) return { parameter: 'spo2_scale2', value: undefined, score: 0, unit: '%' }
  let score = 0
  if (spo2 <= 83) score = 3
  else if (spo2 <= 85) score = 2
  else if (spo2 <= 87) score = 1
  else if (spo2 <= 92)
    score = 0 // 88-92 = target range untuk pasien COPD/hypercapnic
  else if (spo2 <= 94)
    score = 1 // 93-94 = terlalu tinggi untuk pasien hypercapnic
  else if (spo2 <= 96)
    score = 2 // 95-96 = signifikan terlalu tinggi
  else score = 3 // ≥97 pada O2 = BERBAHAYA untuk pasien COPD/hypercapnic
  // O2 berlebih menekan hypoxic drive → retensi CO2 → narcosis
  return { parameter: 'spo2_scale2', value: spo2, score, unit: '%' }
}

/**
 * Consciousness scoring per NEWS2 standard (parameter #6).
 * A (Alert) = 0, any other level (C/V/P/U) = 3.
 * A score of 3 on consciousness alone triggers "low_medium" escalation.
 */
function scoreConsciousness(avpu: AVPULevel | undefined): NEWS2ParameterScore {
  if (avpu === undefined)
    return { parameter: 'consciousness', value: undefined, score: 0, unit: 'AVPU' }
  const score = avpuToNEWS2Score(avpu)
  return { parameter: 'consciousness', value: avpu, score, unit: 'AVPU' }
}

/**
 * Supplemental oxygen scoring.
 * If patient is receiving any supplemental O2 → +2 to aggregate score.
 * Reference: RCP NEWS2 2017, Section 7.1
 */
function scoreSupplementalO2(onO2: boolean | undefined): NEWS2ParameterScore {
  if (onO2 === undefined)
    return { parameter: 'supplemental_o2', value: undefined, score: 0, unit: '' }
  const score = onO2 ? 2 : 0
  return { parameter: 'supplemental_o2', value: onO2 ? 'Yes' : 'No', score, unit: '' }
}

function scoreSystolic(systolic: number | undefined): NEWS2ParameterScore {
  if (systolic === undefined)
    return { parameter: 'systolic', value: undefined, score: 0, unit: 'mmHg' }
  let score = 0
  if (systolic <= 90) score = 3
  else if (systolic <= 100) score = 2
  else if (systolic <= 110) score = 1
  else if (systolic <= 219) score = 0
  else score = 3 // ≥220
  return { parameter: 'systolic', value: systolic, score, unit: 'mmHg' }
}

function scoreHeartRate(hr: number | undefined): NEWS2ParameterScore {
  if (hr === undefined) return { parameter: 'heart_rate', value: undefined, score: 0, unit: 'bpm' }
  let score = 0
  if (hr <= 40) score = 3
  else if (hr <= 50) score = 1
  else if (hr <= 90) score = 0
  else if (hr <= 110) score = 1
  else if (hr <= 130) score = 2
  else score = 3 // ≥131
  return { parameter: 'heart_rate', value: hr, score, unit: 'bpm' }
}

function scoreTemperature(temp: number | undefined): NEWS2ParameterScore {
  if (temp === undefined)
    return { parameter: 'temperature', value: undefined, score: 0, unit: '°C' }
  let score = 0
  if (temp <= 35.0) score = 3
  else if (temp <= 36.0) score = 1
  else if (temp <= 38.0) score = 0
  else if (temp <= 39.0) score = 1
  else score = 2 // ≥39.1
  return { parameter: 'temperature', value: temp, score, unit: '°C' }
}

// ── Risk Level & Response ────────────────────────────────────────────────────

function determineRiskLevel(aggregateScore: number, hasExtremeSingle: boolean): NEWS2RiskLevel {
  if (aggregateScore >= 7) return 'high'
  if (aggregateScore >= 5) return 'medium'
  if (hasExtremeSingle) return 'low_medium'
  if (aggregateScore >= 1) return 'low'
  return 'low'
}

function getMonitoringRecommendation(risk: NEWS2RiskLevel): string {
  switch (risk) {
    case 'high':
      return 'Monitoring vital signs kontinu. Pertimbangkan rujuk ke fasilitas dengan ICU.'
    case 'medium':
      return 'Monitoring vital signs tiap 1 jam. Review urgent oleh dokter.'
    case 'low_medium':
      return 'Monitoring vital signs tiap 1 jam. Review oleh dokter untuk tentukan eskalasi.'
    case 'low':
      return 'Monitoring vital signs tiap 4-6 jam.'
  }
}

function getClinicalResponse(risk: NEWS2RiskLevel): string {
  switch (risk) {
    case 'high':
      return 'Asesmen emergensi oleh tim klinis. Pertimbangkan transfer ke level perawatan lebih tinggi.'
    case 'medium':
      return 'Review urgent oleh dokter atau perawat senior. Evaluasi apakah perlu critical care.'
    case 'low_medium':
      return 'Review urgent oleh dokter. Tentukan penyebab dan putuskan perubahan monitoring atau eskalasi.'
    case 'low':
      return 'Asesmen oleh perawat. Putuskan perubahan frekuensi monitoring jika diperlukan.'
  }
}

// ── Main Export ──────────────────────────────────────────────────────────────

/**
 * NEWS2 input options — extends VitalSigns with consciousness & O2 fields.
 * Backward compatible: if avpu/supplementalO2/hasCOPD not provided,
 * scoring proceeds with 5 parameters (legacy behavior).
 */
export interface NEWS2Input {
  vitals: VitalSigns | undefined
  avpu?: AVPULevel
  supplementalO2?: boolean
  hasCOPD?: boolean
}

/**
 * Type guard: distinguish NEWS2Input from legacy VitalSigns.
 *
 * NEWS2Input has a `vitals` key AND does NOT have `sbp`/`systolic`
 * (those belong to VitalSigns/UnifiedVitalSigns). This prevents
 * false positives if a VitalSigns object ever gains a `vitals` field.
 */
function isNEWS2Input(value: unknown): value is NEWS2Input {
  return (
    typeof value === 'object' &&
    value !== null &&
    'vitals' in value &&
    !('systolic' in value) &&
    !('sbp' in value)
  )
}

/**
 * Calculate NEWS2 score.
 *
 * Overload 1 (legacy): pass VitalSigns directly — scores 5 parameters.
 * Overload 2 (complete): pass NEWS2Input — scores all 8 parameters
 *   (6 core NEWS2 + supplemental O2 + SpO2 Scale 2 selection).
 *
 * Reference: Royal College of Physicians (UK), 2017
 */
export function calculateNEWS2(input: VitalSigns | undefined | NEWS2Input): NEWS2Result {
  // Normalize input — support both legacy and new format
  let vitals: VitalSigns | undefined
  let avpu: AVPULevel | undefined
  let supplementalO2: boolean | undefined
  let hasCOPD = false

  if (isNEWS2Input(input)) {
    // New format: NEWS2Input with explicit vitals + consciousness fields
    vitals = input.vitals
    avpu = input.avpu
    supplementalO2 = input.supplementalO2
    hasCOPD = input.hasCOPD ?? false
  } else {
    // Legacy format: VitalSigns directly (no consciousness data)
    vitals = input as VitalSigns | undefined
  }

  if (!vitals) {
    return {
      aggregate_score: 0,
      risk_level: 'low',
      parameter_scores: [],
      has_extreme_single: false,
      monitoring_recommendation: 'Tanda vital belum tersedia. Lengkapi pengukuran vital signs.',
      clinical_response: 'Tidak dapat menilai risiko tanpa data tanda vital.',
      scoreable_parameters: 0,
    }
  }

  // Select SpO2 scale based on COPD status
  const spo2Score = hasCOPD ? scoreSpO2Scale2(vitals.spo2) : scoreSpO2Scale1(vitals.spo2)

  const parameterScores: NEWS2ParameterScore[] = [
    scoreRespiratoryRate(vitals.respiratory_rate),
    spo2Score,
    scoreSystolic(vitals.systolic),
    scoreHeartRate(vitals.heart_rate),
    scoreTemperature(vitals.temperature),
    // Parameter #6: Consciousness (NEW — was missing before)
    scoreConsciousness(avpu),
    // Supplemental O2 (adds to aggregate, not a standalone parameter)
    scoreSupplementalO2(supplementalO2),
  ]

  const scoreable = parameterScores.filter(p => p.value !== undefined)
  const aggregateScore = parameterScores.reduce((sum, p) => sum + p.score, 0)
  const hasExtremeSingle = parameterScores.some(p => p.score === 3)
  const riskLevel = determineRiskLevel(aggregateScore, hasExtremeSingle)

  return {
    aggregate_score: aggregateScore,
    risk_level: riskLevel,
    parameter_scores: parameterScores.filter(p => p.value !== undefined),
    has_extreme_single: hasExtremeSingle,
    monitoring_recommendation: getMonitoringRecommendation(riskLevel),
    clinical_response: getClinicalResponse(riskLevel),
    scoreable_parameters: scoreable.length,
  }
}

// ── Utility: Convert NEWS2 to engine red_flags format ────────────────────────

export function news2ToRedFlags(result: NEWS2Result): Array<{
  severity: 'emergency' | 'urgent' | 'warning'
  condition: string
  action: string
  criteria_met: string[]
  icd_codes?: string[]
}> {
  // Only generate flags for medium+ risk
  if (result.risk_level === 'low' || result.scoreable_parameters < 2) return []

  const severity: 'emergency' | 'urgent' | 'warning' =
    result.risk_level === 'high'
      ? 'emergency'
      : result.risk_level === 'medium'
        ? 'urgent'
        : 'warning'

  const abnormalParams = result.parameter_scores
    .filter(p => p.score > 0)
    .map(p => `${p.parameter}: ${p.value} ${p.unit} (skor ${p.score})`)
    .join(', ')

  return [
    {
      severity,
      condition: `NEWS2 Skor ${result.aggregate_score} — Risiko ${result.risk_level === 'high' ? 'TINGGI' : result.risk_level === 'medium' ? 'SEDANG' : 'RENDAH-SEDANG'}`,
      action: result.clinical_response,
      criteria_met: [
        `Aggregate NEWS2: ${result.aggregate_score}`,
        `Parameter abnormal: ${abnormalParams}`,
        result.monitoring_recommendation,
      ],
    },
  ]
}
