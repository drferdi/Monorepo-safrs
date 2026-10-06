'use client'

import Lenis from 'lenis'
import { ChevronsRight } from 'lucide-react'
import { type ReactNode, useCallback, useEffect, useRef, useState } from 'react'

import { INTRO_SEEN_KEY, LOGO_OUT_AT, SPLIT_AT, SPLIT_MS, shouldPlayIntro } from './intro'
import AccessNotice from './AccessNotice'
import IntroLockup, { SentraMark } from './IntroLockup'
import LegalNotice from './LegalNotice'
import NeuralField from './NeuralField'
import SentraLockup from './SentraLockup'
import styles from './sign-in.module.css'

type Phase = 'logo' | 'field' | 'split' | 'ready'

function readIntroSeen(): boolean | null {
  try {
    return window.sessionStorage.getItem(INTRO_SEEN_KEY) === '1'
  } catch {
    return null
  }
}

function initialPhase(): Phase {
  if (typeof window === 'undefined') return 'ready'
  const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches
  return shouldPlayIntro({ reducedMotion, seen: readIntroSeen() }) ? 'logo' : 'ready'
}

interface SignInScreenProps {
  /** Id of the field that receives focus once the opening has played. */
  focusId: string
  /** Wider column for the access request form. */
  wide?: boolean
  children: ReactNode
}

/**
 * Full-screen sign-in: the intelligence field on the left, the MedBoard column on the right,
 * preceded once per browser session by an opening sequence.
 */
