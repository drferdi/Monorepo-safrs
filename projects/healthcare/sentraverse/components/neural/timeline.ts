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

// The final sequence (Chief 2026-10-08, "Scan → Develop → Lock-on"), authored in story phases.
// `revealStart`/`revealEnd` are the window of `tactile.ts` `portraitState(phase).reveal`; the
// lock offsets count from the `lock` label. These are the taste knobs listed in HANDOFF.md.
export const ending = {
  revealStart: 95.5, revealEnd: 98.5,
  // Scan: a hairline sweeps the photo box top → bottom with the reveal, fading at both ends.
  scanFade: .25,
  // Develop: the grade starts brighter, colder and flatter and reaches the approved low-key
  // finals (DECISIONS 2026-10-08 (grade)) exactly when the reveal completes.
  developFrom: { brightness: 1.02, contrast: .92, saturate: .22 },
  developTo: { brightness: .74, contrast: 1.26, saturate: .55 },
  // Lock-on: the reticle draws in while the last of the shoulders resolves, settles with a
  // wiggle, then the callouts follow, each line, label and glint in turn, and a brief flash ends it.
  lockLead: .2,
  reticleDraw: .35, reticleStagger: .05, settleAt: .35, settle: .45, settleScale: 1.05, wiggles: 3,
  calloutsAt: .25, calloutStep: .27, dotPop: .25, lineDraw: .4, labelAt: .2, label: .45, glintAt: .4, glintFade: .2,
  scramble: { chars: '0123456789ABCDEF', speed: .4, revealDelay: .12 },
  flashAt: 1.4, flashIn: .1, flashOut: .18, flashPeak: .5,
}

// The parts of the ending inside `[data-photo]`, as the scene and `settleEnding` query them.
export const endingParts = {
  strokes: '[data-callout-line], [data-reticle-corner]',
  faded: '[data-callout], [data-callout-glint], [data-callout-line], [data-reticle-corner], [data-scan], [data-flash]',
  all: '[data-callout], [data-callout-glint], [data-callout-line], [data-callout-text], [data-reticle], [data-reticle-corner], [data-scan], [data-flash]',
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
    master.fromTo(photo, { autoAlpha: 0 }, { autoAlpha: 1, duration: options.reveal ? .5 : 3 }, at(ending.revealStart))
    // The scan, the reticle and the HUD callouts start hidden and come in from the final scene.
    gsap.set(photo.querySelectorAll(endingParts.strokes), { attr: { 'stroke-dashoffset': 1 } })
    gsap.set(photo.querySelectorAll('[data-callout-dot]'), { attr: { r: 0 } })
    gsap.set(photo.querySelectorAll(endingParts.faded), { autoAlpha: 0 })
  }
  chapters.forEach((chapter, index) => {
    const panel = panels[index]
    if (chapter.id === 'human' && photo) {
      master.addLabel(chapter.id, at(chapter.phase)).addLabel(`${chapter.id}-enter`, at(chapter.phase + JUMP_OFFSET)).add(humanScene(gsap, panel, photo, at), at(ending.revealStart))
      return
    }
    // Physical easing (Chief 2026-10-07): entrances decelerate, the marker dot overshoots,
    // exits accelerate; the master stays linear because the scroll position drives it.
    const scene = gsap.timeline({ id: `scene-${chapter.id}`, defaults: { ease: 'power3.out' } })
    const duration = at(chapters[index + 1]?.phase ?? 102) - at(chapter.phase)
    if (index > 0) scene.fromTo(panel, { autoAlpha: 0, y: 24 }, { autoAlpha: 1, y: 0, duration: 1.2, immediateRender: false }, 0)
    const marker = panel.querySelector('[data-marker-line]')
    if (marker) {
      scene.fromTo(marker, { scaleX: 0 }, { scaleX: 1, duration: .8, ease: 'power2.out', immediateRender: false }, 0)
      scene.fromTo(panel.querySelector('[data-marker-dot]'), { scale: 0 }, { scale: 1, duration: .4, ease: 'back.out(1.7)', immediateRender: false }, .6)
      scene.fromTo(panel.querySelector('[data-marker-copy]'), { autoAlpha: 0, y: 10 }, { autoAlpha: 1, y: 0, duration: .8, immediateRender: false }, .8)
    }
    if (index < chapters.length - 1) scene.to(panel, { autoAlpha: 0, y: -10, duration: .8, ease: 'power2.in' }, duration - .8)
    master.addLabel(chapter.id, at(chapter.phase)).addLabel(`${chapter.id}-enter`, at(chapter.phase + JUMP_OFFSET)).add(scene, at(chapter.phase))
  })
  return master
}

