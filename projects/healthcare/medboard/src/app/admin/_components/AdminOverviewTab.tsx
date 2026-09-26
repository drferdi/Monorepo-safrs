'use client'

import { safeUrl } from '@/lib/sanitize-url'
import {
  ArcElement,
  BarElement,
  CategoryScale,
  Chart as ChartJS,
  Legend,
  LinearScale,
  Tooltip,
} from 'chart.js'
import { useEffect, useRef, useState } from 'react'
import { Bar, Doughnut } from 'react-chartjs-2'
import { io, type Socket } from 'socket.io-client'

ChartJS.register(CategoryScale, LinearScale, BarElement, ArcElement, Tooltip, Legend)

/* ── Types ── */

interface PendingRegistration {
  id: string
  email: string
  username: string
  displayName: string
  institution: string
  profession: string
  role: string
  profile: {
    fullName: string
    birthPlace: string
    birthDate: string
    gender: string
    domicile: string
    degrees: string[]
    jobTitles: string[]
  }
  credentials: {
    employeeId?: string
    strNumber?: string
    sipNumber?: string
    serviceAreas: string[]
    serviceAreaOther?: string
  }
  createdAt: string
}

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

interface CrewMember {
  username: string
  displayName: string
  profession: string
  role: string
  avatarUrl: string | null
}

export interface OverviewData {
  kpi: KPI
  lb1Recent: LB1Entry[]
  emrRecent: EMREntry[]
  crew: CrewMember[]
  pendingRegistrations: PendingRegistration[]
}

interface OnlineUser {
  userId: string
  name: string
  role: string
  profession: string
}

export interface AdminSession {
  username: string
  displayName: string
  role: string
  profession: string
  institution: string
}

/* ── Helpers ── */

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
    case 'TRIAGE_OFFICER':
      return 'Triage Officer'
    default:
      return role
  }
}

function formatUptime(seconds: number): string {
  const d = Math.floor(seconds / 86400)
  const h = Math.floor((seconds % 86400) / 3600)
  const m = Math.floor((seconds % 3600) / 60)
  if (d > 0) return `${d}d ${h}h ${m}m`
  if (h > 0) return `${h}h ${m}m`
  return `${m}m`
}

function formatLatency(ms: number): string {
  if (ms < 1000) return `${ms}ms`
  return `${(ms / 1000).toFixed(1)}s`
}

