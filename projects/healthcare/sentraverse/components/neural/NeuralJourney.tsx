'use client'

import Link from 'next/link'
import { useEffect, useRef, useState } from 'react'
import { activeChapter, chapters, divisions } from './story'
import styles from './journey.module.css'

function NeuralSilhouette() {
  return (
    <svg className={styles.silhouette} viewBox="0 0 400 700" fill="none" aria-hidden="true">
      <defs>
        <radialGradient id="human-tissue" cx="50%" cy="30%" r="75%">
          <stop stopColor="currentColor" stopOpacity=".16" />
          <stop offset="1" stopColor="currentColor" stopOpacity=".025" />
        </radialGradient>
      </defs>
      <g transform="translate(200 350) scale(100 -100)" stroke="currentColor" strokeWidth=".009">
        {[-1, 1].map(side => (
          <g key={side} transform={`scale(${side} 1)`}>
            <path fill="url(#human-tissue)" d="M0 2.97C.27 2.99 .45 2.81 .45 2.56C.45 2.36 .40 2.19 .26 2.10L.26 1.91C.40 1.80 .68 1.78 .85 1.66C1.00 1.55 1.05 1.31 1.11 1.04L1.23 .53C1.27 .36 1.28 .20 1.31 .03L1.39 -.34C1.42 -.44 1.43 -.55 1.40 -.62Q1.37 -.66 1.35 -.58L1.31 -.42L1.34 -.70Q1.32 -.77 1.29 -.70L1.25 -.45L1.25 -.74Q1.22 -.81 1.19 -.73L1.17 -.47L1.15 -.71Q1.12 -.76 1.10 -.68L1.10 -.38L1.05 -.49Q1.01 -.52 1.00 -.47L1.02 -.30L1.07 -.18L.96 .26C.89 .48 .85 .79 .77 1.08L.66 1.24C.67 .87 .59 .43 .52 .16C.50 -.10 .59 -.32 .63 -.55C.68 -.85 .61 -1.25 .55 -1.56L.50 -1.91C.49 -2.12 .57 -2.26 .55 -2.49L.46 -3.00C.48 -3.12 .58 -3.18 .57 -3.24Q.54 -3.32 .29 -3.29C.23 -3.24 .28 -3.12 .28 -3.01L.25 -2.51C.23 -2.24 .26 -2.08 .27 -1.91L.21 -1.48C.18 -1.22 .10 -.99 0 -.90" />
            <path opacity=".45" d="M.06 1.77Q.38 1.68 .73 1.59M.76 1.52Q.88 1.30 .89 1.03M.12 1.42Q.42 1.49 .64 1.22M.51 .40Q.38 -.05 .48 -.45M.04 -.78Q.27 -.62 .52 -.66M.35 -1.75Q.46 -1.83 .45 -2.00M.37 -2.12Q.43 -2.48 .36 -2.85" />
          </g>
        ))}
        <g className={styles.fallbackNerves} strokeWidth=".015">
          <path d="M0 2.13V-.45M0 1.68L.7 1.46L.98 .53L1.14 -.2M0 1.68L-.7 1.46L-.98 .53L-1.14 -.2M0 -.35L.38 -.84L.4 -1.9L.4 -3.05M0 -.35L-.38 -.84L-.4 -1.9L-.4 -3.05" />
          <path d="M0 2.14C-.48 2.08 -.55 2.49 -.36 2.71C-.25 2.86 -.08 2.88 0 2.79C.08 2.88 .25 2.86 .36 2.71C.55 2.49 .48 2.08 0 2.14ZM0 2.79V2.14M-.34 2.58Q-.09 2.75 -.15 2.48T-.3 2.26M.34 2.58Q.09 2.75 .15 2.48T.3 2.26" />
        </g>
      </g>
    </svg>
  )
}

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
          root.dataset.human = String(state.phase >= 96)
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
            const scene = gsap.timeline({ defaults: { ease: 'power2.inOut' } })
            const duration = (chapters[index + 1]?.phase ?? 102) - chapter.phase
            if (index > 0) scene.fromTo(panel, { autoAlpha: 0, y: reduced ? 0 : 18 }, { autoAlpha: 1, y: 0, duration: 1.2, immediateRender: false }, 0)
            const marker = panel.querySelector('[data-marker-line]')
            if (marker) {
              scene.fromTo(marker, { scaleX: 0 }, { scaleX: 1, duration: .8, immediateRender: false }, 0)
              scene.fromTo(panel.querySelector('[data-marker-dot]'), { scale: 0 }, { scale: 1, duration: .4, immediateRender: false }, .6)
              scene.fromTo(panel.querySelector('[data-marker-copy]'), { autoAlpha: 0, y: 10 }, { autoAlpha: 1, y: 0, duration: .8, immediateRender: false }, .8)
            }
            if (index < chapters.length - 1) scene.to(panel, { autoAlpha: 0, y: -10, duration: .8 }, duration - .8)
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
        <NeuralSilhouette />
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
              <section key={chapter.id} id={chapter.id} data-chapter className={`${styles.chapter} ${division ? styles.division : ''} ${final || chapter.id === 'connected' || chapter.id === 'network' ? styles.centered : ''}`} tabIndex={-1} aria-label={chapter.label}>
                {division && <div className={styles.marker} aria-hidden="true"><span data-marker-dot /><i data-marker-line /></div>}
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
