'use client'

import { type ReactNode, useEffect, useState } from 'react'

const TRUST_SCRIPT = `const kb = crossCheck(patient);
const fit = alignContext(kb);
const lanes = stabilizeRanking(fit);
const flags = isolateRedFlags(lanes);
return readyForReview(flags);`
const PROCESSING_SCRIPT = 'AI: memetakan gejala, tanda vital, guardrail klinis'

const CHAR_DELAY = 52
const HOLD_MS = 1800
const ERASE_DELAY = 22
const PAUSE_MS = 560

function colorizeTrustLine(line: string): ReactNode[] {
  const tokens: ReactNode[] = []
  let rest = line
  let i = 0

  const rules: [RegExp, string][] = [
    [/^(const|return)(?=\W)/, '#ffb25c'],
    [/^[A-Z][a-zA-Z0-9_]+/, '#f1ece3'],
    [/^[a-z_][a-zA-Z0-9_]*/, '#90ecff'],
    [/^[=><!+\-*/.,;()[\]{}]+/, '#ff72bc'],
    [/^\s+/, 'transparent'],
  ]

  while (rest.length > 0) {
    let matched = false

    for (const [pattern, color] of rules) {
      const match = rest.match(pattern)
      if (!match) continue

      tokens.push(
        <span key={i++} style={{ color }}>
          {match[0]}
        </span>
      )
      rest = rest.slice(match[0].length)
      matched = true
      break
    }

    if (!matched) {
      tokens.push(
        <span key={i++} style={{ color: '#f1ece3' }}>
          {rest[0]}
        </span>
      )
      rest = rest.slice(1)
    }
  }

  return tokens
}

interface TrustLayerGhostProps {
  script?: string
  singleLine?: boolean
}

export default function TrustLayerGhost({
  script = TRUST_SCRIPT,
  singleLine = false,
}: TrustLayerGhostProps) {
  const [displayed, setDisplayed] = useState('')
  const [phase, setPhase] = useState<'typing' | 'holding' | 'erasing' | 'pausing'>('pausing')

  useEffect(() => {
    let timeoutId: ReturnType<typeof setTimeout>

    if (phase === 'typing') {
      if (displayed.length < script.length) {
        timeoutId = setTimeout(() => {
          setDisplayed(script.slice(0, displayed.length + 1))
        }, CHAR_DELAY)
      } else {
        timeoutId = setTimeout(() => setPhase('holding'), HOLD_MS)
      }
    } else if (phase === 'holding') {
      timeoutId = setTimeout(() => setPhase('erasing'), HOLD_MS)
    } else if (phase === 'erasing') {
      if (displayed.length > 0) {
        timeoutId = setTimeout(() => {
          setDisplayed(current => current.slice(0, -1))
        }, ERASE_DELAY)
      } else {
        timeoutId = setTimeout(() => setPhase('pausing'), PAUSE_MS)
      }
    } else {
      timeoutId = setTimeout(() => setPhase('typing'), PAUSE_MS)
    }

    return () => clearTimeout(timeoutId)
  }, [displayed, phase, script])

  useEffect(() => {
    setDisplayed('')
    setPhase('pausing')
  }, [script])

  const lines = singleLine ? [displayed] : displayed.split('\n')
  const isVisible = phase !== 'pausing' || displayed.length > 0
  const showCursor = phase === 'typing' || phase === 'holding'

  return (
    <div className={`cdss-trust-ghost${isVisible ? ' is-visible' : ''}`} aria-hidden="true">
      <pre className={`cdss-trust-ghost-pre${singleLine ? ' is-single-line' : ''}`}>
        {lines.map((line, lineIndex) => (
          <div key={`${lineIndex}-${line}`}>
            {colorizeTrustLine(line)}
            {lineIndex === lines.length - 1 && isVisible && showCursor && (
              <span className="cdss-trust-ghost-caret">_</span>
            )}
          </div>
        ))}
      </pre>
    </div>
  )
}

export { PROCESSING_SCRIPT }
