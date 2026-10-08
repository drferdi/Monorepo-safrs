// The master timeline of the neural journey. One ScrollTrigger (owned by NeuralJourney) scrubs
// it over the pinned stage; `state.phase` runs 0 → 100 inside it and every scene is a nested
// timeline placed at its chapter. This module holds no DOM lookups beyond the panels it is
// handed, so the node:test suite can build the same master on stand-ins and guard its length.
export type Gsap = typeof import('gsap').gsap
export type Chapter = { readonly id: string; readonly phase: number }

// The scroll travel maps onto this many timeline units; `phaseToTime` turns a story phase into
// the master time it is reached at, so positions below are authored in phases, never in time.
export const MASTER_DURATION = 100
// A jump lands this far into a chapter, so the chapter is the active one and its entrance has run.
export const JUMP_OFFSET = 1.5

// Tempo: [phase, time] breakpoints, piecewise linear between them. Identity for now.
export const tempo: ReadonlyArray<readonly [number, number]> = [[0, 0], [100, MASTER_DURATION]]

export function phaseToTime(phase: number): number {
  const p = Math.min(100, Math.max(0, phase))
  for (let i = 1; i < tempo.length; i++) {
    const [p0, t0] = tempo[i - 1], [p1, t1] = tempo[i]
    if (p <= p1) return t0 + (p - p0) / (p1 - p0) * (t1 - t0)
  }
  return MASTER_DURATION
}

// The label a jump to `phase` scrolls to: the chapter that starts there, else the one it is in
// (the same rule as `activeChapter` in story.ts, kept local so node can import this file alone).
export function jumpLabel(chapters: ReadonlyArray<Chapter>, phase: number): string {
  const chapter = chapters.find(item => item.phase === phase) ?? chapters[Math.max(0, chapters.findLastIndex(item => phase >= item.phase))]
  return `${chapter.id}-enter`
}

type Target = object | Element | null | undefined
export type MasterOptions = {
  state: { phase: number }
  panels: ReadonlyArray<Element>
  nav: Target
  overview: Target
  scrim: Target
  photo: Element | null
  // A reveal canvas is painting the photo in: the container only needs a short fade.
  reveal: boolean
  scrollTrigger?: ScrollTrigger.Vars
  onUpdate?: () => void
}

export function buildMaster(gsap: Gsap, chapters: ReadonlyArray<Chapter>, options: MasterOptions): gsap.core.Timeline {
  const { state, panels, nav, overview, scrim, photo } = options
  const at = phaseToTime
  gsap.set(panels, { autoAlpha: 0 })
  gsap.set(panels[0], { autoAlpha: 1 })
  if (nav) gsap.set(nav, { autoAlpha: 0 })
  const master = gsap.timeline({ defaults: { ease: 'power2.inOut' }, scrollTrigger: options.scrollTrigger, onUpdate: options.onUpdate })
  for (let i = 1; i < tempo.length; i++) {
    const [phase, time] = tempo[i], [, previous] = tempo[i - 1]
    master.to(state, { phase, duration: time - previous, ease: 'none' }, previous)
  }
  if (nav) master.to(nav, { autoAlpha: 1, duration: 2 }, at(11))
  if (overview) {
    master.fromTo(overview, { autoAlpha: 0 }, { autoAlpha: 1, duration: 1.5 }, at(91))
    master.to(overview, { autoAlpha: 0, duration: 1 }, at(95))
  }
  // From the network on, the text sits over bright neurons: a scrim darkens the canvas
  // under it (Chief 2026-10-08) and lifts again as the face returns at the end.
  if (scrim) {
    master.fromTo(scrim, { autoAlpha: 0 }, { autoAlpha: 1, duration: 3 }, at(58))
    master.to(scrim, { autoAlpha: 0, duration: 3 }, at(94))
  }
  if (photo) {
    master.fromTo(photo, { autoAlpha: 0 }, { autoAlpha: 1, duration: options.reveal ? .5 : 3 }, at(95.5))
    // The HUD callouts start hidden and draw in from the final chapter's scene below.
    gsap.set(photo.querySelectorAll('[data-callout-line]'), { attr: { 'stroke-dashoffset': 1 } })
    gsap.set(photo.querySelectorAll('[data-callout-dot]'), { attr: { r: 0 } })
    gsap.set(photo.querySelectorAll('[data-callout], [data-callout-glint]'), { autoAlpha: 0 })
  }
  chapters.forEach((chapter, index) => {
    const panel = panels[index]
    // Physical easing (Chief 2026-10-07): entrances decelerate, the marker dot overshoots,
    // exits accelerate; the master stays linear because the scroll position drives it.
    const scene = gsap.timeline({ defaults: { ease: 'power3.out' } })
    const duration = at(chapters[index + 1]?.phase ?? 102) - at(chapter.phase)
    if (index > 0) scene.fromTo(panel, { autoAlpha: 0, y: chapter.id === 'human' ? 0 : 24 }, { autoAlpha: 1, y: 0, duration: 1.2, immediateRender: false }, 0)
    const marker = panel.querySelector('[data-marker-line]')
    if (marker) {
      scene.fromTo(marker, { scaleX: 0 }, { scaleX: 1, duration: .8, ease: 'power2.out', immediateRender: false }, 0)
      scene.fromTo(panel.querySelector('[data-marker-dot]'), { scale: 0 }, { scale: 1, duration: .4, ease: 'back.out(1.7)', immediateRender: false }, .6)
      scene.fromTo(panel.querySelector('[data-marker-copy]'), { autoAlpha: 0, y: 10 }, { autoAlpha: 1, y: 0, duration: .8, immediateRender: false }, .8)
    }
    // HUD callouts on the photograph (Chief 2026-10-08, "motion garis futuristic"): once the
    // photo has resolved (phase 98.2 on) each line draws in along its own length (pathLength
    // 1, so a resize never desyncs the scrubbed tween), its label follows, then its glint
    // keeps moving on its own through CSS.
    if (chapter.id === 'human' && photo) {
      const dots = panel.querySelectorAll('[data-callout-dot]'), labels = panel.querySelectorAll('[data-callout]'), glints = panel.querySelectorAll('[data-callout-glint]')
      panel.querySelectorAll('[data-callout-line]').forEach((line, k) => {
        const start = 2.2 + k * .45
        scene.fromTo(dots[k], { attr: { r: 0 } }, { attr: { r: .55 }, duration: .3, ease: 'back.out(2)', immediateRender: false }, start)
        scene.fromTo(line, { attr: { 'stroke-dashoffset': 1 } }, { attr: { 'stroke-dashoffset': 0 }, duration: .6, ease: 'power2.out', immediateRender: false }, start)
        scene.fromTo(labels[k], { autoAlpha: 0, x: 8 }, { autoAlpha: 1, x: 0, duration: .5, immediateRender: false }, start + .35)
        scene.fromTo(glints[k], { autoAlpha: 0 }, { autoAlpha: 1, duration: .3, immediateRender: false }, start + .6)
      })
    }
    if (index < chapters.length - 1) scene.to(panel, { autoAlpha: 0, y: -10, duration: .8, ease: 'power2.in' }, duration - .8)
    master.addLabel(chapter.id, at(chapter.phase)).addLabel(`${chapter.id}-enter`, at(chapter.phase + JUMP_OFFSET)).add(scene, at(chapter.phase))
  })
  return master
}
