// Drferdi — vision, brought to life.
'use client'

import {
  ArcElement,
  BarController,
  BarElement,
  CategoryScale,
  Chart as ChartJS,
  Filler,
  Legend,
  LinearScale,
  LineController,
  LineElement,
  PointElement,
  Tooltip,
} from 'chart.js'
import { useEffect, useState } from 'react'
import { Bar, Doughnut, Line } from 'react-chartjs-2'
import styles from './AdminAnalytics.module.css'

ChartJS.register(
  LineController,
  LineElement,
  PointElement,
  CategoryScale,
  LinearScale,
  BarController,
  BarElement,
  ArcElement,
  Filler,
  Tooltip,
  Legend
)

/* ── Types ── */

interface KPI {
  totalCrew: number
  pendingRegistrations: number
  lb1Runs: number
  lb1SuccessRuns: number
  lb1FailedRuns: number
  lb1TotalVisits: number
  emrTransfers: number
  emrSuccess: number
  emrPartial: number
  emrFailed: number
  emrAvgLatencyMs: number
  serverUptimeSeconds: number
}

interface LB1Entry {
  id: string
  timestamp: string
  status: string
  year: number
  month: number
  rawatJalan: number
  rawatInap: number
  validRows: number
  invalidRows: number
}

interface EMREntry {
  id: string
  timestamp: string
  state: string
  totalLatencyMs: number
  error: string | null
}

interface OverviewData {
  kpi: KPI
  lb1Recent: LB1Entry[]
  emrRecent: EMREntry[]
}

/* ── Helpers ── */

const MONTH_NAMES = [
  '',
  'Jan',
  'Feb',
  'Mar',
  'Apr',
  'Mei',
  'Jun',
  'Jul',
  'Agu',
  'Sep',
  'Okt',
  'Nov',
  'Des',
]

function formatLatency(ms: number): string {
  if (ms < 1000) return `${ms}ms`
  return `${(ms / 1000).toFixed(1)}s`
}

function buildPeakHoursData(lb1: LB1Entry[], emr: EMREntry[]): number[] {
  const hours = new Array(24).fill(0)
  for (const entry of lb1) {
    const h = new Date(entry.timestamp).getHours()
    if (!isNaN(h)) hours[h]++
  }
  for (const entry of emr) {
    const h = new Date(entry.timestamp).getHours()
    if (!isNaN(h)) hours[h]++
  }
  return hours
}

/* ── Component ── */

