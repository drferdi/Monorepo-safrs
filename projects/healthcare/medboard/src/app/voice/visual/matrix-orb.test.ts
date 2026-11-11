import assert from 'node:assert/strict'
import test from 'node:test'

import { dotLevel, orbGrid } from './matrix-orb'

const grid = orbGrid(13)
const centre = grid.reduce((best, d) => (Math.hypot(d.u, d.v) < Math.hypot(best.u, best.v) ? d : best))
const rim = grid.reduce((best, d) => (Math.hypot(d.u, d.v) > Math.hypot(best.u, best.v) ? d : best))
const brightest = (motion: 'idle' | 'listening' | 'thinking', t: number) =>
  grid.reduce((best, d) => (dotLevel(d, motion, t) > dotLevel(best, motion, t) ? d : best))

test('the dots sit on a square grid cut to a circle', () => {
  assert.ok(grid.length > 100)
  for (const d of grid) assert.ok(Math.hypot(d.u, d.v) <= 1)
  assert.ok(grid.some((d) => d.u === 0 && d.v === 0))
})

test('while listening the orb blooms from its centre', () => {
  for (const t of [0, 0.7, 1.9]) assert.ok(dotLevel(centre, 'listening', t) > dotLevel(rim, 'listening', t) + 0.3)
})

test('while thinking the bright spot travels around the orb', () => {
  const a = brightest('thinking', 0)
  const b = brightest('thinking', 0.6)
  assert.ok(Math.hypot(a.u - b.u, a.v - b.v) > 0.3)
  assert.ok(Math.hypot(a.u, a.v) > 0.15)
})

test('at rest the orb stays quieter than when it listens', () => {
  for (const t of [0, 1.3, 2.6]) assert.ok(dotLevel(centre, 'idle', t) < dotLevel(centre, 'listening', t))
})

test('every dot level stays between 0 and 1', () => {
  for (const motion of ['idle', 'listening', 'thinking'] as const) {
    for (const t of [0, 0.4, 3.3]) {
      for (const d of grid) {
        const level = dotLevel(d, motion, t)
        assert.ok(level >= 0 && level <= 1, `${motion} ${level}`)
      }
    }
  }
})
