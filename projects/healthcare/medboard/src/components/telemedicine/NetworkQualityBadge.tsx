'use client'

import type React from 'react'

interface NetworkQualityBadgeProps {
  quality: 'excellent' | 'good' | 'poor' | 'unknown'
}

const QUALITY_CONFIG = {
  excellent: { label: 'Excellent', color: '#4ade80', bars: 3 },
  good: { label: 'Good', color: '#facc15', bars: 2 },
  poor: { label: 'Lemah', color: '#f87171', bars: 1 },
  unknown: { label: '—', color: 'var(--text-muted)', bars: 0 },
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
        borderRadius: 6,
        background: 'rgba(255,255,255,0.05)',
        border: '1px solid var(--line-base)',
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
              background: bar <= cfg.bars ? cfg.color : 'rgba(255,255,255,0.15)',
              transition: 'background 0.3s',
            }}
          />
        ))}
      </div>
      <span style={{ fontSize: 13, color: cfg.color }}>{cfg.label}</span>
    </div>
  )
}
