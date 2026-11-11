import test from 'node:test'
import assert from 'node:assert/strict'
import * as gsapModule from 'gsap'
import { analyseFace } from './face.ts'
import { MORPH, across, createPulseCycle, cutWeight, faceCrop, frontAt, regionWeight, seedNeurons } from './morph.ts'

const gsap = gsapModule.gsap ?? gsapModule.default
const f = MORPH.face, c = MORPH.cut
const sign = c.side === 'right' ? 1 : -1

test('the region is the face ellipse: full at the centre, gone outside it, soft at the rim', () => {
  assert.equal(regionWeight(f.x, f.y), 1)
  assert.equal(regionWeight(f.x + f.rx * .8, f.y), 1, 'inside the soft rim')
  assert.equal(regionWeight(f.x + f.rx * 1.01, f.y), 0, 'outside')
  assert.equal(regionWeight(f.x, f.y - f.ry * 1.2), 0, 'above the head')
  const mid = regionWeight(f.x + f.rx * (f.soft + 1) / 2, f.y)
  assert.ok(mid > 0 && mid < 1, `soft rim ${mid}`)
})

test('the front comes in from the near side as the progress grows and a point is past it only once it has swept by', () => {
  assert.equal(frontAt(0), c.from)
  assert.equal(frontAt(1), c.to)
  assert.ok(frontAt(.5) < c.from && frontAt(.5) > c.to, 'between')
  // A point just inside the near cheek: untouched at 0, dissolved at 1, monotonic between.
  const x = f.x + sign * 40, y = f.y
  assert.equal(cutWeight(x, y, 0), 0)
  assert.equal(cutWeight(x, y, 1), 1)
  let last = 0
  for (let v = 0; v <= 1; v += .05) { const w = cutWeight(x, y, v); assert.ok(w >= last - 1e-12, `monotonic at ${v}`); last = w }
  // The far side of the face is never dissolved.
  assert.equal(cutWeight(f.x - sign * 40, f.y, 1), 0, 'far cheek stays flesh')
  // The lag holds the front back: with it a point is revealed later than without.
  const mid = (0 + 1) / 2, v = [...Array(21).keys()].map(k => k / 20).find(k => cutWeight(x, y, k) >= mid)
  assert.ok(cutWeight(x, y, v, c.lag) < cutWeight(x, y, v), 'lagged reveal is behind the cut')
  // The tilt: the front sits further along x lower down on the face.
  assert.ok(sign * across(f.x, f.y + 100) < sign * across(f.x, f.y - 100) || c.slope === 0, 'tilt follows the slope')
})

test('the crop flattens the glyphs above the hairline and leaves the face alone', () => {
  const width = 640, height = 849, lum = new Uint8Array(width * height).fill(200)
  const crop = faceCrop({ width, height, lum })
  assert.equal(crop.width, MORPH.crop.w); assert.equal(crop.height, MORPH.crop.h)
  const row = y => y - MORPH.crop.y
  assert.equal(crop.lum[row(MORPH.hairline - 1) * crop.width], MORPH.glyph, 'above the hairline capped')
  assert.equal(crop.lum[row(MORPH.hairline) * crop.width], 200, 'the face kept')
})

// A synthetic face: a bright disc on black, the size of the region, so the analysis finds a ring of edges.
function disc() {
  const { w, h } = MORPH.crop, lum = new Uint8Array(w * h)
  const cx = f.x - MORPH.crop.x, cy = f.y - MORPH.crop.y
  for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) if (Math.hypot((x - cx) / (f.rx * .8), (y - cy) / (f.ry * .8)) < 1) lum[y * w + x] = 200 + ((x * 7 + y * 13) % 40)
  return { width: w, height: h, lum }
}

test('the neurons sit on the dissolved side inside the face, link to their nearest and send axons out of the face, the same every build', () => {
  const face = analyseFace(disc(), { density: .6 })
  const origin = { x: MORPH.crop.x, y: MORPH.crop.y }
  const a = seedNeurons(face, origin), b = seedNeurons(face, origin)
  assert.deepEqual(a, b, 'seeded')
  assert.ok(a.somas.length >= 8 && a.somas.length <= MORPH.somas, `somas ${a.somas.length}`)
  for (const [x, y] of a.somas) {
    assert.ok(regionWeight(x, y) > .5, `soma inside the face ${x},${y}`)
    assert.ok(cutWeight(x, y, 1) > .4, `soma on the dissolved side ${x},${y}`)
  }
  for (let i = 0; i < a.somas.length; i++) for (let j = i + 1; j < a.somas.length; j++) assert.ok(Math.hypot(a.somas[i][0] - a.somas[j][0], a.somas[i][1] - a.somas[j][1]) >= MORPH.gap - 1e-9, 'somas keep their gap')
  assert.ok(a.links.length >= a.somas.length, `links ${a.links.length}`)
  for (const [p, q] of a.links) { assert.ok(p !== q && p < a.somas.length && q < a.somas.length) }
  assert.equal(a.axons.length, MORPH.axons * 2, 'a trunk and a branch per axon')
  for (let i = 0; i < a.axons.length; i += 2) {
    const trunk = a.axons[i]
    assert.ok(a.somas.some(([x, y]) => x === trunk[0] && y === trunk[1]), 'a trunk starts on a soma')
    assert.ok(regionWeight(trunk[trunk.length - 2], trunk[trunk.length - 1]) < .5, 'a trunk leaves the face')
  }
})

test('the signal lanes run one after another along a path each, idle between, re-rolled on repeat', () => {
  const paths = 5
  const { lanes, cycle } = createPulseCycle(gsap, () => paths)
  assert.equal(lanes.length, MORPH.lanes)
  cycle.time(1e-6)
  assert.ok(lanes[0].t >= 0 && lanes[0].t < .01, 'the first lane starts at 0')
  assert.equal(lanes[1].t, -1, 'the second lane idle')
  assert.ok(lanes[0].path >= 0 && lanes[0].path < paths, 'a path in range')
  cycle.time(MORPH.laneLength / 2)
  assert.ok(Math.abs(lanes[0].t - .5) < 1e-6, 'half way along')
  cycle.time(MORPH.laneLength + 1e-3)
  assert.equal(lanes[0].t, -1, 'idle after its run')
  assert.ok(lanes[1].t > 0, 'the second lane running')
  assert.ok(cycle.duration() > (MORPH.lanes - 1) * MORPH.laneOffset + MORPH.laneLength, 'a rest before the repeat')
  cycle.kill()
})