export default function SignInScreen({ focusId, wide = false, children }: SignInScreenProps) {
  const [phase, setPhase] = useState<Phase>(initialPhase)
  const [skipped, setSkipped] = useState(false)
  const introPlayed = useRef(phase === 'logo')
  const timers = useRef<Array<ReturnType<typeof setTimeout>>>([])
  const panelRef = useRef<HTMLElement>(null)
  const panelInnerRef = useRef<HTMLDivElement>(null)

  const docked = phase === 'split' || phase === 'ready'
  const inIntro = !docked

  const clearTimers = () => {
    timers.current.forEach(clearTimeout)
    timers.current = []
  }

  // Drives the opening sequence.
  useEffect(() => {
    if (!introPlayed.current) return undefined
    try {
      window.sessionStorage.setItem(INTRO_SEEN_KEY, '1')
    } catch {
      // Storage unavailable: the opening plays again next time.
    }
    timers.current = [
      setTimeout(() => setPhase('field'), LOGO_OUT_AT),
      setTimeout(() => setPhase('split'), SPLIT_AT),
      setTimeout(() => setPhase('ready'), SPLIT_AT + SPLIT_MS),
    ]
    return clearTimers
  }, [])

  const skip = useCallback(() => {
    clearTimers()
    setSkipped(true)
    setPhase('split')
    timers.current = [setTimeout(() => setPhase('ready'), SPLIT_MS)]
  }, [])

  // A key, a click or the skip button jumps to sign-in.
  useEffect(() => {
    if (!inIntro) return undefined
    const onKey = (event: KeyboardEvent) => {
      if (['Escape', 'Enter', ' ', 'Tab'].includes(event.key)) {
        event.preventDefault()
        skip()
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [inIntro, skip])

  // After the opening, put the cursor where work starts (pointer devices only).
  useEffect(() => {
    if (phase !== 'ready' || !introPlayed.current) return
    if (window.matchMedia('(pointer: fine)').matches) {
      document.getElementById(focusId)?.focus({ preventScroll: true })
    }
  }, [phase, focusId])

  // On wide screens the sign-in column scrolls on its own; it gets the same smooth scroll as the page.
  useEffect(() => {
    const wrapper = panelRef.current
    const content = panelInnerRef.current
    if (phase !== 'ready' || !wrapper || !content) return undefined
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return undefined
    const lenis = new Lenis({ wrapper, content, autoRaf: true, allowNestedScroll: true })
    return () => lenis.destroy()
  }, [phase])

  // Field text waits for the split to settle when the opening has played. The sign-in column fills
  // only once it has finished opening, so its text reveals in turn instead of arriving at once.
  const base = introPlayed.current ? 750 : 120
  const stagger = (index: number) => ({ animationDelay: `${base + index * 90}ms` })

  return (
    <div className={styles.screen} data-intro={inIntro}>
      <section
        aria-label="MedBoard"
        className={styles.field}
        data-docked={docked}
        onClick={inIntro ? skip : undefined}
      >
        <div aria-hidden="true" className={styles.stage} />
        <NeuralField playIntro={introPlayed.current && phase === 'logo'} skipIntro={skipped} />
        <div aria-hidden="true" className={styles.vignette} />

        {inIntro ? (
          <>
            <IntroLockup leaving={phase !== 'logo'} />
            <button
              type="button"
              onClick={(event) => {
                event.stopPropagation()
                skip()
              }}
              className={`${styles.skip} ${styles.introFade}`}
              style={{ animationDelay: '600ms' }}
            >
              Lewati intro
              <ChevronsRight aria-hidden="true" size={14} strokeWidth={1.75} className={styles.skipIcon} />
            </button>
          </>
        ) : (
          <>
            <div
              aria-hidden="true"
              className={`${styles.cornerShade} ${styles.introFade}`}
              style={{ animationDelay: `${base - 100}ms` }}
            />
            <div
              aria-hidden="true"
              className={`${styles.seam} ${styles.introFade}`}
              style={{ animationDelay: `${base}ms` }}
            />
            <div className={styles.fieldContent}>
              <div className={`${styles.brand} ${styles.rise}`} style={stagger(0)}>
                <SentraMark className={styles.brandMark} />
                <span className={styles.brandText}>
                  <span className={styles.brandName}>MedBoard</span>
                  <span className={styles.brandProduct}>Sentra Healthcare AI</span>
                </span>
              </div>
              <div className={styles.fieldFoot}>
                <p className={`${styles.tagline} ${styles.rise}`} style={stagger(1)}>
                  Kecerdasan klinis terintegrasi untuk pelayanan kesehatan primer.
                </p>
                <div className={styles.fieldMeta}>
                  <p className={`${styles.status} ${styles.rise}`} style={stagger(2)}>
                    <span aria-hidden="true" className={styles.statusDot} />
                    <span>Platform pendukung keputusan klinis</span>
                    <span aria-hidden="true" className={styles.statusRule} />
                    <span className={styles.statusState}>Siap digunakan</span>
                  </p>
                  <p className={`${styles.credit} ${styles.rise}`} style={stagger(3)}>
                    <span className={styles.creditLine}>
                      Dirancang dan dikembangkan oleh{' '}
                      <a className={styles.creditLink} href="https://ferdiiskandar.com" target="_blank" rel="noopener noreferrer">
                        dr. Ferdi Iskandar
                      </a>
                    </span>
                    <span className={styles.creditLine}>
                      Laboratorium Pengembangan{' '}
                      <a className={styles.creditLink} href="https://melinda.co.id" target="_blank" rel="noopener noreferrer">
                        RSIA Melinda DHAI
                      </a>
                      , Kediri · 2025–2026
                    </span>
                  </p>
                </div>
              </div>
            </div>
          </>
        )}
      </section>

      <main ref={panelRef} className={styles.panel} data-docked={docked} data-wide={wide}>
        <div aria-hidden="true" className={styles.panelShade} />
        {phase === 'ready' ? (
          <div ref={panelInnerRef} className={styles.panelInner}>
            <header className={styles.panelHeader}>
              <SentraLockup />
            </header>
            <div className={styles.content}>{children}</div>
            {/* The notice follows the form's last reveal. */}
            <AccessNotice baseDelay={1000} />
            <LegalNotice baseDelay={1700} />
          </div>
        ) : null}
      </main>
    </div>
  )
}
