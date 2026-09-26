'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import styles from './AdminOperationalSummary.module.css'

function cx(...classes: Array<string | false | null | undefined>) {
  return classes.filter(Boolean).join(' ')
}

import type {
  ApiResponse,
  DashboardEncounterStatus,
  DashboardOperationalMetrics,
} from '@abyss/types'
import { useIntelligenceSocket } from '@/hooks/useIntelligenceSocket'

// ─── CONSTANTS ─────────────────────────────────────────────────────

const STATUS_LABELS: Record<DashboardEncounterStatus, string> = {
  waiting: 'Menunggu',
  in_consultation: 'Konsultasi',
  cdss_pending: 'CDSS Pending',
  documentation_incomplete: 'Dok. Belum Lengkap',
  completed: 'Selesai',
}

const ORDERED_STATUSES: DashboardEncounterStatus[] = [
  'in_consultation',
  'cdss_pending',
  'documentation_incomplete',
  'waiting',
  'completed',
]

// ─── HELPERS ───────────────────────────────────────────────────────

function fmtRate(r: number): string {
  return `${(r * 100).toFixed(0)}%`
}

function fmtScore(s: number): string {
  return `${(s * 100).toFixed(0)}`
}

function fmtGeneratedAt(iso: string): string {
  const d = new Date(iso)
  if (isNaN(d.getTime())) return '—'
  return d.toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' })
}

// ─── SUB-COMPONENT: KPI CARD ───────────────────────────────────────

interface KpiCardProps {
  value: string | number
  label: string
  green?: boolean
  amber?: boolean
  red?: boolean
}

function KpiCard({ value, label, green, amber, red }: KpiCardProps) {
  const valueClassName = green
    ? `${styles.kpiValue} ${styles.kpiValueSuccess}`
    : red
      ? `${styles.kpiValue} ${styles.kpiValueCritical}`
      : amber
        ? `${styles.kpiValue} ${styles.kpiValueAccent}`
        : styles.kpiValue

  return (
    <div className={styles.kpiCard}>
      <div className={valueClassName}>{value}</div>
      <div className={styles.kpiLabel}>{label}</div>
    </div>
  )
}

// ─── SUB-COMPONENT: STATUS ROW ─────────────────────────────────────

interface StatusRowProps {
  label: string
  count: number
  total: number
}

function StatusRow({ label, count, total }: StatusRowProps) {
  return (
    <div className={styles.statusRow}>
      <span className={styles.statusLabel}>{label}</span>
      <progress
        className={styles.statusProgress}
        value={total > 0 ? count : 0}
        max={Math.max(total, 1)}
      />
      <span className={styles.statusCount}>{count}</span>
    </div>
  )
}

// ─── MAIN COMPONENT ────────────────────────────────────────────────

