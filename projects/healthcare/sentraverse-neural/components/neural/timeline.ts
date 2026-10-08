// The master timeline of the neural journey. One ScrollTrigger (owned by NeuralJourney) scrubs
// it over the pinned stage; `state.phase` runs 0 → 100 inside it and every scene is a nested
// timeline placed at its chapter. This module holds no DOM lookups beyond the panels it is
// handed, so the node:test suite can build the same master on stand-ins and guard its length.

export type Gsap = typeof import('gsap').gsap
export type Chapter = { readonly id: string; readonly phase: number }

// The scroll travel maps onto this many timeline units; `phaseToTime` turns a story phase into
// the master time it is reached at, so positions below are authored in phases, never in time.
// The story's hundred phases take 131.5 units: the first 94 the 91.5 they always had (one unit is
// .09 viewport of scroll on desktop, .08 on phones), the final chapter the remaining 40, so the
// legacy pullback has 3.6 viewports of travel without changing any earlier chapter's tempo.
export const MASTER_DURATION = 131.5
// A jump lands this far into a chapter, so the chapter is the active one and its entrance has run.
export const JUMP_OFFSET = 1.5

// Tempo: [phase, time] breakpoints, piecewise linear between them. The key moments take more of
// the travel for the same phases (the chapter 03 face 25–40 at 1.23×, the network 58–66 at 1.25×,
// the legacy 94–100 at 6.67×) and the stretches between give it back. The final chapter is one
// straight stretch, so every beat of the legacy keeps the same tempo.
export const tempo: ReadonlyArray<readonly [number, number]> = [[0, 0], [8, 7], [19, 17], [25, 22.5], [40, 41], [58, 57], [66, 67], [91, 89], [94, 91.5], [100, MASTER_DURATION]]

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

// THE LEGACY (Chief 2026-10-09, "habis phase Sentra masuk ke nuansa video, transisi blending,
// video besar"), authored in story phases over the final chapter 94 → 100, three beats: the
// dissolve (the opening line over the last of the neural field, then the void closes over the
// field while the film fades in through it, one blending into the other with no black between),
// the film (it follows the master's clock while the page scrolls, then holds its last frame) and
// the legacy (the typography, one line after another, settled before the pin releases). These
// are the taste knobs listed in HANDOFF.md.
export const legacy = {
  chapter: 94,
  presence: { at: 94.5, in: .6, out: 96.2, outOver: .4 },
  // The void closes over the canvases; from `covered` nothing underneath needs drawing.
  void: { at: 94.6, in: 1.4 },
  covered: 96,
  // The film (`film.ts`, 120 frames of Chief's 10.2 s clip): it fades in to `alpha` while the
  // void is still closing, its clock runs without easing from 0 to `length` (the clip time in
  // seconds) between `play` and `end`, so the frame on screen is the scroll position's, and the
  // last frame holds to the end of the story.
  film: { at: 95, in: 1.2, alpha: .85, play: 95.8, end: 99, length: 10.1 },
  // The morph (`morph.ts`): once the film holds its last frame, part of the face becomes neural
  // tissue; its progress runs without easing from 0 at `at` to 1 over `in`, held to the end.
  morph: { at: 99.05, in: .85 },
  title: 99, tagline: 99.22, signature: 99.38, brand: 99.52, cta: 99.65, textIn: .3,
}

// The parts of the legacy, as the scene and `settleLegacy` query them: inside `[data-legacy]`
// (the scene) and inside the chapter panel (the text).
export const legacyParts = {
  // What the scene tweens inside `[data-legacy]` besides the film: the veil over the canvases.
  scene: '[data-legacy-void], [data-legacy-vignette]',
  film: '[data-film]',
  // The text beats inside the panel, in their order.
  text: '[data-legacy-presence], [data-legacy-tagline], [data-legacy-signature], [data-legacy-brand], [data-magnetic]',
}

type Target = object | Element | null | undefined
// A chapter title split by SplitText (lines behind masks; characters too on the centered titles).
export type Title = { lines: ArrayLike<Element>; chars: ArrayLike<Element>; centered: boolean }
export type MasterOptions = {
  state: { phase: number }
  panels: ReadonlyArray<Element>
  nav: Target
  overview: Target
  scrim: Target
  // The legacy scene root (`[data-legacy]`), null where the final chapter has none.
  legacy: Element | null
  // Draws the film's frame for a clip time in seconds (`film.ts`); absent, the film is still.
  film?: (time: number) => void
  // Draws the face's transformation for a progress 0 → 1 (`morph.ts`); absent, the face stays flesh.
  morph?: (value: number) => void
  // One entry per chapter, null where the title is not split (the h1 of the first chapter).
  titles?: ReadonlyArray<Title | null | undefined>
  scrollTrigger?: ScrollTrigger.Vars
  onUpdate?: () => void
}

