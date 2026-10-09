'use client'

import Image from 'next/image'
import { Fragment, useEffect, useRef, useState } from 'react'
import { analyseFace, loadPixels } from './face'
import type { FaceAnalysis } from './face'
import LegacyScene from './LegacyScene'
import type { Carrier, Look } from './renderer'
import { faceLook } from './tactile'
import { FILM, createFilm, filmFrameUrl } from './film'
import { createMorph, faceCrop } from './morph'
import { MASTER_DURATION, buildMaster, jumpLabel, legacy, phaseToTime, revealHero, settleLegacy, stillCamera } from './timeline'
import { attachPointerWake } from './wake'
import { activeChapter, chapters, divisions, legacyCopy, phaseOf, sentra, squad } from './story'
import styles from './journey.module.css'

// The sparks the SentraSquad's burst throws out (`timeline.ts` sends each on its own line).
const SPARKS = 28

export default function NeuralJourney() {
  const rootRef = useRef<HTMLElement>(null)
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const fallbackRef = useRef<HTMLCanvasElement>(null)
  const navigateRef = useRef<(phase: number) => void>(() => undefined)
  const audioRef = useRef<AudioContext | null>(null)
  const heroShownRef = useRef(false)
  const [reading, setReading] = useState(false)
  const [sound, setSound] = useState(false)
  const [audioError, setAudioError] = useState(false)

  useEffect(() => {
    const root = rootRef.current, canvas = canvasRef.current, fallback = fallbackRef.current
    if (!root || !canvas || !fallback) return
    let cancelled = false
    let cleanup = () => undefined as void
    root.dataset.loading = 'true'

    async function initialize() {
      // Every plugin ships inside the gsap package (3.13+): the title splits load with
      // ScrollTrigger and register in the same place. The fonts are awaited too, so the titles
      // split once on their real metrics.
      const [{ gsap }, { ScrollTrigger }, { SplitText }, { NeuralRenderer }, { LANES, createSignalCycle }] = await Promise.all([
        import('gsap'), import('gsap/ScrollTrigger'), import('gsap/SplitText'), import('./renderer'), import('./signal'), document.fonts.ready,
      ])
      if (cancelled || !root || !canvas || !fallback) return
      gsap.registerPlugin(ScrollTrigger, SplitText)
      const media = gsap.matchMedia()
      media.add({ desktop: '(min-width: 768px)', mobile: '(max-width: 767px)', reduced: '(prefers-reduced-motion: reduce)' }, context => {
        const reduced = !!context.conditions?.reduced || reading
        const mobile = !!context.conditions?.mobile
        const stage = root.querySelector<HTMLElement>('[data-stage]')!
        const panels = Array.from(root.querySelectorAll<HTMLElement>('[data-chapter]'))
        const phaseLabel = root.querySelector<HTMLElement>('[data-phase-label]')!
        const phaseNumber = root.querySelector<HTMLElement>('[data-phase-number]')!
        const progressLine = root.querySelector<HTMLElement>('[data-progress-line]')!
        const nav = root.querySelector<HTMLElement>('[data-nav]')!
        root.dataset.enhanced = reduced ? 'reading' : 'cinematic'
        const engine = new NeuralRenderer(canvas, fallback, mobile, () => { root.dataset.renderer = 'canvas' })
        root.dataset.renderer = engine.mode
        root.dataset.loading = 'false'
        const state = { phase: 0 }
        const camera = stillCamera()
        // The founder's face (Chief 2026-10-08) is drawn by the renderer from the portrait's
        // pixels; `look` is what the pointer does to it. Without pixels the text ends the story.
        const look: Look = { turn: 0, highlight: [0, 0, 0], hover: 0, node: 0 }
        // The network activity cycle (spec 2026-10-08): one GSAP timeline writes six lanes of
        // (impulse, terminal, release, response) that the renderer uploads every frame; it plays
        // only through the synapse and network chapters and stays parked under reduced motion.
        const signal = new Float32Array(LANES * 4)
        const activity = createSignalCycle(gsap, signal, { reduced })
        let live = true
        loadPixels('/neural-face.webp').then(pixels => {
          if (!live) return
          if (!pixels) { root.dataset.face = 'unavailable'; return }
          engine.setFace(pixels)
          root.dataset.face = 'ready'
          if (reduced) engine.render(state.phase, 0, true, -1, undefined, signal)
        })
        const scene = root.querySelector<HTMLElement>('[data-legacy]')
        const filmCanvas = scene?.querySelector<HTMLCanvasElement>('canvas[data-film-canvas]') ?? null
        const film = filmCanvas && !reduced ? createFilm(filmCanvas) : null
        const morphCanvas = scene?.querySelector<HTMLCanvasElement>('canvas[data-film-morph]') ?? null
        // The face's transformation reads the film's last frame (`face.ts` on its face crop), once
        // the preload below hands it over.
        let morphFace: (face: Promise<FaceAnalysis | null>) => void = () => undefined
        const morph = morphCanvas && !reduced ? createMorph(gsap, morphCanvas, { frame: FILM, face: new Promise(resolve => { morphFace = resolve }) }) : null
        // The film is paid for only on the way to it (Chief 2026-10-09): its frames and the morph's
        // analysis start when the story reaches the network, about five viewports before the film.
        let preloaded = false
        const preload = () => {
          if (preloaded || (!film && !morph)) return
          preloaded = true
          film?.load()
          morphFace(loadPixels(filmFrameUrl(FILM.frames - 1)).then(pixels => pixels && analyseFace(faceCrop(pixels), { density: mobile ? .25 : .4 })))
        }
        const preloadAt = phaseOf('network')
        let hover = -1, lastChapter = -1, lastFrame = 0, visible = true
        // A new chapter forgets the pointed division until the pointer moves again (set with the cursor below).
        let unpoint = () => {}
        const progressSetter = gsap.quickSetter(progressLine, 'scaleX')
        // The neural trace (brief 2026-10-09 §6): a signal head rides the line at the scroll progress
        // and the chapter's tick lights; ticks sit at each chapter's place in the scroll travel.
        const head = root.querySelector<HTMLElement>('[data-progress-head]')!
        const headSetter = gsap.quickSetter(head, 'xPercent')
        const ticks = Array.from(root.querySelectorAll<HTMLElement>('[data-progress-tick]'))
        // The carrier (brief 2026-10-09 §2) follows the renderer's projection every frame.
        const carrierElement = root.querySelector<HTMLElement>('[data-carrier]')!
        const carrierX = gsap.quickSetter(carrierElement, 'x', 'px'), carrierY = gsap.quickSetter(carrierElement, 'y', 'px')
        // `scale` is only an alias (scaleX and scaleY) that quickSetter cannot write, so each axis gets its own.
        const carrierScaleX = gsap.quickSetter(carrierElement, 'scaleX'), carrierScaleY = gsap.quickSetter(carrierElement, 'scaleY'), carrierAlpha = gsap.quickSetter(carrierElement, 'opacity')
        let carrierColor = ''
        const carry = (carrier: Carrier | null) => {
          if (!carrier) return
          carrierX(carrier.x); carrierY(carrier.y); carrierScaleX(carrier.size / 16); carrierScaleY(carrier.size / 16); carrierAlpha(carrier.alpha)
          const color = carrier.color.map(channel => Math.round(channel * 255)).join(' ')
          if (color !== carrierColor) { carrierElement.style.setProperty('--carrier', color); carrierColor = color }
        }
        const update = () => {
          const index = activeChapter(state.phase)
          root.dataset.phase = state.phase.toFixed(2)
          // The line follows the scroll travel (the master's progress), not the phase, which
          // dwells on the legacy over the last third of the travel; reading mode maps the phase
          // through the same tempo.
          const progress = master ? master.progress() : phaseToTime(state.phase) / MASTER_DURATION
          progressSetter(progress); headSetter((progress - 1) * 100)
          activity.setPhase(state.phase)
          if (state.phase >= preloadAt) preload()
          root.dataset.signal = activity.cycle.paused() ? 'paused' : 'active'
          if (lastChapter === index) return
          lastChapter = index
          unpoint()
          phaseLabel.textContent = chapters[index].label
          phaseNumber.textContent = `${String(index + 1).padStart(2, '0')} / ${chapters.length}`
          // A chapter off screen is out of reach too (inert), not only out of the accessibility tree.
          panels.forEach((panel, i) => { if (!reduced) { panel.setAttribute('aria-hidden', String(i !== index)); panel.toggleAttribute('inert', i !== index) } })
          root.querySelectorAll<HTMLButtonElement>('[data-jump]').forEach(button => {
            button.setAttribute('aria-current', Number(button.dataset.jump) === chapters[index].phase ? 'step' : 'false')
          })
          ticks.forEach((tick, i) => { tick.dataset.active = String(i === index) })
        }
        const draw = (time = 0) => {
          if (!visible || document.hidden) return
          if (mobile && time - lastFrame < 1 / 30) return
          lastFrame = time
          // The legacy's void covers the canvases from `legacy.covered`; nothing under it is drawn.
          // Past it the only living layer is the face's transformation.
          if (state.phase < legacy.covered) carry(engine.render(state.phase, reduced ? 0 : time, reduced, hover, look, signal, camera))
          else { carrierAlpha(0); morph?.tick(time) }
        }
        const resize = () => { engine.resize(); carry(engine.render(state.phase, 0, reduced, hover, look, signal, camera)) }
        const observer = new ResizeObserver(resize)
        observer.observe(stage)
        const visibility = () => { if (document.hidden) gsap.ticker.remove(draw); else if (!reduced) gsap.ticker.add(draw) }
        document.addEventListener('visibilitychange', visibility)
        const intersection = new IntersectionObserver(entries => { visible = entries[0]?.isIntersecting ?? false }, { rootMargin: '100px' })
        intersection.observe(root)
        let narrativeObserver: IntersectionObserver | undefined
        let master: gsap.core.Timeline | undefined
        let splits: Array<InstanceType<typeof SplitText> | null> = []

        if (reduced) {
          panels.forEach(panel => { panel.removeAttribute('aria-hidden'); panel.removeAttribute('inert') })
          gsap.set(nav, { autoAlpha: 1 })
          narrativeObserver = new IntersectionObserver(entries => {
            const entry = entries.find(item => item.isIntersecting)
            if (!entry) return
            const index = panels.indexOf(entry.target as HTMLElement)
            state.phase = chapters[index].phase + 2
            update()
            engine.render(state.phase, 0, true, -1, undefined, signal)
          }, { rootMargin: '-35% 0px -35% 0px', threshold: 0 })
          panels.forEach(panel => narrativeObserver!.observe(panel))
          navigateRef.current = phase => {
            const index = activeChapter(phase)
            panels[index].scrollIntoView({ behavior: 'instant', block: 'center' })
            panels[index].focus({ preventScroll: true })
          }
        } else {
          // The chapter titles are split once per build (no autoSplit inside the scrubbed
          // timeline), lines behind masks and characters too on the centered titles and the
          // legacy's; aria auto keeps the heading's name on the h2 and hides the pieces. Reverted
          // on teardown.
          const centered = (index: number) => chapters[index].id === 'network' || chapters[index].id === 'connected' || chapters[index].id === 'human'
          splits = panels.map((panel, index) => {
            const heading = panel.querySelector('h2')
            return heading ? SplitText.create(heading, { type: centered(index) ? 'lines,chars' : 'lines', mask: 'lines', aria: 'auto' }) : null
          })
          const titles = splits.map((split, index) => split && { lines: split.lines, chars: split.chars, centered: centered(index) })
          // The opening words arrive by meaning once per page load (a breakpoint rebuild shows them settled).
          const hero = root.querySelector<HTMLElement>('h1')
          const heroSplit = hero ? SplitText.create(hero, { type: 'words,chars', aria: 'auto' }) : null
          if (heroSplit && !heroShownRef.current) { revealHero(gsap, heroSplit.words, heroSplit.chars.at(-1) ?? null); heroShownRef.current = true }
          splits.push(heroSplit)
          // The whole scrubbed story lives in `timeline.ts`; the ScrollTrigger that drives it is
          // created here because it pins this stage over the scroll travel.
          // The travel keeps .09 viewport per master unit on desktop and .08 on phones (9 and 8
          // viewports for the hundred units the story had before the legacy took its forty).
          master = buildMaster(gsap, chapters, {
            state, camera, mobile, panels, nav, legacy: scene, titles, film: film ? time => film.render(time) : undefined, morph: morph ? value => morph.render(value) : undefined,
            overview: root.querySelector('[data-overview]'), scrim: root.querySelector('[data-scrim]'),
            // A refresh (a resize) reverts and silently re-renders the master at its progress, so the
            // status line and `data-phase` are brought up to date by hand once it is done.
            scrollTrigger: { id: 'sentraverse-journey', trigger: root, pin: stage, start: 'top top', end: () => `+=${window.innerHeight * MASTER_DURATION * (mobile ? .08 : .09)}`, scrub: mobile ? .35 : .8, invalidateOnRefresh: true, onRefresh: update },
            onUpdate: update,
          })
          // A jump scrolls to the chapter's entry label, so the phase→scroll maths lives in the
          // ScrollTrigger and in the timeline's own tempo, not here.
          navigateRef.current = phase => {
            const trigger = master?.scrollTrigger
            if (!trigger) return
            window.scrollTo({ top: trigger.labelToScroll(jumpLabel(chapters, phase)), behavior: 'instant' })
          }
          gsap.ticker.add(draw)
        }

        const jumps = Array.from(root.querySelectorAll<HTMLButtonElement>('[data-jump]'))
        const handlers = jumps.map(button => {
          const click = () => navigateRef.current(Number(button.dataset.jump))
          button.addEventListener('click', click)
          return () => button.removeEventListener('click', click)
        })
        const cursor = root.querySelector<HTMLElement>('[data-cursor]')!
        const xTo = gsap.quickTo(cursor, 'x', { duration: .25, ease: 'power2.out' })
        const yTo = gsap.quickTo(cursor, 'y', { duration: .25, ease: 'power2.out' })
        const turnTo = gsap.quickTo(look, 'turn', { duration: .6, ease: 'power3.out' })
        const hoverTo = gsap.quickTo(look, 'hover', { duration: .4, ease: 'power2.out' })
        // The pointed division's nodes glow in and out on one eased value; the cursor names it.
        const nodeTo = gsap.quickTo(look, 'node', { duration: .4, ease: 'power2.out' })
        const cursorLabel = cursor.querySelector<HTMLElement>('[data-cursor-label]')!
        const move = (event: PointerEvent) => {
          if (mobile || reduced || event.pointerType === 'touch') return
          xTo(event.clientX); yTo(event.clientY)
          cursor.style.opacity = '1'
          const marker = (event.target as Element).closest<HTMLElement>('[data-division]')
          hover = marker ? Number(marker.dataset.division) : engine.hitTest(event.clientX, event.clientY, state.phase)
          cursor.dataset.active = String(hover >= 0)
          nodeTo(hover >= 0 ? 1 : 0)
          const name = hover >= 0 ? divisions[hover].label : ''
          if (cursorLabel.textContent !== name) cursorLabel.textContent = name
          const rect = stage.getBoundingClientRect()
          const seen = faceLook({ x: event.clientX - rect.left, y: event.clientY - rect.top }, { width: rect.width, height: rect.height }, engine.faceView())
          turnTo(seen.turn); hoverTo(1); look.highlight = seen.highlight
        }
        unpoint = () => { if (hover < 0) return; hover = -1; nodeTo(0); cursor.dataset.active = 'false' }
        const leave = () => { cursor.style.opacity = '0'; hover = -1; turnTo(0); hoverTo(0); nodeTo(0); cursor.dataset.active = 'false' }
        root.addEventListener('pointermove', move)
        root.addEventListener('pointerleave', leave)
        const detachWake = mobile || reduced ? () => undefined : attachPointerWake(gsap, {
          magnetic: root.querySelector<HTMLElement>('[data-magnetic]'),
          buttons: Array.from(root.querySelectorAll<HTMLElement>('[data-nav] > *, [data-jump]')),
        })
        update(); engine.render(0, 0, reduced, -1, undefined, signal)
        ScrollTrigger.refresh()
        const hash = window.location.hash.slice(1)
        const aliases: Record<string, number> = { about: phaseOf('human'), services: phaseOf('division-1'), contact: phaseOf('human'), ecosystem: phaseOf('division-1'), divisions: phaseOf('division-1'), top: phaseOf('origin') }
        const target = chapters.find(chapter => chapter.id === hash)?.phase ?? aliases[hash]
        if (target !== undefined) navigateRef.current(target)

        return () => {
          gsap.ticker.remove(draw)
          observer.disconnect(); intersection.disconnect(); narrativeObserver?.disconnect()
          document.removeEventListener('visibilitychange', visibility)
          root.removeEventListener('pointermove', move); root.removeEventListener('pointerleave', leave)
          detachWake()
          handlers.forEach(remove => remove())
          live = false
          engine.dispose()
          film?.dispose()
          morph?.dispose()
          activity.dispose()
          gsap.set(carrierElement, { clearProps: 'all' }); carrierElement.style.removeProperty('--carrier')
          gsap.set(head, { clearProps: 'transform' }); ticks.forEach(tick => { delete tick.dataset.active })
          // Reading mode shows the legacy still, whatever the cinematic scene left behind.
          if (scene) settleLegacy(gsap, scene, panels[chapters.findIndex(chapter => chapter.id === 'human')])
          // The titles return to their plain markup (the context reverts them too; this is explicit).
          splits.forEach(split => split?.revert())
          panels.forEach(panel => { panel.removeAttribute('aria-hidden'); panel.removeAttribute('inert') })
          delete root.dataset.enhanced
          delete root.dataset.face
          delete root.dataset.signal
        }
      }, root)
      cleanup = () => media.revert()
    }
    initialize().catch(error => {
      if (cancelled) return
      root.dataset.loading = 'false'
      root.dataset.renderer = 'svg'
      delete root.dataset.enhanced
      console.error('Neural experience unavailable; the complete narrative remains readable.', error)
    })
    return () => { cancelled = true; cleanup() }
  }, [reading])

  useEffect(() => {
    const visibility = () => {
      const audio = audioRef.current
      if (!audio) return
      if (document.hidden) void audio.suspend()
      else if (sound) void audio.resume().catch(() => setAudioError(true))
    }
    document.addEventListener('visibilitychange', visibility)
    return () => document.removeEventListener('visibilitychange', visibility)
  }, [sound])

  useEffect(() => () => { void audioRef.current?.close(); audioRef.current = null }, [])

  async function toggleSound() {
    try {
      if (!audioRef.current) {
        const audio = new AudioContext()
        audioRef.current = audio
        const gain = audio.createGain()
        gain.gain.value = .018
        gain.connect(audio.destination)
        for (const frequency of [55, 82.41, 110.2]) {
          const oscillator = audio.createOscillator()
          oscillator.type = 'sine'; oscillator.frequency.value = frequency
          oscillator.connect(gain); oscillator.start()
        }
      }
      if (sound) await audioRef.current.suspend()
      else await audioRef.current.resume()
      setSound(!sound); setAudioError(false)
    } catch { setAudioError(true); setSound(false) }
  }

  return (
    <main ref={rootRef} id="top" className={styles.journey} lang="en" aria-label="Sentraverse neural journey">
      <a href="#narrative" className={styles.skip} onClick={() => setReading(true)}>Skip animation and read the story</a>
      <div data-stage className={styles.stage}>
        <div className={styles.atmosphere} aria-hidden="true" />
        <canvas ref={canvasRef} className={styles.canvas} aria-hidden="true" />
        <canvas ref={fallbackRef} className={styles.canvas} aria-hidden="true" />
        <div className={styles.vignette} aria-hidden="true" />
        <div data-scrim className={styles.scrim} aria-hidden="true" />
        <span data-carrier className={styles.carrier} aria-hidden="true" />
        <header className={styles.header}>
          <a href="#top" className={styles.wordmark} onClick={event => { event.preventDefault(); navigateRef.current(0) }} aria-label="Sentraverse, return to origin"><Image src="/brand/sentraverse-logo.png" alt="" width={36} height={28} priority className={styles.mark} /> SENTRAVERSE<span className={styles.wordmarkDot}>®</span></a>
          <nav data-nav className={styles.nav} aria-label="Primary navigation">
            <button data-jump={phaseOf('network')}>Sentraverse</button><button data-jump={phaseOf('division-1')}>Divisions</button><a href={sentra('/story')}>About</a><a href={sentra('/ekosistem')}>Explore <span aria-hidden="true">↗</span></a>
          </nav>
          <span className={styles.edition}>SENTRA / LIVING SYSTEMS</span>
        </header>

        <div className={styles.loading} role="status"><span>INITIALIZING NEURAL SYSTEM</span><i /></div>
        <div className={styles.specimen} aria-hidden="true"><span>HUMAN SYSTEMS</span><i /><span>AN EXPLORATION OF CONNECTION</span></div>

        <div id="narrative" className={styles.narrative}>
          {chapters.map((chapter, index) => {
            const divisionIndex = divisions.findIndex(item => item.phase === chapter.phase), division = divisionIndex >= 0
            const final = chapter.id === 'human'
            return (
              <section key={chapter.id} id={chapter.id} data-chapter className={`${styles.chapter} ${division ? styles.division : ''} ${final ? styles.human : ''} ${chapter.id === 'connected' || chapter.id === 'network' ? styles.centered : ''}`} tabIndex={-1} aria-label={chapter.label}>
                {division && <div className={styles.marker} aria-hidden="true"><span data-marker-dot /><i data-marker-line /></div>}
                {final && <LegacyScene />}
                {final ? (
                  // The legacy's words (Chief 2026-10-08), each its own beat of the final scene: the
                  // opening line while the figure alone is lit, then the title, the line, the
                  // signature, the brand statement and the way on once the camera has settled.
                  <>
                    <div data-marker-copy className={styles.legacyCopy}>
                      <p data-legacy-presence className={`${styles.eyebrow} ${styles.presence}`}><span className={styles.index}>{chapter.number}</span>{legacyCopy.presence}</p>
                      <h2><span>{chapter.title}</span></h2>
                      <p data-legacy-tagline className={styles.tagline}>{chapter.description}</p>
                      <p data-legacy-signature className={styles.signature}><strong>{legacyCopy.name}</strong><span>{legacyCopy.role}</span></p>
                      <p data-legacy-brand className={styles.brand}><strong>{legacyCopy.brand}</strong><span>{chapter.annotation}</span></p>
                      <a href={sentra('/ekosistem')} data-magnetic className={styles.cta}>EXPLORE SENTRAVERSE <span aria-hidden="true">↗</span></a>
                    </div>
                    {/* The ecosystem stands to the right of the founder (Chief 2026-10-09), arriving with the way on. */}
                    <nav data-legacy-divisions className={styles.legacyDivisions} aria-label="Ecosystem divisions"><span>Discover the ecosystem</span>{divisions.map(division => <a href={sentra('/ekosistem')} key={division.name}>{division.name}</a>)}</nav>
                  </>
                ) : (
                  <div data-marker-copy data-division={division ? divisionIndex : undefined}>
                    <p className={styles.eyebrow}><span className={styles.index}>{chapter.number}</span>{division ? chapter.annotation : chapter.label}</p>
                    {/* A space between the title lines keeps the heading's name readable once SplitText puts it in an aria-label. */}
                    {index === 0 ? <h1>{chapter.title.split('\n').map((line, i) => <Fragment key={line}>{i > 0 && ' '}<span className={i ? styles.soft : undefined}>{line}</span></Fragment>)}</h1> : <h2>{chapter.title.split('\n').map((line, i) => <Fragment key={line}>{i > 0 && ' '}<span>{line}</span></Fragment>)}</h2>}
                    <p className={styles.description}>{chapter.description}</p>
                    {!division && <p className={styles.annotation}><span />{chapter.annotation}</p>}
                    {chapter.id === 'network' && (
                      <div data-squad className={styles.squad}>
                        <p>SentraSquad</p>
                        <div className={styles.squadRow}><i data-burst aria-hidden="true" /><i data-rays aria-hidden="true" /><i data-sparks aria-hidden="true">{Array.from({ length: SPARKS }, (_, i) => <b key={i} />)}</i><ul>{squad.map(member => <li key={member.name}><div data-squad-name><strong>{member.name}</strong><span>{member.role}</span></div></li>)}</ul></div>
                      </div>
                    )}
                    {index === 0 && <button data-jump={phaseOf('embryonic-origin')} className={styles.begin}>SCROLL TO DISCOVER <span aria-hidden="true">↓</span></button>}
                  </div>
                )}
              </section>
            )
          })}
        </div>

        <div data-overview className={styles.overview} aria-label="Five connected regions">
          {divisions.map((division, index) => <button key={division.name} data-jump={division.phase} data-division={index}><span>0{index + 1}</span>{division.name}</button>)}
        </div>

        <div className={styles.coordinates} aria-hidden="true"><span>EST. 2025</span><span>∞ CONNECTIONS<br />ONE INTELLIGENCE</span><span className={styles.crosshair}>+</span></div>
        <footer className={styles.controls}>
          <div className={styles.chapterStatus}><span data-phase-number>01 / {chapters.length}</span><span data-phase-label>The beginning</span></div>
          <div className={styles.transport} aria-label="Journey chapters">
            {chapters.map(chapter => <button key={chapter.id} data-jump={chapter.phase} aria-label={`Go to ${chapter.label}`} title={chapter.label}><span /></button>)}
          </div>
          <div className={styles.settings}>
            <button onClick={() => setReading(value => !value)} aria-pressed={reading}>{reading ? 'CINEMATIC VIEW' : 'READ THE STORY'}</button>
            <button onClick={toggleSound} aria-pressed={sound} aria-label={`Sound ${sound ? 'on' : 'off'}`}><span className={styles.soundIcon} aria-hidden="true">ⅡıⅡ</span> SOUND {sound ? 'ON' : 'OFF'}</button>
          </div>
          {audioError && <span role="status" className={styles.audioError}>Audio unavailable in this browser.</span>}
        </footer>
        <div className={styles.progress} aria-hidden="true">
          <span data-progress-line />
          {chapters.map(chapter => <i key={chapter.id} data-progress-tick={chapter.phase} style={{ left: `${(phaseToTime(chapter.phase) / MASTER_DURATION * 100).toFixed(3)}%` }} />)}
          <b data-progress-head className={styles.head}><span /></b>
        </div>
        <div className={styles.cursor} data-cursor aria-hidden="true"><span data-cursor-label /></div>
      </div>
      <noscript><p className={styles.noScript}>The complete story is available below each illustration. Enable JavaScript for the cinematic journey.</p></noscript>
    </main>
  )
}
