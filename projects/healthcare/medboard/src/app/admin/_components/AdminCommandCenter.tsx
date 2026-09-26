'use client'

import {
  CategoryScale,
  Chart as ChartJS,
  Filler,
  Legend,
  LinearScale,
  LineController,
  LineElement,
  PointElement,
  Tooltip,
  type TooltipItem,
} from 'chart.js'
import { useEffect, useRef, useState } from 'react'
import { Line } from 'react-chartjs-2'
import { io, type Socket } from 'socket.io-client'
import styles from './AdminCommandCenter.module.css'

ChartJS.register(
  CategoryScale,
  LinearScale,
  LineController,
  LineElement,
  PointElement,
  Filler,
  Tooltip,
  Legend
)

/* ── Types ── */

export interface AdminSession {
  username: string
  displayName: string
  role: string
  profession: string
  institution: string
}

interface KPI {
  totalCrew: number
  pendingRegistrations: number
  onlineToday: number
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

interface ModuleHealth {
  lb1: {
    status: 'ok' | 'error' | 'unknown'
    lastRun: string | null
    lastStatus: string | null
  }
  emr: {
    status: 'ok' | 'warning' | 'error' | 'unknown'
    lastRun: string | null
    lastStatus: string | null
  }
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

interface CrewMember {
  username: string
  displayName: string
  profession: string
  role: string
  avatarUrl: string | null
}

interface ServerMetrics {
  memoryRssMb: number
  heapUsedMb: number
  heapTotalMb: number
  externalMb: number
  uptimeSeconds: number
  nodeVersion: string
  platform: string
  railway: {
    environment: string | null
    serviceName: string | null
    deploymentId: string | null
    publicDomain: string | null
    region: string | null
  } | null
}

interface UsageTodayData {
  hours: string[]
  dashboardCounts: number[]
  emrClinicalCounts: number[]
}

interface OverviewResponse {
  ok: boolean
  kpi: KPI
  moduleHealth: ModuleHealth
  serverMetrics: ServerMetrics
  serverTime: string
  lb1Recent: LB1Entry[]
  emrRecent: EMREntry[]
  crew: CrewMember[]
  pendingRegistrations: {
    id: string
    username: string
    displayName: string
    profession: string
    institution: string
    createdAt: string
    status: string
  }[]
  usageToday: UsageTodayData
  recentLogins: string[]
  topUsers: Array<{
    username: string
    dashboardCount: number
    emrClinicalCount: number
    totalActivity: number
  }>
}

interface OnlineUser {
  userId: string
  name: string
  role: string
  profession: string
}

/* ── Helpers ── */

function formatUptime(seconds: number): string {
  const d = Math.floor(seconds / 86400)
  const h = Math.floor((seconds % 86400) / 3600)
  const m = Math.floor((seconds % 3600) / 60)
  if (d > 0) return `${d}d ${h}h ${m}m`
  if (h > 0) return `${h}h ${m}m`
  return `${m}m`
}

function timeAgo(timestamp: string): string {
  const diff = Date.now() - new Date(timestamp).getTime()
  const mins = Math.floor(diff / 60000)
  if (mins < 1) return 'baru saja'
  if (mins < 60) return `${mins}m lalu`
  const hours = Math.floor(mins / 60)
  if (hours < 24) return `${hours}h lalu`
  return `${Math.floor(hours / 24)}d lalu`
}

function formatRole(role: string): string {
  switch (role) {
    case 'CEO':
    case 'CEO_SENTRA':
      return 'Chief Executive Officer'
    case 'ADMINISTRATOR':
      return 'Administrator'
    case 'DOKTER':
      return 'Dokter'
    case 'DOKTER_GIGI':
      return 'Dokter Gigi'
    case 'PERAWAT':
      return 'Perawat'
    case 'BIDAN':
      return 'Bidan'
    case 'APOTEKER':
      return 'Apoteker'
    default:
      return role
  }
}

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

/* ── Module Health Color Resolver ── */

function healthDotVariant(
  module: 'lb1' | 'emr' | 'voice',
  health: ModuleHealth,
  socketConnected: boolean
): string {
  if (module === 'lb1') {
    if (health.lb1.status === 'ok') return styles.statusOk
    if (health.lb1.status === 'error') return styles.statusError
    return styles.statusUnknown
  }
  if (module === 'emr') {
    if (health.emr.status === 'ok') return styles.statusOk
    if (health.emr.status === 'warning') return styles.statusWarning
    if (health.emr.status === 'error') return styles.statusError
    return styles.statusUnknown
  }
  // voice
  return socketConnected ? styles.statusOk : styles.statusError
}

function healthLabel(
  module: 'lb1' | 'emr' | 'voice',
  health: ModuleHealth,
  socketConnected: boolean
): string {
  if (module === 'lb1') {
    if (health.lb1.status === 'ok') return 'Operational'
    if (health.lb1.status === 'error') return 'Error'
    return 'Unknown'
  }
  if (module === 'emr') {
    if (health.emr.status === 'ok') return 'Operational'
    if (health.emr.status === 'warning') return 'Warning'
    if (health.emr.status === 'error') return 'Error'
    return 'Unknown'
  }
  return socketConnected ? 'Available' : 'Unavailable'
}

/* ── Alert Item ── */

interface AlertItem {
  source: 'PENDING' | 'SYSTEM'
  timestamp: string
  message: string
  priority: 'high' | 'critical'
}

function computeAlerts(
  pendingRegistrations: { id: string; username: string; displayName: string; createdAt: string }[],
  moduleHealth: ModuleHealth,
  serverMetrics: ServerMetrics | null
): AlertItem[] {
  const alerts: AlertItem[] = []

  // 1. Pending Registrations (High Priority)
  if (pendingRegistrations.length > 0) {
    const oldestPending = pendingRegistrations.sort(
      (a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()
    )[0]
    const hoursAgo = Math.floor(
      (Date.now() - new Date(oldestPending.createdAt).getTime()) / (1000 * 60 * 60)
    )

    alerts.push({
      source: 'PENDING',
      timestamp: oldestPending.createdAt,
      message: `${pendingRegistrations.length} registrasi menunggu approval${hoursAgo > 24 ? ` (terlama ${Math.floor(hoursAgo / 24)} hari)` : hoursAgo > 0 ? ` (terlama ${hoursAgo} jam)` : ''}`,
      priority: 'high',
    })
  }

  // 2. Critical System Errors
  // Module Health Issues
  if (moduleHealth.lb1.status === 'error') {
    alerts.push({
      source: 'SYSTEM',
      timestamp: moduleHealth.lb1.lastRun || new Date().toISOString(),
      message: `LB1 module error - ${moduleHealth.lb1.lastStatus || 'unknown status'}`,
      priority: 'critical',
    })
  }

  if (moduleHealth.emr.status === 'error') {
    alerts.push({
      source: 'SYSTEM',
      timestamp: moduleHealth.emr.lastRun || new Date().toISOString(),
      message: `EMR module error - ${moduleHealth.emr.lastStatus || 'unknown status'}`,
      priority: 'critical',
    })
  }

  if (moduleHealth.emr.status === 'warning') {
    alerts.push({
      source: 'SYSTEM',
      timestamp: moduleHealth.emr.lastRun || new Date().toISOString(),
      message: `EMR module warning - ${moduleHealth.emr.lastStatus || 'partial success'}`,
      priority: 'high',
    })
  }

  // Server/Database Issues
  if (serverMetrics) {
    // Check memory usage (if heap used > 90% of heap total)
    const heapUsagePercent = (serverMetrics.heapUsedMb / serverMetrics.heapTotalMb) * 100
    if (heapUsagePercent > 90) {
      alerts.push({
        source: 'SYSTEM',
        timestamp: new Date().toISOString(),
        message: `Memory usage tinggi: ${Math.round(heapUsagePercent)}% (${serverMetrics.heapUsedMb}MB / ${serverMetrics.heapTotalMb}MB)`,
        priority: 'critical',
      })
    }

    // Check RSS memory (if > 1GB)
    if (serverMetrics.memoryRssMb > 1024) {
      alerts.push({
        source: 'SYSTEM',
        timestamp: new Date().toISOString(),
        message: `RSS memory tinggi: ${serverMetrics.memoryRssMb}MB`,
        priority: 'high',
      })
    }
  }

  // Sort: critical first, then by timestamp (newest first)
  alerts.sort((a, b) => {
    if (a.priority === 'critical' && b.priority !== 'critical') return -1
    if (a.priority !== 'critical' && b.priority === 'critical') return 1
    return new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
  })

  return alerts
}

/* ── Component ── */

interface MetricSnapshot {
  time: string
  uptimeSeconds: number
}

export default function AdminCommandCenter({ session }: { session: AdminSession | null }) {
  const [data, setData] = useState<OverviewResponse | null>(null)
  const [onlineUsers, setOnlineUsers] = useState<OnlineUser[]>([])
  const [socketConnected, setSocketConnected] = useState(false)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const socketRef = useRef<Socket | null>(null)
  const [metricHistory, setMetricHistory] = useState<MetricSnapshot[]>([])

  /* ── Fetch overview data ── */

  useEffect(() => {
    async function fetchData() {
      try {
        const res = await fetch('/api/admin/overview', { cache: 'no-store' })
        if (!res.ok) {
          const err = (await res.json().catch(() => null)) as {
            error?: string
          } | null
          setError(err?.error || 'Akses ditolak.')
          return
        }
        const body = (await res.json()) as OverviewResponse
        if (body.ok) {
          setData(body)
          if (body.serverMetrics) {
            const now = new Date()
            setMetricHistory([
              {
                time: `${now.getHours().toString().padStart(2, '0')}:${now.getMinutes().toString().padStart(2, '0')}:${now.getSeconds().toString().padStart(2, '0')}`,
                uptimeSeconds: body.serverMetrics.uptimeSeconds,
              },
            ])
          }
        } else {
          setError('Data tidak tersedia.')
        }
      } catch {
        setError('Gagal memuat data.')
      } finally {
        setLoading(false)
      }
    }
    void fetchData()
  }, [])

  /* ── Poll server metrics every 30s ── */

  const hasInitialData = useRef(false)

  useEffect(() => {
    if (data && !hasInitialData.current) hasInitialData.current = true
  }, [data])

  useEffect(() => {
    const interval = setInterval(async () => {
      if (!hasInitialData.current) return
      try {
        const res = await fetch('/api/admin/overview', { cache: 'no-store' })
        if (!res.ok) return
        const body = (await res.json()) as OverviewResponse
        if (!body.ok || !body.serverMetrics) return
        setData(body)
        const now = new Date()
        setMetricHistory(prev => {
          const next = [
            ...prev,
            {
              time: `${now.getHours().toString().padStart(2, '0')}:${now.getMinutes().toString().padStart(2, '0')}:${now.getSeconds().toString().padStart(2, '0')}`,
              uptimeSeconds: body.serverMetrics.uptimeSeconds,
            },
          ]
          return next.length > 30 ? next.slice(-30) : next
        })
      } catch {
        /* silent */
      }
    }, 30_000)
    return () => clearInterval(interval)
  }, [])

  /* ── Socket.IO ── */

  useEffect(() => {
    if (!session) return

    const socket = io({
      path: '/socket.io',
      transports: ['websocket', 'polling'],
    })
    socketRef.current = socket

    socket.on('connect', () => {
      setSocketConnected(true)
      socket.emit('user:join', {
        userId: session.username,
        name: session.displayName,
        role: session.role,
        profession: session.profession,
        institution: session.institution,
      })
    })

    socket.on('disconnect', () => {
      setSocketConnected(false)
    })

    socket.on('users:online', (users: OnlineUser[]) => {
      setOnlineUsers(users)
    })

    return () => {
      socket.disconnect()
      socketRef.current = null
    }
  }, [session])

  /* ── Loading / Error states ── */

  if (loading) {
    return (
      <div className={`${styles.statusMessage} ${styles.loadingMessage}`}>
        LOADING COMMAND CENTER...
      </div>
    )
  }

  if (error || !data) {
    return (
      <div className={`${styles.statusMessage} ${styles.errorMessage}`}>
        {error || 'Data tidak tersedia.'}
      </div>
    )
  }

  /* ── Derived Data ── */

  const {
    kpi,
    moduleHealth,
    serverMetrics,
    serverTime,
    lb1Recent,
    emrRecent,
    crew,
    pendingRegistrations,
    usageToday,
    recentLogins,
    topUsers,
  } = data
  const onlineCount = onlineUsers.length
  const pendingCount = pendingRegistrations?.length ?? 0
  const alerts = computeAlerts(pendingRegistrations, moduleHealth, serverMetrics)

  // Helper: Get user info from username
  const getUserInfo = (username: string): CrewMember | null => {
    return (crew || []).find(c => c.username === username) || null
  }

  // Ensure arrays exist
  const safeRecentLogins = recentLogins || []
  const safeTopUsers = topUsers || []

  /* ── Chart 1: Aktivitas Dashboard (Penggunaan Dashboard & EMR Klinis hari ini) ── */

  const activityChartData = {
    labels: usageToday?.hours || [],
    datasets: [
      {
        label: 'Dashboard',
        data: usageToday?.dashboardCounts || [],
        borderColor: '#E67E22',
        backgroundColor: 'rgba(230,126,34,0.08)',
        tension: 0.3,
        pointRadius: 3,
        pointBackgroundColor: '#E67E22',
        fill: true,
      },
      {
        label: 'EMR Klinis',
        data: usageToday?.emrClinicalCounts || [],
        borderColor: '#A0A0A0',
        backgroundColor: 'rgba(160,160,160,0.04)',
        tension: 0.3,
        pointRadius: 3,
        pointBackgroundColor: '#A0A0A0',
        fill: true,
      },
    ],
  }

  const activityChartOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        display: true,
        labels: { color: '#A0A0A0', font: { size: 10 } },
      },
      tooltip: { mode: 'index' as const, intersect: false },
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
  }

