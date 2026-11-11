'use client'

import type React from 'react'

interface NetworkQualityBadgeProps {
  quality: 'excellent' | 'good' | 'poor' | 'unknown'
}

const QUALITY_CONFIG = {
  excellent: { label: 'Excellent', color: 'var(--success)', bars: 3 },
  good: { label: 'Good', color: 'var(--warning)', bars: 2 },
  poor: { label: 'Lemah', color: 'var(--critical)', bars: 1 },
  unknown: { label: '—', color: 'var(--text-secondary)', bars: 0 },
}

export function NetworkQualityBadge({ quality }: NetworkQualityBadgeProps): React.JSX.Element {
  const cfg = QUALITY_CONFIG[quality]
  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: 5,
        padding: '2px 8px',
        borderRadius: 'var(--radius-full)',
        background: 'var(--surface-subtle)',
      }}
    >
      <div style={{ display: 'flex', alignItems: 'flex-end', gap: 2, height: 12 }}>
        {[1, 2, 3].map(bar => (
          <div
            key={bar}
            style={{
              width: 3,
              height: bar === 1 ? 4 : bar === 2 ? 8 : 12,
              borderRadius: 1,
              background: bar <= cfg.bars ? cfg.color : 'var(--border)',
              transition: 'background 0.3s',
            }}
          />
        ))}
      </div>
      <span style={{ fontSize: 14, color: cfg.color }}>{cfg.label}</span>
    </div>
  )
}
