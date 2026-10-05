// Drferdi — ConvergenceHeatmap: grid vital params × worsening/stable/improving
'use client'

import type { ConvergenceParam, ConvergenceResult } from '@/lib/clinical/convergence-detector'
import { VITAL_PARAM_LABELS } from '@/types/abyss/trajectory'

// ── Params ────────────────────────────────────────────────────────────────────

const PARAMS = ['sbp', 'dbp', 'hr', 'rr', 'temp', 'glucose', 'spo2'] as const

const COLUMNS = [
  {
    key: 'worsening',
    label: 'Memburuk',
    color: 'var(--c-critical)',
    bg: 'color-mix(in srgb, var(--c-critical) 14%, transparent)',
  },
  {
    key: 'stable',
    label: 'Stabil',
    color: 'var(--text-muted)',
    bg: 'color-mix(in srgb, var(--text-muted) 8%, transparent)',
  },
  {
    key: 'improving',
    label: 'Membaik',
    color: 'var(--c-ok)',
    bg: 'color-mix(in srgb, var(--c-ok) 12%, transparent)',
  },
] as const

type ColKey = typeof COLUMNS[number]['key']

function classify(param: ConvergenceParam, convergence: ConvergenceResult): ColKey {
  if (convergence.worseningParams.includes(param)) return 'worsening'
  if (convergence.improvingParams.includes(param)) return 'improving'
  return 'stable'
}

// ── Component ─────────────────────────────────────────────────────────────────

interface ConvergenceHeatmapProps {
  convergence: ConvergenceResult
}

export function ConvergenceHeatmap({ convergence }: ConvergenceHeatmapProps) {
  return (
    <div
      style={{
        borderRadius: 8,
        border: '1px solid var(--line-base)',
        background: 'var(--bg-card)',
        padding: '14px 16px',
      }}
      aria-label="Heatmap konvergensi parameter vital"
    >
      {/* Header */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          marginBottom: 10,
        }}
      >
        <div
          style={{
            fontSize: 12,
            fontFamily: 'var(--font-mono)',
            letterSpacing: '0.18em',
            textTransform: 'uppercase',
            color: 'var(--text-muted)',
          }}
        >
          Konvergensi Parameter Vital
        </div>
        <span
          style={{
            fontSize: 12,
            fontFamily: 'var(--font-mono)',
            color: 'var(--text-muted)',
            opacity: 0.7,
          }}
        >
          skor {convergence.convergenceScore.toFixed(0)}
        </span>
      </div>

      {/* Column headers */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: '72px repeat(3, 1fr)',
          gap: 4,
          marginBottom: 4,
        }}
      >
        <div />
        {COLUMNS.map((col) => (
          <div
            key={col.key}
            style={{
              fontSize: 12,
              fontFamily: 'var(--font-mono)',
              letterSpacing: '0.1em',
              textTransform: 'uppercase',
              color: col.color,
              textAlign: 'center',
            }}
          >
            {col.label}
          </div>
        ))}
      </div>

      {/* Rows */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
        {PARAMS.map((param) => {
          const status = classify(param, convergence)
          const meta = VITAL_PARAM_LABELS[param] ?? { label: param, unit: '' }

          return (
            <div
              key={param}
              style={{
                display: 'grid',
                gridTemplateColumns: '72px repeat(3, 1fr)',
                gap: 4,
                alignItems: 'center',
              }}
            >
              {/* Label */}
              <span
                style={{
                  fontSize: 12,
                  color: 'var(--text-muted)',
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                  whiteSpace: 'nowrap',
                }}
              >
                {meta.label}
              </span>

              {/* Cells */}
              {COLUMNS.map((col) => {
                const active = status === col.key
                return (
                  <div
                    key={col.key}
                    style={{
                      height: 22,
                      borderRadius: 4,
                      background: active ? col.bg : 'transparent',
                      border: active
                        ? `1px solid color-mix(in srgb, ${col.color} 25%, transparent)`
                        : '1px solid transparent',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                    }}
                    aria-label={active ? `${meta.label}: ${col.label}` : undefined}
                  >
                    {active && (
                      <span style={{ fontSize: 12, color: col.color, fontWeight: 600 }}>
                        ●
                      </span>
                    )}
                  </div>
                )
              })}
            </div>
          )
        })}
      </div>
    </div>
  )
}
