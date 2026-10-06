// Drferdi — ClinicalTrajectoryV1Panel
'use client'

import type { CSSProperties, ReactNode } from 'react'

import type { ClinicalTrajectoryV1 } from '@/types/abyss/clinical-trajectory'

type Props = {
  trajectory: ClinicalTrajectoryV1 | null | undefined
  className?: string
}

const RISK_STYLES: Record<string, { color: string; border: string; bg: string }> = {
  improving: {
    color: 'var(--c-ok)',
    border: 'rgba(16,185,129,0.35)',
    bg: 'rgba(16,185,129,0.1)',
  },
  stable: {
    color: 'var(--text-main)',
    border: 'rgba(255,255,255,0.12)',
    bg: 'rgba(255,255,255,0.04)',
  },
  worsening: {
    color: 'var(--c-critical)',
    border: 'rgba(239,68,68,0.35)',
    bg: 'rgba(239,68,68,0.1)',
  },
  fluctuating: {
    color: 'var(--c-warning)',
    border: 'rgba(245,158,11,0.35)',
    bg: 'rgba(245,158,11,0.1)',
  },
  unknown: {
    color: 'var(--text-muted)',
    border: 'rgba(255,255,255,0.12)',
    bg: 'rgba(255,255,255,0.03)',
  },
}

const BAND_STYLES: Record<string, { color: string; border: string; bg: string }> = {
  low: RISK_STYLES.stable,
  watch: RISK_STYLES.fluctuating,
  concerning: RISK_STYLES.worsening,
  critical: RISK_STYLES.worsening,
  unknown: RISK_STYLES.unknown,
}

function chipStyle(entry: { color: string; border: string; bg: string }): CSSProperties {
  return {
    border: `1px solid ${entry.border}`,
    background: entry.bg,
    color: entry.color,
  }
}

function formatValue(value: unknown): string {
  if (Array.isArray(value)) return value.join(', ')
  if (value === null || value === undefined || value === '') return '—'
  return String(value).replace(/_/g, ' ')
}

export function ClinicalTrajectoryV1Panel({ trajectory, className }: Props) {
  if (!trajectory) {
    return (
      <div
        className={className}
        style={{
          border: '1px dashed var(--line-base)',
          borderRadius: 12,
          padding: 16,
          background: 'var(--bg-card)',
          color: 'var(--text-muted)',
        }}
        aria-label="ClinicalTrajectory v1 empty state"
      >
        Pilih pasien untuk melihat ClinicalTrajectory v1.
      </div>
    )
  }

  const directionStyle = RISK_STYLES[trajectory.response.direction] ?? RISK_STYLES.unknown
  const severityStyle = BAND_STYLES[trajectory.response.severityBand] ?? BAND_STYLES.unknown

  return (
    <section
      className={className}
      aria-label="ClinicalTrajectory v1 review panel"
      style={{
        position: 'relative',
        overflow: 'hidden',
        borderRadius: 16,
        border: '1px solid var(--line-base)',
        background: 'linear-gradient(180deg, rgba(255,255,255,0.03), rgba(255,255,255,0.015))',
        padding: 18,
        boxShadow: '0 18px 40px rgba(0,0,0,0.28)',
      }}
    >
      <div
        aria-hidden="true"
        style={{
          position: 'absolute',
          inset: 0,
          background:
            'radial-gradient(circle at top right, rgba(16,185,129,0.12), transparent 34%), radial-gradient(circle at bottom left, rgba(59,130,246,0.08), transparent 30%)',
          pointerEvents: 'none',
        }}
      />

      <div style={{ position: 'relative', display: 'grid', gap: 14 }}>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 10, alignItems: 'center' }}>
          <div style={{ flex: '1 1 240px' }}>
            <div
              style={{
                fontSize: 11,
                color: 'var(--text-muted)',
                marginBottom: 4,
              }}
            >
              ClinicalTrajectory v1
            </div>
            <div style={{ fontSize: 15, fontWeight: 600, color: 'var(--text-main)' }}>
              {formatValue(trajectory.response.direction)}
            </div>
            <div style={{ color: 'var(--text-muted)', marginTop: 4, lineHeight: 1.5 }}>
              {trajectory.response.summary}
            </div>
          </div>

          <div
            data-metric="ct-direction"
            style={{
              ...chipStyle(directionStyle),
              borderRadius: 999,
              padding: '8px 12px',
              fontSize: 11,
            }}
          >
            {trajectory.response.direction}
          </div>
          <div
            data-metric="ct-severity"
            style={{
              ...chipStyle(severityStyle),
              borderRadius: 999,
              padding: '8px 12px',
              fontSize: 11,
            }}
          >
            {trajectory.response.severityBand}
          </div>
        </div>

        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))',
            gap: 10,
          }}
        >
          <MiniStat label="Momentum" value={trajectory.response.momentum} />
          <MiniStat label="Pattern" value={trajectory.response.instabilityPattern} />
          <MiniStat label="Responsiveness" value={trajectory.response.treatmentResponsiveness} />
          <MiniStat label="Confidence" value={trajectory.response.confidence} />
        </div>

        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
            gap: 10,
          }}
        >
          <PanelBlock title="Evidence Trail">
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
              {trajectory.response.evidenceRefs.map((ref) => (
                <span
                  key={ref}
                  data-metric="ct-evidence-ref"
                  style={{
                    ...chipStyle(RISK_STYLES.stable),
                    borderRadius: 999,
                    padding: '6px 10px',
                    fontSize: 11,
                  }}
                >
                  {ref}
                </span>
              ))}
            </div>
          </PanelBlock>

          <PanelBlock title="Quality">
            <div style={{ display: 'grid', gap: 6, color: 'var(--text-muted)' }}>
              <div data-metric="ct-quality-score">
                Completeness: {trajectory.quality?.completenessScore ?? '—'}
              </div>
              <div data-metric="ct-quality-missing">
                Missing: {formatValue(trajectory.quality?.missingFields ?? [])}
              </div>
              <div data-metric="ct-quality-notes">
                Notes: {formatValue(trajectory.quality?.notes ?? [])}
              </div>
            </div>
          </PanelBlock>
        </div>

        <div
          style={{
            borderRadius: 12,
            border: '1px solid rgba(255,255,255,0.08)',
            background: 'rgba(255,255,255,0.03)',
            padding: 12,
            color: 'var(--text-muted)',
            lineHeight: 1.55,
          }}
        >
          {trajectory.response.requiresEscalation
            ? 'Clinician review recommended. Respiratory or safety risk context is visible.'
            : 'Consumer-safe longitudinal evidence view only. No autonomous action implied.'}
        </div>
      </div>
    </section>
  )
}

function MiniStat({ label, value }: { label: string; value: string }) {
  return (
    <div
      style={{
        border: '1px solid rgba(255,255,255,0.08)',
        borderRadius: 12,
        background: 'rgba(255,255,255,0.03)',
        padding: 12,
      }}
    >
      <div
        style={{
          fontSize: 11,
          color: 'var(--text-muted)',
          marginBottom: 6,
        }}
      >
        {label}
      </div>
      <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-main)' }}>{value}</div>
    </div>
  )
}

function PanelBlock({ title, children }: { title: string; children: ReactNode }) {
  return (
    <div
      style={{
        border: '1px solid rgba(255,255,255,0.08)',
        borderRadius: 12,
        background: 'rgba(255,255,255,0.02)',
        padding: 12,
      }}
    >
      <div
        style={{
          fontSize: 11,
          color: 'var(--text-muted)',
          marginBottom: 8,
        }}
      >
        {title}
      </div>
      {children}
    </div>
  )
}
