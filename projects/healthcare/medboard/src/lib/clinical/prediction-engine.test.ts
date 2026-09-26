import assert from 'node:assert/strict'
import test from 'node:test'
import type { ConvergenceResult } from './convergence-detector'
import type { ParamMomentum } from './momentum-engine'
import {
  detectTreatmentResponse,
  generateAlertDecision,
  runPredictionEngine,
} from './prediction-engine'

// ── Helpers ──────────────────────────────────────────────────────────────────

function makeParamMomentum(overrides: Partial<ParamMomentum>): ParamMomentum {
  return {
    param: 'sbp',
    values: [130, 140, 150],
    velocityPerDay: 1.4,
    accelerationPerDay: 0,
    direction: 'worsening',
    isAccelerating: false,
    ...overrides,
  }
}

function makeConvergence(overrides: Partial<ConvergenceResult> = {}): ConvergenceResult {
  return {
    convergenceScore: 0,
    worseningParams: [],
    improvingParams: [],
    pattern: 'none',
    narrative: 'stable',
    shouldAlert: false,
    ...overrides,
  }
}

// ── Time-to-Critical ─────────────────────────────────────────────────────────

test('predicts time-to-critical for rising SBP', () => {
  // SBP at 160, rising 5/day, critical = 180 → 4 days linear
  const param = makeParamMomentum({
    param: 'sbp',
    values: [150, 155, 160],
    velocityPerDay: 5,
    direction: 'worsening',
  })
  const result = runPredictionEngine('DRIFTING', [param], makeConvergence())
  const sbpTTC = result.timeToCritical.find(t => t.param === 'sbp')
  assert.ok(sbpTTC, 'Should have SBP TTC')
  assert.ok(sbpTTC!.daysBestEstimate !== null, 'Should have estimate')
  assert.ok(
    sbpTTC!.daysBestEstimate! >= 3 && sbpTTC!.daysBestEstimate! <= 6,
    `Expected ~4 days, got ${sbpTTC!.daysBestEstimate}`
  )
})

test('no TTC for stable parameter', () => {
  const param = makeParamMomentum({
    param: 'sbp',
    values: [130, 130, 130],
    velocityPerDay: 0,
    direction: 'stable',
  })
  const result = runPredictionEngine('STABLE', [param], makeConvergence())
  assert.equal(result.timeToCritical.length, 0, 'No TTC for stable param')
})

test('no TTC for improving parameter', () => {
  const param = makeParamMomentum({
    param: 'sbp',
    values: [165, 155, 145],
    velocityPerDay: -1.4,
    direction: 'improving',
  })
  const result = runPredictionEngine('DRIFTING', [param], makeConvergence({ worseningParams: [] }))
  assert.equal(result.timeToCritical.length, 0, 'No TTC for improving param')
})

test('acceleration-adjusted TTC is lower than linear when accelerating', () => {
  // SBP at 150, velocity +5/day, acceleration +1/day² → reaches 180 faster
  const param = makeParamMomentum({
    param: 'sbp',
    values: [130, 140, 150],
    velocityPerDay: 5,
    accelerationPerDay: 1,
    direction: 'worsening',
    isAccelerating: true,
  })
  const result = runPredictionEngine('ACCELERATING', [param], makeConvergence())
  const ttc = result.timeToCritical.find(t => t.param === 'sbp')
  assert.ok(ttc, 'Should have TTC')
  if (ttc?.daysLinear !== null && ttc?.daysAccelAdjusted !== null) {
    assert.ok(
      ttc.daysAccelAdjusted! <= ttc.daysLinear!,
      `Accel-adjusted (${ttc.daysAccelAdjusted}) should be ≤ linear (${ttc.daysLinear})`
    )
  }
})

test('SpO2 TTC predicted for falling SpO2', () => {
  // SpO2 at 93, falling -0.5/day, critical = 90 → 6 days
  const param = makeParamMomentum({
    param: 'spo2',
    values: [97, 95, 93],
    velocityPerDay: -0.5,
    direction: 'worsening',
  })
  const result = runPredictionEngine('DRIFTING', [param], makeConvergence())
  const spo2TTC = result.timeToCritical.find(t => t.param === 'spo2')
  assert.ok(spo2TTC, 'Should have SpO2 TTC')
  assert.ok(
    spo2TTC!.daysBestEstimate! >= 4 && spo2TTC!.daysBestEstimate! <= 8,
    `Expected ~6 days, got ${spo2TTC!.daysBestEstimate}`
  )
})

