// Drferdi — vision, brought to life.
/**
 * Clinical Trajectory Analyzer
 *
 * Deterministic trajectory scoring for the latest 5 visits.
 * Baseline references:
 * - FKTP 2024 for blood pressure and clinical urgency guardrails
 * - PERKENI 2024 for glucose crisis interpretation
 *
 * Output is risk stratification support, not a definitive diagnosis.
 */

import type { AVPULevel } from '../vitals/unified-vitals'
import { type ChronicDiseaseType, classifyChronicDisease } from './chronic-disease-classifier'
import { computeMomentum, type MomentumAnalysis } from './momentum-engine'

export type { MomentumAnalysis }

// Inline VisitRecord — no IndexedDB in Next.js dashboard
export interface VisitRecord {
  id?: number
  patient_id: string
  encounter_id: string
  timestamp: string
  vitals: {
    sbp: number
    dbp: number
    hr: number
    rr: number
    temp: number
    glucose: number
    // Phase 1A: SpO2 now tracked longitudinally
    spo2: number
    // Phase 1A: Consciousness level for trajectory context
    avpu?: AVPULevel
  }
  keluhan_utama: string
  diagnosa?: { icd_x: string; nama: string }
  source: 'scrape' | 'uplink'
}

export type TrendDirection = 'improving' | 'declining' | 'stable' | 'insufficient_data'
export type RiskLevel = 'low' | 'moderate' | 'high' | 'critical'
export type GlobalDeteriorationState = 'improving' | 'stable' | 'deteriorating' | 'critical'
export type MortalityProxyTier = 'low' | 'moderate' | 'high' | 'very_high'
export type ClinicalUrgencyTier = 'low' | 'moderate' | 'high' | 'immediate'
export type StabilityLabel = 'true_stable' | 'pseudo_stable' | 'unstable'

const MAX_VISITS = 5
const MAX_ETA_HOURS = 24 * 7

export interface VitalTrend {
  parameter: VitalKey
  label: string
  unit: string
  values: number[]
  dates: string[]
  trend: TrendDirection
  changePercent: number
  isNormal: boolean
  risk: RiskLevel
  note: string
}

export interface TrajectoryRecommendation {
  category: 'improvement' | 'concern' | 'action' | 'monitoring'
  priority: 'high' | 'medium' | 'low'
  text: string
}

export interface GlobalDeterioration {
  state: GlobalDeteriorationState
  deterioration_score: number
}

export interface AcuteAttackRisk24h {
  hypertensive_crisis_risk: number
  glycemic_crisis_risk: number
  sepsis_like_deterioration_risk: number
  shock_decompensation_risk: number
  stroke_acs_suspicion_risk: number
}

export interface EarlyWarningBurden {
  total_breaches_last5: number
  breach_frequency: number
  breach_breakdown: {
    sbp_ge_160_count: number
    temp_ge_38_5_count: number
    gds_ge_300_count: number
    hr_extreme_count: number
    rr_extreme_count: number
    // Phase 1A: SpO2 breach tracking
    spo2_lt_94_count: number
  }
}

export interface TrajectoryVolatility {
  volatility_index: number
  stability_label: StabilityLabel
}

export interface TimeToCriticalEstimate {
  sbp_hours_to_critical: number | null
  dbp_hours_to_critical: number | null
  gds_hours_to_critical: number | null
  temp_hours_to_critical: number | null
  hr_hours_to_critical: number | null
  rr_hours_to_critical: number | null
  spo2_hours_to_critical: number | null
}

export interface MortalityProxyRisk {
  mortality_proxy_tier: MortalityProxyTier
  mortality_proxy_score: number
  clinical_urgency_tier: ClinicalUrgencyTier
}

export interface ClinicalSafeOutput {
  risk_tier: RiskLevel
  confidence: number
  drivers: string[]
  missing_data: string[]
  recommended_action: string
  review_window: '24h'
}

export interface ConfirmedChronicDiagnosis {
  icd_x: string
  nama: string
  disease_type: ChronicDiseaseType
  confirmed_at: string
}

export interface TrajectoryAnalysis {
  overallTrend: TrendDirection
  overallRisk: RiskLevel
  vitalTrends: VitalTrend[]
  recommendations: TrajectoryRecommendation[]
  summary: string
  visitCount: number
  global_deterioration: GlobalDeterioration
  acute_attack_risk_24h: AcuteAttackRisk24h
  early_warning_burden: EarlyWarningBurden
  trajectory_volatility: TrajectoryVolatility
  time_to_critical_estimate: TimeToCriticalEstimate
  mortality_proxy: MortalityProxyRisk
  clinical_safe_output: ClinicalSafeOutput
  confirmed_chronic_diagnoses: ConfirmedChronicDiagnosis[]
  // Phase 2: Clinical Momentum Engine — velocity, acceleration, convergence
  momentum: MomentumAnalysis
}

