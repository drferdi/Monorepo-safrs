'use client'

import { useMemo } from 'react'
import type { VisitRecord } from '@/lib/clinical/trajectory-analyzer'
import {
  analyzeTrajectory,
  type ClinicalUrgencyTier,
  type GlobalDeteriorationState,
  type RiskLevel,
  type TrajectoryAnalysis,
} from '@/lib/clinical/trajectory-analyzer'
import {
  BaselineDeviationGauge,
  ConvergencePatternAlert,
  MomentumScoreCard,
} from '@/components/features/trajectory'
import { getTrajectoryHistoryWindow, type ScrapedVisit } from '@/lib/emr/visit-history'
import type { ScreeningAlert } from '@/lib/vitals/instant-red-alerts'

interface TrajectoryPanelProps {
  vitals: {
    sbp: number
    dbp: number
    hr: number
    rr: number
    temp: number
    glucose: number
    spo2: number
  }
  keluhanUtama: string
  rpdSelected: Set<string>
  screeningAlerts: ScreeningAlert[]
  visitHistory?: ScrapedVisit[]
  onClose: () => void
}

const URGENCY_CONFIG: Record<
  ClinicalUrgencyTier,
  { label: string; color: string; bg: string; border: string }
> = {
  low: {
    label: 'ROUTINE 24H',
    color: '#10b981',
    bg: 'rgba(16,185,129,0.1)',
    border: '#10b981',
  },
  moderate: {
    label: 'REVIEW SAME DAY',
    color: '#eab308',
    bg: 'rgba(234,179,8,0.1)',
    border: '#eab308',
  },
  high: {
    label: 'URGENT <6H',
    color: '#f97316',
    bg: 'rgba(249,115,22,0.1)',
    border: '#f97316',
  },
  immediate: {
    label: 'EMERGENCY NOW',
    color: '#ef4444',
    bg: 'rgba(239,68,68,0.15)',
    border: '#ef4444',
  },
}

const DETERIORATION_CONFIG: Record<GlobalDeteriorationState, { label: string; color: string }> = {
  improving: { label: 'MEMBAIK', color: '#10b981' },
  stable: { label: 'STABIL', color: '#06b6d4' },
  deteriorating: { label: 'MEMBURUK', color: '#f97316' },
  critical: { label: 'KRITIS', color: '#ef4444' },
}

const RISK_COLOR: Record<RiskLevel, string> = {
  low: '#10b981',
  moderate: '#eab308',
  high: '#f97316',
  critical: '#ef4444',
}

function riskBar(value: number): string {
  if (value >= 70) return '#ef4444'
  if (value >= 45) return '#f97316'
  return '#10b981'
}