// The title comes in with its chapter: lines rise from behind their masks one after another;
// the centered titles (chapters 07, 14 and the legacy) fade their characters in from the middle
// outward. Start states are set up front, like the panels, so nothing shows before its scene.
function prepareTitle(gsap: Gsap, title: Title) {
  if (title.centered) gsap.set(title.chars, { autoAlpha: 0, yPercent: 40 })
  else gsap.set(title.lines, { yPercent: 110 })
}
function revealTitle(scene: gsap.core.Timeline, title: Title, position: number | string) {
  if (title.centered) scene.fromTo(title.chars, { autoAlpha: 0, yPercent: 40 }, { autoAlpha: 1, yPercent: 0, duration: .9, stagger: { amount: .6, from: 'center' }, immediateRender: false }, position)
  else scene.fromTo(title.lines, { yPercent: 110 }, { yPercent: 0, duration: 1, stagger: .12, immediateRender: false }, position)
}

export function buildMaster(gsap: Gsap, chapters: ReadonlyArray<Chapter>, options: MasterOptions): gsap.core.Timeline {
  const { state, panels, nav, overview, scrim, legacy: scene } = options
  const at = phaseToTime
  gsap.set(panels, { autoAlpha: 0 })
  gsap.set(panels[0], { autoAlpha: 1 })
  if (nav) gsap.set(nav, { autoAlpha: 0 })
  options.titles?.forEach(title => { if (title) prepareTitle(gsap, title) })
  const master = gsap.timeline({ defaults: { ease: 'power2.inOut' }, scrollTrigger: options.scrollTrigger, onUpdate: options.onUpdate })
  for (let i = 1; i < tempo.length; i++) {
    const [phase, time] = tempo[i], [, previous] = tempo[i - 1]
    master.to(state, { phase, duration: time - previous, ease: 'none' }, previous)
  }
  if (nav) master.to(nav, { autoAlpha: 1, duration: 2 }, at(11))
  if (overview) {
    master.fromTo(overview, { autoAlpha: 0 }, { autoAlpha: 1, duration: 1.5 }, at(91))
    master.to(overview, { autoAlpha: 0, duration: 1 }, at(93.2))
  }
  // From the network on, the text sits over bright neurons: a scrim darkens the canvas
  // under it (Chief 2026-10-08) and lifts again as the face returns before the legacy.
  if (scrim) {
    master.fromTo(scrim, { autoAlpha: 0 }, { autoAlpha: 1, duration: 3 }, at(58))
    master.to(scrim, { autoAlpha: 0, duration: 2 }, at(93))
  }
  if (scene) {
    // The scene starts with the void open (the neural field still showing through) and the film
    // dark; the text beats are hidden with it.
    gsap.set(scene.querySelectorAll(`${legacyParts.scene}, ${legacyParts.film}`), { autoAlpha: 0 })
  }
  chapters.forEach((chapter, index) => {
    const panel = panels[index], title = options.titles?.[index] ?? null
    if (chapter.id === 'human' && scene) {
      gsap.set(panel.querySelectorAll(legacyParts.text), { autoAlpha: 0 })
      master.addLabel(chapter.id, at(chapter.phase)).addLabel(`${chapter.id}-enter`, at(chapter.phase + JUMP_OFFSET)).add(legacyScene(gsap, panel, scene, title, at, options.film, options.morph), at(chapter.phase))
      return
    }
    // Physical easing (Chief 2026-10-07): entrances decelerate, the marker dot overshoots,
    // exits accelerate; the master stays linear because the scroll position drives it.
    const entry = gsap.timeline({ id: `scene-${chapter.id}`, defaults: { ease: 'power3.out' } })
    const duration = at(chapters[index + 1]?.phase ?? 102) - at(chapter.phase)
    if (index > 0) entry.fromTo(panel, { autoAlpha: 0, y: 24 }, { autoAlpha: 1, y: 0, duration: 1.2, immediateRender: false }, 0)
    if (title) revealTitle(entry, title, 0)
    const marker = panel.querySelector('[data-marker-line]')
    if (marker) {
      entry.fromTo(marker, { scaleX: 0 }, { scaleX: 1, duration: .8, ease: 'power2.out', immediateRender: false }, 0)
      entry.fromTo(panel.querySelector('[data-marker-dot]'), { scale: 0 }, { scale: 1, duration: .4, ease: 'back.out(1.7)', immediateRender: false }, .6)
      entry.fromTo(panel.querySelector('[data-marker-copy]'), { autoAlpha: 0, y: 10 }, { autoAlpha: 1, y: 0, duration: .8, immediateRender: false }, .8)
    }
    if (index < chapters.length - 1) entry.to(panel, { autoAlpha: 0, y: -10, duration: .8, ease: 'power2.in' }, duration - .8)
    master.addLabel(chapter.id, at(chapter.phase)).addLabel(`${chapter.id}-enter`, at(chapter.phase + JUMP_OFFSET)).add(entry, at(chapter.phase))
  })
  return master
}