const NORMAL_RANGES = {
  sbp: { min: 90, max: 139, label: 'Tekanan Darah Sistolik', unit: 'mmHg' },
  dbp: { min: 60, max: 89, label: 'Tekanan Darah Diastolik', unit: 'mmHg' },
  hr: { min: 60, max: 100, label: 'Denyut Nadi', unit: 'x/mnt' },
  rr: { min: 12, max: 20, label: 'Laju Pernapasan', unit: 'x/mnt' },
  temp: { min: 36.1, max: 37.5, label: 'Suhu Tubuh', unit: '°C' },
  glucose: { min: 70, max: 199, label: 'Gula Darah Sewaktu', unit: 'mg/dL' },
  // Phase 1A: SpO2 now tracked longitudinally in trajectory
  spo2: { min: 96, max: 100, label: 'Saturasi Oksigen', unit: '%' },
} as const

type VitalKey = keyof typeof NORMAL_RANGES

const CRITICAL_THRESHOLDS: Record<VitalKey, { high?: number; low?: number }> = {
  sbp: { high: 180, low: 90 },
  dbp: { high: 120, low: 50 },
  hr: { high: 140, low: 45 },
  rr: { high: 30, low: 8 },
  temp: { high: 40, low: 35 },
  glucose: { high: 400, low: 54 },
  // SpO2: only low critical (desaturation), no high critical
  spo2: { high: undefined, low: 90 },
}

const STROKE_KEYWORDS = [
  'pelo',
  'mulut mencong',
  'lemah sebelah',
  'kebas',
  'baal',
  'bicara pelo',
  'sakit kepala hebat',
]

const ACS_KEYWORDS = [
  'nyeri dada',
  'sesak',
  'keringat dingin',
  'nyeri menjalar',
  'mual',
  'dada berat',
]

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value))
}

function round(value: number, digits = 2): number {
  const factor = 10 ** digits
  return Math.round(value * factor) / factor
}

function isReadableDiagnosisName(value: string | undefined): boolean {
  const cleaned = (value || '').trim()
  if (!cleaned) return false
  if (cleaned.length < 3) return false
  if (/^\d+$/.test(cleaned)) return false
  if (!/[A-Za-z]/.test(cleaned)) return false
  return true
}

function hasUsableVitalVisit(v: VisitRecord): boolean {
  const vt = v.vitals
  return (
    vt.sbp > 0 ||
    vt.dbp > 0 ||
    vt.hr > 0 ||
    vt.rr > 0 ||
    vt.temp > 0 ||
    vt.glucose > 0 ||
    vt.spo2 > 0
  )
}

function getVitalPriorityWeight(key: VitalKey): number {
  switch (key) {
    case 'sbp':
    case 'dbp':
    case 'glucose':
      return 1.2
    case 'hr':
    case 'rr':
    case 'spo2':
      return 1
    case 'temp':
      return 0.85
    default:
      return 1
  }
}

function calculateDeviationScore(value: number, range: { min: number; max: number }): number {
  if (value <= 0) return 0
  if (value < range.min) return round(((range.min - value) / range.min) * 100, 2)
  if (value > range.max) return round(((value - range.max) / range.max) * 100, 2)
  return 0
}

function calculateRegressionSlope(values: number[]): number {
  const n = values.length
  if (n < 2) return 0

  const xMean = (n - 1) / 2
  const yMean = values.reduce((a, b) => a + b, 0) / n

  let numerator = 0
  let denominator = 0
  for (let i = 0; i < n; i++) {
    numerator += (i - xMean) * (values[i] - yMean)
    denominator += (i - xMean) ** 2
  }

  return denominator !== 0 ? numerator / denominator : 0
}

function detectTrend(values: number[], range: { min: number; max: number }): TrendDirection {
  if (values.length < 2) return 'insufficient_data'

  const deviationSeries = values.map(value => calculateDeviationScore(value, range))
  const firstDeviation = deviationSeries[0] ?? 0
  const lastDeviation = deviationSeries[deviationSeries.length - 1] ?? 0
  const slope = calculateRegressionSlope(deviationSeries)
  const spread = Math.max(4, firstDeviation * 0.2, lastDeviation * 0.2)
  const delta = lastDeviation - firstDeviation

  if (Math.abs(delta) < spread && Math.abs(slope) < spread / 2) {
    return 'stable'
  }

  if (lastDeviation < firstDeviation) {
    return 'improving'
  }

  if (lastDeviation > firstDeviation) {
    return 'declining'
  }

  const rawSlope = calculateRegressionSlope(values)
  const rawThreshold = Math.max(range.max * 0.03, range.min * 0.03)

  if (Math.abs(rawSlope) < rawThreshold) return 'stable'

  if (lastDeviation === 0) {
    return rawSlope === 0 ? 'stable' : 'declining'
  }

  const midpoint = (range.min + range.max) / 2
  if (values[values.length - 1] < midpoint) {
    return rawSlope > 0 ? 'improving' : 'declining'
  }

  return rawSlope < 0 ? 'improving' : 'declining'
}

