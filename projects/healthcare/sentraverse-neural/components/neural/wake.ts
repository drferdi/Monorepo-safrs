import { magnetPull } from './tactile'

type Gsap = typeof import('gsap')['gsap']
type Setter = (value: number) => void

export type WakeTargets = {
  magnetic: HTMLElement | null
  buttons: HTMLElement[]
}

const SPRING = { duration: 1.1, ease: 'elastic.out(1, .3)', overwrite: 'auto' as const }
const touch = (event: PointerEvent) => event.pointerType === 'touch'

// Pointer wake (Chief 2026-10-07): the CTA is pulled toward the pointer and grows a little,
// buttons lift on hover, and both spring back when the pointer leaves. The chapter text never
// moves (Chief 2026-10-08). Mouse and pen only: the caller skips phones and reduced motion, and
// a touch on a desktop-sized tablet does nothing here.
export function attachPointerWake(gsap: Gsap, targets: WakeTargets): () => void {
  const magnetic = targets.magnetic
  if (magnetic) gsap.set(magnetic, { force3D: true })

  // A spring with overwrite kills the properties of a quickTo tween, so the trackers are dropped
  // when the spring starts and built again on the next pointer move.
  let pullTo: { x: Setter; y: Setter } | null = null
  const pull = (event: PointerEvent) => {
    if (!magnetic || touch(event)) return
    if (!pullTo) {
      gsap.killTweensOf(magnetic, 'x,y')
      pullTo = { x: gsap.quickTo(magnetic, 'x', { duration: .45, ease: 'power3.out' }), y: gsap.quickTo(magnetic, 'y', { duration: .45, ease: 'power3.out' }) }
    }
    const offset = magnetPull({ x: event.clientX, y: event.clientY }, magnetic.getBoundingClientRect(), .18)
    pullTo.x(offset.x); pullTo.y(offset.y)
  }
  const grow = (event: PointerEvent) => { if (magnetic && !touch(event)) gsap.to(magnetic, { scale: 1.04, duration: .4, ease: 'back.out(2)', overwrite: 'auto' }) }
  const release = (event: PointerEvent) => {
    if (!magnetic || touch(event)) return
    pullTo = null
    gsap.to(magnetic, { x: 0, y: 0, scale: 1, ...SPRING })
  }
  magnetic?.addEventListener('pointermove', pull)
  magnetic?.addEventListener('pointerenter', grow)
  magnetic?.addEventListener('pointerleave', release)

  const lift = (event: PointerEvent) => { if (!touch(event)) gsap.to(event.currentTarget as HTMLElement, { y: -2, duration: .35, ease: 'back.out(2)', overwrite: 'auto' }) }
  const drop = (event: PointerEvent) => { if (!touch(event)) gsap.to(event.currentTarget as HTMLElement, { y: 0, duration: .3, ease: 'power2.out', overwrite: 'auto' }) }
  for (const button of targets.buttons) { button.addEventListener('pointerenter', lift); button.addEventListener('pointerleave', drop) }

  return () => {
    magnetic?.removeEventListener('pointermove', pull)
    magnetic?.removeEventListener('pointerenter', grow)
    magnetic?.removeEventListener('pointerleave', release)
    for (const button of targets.buttons) { button.removeEventListener('pointerenter', lift); button.removeEventListener('pointerleave', drop) }
    // Tweens made inside handlers are outside the matchMedia context: kill them and drop the
    // transforms they wrote, so reading mode and the next rebuild start from clean elements.
    const everything = magnetic ? [magnetic, ...targets.buttons] : targets.buttons
    gsap.killTweensOf(everything, 'x,y,scale')
    gsap.set(everything, { clearProps: 'transform' })
  }
}