export default function AdminAnalytics() {
  const [data, setData] = useState<OverviewData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    let cancelled = false
    async function fetchData() {
      try {
        const res = await fetch('/api/admin/overview', { cache: 'no-store' })
        if (!res.ok) throw new Error(`HTTP ${res.status}`)
        const json = await res.json()
        if (!cancelled) setData(json)
      } catch (err) {
        if (!cancelled) setError(err instanceof Error ? err.message : 'Fetch failed')
      } finally {
        if (!cancelled) setLoading(false)
      }
    }
    fetchData()
    return () => {
      cancelled = true
    }
  }, [])

  if (loading) {
    return (
      <div className={`${styles.statusMessage} ${styles.loadingMessage}`}>LOADING ANALYTICS...</div>
    )
  }

  if (error || !data) {
    return (
      <div className={`${styles.statusMessage} ${styles.errorMessage}`}>
        Gagal memuat data analytics: {error || 'No data'}
      </div>
    )
  }

  const { kpi, lb1Recent, emrRecent } = data

  /* ── Line Chart: Kunjungan Trend ── */

  const successEntries = lb1Recent
    .filter(e => e.status === 'success')
    .slice()
    .reverse() // chronological order

  const lineLabels = successEntries.map(e => `${MONTH_NAMES[e.month]} ${e.year}`)

  const lineData = {
    labels: lineLabels,
    datasets: [
      {
        label: 'Rawat Jalan',
        data: successEntries.map(e => e.rawatJalan),
        borderColor: 'rgba(0, 33, 71, 0.9)',
        backgroundColor: 'rgba(0, 33, 71, 0.1)',
        fill: true,
        tension: 0.3,
        pointRadius: 4,
      },
      {
        label: 'Rawat Inap',
        data: successEntries.map(e => e.rawatInap),
        borderColor: 'rgba(160,160,160,0.7)',
        backgroundColor: 'rgba(160,160,160,0.05)',
        fill: true,
        tension: 0.3,
        pointRadius: 4,
      },
    ],
  }

  const lineOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        labels: { color: '#777', font: { size: 11 } },
      },
      tooltip: {
        backgroundColor: 'rgba(20,20,20,0.95)',
        titleColor: '#ccc',
        bodyColor: '#ddd',
      },
    },
    scales: {
      x: {
        ticks: { color: '#777', font: { size: 10 } },
        grid: { color: 'rgba(255,255,255,0.04)' },
      },
      y: {
        ticks: { color: '#777', font: { size: 10 } },
        grid: { color: 'rgba(255,255,255,0.04)' },
        beginAtZero: true,
      },
    },
  } as const

  /* ── Doughnut Chart: EMR Transfer Health ── */

  const showDoughnut = kpi.emrTransfers > 0

  const doughnutData = {
    labels: ['Sukses', 'Parsial', 'Gagal'],
    datasets: [
      {
        data: [kpi.emrSuccess, kpi.emrPartial, kpi.emrFailed],
        backgroundColor: ['rgba(0, 33, 71, 0.8)', 'rgba(160,160,160,0.6)', 'rgba(231,76,60,0.7)'],
        borderWidth: 0,
      },
    ],
  }

  const doughnutOptions = {
    responsive: true,
    cutout: '65%',
    plugins: {
      legend: {
        position: 'bottom' as const,
        labels: { color: '#777', font: { size: 11 }, padding: 16 },
      },
      tooltip: {
        backgroundColor: 'rgba(20,20,20,0.95)',
        titleColor: '#ccc',
        bodyColor: '#ddd',
      },
    },
  }

  /* ── Bar Chart: Peak Hours ── */

  const peakHours = buildPeakHoursData(lb1Recent, emrRecent)
  const hourLabels = Array.from({ length: 24 }, (_, i) => i.toString().padStart(2, '0') + ':00')

  const barData = {
    labels: hourLabels,
    datasets: [
      {
        label: 'Aktivitas',
        data: peakHours,
        backgroundColor: 'rgba(0, 33, 71, 0.5)',
        borderRadius: 3,
      },
    ],
  }

  const barOptions = {
    responsive: true,
    maintainAspectRatio: false,
    indexAxis: 'y' as const,
    plugins: {
      legend: { display: false },
      tooltip: {
        backgroundColor: 'rgba(20,20,20,0.95)',
        titleColor: '#ccc',
        bodyColor: '#ddd',
      },
    },
    scales: {
      x: {
        ticks: { color: '#777', font: { size: 10 } },
        grid: { color: 'rgba(255,255,255,0.04)' },
        beginAtZero: true,
      },
      y: {
        ticks: { color: '#777', font: { size: 9 } },
        grid: { color: 'rgba(255,255,255,0.04)' },
      },
    },
  } as const

  /* ── KPI Summary ── */

  const emrSuccessRate =
    kpi.emrTransfers > 0 ? ((kpi.emrSuccess / kpi.emrTransfers) * 100).toFixed(1) : '0'
  const emrSuccessRateClassName =
    Number(emrSuccessRate) >= 90 ? `${styles.kpiValue} ${styles.kpiValueHealthy}` : styles.kpiValue

  return (
    <div className={styles.analyticsRoot}>
      {/* ── Section: Kunjungan Trend ── */}
      <div className={styles.card}>
        <div className={styles.sectionTitle}>Kunjungan Trend</div>
        <div className={styles.lineChartPanel}>
          <Line data={lineData} options={lineOptions} />
        </div>
      </div>

      {/* ── Section: EMR + Peak Hours Row ── */}
      <div className={styles.sectionRow}>
        {/* EMR Transfer Health */}
        {showDoughnut && (
          <div className={`${styles.card} ${styles.emrCard}`}>
            <div className={styles.sectionTitle}>EMR Transfer Health</div>
            <div className={styles.doughnutPanel}>
              <Doughnut data={doughnutData} options={doughnutOptions} />
            </div>
          </div>
        )}

        {/* Peak Hours */}
        <div className={`${styles.card} ${styles.peakHoursCard}`}>
          <div className={styles.sectionTitle}>Distribusi Jam Aktivitas</div>
          <div className={styles.barChartPanel}>
            <Bar data={barData} options={barOptions} />
          </div>
        </div>
      </div>

      {/* ── Section: Summary KPI Row ── */}
      <div className={styles.kpiRow}>
        <div className={`${styles.card} ${styles.kpiCard}`}>
          <div className={styles.kpiValue}>{kpi.lb1TotalVisits.toLocaleString()}</div>
          <div className={styles.kpiLabel}>Total LB1 Kunjungan</div>
        </div>

        <div className={`${styles.card} ${styles.kpiCard}`}>
          <div className={styles.kpiValue}>{kpi.emrTransfers.toLocaleString()}</div>
          <div className={styles.kpiLabel}>Total EMR Transfers</div>
        </div>

        <div className={`${styles.card} ${styles.kpiCard}`}>
          <div className={styles.kpiValue}>{formatLatency(kpi.emrAvgLatencyMs)}</div>
          <div className={styles.kpiLabel}>EMR Avg Latency</div>
        </div>

        <div className={`${styles.card} ${styles.kpiCard}`}>
          <div className={emrSuccessRateClassName}>{emrSuccessRate}%</div>
          <div className={styles.kpiLabel}>EMR Success Rate</div>
        </div>
      </div>
    </div>
  )
}