// The final chapter as one scene that starts with the photo reveal (phase 95.5, half a phase
// before the chapter text) and runs three overlapping labels: `scan` and `develop` share the
// reveal window, `lock` leads the develop end. Every position and duration is a phase span, so
// a tempo change stretches the whole sequence with the reveal.
function humanScene(gsap: Gsap, panel: Element, photo: Element, at: (phase: number) => number): gsap.core.Timeline {
  const { revealStart, revealEnd } = ending
  const pos = (phase: number) => at(phase) - at(revealStart)
  const dur = (phases: number) => at(revealStart + phases) - at(revealStart)
  const lock = (offset: number) => `lock+=${dur(offset)}`
  const scene = gsap.timeline({ id: 'scene-human', defaults: { ease: 'power3.out' } })
  // The chapter text enters at its own phase without the 24 px slide, so the photo stays registered.
  scene.fromTo(panel, { autoAlpha: 0, y: 0 }, { autoAlpha: 1, y: 0, duration: 1.2, immediateRender: false }, pos(96))
  const scan = photo.querySelector('[data-scan]'), flash = photo.querySelector('[data-flash]'), reticle = photo.querySelector('[data-reticle]')
  const corners = photo.querySelectorAll('[data-reticle-corner]')
  const dots = photo.querySelectorAll('[data-callout-dot]'), lines = photo.querySelectorAll('[data-callout-line]'), labels = photo.querySelectorAll('[data-callout]'), texts = photo.querySelectorAll('[data-callout-text]'), glints = photo.querySelectorAll('[data-callout-glint]')
  // Scan: transform only (the line rides the wrapper's own height), in step with the reveal.
  scene.addLabel('scan', 0)
  if (scan) {
    scene.fromTo(scan, { autoAlpha: 0 }, { autoAlpha: 1, duration: dur(ending.scanFade), immediateRender: false }, 'scan')
    scene.fromTo(scan, { yPercent: 0 }, { yPercent: 100, duration: dur(revealEnd - revealStart), ease: 'none', immediateRender: false }, 'scan')
  }
  // Develop: the three custom properties the image and the reveal canvas read their grade from
  // (the one approved exception to the x, y, scale, autoAlpha rule, DECISIONS 2026-10-08 (ending)).
  scene.addLabel('develop', '<')
  const from = ending.developFrom, to = ending.developTo
  scene.fromTo(photo, { '--photo-brightness': from.brightness, '--photo-contrast': from.contrast, '--photo-saturate': from.saturate },
    { '--photo-brightness': to.brightness, '--photo-contrast': to.contrast, '--photo-saturate': to.saturate, duration: dur(revealEnd - revealStart), ease: 'none', immediateRender: false }, 'develop')
  scene.addLabel('lock', `>-${dur(ending.lockLead)}`)
  // The scan fades over the last stretch of its sweep, so nothing lingers below the photo box.
  if (scan) scene.to(scan, { autoAlpha: 0, duration: dur(ending.scanFade), ease: 'power2.in' }, pos(revealEnd - ending.scanFade))
  // Lock-on: the corner brackets draw in around the face, then the reticle settles with a wiggle.
  scene.fromTo(corners, { autoAlpha: 0, attr: { 'stroke-dashoffset': 1 } }, { autoAlpha: 1, attr: { 'stroke-dashoffset': 0 }, duration: dur(ending.reticleDraw), stagger: dur(ending.reticleStagger), ease: 'power2.out', immediateRender: false }, 'lock')
  if (reticle) scene.to(reticle, { scale: ending.settleScale, transformOrigin: '50% 50%', duration: dur(ending.settle), ease: `wiggle(${ending.wiggles})` }, lock(ending.settleAt))
  // The callouts (Chief 2026-10-08, "motion garis futuristic"): the anchor dot pops, the line
  // draws along its own length (pathLength 1, so a resize never desyncs the scrubbed tween),
  // the label slides in while its text decodes into Chief's exact string, then the CSS glint
  // keeps moving on its own. The exact string also sits in the label's aria-label.
  lines.forEach((line, k) => {
    const start = ending.calloutsAt + k * ending.calloutStep
    scene.fromTo(dots[k], { attr: { r: 0 } }, { attr: { r: .55 }, duration: dur(ending.dotPop), ease: 'back.out(2)', immediateRender: false }, lock(start))
    scene.fromTo(line, { autoAlpha: 0, attr: { 'stroke-dashoffset': 1 } }, { autoAlpha: 1, attr: { 'stroke-dashoffset': 0 }, duration: dur(ending.lineDraw), ease: 'power2.out', immediateRender: false }, lock(start))
    scene.fromTo(labels[k], { autoAlpha: 0, x: 8 }, { autoAlpha: 1, x: 0, duration: dur(ending.label), immediateRender: false }, lock(start + ending.labelAt))
    const text = texts[k], exact = labels[k]?.getAttribute('aria-label') ?? text?.textContent ?? ''
    if (text) scene.to(text, { scrambleText: { text: exact, chars: ending.scramble.chars, speed: ending.scramble.speed, revealDelay: dur(ending.scramble.revealDelay) }, duration: dur(ending.label), ease: 'none' }, lock(start + ending.labelAt))
    scene.fromTo(glints[k], { autoAlpha: 0 }, { autoAlpha: 1, duration: dur(ending.glintFade), immediateRender: false }, lock(start + ending.glintAt))
  })
  // One brief, subtle flash closes the sequence.
  if (flash) {
    scene.fromTo(flash, { autoAlpha: 0 }, { autoAlpha: ending.flashPeak, duration: dur(ending.flashIn), ease: 'power2.out', immediateRender: false }, lock(ending.flashAt))
    scene.to(flash, { autoAlpha: 0, duration: dur(ending.flashOut), ease: 'power2.in' }, '>')
  }
  return scene
}

// The complete, still ending for reading mode and the next rebuild, whatever the scene left
// behind: every stroke drawn, every dot popped, every label exact, the scan and the flash off,
// the reticle unscaled and the grade at its CSS finals (the photo's own inline style is cleared
// by the caller).
export function settleEnding(gsap: Gsap, photo: Element) {
  gsap.set(photo.querySelectorAll(endingParts.all), { clearProps: 'all' })
  gsap.set(photo.querySelectorAll(endingParts.strokes), { attr: { 'stroke-dashoffset': 0 } })
  gsap.set(photo.querySelectorAll('[data-callout-dot]'), { attr: { r: .55 } })
  photo.querySelectorAll('[data-callout]').forEach(label => {
    const text = label.querySelector('[data-callout-text]'), exact = label.getAttribute('aria-label')
    if (text && exact) text.textContent = exact
  })
}
