'use client'

import Link from 'next/link'
import { useEffect, useRef, useState } from 'react'
import Portrait from './Portrait'
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
      const [{ gsap }, { ScrollTrigger }, { NeuralRenderer }] = await Promise.all([
        import('gsap'), import('gsap/ScrollTrigger'), import('./renderer'),
      ])
      if (cancelled || !root || !canvas || !fallback) return
      gsap.registerPlugin(ScrollTrigger)
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
        let hover = -1, lastChapter = -1, lastFrame = 0, visible = true
        const progressSetter = gsap.quickSetter(progressLine, 'scaleX')
        const update = () => {
          const index = activeChapter(state.phase)
          root.dataset.phase = state.phase.toFixed(2)
          progressSetter(state.phase / 100)
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
          engine.render(state.phase, reduced ? 0 : time, reduced, hover)
        }
        const resize = () => { engine.resize(); engine.render(state.phase, 0, reduced, hover) }
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
            engine.render(state.phase, 0, true)
          }, { rootMargin: '-35% 0px -35% 0px', threshold: 0 })
          panels.forEach(panel => narrativeObserver!.observe(panel))
          navigateRef.current = phase => {
            const index = activeChapter(phase)
            panels[index].scrollIntoView({ behavior: 'instant', block: 'center' })
            panels[index].focus({ preventScroll: true })
          }
        } else {
          gsap.set(panels, { autoAlpha: 0 })
          gsap.set(panels[0], { autoAlpha: 1 })
          gsap.set(nav, { autoAlpha: 0 })
          master = gsap.timeline({
            defaults: { ease: 'power2.inOut' },
            scrollTrigger: { id: 'sentraverse-journey', trigger: root, pin: stage, start: 'top top', end: () => `+=${window.innerHeight * (mobile ? 8 : 9)}`, scrub: mobile ? .35 : .8, invalidateOnRefresh: true },
            onUpdate: update,
          })
          master.to(state, { phase: 100, duration: 100, ease: 'none' }, 0)
          master.to(nav, { autoAlpha: 1, duration: 2 }, 11)
          master.fromTo('[data-overview]', { autoAlpha: 0 }, { autoAlpha: 1, duration: 1.5 }, 91)
          master.to('[data-overview]', { autoAlpha: 0, duration: 1 }, 95)
          chapters.forEach((chapter, index) => {
            const panel = panels[index]
            // Physical easing (Chief 2026-10-07): entrances decelerate, the marker dot overshoots,
            // exits accelerate; the master stays linear because the scroll position drives it.
            const scene = gsap.timeline({ defaults: { ease: 'power3.out' } })
            const duration = (chapters[index + 1]?.phase ?? 102) - chapter.phase
            if (index > 0) scene.fromTo(panel, { autoAlpha: 0, y: reduced ? 0 : 24 }, { autoAlpha: 1, y: 0, duration: 1.2, immediateRender: false }, 0)
            const marker = panel.querySelector('[data-marker-line]')
            if (marker) {
              scene.fromTo(marker, { scaleX: 0 }, { scaleX: 1, duration: .8, ease: 'power2.out', immediateRender: false }, 0)
              scene.fromTo(panel.querySelector('[data-marker-dot]'), { scale: 0 }, { scale: 1, duration: .4, ease: 'back.out(1.7)', immediateRender: false }, .6)
              scene.fromTo(panel.querySelector('[data-marker-copy]'), { autoAlpha: 0, y: 10 }, { autoAlpha: 1, y: 0, duration: .8, immediateRender: false }, .8)
            }
            // The portrait arrives from the depth and settles with a small overshoot. Its tilt is
            // pointer-driven (wake.ts) on other properties, so the two never fight.
            if (chapter.id === 'human') scene.fromTo(panel.querySelector('[data-portrait-card]'), { z: -420, autoAlpha: 0, scale: .86 }, { z: 0, autoAlpha: 1, scale: 1, duration: 2.4, ease: 'back.out(1.4)', immediateRender: false }, 0)
            if (index < chapters.length - 1) scene.to(panel, { autoAlpha: 0, y: -10, duration: .8, ease: 'power2.in' }, duration - .8)
            master!.addLabel(chapter.id, chapter.phase).add(scene, chapter.phase)
          })
          navigateRef.current = phase => {
            const trigger = master?.scrollTrigger
            if (!trigger) return
            window.scrollTo({ top: trigger.start + (trigger.end - trigger.start) * Math.min(1, (phase + 1.5) / 100), behavior: 'instant' })
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
        const move = (event: PointerEvent) => {
          if (mobile || reduced || event.pointerType === 'touch') return
          xTo(event.clientX); yTo(event.clientY)
          cursor.style.opacity = '1'
          const marker = (event.target as Element).closest<HTMLElement>('[data-division]')
          hover = marker ? Number(marker.dataset.division) : engine.hitTest(event.clientX, event.clientY, state.phase)
          cursor.dataset.active = String(hover >= 0)
        }
        const leave = () => { cursor.style.opacity = '0'; hover = -1 }
        root.addEventListener('pointermove', move)
        root.addEventListener('pointerleave', leave)
        const magnetic = root.querySelector<HTMLElement>('[data-magnetic]')!
        const mx = gsap.quickTo(magnetic, 'x', { duration: .4, ease: 'power2.out' })
        const my = gsap.quickTo(magnetic, 'y', { duration: .4, ease: 'power2.out' })
        const magnet = (event: PointerEvent) => {
          if (mobile || reduced) return
          const rect = magnetic.getBoundingClientRect()
          mx((event.clientX - rect.left - rect.width / 2) * .12)
          my((event.clientY - rect.top - rect.height / 2) * .12)
        }
        const resetMagnet = () => { mx(0); my(0) }
        magnetic.addEventListener('pointermove', magnet)
        magnetic.addEventListener('pointerleave', resetMagnet)
        update(); engine.render(0, 0, reduced)
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
          magnetic.removeEventListener('pointermove', magnet); magnetic.removeEventListener('pointerleave', resetMagnet)
          handlers.forEach(remove => remove())
          engine.dispose()
          panels.forEach(panel => panel.removeAttribute('aria-hidden'))
          delete root.dataset.enhanced
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
              <section key={chapter.id} id={chapter.id} data-chapter className={`${styles.chapter} ${division ? styles.division : ''} ${final || chapter.id === 'connected' || chapter.id === 'network' ? styles.centered : ''} ${final ? styles.portraitChapter : ''}`} tabIndex={-1} aria-label={chapter.label}>
                {division && <div className={styles.marker} aria-hidden="true"><span data-marker-dot /><i data-marker-line /></div>}
                <div data-marker-copy data-division={division ? index - 8 : undefined}>
                  {final && <Portrait />}
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