function timeAgo(timestamp: string): string {
  const diff = Date.now() - new Date(timestamp).getTime()
  const mins = Math.floor(diff / 60000)
  if (mins < 1) return 'baru saja'
  if (mins < 60) return `${mins}m lalu`
  const hours = Math.floor(mins / 60)
  if (hours < 24) return `${hours}h lalu`
  const days = Math.floor(hours / 24)
  return `${days}d lalu`
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

/* ── Component ── */

export default function AdminOverviewTab({ session }: { session: AdminSession | null }) {
  const [data, setData] = useState<OverviewData | null>(null)
  const [onlineIds, setOnlineIds] = useState<Set<string>>(new Set())
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [actionLoading, setActionLoading] = useState<string | null>(null)
  const socketRef = useRef<Socket | null>(null)

  async function fetchOverview() {
    try {
      const res = await fetch('/api/admin/overview', { cache: 'no-store' })
      if (!res.ok) {
        const err = (await res.json().catch(() => null)) as {
          error?: string
        } | null
        setError(err?.error || 'Akses ditolak.')
        return
      }
      const overview = (await res.json()) as { ok: boolean } & OverviewData
      if (overview.ok) setData(overview)
    } catch {
      setError('Gagal memuat data.')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    void fetchOverview()
  }, [])

  useEffect(() => {
    if (!session) return
    const socket = io({
      path: '/socket.io',
      transports: ['websocket', 'polling'],
    })
    socketRef.current = socket

    socket.on('connect', () => {
      socket.emit('user:join', {
        userId: session.username,
        name: session.displayName,
        role: session.role,
        profession: session.profession,
        institution: session.institution,
      })
    })

    socket.on('users:online', (users: OnlineUser[]) => {
      setOnlineIds(new Set(users.map(u => u.userId)))
    })

    return () => {
      socket.disconnect()
      socketRef.current = null
    }
  }, [session])

  async function handleApprove(id: string) {
    setActionLoading(id)
    try {
      const res = await fetch(`/api/admin/registrations/${id}/approve`, {
        method: 'POST',
      })
      const body = (await res.json()) as { ok: boolean; error?: string }
      if (!body.ok) {
        alert(body.error || 'Gagal menyetujui.')
        return
      }
      await fetchOverview()
    } catch {
      alert('Gagal menyetujui pendaftaran.')
    } finally {
      setActionLoading(null)
    }
  }

  async function handleReject(id: string) {
    if (!confirm('Tolak pendaftaran ini?')) return
    setActionLoading(id)
    try {
      const res = await fetch(`/api/admin/registrations/${id}/reject`, {
        method: 'POST',
      })
      const body = (await res.json()) as { ok: boolean; error?: string }
      if (!body.ok) {
        alert(body.error || 'Gagal menolak.')
        return
      }
      await fetchOverview()
    } catch {
      alert('Gagal menolak pendaftaran.')
    } finally {
      setActionLoading(null)
    }
  }

  if (loading) {
    return (
      <div
        style={{
          padding: '40px 0',
          color: 'var(--text-muted)',
          fontSize: 13,
          letterSpacing: '0.1em',
        }}
      >
        LOADING OVERVIEW...
      </div>
    )
  }

  if (error || !data) {
    return (
      <div style={{ padding: '40px 0', color: 'var(--c-critical)', fontSize: 14 }}>
        {error || 'Data tidak tersedia.'}
      </div>
    )
  }

  const { kpi, lb1Recent, emrRecent, crew, pendingRegistrations } = data
  const onlineCount = onlineIds.size
  const pendingCount = pendingRegistrations?.length ?? 0

  /* ── Chart Data ── */

  const lb1SuccessEntries = lb1Recent.filter(r => r.status === 'success').reverse()
  const lb1Labels = lb1SuccessEntries.map(r => `${MONTH_NAMES[r.month] || r.month} ${r.year}`)

  const lb1BarData = {
    labels: lb1Labels,
    datasets: [
      {
        label: 'Rawat Jalan',
        data: lb1SuccessEntries.map(r => r.rawatJalan),
        backgroundColor: 'rgba(230,126,34,0.7)',
        borderRadius: 3,
      },
      {
        label: 'Rawat Inap',
        data: lb1SuccessEntries.map(r => r.rawatInap),
        backgroundColor: 'rgba(160,160,160,0.5)',
        borderRadius: 3,
      },
    ],
  }

  const lb1BarOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        display: true,
        labels: { color: '#A0A0A0', font: { size: 11 } },
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
      },
    },
  }

  const emrDonutData = {
    labels: ['Sukses', 'Parsial', 'Gagal'],
    datasets: [
      {
        data: [kpi.emrSuccess, kpi.emrPartial, kpi.emrFailed],
        backgroundColor: ['rgba(230,126,34,0.8)', 'rgba(160,160,160,0.6)', 'rgba(231,76,60,0.7)'],
        borderWidth: 0,
      },
    ],
  }

  const emrDonutOptions = {
    responsive: true,
    maintainAspectRatio: false,
    cutout: '65%',
    plugins: {
      legend: {
        display: true,
        position: 'bottom' as const,
        labels: { color: '#A0A0A0', font: { size: 11 }, padding: 12 },
      },
    },
  }

  return (
    <>
      {/* ── Pending Registrations ── */}
      {pendingCount > 0 && (
        <div
          style={{
            marginBottom: 28,
            padding: '20px 24px',
            borderRadius: 10,
            border: '1px solid rgba(230,126,34,0.25)',
            borderLeft: '4px solid #E67E22',
            background: 'var(--bg-nav)',
          }}
        >
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              marginBottom: 16,
            }}
          >
            <p
              style={{
                margin: 0,
                fontSize: 11,
                letterSpacing: '0.2em',
                color: 'var(--text-muted)',
              }}
            >
              PENDAFTARAN MENUNGGU
            </p>
            <span style={{ fontSize: 11, color: '#E67E22', fontWeight: 600 }}>
              {pendingCount} menunggu review
            </span>
          </div>

          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))',
              gap: 14,
            }}
          >
            {pendingRegistrations.map(reg => (
              <PendingCard
                key={reg.id}
                reg={reg}
                loading={actionLoading === reg.id}
                onApprove={() => handleApprove(reg.id)}
                onReject={() => handleReject(reg.id)}
              />
            ))}
          </div>
        </div>
      )}

      {/* ── KPI Cards ── */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(4, 1fr)',
          gap: 16,
          marginBottom: 28,
        }}
      >
        <KPICard
          label="TOTAL CREW"
          value={kpi.totalCrew}
          sub={`${onlineCount} online`}
          accent
          badge={pendingCount > 0 ? pendingCount : undefined}
        />
        <KPICard
          label="LB1 RUNS"
          value={kpi.lb1Runs}
          sub={`${kpi.lb1SuccessRuns} sukses · ${kpi.lb1FailedRuns} gagal`}
        />
        <KPICard label="TOTAL KUNJUNGAN" value={kpi.lb1TotalVisits} sub="dari LB1" />
        <KPICard
          label="EMR TRANSFER"
          value={kpi.emrTransfers}
          sub={`avg ${formatLatency(kpi.emrAvgLatencyMs)}`}
        />
      </div>

      {/* ── Charts Row ── */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: '1fr 320px',
          gap: 20,
          marginBottom: 28,
        }}
      >
        <div
          style={{
            padding: '18px 20px',
            borderRadius: 10,
            border: '1px solid var(--line-base)',
            background: 'var(--bg-nav)',
          }}
        >
          <p
            style={{
              margin: '0 0 14px',
              fontSize: 11,
              letterSpacing: '0.15em',
              color: 'var(--text-muted)',
            }}
          >
            KUNJUNGAN PER PERIODE
          </p>
          <div style={{ height: 220 }}>
            {lb1SuccessEntries.length > 0 ? (
              <Bar data={lb1BarData} options={lb1BarOptions} />
            ) : (
              <EmptyState text="Belum ada data LB1" />
            )}
          </div>
        </div>

        <div
          style={{
            padding: '18px 20px',
            borderRadius: 10,
            border: '1px solid var(--line-base)',
            background: 'var(--bg-nav)',
          }}
        >
          <p
            style={{
              margin: '0 0 14px',
              fontSize: 11,
              letterSpacing: '0.15em',
              color: 'var(--text-muted)',
            }}
          >
            EMR TRANSFER HEALTH
          </p>
          <div style={{ height: 220 }}>
            {kpi.emrTransfers > 0 ? (
              <Doughnut data={emrDonutData} options={emrDonutOptions} />
            ) : (
              <EmptyState text="Belum ada transfer EMR" />
            )}
          </div>
        </div>
      </div>

      {/* ── Activity + Crew Row ── */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: '1fr 1fr',
          gap: 20,
          marginBottom: 28,
        }}
      >
        <div
          style={{
            padding: '18px 20px',
            borderRadius: 10,
            border: '1px solid var(--line-base)',
            background: 'var(--bg-nav)',
          }}
        >
          <p
            style={{
              margin: '0 0 14px',
              fontSize: 11,
              letterSpacing: '0.15em',
              color: 'var(--text-muted)',
            }}
          >
            AKTIVITAS TERAKHIR
          </p>
          <div style={{ display: 'grid', gap: 8 }}>
            {[
              ...lb1Recent.map(r => ({
                type: 'LB1' as const,
                time: r.timestamp,
                ok: r.status === 'success',
                detail: `${MONTH_NAMES[r.month] || r.month} ${r.year} — ${r.rawatJalan + r.rawatInap} kunjungan`,
              })),
              ...emrRecent.map(r => ({
                type: 'EMR' as const,
                time: r.timestamp,
                ok: r.state === 'success',
                detail: r.error || `${formatLatency(r.totalLatencyMs)}`,
              })),
            ]
              .sort((a, b) => new Date(b.time).getTime() - new Date(a.time).getTime())
              .slice(0, 8)
              .map((item, i) => (
                <div
                  key={`${item.type}-${i}`}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 10,
                    padding: '8px 10px',
                    borderRadius: 6,
                    background: 'rgba(255,255,255,0.02)',
                  }}
                >
                  <span
                    style={{
                      fontSize: 9,
                      fontWeight: 600,
                      letterSpacing: '0.08em',
                      padding: '2px 6px',
                      borderRadius: 3,
                      background:
                        item.type === 'LB1' ? 'rgba(230,126,34,0.12)' : 'rgba(160,160,160,0.12)',
                      color: item.type === 'LB1' ? 'var(--c-asesmen)' : 'var(--text-muted)',
                    }}
                  >
                    {item.type}
                  </span>
                  <span
                    style={{
                      width: 6,
                      height: 6,
                      borderRadius: 99,
                      background: item.ok ? '#4CAF50' : 'var(--c-critical)',
                      flexShrink: 0,
                    }}
                  />
                  <span style={{ fontSize: 12, color: 'var(--text-main)', flex: 1 }}>
                    {item.detail}
                  </span>
                  <span
                    style={{
                      fontSize: 10,
                      color: 'var(--text-muted)',
                      opacity: 0.6,
                      flexShrink: 0,
                    }}
                  >
                    {timeAgo(item.time)}
                  </span>
                </div>
              ))}
            {lb1Recent.length === 0 && emrRecent.length === 0 && (
              <EmptyState text="Belum ada aktivitas" />
            )}
          </div>
        </div>

        <div
          style={{
            padding: '18px 20px',
            borderRadius: 10,
            border: '1px solid var(--line-base)',
            background: 'var(--bg-nav)',
          }}
        >
          <p
            style={{
              margin: '0 0 14px',
              fontSize: 11,
              letterSpacing: '0.15em',
              color: 'var(--text-muted)',
            }}
          >
            CREW STATUS
          </p>
          <div style={{ display: 'grid', gap: 6 }}>
            {crew.map(m => {
              const isOnline = onlineIds.has(m.username)
              return (
                <div
                  key={m.username}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 10,
                    padding: '8px 10px',
                    borderRadius: 6,
                    background: 'rgba(255,255,255,0.02)',
                  }}
                >
                  <div style={{ position: 'relative', flexShrink: 0 }}>
                    <img
                      src={safeUrl(m.avatarUrl, '/avatar/doctor-m.png')}
                      alt={m.displayName}
                      style={{
                        width: 32,
                        height: 32,
                        borderRadius: 8,
                        objectFit: 'cover',
                        background: 'var(--bg-canvas)',
                        border: '1px solid var(--line-base)',
                      }}
                    />
                    <div
                      style={{
                        position: 'absolute',
                        bottom: -1,
                        right: -1,
                        width: 10,
                        height: 10,
                        borderRadius: 99,
                        background: isOnline ? '#4CAF50' : 'var(--text-muted)',
                        border: '2px solid var(--bg-nav)',
                        opacity: isOnline ? 1 : 0.3,
                      }}
                    />
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div
                      style={{
                        fontSize: 13,
                        fontWeight: 500,
                        color: 'var(--text-main)',
                      }}
                    >
                      {m.displayName}
                    </div>
                    <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>
                      {m.profession} · {formatRole(m.role)}
                    </div>
                  </div>
                  {isOnline && (
                    <span
                      style={{
                        fontSize: 9,
                        letterSpacing: '0.08em',
                        color: '#4CAF50',
                        fontWeight: 600,
                      }}
                    >
                      LIVE
                    </span>
                  )}
                </div>
              )
            })}
          </div>
        </div>
      </div>

      {/* ── System Status Bar ── */}
      <div
        style={{
          display: 'flex',
          gap: 24,
          padding: '14px 20px',
          borderRadius: 10,
          border: '1px solid var(--line-base)',
          background: 'var(--bg-nav)',
          alignItems: 'center',
          flexWrap: 'wrap',
        }}
      >
        <StatusDot label="SERVER" value={`Uptime ${formatUptime(kpi.serverUptimeSeconds)}`} ok />
        <StatusDot label="CREW" value={`${kpi.totalCrew} terdaftar`} ok={kpi.totalCrew > 0} />
        <StatusDot
          label="LB1"
          value={kpi.lb1Runs > 0 ? `${kpi.lb1SuccessRuns}/${kpi.lb1Runs} sukses` : 'Belum ada run'}
          ok={kpi.lb1FailedRuns === 0}
        />
        <StatusDot
          label="EMR"
          value={
            kpi.emrTransfers > 0
              ? `${kpi.emrSuccess}/${kpi.emrTransfers} sukses`
              : 'Belum ada transfer'
          }
          ok={kpi.emrFailed === 0}
        />
      </div>
    </>
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
    <div
      style={{
        padding: '18px 20px',
        borderRadius: 10,
        border: accent ? '1px solid rgba(230,126,34,0.25)' : '1px solid var(--line-base)',
        background: 'var(--bg-nav)',
        position: 'relative',
      }}
    >
      {badge != null && badge > 0 && (
        <span
          style={{
            position: 'absolute',
            top: 10,
            right: 10,
            background: '#E67E22',
            color: '#fff',
            fontSize: 10,
            fontWeight: 700,
            borderRadius: 99,
            minWidth: 20,
            height: 20,
            display: 'inline-flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '0 6px',
          }}
        >
          +{badge}
        </span>
      )}
      <p
        style={{
          margin: 0,
          fontSize: 10,
          letterSpacing: '0.15em',
          color: 'var(--text-muted)',
        }}
      >
        {label}
      </p>
      <p
        style={{
          margin: '6px 0 4px',
          fontSize: 28,
          fontWeight: 600,
          color: accent ? 'var(--c-asesmen)' : 'var(--text-main)',
          lineHeight: 1,
        }}
      >
        {value.toLocaleString('id-ID')}
      </p>
      <p
        style={{
          margin: 0,
          fontSize: 11,
          color: 'var(--text-muted)',
          opacity: 0.7,
        }}
      >
        {sub}
      </p>
    </div>
  )
}

