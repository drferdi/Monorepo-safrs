/**
 * Clinical Momentum Engine
 *
 * Computes velocity (rate of change), acceleration (rate of velocity change),
 * and a composite momentum score for each vital parameter across visits.
 *
 * DIFFERENTIATOR vs existing trajectory analyzer:
 * - Existing: "is this value high/low?" (snapshot)
 * - Momentum: "how fast is it changing, and is it speeding up?" (dynamics)
 *
 * Momentum Levels:
 *   INSUFFICIENT_DATA  → < 2 visits
 *   PRELIMINARY        → 2 visits (velocity only, no acceleration)
 *   STABLE             → low velocity, no convergence
 *   DRIFTING           → slow consistent drift in one direction
 *   ACCELERATING       → increasing velocity (worsening faster)
 *   CONVERGING         → 2+ parameters worsening simultaneously
 *   CRITICAL_MOMENTUM  → accelerating + converging + high baseline deviation
 *
 * Clinical Momentum Engine — Phase 2 (Momentum Core)
 */

import {
  type ConvergenceParam,
  type ConvergenceResult,
  detectConvergence,
  isWorsening,
  type ParamTrend,
} from './convergence-detector'
import {
  type BaselineParam,
  computePersonalBaseline,
  type PersonalBaseline,
} from './personal-baseline'
import type { VisitRecord } from './trajectory-analyzer'

// ── Types ────────────────────────────────────────────────────────────────────

export type MomentumLevel =
  | 'INSUFFICIENT_DATA'
  | 'PRELIMINARY'
  | 'STABLE'
  | 'DRIFTING'
  | 'ACCELERATING'
  | 'CONVERGING'
  | 'CRITICAL_MOMENTUM'

export type VitalParam = BaselineParam

export interface ParamMomentum {
  param: VitalParam
  values: number[]
  /** Rate of change per day (positive = increasing) */
  velocityPerDay: number
  /** Rate of velocity change per day (positive = accelerating in same direction) */
  accelerationPerDay: number | null
  /** Direction of trend */
  direction: 'worsening' | 'improving' | 'stable'
  /** Is the change accelerating (getting worse faster)? */
  isAccelerating: boolean
}

export interface MomentumAnalysis {
  /** Overall momentum level */
  level: MomentumLevel
  /** Composite score 0–100 */
  score: number
  /** Per-parameter momentum */
  params: ParamMomentum[]
  /** Personal baseline analysis */
  baseline: PersonalBaseline
  /** Convergence analysis */
  convergence: ConvergenceResult
  /** Human-readable narrative */
  narrative: string
  /** Number of visits used */
  visitCount: number
  /** Whether trend data is sufficient for reliable analysis */
  isReliable: boolean
}

// ── Velocity Calculation ─────────────────────────────────────────────────────

/**
 * Compute velocity between two consecutive data points.
 * Normalizes by the actual time interval between visits (not just visit count).
 *
 * @returns velocity in units/day
 */
function computeVelocity(valueBefore: number, valueAfter: number, intervalMs: number): number {
  const intervalDays = intervalMs / 86_400_000
  if (intervalDays < 0.01) return 0 // < ~15 minutes — same-day measurement
  return (valueAfter - valueBefore) / intervalDays
}

/**
 * Compute velocity series from a sorted visit series.
 * Returns array of velocities (length = visits.length - 1).
 */
function computeVelocitySeries(
  visits: VisitRecord[],
  param: VitalParam
): { velocity: number; intervalDays: number }[] {
  const result: { velocity: number; intervalDays: number }[] = []

  for (let i = 1; i < visits.length; i++) {
    const prev = visits[i - 1]
    const curr = visits[i]
    const vPrev = prev.vitals[param] as number
    const vCurr = curr.vitals[param] as number

    if (!vPrev || !vCurr || vPrev <= 0 || vCurr <= 0) continue

    const tPrev = new Date(prev.timestamp).getTime()
    const tCurr = new Date(curr.timestamp).getTime()
    const intervalMs = tCurr - tPrev

    if (intervalMs <= 0) continue

    const intervalDays = intervalMs / 86_400_000
    result.push({
      velocity: computeVelocity(vPrev, vCurr, intervalMs),
      intervalDays,
    })
  }

  return result
}

/**
 * Compute linear regression slope of a velocity series (acceleration).
 * Returns null if not enough data.
 */
