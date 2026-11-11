/**
 * Prediction Engine
 *
 * Estimates time-to-critical for deteriorating parameters using
 * kinematic equations (linear + acceleration-adjusted).
 *
 * Also detects treatment response: did trajectory slope change
 * after a medication was added/changed?
 *
 * SAFETY RULE: Predictions are ALWAYS shown with confidence intervals.
 * Sparse data → wide intervals → "timeline uncertain" label.
 * These are clinical SUPPORT tools — never autonomous decisions.
 *
 * Clinical Momentum Engine — Phase 3 (Predictive Intelligence)
 */

import type { ConvergenceResult } from './convergence-detector'
import type { MomentumLevel, ParamMomentum, VitalParam } from './momentum-engine'

// ── Types ────────────────────────────────────────────────────────────────────

export type AlertLevel = 'none' | 'info' | 'warning' | 'urgent' | 'critical' | 'emergency'

export interface TimeToCriticalResult {
  /** Parameter name */
  param: VitalParam
  /** Current value */
  currentValue: number
  /** Critical threshold that would be breached */
  criticalThreshold: number
  /** Estimated days to critical (linear projection) */
  daysLinear: number | null
  /** Estimated days to critical (acceleration-adjusted) */
  daysAccelAdjusted: number | null
  /** Best estimate (adjusted if available, otherwise linear) */
  daysBestEstimate: number | null
  /** Confidence interval half-width in days */
  confidenceIntervalDays: number | null
  /** Whether the estimate is reliable */
  isReliable: boolean
  /** Human-readable label */
  label: string
}

export interface TreatmentResponseResult {
  /** Was a meaningful slope change detected? */
  detected: boolean
  /** Velocity before the inflection point */
  velocityBefore: number | null
  /** Velocity after the inflection point */
  velocityAfter: number | null
  /** Percent change in velocity magnitude */
  velocityChangePercent: number | null
  /** Interpretation */
  interpretation: 'effective' | 'partially_effective' | 'ineffective' | 'worsening' | 'unknown'
  /** Human-readable narrative */
  narrative: string
}

export interface AlertDecision {
  level: AlertLevel
  reasons: string[]
  shouldPush: boolean
  cooldownKey: string
}

export interface PredictionResult {
  timeToCritical: TimeToCriticalResult[]
  treatmentResponse: TreatmentResponseResult
  alertDecision: AlertDecision
}

// ── Critical Thresholds ──────────────────────────────────────────────────────
// These are the values that, once reached, trigger emergency response.
// SpO2 threshold is the LOWER bound (bad if below).

const CRITICAL_THRESHOLDS_HIGH: Partial<Record<VitalParam, number>> = {
  sbp: 180,
  dbp: 120,
  hr: 140,
  rr: 30,
  temp: 40,
  glucose: 400,
}

const CRITICAL_THRESHOLDS_LOW: Partial<Record<VitalParam, number>> = {
  sbp: 90,
  hr: 45,
  rr: 8,
  temp: 35,
  glucose: 54,
  spo2: 90, // SpO2 < 90 is critical
}

// Max prediction horizon: 90 days (beyond this = not clinically actionable)
const MAX_PREDICTION_DAYS = 90

// ── Time-to-Critical ─────────────────────────────────────────────────────────

/**
 * Predict time to breach a critical threshold.
 *
 * Linear: t = (threshold - current) / velocity
 * Acceleration-adjusted: solve current + v*t + 0.5*a*t² = threshold
 *   → 0.5*a*t² + v*t + (current - threshold) = 0
 *   → Quadratic formula
 */