  /* ── Chart 2: Performa Server (server uptime) ── */

  // Format uptime seconds to hours for display
  const formatUptimeHours = (seconds: number): number => {
    return Math.round((seconds / 3600) * 100) / 100 // Convert to hours with 2 decimals
  }

  const serverChartData = {
    labels: metricHistory.map(s => s.time),
    datasets: [
      {
        label: 'Uptime (jam)',
        data: metricHistory.map(s => formatUptimeHours(s.uptimeSeconds)),
        borderColor: '#E67E22',
        backgroundColor: 'rgba(230,126,34,0.08)',
        tension: 0.3,
        pointRadius: 3,
        pointBackgroundColor: '#E67E22',
        fill: true,
      },
    ],
  }

  const serverChartOptions = {
    responsive: true,
    maintainAspectRatio: false,
    animation: { duration: 400 },
    plugins: {
      legend: {
        display: true,
        labels: { color: '#A0A0A0', font: { size: 10 } },
      },
      tooltip: {
        mode: 'index' as const,
        intersect: false,
        callbacks: {
          label: (context: TooltipItem<'line'>) => {
            const hours = context.parsed.y ?? 0
            const days = Math.floor(hours / 24)
            const remainingHours = Math.floor(hours % 24)
            const minutes = Math.floor((hours % 1) * 60)
            if (days > 0) {
              return `Uptime: ${days}d ${remainingHours}h ${minutes}m`
            }
            return `Uptime: ${remainingHours}h ${minutes}m`
          },
        },
      },
    },
    scales: {
      x: {
        ticks: { color: '#777', font: { size: 9 }, maxTicksLimit: 10 },
        grid: { color: 'rgba(255,255,255,0.04)' },
      },
      y: {
        ticks: {
          color: '#777',
          font: { size: 10 },
          callback: (value: number | string) => {
            const hours = typeof value === 'number' ? value : Number.parseFloat(value)
            const days = Math.floor(hours / 24)
            const remainingHours = Math.floor(hours % 24)
            if (days > 0) {
              return `${days}d ${remainingHours}h`
            }
            return `${remainingHours}h`
          },
        },
        grid: { color: 'rgba(255,255,255,0.04)' },
        beginAtZero: true,
      },
    },
  }

