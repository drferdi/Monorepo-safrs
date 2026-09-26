'use client'

import type React from 'react'

interface ConsultationTimerProps {
  elapsedSeconds: number
}

function formatTime(seconds: number): string {
  const h = Math.floor(seconds / 3600)
  const m = Math.floor((seconds % 3600) / 60)
  const s = seconds % 60
  if (h > 0) {
    return `${h}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`
  }
  return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`
}

export function ConsultationTimer({ elapsedSeconds }: ConsultationTimerProps): React.JSX.Element {
  return (
    <span
      style={{
        fontSize: 14,
        color: 'var(--text-muted)',
        letterSpacing: '0.05em',
        padding: '2px 8px',
        borderRadius: 6,
        background: 'rgba(255,255,255,0.05)',
        border: '1px solid var(--line-base)',
      }}
    >
      {formatTime(elapsedSeconds)}
    </span>
  )
}
