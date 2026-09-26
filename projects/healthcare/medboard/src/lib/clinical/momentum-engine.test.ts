import assert from 'node:assert/strict'
import test from 'node:test'
import { detectConvergence, isWorsening } from './convergence-detector'
import { computeMomentum } from './momentum-engine'
import { computePersonalBaseline } from './personal-baseline'
import type { VisitRecord } from './trajectory-analyzer'

// ── Helpers ──────────────────────────────────────────────────────────────────

function makeVisit(
  id: string,
  timestamp: string,
  overrides: Partial<VisitRecord['vitals']> = {}
): VisitRecord {
  return {
    patient_id: 'patient-test',
    encounter_id: id,
    timestamp,
    vitals: {
      sbp: 120,
      dbp: 80,
      hr: 72,
      rr: 16,
      temp: 36.8,
      glucose: 120,
      spo2: 98,
      ...overrides,
    },
    keluhan_utama: 'Kontrol',
    source: 'scrape',
  }
}

// Weekly intervals
const W0 = '2026-01-01T08:00:00.000Z'
const W1 = '2026-01-08T08:00:00.000Z'
const W2 = '2026-01-15T08:00:00.000Z'
const W3 = '2026-01-22T08:00:00.000Z'
const W4 = '2026-01-29T08:00:00.000Z'

// ── Insufficient Data ─────────────────────────────────────────────────────────

test('INSUFFICIENT_DATA for single visit', () => {
  const result = computeMomentum([makeVisit('e1', W0)])
  assert.equal(result.level, 'INSUFFICIENT_DATA')
  assert.equal(result.isReliable, false)
  assert.equal(result.visitCount, 1)
})

// ── Stable Patient ───────────────────────────────────────────────────────────

test('STABLE: patient with flat vitals over 5 visits', () => {
  const visits = [
    makeVisit('e1', W0, { sbp: 125, hr: 74 }),
    makeVisit('e2', W1, { sbp: 126, hr: 73 }),
    makeVisit('e3', W2, { sbp: 124, hr: 75 }),
    makeVisit('e4', W3, { sbp: 125, hr: 74 }),
    makeVisit('e5', W4, { sbp: 125, hr: 74 }),
  ]
  const result = computeMomentum(visits)
  assert.ok(
    ['STABLE', 'DRIFTING', 'PRELIMINARY'].includes(result.level),
    `Expected stable-ish level, got ${result.level}`
  )
  assert.equal(result.isReliable, true)
})

// ── Progressive HT Deterioration ─────────────────────────────────────────────

test('DRIFTING/ACCELERATING: SBP rising steadily week over week', () => {
  const visits = [
    makeVisit('e1', W0, { sbp: 130 }),
    makeVisit('e2', W1, { sbp: 138 }),
    makeVisit('e3', W2, { sbp: 146 }),
    makeVisit('e4', W3, { sbp: 155 }),
    makeVisit('e5', W4, { sbp: 165 }),
  ]
  const result = computeMomentum(visits)
  const sbpParam = result.params.find(p => p.param === 'sbp')
  assert.ok(sbpParam, 'SBP param should be present')
  assert.equal(sbpParam?.direction, 'worsening', 'SBP should be worsening')
  assert.ok(sbpParam!.velocityPerDay > 0, 'SBP velocity should be positive')
  assert.ok(
    ['DRIFTING', 'ACCELERATING', 'CONVERGING', 'CRITICAL_MOMENTUM'].includes(result.level),
    `Expected deteriorating level, got ${result.level}`
  )
})

// ── Post-Treatment Improvement ────────────────────────────────────────────────

test('STABLE/DRIFTING: SBP improving after medication increase', () => {
  const visits = [
    makeVisit('e1', W0, { sbp: 165 }),
    makeVisit('e2', W1, { sbp: 158 }),
    makeVisit('e3', W2, { sbp: 150 }),
    makeVisit('e4', W3, { sbp: 144 }),
    makeVisit('e5', W4, { sbp: 138 }),
  ]
  const result = computeMomentum(visits)
  const sbpParam = result.params.find(p => p.param === 'sbp')
  assert.equal(sbpParam?.direction, 'improving', 'SBP should be improving')
  assert.ok(sbpParam!.velocityPerDay < 0, 'SBP velocity negative = improving')
})

// ── Cardiovascular Convergence ────────────────────────────────────────────────

test('CONVERGING: SBP↑ + HR↑ + SpO2↓ → cardiovascular pattern', () => {
  const visits = [
    makeVisit('e1', W0, { sbp: 130, hr: 78, spo2: 98 }),
    makeVisit('e2', W1, { sbp: 138, hr: 84, spo2: 96 }),
    makeVisit('e3', W2, { sbp: 148, hr: 92, spo2: 94 }),
    makeVisit('e4', W3, { sbp: 158, hr: 100, spo2: 92 }),
    makeVisit('e5', W4, { sbp: 168, hr: 110, spo2: 90 }),
  ]
  const result = computeMomentum(visits)
  assert.ok(
    ['CONVERGING', 'CRITICAL_MOMENTUM', 'ACCELERATING'].includes(result.level),
    `Expected convergence, got ${result.level}`
  )
  assert.ok(result.convergence.convergenceScore >= 2, 'Should have 2+ converging params')
})

