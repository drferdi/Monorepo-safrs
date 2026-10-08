import test from 'node:test'
import assert from 'node:assert/strict'
import { RECEDE, hubs, makeNetwork, nearestHub, ringSeat } from './geometry.ts'

const distance = (a, b) => Math.hypot(a[0] - b[0], a[1] - b[1], a[2] - b[2])

test('the network carries a constellation target for every vertex, points and lines alike', () => {
  const network = makeNetwork(.35)
  assert.equal(network.pointTargets.length, network.points.length / 9 * 3)
  assert.equal(network.lineTargets.length, network.lines.length / 9 * 3)
})

test('every foreground seat sits on a ring around its hub, and a hub never stacks two neurons on one seat', () => {
  for (let hub = 0; hub < hubs.length; hub++) {
    const seats = Array.from({ length: 30 }, (_, order) => ringSeat(hub, order))
    for (const seat of seats) { const d = distance(seat, hubs[hub]); assert.ok(d >= .59 && d <= 1.17, `hub ${hub} ring ${d}`) }
    for (let i = 0; i < seats.length; i++) for (let j = i + 1; j < seats.length; j++) assert.ok(distance(seats[i], seats[j]) > .02, `hub ${hub} seats ${i} and ${j} overlap`)
  }
  assert.equal(nearestHub(hubs[2]), 2)
})

test('the distant field recedes into the fog, the foreground gathers at the hubs, and the hubs and centre stay put', () => {
  const network = makeNetwork(.35)
  const at = (array, i) => [array[i], array[i + 1], array[i + 2]]
  let receded = 0, gathered = 0, moved = 0
  for (let v = 0; v < network.points.length / 9; v++) {
    const p = at(network.points, v * 9), t = at(network.pointTargets, v * 3)
    if (t[0] === p[0] && t[1] === p[1] && Math.abs(t[2] - (p[2] - RECEDE)) < 1e-4) { receded++; continue }
    if (distance(p, t) < 1e-6) continue
    moved++
    if (Math.min(...hubs.map(hub => distance(t, hub))) < 2.6) gathered++
  }
  assert.ok(receded > 100, 'distant somata recede ' + receded)
  assert.ok(moved > 1000 && gathered / moved > .9, `foreground gathers ${gathered}/${moved}`)
  // The hub-to-centre spokes start exactly on each hub and do not move.
  for (const hub of hubs) {
    let found = false
    for (let v = 0; v < network.lines.length / 9; v++) {
      const p = at(network.lines, v * 9)
      if (distance(p, hub) < 1e-6) { assert.ok(distance(p, at(network.lineTargets, v * 3)) < 1e-6, 'spoke stays'); found = true }
    }
    assert.ok(found, 'spoke found for hub ' + hub)
  }
})