function assessRisk(key: VitalKey, value: number): RiskLevel {
  if (value === 0) return 'low'

  switch (key) {
    case 'sbp':
      if (value >= 180) return 'critical'
      if (value >= 160 || value < 90) return 'high'
      if (value >= 140) return 'moderate'
      return 'low'
    case 'dbp':
      if (value >= 120) return 'critical'
      if (value >= 100 || value < 50) return 'high'
      if (value >= 90 || value < 60) return 'moderate'
      return 'low'
    case 'glucose':
      if (value >= 400 || value < 54) return 'critical'
      if (value >= 300 || value < 70) return 'high'
      if (value >= 200) return 'moderate'
      return 'low'
    case 'hr':
      if (value > 140 || value < 45) return 'critical'
      if (value > 120 || value < 50) return 'high'
      if (value > 100 || value < 60) return 'moderate'
      return 'low'
    case 'rr':
      if (value > 30 || value < 8) return 'critical'
      if (value > 24 || value < 10) return 'high'
      if (value > 20 || value < 12) return 'moderate'
      return 'low'
    case 'temp':
      if (value >= 40 || value < 35) return 'critical'
      if (value >= 38.5) return 'high'
      if (value >= 37.5 || value < 36.1) return 'moderate'
      return 'low'
    case 'spo2':
      // SpO2 risk is INVERTED — lower is worse
      if (value < 90) return 'critical'
      if (value < 92) return 'high'
      if (value < 96) return 'moderate'
      return 'low'
    default:
      return 'low'
  }
}

function riskToScore(risk: RiskLevel): number {
  if (risk === 'critical') return 1
  if (risk === 'high') return 0.75
  if (risk === 'moderate') return 0.45
  return 0.1
}

function generateNote(
  key: VitalKey,
  trend: TrendDirection,
  lastValue: number,
  risk: RiskLevel
): string {
  const range = NORMAL_RANGES[key]

  if (trend === 'insufficient_data') return 'Data tidak cukup untuk analisis trend.'

  const isHigh = lastValue > range.max
  const isLow = lastValue < range.min

  if (trend === 'improving') {
    if (isHigh || isLow) return `${range.label} membaik tapi belum dalam batas normal.`
    return `${range.label} membaik dan dalam batas normal.`
  }

  if (trend === 'declining') {
    if (risk === 'critical') return `${range.label} memburuk — perlu intervensi segera.`
    if (risk === 'high') return `${range.label} memburuk — evaluasi terapi.`
    return `${range.label} menunjukkan kecenderungan memburuk.`
  }

  if (isHigh || isLow) return `${range.label} stabil tapi di luar batas normal.`
  return `${range.label} stabil dalam batas normal.`
}

function calculateEarlyWarningBurden(visits: VisitRecord[]): EarlyWarningBurden {
  const breakdown = {
    sbp_ge_160_count: 0,
    temp_ge_38_5_count: 0,
    gds_ge_300_count: 0,
    hr_extreme_count: 0,
    rr_extreme_count: 0,
    spo2_lt_94_count: 0,
  }

  for (const visit of visits) {
    const v = visit.vitals
    if (v.sbp >= 160) breakdown.sbp_ge_160_count += 1
    if (v.temp >= 38.5) breakdown.temp_ge_38_5_count += 1
    if (v.glucose >= 300) breakdown.gds_ge_300_count += 1
    if (v.hr > 120 || (v.hr > 0 && v.hr < 50)) breakdown.hr_extreme_count += 1
    if (v.rr > 24 || (v.rr > 0 && v.rr < 10)) breakdown.rr_extreme_count += 1
    if (v.spo2 > 0 && v.spo2 < 94) breakdown.spo2_lt_94_count += 1
  }

  const total =
    breakdown.sbp_ge_160_count +
    breakdown.temp_ge_38_5_count +
    breakdown.gds_ge_300_count +
    breakdown.hr_extreme_count +
    breakdown.rr_extreme_count +
    breakdown.spo2_lt_94_count

  const frequency = visits.length > 0 ? round(total / visits.length, 2) : 0

  return {
    total_breaches_last5: total,
    breach_frequency: frequency,
    breach_breakdown: breakdown,
  }
}

function seriesVolatility(values: number[]): { cv: number; signFlips: number } {
  if (values.length < 2) return { cv: 0, signFlips: 0 }
  const mean = values.reduce((a, b) => a + b, 0) / values.length
  if (mean === 0) return { cv: 0, signFlips: 0 }

  const variance = values.reduce((acc, v) => acc + (v - mean) ** 2, 0) / values.length
  const std = Math.sqrt(variance)
  const cv = (std / mean) * 100

  let signFlips = 0
  let prevSign = 0
  for (let i = 1; i < values.length; i++) {
    const delta = values[i] - values[i - 1]
    const sign = delta === 0 ? 0 : delta > 0 ? 1 : -1
    if (sign !== 0 && prevSign !== 0 && sign !== prevSign) signFlips += 1
    if (sign !== 0) prevSign = sign
  }

  return { cv, signFlips }
}

function calculateTrajectoryVolatility(
  vitalTrends: VitalTrend[],
  overallTrend: TrendDirection,
  burden: EarlyWarningBurden
): TrajectoryVolatility {
  const active = vitalTrends.filter(t => t.values.length >= 2)
  if (active.length === 0) {
    return { volatility_index: 0, stability_label: 'unstable' }
  }

  const aggregate = active.reduce(
    (acc, trend) => {
      const { cv, signFlips } = seriesVolatility(trend.values)
      acc.cv += clamp(cv, 0, 100)
      acc.flips += signFlips
      return acc
    },
    { cv: 0, flips: 0 }
  )

  const avgCV = aggregate.cv / active.length
  const flipPenalty = Math.min(20, aggregate.flips * 5)
  const burdenPenalty = Math.min(20, burden.total_breaches_last5 * 2)
  const volatility = clamp(round(avgCV + flipPenalty + burdenPenalty, 1), 0, 100)

  let stability: StabilityLabel = 'unstable'
  if (overallTrend === 'stable') {
    stability =
      volatility <= 25 && burden.total_breaches_last5 <= 1 ? 'true_stable' : 'pseudo_stable'
  }

  return {
    volatility_index: volatility,
    stability_label: stability,
  }
}