  const isRailway = !!serverMetrics?.railway

  /* ── Module Health Entries ── */

  const modules: { key: 'lb1' | 'emr' | 'voice'; label: string }[] = [
    { key: 'lb1', label: 'LB1' },
    { key: 'emr', label: 'EMR' },
    { key: 'voice', label: 'Voice' },
  ]

  /* ── Render ── */

  return (
    <div className={styles.root}>
      {/* ── KPI Cards Row ── */}
      <div className={styles.kpiGrid}>
        <KPICard
          label="TOTAL CREW"
          value={kpi.totalCrew}
          sub={`${pendingCount > 0 ? `+${pendingCount} pending` : 'terdaftar'}`}
          accent
          badge={pendingCount > 0 ? pendingCount : undefined}
        />
        <KPICard
          label="ONLINE NOW"
          value={onlineCount}
          sub={socketConnected ? 'realtime' : 'disconnected'}
        />
        <KPICard label="ONLINE TODAY" value={kpi.onlineToday} sub="user yang login hari ini" />
        <KPICard
          label="PENDING REGISTRATION"
          value={pendingCount}
          sub={pendingCount > 0 ? 'menunggu approval' : 'tidak ada'}
        />
      </div>

      {/* ── Charts: Aktivitas + Server ── */}
      <div className={styles.chartGrid}>
        {/* Chart: Aktivitas Penggunaan */}
        <div className={styles.chartCard}>
          <p className={styles.chartTitle}>AKTIVITAS DASHBOARD</p>
          <div className={styles.chartCanvas}>
            {usageToday && usageToday.hours.length > 0 ? (
              <Line data={activityChartData} options={activityChartOptions} />
            ) : (
              <EmptyState text="Belum ada data aktivitas hari ini" />
            )}
          </div>
        </div>

        {/* Chart: Performa Server (real-time memory) */}
        <div className={styles.chartCard}>
          <div className={styles.chartHeader}>
            <p className={styles.chartTitleCompact}>PERFORMA SERVER</p>
            <div className={styles.chartMeta}>
              {isRailway && <span className={styles.railwayBadge}>RAILWAY</span>}
              {serverMetrics && (
                <span className={styles.chartMetaText}>
                  {serverMetrics.nodeVersion} · {serverMetrics.platform}
                </span>
              )}
            </div>
          </div>
          <div className={styles.chartCanvas}>
            {metricHistory.length > 0 ? (
              <Line data={serverChartData} options={serverChartOptions} />
            ) : (
              <EmptyState text="Mengumpulkan data..." />
            )}
          </div>
        </div>
      </div>

      {/* ── User Dashboard + Alerts Row ── */}
      <div className={styles.usersAlertsGrid}>
        {/* User Dashboard */}
        <div className={styles.chartCard}>
          <div className={styles.chartHeader}>
            <p className={styles.chartTitleCompact}>USER DASHBOARD</p>
          </div>

          {/* User Statistics */}
          <div className={styles.userStatsGrid}>
            <div className={styles.userStatCard}>
              <div className={styles.userStatValue}>{kpi.totalCrew}</div>
              <div className={styles.userStatLabel}>Total Crew</div>
            </div>
            <div className={styles.userStatCard}>
              <div className={styles.userStatValue}>{kpi.onlineToday}</div>
              <div className={styles.userStatLabel}>Login Hari Ini</div>
            </div>
            <div className={styles.userStatCard}>
              <div className={styles.userStatValue}>{onlineCount}</div>
              <div className={styles.userStatLabel}>Online Now</div>
            </div>
            <div className={styles.userStatCard}>
              <div className={styles.userStatValue}>{pendingCount}</div>
              <div className={styles.userStatLabel}>Pending</div>
            </div>
          </div>

          {/* Recent Logins */}
          <div className={styles.userSection}>
            <div className={styles.userSectionTitle}>Recent Logins ({safeRecentLogins.length})</div>
            <div className={styles.userList}>
              {safeRecentLogins.length > 0 ? (
                safeRecentLogins.slice(0, 5).map(username => {
                  const userInfo = getUserInfo(username)
                  if (!userInfo) return null
                  return (
                    <div key={username} className={styles.userRow}>
                      <div className={`${styles.userDot} ${styles.statusOk}`} />
                      <div className={styles.userInfo}>
                        <div className={styles.userName}>{userInfo.displayName}</div>
                        <div className={styles.userMeta}>
                          {userInfo.profession} · {formatRole(userInfo.role)}
                        </div>
                      </div>
                    </div>
                  )
                })
              ) : (
                <EmptyState text="Belum ada login hari ini" />
              )}
            </div>
          </div>

          {/* Pending Registrations */}
          {pendingCount > 0 && (
            <div className={styles.userSection}>
              <div className={styles.userSectionTitle}>Pending Registrations ({pendingCount})</div>
              <div className={styles.userList}>
                {pendingRegistrations.slice(0, 5).map(reg => (
                  <div key={reg.id} className={styles.userRow}>
                    <div className={`${styles.userDot} ${styles.statusWarning}`} />
                    <div className={styles.userInfo}>
                      <div className={styles.userName}>{reg.displayName}</div>
                      <div className={styles.userMeta}>
                        {reg.profession} · {timeAgo(reg.createdAt)}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Top Users */}
          <div className={styles.userSection}>
            <div className={styles.userSectionTitle}>Top Users (Hari Ini)</div>
            <div className={styles.userList}>
              {safeTopUsers.length > 0 ? (
                safeTopUsers.slice(0, 5).map(topUser => {
                  const userInfo = getUserInfo(topUser.username)
                  if (!userInfo) return null
                  return (
                    <div key={topUser.username} className={styles.userRow}>
                      <div className={`${styles.userDot} ${styles.statusOk}`} />
                      <div className={styles.userInfo}>
                        <div className={styles.userName}>{userInfo.displayName}</div>
                        <div className={styles.userMeta}>
                          {topUser.totalActivity} aktivitas ({topUser.dashboardCount} dashboard,{' '}
                          {topUser.emrClinicalCount} EMR)
                        </div>
                      </div>
                    </div>
                  )
                })
              ) : (
                <EmptyState text="Belum ada aktivitas hari ini" />
              )}
            </div>
          </div>
        </div>

        {/* Alert Feed */}
        <div className={styles.chartCard}>
          <div className={styles.chartHeader}>
            <p className={styles.chartTitleCompact}>ALERT FEED</p>
            {alerts.length > 0 && (
              <span className={styles.alertCountBadge}>
                {alerts.length} alert{alerts.length > 1 ? 's' : ''}
              </span>
            )}
          </div>
          <div className={styles.alertList}>
            {alerts.length > 0 ? (
              alerts.slice(0, 12).map((alert, i) => (
                <div key={`alert-${i}`} className={styles.alertRow}>
                  <span
                    className={
                      alert.source === 'PENDING'
                        ? `${styles.alertSource} ${styles.alertSourceLb1}`
                        : `${styles.alertSource} ${styles.alertSourceEmr}`
                    }
                  >
                    {alert.source}
                  </span>
                  <div className={styles.alertBody}>
                    <div className={styles.alertMessage}>
                      {alert.priority === 'critical' && '🔴 '}
                      {alert.priority === 'high' && '⚠️ '}
                      {alert.message}
                    </div>
                  </div>
                  <span className={styles.alertTime}>{timeAgo(alert.timestamp)}</span>
                </div>
              ))
            ) : (
              <EmptyState text="Tidak ada alert" />
            )}
          </div>
        </div>
      </div>
    </div>
  )
}

/* ── Sub-components ── */

function KPICard({
  label,
  value,
  sub,
  accent,
  badge,
}: {
  label: string
  value: number
  sub: string
  accent?: boolean
  badge?: number
}) {
  return (
    <div className={accent ? `${styles.kpiCard} ${styles.kpiCardAccent}` : styles.kpiCard}>
      <span
        className={accent ? `${styles.kpiTopLine} ${styles.kpiTopLineAccent}` : styles.kpiTopLine}
      />
      {badge != null && badge > 0 && <span className={styles.kpiBadge}>+{badge}</span>}
      <p className={styles.kpiLabel}>{label}</p>
      <p className={accent ? `${styles.kpiValue} ${styles.kpiValueAccent}` : styles.kpiValue}>
        {value.toLocaleString('id-ID')}
      </p>
      <p className={styles.kpiSub}>{sub}</p>
    </div>
  )
}

function EmptyState({ text }: { text: string }) {
  return <div className={styles.emptyState}>{text}</div>
}
