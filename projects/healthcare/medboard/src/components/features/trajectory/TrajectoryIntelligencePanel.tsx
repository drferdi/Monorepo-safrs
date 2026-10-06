// Drferdi — TrajectoryIntelligencePanel
/**
 * TrajectoryIntelligencePanel
 *
 * Container component that fetches CME trajectory analysis and orchestrates
 * all sub-components: MomentumScoreCard, ConvergencePatternAlert,
 * TimeToCriticalTimeline, BaselineDeviationGauge, AcuteAttackRiskGrid,
 * MortalityRiskIndicator.
 *
 * Usage:
 *   <TrajectoryIntelligencePanel patientIdentifier={hash} />
 */

'use client'

import { AcuteAttackRiskGrid } from './AcuteAttackRiskGrid'
import { BaselineDeviationGauge } from './BaselineDeviationGauge'
import { ClinicalTrajectoryV1Panel } from './ClinicalTrajectoryV1Panel'
import { ClinicalUrgencyMatrix } from './ClinicalUrgencyMatrix'
import { ConvergenceHeatmap } from './ConvergenceHeatmap'
import { ConvergencePatternAlert } from './ConvergencePatternAlert'
import { MomentumHistoryChart } from './MomentumHistoryChart'
import { MomentumScoreCard } from './MomentumScoreCard'
import { MortalityRiskIndicator } from './MortalityRiskIndicator'
import { TimeToCriticalTimeline } from './TimeToCriticalTimeline'
import { VitalTrendChart } from './VitalTrendChart'
import { VitalVelocityList } from './VitalVelocityList'

import { useTrajectoryAnalysis } from '@/hooks/useTrajectoryAnalysis'
import type { ClinicalTrajectoryV1 } from '@/types/abyss/clinical-trajectory'

interface TrajectoryIntelligencePanelProps {
  /** 64-char hex SHA-256 patient identifier hash */
  patientIdentifier: string | null | undefined
  visitCount?: number
  className?: string
  clinicalTrajectory?: ClinicalTrajectoryV1 | null
}

// ── Skeleton ──────────────────────────────────────────────────────────────────

function PanelSkeleton() {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
      {[88, 60, 120, 100].map((h, i) => (
        <div
          key={i}
          style={{
            height: h,
            borderRadius: 8,
            background: 'var(--bg-card)',
            border: '1px solid var(--line-base)',
            opacity: 0.5,
            animation: 'pulse 1.5s ease-in-out infinite',
          }}
        />
      ))}
    </div>
  )
}

// ── Error state ───────────────────────────────────────────────────────────────

function PanelError({ message }: { message: string }) {
  return (
    <div
      style={{
        borderRadius: 8,
        border: '1px solid var(--c-critical)',
        background: 'var(--c-critical-soft)',
        padding: '16px 20px',
      }}
    >
      <div
        style={{
          fontSize: 12,
          fontFamily: 'var(--font-mono)',
          color: 'var(--c-critical)',
          marginBottom: 6,
        }}
      >
        Trajectory Unavailable
      </div>
      <p style={{ fontSize: 14, color: 'var(--text-muted)', margin: 0 }}>{message}</p>
    </div>
  )
}

// ── Empty state ───────────────────────────────────────────────────────────────

function PanelEmpty() {
  return (
    <div
      style={{
        borderRadius: 8,
        border: '1px dashed var(--line-base)',
        background: 'var(--bg-card)',
        padding: '24px 20px',
        textAlign: 'center',
      }}
    >
      <div style={{ fontSize: 14, color: 'var(--text-muted)' }}>
        Pilih pasien untuk melihat analisis trajectory.
      </div>
    </div>
  )
}

// ── Main panel ────────────────────────────────────────────────────────────────