function containsAny(text: string, keywords: string[]): boolean {
  const normalized = text.toLowerCase()
  return keywords.some(keyword => normalized.includes(keyword))
}

function calculateAcuteAttackRisk24h(
  latestVisit: VisitRecord | null,
  vitalTrends: VitalTrend[],
  burden: EarlyWarningBurden
): AcuteAttackRisk24h {
  if (!latestVisit) {
    return {
      hypertensive_crisis_risk: 0,
      glycemic_crisis_risk: 0,
      sepsis_like_deterioration_risk: 0,
      shock_decompensation_risk: 0,
      stroke_acs_suspicion_risk: 0,
    }
  }

  const vt = latestVisit.vitals
  const complaint = latestVisit.keluhan_utama || ''
  const sbpTrend = vitalTrends.find(t => t.parameter === 'sbp')?.trend ?? 'insufficient_data'
  const dbpTrend = vitalTrends.find(t => t.parameter === 'dbp')?.trend ?? 'insufficient_data'
  const glucoseTrend =
    vitalTrends.find(t => t.parameter === 'glucose')?.trend ?? 'insufficient_data'

  let hypertensive = 15
  if (vt.sbp >= 180 || vt.dbp >= 120) hypertensive = 90
  else if (vt.sbp >= 160 || vt.dbp >= 100) hypertensive = 70
  else if (vt.sbp >= 140 || vt.dbp >= 90) hypertensive = 45
  if (sbpTrend === 'declining' || dbpTrend === 'declining') hypertensive += 10
  if (sbpTrend === 'improving' && dbpTrend === 'improving') hypertensive -= 8
  hypertensive += burden.breach_breakdown.sbp_ge_160_count * 3

  let glycemic = 15
  if (vt.glucose >= 400 || (vt.glucose > 0 && vt.glucose < 54)) glycemic = 92
  else if (vt.glucose >= 300 || (vt.glucose > 0 && vt.glucose < 70)) glycemic = 78
  else if (vt.glucose >= 200) glycemic = 55
  if (glucoseTrend === 'declining') glycemic += 8
  if (glucoseTrend === 'improving' && vt.glucose >= 200) glycemic -= 6
  glycemic += burden.breach_breakdown.gds_ge_300_count * 3

  let sepsisLike = 5
  if (vt.temp >= 38.5) sepsisLike += 28
  if (vt.temp < 36 && vt.temp > 0) sepsisLike += 20
  if (vt.hr > 100) sepsisLike += 20
  if (vt.rr >= 22) sepsisLike += 24
  if (vt.sbp > 0 && vt.sbp <= 100) sepsisLike += 18

  let shock = 5
  if (vt.sbp > 0 && vt.sbp < 90) shock += 45
  else if (vt.sbp > 0 && vt.sbp <= 100) shock += 22
  if (vt.hr > 120) shock += 20
  if (vt.rr > 24 || (vt.rr > 0 && vt.rr < 10)) shock += 18
  if (vt.temp > 0 && vt.temp < 36) shock += 10

  const hasStrokeKeyword = containsAny(complaint, STROKE_KEYWORDS)
  const hasAcsKeyword = containsAny(complaint, ACS_KEYWORDS)
  let strokeAcs = 10
  if (vt.sbp >= 180 || vt.dbp >= 120) strokeAcs += 32
  else if (vt.sbp >= 160 || vt.dbp >= 100) strokeAcs += 20
  if (hasStrokeKeyword) strokeAcs += 28
  if (hasAcsKeyword) strokeAcs += 28
  if (vt.hr > 120 || (vt.hr > 0 && vt.hr < 50)) strokeAcs += 10

  return {
    hypertensive_crisis_risk: clamp(Math.round(hypertensive), 0, 100),
    glycemic_crisis_risk: clamp(Math.round(glycemic), 0, 100),
    sepsis_like_deterioration_risk: clamp(Math.round(sepsisLike), 0, 100),
    shock_decompensation_risk: clamp(Math.round(shock), 0, 100),
    stroke_acs_suspicion_risk: clamp(Math.round(strokeAcs), 0, 100),
  }
}

function estimateTimeToCriticalForVital(visits: VisitRecord[], key: VitalKey): number | null {
  const series = visits
    .map(v => ({
      value: v.vitals[key],
      timestamp: new Date(v.timestamp).getTime(),
    }))
    .filter(point => point.value > 0 && Number.isFinite(point.timestamp))

  if (series.length < 2) return null

  const last = series[series.length - 1]
  const prev = series[series.length - 2]
  const thresholds = CRITICAL_THRESHOLDS[key]

  if (thresholds.high !== undefined && last.value >= thresholds.high) return 0
  if (thresholds.low !== undefined && last.value <= thresholds.low) return 0

  const deltaHours = Math.max(1, (last.timestamp - prev.timestamp) / 3_600_000)
  const slopePerHour = (last.value - prev.value) / deltaHours

  let eta: number | null = null

  if (slopePerHour > 0 && thresholds.high !== undefined && last.value < thresholds.high) {
    eta = (thresholds.high - last.value) / slopePerHour
  } else if (slopePerHour < 0 && thresholds.low !== undefined && last.value > thresholds.low) {
    eta = (thresholds.low - last.value) / slopePerHour
  }

  if (eta === null || !Number.isFinite(eta) || eta < 0 || eta > MAX_ETA_HOURS) return null
  return round(eta, 1)
}

