import assert from 'node:assert/strict'
import test from 'node:test'

import { canReceiveTriage, onlineSourceLabel } from './crew-online'

test('EMR triage goes only to users with an open dashboard tab, since it travels over the socket', () => {
  assert.equal(canReceiveTriage({ source: 'web' }), true)
  assert.equal(canReceiveTriage({ source: 'both' }), true)
  assert.equal(canReceiveTriage({ source: 'assist' }), false)
})

test('an online list from a server without the source field still counts as dashboard users', () => {
  assert.equal(canReceiveTriage({}), true)
  assert.equal(onlineSourceLabel(undefined), 'Dashboard')
})

test('the online source reads as the product the user is in', () => {
  assert.equal(onlineSourceLabel('web'), 'Dashboard')
  assert.equal(onlineSourceLabel('assist'), 'Asisten Medis')
  assert.equal(onlineSourceLabel('both'), 'Dashboard + Asisten Medis')
})
