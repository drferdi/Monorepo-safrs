import test from 'node:test'
import assert from 'node:assert/strict'
import * as gsapModule from 'gsap'
import { LANES, createSignalCycle, laneOffset, stageAt } from './signal.ts'

const gsap = gsapModule.gsap ?? gsapModule.default
const close = (actual, expected, tolerance, label = '') => assert.ok(Math.abs(actual - expected) <= tolerance, `${label} ${actual} is not ${expected}`)
const lane = (signal, index) => ({ impulse: signal[index * 4], terminal: signal[index * 4 + 1], release: signal[index * 4 + 2], response: signal[index * 4 + 3] })

test('the cycle has six phase-offset lanes with impulse, terminal, release and response labels and a gap', () => {
  const signal = new Float32Array(LANES * 4)
  const { cycle, dispose } = createSignalCycle(gsap, signal, { reduced: false })
  assert.equal(LANES, 6)
  close(cycle.duration(), laneOffset * 5 + stageAt.end + .8, 1e-6, 'cycle length')
  for (let k = 0; k < LANES; k++) {
    close(cycle.labels[`impulse-${k}`], k * laneOffset, 1e-9); close(cycle.labels[`terminal-${k}`], k * laneOffset + 1.15, 1e-9)
    close(cycle.labels[`release-${k}`], k * laneOffset + 1.15, 1e-9); close(cycle.labels[`response-${(k + 1) % LANES}`], k * laneOffset + 1.24, 1e-9)
  }
  assert.ok(cycle.paused(), 'starts paused'); assert.equal(cycle.repeat(), -1)
  dispose()
})

test('one lane runs the causal chain impulse -> terminal -> release -> response on the next lane', () => {
  const signal = new Float32Array(LANES * 4)
  const { cycle, dispose } = createSignalCycle(gsap, signal, { reduced: false })
  cycle.time(.6)
  let a = lane(signal, 0), b = lane(signal, 1)
  assert.ok(a.impulse > 0 && a.impulse < 1, 'impulse travelling ' + a.impulse); assert.equal(a.terminal, 0); assert.equal(a.release, 0); assert.equal(b.response, 0)
  cycle.time(1.15); a = lane(signal, 0)
  close(a.impulse, 1, 1e-6, 'impulse arrives at the terminal')
  cycle.time(1.225); a = lane(signal, 0)
  close(a.terminal, 1.6, 1e-6, 'terminal flash peaks at x1.6')
  cycle.time(1.34); a = lane(signal, 0); b = lane(signal, 1)
  close(a.release, .5, 1e-6, 'release half way'); assert.ok(b.response > 0, 'the next lane starts to respond ' + b.response)
  cycle.time(1.44); b = lane(signal, 1)
  assert.ok(b.response >= .6 - 1e-6 && b.response <= 1 + 1e-6, 'response peak in .6-1.0: ' + b.response)
  cycle.time(2.19); a = lane(signal, 0); b = lane(signal, 1)
  close(b.response, 0, 1e-6, 'response decayed'); assert.equal(a.impulse, 0, 'the front has left the axon')
  dispose()
})

test('each repeat re-rolls the response peak and the tempo, inside the spec ranges', () => {
  const signal = new Float32Array(LANES * 4)
  const { cycle, dispose } = createSignalCycle(gsap, signal, { reduced: false })
  const peaks = new Set(), scales = new Set()
  // time() stays inside one iteration of a repeating timeline; totalTime() crosses the repeats.
  for (let repeat = 0; repeat < 12; repeat++) {
    cycle.totalTime(repeat * cycle.duration() + 1.44)
    peaks.add(lane(signal, 1).response); scales.add(cycle.timeScale())
    cycle.totalTime((repeat + 1) * cycle.duration() - .01)
  }
  for (const peak of peaks) assert.ok(peak >= .6 - 1e-6 && peak <= 1 + 1e-6, 'peak ' + peak)
  for (const scale of scales) assert.ok(scale >= .8 - 1e-9 && scale <= 1.25 + 1e-9, 'timeScale ' + scale)
  assert.ok(peaks.size > 1, 'peaks vary'); assert.ok(scales.size > 1, 'tempo varies')
  dispose()
})

test('reduced motion freezes the cycle at the first terminal and play/pause follow the phase window', () => {
  const signal = new Float32Array(LANES * 4)
  const frozen = createSignalCycle(gsap, signal, { reduced: true })
  assert.ok(frozen.cycle.paused()); close(frozen.cycle.time(), 1.15, 1e-9, 'parked at terminal-0'); close(lane(signal, 0).impulse, 1, 1e-6)
  frozen.setPhase(70); assert.ok(frozen.cycle.paused(), 'reduced motion never plays')
  frozen.dispose()
  const live = createSignalCycle(gsap, new Float32Array(LANES * 4), { reduced: false })
  live.setPhase(20); assert.ok(live.cycle.paused(), 'before the synapse chapter')
  live.setPhase(70); assert.ok(!live.cycle.paused(), 'inside 49-94')
  live.setPhase(95); assert.ok(live.cycle.paused(), 'after the network fades')
  live.dispose()
})