function calculateTimeToCriticalEstimate(visits: VisitRecord[]): TimeToCriticalEstimate {
  return {
    sbp_hours_to_critical: estimateTimeToCriticalForVital(visits, 'sbp'),
    dbp_hours_to_critical: estimateTimeToCriticalForVital(visits, 'dbp'),
    gds_hours_to_critical: estimateTimeToCriticalForVital(visits, 'glucose'),
    temp_hours_to_critical: estimateTimeToCriticalForVital(visits, 'temp'),
    hr_hours_to_critical: estimateTimeToCriticalForVital(visits, 'hr'),
    rr_hours_to_critical: estimateTimeToCriticalForVital(visits, 'rr'),
    spo2_hours_to_critical: estimateTimeToCriticalForVital(visits, 'spo2'),
  }
}

function deriveMissingData(visits: VisitRecord[]): string[] {
  const missing: string[] = []
  if (visits.length < 2) missing.push('insufficient_history_lt2')
  if (visits.length < MAX_VISITS) missing.push('history_depth_lt5')
  if (visits.length === 0) {
    missing.push('no_visit_data')
    return missing
  }

  const latest = visits[visits.length - 1]
  const latestVitals = latest.vitals
  const keys: VitalKey[] = ['sbp', 'dbp', 'hr', 'rr', 'temp', 'glucose', 'spo2']

  for (const key of keys) {
    if (!latestVitals[key] || latestVitals[key] <= 0) {
      missing.push(`latest_vital_${key}_missing`)
    }
  }

  if (!latest.keluhan_utama || latest.keluhan_utama.trim().length === 0) {
    missing.push('latest_keluhan_utama_missing')
  }
  if (!latest.diagnosa?.icd_x) {
    missing.push('latest_diagnosa_missing')
  }

  return missing
}

function deriveConfidence(
  visits: VisitRecord[],
  missingData: string[],
  volatility: TrajectoryVolatility
): number {
  const latest = visits[visits.length - 1]
  const latestVitalCoverage = latest
    ? (['sbp', 'dbp', 'hr', 'rr', 'temp', 'glucose', 'spo2'] as VitalKey[]).filter(
        k => latest.vitals[k] > 0
      ).length / 7
    : 0

  const temporalDepth = clamp(visits.length / MAX_VISITS, 0, 1)
  const consistency = clamp(1 - volatility.volatility_index / 100, 0, 1)
  const missingPenalty = clamp(missingData.length * 0.04, 0, 0.35)

  const confidenceRaw =
    latestVitalCoverage * 0.45 + temporalDepth * 0.25 + consistency * 0.3 - missingPenalty
  return round(clamp(confidenceRaw, 0.1, 0.95), 2)
}

function deriveDrivers(
  latestVisit: VisitRecord | null,
  vitalTrends: VitalTrend[],
  acuteRisk: AcuteAttackRisk24h,
  burden: EarlyWarningBurden,
  volatility: TrajectoryVolatility
): string[] {
  const drivers: string[] = []
  if (!latestVisit) return ['Data kunjungan tidak tersedia untuk menentukan driver risiko.']

  const vt = latestVisit.vitals

  if (vt.sbp >= 180 || vt.dbp >= 120) drivers.push('Tekanan darah berada pada zona krisis.')
  else if (vt.sbp >= 160 || vt.dbp >= 100)
    drivers.push('Tekanan darah tinggi persisten pada rentang risiko tinggi.')

  if (vt.glucose >= 300)
    drivers.push('Gula darah sewaktu sangat tinggi, risiko dekompensasi metabolik meningkat.')
  else if (vt.glucose > 0 && vt.glucose < 70)
    drivers.push('Gula darah rendah meningkatkan risiko kejadian akut.')

  if (vt.temp >= 38.5 && vt.hr > 100 && vt.rr >= 22) {
    drivers.push('Pola demam + takikardi + takipnea mengarah ke perburukan sistemik.')
  }

  const unresolvedDeclines = vitalTrends.filter(
    trend => trend.trend === 'declining' && (trend.risk === 'high' || trend.risk === 'critical')
  )
  if (unresolvedDeclines.length > 0) {
    const lead = unresolvedDeclines[0]
    drivers.push(
      `${lead.label} memburuk dengan risiko ${lead.risk}; perlu evaluasi ulang target terapi.`
    )
  }

  if (burden.total_breaches_last5 >= 4) {
    drivers.push('Beban early-warning tinggi dalam 5 kunjungan terakhir.')
  }

  if (volatility.stability_label === 'pseudo_stable') {
    drivers.push('Trajektori tampak stabil namun volatilitas tinggi (pseudo-stable).')
  }

  if (acuteRisk.stroke_acs_suspicion_risk >= 70) {
    drivers.push('Kombinasi gejala + hemodinamik memberi kecurigaan stroke/ACS berbasis rule.')
  }

  if (drivers.length === 0) {
    drivers.push('Tidak ada driver risiko dominan; lanjutkan monitoring berkala.')
  }

  return drivers.slice(0, 6)
}

