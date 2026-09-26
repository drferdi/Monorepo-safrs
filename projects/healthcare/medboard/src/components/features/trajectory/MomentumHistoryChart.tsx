'use client'

import { formatDateDM } from '@/lib/format'
import type { MomentumSnapshot } from '@/types/abyss/trajectory'
import { MOMENTUM_LEVEL_CONFIG } from '@/types/abyss/trajectory'

// ── Constants ─────────────────────────────────────────────────────────────────

const CHART_W = 280
const CHART_H = 72
const PAD = { top: 8, right: 8, bottom: 16, left: 28 }
const INNER_W = CHART_W - PAD.left - PAD.right
const INNER_H = CHART_H - PAD.top - PAD.bottom

// ── Helpers ───────────────────────────────────────────────────────────────────

function toX(i: number, total: number): number {
  if (total < 2) return PAD.left + INNER_W / 2
  return PAD.left + (i / (total - 1)) * INNER_W
}

function toY(score: number): number {
  return PAD.top + INNER_H - (Math.min(100, Math.max(0, score)) / 100) * INNER_H
}

function scoreToColor(score: number): string {
  if (score >= 80) return 'var(--c-critical)'
  if (score >= 60) return 'var(--c-critical)'
  if (score >= 40) return 'var(--c-asesmen)'
  if (score >= 20) return 'var(--c-warning)'
  return 'var(--c-ok)'
}


// ── Component ─────────────────────────────────────────────────────────────────

interface MomentumHistoryChartProps {
  history: MomentumSnapshot[]
}

export function MomentumHistoryChart({ history }: MomentumHistoryChartProps) {
  if (history.length < 2) return null

  const lastScore = history[history.length - 1].score
  const lastLevel = history[history.length - 1].level
  const strokeColor = scoreToColor(lastScore)
  const levelCfg = MOMENTUM_LEVEL_CONFIG[lastLevel]

  // Area path: line + close to bottom
  const linePts = history.map((s, i) =>
    `${toX(i, history.length).toFixed(1)},${toY(s.score).toFixed(1)}`
  )
  const areaPath =
    `M${toX(0, history.length).toFixed(1)},${(PAD.top + INNER_H).toFixed(1)} ` +
    `L${linePts.join(' L')} ` +
    `L${toX(history.length - 1, history.length).toFixed(1)},${(PAD.top + INNER_H).toFixed(1)} Z`

  const linePath = `M${linePts.join(' L')}`

  // Gradient id — unique per render
  const gradId = 'mhc-grad'

  return (
    <div
      style={{
        borderRadius: 8,
        border: '1px solid var(--line-base)',
        background: 'var(--bg-card)',
        padding: '14px 16px',
      }}
      aria-label="Riwayat skor momentum klinis"
    >
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
        <div
          style={{
            fontSize: 10,
            fontFamily: 'var(--font-mono)',
            letterSpacing: '0.18em',
            textTransform: 'uppercase',
            color: 'var(--text-muted)',
          }}
        >
          Riwayat Momentum
        </div>
        <span
          style={{
            fontSize: 10,
            fontFamily: 'var(--font-mono)',
            color: levelCfg.color,
            fontWeight: 600,
          }}
        >
          {lastScore.toFixed(0)} · {levelCfg.label}
        </span>
      </div>

      <svg width="100%" viewBox={`0 0 ${CHART_W} ${CHART_H}`} style={{ display: 'block' }}>
        <defs>
          <linearGradient id={gradId} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={strokeColor} stopOpacity={0.3} />
            <stop offset="100%" stopColor={strokeColor} stopOpacity={0.02} />
          </linearGradient>
        </defs>

        {/* Y grid lines at 25, 50, 75 */}
        {[25, 50, 75].map((v) => (
          <line
            key={v}
            x1={PAD.left} y1={toY(v).toFixed(1)}
            x2={PAD.left + INNER_W} y2={toY(v).toFixed(1)}
            stroke="var(--line-base)" strokeWidth={0.6} opacity={0.5}
          />
        ))}

        {/* Area fill */}
        <path d={areaPath} fill={`url(#${gradId})`} />

        {/* Line */}
        <path d={linePath} fill="none" stroke={strokeColor} strokeWidth={1.5} strokeLinejoin="round" strokeLinecap="round" />

        {/* Data dots */}
        {history.map((s, i) => {
          const dotColor = scoreToColor(s.score)
          return (
            <circle key={i} cx={toX(i, history.length).toFixed(1)} cy={toY(s.score).toFixed(1)} r={2.5} fill={dotColor}>
              <title>{formatDateDM(s.visitDate)}: {s.score.toFixed(0)} — {MOMENTUM_LEVEL_CONFIG[s.level].label}</title>
            </circle>
          )
        })}

        {/* Y labels */}
        {[0, 50, 100].map((v) => (
          <text key={v} x={PAD.left - 3} y={toY(v).toFixed(1)} textAnchor="end" dominantBaseline="middle" fontSize={7} fill="var(--text-muted)" fontFamily="var(--font-mono)">
            {v}
          </text>
        ))}

        {/* X date labels: first + last */}
        <text x={PAD.left} y={CHART_H - 1} textAnchor="start" fontSize={7} fill="var(--text-muted)" fontFamily="var(--font-mono)">
          {formatDateDM(history[0].visitDate)}
        </text>
        <text x={PAD.left + INNER_W} y={CHART_H - 1} textAnchor="end" fontSize={7} fill="var(--text-muted)" fontFamily="var(--font-mono)">
          {formatDateDM(history[history.length - 1].visitDate)}
        </text>
      </svg>
    </div>
  )
}
