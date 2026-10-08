import test from 'node:test'
import assert from 'node:assert/strict'
import { faceBox, faceLook, facePlacement, magnetPull } from './tactile.ts'

const box = { left: 100, top: 200, width: 200, height: 100 }
const close = (actual, expected, label = '') => assert.ok(Math.abs(actual - expected) < 1e-9, label + ' ' + actual + ' is not ' + expected)

test('a control is pulled toward the pointer by a fraction of the offset', () => {
  const centre = magnetPull({ x: 200, y: 250 }, box, .18)
  close(centre.x, 0); close(centre.y, 0)
  const pulled = magnetPull({ x: 240, y: 270 }, box, .18)
  close(pulled.x, 7.2); close(pulled.y, 3.6)
})

test('the face sees the pointer as a turn across the viewport and a point on its own plane', () => {
  const viewport = { width: 1000, height: 500 }, view = { offset: { x: 1, y: .5 }, depth: 1.85, scale: .5 }
  const centre = faceLook({ x: 500, y: 250 }, viewport, view)
  assert.equal(centre.turn, 0)
  assert.deepEqual(centre.highlight, [-2, -1, 0])
  const edge = faceLook({ x: 1000, y: 250 }, viewport, view)
  assert.equal(edge.turn, 1)
  assert.deepEqual(edge.highlight, [2, -1, 0])
  const beyond = faceLook({ x: 2000, y: -100 }, viewport, view)
  assert.equal(beyond.turn, 1)
  assert.deepEqual(beyond.highlight, [2, 1, 0])
})

test('the face sits right at full size on a wide desktop and stays on screen on a portrait tablet', () => {
  assert.deepEqual(facePlacement({ width: 1280, height: 800 }, false), { offset: { x: 1.9, y: 0 }, depth: 6, scale: 1 })
  const tall = facePlacement({ width: 768, height: 1024 }, false)
  assert.equal(tall.scale, .55)
  const rightEdge = (tall.offset.x + 1.5 * tall.scale) * 1.85 / (tall.depth * 768 / 1024)
  assert.ok(rightEdge <= .92 + 1e-9, 'right edge ' + rightEdge)
  assert.ok(tall.offset.x > 0, 'still to the right of centre')
  // The photo is opaque, so its box must clear the description (8vw padding + 330 px) by a margin (Chief 2026-10-08).
  const photo = faceBox(tall, { width: 768, height: 1024 })
  assert.ok(photo.left >= 768 * .08 + 330 + 24, 'photo left edge ' + photo.left)
})

test('on phones the face fills the band above the text and never reaches it', () => {
  // Bottom of the face in CSS pixels, from the shader projection: y * 1.85 / depth of the viewport half-height.
  const faceBottom = ({ offset, depth, scale }, height) => height / 2 - (offset.y - 1.53 * scale) * (height / 2) * 1.85 / depth
  const phone = facePlacement({ width: 375, height: 812 }, true)
  assert.equal(phone.scale, .55)
  assert.ok(faceBottom(phone, 812) <= 812 - 145 - 259, 'tall phone bottom ' + faceBottom(phone, 812))
  const short = facePlacement({ width: 375, height: 667 }, true)
  assert.ok(short.scale < .55 && short.scale > .4, 'short phone scale ' + short.scale)
  assert.ok(faceBottom(short, 667) <= 667 - 90 - 259, 'short phone bottom ' + faceBottom(short, 667))
})

test('the face box on screen follows the projection of the placement', () => {
  const box = faceBox({ offset: { x: 1.9, y: 0 }, depth: 6, scale: 1 }, { width: 1280, height: 800 })
  const unit = 400 * 1.85 / 6
  close(box.width, 3 * unit, 'width')
  close(box.height, 3 * unit * 246 / 240, 'height')
  close(box.left + box.width / 2, 640 + 1.9 * unit, 'centre x')
  close(box.top + box.height / 2, 400, 'centre y')
  const phone = faceBox({ offset: { x: 0, y: 1 }, depth: 6, scale: .5 }, { width: 375, height: 812 })
  close(phone.left + phone.width / 2, 187.5, 'phone centre x')
  close(phone.top + phone.height / 2, 406 - 406 * 1.85 / 6, 'phone centre y')
})