// ── SpO2 Direction Inversion ──────────────────────────────────────────────────

test('isWorsening: SpO2 going DOWN is worsening', () => {
  assert.equal(isWorsening('spo2', -0.5), 'worsening')
  assert.equal(isWorsening('spo2', 0.5), 'improving')
})

test('isWorsening: SBP going UP is worsening', () => {
  assert.equal(isWorsening('sbp', 2.0), 'worsening')
  assert.equal(isWorsening('sbp', -2.0), 'improving')
})

test('isWorsening: velocity below threshold is stable', () => {
  assert.equal(isWorsening('sbp', 0.04), 'stable')
  assert.equal(isWorsening('spo2', -0.04), 'stable')
})

// ── Convergence Detector ──────────────────────────────────────────────────────

test('detectConvergence: 3 worsening params = shouldAlert', () => {
  const result = detectConvergence([
    { param: 'sbp', direction: 'worsening', velocity: 2 },
    { param: 'hr', direction: 'worsening', velocity: 3 },
    { param: 'spo2', direction: 'worsening', velocity: -0.5 },
  ])
  assert.equal(result.convergenceScore, 3)
  assert.equal(result.shouldAlert, true)
  assert.equal(result.pattern, 'cardiovascular')
})

test('detectConvergence: sepsis-like pattern detected', () => {
  const result = detectConvergence([
    { param: 'temp', direction: 'worsening', velocity: 0.2 },
    { param: 'hr', direction: 'worsening', velocity: 3 },
    { param: 'rr', direction: 'worsening', velocity: 1 },
  ])
  assert.equal(result.pattern, 'sepsis_like')
  assert.equal(result.shouldAlert, true)
})

test('detectConvergence: single worsening param = no alert', () => {
  const result = detectConvergence([
    { param: 'sbp', direction: 'worsening', velocity: 2 },
    { param: 'hr', direction: 'stable', velocity: 0 },
  ])
  assert.equal(result.shouldAlert, false)
})

test('detectConvergence: 0 worsening = none pattern', () => {
  const result = detectConvergence([
    { param: 'sbp', direction: 'improving', velocity: -1 },
    { param: 'hr', direction: 'stable', velocity: 0 },
  ])
  assert.equal(result.pattern, 'none')
  assert.equal(result.shouldAlert, false)
})

// ── Personal Baseline ─────────────────────────────────────────────────────────

test('personal baseline: mean ≈ average of visit values', () => {
  const visits = [
    makeVisit('e1', W0, { sbp: 140 }),
    makeVisit('e2', W1, { sbp: 144 }),
    makeVisit('e3', W2, { sbp: 142 }),
    makeVisit('e4', W3, { sbp: 146 }),
    makeVisit('e5', W4, { sbp: 143 }),
  ]
  // Use fixed reference time so weights are predictable
  const ref = new Date(W4)
  const baseline = computePersonalBaseline(visits, undefined, ref)
  const sbpStat = baseline.params.sbp
  assert.ok(sbpStat, 'SBP baseline should be computed')
  // Weighted mean should be close to recent values (142-146 range)
  assert.ok(sbpStat!.mean >= 140 && sbpStat!.mean <= 147, `Mean ${sbpStat!.mean} out of range`)
})

test('personal baseline: deviation label for Z > 3.5 = extreme', () => {
  const visits = [
    makeVisit('e1', W0, { sbp: 130 }),
    makeVisit('e2', W1, { sbp: 131 }),
    makeVisit('e3', W2, { sbp: 130 }),
    makeVisit('e4', W3, { sbp: 131 }),
  ]
  // Now test with current value far from baseline
  const currentValues = { sbp: 200 } // extreme deviation
  const ref = new Date(W3)
  const baseline = computePersonalBaseline(visits, currentValues, ref)
  const stat = baseline.params.sbp
  assert.ok(stat, 'SBP stat should exist')
  // Z-score should be large
  assert.ok(Math.abs(stat!.currentZScore ?? 0) > 3, 'Z-score should be > 3 for extreme deviation')
  assert.equal(stat!.deviationLabel, 'extreme_deviation')
})

test('personal baseline: < 2 visits = empty params', () => {
  const baseline = computePersonalBaseline([makeVisit('e1', W0)])
  assert.deepEqual(baseline.params, {}, 'No params with single visit')
})

// ── Trajectory Integration ────────────────────────────────────────────────────

test('analyzeTrajectory includes momentum field', async () => {
  const { analyzeTrajectory } = await import('./trajectory-analyzer')
  const visits = [
    makeVisit('e1', W0, { sbp: 130, spo2: 98 }),
    makeVisit('e2', W1, { sbp: 138, spo2: 97 }),
    makeVisit('e3', W2, { sbp: 145, spo2: 96 }),
  ]
  const result = analyzeTrajectory(visits)
  assert.ok('momentum' in result, 'TrajectoryAnalysis should include momentum')
  assert.ok(result.momentum.visitCount === 3)
  assert.ok(typeof result.momentum.level === 'string')
  assert.ok(typeof result.momentum.score === 'number')
})