// The final chapter as one scene from phase 94. Every position and duration is a phase span, so
// a tempo change stretches the whole sequence. Only autoAlpha and y are animated; the film's
// clock is a plain object whose tween hands each clip time to `film`, which draws the frame, and
// the morph's progress likewise to `morph`.
function legacyScene(gsap: Gsap, panel: Element, scene: Element, title: Title | null, at: (phase: number) => number, film?: (time: number) => void, morph?: (value: number) => void): gsap.core.Timeline {
  const k = legacy
  const pos = (phase: number) => at(phase) - at(k.chapter)
  const dur = (phases: number) => at(k.chapter + phases) - at(k.chapter)
  const tl = gsap.timeline({ id: 'scene-human', defaults: { ease: 'power3.out' } })
  // The chapter panel carries the scene and the text; it is simply on from the chapter start.
  tl.fromTo(panel, { autoAlpha: 0, y: 0 }, { autoAlpha: 1, y: 0, duration: dur(.2), immediateRender: false }, 0)

  // Beat 01 — the dissolve: the opening line over the last of the neural field, then the void
  // closes over the field while the film fades in through it, one blending into the other.
  tl.addLabel('dissolve', 0)
  const presence = panel.querySelector('[data-legacy-presence]')
  if (presence) {
    tl.fromTo(presence, { autoAlpha: 0, y: 10 }, { autoAlpha: 1, y: 0, duration: dur(k.presence.in), immediateRender: false }, pos(k.presence.at))
    tl.to(presence, { autoAlpha: 0, y: -6, duration: dur(k.presence.outOver), ease: 'power2.in' }, pos(k.presence.out))
  }
  const veil = Array.from(scene.querySelectorAll(legacyParts.scene))
  if (veil.length) tl.fromTo(veil, { autoAlpha: 0 }, { autoAlpha: 1, duration: dur(k.void.in), ease: 'sine.inOut', immediateRender: false }, pos(k.void.at))
  const box = scene.querySelector(legacyParts.film)
  if (box) tl.fromTo(box, { autoAlpha: 0 }, { autoAlpha: k.film.alpha, duration: dur(k.film.in), ease: 'sine.inOut', immediateRender: false }, pos(k.film.at))

  // Beat 02 — the film: its clock is the scroll's, so the frame on screen is the scroll position's.
  tl.addLabel('film', pos(k.film.play))
  if (film) {
    const clock = { time: 0 }
    tl.fromTo(clock, { time: 0 }, { time: k.film.length, duration: dur(k.film.end - k.film.play), ease: 'none', immediateRender: false, onUpdate: () => film(clock.time) }, 'film')
  }

  // Beat 03 — the morph: the film holds its last frame and part of the face becomes neural tissue.
  tl.addLabel('morph', pos(k.morph.at))
  if (morph) {
    const cut = { value: 0 }
    tl.fromTo(cut, { value: 0 }, { value: 1, duration: dur(k.morph.in), ease: 'none', immediateRender: false, onUpdate: () => morph(cut.value) }, 'morph')
  }

  // Beat 04 — the legacy: the title, the line, the signature, the brand, the way on.
  tl.addLabel('legacy', pos(k.title))
  if (title) revealTitle(tl, title, 'legacy')
  const beats: Array<[string, number]> = [['[data-legacy-tagline]', k.tagline], ['[data-legacy-signature]', k.signature], ['[data-legacy-brand]', k.brand], ['[data-magnetic]', k.cta]]
  for (const [selector, phase] of beats) {
    const part = panel.querySelector(selector)
    if (part) tl.fromTo(part, { autoAlpha: 0, y: 14 }, { autoAlpha: 1, y: 0, duration: dur(k.textIn), immediateRender: false }, pos(phase))
  }
  return tl
}

// The still legacy for reading mode and the next rebuild, whatever the scene left behind: the
// veil and the film box at their stylesheet state, the text in place. Only what the scene tweened
// is cleared.
export function settleLegacy(gsap: Gsap, scene: Element, panel: Element) {
  gsap.set(scene.querySelectorAll(`${legacyParts.scene}, ${legacyParts.film}`), { clearProps: 'opacity,visibility' })
  gsap.set(panel.querySelectorAll(legacyParts.text), { clearProps: 'opacity,visibility,transform' })
}
