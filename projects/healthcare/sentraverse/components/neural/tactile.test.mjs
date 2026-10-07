import test from 'node:test'
import assert from 'node:assert/strict'
import { magnetPull, normalise, pointerSpeed, tiltFromPointer, velocityGain } from './tactile.ts'

const box = { left: 100, top: 200, width: 200, height: 100 }
const options = { maxTilt: 12, parallax: 8, halo: 18 }
// Products of decimals (12 × 1.35, 40 × .18) land a few ulps off; the claim is the value, not the bits.
const close = (actual, expected) => assert.ok(Math.abs(actual - expected) < 1e-9, `${actual} is not ${expected}`)

test('the centre of the box is flat', () => {
  const tilt = tiltFromPointer({ x: 200, y: 250 }, box, options)
  for (const value of [tilt.rotationX, tilt.rotationY, tilt.parallaxX, tilt.parallaxY, tilt.haloX, tilt.haloY]) assert.equal(Math.abs(value), 0)
  assert.equal(tilt.haloScale, 1)
})

test('the right edge turns the card toward the pointer and slides the image and halo away', () => {
  const tilt = tiltFromPointer({ x: 300, y: 250 }, box, options)
  assert.equal(tilt.rotationY, 12)
  assert.equal(Math.abs(tilt.rotationX), 0)
  assert.equal(tilt.parallaxX, -8)
  assert.equal(tilt.haloX, -18)
  assert.equal(tilt.haloScale, 1.08)
})

test('above the box the card tips back, and the pointer is clamped to the edge', () => {
  const above = tiltFromPointer({ x: 200, y: -500 }, box, options)
  assert.equal(above.rotationX, 12)
  assert.equal(above.parallaxY, 8)
  const farRight = tiltFromPointer({ x: 9000, y: 250 }, box, options)
  assert.equal(farRight.rotationY, 12)
})

test('a fast pointer tilts harder, up to 35 percent', () => {
  assert.equal(pointerSpeed({ x: 0, y: 0 }, { x: 30, y: 40 }, 10), 5)
  assert.equal(pointerSpeed({ x: 0, y: 0 }, { x: 30, y: 40 }, 0), 0)
  assert.equal(velocityGain(0), 1)
  close(velocityGain(1), 1.175)
  close(velocityGain(5), 1.35)
  close(tiltFromPointer({ x: 300, y: 250 }, box, options, 2).rotationY, 16.2)
})

test('a control is pulled toward the pointer by a fraction of the offset', () => {
  const centre = magnetPull({ x: 200, y: 250 }, box, .18)
  assert.equal(Math.abs(centre.x), 0)
  assert.equal(Math.abs(centre.y), 0)
  const pulled = magnetPull({ x: 240, y: 270 }, box, .18)
  close(pulled.x, 7.2)
  close(pulled.y, 3.6)
})

test('a hidden element with no size normalises to its centre', () => {
  assert.deepEqual(normalise({ x: 5, y: 5 }, { left: 5, top: 5, width: 0, height: 0 }), { x: 0, y: 0 })
})
