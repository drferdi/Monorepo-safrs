import assert from 'node:assert/strict'
import test from 'node:test'

import { claimConsultEvent, releaseConsultEvent } from './consult-dedupe'

test('a retried Assist consult with the same event_id gets the first consultId back', () => {
  const now = Date.parse('2026-10-04T08:00:00.000Z')

  assert.equal(claimConsultEvent('evt-retry-1', 'consult-first', now), null)
  assert.equal(claimConsultEvent('evt-retry-1', 'consult-second', now + 5_000), 'consult-first')
})

test('different event_ids are separate consults', () => {
  const now = Date.parse('2026-10-04T08:00:00.000Z')

  assert.equal(claimConsultEvent('evt-a', 'consult-a', now), null)
  assert.equal(claimConsultEvent('evt-b', 'consult-b', now), null)
})

test('an event_id seen more than ten minutes ago starts a new consult', () => {
  const now = Date.parse('2026-10-04T08:00:00.000Z')

  assert.equal(claimConsultEvent('evt-old', 'consult-old', now), null)
  assert.equal(claimConsultEvent('evt-old', 'consult-new', now + 10 * 60 * 1000 + 1), null)
})

test('a consult that failed releases its event_id, so the retry is processed again', () => {
  const now = Date.parse('2026-10-04T08:00:00.000Z')

  assert.equal(claimConsultEvent('evt-failed', 'consult-failed', now), null)
  releaseConsultEvent('evt-failed')

  assert.equal(claimConsultEvent('evt-failed', 'consult-retry', now + 1_000), null)
})
