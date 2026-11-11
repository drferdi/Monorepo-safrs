import assert from 'node:assert/strict'
import test from 'node:test'
import { MotionCoordinator, motionDestination, selectRouteEffect, curtainPath } from './motion-policy'
import { restoreMotionPreset, motionPresets } from './motion-presets'

test('clinical work and reduced motion keep immediate navigation in both directions', () => {
  for (const route of ['/emr', '/calculator', '/icdx', '/telemedicine/room', '/voice', '/dashboard/intelligence', '/audit/logbook', '/report/clinical', '/admin']) {
    assert.equal(selectRouteEffect('/', route, false), 'none')
    assert.equal(selectRouteEffect(route, '/atlas', false), 'none')
  }
  assert.equal(selectRouteEffect('/', '/atlas', true), 'none')
})

test('invalid stored presets recover to the recommended option and all profiles fit the visual deadline', () => {
  for (const stored of [null, '', 'old-preset', '{bad json}']) assert.equal(restoreMotionPreset(stored), 'cinematic')
  assert.equal(restoreMotionPreset('balanced'), 'balanced')
  for (const tuning of Object.values(motionPresets)) {
    assert.ok(tuning.portalCoverMs + tuning.portalRevealMs < 1200)
    assert.ok(tuning.depthExitMs + tuning.depthEnterMs < 1200)
    assert.ok(tuning.curtainCoverMs + tuning.curtainRevealMs < 1200)
  }
})

test('reference and team navigation select the approved visual treatments', () => {
  assert.equal(selectRouteEffect('/', '/atlas', false), 'portal')
  assert.equal(selectRouteEffect('/atlas', '/sentrapedia', false), 'portal')
  assert.equal(selectRouteEffect('/', '/hub', false), 'curtain')
  assert.equal(selectRouteEffect('/sentrapedia', '/critical-mind', false), 'shared')
  assert.equal(selectRouteEffect('/', '/sentrapedia', false), 'depth')
})

test('only same-origin page navigation is eligible; query and fragment navigation stays router-owned', () => {
  const current = 'https://medboard.test/calculator?tab=one'
  assert.equal(motionDestination('/atlas', current), '/atlas')
  for (const href of ['/atlas?system=bones', '/atlas#bones', 'https://other.test/atlas', '//other.test/atlas', 'javascript:alert(1)', 'mailto:test@example.test', '#section', '?tab=two', '/calculator', 'https://user:pass@medboard.test/atlas']) {
    assert.equal(motionDestination(href, current), null, href)
  }
})

test('a newer navigation aborts the old visual transaction and ignores stale cleanup', async () => {
  const coordinator = new MotionCoordinator()
  const old = coordinator.begin('/', '/atlas')
  old.arm()
  const current = coordinator.begin('/', '/hub')
  assert.equal(old.signal.aborted, true)
  assert.equal(await old.committed, false)
  coordinator.finish(old)
  assert.equal(coordinator.isCurrent(current), true)
  coordinator.notifyCommit('/atlas')
  assert.equal(current.settled, false)
  coordinator.notifyCommit('/hub')
  assert.equal(current.settled, false)
  current.arm()
  coordinator.notifyCommit('/atlas')
  assert.equal(current.settled, false)
  coordinator.notifyCommit('/hub')
  assert.equal(await current.committed, true)
  coordinator.finish(current)
  assert.equal(coordinator.isCurrent(current), false)
})

test('redirects release through the deadline without satisfying a different destination', async () => {
  const coordinator = new MotionCoordinator()
  const redirect = coordinator.begin('/', '/atlas', 10)
  redirect.arm()
  coordinator.notifyCommit('/join')
  assert.equal(redirect.settled, false)
  assert.equal(await redirect.committed, false)
  coordinator.finish(redirect)
  const slow = coordinator.begin('/', '/atlas', 10)
  assert.equal(await slow.committed, false)
  assert.equal(slow.signal.aborted, true)
  coordinator.finish(slow)
})

test('abort callbacks cannot dispatch a superseded or explicitly canceled navigation', () => {
  const coordinator = new MotionCoordinator()
  const first = coordinator.begin('/', '/atlas')
  let dispatches = 0
  first.signal.addEventListener('abort', () => { if (coordinator.isCurrent(first)) dispatches += 1 })
  const second = coordinator.begin('/', '/hub')
  second.signal.addEventListener('abort', () => { if (coordinator.isCurrent(second)) dispatches += 1 })
  coordinator.cancel()
  assert.equal(dispatches, 0)
})

test('curtain geometry is empty at rest, fully covering at its midpoint and clamps invalid progress', () => {
  assert.equal(curtainPath(0), 'M0 0 H100 V0 Q50 0 0 0 Z')
  assert.equal(curtainPath(1), 'M0 0 H100 V120 Q50 100 0 120 Z')
  assert.equal(curtainPath(-1), curtainPath(0))
  assert.equal(curtainPath(2), curtainPath(1))
})
