// Drferdi — BaselineDeviationGauge
/**
 * BaselineDeviationGauge
 *
 * Shows each vital's current value vs the patient's personal baseline range
 * (weighted moving average from visit history). Z-score labeled per vital.
 * Color-coded by deviation label: within_baseline → green, extreme_deviation → red.
 */

'use client'

import type { PersonalBaseline } from '@/types/abyss/trajectory'
import { VITAL_PARAM_LABELS, type BaselineParam, type BaselineStat } from '@/types/abyss/trajectory'

interface BaselineDeviationGaugeProps {
  baseline: PersonalBaseline
  className?: string
}

const DEVIATION_CONFIG = {
  within_baseline: { label: 'Normal', color: 'var(--c-ok)', width: '10%' },
  mild_deviation: { label: 'Ringan', color: 'var(--c-warning)', width: '35%' },
  significant_deviation: { label: 'Signifikan', color: 'var(--c-asesmen)', width: '65%' },
  extreme_deviation: { label: 'Ekstrem', color: 'var(--c-critical)', width: '92%' },
} as const

type DeviationLabel = keyof typeof DEVIATION_CONFIG

export function BaselineDeviationGauge({ baseline, className }: BaselineDeviationGaugeProps) {
  const paramEntries = Object.entries(baseline.params) as [BaselineParam, BaselineStat][]

  if (paramEntries.length === 0) {
    return (
      <div
        className={className}
        style={{
          borderRadius: 8,
          border: '1px solid var(--line-base)',
          background: 'var(--bg-card)',
          padding: '16px 20px',
        }}
      >
        <div style={{ fontSize: 11, fontFamily: 'var(--font-mono)', color: 'var(--text-muted)', marginBottom: 6 }}>
          Deviasi Baseline Personal
        </div>
        <div style={{ fontSize: 13, color: 'var(--text-muted)' }}>
          Baseline belum terhitung — data kunjungan tidak cukup.
        </div>
      </div>
    )
  }

  return (
    <div
      className={className}
      style={{
        borderRadius: 8,
        border: '1px solid var(--line-base)',
        background: 'var(--bg-card)',
        padding: '16px 20px',
      }}
    >
      <div
        style={{
          fontSize: 11,
          fontFamily: 'var(--font-mono)',
          color: 'var(--text-muted)',
          marginBottom: 12,
        }}
      >
        Deviasi Baseline Personal
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
        {paramEntries.map(([param, stat]) => {
          const cfg = DEVIATION_CONFIG[stat.deviationLabel as DeviationLabel] ?? DEVIATION_CONFIG.within_baseline
          const zLabel = stat.currentZScore !== null
            ? `Z=${stat.currentZScore > 0 ? '+' : ''}${stat.currentZScore.toFixed(1)}`
            : 'Z=—'
          const vitLabel = VITAL_PARAM_LABELS[param]?.label ?? param
          const vitUnit = VITAL_PARAM_LABELS[param]?.unit ?? ''

          return (
            <div key={param}>
              <div
                style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'baseline',
                  marginBottom: 4,
                }}
              >
                <div style={{ display: 'flex', gap: 8, alignItems: 'baseline' }}>
                  <span style={{ fontSize: 11, color: 'var(--text-main)' }}>{vitLabel}</span>
                  <span style={{ fontSize: 11, color: 'var(--text-muted)', fontFamily: 'var(--font-mono)' }}>
                    μ={stat.mean.toFixed(1)} {vitUnit}
                  </span>
                </div>
                <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                  <span style={{ fontSize: 11, fontFamily: 'var(--font-mono)', color: 'var(--text-muted)' }}>
                    {zLabel}
                  </span>
                  <span
                    style={{
                      fontSize: 11,
                      fontFamily: 'var(--font-mono)',
                      color: cfg.color,
                      border: `1px solid color-mix(in srgb, ${cfg.color} 35%, transparent)`,
                      borderRadius: 3,
                      padding: '1px 6px',
                    }}
                  >
                    {cfg.label}
                  </span>
                </div>
              </div>
              {/* Deviation bar */}
              <div
                style={{
                  height: 4,
                  borderRadius: 2,
                  background: 'var(--line-base)',
                  overflow: 'hidden',
                }}
              >
                <div
                  style={{
                    height: '100%',
                    width: cfg.width,
                    borderRadius: 2,
                    background: cfg.color,
                    transition: 'width 0.5s ease',
                  }}
                />
              </div>
            </div>
          )
        })}
      </div>

      <div
        style={{
          marginTop: 10,
          fontSize: 11,
          color: 'var(--text-muted)',
          fontFamily: 'var(--font-mono)',
        }}
      >
        Baseline dari {baseline.visitCount} kunjungan · {new Date(baseline.computedAt).toLocaleDateString('id-ID')}
      </div>
    </div>
  )
}