export default function TrajectoryPanel({
  vitals,
  keluhanUtama,
  screeningAlerts,
  visitHistory = [],
  onClose,
}: TrajectoryPanelProps) {
  const analysis: TrajectoryAnalysis = useMemo(() => {
    const trajectoryHistory = getTrajectoryHistoryWindow(visitHistory, true)

    // Convert scraped visits → VisitRecord (oldest first)
    const historicalVisits: VisitRecord[] = trajectoryHistory.map(v => ({
      patient_id: 'session',
      encounter_id: v.encounter_id,
      timestamp: v.date,
      vitals: v.vitals,
      keluhan_utama: v.keluhan_utama,
      diagnosa: v.diagnosa ?? undefined,
      source: 'scrape' as const,
    }))

    const currentVisit: VisitRecord = {
      patient_id: 'session',
      encounter_id: `enc-${Date.now()}`,
      timestamp: new Date().toISOString(),
      vitals: vitals,
      keluhan_utama: keluhanUtama,
      diagnosa: undefined,
      source: 'uplink',
    }

    // Historical visits (oldest→newest) + current visit at end
    const allVisits = [...historicalVisits, currentVisit]
    return analyzeTrajectory(allVisits)
  }, [vitals, keluhanUtama, visitHistory])

  const urgency = URGENCY_CONFIG[analysis.mortality_proxy.clinical_urgency_tier]
  const deterioration = DETERIORATION_CONFIG[analysis.global_deterioration.state]

  const acuteRisks: { label: string; value: number }[] = [
    {
      label: 'Krisis Hipertensi',
      value: analysis.acute_attack_risk_24h.hypertensive_crisis_risk,
    },
    {
      label: 'Krisis Glikemik',
      value: analysis.acute_attack_risk_24h.glycemic_crisis_risk,
    },
    {
      label: 'Sepsis-like',
      value: analysis.acute_attack_risk_24h.sepsis_like_deterioration_risk,
    },
    {
      label: 'Syok Dekompensasi',
      value: analysis.acute_attack_risk_24h.shock_decompensation_risk,
    },
    {
      label: 'Stroke / ACS',
      value: analysis.acute_attack_risk_24h.stroke_acs_suspicion_risk,
    },
  ]

  const ttcEntries: { label: string; hours: number | null }[] = [
    {
      label: 'SBP',
      hours: analysis.time_to_critical_estimate.sbp_hours_to_critical,
    },
    {
      label: 'DBP',
      hours: analysis.time_to_critical_estimate.dbp_hours_to_critical,
    },
    {
      label: 'GDS',
      hours: analysis.time_to_critical_estimate.gds_hours_to_critical,
    },
    {
      label: 'Suhu',
      hours: analysis.time_to_critical_estimate.temp_hours_to_critical,
    },
    {
      label: 'HR',
      hours: analysis.time_to_critical_estimate.hr_hours_to_critical,
    },
    {
      label: 'RR',
      hours: analysis.time_to_critical_estimate.rr_hours_to_critical,
    },
  ].filter(e => e.hours !== null && e.hours > 0)

  const mono: React.CSSProperties = {}
  const sans: React.CSSProperties = {}

  return (
    <div
      style={{
        border: '1px solid var(--line-base)',
        borderRadius: 8,
        marginTop: 12,
        overflow: 'hidden',
        background: 'var(--bg-canvas)',
      }}
    >
      {/* Header */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: '10px 14px',
          borderBottom: '1px solid var(--line-base)',
          background: 'rgba(255,255,255,0.02)',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <span
            style={{
              ...mono,
              fontSize: 10,
              letterSpacing: '0.14em',
              color: 'var(--text-muted)',
            }}
          >
            ◈ CLINICAL TRAJECTORY
          </span>
          {/* Urgency badge */}
          <span
            style={{
              ...mono,
              fontSize: 8,
              fontWeight: 700,
              letterSpacing: '0.1em',
              padding: '2px 6px',
              borderRadius: 3,
              color: urgency.color,
              background: urgency.bg,
              border: `1px solid ${urgency.border}`,
            }}
          >
            {urgency.label}
          </span>
          {/* Deterioration badge */}
          <span
            style={{
              ...mono,
              fontSize: 8,
              fontWeight: 700,
              letterSpacing: '0.1em',
              padding: '2px 6px',
              borderRadius: 3,
              color: deterioration.color,
              border: `1px solid ${deterioration.color}`,
              background: `${deterioration.color}18`,
            }}
          >
            {deterioration.label}
          </span>
        </div>
        <button
          onClick={onClose}
          style={{
            ...mono,
            fontSize: 9,
            letterSpacing: '0.1em',
            background: 'transparent',
            border: 'none',
            cursor: 'pointer',
            color: 'var(--text-muted)',
          }}
        >
          [X] TUTUP
        </button>
      </div>

      <div
        style={{
          padding: '14px 16px',
          display: 'flex',
          flexDirection: 'column',
          gap: 14,
        }}
      >
        {/* Screening Alerts (carryover dari Gate 2/3/4) */}
        {screeningAlerts.length > 0 && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
            <span
              style={{
                ...mono,
                fontSize: 8,
                letterSpacing: '0.12em',
                color: 'var(--text-muted)',
              }}
            >
              ACTIVE SCREENING ALERTS
            </span>
            {screeningAlerts.slice(0, 3).map(a => (
              <div
                key={a.id}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 8,
                  padding: '6px 10px',
                  borderRadius: 4,
                  border: `1px solid ${a.severity === 'critical' ? '#ef4444' : a.severity === 'high' ? '#f97316' : '#eab308'}`,
                  background:
                    a.severity === 'critical'
                      ? 'rgba(239,68,68,0.08)'
                      : a.severity === 'high'
                        ? 'rgba(249,115,22,0.08)'
                        : 'rgba(234,179,8,0.06)',
                }}
              >
                <span style={{ fontSize: 12 }}>
                  {a.severity === 'critical' ? '🚑' : a.severity === 'high' ? '🚨' : '⚠️'}
                </span>
                <span
                  style={{
                    ...mono,
                    fontSize: 10,
                    fontWeight: 700,
                    color:
                      a.severity === 'critical'
                        ? '#ef4444'
                        : a.severity === 'high'
                          ? '#f97316'
                          : '#eab308',
                  }}
                >
                  {a.title}
                </span>
              </div>
            ))}
          </div>
        )}

        {/* Vital Trends Grid */}
        <div>
          <span
            style={{
              ...mono,
              fontSize: 8,
              letterSpacing: '0.12em',
              color: 'var(--text-muted)',
            }}
          >
            CLINICAL INTELLIGENCE — VITAL PARAMETERS
          </span>
          <div
            style={{
              marginTop: 8,
              display: 'grid',
              gridTemplateColumns: '1fr 1fr 1fr',
              gap: 6,
            }}
          >
            {analysis.vitalTrends.map(vt => (
              <div
                key={vt.parameter}
                style={{
                  padding: '8px 10px',
                  borderRadius: 4,
                  border: `1px solid ${RISK_COLOR[vt.risk]}40`,
                  background: `${RISK_COLOR[vt.risk]}08`,
                }}
              >
                <div
                  style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    marginBottom: 4,
                  }}
                >
                  <span
                    style={{
                      ...mono,
                      fontSize: 8,
                      color: 'var(--text-muted)',
                      letterSpacing: '0.08em',
                    }}
                  >
                    {vt.label.toUpperCase()}
                  </span>
                  <span
                    style={{
                      ...mono,
                      fontSize: 7,
                      fontWeight: 700,
                      letterSpacing: '0.08em',
                      padding: '1px 4px',
                      borderRadius: 2,
                      color: RISK_COLOR[vt.risk],
                      border: `1px solid ${RISK_COLOR[vt.risk]}60`,
                    }}
                  >
                    {vt.risk.toUpperCase()}
                  </span>
                </div>
                <div style={{ display: 'flex', alignItems: 'baseline', gap: 3 }}>
                  <span
                    style={{
                      ...mono,
                      fontSize: 22,
                      fontWeight: 300,
                      color: RISK_COLOR[vt.risk],
                    }}
                  >
                    {vt.values[vt.values.length - 1] ?? '—'}
                  </span>
                  <span style={{ ...mono, fontSize: 8, color: 'var(--text-muted)' }}>
                    {vt.unit}
                  </span>
                </div>
                <div
                  style={{
                    ...sans,
                    fontSize: 9,
                    color: 'var(--text-muted)',
                    marginTop: 3,
                    fontStyle: 'italic',
                  }}
                >
                  {vt.note}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Global Deterioration */}
        <div
          style={{
            padding: '10px 12px',
            borderRadius: 6,
            border: `1px solid ${deterioration.color}50`,
            background: `${deterioration.color}0a`,
          }}
        >
          <div
            style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              marginBottom: 6,
            }}
          >
            <span
              style={{
                ...mono,
                fontSize: 9,
                letterSpacing: '0.1em',
                color: deterioration.color,
                fontWeight: 700,
              }}
            >
              GLOBAL DETERIORATION — {deterioration.label}
            </span>
            <span style={{ ...mono, fontSize: 11, color: deterioration.color }}>
              {analysis.global_deterioration.deterioration_score.toFixed(0)}
              <span style={{ fontSize: 8 }}>/100</span>
            </span>
          </div>
          {/* Score bar */}
          <div
            style={{
              height: 3,
              background: 'var(--line-base)',
              borderRadius: 2,
              marginBottom: 8,
            }}
          >
            <div
              style={{
                height: '100%',
                borderRadius: 2,
                width: `${analysis.global_deterioration.deterioration_score}%`,
                background: deterioration.color,
                transition: 'width 0.5s',
              }}
            />
          </div>
          <div style={{ ...sans, fontSize: 10, color: 'var(--text-main)' }}>
            {analysis.clinical_safe_output.recommended_action}
          </div>
        </div>

        {/* Acute Attack Risk 24h */}
        <div>
          <span
            style={{
              ...mono,
              fontSize: 8,
              letterSpacing: '0.12em',
              color: 'var(--text-muted)',
            }}
          >
            ACUTE ATTACK RISK 24H
          </span>
          <div
            style={{
              marginTop: 8,
              display: 'flex',
              flexDirection: 'column',
              gap: 5,
            }}
          >
            {acuteRisks.map(r => (
              <div key={r.label} style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <span
                  style={{
                    ...mono,
                    fontSize: 9,
                    color: 'var(--text-muted)',
                    minWidth: 140,
                  }}
                >
                  {r.label}
                </span>
                <div
                  style={{
                    flex: 1,
                    height: 4,
                    background: 'var(--line-base)',
                    borderRadius: 2,
                  }}
                >
                  <div
                    style={{
                      height: '100%',
                      borderRadius: 2,
                      width: `${r.value}%`,
                      background: riskBar(r.value),
                      transition: 'width 0.4s',
                    }}
                  />
                </div>
                <span
                  style={{
                    ...mono,
                    fontSize: 9,
                    fontWeight: 700,
                    minWidth: 32,
                    textAlign: 'right',
                    color: riskBar(r.value),
                  }}
                >
                  {r.value}%
                </span>
              </div>
            ))}
          </div>
        </div>

        {/* Time to Critical */}
        {ttcEntries.length > 0 && (
          <div
            style={{
              padding: '8px 12px',
              borderRadius: 4,
              border: '1px solid #f9731650',
              background: 'rgba(249,115,22,0.05)',
            }}
          >
            <span
              style={{
                ...mono,
                fontSize: 8,
                letterSpacing: '0.12em',
                color: '#f97316',
                display: 'block',
                marginBottom: 6,
              }}
            >
              ⏱ TIME TO CRITICAL ESTIMATE
            </span>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
              {ttcEntries.map(e => (
                <span
                  key={e.label}
                  style={{
                    ...mono,
                    fontSize: 9,
                    padding: '2px 8px',
                    borderRadius: 3,
                    border: '1px solid #f9731640',
                    color: 'var(--text-main)',
                  }}
                >
                  {e.label} kritis ~<strong>{e.hours}h</strong>
                </span>
              ))}
            </div>
          </div>
        )}

        {/* Clinical Drivers */}
        <div>
          <span
            style={{
              ...mono,
              fontSize: 8,
              letterSpacing: '0.12em',
              color: 'var(--text-muted)',
            }}
          >
            CLINICAL RISK DRIVERS
          </span>
          <div
            style={{
              marginTop: 6,
              display: 'flex',
              flexDirection: 'column',
              gap: 3,
            }}
          >
            {analysis.clinical_safe_output.drivers.map((d, i) => (
              <div key={i} style={{ display: 'flex', gap: 6, alignItems: 'flex-start' }}>
                <span
                  style={{
                    ...mono,
                    fontSize: 9,
                    color: 'var(--c-asesmen)',
                    marginTop: 1,
                  }}
                >
                  ▸
                </span>
                <span style={{ ...sans, fontSize: 10, color: 'var(--text-main)' }}>{d}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Recommendations */}
        <div>
          <span
            style={{
              ...mono,
              fontSize: 8,
              letterSpacing: '0.12em',
              color: 'var(--text-muted)',
            }}
          >
            REKOMENDASI KLINIS
          </span>
          <div
            style={{
              marginTop: 6,
              display: 'flex',
              flexDirection: 'column',
              gap: 5,
            }}
          >
            {analysis.recommendations.map((rec, i) => {
              const borderColor =
                rec.priority === 'high'
                  ? '#ef4444'
                  : rec.priority === 'medium'
                    ? '#f97316'
                    : '#10b981'
              return (
                <div
                  key={i}
                  style={{
                    padding: '6px 10px',
                    borderRadius: 3,
                    borderLeft: `3px solid ${borderColor}`,
                    background: `${borderColor}08`,
                  }}
                >
                  <span
                    style={{
                      ...mono,
                      fontSize: 7,
                      fontWeight: 700,
                      letterSpacing: '0.1em',
                      color: borderColor,
                      marginRight: 6,
                    }}
                  >
                    {rec.priority.toUpperCase()}
                  </span>
                  <span style={{ ...sans, fontSize: 10, color: 'var(--text-main)' }}>
                    {rec.text}
                  </span>
                </div>
              )
            })}
          </div>
        </div>

        {/* Summary */}
        <div
          style={{
            padding: '8px 10px',
            borderRadius: 4,
            border: '1px solid var(--line-base)',
            background: 'rgba(255,255,255,0.02)',
          }}
        >
          <span
            style={{
              ...mono,
              fontSize: 8,
              letterSpacing: '0.1em',
              color: 'var(--text-muted)',
              display: 'block',
              marginBottom: 4,
            }}
          >
            TRAJECTORY SUMMARY
          </span>
          <p
            style={{
              ...sans,
              fontSize: 10,
              color: 'var(--text-muted)',
              margin: 0,
              fontStyle: 'italic',
            }}
          >
            {analysis.summary}
          </p>
        </div>

        {/* Confidence + Volatility */}
        <div style={{ display: 'flex', gap: 10 }}>
          <div
            style={{
              flex: 1,
              padding: '6px 10px',
              borderRadius: 4,
              border: '1px solid var(--line-base)',
            }}
          >
            <span
              style={{
                ...mono,
                fontSize: 7,
                color: 'var(--text-muted)',
                letterSpacing: '0.1em',
                display: 'block',
                marginBottom: 2,
              }}
            >
              CONFIDENCE
            </span>
            <span
              style={{
                ...mono,
                fontSize: 16,
                fontWeight: 300,
                color: 'var(--text-main)',
              }}
            >
              {(analysis.clinical_safe_output.confidence * 100).toFixed(0)}%
            </span>
          </div>
          <div
            style={{
              flex: 1,
              padding: '6px 10px',
              borderRadius: 4,
              border: '1px solid var(--line-base)',
            }}
          >
            <span
              style={{
                ...mono,
                fontSize: 7,
                color: 'var(--text-muted)',
                letterSpacing: '0.1em',
                display: 'block',
                marginBottom: 2,
              }}
            >
              VOLATILITY
            </span>
            <span
              style={{
                ...mono,
                fontSize: 16,
                fontWeight: 300,
                color: 'var(--text-main)',
              }}
            >
              {analysis.trajectory_volatility.volatility_index.toFixed(0)}
            </span>
          </div>
          <div
            style={{
              flex: 2,
              padding: '6px 10px',
              borderRadius: 4,
              border: '1px solid var(--line-base)',
            }}
          >
            <span
              style={{
                ...mono,
                fontSize: 7,
                color: 'var(--text-muted)',
                letterSpacing: '0.1em',
                display: 'block',
                marginBottom: 2,
              }}
            >
              STABILITY
            </span>
            <span style={{ ...mono, fontSize: 11, color: 'var(--text-main)' }}>
              {analysis.trajectory_volatility.stability_label.replace(/_/g, ' ').toUpperCase()}
            </span>
          </div>
        </div>

        {/* ── Clinical Momentum Engine (Phase 2) ── */}
        {analysis.momentum && analysis.momentum.level !== 'INSUFFICIENT_DATA' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10, paddingTop: 4 }}>
            <span
              style={{
                fontSize: 8,
                fontFamily: 'var(--font-mono)',
                letterSpacing: '0.12em',
                textTransform: 'uppercase',
                color: 'var(--text-muted)',
              }}
            >
              Clinical Momentum Engine · Phase 2
            </span>
            <MomentumScoreCard momentum={analysis.momentum} />
            <ConvergencePatternAlert convergence={analysis.momentum.convergence} />
            <BaselineDeviationGauge baseline={analysis.momentum.baseline} />
          </div>
        )}
      </div>
    </div>
  )
}
