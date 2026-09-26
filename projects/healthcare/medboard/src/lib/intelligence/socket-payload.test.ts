import assert from 'node:assert/strict'
import test from 'node:test'

import {
  getIntelligenceEventStatusLabel,
  isIntelligenceEventPayload,
  isIntelligenceEventStatus,
} from './socket-payload'

test('accepts only the documented intelligence event statuses', () => {
  assert.equal(isIntelligenceEventStatus('waiting'), true)
  assert.equal(isIntelligenceEventStatus('in_consultation'), true)
  assert.equal(isIntelligenceEventStatus('unknown_status'), false)
  assert.equal(isIntelligenceEventStatus(42), false)
})

test('accepts only payloads with valid status and timestamp', () => {
  assert.equal(
    isIntelligenceEventPayload({
      encounterId: 'ENC-42',
      status: 'completed',
      timestamp: '2026-03-13T10:00:00.000Z',
      data: { source: 'socket' },
    }),
    true
  )

  assert.equal(
    isIntelligenceEventPayload({
      encounterId: 'ENC-42',
      status: 'invalid',
      timestamp: '2026-03-13T10:00:00.000Z',
      data: { source: 'socket' },
    }),
    false
  )

  assert.equal(
    isIntelligenceEventPayload({
      encounterId: 'ENC-42',
      status: 'waiting',
      timestamp: 'not-a-date',
      data: { source: 'socket' },
    }),
    false
  )
})

test('maps status labels for UI copy', () => {
  assert.equal(getIntelligenceEventStatusLabel('cdss_pending'), 'CDSS Pending')
  assert.equal(
    getIntelligenceEventStatusLabel('documentation_incomplete'),
    'Documentation Incomplete'
  )
})
