import test from 'node:test'
import assert from 'node:assert/strict'
import { calloutPoints, callouts, labelStyle, reticle, reticleCorners } from './callouts.ts'

// Regions of the figure in photo coordinates (0–100): the head and the shoulders/torso, from the
// landmark overlay of the 2026-10-08 portrait (arms crossed, half body).
const inside = ([x, y], [cx, cy, rx, ry]) => ((x - cx) / rx) ** 2 + ((y - cy) / ry) ** 2 <= 1
const HEAD = [48.5, 23.5, 12.5, 21], SHOULDERS = [50, 56, 32, 12], TORSO = [50, 78, 38, 30]

test('three callouts carry Chief\'s exact labels in order', () => {
  assert.deepEqual(callouts.map(c => c.label), ['dr Ferdi Iskandar', 'the Gaffer', 'Sentraone'])
})

test('every callout is anchored on the figure, runs rightward and ends in a horizontal lead clear of the head', () => {
  const regions = [HEAD, SHOULDERS, TORSO]
  callouts.forEach((c, i) => {
    assert.ok(inside(c.anchor, regions[i]), `anchor ${i} off the figure at ${c.anchor}`)
    assert.ok(c.anchor[0] < c.elbow[0] && c.elbow[0] <= c.end[0], `callout ${i} does not run rightward`)
    assert.equal(c.elbow[1], c.end[1], `callout ${i} last segment is not horizontal`)
    assert.ok(c.end[0] >= 62, `callout ${i} ends over the head at x ${c.end[0]}`)
    assert.ok(c.end[0] <= 84, `callout ${i} leaves no room for its label at x ${c.end[0]}`)
  })
  const rows = callouts.map(c => c.end[1])
  for (let i = 1; i < rows.length; i++) assert.ok(rows[i] - rows[i - 1] >= 20, `labels ${i - 1} and ${i} are only ${rows[i] - rows[i - 1]} apart`)
})

test('the SVG points string and the label position follow the geometry', () => {
  const [first] = callouts
  assert.equal(calloutPoints(first), `${first.anchor[0]},${first.anchor[1]} ${first.elbow[0]},${first.elbow[1]} ${first.end[0]},${first.end[1]}`)
  assert.deepEqual(labelStyle(first), { left: `${first.end[0] + 1.5}%`, top: `${first.end[1]}%` })
})

test('the lock-on reticle frames the head with a small margin and short corner arms', () => {
  const [cx, cy, rx, ry] = HEAD
  assert.ok(reticle.left < cx - rx && reticle.right > cx + rx, 'reticle narrower than the head')
  assert.ok(reticle.top < cy - ry && reticle.bottom > cy + ry, 'reticle shorter than the head')
  for (const margin of [cx - rx - reticle.left, reticle.right - (cx + rx), cy - ry - reticle.top, reticle.bottom - (cy + ry)]) assert.ok(margin >= 1 && margin <= 6, `margin ${margin} off`)
  assert.ok(reticle.arm > 0 && reticle.arm <= (reticle.right - reticle.left) / 3, 'arms too long for corners')
  const corners = reticleCorners()
  assert.equal(corners.length, 4)
  assert.equal(corners[0], `M${reticle.left},${reticle.top + reticle.arm} L${reticle.left},${reticle.top} L${reticle.left + reticle.arm},${reticle.top}`)
  assert.equal(corners[2], `M${reticle.right},${reticle.bottom - reticle.arm} L${reticle.right},${reticle.bottom} L${reticle.right - reticle.arm},${reticle.bottom}`)
})
