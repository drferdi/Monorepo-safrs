import assert from 'node:assert/strict'
import test from 'node:test'
import { abortable, depthTransition, frames, sharedTransition } from './effects'
import { motionPresets } from './motion-presets'

test('a stalled lazy chunk releases at the deadline and late rejection is handled', async () => {
  const controller = new AbortController()
  let fail!: (reason: Error) => void
  const chunk = new Promise<string>((_, reject) => { fail = reject })
  const pending = abortable(chunk, controller.signal)
  controller.abort()
  assert.equal(await pending, null)
  fail(new Error('Late chunk failure'))
  assert.equal(await abortable(Promise.resolve('ready'), new AbortController().signal), 'ready')
})

test('frame callback failure rejects cleanly and does not schedule another frame', async (context) => {
  let tick: FrameRequestCallback | undefined
  let scheduled = 0
  const originals = ['requestAnimationFrame', 'cancelAnimationFrame'].map((key) => [key, Object.getOwnPropertyDescriptor(globalThis, key)] as const)
  context.after(() => {
    for (const [key, descriptor] of originals) {
      if (descriptor) Object.defineProperty(globalThis, key, descriptor)
      else Reflect.deleteProperty(globalThis, key)
    }
  })
  Object.defineProperty(globalThis, 'requestAnimationFrame', { configurable: true, value: (callback: FrameRequestCallback) => { tick = callback; scheduled += 1; return scheduled } })
  Object.defineProperty(globalThis, 'cancelAnimationFrame', { configurable: true, value: () => undefined })
  const pending = frames(100, () => { throw new Error('Renderer lost') }, new AbortController().signal)
  const rejected = assert.rejects(pending, /Renderer lost/)
  tick?.(performance.now() + 10)
  await rejected
  assert.equal(scheduled, 1)
})

test('shared panel FLIP measures both committed layouts and releases its animation', async () => {
  let committed = false
  let canceled = false
  let captured: Keyframe[] = []
  const element = {
    getBoundingClientRect: () => committed ? { left: 20, top: 30, width: 400, height: 300 } : { left: 10, top: 10, width: 200, height: 300 },
    animate: (keyframes: Keyframe[]) => { captured = keyframes; return { finished: Promise.resolve(), cancel: () => { canceled = true } } },
  } as unknown as HTMLElement
  await sharedTransition(element, async () => { committed = true }, new AbortController().signal)
  assert.equal(captured[0].transform, 'translate(-10px, -20px) scale(0.5, 1)')
  assert.equal(captured[1].transform, 'none')
  assert.equal(canceled, true)
})

test('each depth preset keeps the DOM commit between exit and reveal with its own timing', async () => {
  for (const tuning of Object.values(motionPresets)) {
    const order: string[] = []
    const element = {
      animate: (_keyframes: Keyframe[], options: KeyframeAnimationOptions) => {
        order.push(`animate:${options.duration}`)
        return { finished: Promise.resolve(), cancel: () => undefined }
      },
    } as unknown as HTMLElement
    await depthTransition(element, async () => { order.push('commit') }, new AbortController().signal, tuning)
    assert.deepEqual(order, [`animate:${tuning.depthExitMs}`, 'commit', `animate:${tuning.depthEnterMs}`])
  }
})