export function TrajectoryIntelligencePanel({
  patientIdentifier,
  visitCount = 5,
  className,
  clinicalTrajectory,
}: TrajectoryIntelligencePanelProps) {
  const {
    data,
    visitHistory,
    momentumHistory,
    clinicalTrajectory: fetchedClinicalTrajectory,
    isLoading,
    error,
  } = useTrajectoryAnalysis(patientIdentifier, visitCount)
  const renderedClinicalTrajectory = clinicalTrajectory ?? fetchedClinicalTrajectory

  if (!patientIdentifier) return <PanelEmpty />
  if (isLoading) return <PanelSkeleton />
  if (error) return <PanelError message={error.message} />
  if (!data) return <PanelEmpty />

  return (
    <div
      className={className}
      style={{ display: 'flex', flexDirection: 'column', gap: 12 }}
      aria-label="Panel analisis trajectory klinis"
    >
      {/* Header: section label */}
      <div
        style={{
          fontSize: 12,
          fontFamily: 'var(--font-mono)',
          color: 'var(--text-muted)',
          paddingBottom: 4,
          borderBottom: '1px solid var(--line-base)',
        }}
      >
        Clinical Momentum Engine · {data.visitCount} kunjungan dianalisis
      </div>

      {/* Mortality proxy — top-level risk indicator */}
      {renderedClinicalTrajectory ? (
        <ClinicalTrajectoryV1Panel trajectory={renderedClinicalTrajectory} />
      ) : null}
      <MortalityRiskIndicator mortalityProxy={data.mortality_proxy} />

      {/* Clinical urgency matrix — momentum level × mortality tier */}
      <ClinicalUrgencyMatrix
        momentumLevel={data.momentum.level}
        mortalityTier={data.mortality_proxy.mortality_proxy_tier}
      />

      {/* Momentum score */}
      <MomentumScoreCard momentum={data.momentum} />

      {/* Velocity sparklines per vital */}
      <VitalVelocityList params={data.momentum.params} />

      {/* Convergence alert — only renders when pattern detected */}
      <ConvergencePatternAlert convergence={data.momentum.convergence} />

      {/* Convergence heatmap — param × status grid */}
      <ConvergenceHeatmap convergence={data.momentum.convergence} />

      {/* Time to critical */}
      <TimeToCriticalTimeline timeToCritical={data.time_to_critical_estimate} />

      {/* Baseline deviation */}
      <BaselineDeviationGauge baseline={data.momentum.baseline} />

      {/* Acute attack risk grid */}
      <AcuteAttackRiskGrid risks={data.acute_attack_risk_24h} />

      {/* Multi-visit vital trend chart */}
      {visitHistory.length >= 2 && (
        <VitalTrendChart snapshots={visitHistory} baseline={data.momentum.baseline} />
      )}

      {/* Momentum history area chart */}
      {momentumHistory.length >= 2 && <MomentumHistoryChart history={momentumHistory} />}

      {/* Clinical safe output — recommended action */}
      {data.clinical_safe_output.recommended_action && (
        <div
          style={{
            borderRadius: 8,
            border: '1px solid var(--line-base)',
            background: 'var(--bg-card)',
            padding: '14px 18px',
          }}
        >
          <div
            style={{
              fontSize: 12,
              fontFamily: 'var(--font-mono)',
              color: 'var(--text-muted)',
              marginBottom: 6,
            }}
          >
            Rekomendasi Tindakan
          </div>
          <p style={{ fontSize: 14, color: 'var(--text-main)', margin: 0, lineHeight: 1.5 }}>
            {data.clinical_safe_output.recommended_action}
          </p>
          <div
            style={{
              marginTop: 6,
              fontSize: 12,
              fontFamily: 'var(--font-mono)',
              color: 'var(--text-muted)',
            }}
          >
            Confidence: {Math.round(data.clinical_safe_output.confidence * 100)}% · Review:{' '}
            {data.clinical_safe_output.review_window}
          </div>
          <div
            style={{
              marginTop: 8,
              fontSize: 12,
              color: 'var(--text-muted)',
              opacity: 0.6,
              fontStyle: 'italic',
            }}
          >
            Dihasilkan oleh AI · Keputusan klinis tetap berada pada dokter/tenaga medis
          </div>
        </div>
      )}

      {/* Footer: summary */}
      <div
        style={{
          fontSize: 12,
          color: 'var(--text-muted)',
          lineHeight: 1.55,
          borderTop: '1px solid var(--line-base)',
          paddingTop: 10,
        }}
      >
        {data.summary}
      </div>
    </div>
  )
}
