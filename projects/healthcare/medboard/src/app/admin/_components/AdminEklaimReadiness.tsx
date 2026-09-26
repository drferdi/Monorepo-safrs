'use client'

import type { ApiResponse, DashboardComplianceIssue, DashboardEncounterSummary } from '@abyss/types'
import { useEffect, useState } from 'react'
import styles from './AdminEklaimReadiness.module.css'

// ─── TYPES ────────────────────────────────────────────────────────

interface EklaimSummaryStats {
  total: number
  ready: number
  notReady: number
  rate: number
}

// ─── HELPERS ──────────────────────────────────────────────────────

function computeSummary(encounters: DashboardEncounterSummary[]): EklaimSummaryStats {
  const ready = encounters.filter(e => e.eklaimReadiness.isReady).length
  return {
    total: encounters.length,
    ready,
    notReady: encounters.length - ready,
    rate: encounters.length > 0 ? ready / encounters.length : 0,
  }
}

const STATUS_LABELS: Record<DashboardEncounterSummary['status'], string> = {
  waiting: 'Menunggu',
  in_consultation: 'Konsultasi',
  cdss_pending: 'CDSS Pending',
  documentation_incomplete: 'Dok. Belum Lengkap',
  completed: 'Selesai',
}

function formatCheckedAt(iso: string): string {
  const d = new Date(iso)
  const epoch = new Date(0).toISOString()
  if (isNaN(d.getTime()) || iso === epoch) return '—'
  return d.toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' })
}

function dedupeIssues(
  blockers: DashboardComplianceIssue[],
  extras: DashboardComplianceIssue[]
): DashboardComplianceIssue[] {
  const seen = new Set(blockers.map(b => b.code))
  return [...blockers, ...extras.filter(f => !seen.has(f.code))]
}

// ─── SUB-COMPONENT: KPI CARD ──────────────────────────────────────

interface KpiCardProps {
  value: string | number
  label: string
  accent?: boolean
  green?: boolean
  red?: boolean
}

function cx(...classes: Array<string | false | null | undefined>) {
  return classes.filter(Boolean).join(' ')
}

function KpiCard({ value, label, accent, green, red }: KpiCardProps) {
  return (
    <div className={styles.kpiCard}>
      <div
        className={cx(
          styles.kpiValue,
          green && styles.kpiValueReady,
          red && styles.kpiValueProblem,
          accent && !green && !red && styles.kpiValueAccent
        )}
      >
        {value}
      </div>
      <div className={styles.kpiLabel}>{label}</div>
    </div>
  )
}

// ─── SUB-COMPONENT: ENCOUNTER ROW ─────────────────────────────────

interface EncounterRowProps {
  encounter: DashboardEncounterSummary
  expanded: boolean
  onToggle: () => void
}

function EncounterRow({ encounter, expanded, onToggle }: EncounterRowProps) {
  const { eklaimReadiness, patientLabel, status, activeComplianceFailures } = encounter
  const isReady = eklaimReadiness.isReady
  const allIssues = dedupeIssues(eklaimReadiness.blockers, activeComplianceFailures)

  return (
    <div className={styles.encounterRow}>
      <button type="button" onClick={onToggle} className={styles.encounterButton}>
        {/* Readiness dot — role="img" + aria-label for color-blind accessibility */}
        <span
          role="img"
          aria-label={isReady ? 'Siap e-Klaim' : 'Belum siap e-Klaim'}
          className={cx(
            styles.readinessDot,
            isReady ? styles.readinessDotReady : styles.readinessDotProblem
          )}
        />

        {/* Patient label */}
        <span className={styles.patientLabel}>{patientLabel}</span>

        {/* Checked at */}
        <span className={styles.checkedAt}>{formatCheckedAt(eklaimReadiness.checkedAt)}</span>

        {/* Status badge */}
        <span className={styles.statusBadge}>{STATUS_LABELS[status]}</span>

        {/* Readiness badge */}
        <span
          className={cx(
            styles.readinessBadge,
            isReady ? styles.readinessBadgeReady : styles.readinessBadgeProblem
          )}
        >
          {isReady ? 'SIAP' : `${allIssues.length} MASALAH`}
        </span>

        {/* Expand arrow — only shown when there are issues */}
        {!isReady && (
          <span className={cx(styles.expandArrow, expanded && styles.expandArrowExpanded)}>▾</span>
        )}
      </button>

      {/* Expandable checklist */}
      {expanded && !isReady && (
        <div className={styles.issueList}>
          {allIssues.length === 0 ? (
            <span className={styles.emptyIssues}>Tidak ada detail masalah tersedia.</span>
          ) : (
            allIssues.map(issue => (
              <div
                key={issue.code}
                className={cx(
                  styles.issueCard,
                  issue.severity === 'critical' ? styles.issueCardCritical : styles.issueCardWarning
                )}
              >
                <span
                  className={cx(
                    styles.issueCode,
                    issue.severity === 'critical'
                      ? styles.issueCodeCritical
                      : styles.issueCodeWarning
                  )}
                >
                  {issue.code}
                </span>
                <span className={styles.issueMessage}>{issue.message}</span>
              </div>
            ))
          )}
        </div>
      )}
    </div>
  )
}

