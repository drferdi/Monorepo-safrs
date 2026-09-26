import assert from 'node:assert/strict'
import test from 'node:test'

import type { AIInsightsSnapshot } from './ai-insights'

import {
  buildSnapshotObservabilityPayload,
  canDispatchObservabilityFingerprint,
  getObservabilityFingerprint,
  markObservabilityDeliveryFailed,
  markObservabilityDeliveryPending,
  markObservabilityDeliverySucceeded,
} from './observability'

const baseSnapshot: AIInsightsSnapshot = {
  encounterId: 'enc-001',
  requestId: 'req-001',
  engineVersion: 'iskandar-v2',
  processedAt: '2026-03-13T10:00:00.000Z',
  latencyMs: 280,
  alerts: [],
  suggestions: [],
  validation: {
    valid: true,
    violations: [],
    warnings: [],
    auditTrail: [],
  },
  isIdle: false,
  isDegraded: true,
  degradedMessage: 'CDSS tidak tersedia saat ini.',
}

test('buildSnapshotObservabilityPayload marks degraded snapshots correctly', () => {
  const payload = buildSnapshotObservabilityPayload(baseSnapshot)

  assert.equal(payload?.interaction, 'degraded')
  assert.equal(payload?.encounterId, 'enc-001')
})

test('buildSnapshotObservabilityPayload marks guardrail-blocked snapshots correctly', () => {
  const payload = buildSnapshotObservabilityPayload({
    ...baseSnapshot,
    validation: {
      ...baseSnapshot.validation,
      violations: [
        {
          code: 'GR-OUTPUT-002',
          message: 'Blocked',
          severity: 'block',
          rule: 'minimum_confidence_threshold',
        },
      ],
    },
  })

  assert.equal(payload?.interaction, 'guardrail_blocked')
  assert.match(getObservabilityFingerprint(payload!), /guardrail_blocked/)
})

test('observability delivery only marks fingerprints as reported after a successful post', () => {
  const fingerprint = 'enc-001:req-001:rendered'
  const initialState = {
    pendingFingerprint: null,
    reportedFingerprint: null,
  }

  assert.equal(canDispatchObservabilityFingerprint(initialState, fingerprint), true)

  const pendingState = markObservabilityDeliveryPending(initialState, fingerprint)
  assert.equal(canDispatchObservabilityFingerprint(pendingState, fingerprint), false)

  const failedState = markObservabilityDeliveryFailed(pendingState, fingerprint)
  assert.equal(failedState.pendingFingerprint, null)
  assert.equal(failedState.reportedFingerprint, null)
  assert.equal(canDispatchObservabilityFingerprint(failedState, fingerprint), true)

  const succeededState = markObservabilityDeliverySucceeded(pendingState, fingerprint)
  assert.equal(succeededState.pendingFingerprint, null)
  assert.equal(succeededState.reportedFingerprint, fingerprint)
  assert.equal(canDispatchObservabilityFingerprint(succeededState, fingerprint), false)
})