function predictTimeToCritical(param: ParamMomentum): TimeToCriticalResult | null {
  const currentValue = param.values[param.values.length - 1]
  if (currentValue === undefined || currentValue <= 0) return null

  const velocity = param.velocityPerDay // units/day
  if (Math.abs(velocity) < 0.001) return null // essentially stable

  // Determine which threshold is being approached
  let threshold: number | null = null

  if (velocity > 0) {
    // Increasing — check high threshold
    const highThresh = CRITICAL_THRESHOLDS_HIGH[param.param]
    if (highThresh !== undefined && currentValue < highThresh) {
      threshold = highThresh
    }
  } else {
    // Decreasing — check low threshold (or SpO2 going down)
    const lowThresh = CRITICAL_THRESHOLDS_LOW[param.param]
    if (lowThresh !== undefined && currentValue > lowThresh) {
      threshold = lowThresh
    }
  }

  if (threshold === null) return null

  // Linear estimate
  const delta = threshold - currentValue
  const daysLinear = delta / velocity

  if (daysLinear <= 0 || daysLinear > MAX_PREDICTION_DAYS) {
    return null // Already past threshold or too far out
  }

  // Acceleration-adjusted estimate (quadratic)
  let daysAccelAdjusted: number | null = null
  const accel = param.accelerationPerDay

  if (accel !== null && Math.abs(accel) > 0.001) {
    // 0.5*a*t² + v*t - delta = 0
    const a = 0.5 * accel
    const b = velocity
    const c = -delta
    const discriminant = b * b - 4 * a * c

    if (discriminant >= 0) {
      const t1 = (-b + Math.sqrt(discriminant)) / (2 * a)
      const t2 = (-b - Math.sqrt(discriminant)) / (2 * a)

      // Pick the smallest positive root
      const validRoots = [t1, t2].filter(t => t > 0 && t <= MAX_PREDICTION_DAYS)
      if (validRoots.length > 0) {
        daysAccelAdjusted = Math.min(...validRoots)
      }
    }
  }

  const daysBestEstimate = daysAccelAdjusted ?? daysLinear

  // Confidence interval: wider for few data points or high acceleration
  const nVisits = param.values.length
  const baseCI = Math.max(2, daysBestEstimate * 0.2) // ±20% base
  const sparsityPenalty = nVisits < 3 ? baseCI * 2 : 0 // double CI if sparse
  const accelPenalty = accel !== null && Math.abs(accel) > 0.1 ? daysBestEstimate * 0.3 : 0
  const ciHalfWidth = Math.round(baseCI + sparsityPenalty + accelPenalty)

  const isReliable = nVisits >= 3 && ciHalfWidth < daysBestEstimate * 0.6

  const days = Math.round(daysBestEstimate)
  const label = isReliable
    ? `~${days} hari (±${ciHalfWidth} hari)`
    : `~${days} hari (timeline tidak pasti — butuh lebih banyak data)`

  return {
    param: param.param,
    currentValue: Math.round(currentValue * 10) / 10,
    criticalThreshold: threshold,
    daysLinear: Math.round(daysLinear),
    daysAccelAdjusted: daysAccelAdjusted !== null ? Math.round(daysAccelAdjusted) : null,
    daysBestEstimate: days,
    confidenceIntervalDays: ciHalfWidth,
    isReliable,
    label,
  }
}

// ── Treatment Response ───────────────────────────────────────────────────────

/**
 * Detect treatment response by comparing velocity before and after
 * the midpoint of the visit series.
 *
 * Simple heuristic: split visits into first half and second half.
 * If velocity magnitude decreased meaningfully → treatment working.
 */
export function detectTreatmentResponse(params: ParamMomentum[]): TreatmentResponseResult {
  // Focus on the most clinically significant worsening params
  const worseningParam = params
    .filter(p => p.direction === 'worsening')
    .sort((a, b) => Math.abs(b.velocityPerDay) - Math.abs(a.velocityPerDay))[0]

  if (!worseningParam || worseningParam.values.length < 4) {
    return {
      detected: false,
      velocityBefore: null,
      velocityAfter: null,
      velocityChangePercent: null,
      interpretation: 'unknown',
      narrative: 'Data tidak cukup untuk mendeteksi respons terapi (butuh ≥4 kunjungan).',
    }
  }

  const values = worseningParam.values
  const mid = Math.floor(values.length / 2)
  const firstHalf = values.slice(0, mid)
  const secondHalf = values.slice(mid)

  if (firstHalf.length < 2 || secondHalf.length < 2) {
    return {
      detected: false,
      velocityBefore: null,
      velocityAfter: null,
      velocityChangePercent: null,
      interpretation: 'unknown',
      narrative: 'Tidak cukup data untuk analisis respons terapi.',
    }
  }

  // Simple velocity estimate: (last - first) / (n-1) for each half
  const vBefore = (firstHalf[firstHalf.length - 1] - firstHalf[0]) / (firstHalf.length - 1)
  const vAfter = (secondHalf[secondHalf.length - 1] - secondHalf[0]) / (secondHalf.length - 1)

  const changePercent =
    Math.abs(vBefore) > 0.01
      ? Math.round(((Math.abs(vBefore) - Math.abs(vAfter)) / Math.abs(vBefore)) * 100)
      : null

  let interpretation: TreatmentResponseResult['interpretation'] = 'unknown'
  let narrative = ''
  const pName = worseningParam.param.toUpperCase()

  if (changePercent === null) {
    interpretation = 'unknown'
    narrative = 'Tidak dapat menilai respons terapi — velocity sebelumnya mendekati nol.'
  } else if (changePercent >= 50) {
    interpretation = 'effective'
    narrative = `Respons terapi terdeteksi: velocity ${pName} turun ${changePercent}% — intervensi efektif.`
  } else if (changePercent >= 20) {
    interpretation = 'partially_effective'
    narrative = `Respons terapi parsial: velocity ${pName} turun ${changePercent}% — pertimbangkan eskalasi terapi.`
  } else if (changePercent >= -10) {
    interpretation = 'ineffective'
    narrative = `Terapi kurang efektif: velocity ${pName} tidak berubah signifikan (${changePercent}%).`
  } else {
    // changePercent negative = velocity increased = worsening despite treatment
    interpretation = 'worsening'
    narrative = `Perburukan meskipun ada terapi: velocity ${pName} meningkat ${Math.abs(changePercent)}% — evaluasi ulang.`
  }

  return {
    detected: Math.abs(changePercent ?? 0) > 10,
    velocityBefore: Math.round(vBefore * 100) / 100,
    velocityAfter: Math.round(vAfter * 100) / 100,
    velocityChangePercent: changePercent,
    interpretation,
    narrative,
  }
}

