import assert from 'node:assert/strict'
import test from 'node:test'

import { normalizeTrajectoryApiResponse } from './useTrajectoryAnalysis'

import { mockImprovingTrajectory } from '@/types/abyss/clinical-trajectory'

test('normalizeTrajectoryApiResponse preserves additive clinicalTrajectory', () => {
  const analysis = { summary: 'stable', visitCount: 3 } as never
  const visitHistory = [{ visitDate: '2026-05-30T00:00:00.000Z', sbp: 120 }] as never
  const momentumHistory = [{ visitDate: '2026-05-30T00:00:00.000Z', score: 0.4 }] as never

  const normalized = normalizeTrajectoryApiResponse({
    success: true,
    data: analysis,
    visit_history: visitHistory,
    momentum_history: momentumHistory,
    clinicalTrajectory: mockImprovingTrajectory,
    meta: {
      patientIdentifier: 'aaaaaaaa...',
      visitCount: 3,
      analyzedAt: '2026-05-30T00:00:00.000Z',
    },
  })

  assert.equal(normalized.data, analysis)
  assert.equal(normalized.visitHistory, visitHistory)
  assert.equal(normalized.momentumHistory, momentumHistory)
  assert.equal(normalized.clinicalTrajectory, mockImprovingTrajectory)
})

test('normalizeTrajectoryApiResponse keeps backward compatibility when clinicalTrajectory is absent', () => {
  const analysis = { summary: 'legacy only', visitCount: 3 } as never

  const normalized = normalizeTrajectoryApiResponse({
    success: true,
    data: analysis,
  })

  assert.equal(normalized.data, analysis)
  assert.deepEqual(normalized.visitHistory, [])
  assert.deepEqual(normalized.momentumHistory, [])
  assert.equal(normalized.clinicalTrajectory, null)
})

test('normalizeTrajectoryApiResponse keeps backward compatibility when clinicalTrajectory is null', () => {
  const analysis = { summary: 'null ct', visitCount: 2 } as never

  const normalized = normalizeTrajectoryApiResponse({
    success: true,
    data: analysis,
    clinicalTrajectory: null,
  })

  assert.equal(normalized.data, analysis)
  assert.deepEqual(normalized.visitHistory, [])
  assert.deepEqual(normalized.momentumHistory, [])
  assert.equal(normalized.clinicalTrajectory, null)
})

test('normalizeTrajectoryApiResponse throws clean error for failed response', () => {
  assert.throws(
    () =>
      normalizeTrajectoryApiResponse({
        success: false,
        error: 'Trajectory route unavailable',
      }),
    /Trajectory route unavailable/
  )
})
