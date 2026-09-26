'use client'

import type { DashboardOperationalMetrics } from '@abyss/types'

import { useOperationalMetrics } from '@/hooks/useOperationalMetrics'

function formatPercent(value: number): string {
  return `${Math.round(value * 100)}%`
}

function formatConfidence(value: number): string {
  return value.toFixed(2)
}

function buildMetricCards(
  metrics: DashboardOperationalMetrics
): Array<{ label: string; value: string; helper: string }> {
  return [
    {
      label: 'Encounter Aktif',
      value: String(metrics.totalEncounters),
      helper: metrics.shiftLabel,
    },
    {
      label: 'Utilisasi CDSS',
      value: formatPercent(metrics.cdssUtilizationRate),
      helper: `${metrics.overrideCount} override tercatat`,
    },
    {
      label: 'Kesiapan E-Klaim',
      value: formatPercent(metrics.eklaimReadinessRate),
      helper: `Updated ${new Date(metrics.generatedAt).toLocaleTimeString('id-ID', {
        hour: '2-digit',
        minute: '2-digit',
      })}`,
    },
    {
      label: 'Avg. Confidence',
      value: formatConfidence(metrics.averageConfidenceScore),
      helper: `Override rate ${formatPercent(metrics.overrideRate)}`,
    },
  ]
}

export function OperationalSummaryPanelContent({
  metrics,
}: {
  metrics: DashboardOperationalMetrics
}): React.JSX.Element {
  const cards = buildMetricCards(metrics)

  return (
    <div
      style={{
        display: 'grid',
        gridTemplateColumns: '1fr 1fr',
        gap: 12,
      }}
    >
      {cards.map(metric => (
        <article
          key={metric.label}
          style={{
            borderRadius: 4,
            border: '1px solid var(--line-base)',
            padding: '16px 20px',
          }}
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
            {metric.label}
          </div>
          <div
            style={{
              fontSize: 24,
              fontWeight: 500,
              color: 'var(--text-main)',
              marginBottom: 6,
              fontFamily: 'var(--font-mono)',
            }}
          >
            {metric.value}
          </div>
          <div
            style={{
              fontSize: 12,
              color: 'var(--text-muted)',
              opacity: 0.7,
            }}
          >
            {metric.helper}
          </div>
        </article>
      ))}
    </div>
  )
}

export default function OperationalSummaryPanel(): React.JSX.Element {
  const { metrics, isLoading, error } = useOperationalMetrics()

  if (isLoading) {
    return (
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: '1fr 1fr',
          gap: 12,
        }}
      >
        {[1, 2, 3, 4].map(item => (
          <div
            key={item}
            style={{
              height: 96,
              borderRadius: 4,
              border: '1px solid var(--line-base)',
              background: 'var(--bg-card)',
              animation: 'pulse 2s ease-in-out infinite',
            }}
          />
        ))}
      </div>
    )
  }

  if (error || !metrics) {
    return (
      <div
        style={{
          padding: '40px 24px',
          textAlign: 'center',
          color: 'var(--text-muted)',
        }}
      >
        <div
          style={{
            fontSize: 28,
            fontFamily: 'var(--font-mono)',
            opacity: 0.2,
            marginBottom: 12,
          }}
        >
          ≡
        </div>
        <div style={{ fontSize: 14, marginBottom: 4 }}>
          {error ?? 'Ringkasan operasional belum tersedia'}
        </div>
        <div
          style={{
            fontSize: 12,
            fontFamily: 'var(--font-mono)',
            letterSpacing: '0.05em',
            opacity: 0.5,
          }}
        >
          To be filled — metrik akan terisi saat shift berjalan
        </div>
      </div>
    )
  }

  return <OperationalSummaryPanelContent metrics={metrics} />
}