// ── Alert Decision Matrix ────────────────────────────────────────────────────

/**
 * Determine alert level based on momentum + convergence.
 *
 * SAFETY: Instant single-encounter red flags (NEWS2 ≥7, AVPU=U) are
 * handled separately in the CDSS engine and are NEVER suppressed by this.
 * This function is for TRAJECTORY-based alerts only.
 */
export function generateAlertDecision(
  momentumLevel: MomentumLevel,
  convergence: ConvergenceResult
): AlertDecision {
  const reasons: string[] = []
  let level: AlertLevel = 'none'

  switch (momentumLevel) {
    case 'INSUFFICIENT_DATA':
    case 'PRELIMINARY':
    case 'STABLE':
      level = 'none'
      break

    case 'DRIFTING':
      if (convergence.convergenceScore >= 2) {
        level = 'warning'
        reasons.push(
          `Drift terdeteksi pada ${convergence.convergenceScore} parameter (${convergence.worseningParams.join(', ')})`
        )
      } else {
        level = 'info'
        reasons.push('Tren lambat terdeteksi — monitoring berkala')
      }
      break

    case 'ACCELERATING':
      level = 'warning'
      reasons.push('Akselerasi deteriorasi — perubahan makin cepat')
      if (convergence.convergenceScore >= 2) {
        level = 'urgent'
        reasons.push(`Bersamaan dengan konvergensi ${convergence.convergenceScore} parameter`)
      }
      break

    case 'CONVERGING':
      level = 'urgent'
      reasons.push(
        `Konvergensi: ${convergence.pattern} — ${convergence.worseningParams.join(', ')}`
      )
      if (convergence.convergenceScore >= 3) {
        level = 'critical'
        reasons.push(`${convergence.convergenceScore} parameter konvergen bersamaan`)
      }
      break

    case 'CRITICAL_MOMENTUM':
      level = 'emergency'
      reasons.push('MOMENTUM KRITIS — deteriorasi cepat multi-parameter')
      if (convergence.pattern !== 'none') {
        reasons.push(`Pola: ${convergence.pattern}`)
      }
      break
  }

  // Convergence pattern override
  if (convergence.pattern === 'cardiovascular' && level === 'warning') {
    level = 'urgent'
    reasons.push('Pola kardiovaskular — eskalasi ke urgent')
  }
  if (convergence.pattern === 'sepsis_like' && (level === 'warning' || level === 'info')) {
    level = 'urgent'
    reasons.push('Pola sepsis-like — eskalasi ke urgent')
  }

  const shouldPush = ['urgent', 'critical', 'emergency'].includes(level)
  // Cooldown key: unique per patient + level (prevents duplicate alerts)
  const cooldownKey = `trajectory_${momentumLevel}_${convergence.pattern}_${level}`

  return { level, reasons, shouldPush, cooldownKey }
}

// ── Main Export ──────────────────────────────────────────────────────────────

/**
 * Run full prediction analysis on momentum results.
 */
export function runPredictionEngine(
  momentumLevel: MomentumLevel,
  params: ParamMomentum[],
  convergence: ConvergenceResult
): PredictionResult {
  const worseningParams = params.filter(p => p.direction === 'worsening')

  const timeToCritical: TimeToCriticalResult[] = []
  for (const p of worseningParams) {
    const ttc = predictTimeToCritical(p)
    if (ttc) timeToCritical.push(ttc)
  }

  const treatmentResponse = detectTreatmentResponse(params)
  const alertDecision = generateAlertDecision(momentumLevel, convergence)

  return { timeToCritical, treatmentResponse, alertDecision }
}
