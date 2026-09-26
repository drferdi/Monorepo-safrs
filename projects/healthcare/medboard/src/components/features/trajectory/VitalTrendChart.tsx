'use client'

import { useState } from 'react'
import { formatDateDM } from '@/lib/format'
import type { VitalSnapshot } from '@/types/abyss/trajectory'
import type { PersonalBaseline } from '@/lib/clinical/personal-baseline'
import { VITAL_PARAM_LABELS } from '@/types/abyss/trajectory'

// ── Constants ─────────────────────────────────────────────────────────────────

const CHART_W = 280
const CHART_H = 80
const PAD = { top: 6, right: 8, bottom: 18, left: 32 }
const INNER_W = CHART_W - PAD.left - PAD.right
const INNER_H = CHART_H - PAD.top - PAD.bottom

type VitalKey = 'sbp' | 'dbp' | 'hr' | 'rr' | 'temp' | 'glucose' | 'spo2'

const VITAL_KEYS: VitalKey[] = ['sbp', 'dbp', 'hr', 'rr', 'temp', 'glucose', 'spo2']

// ── Helpers ───────────────────────────────────────────────────────────────────

function toX(i: number, total: number): number {
  if (total < 2) return PAD.left + INNER_W / 2
  return PAD.left + (i / (total - 1)) * INNER_W
}

function toY(val: number, min: number, max: number): number {
  const range = max - min || 1
  return PAD.top + INNER_H - ((val - min) / range) * INNER_H
}


// ── Single vital chart ────────────────────────────────────────────────────────

function VitalLineChart({
  vitalKey,
  snapshots,
  baseline,
}: {
  vitalKey: VitalKey
  snapshots: VitalSnapshot[]
  baseline: PersonalBaseline
}) {
  const meta = VITAL_PARAM_LABELS[vitalKey] ?? { label: vitalKey, unit: '' }

  // Extract non-null values with their index
  const pts = snapshots
    .map((s, i) => ({ i, val: s[vitalKey] }))
    .filter((p): p is { i: number; val: number } => p.val != null)

  if (pts.length < 2) {
    return (
      <div style={{ padding: '8px 0', color: 'var(--text-muted)', fontSize: 10 }}>
        {meta.label} — data tidak cukup
      </div>
    )
  }

  const vals = pts.map((p) => p.val)
  const bStat = baseline.params[vitalKey as keyof typeof baseline.params]
  const bMean = bStat?.mean
  const bStd = bStat?.stdDev

  // Y range: include baseline band if available
  const allVals = bMean != null && bStd != null
    ? [...vals, bMean - bStd, bMean + bStd]
    : vals
  const yMin = Math.min(...allVals) * 0.97
  const yMax = Math.max(...allVals) * 1.03

  // Line path
  const linePts = pts.map((p) => `${toX(p.i, snapshots.length).toFixed(1)},${toY(p.val, yMin, yMax).toFixed(1)}`).join(' ')

  // Baseline band polygon
  let bandPath: string | null = null
  if (bMean != null && bStd != null) {
    const lo = bMean - bStd
    const hi = bMean + bStd
    const x0 = PAD.left
    const x1 = PAD.left + INNER_W
    const yLo = toY(lo, yMin, yMax)
    const yHi = toY(hi, yMin, yMax)
    bandPath = `M${x0},${yHi} L${x1},${yHi} L${x1},${yLo} L${x0},${yLo} Z`
  }

  // Determine line color — last value vs baseline
  const lastVal = vals[vals.length - 1]
  let lineColor = 'var(--c-asesmen)'
  if (bMean != null && bStd != null) {
    if (lastVal > bMean + bStd) lineColor = 'var(--c-critical)'
    else if (lastVal < bMean - bStd) lineColor = 'var(--c-warning)'
    else lineColor = 'var(--c-ok)'
  }

  // X-axis date labels (first + last)
  const xLabel0 = formatDateDM(snapshots[pts[0].i].visitDate)
  const xLabel1 = formatDateDM(snapshots[pts[pts.length - 1].i].visitDate)

  return (
    <div style={{ marginBottom: 4 }}>
      <div style={{ fontSize: 10, color: 'var(--text-muted)', marginBottom: 2, fontFamily: 'var(--font-mono)' }}>
        {meta.label} <span style={{ opacity: 0.6 }}>({meta.unit})</span>
      </div>
      <svg width="100%" viewBox={`0 0 ${CHART_W} ${CHART_H}`} style={{ display: 'block' }}>
        {/* Baseline band */}
        {bandPath && (
          <path d={bandPath} fill="color-mix(in srgb, var(--c-asesmen) 8%, transparent)" />
        )}

        {/* Baseline mean line */}
        {bMean != null && (
          <line
            x1={PAD.left} y1={toY(bMean, yMin, yMax).toFixed(1)}
            x2={PAD.left + INNER_W} y2={toY(bMean, yMin, yMax).toFixed(1)}
            stroke="var(--c-asesmen)" strokeWidth={0.8} strokeDasharray="3 2" opacity={0.5}
          />
        )}

        {/* Data line */}
        <polyline
          points={linePts}
          fill="none"
          stroke={lineColor}
          strokeWidth={1.5}
          strokeLinecap="round"
          strokeLinejoin="round"
        />

        {/* Data dots */}
        {pts.map((p) => (
          <circle
            key={p.i}
            cx={toX(p.i, snapshots.length).toFixed(1)}
            cy={toY(p.val, yMin, yMax).toFixed(1)}
            r={2.5}
            fill={lineColor}
          >
            <title>{meta.label}: {p.val} {meta.unit}</title>
          </circle>
        ))}

        {/* Y axis label: last value */}
        <text
          x={PAD.left - 2}
          y={toY(lastVal, yMin, yMax).toFixed(1)}
          textAnchor="end"
          dominantBaseline="middle"
          fontSize={7.5}
          fill={lineColor}
          fontFamily="var(--font-mono)"
        >
          {lastVal.toFixed(0)}
        </text>

        {/* X axis date labels */}
        <text x={PAD.left} y={CHART_H - 2} textAnchor="start" fontSize={7} fill="var(--text-muted)" fontFamily="var(--font-mono)">
          {xLabel0}
        </text>
        <text x={PAD.left + INNER_W} y={CHART_H - 2} textAnchor="end" fontSize={7} fill="var(--text-muted)" fontFamily="var(--font-mono)">
          {xLabel1}
        </text>
      </svg>
    </div>
  )
}