function determineUrgency(tier: MortalityProxyTier): {
  urgency: ClinicalUrgencyTier
  action: string
  risk: RiskLevel
} {
  if (tier === 'very_high') {
    return {
      urgency: 'immediate',
      action:
        'EMERGENCY NOW: Stabilkan pasien segera, aktifkan rujukan emergensi, dan monitor ketat berkelanjutan.',
      risk: 'critical',
    }
  }
  if (tier === 'high') {
    return {
      urgency: 'high',
      action:
        'URGENT <6H: Evaluasi dokter segera (<6 jam), optimasi terapi, dan siapkan eskalasi rujukan.',
      risk: 'high',
    }
  }
  if (tier === 'moderate') {
    return {
      urgency: 'moderate',
      action: 'REVIEW SAME DAY: Review klinis pada hari yang sama dan evaluasi respons intervensi.',
      risk: 'moderate',
    }
  }
  return {
    urgency: 'low',
    action: 'ROUTINE 24H: Monitoring rutin 24 jam dengan edukasi pasien dan follow-up terjadwal.',
    risk: 'low',
  }
}

function buildRecommendations(
  globalState: GlobalDeteriorationState,
  acuteRisk: AcuteAttackRisk24h,
  safeOutput: ClinicalSafeOutput
): TrajectoryRecommendation[] {
  const recs: TrajectoryRecommendation[] = []

  recs.push({
    category: 'action',
    priority:
      safeOutput.risk_tier === 'critical' || safeOutput.risk_tier === 'high' ? 'high' : 'medium',
    text: safeOutput.recommended_action,
  })

  if (acuteRisk.hypertensive_crisis_risk >= 70) {
    recs.push({
      category: 'monitoring',
      priority: 'high',
      text: 'Risiko krisis hipertensi tinggi: ulangi pengukuran tekanan darah serial dan evaluasi terapi antihipertensi.',
    })
  }
  if (acuteRisk.glycemic_crisis_risk >= 70) {
    recs.push({
      category: 'monitoring',
      priority: 'high',
      text: 'Risiko krisis glikemik tinggi: verifikasi glukosa ulang dan siapkan tata laksana korektif sesuai protokol.',
    })
  }
  if (acuteRisk.sepsis_like_deterioration_risk >= 70) {
    recs.push({
      category: 'concern',
      priority: 'high',
      text: 'Terdapat pola perburukan sistemik; evaluasi infeksi dan perfusi segera.',
    })
  }
  if (globalState === 'improving') {
    recs.push({
      category: 'improvement',
      priority: 'low',
      text: 'Tren membaik; pertahankan terapi dan monitoring sesuai jadwal.',
    })
  }

  const priorityOrder = { high: 0, medium: 1, low: 2 }
  return recs.sort((a, b) => priorityOrder[a.priority] - priorityOrder[b.priority])
}

function deriveOverallTrend(vitalTrends: VitalTrend[], visitCount: number): TrendDirection {
  if (visitCount < 2) return 'insufficient_data'

  const activeTrends = vitalTrends.filter(trend => trend.values.length >= 2)
  if (activeTrends.length === 0) return 'insufficient_data'

  const signal = activeTrends.reduce((acc, trend) => {
    const range = NORMAL_RANGES[trend.parameter]
    const firstValue = trend.values[0] ?? 0
    const lastValue = trend.values[trend.values.length - 1] ?? 0
    const firstDeviation = calculateDeviationScore(firstValue, range)
    const lastDeviation = calculateDeviationScore(lastValue, range)
    const deviationDelta = lastDeviation - firstDeviation
    const riskWeight = 1 + riskToScore(trend.risk)
    const priorityWeight = getVitalPriorityWeight(trend.parameter)
    return acc + deviationDelta * riskWeight * priorityWeight
  }, 0)

  if (signal >= 10) return 'declining'
  if (signal <= -10) return 'improving'

  const decliningCount = activeTrends.filter(t => t.trend === 'declining').length
  const improvingCount = activeTrends.filter(t => t.trend === 'improving').length
  if (decliningCount > improvingCount) return 'declining'
  if (improvingCount > decliningCount) return 'improving'
  return 'stable'
}

function deriveOverallRisk(vitalTrends: VitalTrend[]): RiskLevel {
  const levels = vitalTrends.filter(t => t.values.length > 0).map(t => t.risk)
  if (levels.includes('critical')) return 'critical'
  if (levels.includes('high')) return 'high'
  if (levels.includes('moderate')) return 'moderate'
  return 'low'
}