function StatusDot({ label, value, ok }: { label: string; value: string; ok: boolean }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
      <div
        style={{
          width: 7,
          height: 7,
          borderRadius: 99,
          background: ok ? '#4CAF50' : 'var(--c-critical)',
        }}
      />
      <span
        style={{
          fontSize: 10,
          letterSpacing: '0.1em',
          color: 'var(--text-muted)',
          fontWeight: 600,
        }}
      >
        {label}
      </span>
      <span style={{ fontSize: 11, color: 'var(--text-main)' }}>{value}</span>
    </div>
  )
}

function EmptyState({ text }: { text: string }) {
  return (
    <div
      style={{
        height: '100%',
        display: 'grid',
        placeItems: 'center',
        color: 'var(--text-muted)',
        fontSize: 12,
        opacity: 0.5,
      }}
    >
      {text}
    </div>
  )
}

const AVATAR_MAP: Record<string, string> = {
  Dokter: '/avatar/doctor-m.png',
  'Dokter Gigi': '/avatar/denstist-w.webp',
  Perawat: '/avatar/nurse-w.png',
  Bidan: '/avatar/doctor-w.png',
  Apoteker: '/avatar/pharmacy-w.png',
  'Triage Officer': '/avatar/nurse-w.png',
}

function PendingCard({
  reg,
  loading: busy,
  onApprove,
  onReject,
}: {
  reg: PendingRegistration
  loading: boolean
  onApprove: () => void
  onReject: () => void
}) {
  const avatar =
    reg.profile.gender === 'Laki-laki'
      ? reg.profession === 'Perawat' || reg.profession === 'Triage Officer'
        ? '/avatar/nurse-m.png'
        : '/avatar/doctor-m.png'
      : AVATAR_MAP[reg.profession] || '/avatar/doctor-w.png'

  return (
    <div
      style={{
        padding: '16px',
        borderRadius: 8,
        border: '1px solid var(--line-base)',
        background: 'rgba(255,255,255,0.02)',
        display: 'flex',
        flexDirection: 'column',
        gap: 10,
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
        <img
          src={avatar}
          alt={reg.displayName}
          style={{
            width: 40,
            height: 40,
            borderRadius: 8,
            objectFit: 'cover',
            background: 'var(--bg-canvas)',
            border: '1px solid var(--line-base)',
          }}
        />
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontSize: 14, fontWeight: 600, color: 'var(--text-main)' }}>
            {reg.profile.fullName || reg.displayName}
          </div>
          <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>
            {reg.profession} &middot; {formatRole(reg.role)}
          </div>
        </div>
      </div>

      <div
        style={{
          display: 'grid',
          gap: 4,
          fontSize: 11,
          color: 'var(--text-muted)',
        }}
      >
        <div>{reg.institution}</div>
        {reg.profile.degrees.length > 0 && <div>Gelar: {reg.profile.degrees.join(', ')}</div>}
        {reg.profile.jobTitles.length > 0 && <div>Jabatan: {reg.profile.jobTitles.join(', ')}</div>}
        {reg.credentials.serviceAreas.length > 0 && (
          <div>Layanan: {reg.credentials.serviceAreas.join(', ')}</div>
        )}
        {reg.credentials.employeeId && <div>NIP: {reg.credentials.employeeId}</div>}
        {reg.credentials.strNumber && <div>STR: {reg.credentials.strNumber}</div>}
        <div style={{ opacity: 0.6 }}>Daftar: {timeAgo(reg.createdAt)}</div>
      </div>

      <div style={{ display: 'flex', gap: 8, marginTop: 4 }}>
        <button
          onClick={onApprove}
          disabled={busy}
          style={{
            flex: 1,
            padding: '7px 0',
            border: 'none',
            borderRadius: 6,
            background: busy ? 'rgba(230,126,34,0.3)' : '#E67E22',
            color: '#fff',
            fontSize: 11,
            fontWeight: 600,
            letterSpacing: '0.08em',
            cursor: busy ? 'not-allowed' : 'pointer',
          }}
        >
          {busy ? '...' : 'TERIMA'}
        </button>
        <button
          onClick={onReject}
          disabled={busy}
          style={{
            padding: '7px 14px',
            border: '1px solid var(--line-base)',
            borderRadius: 6,
            background: 'transparent',
            color: 'var(--text-muted)',
            fontSize: 11,
            fontWeight: 500,
            cursor: busy ? 'not-allowed' : 'pointer',
          }}
        >
          TOLAK
        </button>
      </div>
    </div>
  )
}
