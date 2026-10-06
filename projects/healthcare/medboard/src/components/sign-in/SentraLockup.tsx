import { useId } from 'react'

import { SENTRA_AI_MARK } from './sentra-ai-mark'

const WORDMARK = 'Sentra Artificial Intelligence'

// Wordmark geometry in the lockup's own units: the mark is 310 tall, the wordmark is centred on it.
const WORD_X = 380
const WORD_BASELINE = 241
const WORD_SIZE = 170

/**
 * The official Sentra Artificial Intelligence lockup, drawn inline so the wordmark can move:
 * it opens from the left on entrance and a faint sheen crosses it now and then. Motion lives in
 * the sign-in stylesheet (`.sentra-lockup__*`) and stops under reduced motion.
 */
export default function SentraLockup({ className }: { className?: string }) {
  const id = useId().replace(/[^a-zA-Z0-9_-]/g, '')
  const clipId = `sentra-lockup-clip-${id}`
  const sheenId = `sentra-lockup-sheen-${id}`
  const word = { x: WORD_X, y: WORD_BASELINE, fontSize: WORD_SIZE }

  return (
    <svg
      role="img"
      aria-label="Sentra Artificial Intelligence"
      viewBox="0 0 2600 360"
      className={className ? `sentra-lockup ${className}` : 'sentra-lockup'}
    >
      <defs>
        <clipPath id={clipId}>
          <text className="sentra-lockup__type" {...word}>
            {WORDMARK}
          </text>
        </clipPath>
        <linearGradient id={sheenId} x1="0" x2="1" y1="0" y2="0">
          <stop offset="0" stopColor="#fff" stopOpacity="0" />
          <stop offset="0.5" stopColor="#fff" stopOpacity="0.6" />
          <stop offset="1" stopColor="#fff" stopOpacity="0" />
        </linearGradient>
      </defs>
      <g className="sentra-lockup__mark" fill="currentColor">
        <svg x="20" y="25" width="310" height="310" viewBox={SENTRA_AI_MARK.viewBox}>
          {SENTRA_AI_MARK.paths.map((d) => (
            <path key={d.slice(0, 24)} d={d} />
          ))}
        </svg>
      </g>
      <text className="sentra-lockup__type sentra-lockup__word" fill="currentColor" {...word}>
        {WORDMARK}
      </text>
      <g clipPath={`url(#${clipId})`} aria-hidden="true">
        <rect className="sentra-lockup__sheen" x={WORD_X} y="0" width="420" height="360" fill={`url(#${sheenId})`} />
      </g>
    </svg>
  )
}