function computeAcceleration(velocitySeries: number[]): number | null {
  if (velocitySeries.length < 2) return null

  const n = velocitySeries.length
  const xMean = (n - 1) / 2
  const yMean = velocitySeries.reduce((a, b) => a + b, 0) / n

  let num = 0
  let den = 0
  for (let i = 0; i < n; i++) {
    num += (i - xMean) * (velocitySeries[i] - yMean)
    den += (i - xMean) ** 2
  }

  return den !== 0 ? num / den : null
}

// ── Momentum Score ───────────────────────────────────────────────────────────

const PARAM_WEIGHT: Record<VitalParam, number> = {
  sbp: 1.3,
  dbp: 1.1,
  hr: 1.0,
  rr: 1.0,
  temp: 0.9,
  glucose: 1.2,
  spo2: 1.1,
}

function computeMomentumScore(
  params: ParamMomentum[],
  convergenceScore: number,
  baselineParams: PersonalBaseline['params']
): number {
  let raw = 0
  let totalWeight = 0

  for (const p of params) {
    const weight = PARAM_WEIGHT[p.param] ?? 1.0
    totalWeight += weight

    // Velocity contribution: normalized by expected max velocity per param
    const velScore = Math.min(Math.abs(p.velocityPerDay) / getMaxExpectedVelocity(p.param), 1.0)

    // Acceleration contribution (amplifies if accelerating in bad direction)
    const accelBonus = p.isAccelerating ? 0.3 : 0

    // Worsening multiplier
    const dirMultiplier = p.direction === 'worsening' ? 1.0 : p.direction === 'stable' ? 0.2 : 0

    // Baseline deviation contribution
    const baseline = baselineParams[p.param]
    const devScore = baseline?.currentZScore
      ? Math.min(Math.abs(baseline.currentZScore) / 3, 1.0)
      : 0

    raw += weight * ((velScore + accelBonus + devScore * 0.5) * dirMultiplier)
  }

  // Convergence amplifier: each converging param adds multiplicative risk
  const convergenceMultiplier = 1 + convergenceScore * 0.25

  const normalized = totalWeight > 0 ? (raw / totalWeight) * convergenceMultiplier : 0
  return Math.min(Math.round(normalized * 100), 100)
}

function getMaxExpectedVelocity(param: VitalParam): number {
  switch (param) {
    case 'sbp':
      return 5 // 5 mmHg/day = rapid BP rise
    case 'dbp':
      return 3
    case 'hr':
      return 5 // 5 bpm/day
    case 'rr':
      return 2 // 2 breaths/min/day
    case 'temp':
      return 0.3 // 0.3°C/day
    case 'glucose':
      return 30 // 30 mg/dL/day
    case 'spo2':
      return 1 // 1%/day is significant for SpO2
  }
}

// ── Level Classification ─────────────────────────────────────────────────────

function classifyLevel(
  score: number,
  convergenceScore: number,
  hasAcceleration: boolean,
  isAcceleratingWorsening: boolean,
  worseningCount: number
): MomentumLevel {
  if (score >= 70 || (convergenceScore >= 3 && isAcceleratingWorsening)) {
    return 'CRITICAL_MOMENTUM'
  }
  if (convergenceScore >= 2 && isAcceleratingWorsening) return 'CONVERGING'
  if (convergenceScore >= 3) return 'CONVERGING'
  if (isAcceleratingWorsening && score >= 20) return 'ACCELERATING'
  // Any worsening parameter = at minimum DRIFTING
  // (stable params in denominator dilute score — use count as floor)
  if (score >= 15 || worseningCount >= 1) return 'DRIFTING'
  return 'STABLE'
}

