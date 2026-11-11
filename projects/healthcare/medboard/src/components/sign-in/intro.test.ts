import assert from 'node:assert/strict'
import test from 'node:test'

import { shouldPlayIntro } from './intro'

test('the opening plays once per browser session', () => {
  assert.equal(shouldPlayIntro({ reducedMotion: false, seen: false }), true)
  assert.equal(shouldPlayIntro({ reducedMotion: false, seen: true }), false)
})

test('the opening never plays for people who turned motion off', () => {
  assert.equal(shouldPlayIntro({ reducedMotion: true, seen: false }), false)
})

test('the opening plays when session storage cannot be read', () => {
  assert.equal(shouldPlayIntro({ reducedMotion: false, seen: null }), true)
})