function buildSummary(
  global: GlobalDeterioration,
  safeOutput: ClinicalSafeOutput,
  burden: EarlyWarningBurden,
  vitalTrends: VitalTrend[]
): string {
  const score = Math.round(global.deterioration_score)
  const riskLevel = safeOutput.risk_tier
  const breaches = burden.total_breaches_last5

  // Analyze improvement characteristics
  const improvingVitals = vitalTrends.filter(v => v.trend === 'improving' && v.values.length > 0)
  const decliningVitals = vitalTrends.filter(v => v.trend === 'declining' && v.values.length > 0)
  const criticalVitals = vitalTrends.filter(v => v.risk === 'critical' || v.risk === 'high')

  let stateText = ''

  if (global.state === 'critical') {
    stateText = 'Kondisi klinis berada pada zona kritis dengan multiple parameter abnormal.'
  } else if (global.state === 'deteriorating') {
    if (decliningVitals.length > 0) {
      const worstParam = decliningVitals[0].label
      stateText = `Perburukan klinis terutama pada ${worstParam}, memerlukan intervensi segera.`
    } else {
      stateText = 'Kondisi klinis menunjukkan tren perburukan progresif.'
    }
  } else if (global.state === 'improving') {
    if (score < 30 && breaches === 0) {
      stateText = 'Perbaikan klinis signifikan dengan normalisasi parameter vital, pasien stabil.'
    } else if (improvingVitals.length >= 2) {
      const params = improvingVitals
        .slice(0, 2)
        .map(v => v.label)
        .join(' dan ')
      stateText = `Respon terapi positif dengan perbaikan ${params}, lanjutkan monitoring.`
    } else if (criticalVitals.length > 0) {
      stateText = 'Perbaikan parsial namun masih ada parameter kritis yang memerlukan atensi.'
    } else {
      stateText =
        'Kondisi klinis menunjukkan perbaikan bertahap, evaluasi berkelanjutan diperlukan.'
    }
  } else {
    // Stable
    if (breaches === 0 && score < 30) {
      stateText = 'Kondisi klinis stabil optimal, semua parameter dalam batas normal.'
    } else if (criticalVitals.length > 0) {
      const param = criticalVitals[0].label
      stateText = `Kondisi relatif stabil namun ${param} tetap memerlukan monitoring ketat.`
    } else {
      stateText = 'Kondisi klinis stabil dengan kontrol parameter vital terkendali.'
    }
  }

  return `${stateText} Deterioration score ${score}/100, risk tier ${riskLevel}, early-warning burden ${breaches} event.`
}

function extractConfirmedChronicDiagnoses(visits: VisitRecord[]): ConfirmedChronicDiagnosis[] {
  const candidates: Array<ConfirmedChronicDiagnosis & { hasReadableName: boolean }> = []
  const occurrenceByTypeAndCode = new Map<string, number>()

  for (const visit of visits) {
    const diagnosis = visit.diagnosa
    if (!diagnosis?.icd_x?.trim()) continue

    const classification = classifyChronicDisease(diagnosis.icd_x)
    if (!classification) continue

    const normalizedIcd = diagnosis.icd_x.trim().toUpperCase()
    const hasReadableName = isReadableDiagnosisName(diagnosis.nama)
    const normalizedName = hasReadableName ? diagnosis.nama.trim() : classification.fullName

    const candidate: ConfirmedChronicDiagnosis & { hasReadableName: boolean } = {
      icd_x: normalizedIcd,
      nama: normalizedName,
      disease_type: classification.type,
      confirmed_at: visit.timestamp,
      hasReadableName,
    }
    candidates.push(candidate)

    const key = `${classification.type}:${normalizedIcd}`
    occurrenceByTypeAndCode.set(key, (occurrenceByTypeAndCode.get(key) || 0) + 1)
  }

  const latestByType = new Map<ChronicDiseaseType, ConfirmedChronicDiagnosis>()

  for (const candidate of candidates) {
    const key = `${candidate.disease_type}:${candidate.icd_x}`
    const occurrence = occurrenceByTypeAndCode.get(key) || 0
    const isReliable = candidate.hasReadableName || occurrence >= 2
    if (!isReliable) continue

    const confirmed: ConfirmedChronicDiagnosis = {
      icd_x: candidate.icd_x,
      nama: candidate.nama,
      disease_type: candidate.disease_type,
      confirmed_at: candidate.confirmed_at,
    }

    const existing = latestByType.get(confirmed.disease_type)
    if (!existing) {
      latestByType.set(confirmed.disease_type, confirmed)
      continue
    }

    const existingTime = new Date(existing.confirmed_at).getTime()
    const nextTime = new Date(confirmed.confirmed_at).getTime()
    if (Number.isFinite(nextTime) && nextTime >= existingTime) {
      latestByType.set(confirmed.disease_type, confirmed)
    }
  }

  return Array.from(latestByType.values()).sort(
    (a, b) => new Date(b.confirmed_at).getTime() - new Date(a.confirmed_at).getTime()
  )
}

