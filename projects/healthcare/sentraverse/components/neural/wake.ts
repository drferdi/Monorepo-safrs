import { magnetPull, tiltFromPointer } from './tactile'

type Gsap = typeof import('gsap')['gsap']
type Setter = (value: number) => void
type Tracker = Record<string, Setter>

export type WakeTargets = {
  root: HTMLElement
  panels: HTMLElement[]
  magnetic: HTMLElement | null
  buttons: HTMLElement[]
  activeIndex: () => number
}

const SPRING = { duration: 1.1, ease: 'elastic.out(1, .3)', overwrite: 'auto' as const }

// Pointer wake (Chief 2026-10-07): the active chapter panel leans toward the pointer, the CTA is
// pulled toward it, buttons lift on hover, and everything springs back when the pointer leaves.
// Desktop only: the caller skips phones, touch and reduced motion.
export function attachPointerWake(gsap: Gsap, targets: WakeTargets): () => void {
  // The content block, not the first child: division chapters start with their marker line.
  const faces = targets.panels.map(panel => panel.querySelector<HTMLElement>('[data-marker-copy]') ?? panel.firstElementChild as HTMLElement)
  const tracked = targets.magnetic ? [...faces, targets.magnetic] : faces
  gsap.set(tracked, { force3D: true })
  const trackers = new Map<HTMLElement, Tracker>()

  // A spring with overwrite kills the properties of a quickTo tween, so each tracker is dropped
  // when its spring starts and built again on the next pointer move.
  const track = (target: HTMLElement, duration: number, values: Record<string, number>) => {
    let tracker = trackers.get(target)
    if (!tracker) {
      gsap.killTweensOf(target, Object.keys(values).join(','))
      tracker = Object.fromEntries(Object.keys(values).map(key => [key, gsap.quickTo(target, key, { duration, ease: 'power3.out' })]))
      trackers.set(target, tracker)
    }
    for (const [key, value] of Object.entries(values)) tracker[key](value)
  }
  const spring = (target: HTMLElement, values: Record<string, number>) => {
    trackers.delete(target)
    gsap.to(target, { ...values, ...SPRING })
  }

  let tilted = -1
  const settleFace = () => { if (tilted >= 0) spring(faces[tilted], { rotationX: 0, rotationY: 0 }); tilted = -1 }
  const move = (event: PointerEvent) => {
    if (event.pointerType === 'touch') return
    const index = targets.activeIndex()
    if (index !== tilted) { settleFace(); tilted = index }
    const face = faces[index]
    if (!face) return
    const tilt = tiltFromPointer({ x: event.clientX, y: event.clientY }, face.getBoundingClientRect(), { maxTilt: 3, parallax: 0, halo: 0 })
    track(face, .45, { rotationX: tilt.rotationX, rotationY: tilt.rotationY })
  }
  targets.root.addEventListener('pointermove', move)
  targets.root.addEventListener('pointerleave', settleFace)

  const magnetic = targets.magnetic
  const pull = (event: PointerEvent) => { if (magnetic) track(magnetic, .45, magnetPull({ x: event.clientX, y: event.clientY }, magnetic.getBoundingClientRect(), .18)) }
  const grow = () => { if (magnetic) gsap.to(magnetic, { scale: 1.04, duration: .4, ease: 'back.out(2)', overwrite: 'auto' }) }
  const release = () => { if (magnetic) spring(magnetic, { x: 0, y: 0, scale: 1 }) }
  magnetic?.addEventListener('pointermove', pull)
  magnetic?.addEventListener('pointerenter', grow)
  magnetic?.addEventListener('pointerleave', release)

  const lift = (event: Event) => gsap.to(event.currentTarget as HTMLElement, { y: -2, duration: .35, ease: 'back.out(2)', overwrite: 'auto' })
  const drop = (event: Event) => gsap.to(event.currentTarget as HTMLElement, { y: 0, duration: .3, ease: 'power2.out', overwrite: 'auto' })
  for (const button of targets.buttons) { button.addEventListener('pointerenter', lift); button.addEventListener('pointerleave', drop) }

  return () => {
    targets.root.removeEventListener('pointermove', move)
    targets.root.removeEventListener('pointerleave', settleFace)
    magnetic?.removeEventListener('pointermove', pull)
    magnetic?.removeEventListener('pointerenter', grow)
    magnetic?.removeEventListener('pointerleave', release)
    for (const button of targets.buttons) { button.removeEventListener('pointerenter', lift); button.removeEventListener('pointerleave', drop) }
    // Tweens made inside handlers are outside the matchMedia context: kill them and drop the
    // transforms they wrote, so reading mode and the next rebuild start from clean elements.
    const everything = [...tracked, ...targets.buttons]
    gsap.killTweensOf(everything, 'x,y,scale,rotationX,rotationY')
    gsap.set(everything, { clearProps: 'transform' })
  }
}
