import dynamic from 'next/dynamic'

import type { IntelligenceDashboardAccess } from '@/lib/intelligence/server'

import ClinicalSafetyAlertBanner from './ClinicalSafetyAlertBanner'
import { IntelligenceSocketProvider } from './IntelligenceSocketProvider'

import { MedicalKnowledgeSearch } from '@/components/clinical/MedicalKnowledgeSearch'

// NFR-001: lazy-load heavy panels for code splitting.
// ClinicalSafetyAlertBanner is eagerly loaded — it is critical path for patient safety.

function PanelContentSkeleton(): React.JSX.Element {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
      {[1, 2, 3].map(i => (
        <div
          key={i}
          style={{
            height: 64,
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

const PatientQueuePanel = dynamic(() => import('./PatientQueuePanel'), {
  loading: () => <PanelContentSkeleton />,
})

const AIInsightsPanel = dynamic(() => import('./AIInsightsPanel'), {
  loading: () => <PanelContentSkeleton />,
})

const OperationalSummaryPanel = dynamic(() => import('./OperationalSummaryPanel'), {
  loading: () => <PanelContentSkeleton />,
})

const TrajectoryMonitorPanel = dynamic(() => import('./TrajectoryMonitorPanel'), {
  loading: () => <PanelContentSkeleton />,
})

function IntelligencePanel({
  title,
  subtitle,
  children,
}: {
  title: string
  subtitle: string
  children: React.ReactNode
}): React.JSX.Element {
  return (
    <section
      style={{
        border: '1px solid var(--line-base)',
        borderRadius: 6,
        background: 'var(--bg-card)',
        overflow: 'hidden',
      }}
    >
      <div
        style={{
          borderBottom: '1px solid var(--line-base)',
          padding: '20px 24px',
        }}
      >
        <div
          style={{
            fontSize: 11,
            fontFamily: 'var(--font-mono)',
            color: 'var(--text-muted)',
            opacity: 0.5,
            marginBottom: 8,
          }}
        >
          {subtitle}
        </div>
        <h2
          style={{
            fontSize: 15,
            fontWeight: 500,
            color: 'var(--text-main)',
            letterSpacing: '0.01em',
          }}
        >
          {title}
        </h2>
      </div>
      <div style={{ padding: '20px 24px' }}>{children}</div>
    </section>
  )
}

type IntelligenceDashboardScaffoldProps = {
  access: IntelligenceDashboardAccess
  statusContent: React.ReactNode
}

function AccessNotice({ title, message }: { title: string; message: string }): React.JSX.Element {
  return (
    <div
      style={{
        borderRadius: 6,
        border: '1px dashed var(--line-base)',
        padding: '16px 20px',
        fontSize: 13,
        color: 'var(--text-muted)',
      }}
    >
      <div
        style={{
          fontSize: 11,
          fontFamily: 'var(--font-mono)',
          color: 'var(--c-asesmen)',
          marginBottom: 8,
        }}
      >
        {title}
      </div>
      <p style={{ lineHeight: 1.6 }}>{message}</p>
    </div>
  )
}

export default function IntelligenceDashboardScaffold({
  access,
  statusContent,
}: IntelligenceDashboardScaffoldProps): React.JSX.Element {
  if (!access.hasAnyAccess) {
    return (
      <div style={{ width: '100%', maxWidth: 1200, padding: '16px 0 64px' }}>
        <div className="page-header">
          <div className="page-title">Intelligence Monitor</div>
          <div className="page-subtitle">Akses dashboard dibatasi</div>
        </div>
        <div
          style={{
            border: '1px dashed var(--line-base)',
            borderRadius: 6,
            padding: '32px 24px',
            textAlign: 'center',
            color: 'var(--text-muted)',
            fontSize: 13,
          }}
        >
          Role saat ini belum memiliki izin untuk membuka panel intelligence.
        </div>
      </div>
    )
  }

  return (
    <div style={{ width: '100%', maxWidth: 1400, padding: '0 0 64px' }}>
      <IntelligenceSocketProvider enableCdssSuggestions={access.canViewInsights}>
        {/* ── Header ── */}
        <div className="page-header" style={{ maxWidth: 1400, width: '100%' }}>
          <div>
            <div className="page-title">Intelligence Monitor</div>
            <div className="page-subtitle">
              Situational awareness untuk shift klinik — real-time patient queue, AI insights, dan
              operational summary.
            </div>
          </div>
        </div>

        {/* ── Live Status Strip ── */}
        <div style={{ marginBottom: 24 }}>{statusContent}</div>

        {/* ── Access Notices ── */}
        {!access.canViewInsights && (
          <div style={{ marginBottom: 16 }}>
            <AccessNotice
              title="Clinical Visibility"
              message="AI Insights hanya tersedia untuk role klinis."
            />
          </div>
        )}
        {!access.canViewMetrics && (
          <div style={{ marginBottom: 16 }}>
            <AccessNotice
              title="Management Visibility"
              message="Operational Summary hanya tersedia untuk role manajemen."
            />
          </div>
        )}

        {/* ── Safety Alert ── */}
        {access.canViewAlerts && (
          <div style={{ marginBottom: 24 }}>
            <ClinicalSafetyAlertBanner />
          </div>
        )}

        {/* ── Main Grid: Queue + Insights/Ops ── */}
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: '1fr',
            gap: 24,
          }}
        >
          {/* Row 1: Patient Queue (full width) */}
          {access.canViewEncounters && (
            <IntelligencePanel title="Patient Queue" subtitle="Antrian Encounter">
              <PatientQueuePanel />
            </IntelligencePanel>
          )}

          {/* Row 2: Insights + Operational side by side */}
          <div
            style={{
              display: 'grid',
              gridTemplateColumns:
                access.canViewInsights && access.canViewMetrics ? '1.4fr 1fr' : '1fr',
              gap: 24,
            }}
          >
            {access.canViewInsights && (
              <IntelligencePanel title="AI Insights" subtitle="CDSS Engine Output">
                <AIInsightsPanel />
              </IntelligencePanel>
            )}

            {access.canViewMetrics && (
              <IntelligencePanel title="Operational Summary" subtitle="Metrik Shift">
                <OperationalSummaryPanel />
              </IntelligencePanel>
            )}
          </div>

          {/* Row 3: Clinical Trajectory Monitor */}
          {access.canViewInsights && (
            <IntelligencePanel
              title="Clinical Trajectory"
              subtitle="Clinical Momentum Engine · CME Phase 1–3"
            >
              <TrajectoryMonitorPanel />
            </IntelligencePanel>
          )}
          {/* Row 4: Medical Knowledge Search */}
          {access.canViewInsights && (
            <IntelligencePanel title="Medical Knowledge" subtitle="Local Search · Knowledge Vault">
              <MedicalKnowledgeSearch />
            </IntelligencePanel>
          )}
        </div>
      </IntelligenceSocketProvider>
    </div>
  )
}
