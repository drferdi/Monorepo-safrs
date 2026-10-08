import { curtainPath } from './motion-policy'
import { motionPresets, type MotionTuning } from './motion-presets'

export type CommitView = () => Promise<void>

export function abortable<T>(promise: Promise<T>, signal: AbortSignal): Promise<T | null> {
  return new Promise((resolve, reject) => {
    const cancel = () => resolve(null)
    if (signal.aborted) cancel()
    else signal.addEventListener('abort', cancel, { once: true })
    promise.then(resolve, reject).finally(() => signal.removeEventListener('abort', cancel))
  })
}

export function frames(duration: number, update: (progress: number) => void, signal: AbortSignal, curve: MotionTuning['frameCurve'] = 'out'): Promise<void> {
  return new Promise((resolve, reject) => {
    if (signal.aborted) return resolve()
    let frame = 0
    const start = performance.now()
    const finish = () => {
      cancelAnimationFrame(frame)
      signal.removeEventListener('abort', finish)
      resolve()
    }
    const tick = (now: number) => {
      const p = Math.min(1, (now - start) / duration)
      try {
        update(curve === 'smooth' ? p * p * p * (p * (p * 6 - 15) + 10) : 1 - Math.pow(1 - p, 3))
      } catch (error) {
        cancelAnimationFrame(frame)
        signal.removeEventListener('abort', finish)
        reject(error)
        return
      }
      if (p === 1) finish()
      else frame = requestAnimationFrame(tick)
    }
    signal.addEventListener('abort', finish, { once: true })
    frame = requestAnimationFrame(tick)
  })
}

export async function animateElement(element: HTMLElement, keyframes: Keyframe[], duration: number, signal: AbortSignal, easing = motionPresets.cinematic.easing) {
  if (signal.aborted || !element.animate) return
  const animation = element.animate(keyframes, { duration, easing })
  const cancel = () => animation.cancel()
  signal.addEventListener('abort', cancel, { once: true })
  try {
    await animation.finished
  } catch (error) {
    if (!signal.aborted) throw error
  } finally {
    signal.removeEventListener('abort', cancel)
    animation.cancel()
  }
}

export async function depthTransition(host: HTMLElement, commit: CommitView, signal: AbortSignal, tuning: MotionTuning = motionPresets.cinematic) {
  await animateElement(host, [
    { opacity: 1, transform: 'perspective(1400px) translateZ(0) rotateY(0deg)' },
    { opacity: 0, transform: `perspective(1400px) translateZ(-${tuning.depthDistance * .75}px) rotateY(-${tuning.depthRotation * .8}deg)` },
  ], tuning.depthExitMs, signal, tuning.easing)
  await commit()
  await animateElement(host, [
    { opacity: 0, transform: `perspective(1400px) translateZ(-${tuning.depthDistance}px) rotateY(${tuning.depthRotation}deg)` },
    { opacity: 1, transform: 'perspective(1400px) translateZ(0) rotateY(0deg)' },
  ], tuning.depthEnterMs, signal, tuning.easing)
}

export async function curtainTransition(path: SVGPathElement, commit: CommitView, signal: AbortSignal, tuning: MotionTuning = motionPresets.cinematic) {
  await frames(tuning.curtainCoverMs, (p) => path.setAttribute('d', curtainPath(p)), signal, tuning.frameCurve)
  await commit()
  await frames(tuning.curtainRevealMs, (p) => path.setAttribute('d', curtainPath(1 - p)), signal, tuning.frameCurve)
}

export async function sharedTransition(element: HTMLElement, commit: CommitView, signal: AbortSignal, tuning: MotionTuning = motionPresets.cinematic) {
  const before = element.getBoundingClientRect()
  await commit()
  const after = element.getBoundingClientRect()
  if (!after.width || !after.height) return
  await animateElement(element, [
    { transformOrigin: '0 0', transform: `translate(${before.left - after.left}px, ${before.top - after.top}px) scale(${before.width / after.width}, ${before.height / after.height})` },
    { transformOrigin: '0 0', transform: 'none' },
  ], tuning.layoutMs, signal, tuning.easing)
}
