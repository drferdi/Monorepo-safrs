import type { CSSProperties } from 'react'

import { SENTRA_LOGO } from './sentra-logo'
import styles from './sign-in.module.css'

const delay = (ms: number): CSSProperties => ({ animationDelay: `${ms}ms` })

/** Sentra mark drawn from the traced paths; takes its colour from the surrounding text. */
export function SentraMark({ className }: { className?: string }) {
  return (
    <svg
      aria-hidden="true"
      viewBox={`0 0 ${SENTRA_LOGO.width} ${SENTRA_LOGO.height}`}
      fill="currentColor"
      className={className}
    >
      {SENTRA_LOGO.paths.map((d) => (
        <path key={d.slice(0, 24)} d={d} />
      ))}
    </svg>
  )
}

/**
 * Opening lockup: construction lines draw the mark, the wordmark is traced as an outline
 * and then filled, and the descriptor resolves beneath it.
 */
export default function IntroLockup({ leaving }: { leaving: boolean }) {
  return (
    <div aria-hidden="true" className={styles.lockup} data-leaving={leaving}>
      <div className={styles.lockupInner}>
        <svg
          viewBox={`0 0 ${SENTRA_LOGO.width} ${SENTRA_LOGO.height}`}
          className={styles.lockupMark}
          fill="none"
        >
          {/* guide lines along the three strokes of the mark */}
          <g stroke="#fff" strokeWidth="4">
            <path className={styles.introGuide} pathLength={1} d="M-223 667L964 -187" style={delay(300)} />
            <path className={styles.introGuide} pathLength={1} d="M903 110L-150 870" style={delay(420)} />
            <path className={styles.introGuide} pathLength={1} d="M-42 1077L1098 327" style={delay(540)} />
          </g>
          {SENTRA_LOGO.paths.map((d, index) => (
            <g key={d.slice(0, 24)}>
              <path
                className={styles.introStroke}
                pathLength={1}
                d={d}
                stroke="#fff"
                strokeWidth="7"
                strokeLinejoin="round"
                style={delay(650 + index * 180)}
              />
              <path className={styles.introFade} d={d} fill="#fff" style={delay(1650 + index * 120)} />
            </g>
          ))}
        </svg>

        <svg viewBox="0 0 420 70" className={styles.lockupWord} role="presentation">
          <text
            className={styles.introWord}
            x="210"
            y="54"
            textAnchor="middle"
            fontSize="54"
            fontWeight="600"
            fill="#fff"
            stroke="#fff"
            strokeWidth="0.8"
            style={{ animationDelay: '900ms, 1750ms' }}
          >
            MedBoard
          </text>
        </svg>

        <span className={styles.lockupRule} style={delay(1500)} />
        <p className={`${styles.lockupDescriptor} ${styles.introFade}`} style={delay(1900)}>
          Sentra Healthcare Artificial Intelligence
        </p>
        <p className={`${styles.lockupCredit} ${styles.introFade}`} style={delay(2500)}>
          Dirancang dan dikembangkan oleh dr. Ferdi Iskandar
        </p>
      </div>
    </div>
  )
}
