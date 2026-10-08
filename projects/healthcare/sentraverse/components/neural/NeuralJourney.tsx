'use client'

import Image from 'next/image'
import Link from 'next/link'
import { useEffect, useRef, useState } from 'react'
import { calloutPoints, callouts, labelStyle, reticleCorners } from './callouts'
import { loadPixels } from './face'
import type { Look } from './renderer'
import { faceBox, faceLook, portraitState } from './tactile'
import { buildMaster, jumpLabel, settleEnding } from './timeline'
import { attachPointerWake } from './wake'
import { activeChapter, chapters, divisions } from './story'
import styles from './journey.module.css'

export default function NeuralJourney() {
  const rootRef = useRef<HTMLElement>(null)
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const fallbackRef = useRef<HTMLCanvasElement>(null)
  const navigateRef = useRef<(phase: number) => void>(() => undefined)
  const audioRef = useRef<AudioContext | null>(null)
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
      // Every plugin ships inside the gsap package (3.13+): the ending's text decode and the
      // reticle's wiggle settle load with ScrollTrigger and register in the same place.
      const [{ gsap }, { ScrollTrigger }, { ScrambleTextPlugin }, { CustomEase }, { CustomWiggle }, { NeuralRenderer }, { createPortraitReveal }, { LANES, createSignalCycle }] = await Promise.all([
        import('gsap'), import('gsap/ScrollTrigger'), import('gsap/ScrambleTextPlugin'), import('gsap/CustomEase'), import('gsap/CustomWiggle'), import('./renderer'), import('./portrait-reveal'), import('./signal'),
      ])
      if (cancelled || !root || !canvas || !fallback) return
      gsap.registerPlugin(ScrollTrigger, ScrambleTextPlugin, CustomEase, CustomWiggle)
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
        // The founder's face (Chief 2026-10-08) is drawn by the renderer from the portrait's
        // pixels; `look` is what the pointer does to it. Without pixels the text ends the story.
        const look: Look = { turn: 0, highlight: [0, 0, 0], hover: 0 }
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
        let hover = -1, lastChapter = -1, lastFrame = 0, visible = true
        const progressSetter = gsap.quickSetter(progressLine, 'scaleX')
        const update = () => {
          const index = activeChapter(state.phase)
          root.dataset.phase = state.phase.toFixed(2)
          progressSetter(state.phase / 100)
          activity.setPhase(state.phase)
          root.dataset.signal = activity.cycle.paused() ? 'paused' : 'active'
          if (lastChapter === index) return
          lastChapter = index
          phaseLabel.textContent = chapters[index].label
          phaseNumber.textContent = `${String(index + 1).padStart(2, '0')} / ${chapters.length}`
          panels.forEach((panel, i) => { if (!reduced) panel.setAttribute('aria-hidden', String(i !== index)) })
          root.querySelectorAll<HTMLButtonElement>('[data-jump]').forEach(button => {
            button.setAttribute('aria-current', Number(button.dataset.jump) === chapters[index].phase ? 'step' : 'false')
          })
        }
        const draw = (time = 0) => {
          if (!visible || document.hidden) return
          if (mobile && time - lastFrame < 1 / 30) return
          lastFrame = time
          engine.render(state.phase, reduced ? 0 : time, reduced, hover, look, signal)
          portrait?.render(portraitState(state.phase).reveal)
        }
        // The real portrait resolves over the neural face at the very end (Chief 2026-10-08):
        // the same placement maths puts the photo exactly where the renderer draws the face.
        const photo = root.querySelector<HTMLElement>('[data-photo]')
        const portrait = photo && !reduced ? createPortraitReveal(photo) : null
        const placePhoto = () => {
          if (!photo || reduced) return
          const viewport = { width: stage.clientWidth, height: stage.clientHeight }
          const box = faceBox(engine.faceView(), viewport)
          gsap.set(photo, box)
          portrait?.resize(box.width, box.height, window.devicePixelRatio || 1)
          portrait?.render(portraitState(state.phase).reveal)
        }
        const resize = () => { engine.resize(); placePhoto(); engine.render(state.phase, 0, reduced, hover, look) }
        const observer = new ResizeObserver(resize)
        observer.observe(stage)
        const visibility = () => { if (document.hidden) gsap.ticker.remove(draw); else if (!reduced) gsap.ticker.add(draw) }
        document.addEventListener('visibilitychange', visibility)
        const intersection = new IntersectionObserver(entries => { visible = entries[0]?.isIntersecting ?? false }, { rootMargin: '100px' })
        intersection.observe(root)
        let narrativeObserver: IntersectionObserver | undefined
        let master: gsap.core.Timeline | undefined

        if (reduced) {
          panels.forEach(panel => panel.removeAttribute('aria-hidden'))
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
          if (photo) placePhoto()
          // The whole scrubbed story lives in `timeline.ts`; the ScrollTrigger that drives it is
          // created here because it pins this stage over the scroll travel.
          master = buildMaster(gsap, chapters, {
            state, panels, nav, photo, reveal: !!portrait,
            overview: root.querySelector('[data-overview]'), scrim: root.querySelector('[data-scrim]'),
            scrollTrigger: { id: 'sentraverse-journey', trigger: root, pin: stage, start: 'top top', end: () => `+=${window.innerHeight * (mobile ? 8 : 9)}`, scrub: mobile ? .35 : .8, invalidateOnRefresh: true },
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
        const move = (event: PointerEvent) => {
          if (mobile || reduced || event.pointerType === 'touch') return
          xTo(event.clientX); yTo(event.clientY)
          cursor.style.opacity = '1'
          const marker = (event.target as Element).closest<HTMLElement>('[data-division]')
          hover = marker ? Number(marker.dataset.division) : engine.hitTest(event.clientX, event.clientY, state.phase)
          cursor.dataset.active = String(hover >= 0)
          const rect = stage.getBoundingClientRect()
          const seen = faceLook({ x: event.clientX - rect.left, y: event.clientY - rect.top }, { width: rect.width, height: rect.height }, engine.faceView())
          turnTo(seen.turn); hoverTo(1); look.highlight = seen.highlight
        }
        const leave = () => { cursor.style.opacity = '0'; hover = -1; turnTo(0); hoverTo(0) }
        root.addEventListener('pointermove', move)
        root.addEventListener('pointerleave', leave)
        const detachWake = mobile || reduced ? () => undefined : attachPointerWake(gsap, {
          magnetic: root.querySelector<HTMLElement>('[data-magnetic]'),
          buttons: Array.from(root.querySelectorAll<HTMLElement>('[data-nav] > *, [data-jump]')),
        })
        update(); engine.render(0, 0, reduced, -1, undefined, signal)
        document.fonts.ready.then(() => { if (!cancelled) ScrollTrigger.refresh() })
        ScrollTrigger.refresh()
        const hash = window.location.hash.slice(1)
        const aliases: Record<string, number> = { about: 96, services: 66, contact: 96, ecosystem: 66, divisions: 66, top: 0 }
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
          portrait?.dispose()
          activity.dispose()
          if (photo) {
            gsap.set(photo, { clearProps: 'all' })
            // Reading mode shows the ending complete and still, whatever the cinematic scene left behind.
            settleEnding(gsap, photo)
          }
          panels.forEach(panel => panel.removeAttribute('aria-hidden'))
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
        <header className={styles.header}>
          <a href="#top" className={styles.wordmark} onClick={event => { event.preventDefault(); navigateRef.current(0) }} aria-label="Sentraverse, return to origin"><span className={styles.mark} aria-hidden="true">✳</span> SENTRAVERSE<span className={styles.wordmarkDot}>®</span></a>
          <nav data-nav className={styles.nav} aria-label="Primary navigation">
            <button data-jump="60">Sentraverse</button><button data-jump="66">Divisions</button><Link href="/story">About</Link><Link href="/ekosistem">Explore <span aria-hidden="true">↗</span></Link>
          </nav>
          <span className={styles.edition}>SENTRA / LIVING SYSTEMS</span>
        </header>

        <div className={styles.loading} role="status"><span>INITIALIZING NEURAL SYSTEM</span><i /></div>
        <div className={styles.specimen} aria-hidden="true"><span>HUMAN SYSTEMS</span><i /><span>AN EXPLORATION OF CONNECTION</span></div>

        <div id="narrative" className={styles.narrative}>
          {chapters.map((chapter, index) => {
            const division = index >= 8 && index <= 12
            const final = chapter.id === 'human'
            return (
              <section key={chapter.id} id={chapter.id} data-chapter className={`${styles.chapter} ${division ? styles.division : ''} ${final ? styles.human : ''} ${chapter.id === 'connected' || chapter.id === 'network' ? styles.centered : ''}`} tabIndex={-1} aria-label={chapter.label}>
                {division && <div className={styles.marker} aria-hidden="true"><span data-marker-dot /><i data-marker-line /></div>}
                {final && (
                  <div data-photo className={styles.photo}>
                    <Image src="/portrait-ferdi.webp" alt="dr. Ferdi Iskandar" fill sizes="(max-width: 767px) 60vw, 480px" />
                    <canvas data-photo-reveal aria-hidden="true" />
                    <i data-scan className={styles.scan} aria-hidden="true" />
                    <svg data-callout-lines className={styles.lines} viewBox="0 0 100 100" preserveAspectRatio="none" aria-hidden="true">
                      <g data-reticle className={styles.reticle}>
                        {reticleCorners().map(corner => <path key={corner} data-reticle-corner d={corner} pathLength={1} strokeDasharray="1" />)}
                      </g>
                      {callouts.map(callout => (
                        <g key={callout.label}>
                          <polyline data-callout-line points={calloutPoints(callout)} pathLength={1} strokeDasharray="1" />
                          <polyline data-callout-glint className={styles.glint} points={calloutPoints(callout)} pathLength={1} />
                          <circle data-callout-dot cx={callout.anchor[0]} cy={callout.anchor[1]} r=".55" />
                        </g>
                      ))}
                    </svg>
                    <ul data-callouts className={styles.callouts} aria-label="Profile">
                      {/* The visible text decodes in the cinematic scene; the exact label lives in the aria-label throughout. */}
                      {callouts.map(callout => <li key={callout.label} data-callout aria-label={callout.label} style={labelStyle(callout)}><span data-callout-text aria-hidden="true">{callout.label}</span></li>)}
                    </ul>
                    <i data-flash className={styles.flash} aria-hidden="true" />
                  </div>
                )}
                <div data-marker-copy data-division={division ? index - 8 : undefined}>
                  <p className={styles.eyebrow}><span className={styles.index}>{chapter.number}</span>{division ? chapter.annotation : chapter.label}</p>
                  {index === 0 ? <h1>{chapter.title.split('\n').map((line, i) => <span key={line} className={i ? styles.soft : undefined}>{line}</span>)}</h1> : <h2>{chapter.title.split('\n').map(line => <span key={line}>{line}</span>)}</h2>}
                  <p className={styles.description}>{chapter.description}</p>
                  {!division && <p className={styles.annotation}><span />{chapter.annotation}</p>}
                  {index === 0 && <button data-jump="8" className={styles.begin}>SCROLL TO DISCOVER <span aria-hidden="true">↓</span></button>}
                  {final && <Link href="/ekosistem" data-magnetic className={styles.cta}>EXPLORE SENTRAVERSE <span aria-hidden="true">↗</span></Link>}
                </div>
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
        <div className={styles.progress} aria-hidden="true"><span data-progress-line /></div>
        <div className={styles.cursor} data-cursor aria-hidden="true" />
      </div>
      <div className={styles.colophon}>
        <span>SENTRAVERSE © {new Date().getFullYear()}</span><span>INTELLIGENCE BEGINS AS CONNECTION.</span>
        <div><Link href="/privacy">Privacy</Link><Link href="/terms">Terms</Link></div>
      </div>
      <noscript><p className={styles.noScript}>The complete story is available below each illustration. Enable JavaScript for the cinematic journey.</p></noscript>
      <div className={styles.accessibleDivisions} aria-label="Ecosystem divisions"><span>Discover the ecosystem</span>{divisions.map(division => <Link href="/ekosistem" key={division.name}>{division.name}</Link>)}</div>
    </main>
  )
}
