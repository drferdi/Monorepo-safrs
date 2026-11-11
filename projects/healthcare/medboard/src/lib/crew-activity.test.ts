import assert from 'node:assert/strict'
import test from 'node:test'

import { activityDayKey, creditForBeat, shouldSendBeat } from './crew-activity'

const T0 = new Date('2026-10-07T05:00:00Z')
const at = (ms: number) => new Date(T0.getTime() + ms)

test('a beat under 50 s after the last one earns nothing', () => {
  assert.equal(creditForBeat(T0, at(49_999)), null)
})

test('one beat earns at most 60 s, however long the gap', () => {
  assert.equal(creditForBeat(T0, at(50_000)), 50)
  assert.equal(creditForBeat(T0, at(60_000)), 60)
  assert.equal(creditForBeat(T0, at(3 * 60 * 60_000)), 60)
})

test('00.30 WIB belongs to the new WIB day', () => {
  assert.equal(activityDayKey(new Date('2026-10-06T17:30:00Z')), '2026-10-07')
})

test('a hidden tab or five idle minutes send no beat', () => {
  const now = T0.getTime()
  assert.equal(shouldSendBeat({ visible: true, lastInputAt: now - 299_000, now }), true)
  assert.equal(shouldSendBeat({ visible: true, lastInputAt: now - 300_001, now }), false)
  assert.equal(shouldSendBeat({ visible: false, lastInputAt: now, now }), false)
})