// ── Treatment Response ─────────────────────────────────────────────────────

test('detects effective treatment: velocity reduced ≥50%', () => {
  // First half: SBP rising fast (+8/visit), second half: rising slow (+2/visit)
  const param = makeParamMomentum({
    param: 'sbp',
    values: [130, 138, 146, 148, 150],
    velocityPerDay: 1.0,
    direction: 'worsening',
  })
  const result = detectTreatmentResponse([param])
  assert.ok(
    result.interpretation === 'effective' || result.interpretation === 'partially_effective',
    `Expected effective/partial, got ${result.interpretation}`
  )
})

test('detects ineffective treatment: velocity unchanged', () => {
  const param = makeParamMomentum({
    param: 'sbp',
    values: [130, 138, 146, 154, 162],
    velocityPerDay: 8.0 / 7,
    direction: 'worsening',
  })
  const result = detectTreatmentResponse([param])
  assert.ok(
    result.interpretation === 'ineffective' || result.interpretation === 'worsening',
    `Expected ineffective/worsening, got ${result.interpretation}`
  )
})

test('returns unknown for < 4 visits', () => {
  const param = makeParamMomentum({
    param: 'sbp',
    values: [130, 138],
    direction: 'worsening',
  })
  const result = detectTreatmentResponse([param])
  assert.equal(result.interpretation, 'unknown')
  assert.equal(result.detected, false)
})

// ── Alert Decision Matrix ─────────────────────────────────────────────────────

test('STABLE momentum → no alert', () => {
  const alert = generateAlertDecision('STABLE', makeConvergence())
  assert.equal(alert.level, 'none')
  assert.equal(alert.shouldPush, false)
})

test('DRIFTING with 0 convergence → info only', () => {
  const alert = generateAlertDecision('DRIFTING', makeConvergence())
  assert.equal(alert.level, 'info')
  assert.equal(alert.shouldPush, false)
})

test('DRIFTING with 2 converging params → warning push', () => {
  const alert = generateAlertDecision(
    'DRIFTING',
    makeConvergence({
      convergenceScore: 2,
      worseningParams: ['sbp', 'hr'],
      pattern: 'hypertensive_crisis',
    })
  )
  assert.equal(alert.level, 'warning')
  assert.equal(alert.shouldPush, false) // warning is push=false based on our matrix
})

test('ACCELERATING → warning level', () => {
  const alert = generateAlertDecision('ACCELERATING', makeConvergence())
  assert.equal(alert.level, 'warning')
})

test('ACCELERATING + 2 converging → urgent', () => {
  const alert = generateAlertDecision(
    'ACCELERATING',
    makeConvergence({
      convergenceScore: 2,
      worseningParams: ['sbp', 'hr'],
      pattern: 'hypertensive_crisis',
    })
  )
  assert.equal(alert.level, 'urgent')
  assert.equal(alert.shouldPush, true)
})

test('CONVERGING with 3 params → critical push', () => {
  const alert = generateAlertDecision(
    'CONVERGING',
    makeConvergence({
      convergenceScore: 3,
      worseningParams: ['sbp', 'hr', 'spo2'],
      pattern: 'cardiovascular',
    })
  )
  assert.equal(alert.level, 'critical')
  assert.equal(alert.shouldPush, true)
})

test('CRITICAL_MOMENTUM → emergency push', () => {
  const alert = generateAlertDecision(
    'CRITICAL_MOMENTUM',
    makeConvergence({
      convergenceScore: 4,
      worseningParams: ['sbp', 'hr', 'spo2', 'rr'],
      pattern: 'multi_system',
    })
  )
  assert.equal(alert.level, 'emergency')
  assert.equal(alert.shouldPush, true)
})

test('INSUFFICIENT_DATA → no alert regardless of convergence', () => {
  const alert = generateAlertDecision(
    'INSUFFICIENT_DATA',
    makeConvergence({
      convergenceScore: 5,
      pattern: 'multi_system',
    })
  )
  assert.equal(alert.level, 'none')
  assert.equal(alert.shouldPush, false)
})

test('sepsis_like pattern upgrades to urgent from warning', () => {
  const alert = generateAlertDecision(
    'DRIFTING',
    makeConvergence({
      convergenceScore: 2,
      pattern: 'sepsis_like',
      worseningParams: ['temp', 'hr'],
    })
  )
  assert.equal(alert.level, 'urgent')
  assert.equal(alert.shouldPush, true)
})

// Note: trajectory-alert-service.ts tests are integration-only
// (server-only import). Covered in CI integration test suite.
