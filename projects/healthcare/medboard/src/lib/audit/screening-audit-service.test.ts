import assert from 'node:assert/strict'
import test from 'node:test'

import { computeImmutableHash } from './screening-immutable-hash'

test('computeImmutableHash — same inputs produce same hash', () => {
  const fields = {
    eventId: '550e8400-e29b-41d4-a716-446655440001',
    deliveryTimestamp: '2026-04-07T08:15:30.000Z',
    patientId: 'pid-token-7f3a91bc',
    doctorId: 'doc-54321',
    screeningStatus: 'positive',
    score: 85,
    assistId: 'assist-RM001-1744015200000',
  }
  const h1 = computeImmutableHash(fields)
  const h2 = computeImmutableHash(fields)
  assert.equal(h1, h2)
  assert.match(h1, /^sha256:[a-f0-9]{64}$/)
})

test('computeImmutableHash — different eventId produces different hash', () => {
  const base = {
    eventId: 'aaa',
    deliveryTimestamp: '2026-04-07T08:15:30.000Z',
    patientId: 'pid-abc',
    doctorId: 'doc-1',
    screeningStatus: 'positive' as const,
    score: 80,
    assistId: 'assist-RM001-111',
  }
  const h1 = computeImmutableHash(base)
  const h2 = computeImmutableHash({ ...base, eventId: 'bbb' })
  assert.notEqual(h1, h2)
})

test('computeImmutableHash — null score is handled gracefully', () => {
  const fields = {
    eventId: 'evt-001',
    deliveryTimestamp: '2026-04-07T08:00:00Z',
    patientId: 'pid-tok',
    doctorId: 'doc-9',
    screeningStatus: 'inconclusive' as const,
    score: null,
    assistId: 'assist-RM002-999',
  }
  assert.doesNotThrow(() => computeImmutableHash(fields))
  assert.match(computeImmutableHash(fields), /^sha256:/)
})
