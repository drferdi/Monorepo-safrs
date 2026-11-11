import test from 'node:test'
import assert from 'node:assert/strict'
import { HANDOFF, HUB_BLEND, carrierStyle, handoffAt, hosts, hubBlend } from './handoff.ts'

const colors = ['#a9a4e7', '#9fc8db', '#bac9df', '#a3bdda', '#d5b69a']
const hex = value => [1, 3, 5].map(i => parseInt(value.slice(i, i + 2), 16) / 255)
const close = (actual, expected, tolerance, label = '') => assert.ok(Math.abs(actual - expected) <= tolerance, `${label} ${actual} is not ${expected}`)
const weight = (phase, host) => { const h = handoffAt(phase); return (h.from === host ? 1 - h.blend : 0) + (h.to === host && h.to !== h.from ? h.blend : 0) }

test('the hosts take the carrier in story order, from the origin at 0 to the unified system, each with room for its handoff', () => {
  assert.deepEqual(hosts.map(item => item.host), ['origin', 'progenitor', 'soma', 'mind', 'impulse', 'cleft', 'centre', 'hub', 'unified'])
  assert.equal(hosts[0].from, 0)
  for (let i = 1; i < hosts.length; i++) assert.ok(hosts[i].from - hosts[i - 1].from > HANDOFF, `${hosts[i].host} leaves room`)
})

test('the carrier is handed on, never cut: each host takes it over the HANDOFF phases before its start and a small step in phase is a small step in weight', () => {
  for (const { host, from } of hosts.slice(1)) {
    assert.equal(handoffAt(from - HANDOFF - .01).blend, 0, `${host} not yet approached`)
    const mid = handoffAt(from - HANDOFF / 2)
    assert.equal(mid.to, host); close(mid.blend, .5, 1e-9, `${host} half way`)
    const arrived = handoffAt(from)
    assert.equal(arrived.from, host); assert.equal(arrived.blend, 0, `${host} holds it at its start`)
  }
  for (const { host } of hosts) for (let phase = 0; phase < 100; phase += .01) assert.ok(Math.abs(weight(phase + .01, host) - weight(phase, host)) < .02, `${host} jumps at ${phase}`)
})

test('the network leans from hub to hub without a cut, one division every five phases', () => {
  assert.deepEqual(hubBlend(64), { index: 0, next: 1, blend: 0 })
  assert.equal(hubBlend(73).index, 1)
  close(hubBlend(71 - HUB_BLEND / 2).blend, .5, 1e-9, 'half way to the second hub')
  assert.equal(hubBlend(90).index, 4); assert.equal(hubBlend(90).blend, 0)
  const lean = phase => { const { index, next, blend } = hubBlend(phase); return index + (next - index) * blend }
  for (let phase = 60; phase < 94; phase += .01) assert.ok(Math.abs(lean(phase + .01) - lean(phase)) < .02, `hub jumps at ${phase}`)
})

test('the carrier looks like its host: biology warm, each division its own colour, then gone into the legacy void, never a sudden change', () => {
  for (const [i, phase] of [68.5, 73.5, 78.5, 83.5, 88.5].entries()) {
    const color = carrierStyle(phase, colors).color, expected = hex(colors[i])
    for (let k = 0; k < 3; k++) close(color[k], expected[k], 1e-9, `division ${i + 1} colour`)
  }
  const origin = carrierStyle(0, colors)
  assert.ok(origin.color[0] > origin.color[2], 'the origin is warm')
  assert.equal(origin.alpha, 1)
  assert.equal(carrierStyle(93.9, colors).alpha, 1)
  assert.equal(carrierStyle(95.5, colors).alpha, 0)
  assert.ok(carrierStyle(40, colors).breath < origin.breath, 'the impulse is precise, the origin breathes')
  for (let phase = 0; phase < 100; phase += .01) {
    const a = carrierStyle(phase, colors), b = carrierStyle(phase + .01, colors)
    assert.ok(Math.abs(a.size - b.size) < .2 && Math.abs(a.alpha - b.alpha) < .02 && a.color.every((c, k) => Math.abs(c - b.color[k]) < .02), `style jumps at ${phase}`)
  }
})