function buildNarrative(
  level: MomentumLevel,
  params: ParamMomentum[],
  convergence: ConvergenceResult
): string {
  const worsening = params.filter(p => p.direction === 'worsening')
  const improving = params.filter(p => p.direction === 'improving')

  if (level === 'STABLE') {
    return 'Momentum klinis stabil — tidak ada tren deteriorasi signifikan.'
  }
  if (level === 'INSUFFICIENT_DATA') {
    return 'Data tidak cukup untuk analisis momentum — butuh minimal 2 kunjungan.'
  }
  if (level === 'PRELIMINARY') {
    return 'Data awal (2 kunjungan) — kecepatan perubahan dapat dihitung, akselerasi belum tersedia.'
  }

  const worseNames = worsening.map(p => p.param.toUpperCase()).join(', ')
  const accel = worsening.filter(p => p.isAccelerating)

  if (level === 'CRITICAL_MOMENTUM') {
    return `MOMENTUM KRITIS: ${worseNames} — ${convergence.narrative}`
  }
  if (level === 'CONVERGING') {
    return `Konvergensi terdeteksi: ${convergence.narrative}`
  }
  if (level === 'ACCELERATING') {
    const accelNames = accel.map(p => p.param.toUpperCase()).join(', ')
    return `Akselerasi deteriorasi: ${accelNames} memburuk makin cepat.`
  }
  if (level === 'DRIFTING') {
    const parts = [
      worsening.length > 0 ? `${worseNames} drift memburuk` : '',
      improving.length > 0 ? `${improving.map(p => p.param.toUpperCase()).join(', ')} membaik` : '',
    ].filter(Boolean)
    return parts.join('; ') + '.'
  }

  return 'Momentum klinis dalam batas normal.'
}

// ── Main Export ──────────────────────────────────────────────────────────────

/**
 * Compute Clinical Momentum Analysis from visit history.
 *
 * @param visits - Visit records sorted by timestamp (oldest first)
 */
export function computeMomentum(visits: VisitRecord[]): MomentumAnalysis {
  const sorted = [...visits].sort(
    (a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime()
  )

  // Insufficient data
  if (sorted.length < 2) {
    const baseline = computePersonalBaseline(sorted)
    return {
      level: 'INSUFFICIENT_DATA',
      score: 0,
      params: [],
      baseline,
      convergence: detectConvergence([]),
      narrative: 'Data tidak cukup untuk analisis momentum — butuh minimal 2 kunjungan.',
      visitCount: sorted.length,
      isReliable: false,
    }
  }

  const PARAMS: VitalParam[] = ['sbp', 'dbp', 'hr', 'rr', 'temp', 'glucose', 'spo2']
  const baseline = computePersonalBaseline(sorted)

  const paramMomentums: ParamMomentum[] = []
  const trends: ParamTrend[] = []

  for (const param of PARAMS) {
    const velocitySeries = computeVelocitySeries(sorted, param)
    if (velocitySeries.length === 0) continue

    const velocities = velocitySeries.map(v => v.velocity)

    // Current velocity = most recent interval's velocity
    const currentVelocity = velocities[velocities.length - 1]

    // Acceleration from velocity trend
    const acceleration = computeAcceleration(velocities)

    // Direction: is the current velocity worsening for this param?
    const direction = isWorsening(
      param as ConvergenceParam,
      currentVelocity,
      0.05 // threshold: < 0.05 units/day = stable
    )

    // Is it accelerating in the worsening direction?
    const isAccelerating =
      acceleration !== null &&
      Math.abs(acceleration) > 0.01 &&
      direction === 'worsening' &&
      acceleration * Math.sign(currentVelocity) > 0

    // Extract values for display
    const values = sorted.map(v => v.vitals[param] as number).filter(v => v > 0)

    paramMomentums.push({
      param,
      values,
      velocityPerDay: Math.round(currentVelocity * 100) / 100,
      accelerationPerDay: acceleration !== null ? Math.round(acceleration * 1000) / 1000 : null,
      direction,
      isAccelerating,
    })

    trends.push({ param: param as ConvergenceParam, direction, velocity: currentVelocity })
  }

  const convergence = detectConvergence(trends)

  const hasAcceleration = paramMomentums.some(p => p.accelerationPerDay !== null)
  const isAcceleratingWorsening = paramMomentums.some(
    p => p.isAccelerating && p.direction === 'worsening'
  )

  const score = computeMomentumScore(paramMomentums, convergence.convergenceScore, baseline.params)

  const isPreliminary = sorted.length === 2
  const worseningCount = paramMomentums.filter(p => p.direction === 'worsening').length
  const level: MomentumLevel = isPreliminary
    ? 'PRELIMINARY'
    : classifyLevel(
        score,
        convergence.convergenceScore,
        hasAcceleration,
        isAcceleratingWorsening,
        worseningCount
      )

  const narrative = buildNarrative(level, paramMomentums, convergence)

  return {
    level,
    score,
    params: paramMomentums,
    baseline,
    convergence,
    narrative,
    visitCount: sorted.length,
    isReliable: sorted.length >= 3,
  }
}
