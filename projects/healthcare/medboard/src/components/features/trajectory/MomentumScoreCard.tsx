// Drferdi — MomentumScoreCard
/**
 * MomentumScoreCard
 *
 * Displays the CME momentum level and composite score (0–100) as a
 * circular gauge with color-coded ring based on momentum severity.
 * Narrative text in Bahasa Indonesia.
 */

'use client'

import type { MomentumAnalysis } from '@/types/abyss/trajectory'
import { MOMENTUM_LEVEL_CONFIG } from '@/types/abyss/trajectory'

interface MomentumScoreCardProps {
  momentum: MomentumAnalysis
  className?: string
}

export function MomentumScoreCard({ momentum, className }: MomentumScoreCardProps) {
  const config = MOMENTUM_LEVEL_CONFIG[momentum.level] ?? MOMENTUM_LEVEL_CONFIG.INSUFFICIENT_DATA
  const score = Math.round(momentum.score)
  const radius = 36
  const circumference = 2 * Math.PI * radius
  const offset = circumference - (score / 100) * circumference

  return (
    <div
      className={className}
      style={{
        borderRadius: 8,
        border: `1px solid ${config.color}40`,
        background: config.bg,
        padding: '20px 24px',
        display: 'flex',
        alignItems: 'center',
        gap: 20,
      }}
    >
      {/* Circular gauge */}
      <div style={{ flexShrink: 0, position: 'relative', width: 88, height: 88 }}>
        <svg width={88} height={88} viewBox="0 0 88 88" aria-hidden="true">
          {/* Background ring */}
          <circle
            cx={44}
            cy={44}
            r={radius}
            fill="none"
            stroke="var(--line-base)"
            strokeWidth={8}
          />
          {/* Score arc */}
          <circle
            cx={44}
            cy={44}
            r={radius}
            fill="none"
            stroke={config.color}
            strokeWidth={8}
            strokeLinecap="round"
            strokeDasharray={circumference}
            strokeDashoffset={offset}
            transform="rotate(-90 44 44)"
            style={{ transition: 'stroke-dashoffset 0.6s ease' }}
          />
        </svg>
        {/* Score number */}
        <div
          style={{
            position: 'absolute',
            inset: 0,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            flexDirection: 'column',
          }}
        >
          <span
            style={{
              fontSize: 20,
              fontWeight: 700,
              fontFamily: 'var(--font-mono)',
              color: config.color,
              lineHeight: 1,
            }}
          >
            {score}
          </span>
          <span style={{ fontSize: 12, color: 'var(--text-muted)', letterSpacing: '0.05em' }}>
            /100
          </span>
        </div>
      </div>

      {/* Label + narrative */}
      <div style={{ minWidth: 0, flex: 1 }}>
        <div
          style={{
            fontSize: 12,
            fontFamily: 'var(--font-mono)',
            letterSpacing: '0.18em',
            textTransform: 'uppercase',
            color: 'var(--text-muted)',
            marginBottom: 4,
          }}
        >
          Momentum Klinis
        </div>
        <div
          style={{
            fontSize: 14,
            fontWeight: 600,
            color: config.color,
            marginBottom: 6,
          }}
        >
          {config.label}
        </div>
        <p
          style={{
            fontSize: 12,
            color: 'var(--text-muted)',
            lineHeight: 1.5,
            margin: 0,
            overflow: 'hidden',
            display: '-webkit-box',
            WebkitLineClamp: 2,
            WebkitBoxOrient: 'vertical',
          }}
        >
          {momentum.narrative}
        </p>
        {!momentum.isReliable && (
          <div
            style={{
              marginTop: 6,
              fontSize: 12,
              color: 'var(--c-warning)',
              fontFamily: 'var(--font-mono)',
            }}
          >
            ⚠ Data terbatas — {momentum.visitCount} kunjungan
          </div>
        )}
      </div>
    </div>
  )
}