// ── Main component ─────────────────────────────────────────────────────────────

interface VitalTrendChartProps {
  snapshots: VitalSnapshot[]
  baseline: PersonalBaseline
}

export function VitalTrendChart({ snapshots, baseline }: VitalTrendChartProps) {
  const [activeKey, setActiveKey] = useState<VitalKey>('sbp')

  if (snapshots.length < 2) return null

  return (
    <div
      style={{
        borderRadius: 8,
        border: '1px solid var(--line-base)',
        background: 'var(--bg-card)',
        padding: '14px 16px',
      }}
      aria-label="Tren nilai vital lintas kunjungan"
    >
      <div
        style={{
          fontSize: 10,
          fontFamily: 'var(--font-mono)',
          letterSpacing: '0.18em',
          textTransform: 'uppercase',
          color: 'var(--text-muted)',
          marginBottom: 10,
        }}
      >
        Tren Vital — {snapshots.length} Kunjungan
      </div>

      {/* Vital selector tabs */}
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4, marginBottom: 12 }}>
        {VITAL_KEYS.map((k) => {
          const meta = VITAL_PARAM_LABELS[k]
          const isActive = k === activeKey
          return (
            <button
              key={k}
              onClick={() => setActiveKey(k)}
              style={{
                fontSize: 9,
                fontFamily: 'var(--font-mono)',
                padding: '2px 8px',
                borderRadius: 4,
                border: isActive ? '1px solid var(--accent)' : '1px solid var(--line-base)',
                background: isActive ? 'var(--c-asesmen-soft)' : 'transparent',
                color: isActive ? 'var(--accent)' : 'var(--text-muted)',
                cursor: 'pointer',
              }}
            >
              {meta?.label ?? k}
            </button>
          )
        })}
      </div>

      <VitalLineChart vitalKey={activeKey} snapshots={snapshots} baseline={baseline} />

      {/* Legend */}
      <div style={{ display: 'flex', gap: 12, marginTop: 6, flexWrap: 'wrap' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
          <div style={{ width: 16, height: 2, background: 'var(--c-asesmen)', opacity: 0.5 }} />
          <span style={{ fontSize: 8, color: 'var(--text-muted)' }}>Baseline ±1SD</span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
          <div style={{ width: 16, height: 2, background: 'var(--c-ok)' }} />
          <span style={{ fontSize: 8, color: 'var(--text-muted)' }}>Dalam baseline</span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
          <div style={{ width: 16, height: 2, background: 'var(--c-critical)' }} />
          <span style={{ fontSize: 8, color: 'var(--text-muted)' }}>Di luar baseline</span>
        </div>
      </div>
    </div>
  )
}
