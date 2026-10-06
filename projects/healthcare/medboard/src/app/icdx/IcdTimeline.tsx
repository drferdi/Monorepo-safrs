'use client'

import { Check, Copy, X } from 'lucide-react'
import { motion } from 'motion/react'
import { useEffect, useState } from 'react'

import { cx } from '@/components/ui/cx'
import { useReducedMotion } from '@/components/shell/use-reduced-motion'
import { ICD_TIMELINE } from '@/lib/icd/timeline'

import styles from './icdx.module.css'

// Calm ease-out, no spring (Chief: steady console motion). Re-plays per chosen code via its key.
const EASE = [0.22, 0.61, 0.36, 1] as const

/** The ICD version Indonesia uses and the world reference, drawn in when a code is chosen. */
export function IcdTimeline({
  code,
  inCatalog,
  worldwideCode,
}: {
  code: string
  inCatalog: boolean | null
  worldwideCode: string | null
}) {
  const still = useReducedMotion()

  return (
    <div className={styles.timelineWrap}>
      <motion.span
        className={styles.rail}
        aria-hidden="true"
        initial={still ? false : { scaleY: 0 }}
        animate={{ scaleY: 1 }}
        transition={{ duration: 0.7, ease: EASE }}
      />
      <ol className={styles.timeline} aria-label="Pemakaian kode di Indonesia">
        {ICD_TIMELINE.map((stop, i) => {
          const national = stop.systems.length > 0
          return (
            <motion.li
              key={stop.year}
              className={cx(styles.stop, national && styles.stopNational)}
              initial={still ? false : { opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.45, delay: 0.2 + i * 0.25, ease: EASE }}
            >
              <span className={styles.dot} aria-hidden="true" />
              <span className={styles.stopHead}>
                <span className={styles.year}>{stop.year}</span> {stop.label}
                {national && inCatalog !== null && (
                  <motion.span
                    className={cx(styles.stopCode, !inCatalog && styles.codeBad)}
                    initial={still ? false : { opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ duration: 0.4, delay: still ? 0 : 0.75, ease: EASE }}
                  >
                    {inCatalog ? <Check size={14} aria-hidden="true" /> : <X size={14} aria-hidden="true" />}
                    {code}
                  </motion.span>
                )}
                {national && inCatalog && <CopyCode code={code} />}
                {!national && worldwideCode && (
                  <motion.span
                    className={styles.stopCode}
                    initial={still ? false : { opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ duration: 0.4, delay: still ? 0 : 1, ease: EASE }}
                  >
                    {worldwideCode}
                  </motion.span>
                )}
                {!national && worldwideCode && <CopyCode code={worldwideCode} />}
              </span>
              {national && <span className={styles.systems}>{stop.systems.join(' · ')}</span>}
            </motion.li>
          )
        })}
      </ol>
    </div>
  )
}

/** Copies one code to the clipboard; the icon turns to a check for a moment, the width never changes. */
function CopyCode({ code }: { code: string }) {
  const [state, setState] = useState<'idle' | 'copied' | 'failed'>('idle')

  useEffect(() => {
    if (state === 'idle') return
    const timer = window.setTimeout(() => setState('idle'), 1500)
    return () => window.clearTimeout(timer)
  }, [state])

  const copy = () => {
    navigator.clipboard.writeText(code).then(
      () => setState('copied'),
      () => setState('failed')
    )
  }

  return (
    <button
      type="button"
      className={cx('ui-btn ui-btn--secondary', styles.copy)}
      onClick={copy}
      aria-label={state === 'copied' ? `Kode ${code} tersalin` : `Salin kode ${code}`}
    >
      {state === 'copied' ? (
        <Check size={12} aria-hidden="true" />
      ) : state === 'failed' ? (
        <X size={12} aria-hidden="true" />
      ) : (
        <Copy size={12} aria-hidden="true" />
      )}
      Copy
    </button>
  )
}
