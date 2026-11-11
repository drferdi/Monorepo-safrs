'use client'

import type { LucideIcon } from 'lucide-react'
import { Cable, ClipboardCheck, LayoutDashboard, Puzzle } from 'lucide-react'
import { useEffect, useRef, useState } from 'react'

import styles from './AsistenMedisFlow.module.css'

interface FlowStep {
  label: string
  desc: string
  icon: LucideIcon
}

const STEPS: FlowStep[] = [
  { label: 'Dashboard CDSS', desc: 'Keluhan, diagnosis ICD-10, terapi tersusun', icon: LayoutDashboard },
  { label: 'Asisten Medis', desc: 'Ekstensi Chrome mendeteksi sesi RME aktif', icon: Puzzle },
  { label: 'Bridge Engine', desc: 'Transfer otomatis via socket, progress real-time', icon: Cable },
  { label: 'Form ePuskesmas', desc: 'Data masuk tanpa input ulang manual', icon: ClipboardCheck },
]

const PLAY_STEP_MS = 1600

// How work moves from MedBoard into the RME: one step selected at a time, the path
// already travelled drawn in the success tone. Steady: nothing moves, only colour changes.
export function AsistenMedisFlow() {
  const [active, setActive] = useState(0)
  const [playing, setPlaying] = useState(false)
  const buttons = useRef<(HTMLButtonElement | null)[]>([])

  useEffect(() => {
    if (!playing) return
    if (active === STEPS.length - 1) {
      setPlaying(false)
      return
    }
    const timer = setTimeout(() => setActive((step) => step + 1), PLAY_STEP_MS)
    return () => clearTimeout(timer)
  }, [playing, active])

  function select(step: number) {
    setPlaying(false)
    setActive(step)
  }

  function play() {
    setActive(0)
    setPlaying(true)
  }

  function onKeyDown(event: React.KeyboardEvent, step: number) {
    const moves: Record<string, number> = { ArrowDown: step + 1, ArrowRight: step + 1, ArrowUp: step - 1, ArrowLeft: step - 1 }
    if (!(event.key in moves)) return
    const next = moves[event.key]
    if (next < 0 || next >= STEPS.length) return
    event.preventDefault()
    select(next)
    buttons.current[next]?.focus()
  }

  const current = STEPS[active]

  return (
    <div className={styles.flow}>
      <ol className={styles.steps} aria-label="Alur kerja Asisten Medis">
        {STEPS.map((step, i) => {
          const Icon = step.icon
          return (
            <li key={step.label} className={styles.step} data-reached={i <= active}>
              <button
                ref={(el) => {
                  buttons.current[i] = el
                }}
                type="button"
                className="ui-chip"
                aria-pressed={i === active}
                tabIndex={i === active ? 0 : -1}
                onClick={() => select(i)}
                onKeyDown={(event) => onKeyDown(event, i)}
              >
                <Icon size={16} strokeWidth={1.75} aria-hidden />
                {step.label}
              </button>
            </li>
          )
        })}
      </ol>

      <div className={styles.detail} aria-live="polite">
        <div className={styles.count}>
          Langkah {active + 1} dari {STEPS.length}
        </div>
        <div className={styles.label}>{current.label}</div>
        <p className={styles.desc}>{current.desc}</p>
        <div className={styles.route}>
          {active > 0 ? `Dari ${STEPS[active - 1].label}` : 'Awal alur'}
          {' · '}
          {active < STEPS.length - 1 ? `Lanjut ke ${STEPS[active + 1].label}` : 'Data sudah di RME'}
        </div>
        <button type="button" className="ui-btn ui-btn--secondary ui-btn--sm" onClick={play} disabled={playing}>
          {playing ? 'Memutar alur' : 'Putar alur'}
        </button>
      </div>
    </div>
  )
}