export default function AdminOperationalSummary() {
  const [metrics, setMetrics] = useState<DashboardOperationalMetrics | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const socketState = useIntelligenceSocket()

  const cancelledRef = useRef(false)

  const fetchMetrics = useCallback(async (isInitial: boolean) => {
    if (isInitial) setLoading(true)
    try {
      const res = await fetch('/api/dashboard/intelligence/metrics', {
        cache: 'no-store',
      })
      if (!res.ok) throw new Error(`HTTP ${res.status}`)
      const json = (await res.json()) as ApiResponse<DashboardOperationalMetrics>
      if (!json.success) throw new Error(json.error?.message ?? 'Gagal memuat data')
      if (!cancelledRef.current && json.data) setMetrics(json.data)
      if (!cancelledRef.current && isInitial) setError('')
    } catch (err) {
      if (!cancelledRef.current && isInitial)
        setError(err instanceof Error ? err.message : 'Fetch gagal')
    } finally {
      if (!cancelledRef.current && isInitial) setLoading(false)
    }
  }, [])

  useEffect(() => {
    cancelledRef.current = false
    void fetchMetrics(true)
    return () => {
      cancelledRef.current = true
    }
  }, [fetchMetrics])

  // Re-fetch silently on any encounter update event
  useEffect(() => {
    if (socketState.lastEncounterUpdate) {
      void fetchMetrics(false)
    }
  }, [socketState.lastEncounterUpdate, fetchMetrics])

  if (loading) {
    return <div className={cx(styles.statusMessage, styles.loadingMessage)}>LOADING METRICS...</div>
  }

  if (error) {
    return (
      <div className={cx(styles.statusMessage, styles.errorMessage)}>
        Gagal memuat metrics operasional: {error}
      </div>
    )
  }

  if (!metrics) return null

  const liveIndicatorClassName = socketState.isConnected
    ? `${styles.liveIndicator} ${styles.liveIndicatorOnline}`
    : socketState.isReconnecting
      ? `${styles.liveIndicator} ${styles.liveIndicatorReconnecting}`
      : `${styles.liveIndicator} ${styles.liveIndicatorOffline}`

  return (
    <div className={styles.root}>
      {/* ── Header ── */}
      <div>
        <p className={styles.sectionKick}>Operasional Shift</p>
        <h2 className={styles.headerTitle}>{metrics.shiftLabel}</h2>
        <p className={styles.headerDescription}>
          Ringkasan metrik operasional shift — encounter, utilisasi CDSS, readiness e-klaim,
          rata-rata skor kepercayaan, dan tingkat override klinisi.
        </p>
      </div>

      {/* ── Live status + last updated ── */}
      <div className={styles.liveStatusRow}>
        <span className={liveIndicatorClassName} />
        <span>
          {socketState.isReconnecting
            ? 'MEMPERBARUI...'
            : socketState.isConnected
              ? 'LIVE'
              : 'OFFLINE'}
        </span>
        <span className={styles.liveStatusMeta}>DATA: {fmtGeneratedAt(metrics.generatedAt)}</span>
      </div>

      {/* ── KPI Grid ── */}
      <div className={styles.kpiGrid}>
        <KpiCard value={metrics.totalEncounters} label="Total Encounter" />
        <KpiCard
          value={fmtRate(metrics.cdssUtilizationRate)}
          label="Utilisasi CDSS"
          green={metrics.cdssUtilizationRate >= 0.8}
          amber={metrics.cdssUtilizationRate >= 0.5 && metrics.cdssUtilizationRate < 0.8}
          red={metrics.cdssUtilizationRate < 0.5}
        />
        <KpiCard
          value={fmtRate(metrics.eklaimReadinessRate)}
          label="e-Klaim Ready"
          green={metrics.eklaimReadinessRate >= 0.95}
          amber={metrics.eklaimReadinessRate >= 0.5 && metrics.eklaimReadinessRate < 0.95}
          red={metrics.eklaimReadinessRate < 0.5}
        />
        <KpiCard
          value={fmtScore(metrics.averageConfidenceScore)}
          label="Rata-rata Skor"
          green={metrics.averageConfidenceScore >= 0.85}
          amber={metrics.averageConfidenceScore >= 0.6 && metrics.averageConfidenceScore < 0.85}
          red={metrics.averageConfidenceScore < 0.6}
        />
        <KpiCard
          value={fmtRate(metrics.overrideRate)}
          label="Override Rate"
          green={metrics.overrideRate <= 0.1}
          amber={metrics.overrideRate > 0.1 && metrics.overrideRate <= 0.3}
          red={metrics.overrideRate > 0.3}
        />
      </div>

      {/* ── Status Breakdown ── */}
      <div className={styles.breakdownCard}>
        <div className={styles.breakdownHeader}>
          <span className={styles.breakdownTitle}>
            SEBARAN STATUS ENCOUNTER ({metrics.totalEncounters})
          </span>
        </div>
        <div className={styles.breakdownBody}>
          {ORDERED_STATUSES.map(status => (
            <StatusRow
              key={status}
              label={STATUS_LABELS[status]}
              count={metrics.encountersByStatus[status] ?? 0}
              total={metrics.totalEncounters}
            />
          ))}
        </div>
      </div>
    </div>
  )
}
