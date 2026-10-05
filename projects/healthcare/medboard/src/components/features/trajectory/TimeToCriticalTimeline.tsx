// Drferdi — TimeToCriticalTimeline
/**
 * TimeToCriticalTimeline
 *
 * Shows estimated time-to-critical (ETA) for each vital parameter that has
 * a non-null estimate. Color-coded by urgency: <24h red, 24–72h orange,
 * 72–168h amber, >168h green. Hides vitals with no estimate.
 */

'use client'

import type { TimeToCriticalEstimate } from '@/types/abyss/trajectory'
import {
  VITAL_PARAM_LABELS,
  formatETAHours,
  getETAUrgencyColor,
} from '@/types/abyss/trajectory'

interface TimeToCriticalTimelineProps {
  timeToCritical: TimeToCriticalEstimate
  className?: string
}

// Map TimeToCriticalEstimate keys → VitalParam labels
const ETA_PARAM_MAP: { key: keyof TimeToCriticalEstimate; param: string }[] = [
  { key: 'sbp_hours_to_critical', param: 'sbp' },
  { key: 'dbp_hours_to_critical', param: 'dbp' },
  { key: 'hr_hours_to_critical', param: 'hr' },
  { key: 'rr_hours_to_critical', param: 'rr' },
  { key: 'temp_hours_to_critical', param: 'temp' },
  { key: 'gds_hours_to_critical', param: 'glucose' },
  { key: 'spo2_hours_to_critical', param: 'spo2' },
]

export function TimeToCriticalTimeline({ timeToCritical, className }: TimeToCriticalTimelineProps) {
  const entries = ETA_PARAM_MAP
    .map(({ key, param }) => ({
      param,
      hours: timeToCritical[key],
      label: VITAL_PARAM_LABELS[param]?.label ?? param,
      unit: VITAL_PARAM_LABELS[param]?.unit ?? '',
    }))
    .filter(e => e.hours !== null)
    .sort((a, b) => (a.hours ?? Infinity) - (b.hours ?? Infinity))

  if (entries.length === 0) {
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
        <div style={{ fontSize: 12, fontFamily: 'var(--font-mono)', letterSpacing: '0.18em', textTransform: 'uppercase', color: 'var(--text-muted)', marginBottom: 6 }}>
          Estimasi Waktu ke Kritis
        </div>
        <div style={{ fontSize: 14, color: 'var(--text-muted)' }}>
          Tidak ada vital yang mendekati ambang kritis.
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
          fontSize: 12,
          fontFamily: 'var(--font-mono)',
          letterSpacing: '0.18em',
          textTransform: 'uppercase',
          color: 'var(--text-muted)',
          marginBottom: 12,
        }}
      >
        Estimasi Waktu ke Kritis
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
        {entries.map(({ param, hours, label }) => {
          const color = getETAUrgencyColor(hours)
          const pct = hours === null ? 0 : Math.max(4, Math.min(100, 100 - (hours / 168) * 100))

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
                <span style={{ fontSize: 12, color: 'var(--text-main)' }}>{label}</span>
                <span
                  style={{
                    fontSize: 12,
                    fontFamily: 'var(--font-mono)',
                    fontWeight: 600,
                    color,
                  }}
                >
                  {formatETAHours(hours)}
                </span>
              </div>
              {/* Progress bar — higher fill = more urgent */}
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
                    width: `${pct}%`,
                    borderRadius: 2,
                    background: color,
                    transition: 'width 0.5s ease',
                  }}
                />
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}