// ─── MAIN COMPONENT ───────────────────────────────────────────────

export default function AdminEklaimReadiness() {
  const [encounters, setEncounters] = useState<DashboardEncounterSummary[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [expandedId, setExpandedId] = useState<string | null>(null)

  useEffect(() => {
    let cancelled = false

    async function fetchEncounters() {
      try {
        const res = await fetch('/api/dashboard/intelligence/encounters?limit=100', {
          cache: 'no-store',
        })
        if (!res.ok) throw new Error(`HTTP ${res.status}`)
        const json = (await res.json()) as ApiResponse<DashboardEncounterSummary[]>
        if (!json.success) throw new Error(json.error?.message ?? 'Gagal memuat data')
        if (!cancelled) setEncounters(json.data ?? [])
      } catch (err) {
        if (!cancelled) setError(err instanceof Error ? err.message : 'Fetch gagal')
      } finally {
        if (!cancelled) setLoading(false)
      }
    }

    void fetchEncounters()
    return () => {
      cancelled = true
    }
  }, [])

  function handleToggleRow(encounterId: string) {
    setExpandedId(current => (current === encounterId ? null : encounterId))
  }

  if (loading) {
    return <div className={styles.statusState}>LOADING E-KLAIM DATA...</div>
  }

  if (error) {
    return (
      <div className={cx(styles.statusState, styles.errorState)}>
        Gagal memuat data e-klaim readiness: {error}
      </div>
    )
  }

  const summary = computeSummary(encounters)
  const readyRatePct = `${(summary.rate * 100).toFixed(0)}%`

  // Sort: not-ready first (prioritized for action), then ready
  const sorted = [
    ...encounters.filter(e => !e.eklaimReadiness.isReady),
    ...encounters.filter(e => e.eklaimReadiness.isReady),
  ]

  return (
    <div className={styles.root}>
      {/* ── Header ── */}
      <div>
        <p className={styles.eyebrow}>BPJS e-Klaim</p>
        <h2 className={styles.title}>Readiness Panel</h2>
        <p className={styles.description}>
          Status kelengkapan dokumentasi encounter untuk pengajuan e-klaim BPJS. Masalah ditampilkan
          per encounter — klik baris untuk melihat detail.
        </p>
      </div>

      {/* ── KPI Summary ── */}
      <div className={styles.kpiGrid}>
        <KpiCard
          value={readyRatePct}
          label="Readiness Rate"
          accent={summary.rate >= 0.8}
          green={summary.rate >= 0.95}
          red={summary.rate < 0.5}
        />
        <KpiCard value={summary.total} label="Total Encounter" />
        <KpiCard value={summary.ready} label="Siap e-Klaim" green={summary.ready > 0} />
        <KpiCard value={summary.notReady} label="Perlu Perbaikan" red={summary.notReady > 0} />
      </div>

      {/* ── Encounter List ── */}
      {encounters.length === 0 ? (
        <div className={styles.emptyState}>Tidak ada encounter aktif saat ini.</div>
      ) : (
        <div className={styles.listCard}>
          {/* List header row */}
          <div className={styles.listHeader}>
            <span className={styles.listHeaderLabel}>
              ENCOUNTER — BPJS E-KLAIM READINESS ({encounters.length})
            </span>
          </div>

          {sorted.map(encounter => (
            <EncounterRow
              key={encounter.encounterId}
              encounter={encounter}
              expanded={expandedId === encounter.encounterId}
              onToggle={() => handleToggleRow(encounter.encounterId)}
            />
          ))}
        </div>
      )}
    </div>
  )
}
