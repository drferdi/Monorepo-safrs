import test from 'node:test'
import assert from 'node:assert/strict'
import { analyseFace } from './face.ts'
import { makeFace } from './geometry.ts'

const size = 48, radius = 14
const distance = (x, y) => Math.hypot(x - size / 2, y - size / 2)
const close = (actual, expected, label) => assert.ok(Math.abs(actual - expected) < 1e-6, `${label}: ${actual} vs ${expected}`)
function disc(bright = 220) {
  const lum = new Uint8Array(size * size)
  for (let y = 0; y < size; y++) for (let x = 0; x < size; x++) if (distance(x, y) < radius) lum[y * size + x] = bright
  return { width: size, height: size, lum }
}

test('the edge segments ring the disc and nothing is drawn in the black background', () => {
  const face = analyseFace(disc(), { density: 1 })
  assert.ok(face.segments.length >= 6 * 40, `segments: ${face.segments.length / 6}`)
  for (let i = 0; i < face.segments.length; i += 6) {
    for (const [x, y] of [[face.segments[i], face.segments[i + 1]], [face.segments[i + 3], face.segments[i + 4]]]) assert.ok(Math.abs(distance(x, y) - radius) <= 2.5, `segment end at ${x},${y}`)
  }
  assert.ok(face.dots.length > 0)
  // Dots jitter by up to half a pixel, so a disc pixel may land just past the radius; nothing further.
  for (let i = 0; i < face.dots.length; i += 3) assert.ok(distance(face.dots[i], face.dots[i + 1]) < radius + .75, `dot at ${face.dots[i]},${face.dots[i + 1]}`)
})

test('dots fill the bright area in proportion to the density and carry the luminance', () => {
  const full = analyseFace(disc(), { density: 1 }), half = analyseFace(disc(), { density: .5 })
  assert.ok(full.dots.length >= 3 * 60, `dots: ${full.dots.length / 3}`)
  const ratio = half.dots.length / full.dots.length
  assert.ok(ratio > .3 && ratio < .7, `ratio ${ratio}`)
  for (let i = 0; i < full.dots.length; i += 3) {
    const lum = full.dots[i + 2]
    assert.ok(lum > .1 && lum <= 220 / 255 + .01, `luminance ${lum}`)
    // The luminance is blurred, so only dots well inside the disc carry the flat value.
    if (distance(full.dots[i], full.dots[i + 1]) < radius - 3) assert.ok(Math.abs(lum - 220 / 255) < .01, `interior luminance ${lum}`)
  }
})

test('a black image gives an empty face', () => {
  const face = analyseFace(disc(0), { density: 1 })
  assert.equal(face.segments.length, 0)
  assert.equal(face.dots.length, 0)
})

test('the face is three units wide, centred, in relief, and grows from its centre', () => {
  const geometry = makeFace({ width: 100, height: 100, segments: new Float32Array([0, 0, .2, 100, 100, .8]), dots: new Float32Array([50, 45, .45, 100, 100, .95]) })
  assert.equal(geometry.lines.length, 18)
  assert.equal(geometry.points.length, 18)
  const expect = (array, offset, values) => values.forEach((value, i) => close(array[offset + i], value, `index ${offset + i}`))
  expect(geometry.lines, 0, [-1.5, 1.5, (.2 - .45) * .5])
  expect(geometry.lines, 9, [1.5, -1.5, (.8 - .45) * .5])
  expect(geometry.points, 0, [0, .15, 0]); close(geometry.points[7], 0, 'centre birth')
  expect(geometry.points, 9, [1.5, -1.5, .25]); close(geometry.points[15], 1 + .95 * 1.6, 'size'); close(geometry.points[16], 1, 'corner birth')
})
