// Drferdi — VitalVelocityRow: mini sparkline + velocity arrow per vital parameter
'use client'

import type { ParamMomentum } from '@/lib/clinical/momentum-engine'
import { VITAL_PARAM_LABELS } from '@/types/abyss/trajectory'

// ── Constants ─────────────────────────────────────────────────────────────────

const SPARK_W = 60
const SPARK_H = 22

// ── Sparkline ─────────────────────────────────────────────────────────────────

function Sparkline({ values, direction }: { values: number[]; direction: ParamMomentum['direction'] }) {
  const strokeColor =
    direction === 'worsening'
      ? 'var(--c-critical)'
      : direction === 'improving'
        ? 'var(--c-ok)'
        : 'var(--text-muted)'

  if (values.length < 2) {
    return (
      <svg width={SPARK_W} height={SPARK_H} aria-hidden="true">
        <line
          x1={4} y1={SPARK_H / 2} x2={SPARK_W - 4} y2={SPARK_H / 2}
          stroke="var(--line-base)" strokeWidth={1.5} strokeDasharray="3 3"
        />
      </svg>
    )
  }

  const min = Math.min(...values)
  const max = Math.max(...values)
  const range = max - min || 1

  const pts = values.map((v, i) => {
    const x = 4 + (i / (values.length - 1)) * (SPARK_W - 8)
    const y = SPARK_H - 3 - ((v - min) / range) * (SPARK_H - 6)
    return `${x.toFixed(1)},${y.toFixed(1)}`
  })

  const [lx, ly] = pts[pts.length - 1].split(',')

  return (
    <svg width={SPARK_W} height={SPARK_H} aria-hidden="true">
      <polyline
        points={pts.join(' ')}
        fill="none"
        stroke={strokeColor}
        strokeWidth={1.5}
        strokeLinecap="round"
        strokeLinejoin="round"
        opacity={0.85}
      />
      <circle cx={lx} cy={ly} r={2.5} fill={strokeColor} />
    </svg>
  )
}

// ── Arrow ─────────────────────────────────────────────────────────────────────

function VelocityArrow({ direction, isAccelerating }: Pick<ParamMomentum, 'direction' | 'isAccelerating'>) {
  if (direction === 'worsening') {
    return (
      <span
        style={{
          fontSize: 14,
          fontWeight: 600,
          color: isAccelerating ? 'var(--c-critical)' : 'var(--c-asesmen)',
          lineHeight: 1,
        }}
        aria-label={isAccelerating ? 'Memburuk cepat' : 'Memburuk'}
      >
        {isAccelerating ? '↑↑' : '↑'}
      </span>
    )
  }
  if (direction === 'improving') {
    return (
      <span
        style={{
          fontSize: 14,
          fontWeight: 600,
          color: isAccelerating ? 'var(--c-ok)' : 'var(--c-ok)',
          lineHeight: 1,
        }}
        aria-label={isAccelerating ? 'Membaik cepat' : 'Membaik'}
      >
        {isAccelerating ? '↓↓' : '↓'}
      </span>
    )
  }
  return (
    <span style={{ fontSize: 14, color: 'var(--text-muted)', lineHeight: 1 }} aria-label="Stabil">
      →
    </span>
  )
}

// ── Row ───────────────────────────────────────────────────────────────────────

interface VitalVelocityRowProps {
  param: ParamMomentum
}

export function VitalVelocityRow({ param }: VitalVelocityRowProps) {
  const meta = VITAL_PARAM_LABELS[param.param] ?? { label: param.param, unit: '' }

  const velAbs = Math.abs(param.velocityPerDay)
  const sign = param.velocityPerDay > 0 ? '+' : ''
  const velocityText =
    velAbs < 0.01 ? '±0' : `${sign}${param.velocityPerDay.toFixed(1)} ${meta.unit}/hr`

  const velColor =
    param.direction === 'worsening'
      ? param.isAccelerating
        ? 'var(--c-critical)'
        : 'var(--c-asesmen)'
      : param.direction === 'improving'
        ? 'var(--c-ok)'
        : 'var(--text-muted)'

  return (
    <div
      style={{
        display: 'grid',
        gridTemplateColumns: '72px 1fr 24px auto',
        alignItems: 'center',
        gap: 8,
        padding: '4px 0',
      }}
    >
      <span style={{ fontSize: 12, color: 'var(--text-muted)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
        {meta.label}
      </span>

      <Sparkline values={param.values} direction={param.direction} />

      <VelocityArrow direction={param.direction} isAccelerating={param.isAccelerating} />

      <span style={{ fontSize: 12, fontFamily: 'var(--font-mono)', color: velColor, whiteSpace: 'nowrap', minWidth: 80, textAlign: 'right' }}>
        {velocityText}
      </span>
    </div>
  )
}
