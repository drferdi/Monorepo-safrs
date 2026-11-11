/**
 * Personal Baseline Calculator
 *
 * Computes a patient's individual "normal" for each vital parameter
 * using a weighted moving average over historical visits.
 *
 * KEY INSIGHT: Population thresholds (e.g., SBP > 140 = hypertensive)
 * miss the patient who lives at 145/90 controlled. This engine learns
 * their personal baseline and alerts on DEVIATION from THEIR normal.
 *
 * Weight scheme: recent visits get exponentially higher weight.
 * Decay factor: visits >90 days ago get weight 0.1 (vs 1.0 recent).
 *
 * Clinical Momentum Engine — Phase 2 (Momentum Core)
 */

import type { VisitRecord } from './trajectory-analyzer'

// ── Types ────────────────────────────────────────────────────────────────────

export type BaselineParam = 'sbp' | 'dbp' | 'hr' | 'rr' | 'temp' | 'glucose' | 'spo2'

export interface BaselineStat {
  /** Weighted mean — the patient's personal "normal" */
  mean: number
  /** Weighted standard deviation */
  stdDev: number
  /** Number of valid observations used */
  n: number
  /** Z-score of the current/latest value vs baseline */
  currentZScore: number | null
  /** Human-readable deviation description */
  deviationLabel:
    | 'within_baseline'
    | 'mild_deviation'
    | 'significant_deviation'
    | 'extreme_deviation'
}

export interface PersonalBaseline {
  patientId: string
  computedAt: string
  visitCount: number
  params: Partial<Record<BaselineParam, BaselineStat>>
}

// ── Config ───────────────────────────────────────────────────────────────────

/** Days at which point weight decays to ~10% */
const DECAY_HALF_LIFE_DAYS = 30

/** Minimum visits required to compute meaningful baseline */
const MIN_VISITS_FOR_BASELINE = 2

// ── Weight Function ──────────────────────────────────────────────────────────

/**
 * Compute visit weight based on recency.
 * Weight = e^(-λ * age_in_days), where λ = ln(10) / DECAY_HALF_LIFE_DAYS.
 * At 0 days: weight = 1.0. At 30 days: weight ≈ 0.32. At 90 days: weight ≈ 0.03.
 */
function computeRecencyWeight(visitTimestamp: string, referenceTime: Date): number {
  const visitDate = new Date(visitTimestamp)
  const ageDays = (referenceTime.getTime() - visitDate.getTime()) / 86_400_000
  if (ageDays < 0) return 1.0 // future-dated visits (should not happen) treated as current
  const lambda = Math.LN10 / DECAY_HALF_LIFE_DAYS
  return Math.exp(-lambda * ageDays)
}

// ── Weighted Stats ───────────────────────────────────────────────────────────

interface WeightedObservation {
  value: number
  weight: number
}

function weightedMean(obs: WeightedObservation[]): number {
  if (obs.length === 0) return 0
  const sumW = obs.reduce((acc, o) => acc + o.weight, 0)
  if (sumW === 0) return 0
  return obs.reduce((acc, o) => acc + o.value * o.weight, 0) / sumW
}

function weightedStdDev(obs: WeightedObservation[], mean: number): number {
  if (obs.length < 2) return 0
  const sumW = obs.reduce((acc, o) => acc + o.weight, 0)
  const sumW2 = obs.reduce((acc, o) => acc + o.weight ** 2, 0)
  if (sumW === 0) return 0

  // Reliability weights formula for weighted variance
  const variance =
    obs.reduce((acc, o) => acc + o.weight * (o.value - mean) ** 2, 0) / (sumW - sumW2 / sumW)

  return Math.sqrt(Math.max(0, variance))
}

function deviationLabel(zScore: number): BaselineStat['deviationLabel'] {
  const abs = Math.abs(zScore)
  if (abs < 1.5) return 'within_baseline'
  if (abs < 2.5) return 'mild_deviation'
  if (abs < 3.5) return 'significant_deviation'
  return 'extreme_deviation'
}

// ── Main Export ──────────────────────────────────────────────────────────────

/**
 * Compute personal baseline for a patient from their visit history.
 *
 * @param visits - Historical visit records (at least 2 recommended)
 * @param currentValue - Optional: latest value per parameter for Z-score computation
 * @param referenceTime - Reference time for recency weighting (default: now)
 */
export function computePersonalBaseline(
  visits: VisitRecord[],
  currentValues?: Partial<Record<BaselineParam, number>>,
  referenceTime: Date = new Date()
): PersonalBaseline {
  const patientId = visits[0]?.patient_id ?? 'unknown'
  const PARAMS: BaselineParam[] = ['sbp', 'dbp', 'hr', 'rr', 'temp', 'glucose', 'spo2']

  if (visits.length < MIN_VISITS_FOR_BASELINE) {
    return {
      patientId,
      computedAt: referenceTime.toISOString(),
      visitCount: visits.length,
      params: {},
    }
  }

  const params: Partial<Record<BaselineParam, BaselineStat>> = {}

  for (const param of PARAMS) {
    const observations: WeightedObservation[] = []

    for (const visit of visits) {
      const value = visit.vitals[param] as number | undefined
      if (value === undefined || value <= 0) continue

      const weight = computeRecencyWeight(visit.timestamp, referenceTime)
      observations.push({ value, weight })
    }

    if (observations.length < MIN_VISITS_FOR_BASELINE) continue

    const mean = weightedMean(observations)
    const stdDev = weightedStdDev(observations, mean)

    // Current value for Z-score (latest visit or explicitly provided)
    const currentValue =
      currentValues?.[param] ?? (visits[visits.length - 1]?.vitals[param] as number | undefined)

    let currentZScore: number | null = null
    let label: BaselineStat['deviationLabel'] = 'within_baseline'

    if (currentValue !== undefined && currentValue > 0 && stdDev > 0) {
      currentZScore = (currentValue - mean) / stdDev
      label = deviationLabel(currentZScore)
    }

    params[param] = {
      mean: Math.round(mean * 10) / 10,
      stdDev: Math.round(stdDev * 10) / 10,
      n: observations.length,
      currentZScore: currentZScore !== null ? Math.round(currentZScore * 100) / 100 : null,
      deviationLabel: label,
    }
  }

  return {
    patientId,
    computedAt: referenceTime.toISOString(),
    visitCount: visits.length,
    params,
  }
}

/**
 * Check if a specific parameter significantly deviates from personal baseline.
 * Returns the Z-score and severity label, or null if baseline not established.
 */
export function checkBaselineDeviation(
  baseline: PersonalBaseline,
  param: BaselineParam,
  currentValue: number
): { zScore: number; label: BaselineStat['deviationLabel'] } | null {
  const stat = baseline.params[param]
  if (!stat || stat.stdDev <= 0) return null

  const zScore = (currentValue - stat.mean) / stat.stdDev
  return {
    zScore: Math.round(zScore * 100) / 100,
    label: deviationLabel(zScore),
  }
}