export function analyzeTrajectory(visits: VisitRecord[]): TrajectoryAnalysis {
  const sorted = [...visits]
    .filter(v => hasUsableVitalVisit(v))
    .sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime())
    .slice(-MAX_VISITS)

  const vitalKeys: VitalKey[] = ['sbp', 'dbp', 'hr', 'rr', 'temp', 'glucose', 'spo2']

  const vitalTrends: VitalTrend[] = vitalKeys.map(key => {
    const range = NORMAL_RANGES[key]
    const filtered = sorted.filter(v => v.vitals[key] > 0)
    const values = filtered.map(v => v.vitals[key])
    const dates = filtered.map(v => {
      const d = new Date(v.timestamp)
      return `${d.getDate()}/${d.getMonth() + 1}`
    })
    const lastValue = values.length > 0 ? values[values.length - 1] : 0
    const firstValue = values.length > 0 ? values[0] : 0
    const changePercent = firstValue > 0 ? ((lastValue - firstValue) / firstValue) * 100 : 0
    const isNormal = lastValue >= range.min && lastValue <= range.max
    const trend = detectTrend(values, range)
    const risk = assessRisk(key, lastValue)
    const note = generateNote(key, trend, lastValue, risk)

    return {
      parameter: key,
      label: range.label,
      unit: range.unit,
      values,
      dates,
      trend,
      changePercent: round(changePercent, 1),
      isNormal,
      risk,
      note,
    }
  })

  const overallTrend = deriveOverallTrend(vitalTrends, sorted.length)
  const overallRisk = deriveOverallRisk(vitalTrends)
  const burden = calculateEarlyWarningBurden(sorted)
  const volatility = calculateTrajectoryVolatility(vitalTrends, overallTrend, burden)
  const latest = sorted.length > 0 ? sorted[sorted.length - 1] : null
  const acuteRisk = calculateAcuteAttackRisk24h(latest, vitalTrends, burden)

  const avgVitalRisk =
    vitalTrends.filter(t => t.values.length > 0).reduce((acc, t) => acc + riskToScore(t.risk), 0) /
    Math.max(1, vitalTrends.filter(t => t.values.length > 0).length)
  const decliningCount = vitalTrends.filter(t => t.trend === 'declining').length
  const improvingCount = vitalTrends.filter(t => t.trend === 'improving').length
  const acutePeak = Math.max(
    acuteRisk.hypertensive_crisis_risk,
    acuteRisk.glycemic_crisis_risk,
    acuteRisk.sepsis_like_deterioration_risk,
    acuteRisk.shock_decompensation_risk,
    acuteRisk.stroke_acs_suspicion_risk
  )

  let deteriorationScore = avgVitalRisk * 60
  deteriorationScore += decliningCount * 6
  deteriorationScore -= improvingCount * 4
  deteriorationScore += Math.min(20, burden.total_breaches_last5 * 3)
  deteriorationScore += volatility.volatility_index * 0.2
  deteriorationScore += acutePeak * 0.15
  deteriorationScore = clamp(round(deteriorationScore, 1), 0, 100)

  let globalState: GlobalDeteriorationState = 'stable'
  if (acutePeak >= 85 || deteriorationScore >= 80) globalState = 'critical'
  else if (deteriorationScore >= 55) globalState = 'deteriorating'
  else if (overallTrend === 'improving' && deteriorationScore <= 35) globalState = 'improving'

  const globalDeterioration: GlobalDeterioration = {
    state: globalState,
    deterioration_score: deteriorationScore,
  }

  let mortalityScore =
    deteriorationScore * 0.35 +
    acutePeak * 0.35 +
    Math.min(100, burden.total_breaches_last5 * 20) * 0.15 +
    volatility.volatility_index * 0.15
  if (acuteRisk.shock_decompensation_risk >= 70 || acuteRisk.sepsis_like_deterioration_risk >= 70) {
    mortalityScore += 10
  }
  mortalityScore = clamp(round(mortalityScore, 1), 0, 100)

  let mortalityTier: MortalityProxyTier = 'low'
  if (mortalityScore >= 75) mortalityTier = 'very_high'
  else if (mortalityScore >= 50) mortalityTier = 'high'
  else if (mortalityScore >= 25) mortalityTier = 'moderate'

  const urgencyDecision = determineUrgency(mortalityTier)
  const missingData = deriveMissingData(sorted)
  const confidence = deriveConfidence(sorted, missingData, volatility)
  const drivers = deriveDrivers(latest, vitalTrends, acuteRisk, burden, volatility)

  const clinicalSafeOutput: ClinicalSafeOutput = {
    risk_tier: urgencyDecision.risk,
    confidence,
    drivers,
    missing_data: missingData,
    recommended_action: urgencyDecision.action,
    review_window: '24h',
  }

  const mortalityProxy: MortalityProxyRisk = {
    mortality_proxy_tier: mortalityTier,
    mortality_proxy_score: mortalityScore,
    clinical_urgency_tier: urgencyDecision.urgency,
  }

  const timeToCritical = calculateTimeToCriticalEstimate(sorted)
  const recommendations = buildRecommendations(globalState, acuteRisk, clinicalSafeOutput)
  const summary = buildSummary(globalDeterioration, clinicalSafeOutput, burden, vitalTrends)
  const confirmedChronicDiagnoses = extractConfirmedChronicDiagnoses(sorted)
  // Phase 2: Compute Clinical Momentum (velocity, acceleration, convergence, baseline)
  const momentum = computeMomentum(sorted)

  return {
    overallTrend,
    overallRisk,
    vitalTrends,
    recommendations,
    summary,
    visitCount: sorted.length,
    global_deterioration: globalDeterioration,
    acute_attack_risk_24h: acuteRisk,
    early_warning_burden: burden,
    trajectory_volatility: volatility,
    time_to_critical_estimate: timeToCritical,
    mortality_proxy: mortalityProxy,
    clinical_safe_output: clinicalSafeOutput,
    confirmed_chronic_diagnoses: confirmedChronicDiagnoses,
    momentum,
  }
}
