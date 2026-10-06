'use client'

import {
  AlertCircle,
  CheckCircle,
  Clock,
  Inbox,
  Phone,
  Plus,
  RefreshCw,
  Trash2,
  Video,
  Wifi,
  WifiOff,
  XCircle,
} from 'lucide-react'
import { useRouter } from 'next/navigation'
import type React from 'react'
import { useCallback, useEffect, useMemo, useState } from 'react'
import { io as socketIO } from 'socket.io-client'
import { AppointmentBooking } from '@/components/telemedicine/AppointmentBooking'
import { MiraDifferentialCard } from '@/components/telemedicine/MiraDifferentialCard'
import { isDoctorProfession } from '@/lib/crew-access'
import { buildEmrSourceHref, EMR_SOURCE_ORIGINS } from '@/lib/emr/source-trace'
import type { MiraDifferential } from '@/lib/telemedicine/mira-differential'
import type { AppointmentStatus, AppointmentWithDetails } from '@/types/telemedicine.types'

import styles from './telemedicine.module.css'

interface TeleRequest {
  id: string
  nama: string
  usia: string
  hp: string
  poli: string
  bpjs: string | null
  keluhan: string
  status: 'PENDING' | 'SEEN' | 'HANDLED'
  createdAt: string
}

interface AssistConsult {
  consultId: string
  targetDoctorId: string
  sentAt: string
  patient: { name: string; age: number; gender: string; rm: string }
  ttv: {
    sbp: string
    dbp: string
    hr: string
    rr: string
    temp: string
    spo2: string
    glucose: string
  }
  keluhan_utama: string
  risk_factors: string[]
  anthropometrics: {
    tinggi: number
    berat: number
    imt: number
    hasil_imt: string
    lingkar_perut: number
  }
  penyakit_kronis: string[]
  keluhan_tambahan?: string
  alergi?: string[]
  status_kehamilan?: 'hamil' | 'tidak_hamil' | 'tidak_diisi'
  disability_type?: string
  obesity_confirmation?: 'confirmed' | 'not_confirmed'
  clinical_context?: {
    facility_name?: string
    special_conditions?: string[]
    pregnancy_risk?: string
  }
  canonical_clinical?: {
    news2?: {
      score: number
      risk_level: 'low' | 'low-medium' | 'medium' | 'high'
      drivers: string[]
    }
    trajectory?: {
      overall_trend?: 'improving' | 'declining' | 'stable' | 'insufficient_data'
      overall_risk?: 'low' | 'moderate' | 'high' | 'critical'
      deterioration_state?: 'improving' | 'stable' | 'deteriorating' | 'critical'
      narrative?: string
    }
    immediate_actions?: string[]
  }
  /** MIRA's differential, when Assist had one for this encounter */
  mira_differential?: MiraDifferential
}

function humanizeCanonicalValue(value: string | undefined): string {
  return String(value || '')
    .replace(/_/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
}

function canonicalUrgencyWeight(level: string | undefined): number {
  switch (level) {
    case 'critical':
    case 'high':
    case 'deteriorating':
      return 3
    case 'medium':
    case 'moderate':
      return 2
    case 'low-medium':
    case 'stable':
    case 'warning':
      return 1
    default:
      return 0
  }
}

function resolveCanonicalSnapshotTone(consult: AssistConsult['canonical_clinical'] | undefined) {
  const news2Risk = consult?.news2?.risk_level
  const overallRisk = consult?.trajectory?.overall_risk
  const deterioration = consult?.trajectory?.deterioration_state
  const urgencyWeight = Math.max(
    canonicalUrgencyWeight(news2Risk),
    canonicalUrgencyWeight(overallRisk),
    canonicalUrgencyWeight(deterioration)
  )

  if (urgencyWeight >= 3) {
    return {
      label: 'Risiko Tinggi',
      emphasis: 'Perlu tindakan segera',
      background: 'var(--critical-tint)',
      border: 'var(--critical)',
      pillBackground: 'var(--critical-tint)',
      pillColor: 'var(--critical)',
    }
  }

  if (urgencyWeight >= 2) {
    return {
      label: 'Risiko Sedang',
      emphasis: 'Perlu monitoring ketat',
      background: 'var(--warning-tint)',
      border: 'var(--warning)',
      pillBackground: 'var(--warning-tint)',
      pillColor: 'var(--warning)',
    }
  }

  return {
    label: 'Risiko Rendah',
    emphasis: 'Tetap perlu review klinis',
    background: 'var(--success-tint)',
    border: 'var(--success)',
    pillBackground: 'var(--success-tint)',
    pillColor: 'var(--success)',
  }
}

function getConsultUrgencyScore(consult: AssistConsult): number {
  const news2Risk = consult.canonical_clinical?.news2?.risk_level
  const overallRisk = consult.canonical_clinical?.trajectory?.overall_risk
  const deterioration = consult.canonical_clinical?.trajectory?.deterioration_state

  return Math.max(
    canonicalUrgencyWeight(news2Risk),
    canonicalUrgencyWeight(overallRisk),
    canonicalUrgencyWeight(deterioration)
  )
}

function sortAssistConsults(consults: AssistConsult[]): AssistConsult[] {
  return [...consults].sort((left, right) => {
    const urgencyDelta = getConsultUrgencyScore(right) - getConsultUrgencyScore(left)
    if (urgencyDelta !== 0) return urgencyDelta

    const rightTime = new Date(right.sentAt).getTime()
    const leftTime = new Date(left.sentAt).getTime()
    return rightTime - leftTime
  })
}

type OverviewMetricTone = 'green' | 'muted' | 'accent' | 'gold'

const METRIC_BADGE_CLASS: Record<OverviewMetricTone, string> = {
  green: 'ui-badge ui-badge--success',
  accent: 'ui-badge ui-badge--accent',
  gold: 'ui-badge ui-badge--primary',
  muted: 'ui-badge ui-badge--neutral',
}

function OverviewMetric({
  label,
  value,
  hint,
  toneVariant,
  statusWord,
}: {
  label: string
  value: string
  hint: string
  toneVariant: OverviewMetricTone
  statusWord: string
}) {
  return (
    <div className={styles.kpi}>
      <div className={styles.kpiHeader}>
        <span className={styles.kpiLabel}>{label}</span>
        <span className={METRIC_BADGE_CLASS[toneVariant]}>{statusWord}</span>
      </div>
      <div className={styles.kpiValue}>{value}</div>
      <div className={styles.kpiHint}>{hint}</div>
    </div>
  )
}

/* ── Status config ── */
type StatusTone = 'warning' | 'primary' | 'success' | 'neutral' | 'critical'

const STATUS_CONFIG: Record<
  AppointmentStatus,
  { label: string; tone: StatusTone; icon: React.ReactNode }
> = {
  PENDING: { label: 'Menunggu', tone: 'warning', icon: <Clock size={12} /> },
  CONFIRMED: {
    label: 'Dikonfirmasi',
    tone: 'primary',
    icon: <CheckCircle size={12} />,
  },
  IN_PROGRESS: {
    label: 'Berlangsung',
    tone: 'success',
    icon: <Video size={12} />,
  },
  COMPLETED: {
    label: 'Selesai',
    tone: 'neutral',
    icon: <CheckCircle size={12} />,
  },
  CANCELLED: {
    label: 'Dibatalkan',
    tone: 'critical',
    icon: <XCircle size={12} />,
  },
  NO_SHOW: {
    label: 'Tidak Hadir',
    tone: 'warning',
    icon: <AlertCircle size={12} />,
  },
}

const ACTIVE_APPOINTMENT_STATUSES: AppointmentStatus[] = ['PENDING', 'CONFIRMED', 'IN_PROGRESS']
const PAST_APPOINTMENT_STATUSES: AppointmentStatus[] = ['COMPLETED', 'CANCELLED', 'NO_SHOW']

/* ── Patient pathway ── */
const FLOW_STEPS = [
  {
    code: 'PETUGAS',
    label: 'Isi No. HP Pasien',
    sub: 'saat buat appointment',
  },
  {
    code: 'SISTEM',
    label: 'Generate Token Unik',
    sub: 'disimpan ke database',
  },
  {
    code: 'WHATSAPP',
    label: 'Kirim Link via WhatsApp',
    sub: '/join/[token]',
  },
  {
    code: 'PASIEN',
    label: 'Klik Link → Buka Browser',
    sub: 'tanpa install / login',
  },
  {
    code: 'INPUT',
    label: 'Masukkan Nama',
    sub: 'klik Masuk Konsultasi',
  },
  {
    code: 'LIVEKIT',
    label: 'Connect ke Video Room',
    sub: 'role: PATIENT',
  },
  {
    code: 'SELESAI',
    label: 'Dokter & Pasien Terhubung',
    sub: 'konsultasi berlangsung',
  },
]

function PatientFlowDiagram() {
  const [visibleItems, setVisibleItems] = useState(0)

  useEffect(() => {
    setVisibleItems(0)
    const timer = setInterval(() => {
      setVisibleItems(prev => (prev >= FLOW_STEPS.length ? prev : prev + 1))
    }, 180)
    return () => clearInterval(timer)
  }, [])

  return (
    <div className={styles.card}>
      <div className={styles.cardHead}>
        <div>
          <h2 className={styles.cardTitle}>Pathway Pasien</h2>
          <p className={styles.cardText}>
            Tahapan praktis dari pembuatan appointment sampai pasien masuk ke room konsultasi.
          </p>
        </div>
      </div>

      <div>
        {FLOW_STEPS.map((step, i) => {
          const isFinal = i === 6
          return (
            <div key={step.code} className={styles.step} style={{ opacity: i < visibleItems ? 1 : 0 }}>
              <div className={isFinal ? `${styles.stepCode} ${styles.stepCodeFinal}` : styles.stepCode}>
                {step.code}
              </div>
              <div
                className={isFinal ? `${styles.stepLabel} ${styles.stepLabelFinal}` : styles.stepLabel}
              >
                {step.label}
              </div>
              <div className={styles.stepSub}>{step.sub}</div>
            </div>
          )
        })}
      </div>
    </div>
  )
}

/* ── AppointmentRow ── */
interface AppointmentCardProps {
  appointment: AppointmentWithDetails
  onJoin?: () => void
}

function AppointmentRow({ appointment, onJoin }: AppointmentCardProps) {
  const status = STATUS_CONFIG[appointment.status]
  const isActive = ACTIVE_APPOINTMENT_STATUSES.includes(appointment.status)
  const scheduledAt = new Date(appointment.scheduledAt)
  const isInProgress = appointment.status === 'IN_PROGRESS'
  const appointmentType =
    appointment.consultationType === 'VIDEO'
      ? 'Video'
      : appointment.consultationType === 'AUDIO'
        ? 'Audio'
        : 'Chat'

  return (
    <div
      className={styles.row}
      onMouseEnter={e => {
        ;(e.currentTarget as HTMLDivElement).style.background = 'var(--surface-subtle)'
      }}
      onMouseLeave={e => {
        ;(e.currentTarget as HTMLDivElement).style.background = 'transparent'
      }}
    >
      <div className={styles.rowMain}>
        <div className={styles.rowTop}>
          <span className={styles.rowId}>#{appointment.id.slice(-8).toUpperCase()}</span>
          <span className={`ui-badge ui-badge--${status.tone}`}>
            {status.icon}&nbsp;{status.label}
          </span>
          <span className="ui-badge ui-badge--neutral">{appointmentType}</span>
        </div>
        <div className={styles.rowName}>Pasien {appointment.patientId}</div>
        <div className={styles.rowMeta}>
          <span>
            {scheduledAt.toLocaleString('id-ID', {
              dateStyle: 'medium',
              timeStyle: 'short',
            })}
          </span>
          <span className={styles.sep}>·</span>
          <span>{appointment.durationMinutes}m</span>
          <span className={styles.sep}>·</span>
          <span>{appointment.doctorId}</span>
          {appointment.patientPhone && (
            <>
              <span className={styles.sep}>·</span>
              <span>{appointment.patientPhone}</span>
            </>
          )}
          {appointment.keluhanUtama && (
            <>
              <span className={styles.sep}>·</span>
              <span>
                {appointment.keluhanUtama.slice(0, 35)}
                {appointment.keluhanUtama.length > 35 ? '…' : ''}
              </span>
            </>
          )}
        </div>
      </div>
      {isActive && onJoin && (
        <button onClick={onJoin} className="ui-btn ui-btn--primary ui-btn--sm">
          <Video size={12} />
          {isInProgress ? 'MASUK' : 'JOIN'}
        </button>
      )}
    </div>
  )
}

/* ── RequestInbox ── */
function RequestInbox({
  requests,
  onMarkHandled,
  onDeleteRequest,
}: {
  requests: TeleRequest[]
  onMarkHandled: (id: string) => void
  onDeleteRequest: (id: string) => void
}) {
  const pending = requests.filter(r => r.status === 'PENDING')
  const handled = requests.filter(r => r.status === 'HANDLED')
  const [visibleItems, setVisibleItems] = useState(0)
  const [deletingId, setDeletingId] = useState<string | null>(null)
  const allRequests = [...pending, ...handled]

  useEffect(() => {
    setVisibleItems(0)
    if (allRequests.length > 0) {
      const timer = setInterval(() => {
        setVisibleItems(prev => (prev >= allRequests.length ? prev : prev + 1))
      }, 180)
      return () => clearInterval(timer)
    }
  }, [requests.length])

  const formatTime = (iso: string) => {
    const d = new Date(iso)
    return d.toLocaleTimeString('id-ID', {
      hour: '2-digit',
      minute: '2-digit',
    })
  }

  const handleDelete = (id: string) => {
    if (confirm('Hapus request ini?')) {
      setDeletingId(id)
      onDeleteRequest(id)
      setTimeout(() => setDeletingId(null), 300)
    }
  }

  return (
    <div className={styles.card}>
      <div className={styles.cardHead}>
        <div>
          <h2 className={styles.cardTitle}>Triage Request</h2>
          <p className={styles.cardText}>
            Request masuk dari website untuk dipilah, ditindaklanjuti, atau diarsipkan.
          </p>
        </div>
        {pending.length > 0 && (
          <span className="ui-badge ui-badge--accent">{pending.length} baru</span>
        )}
      </div>

      {requests.length === 0 ? (
        <div className={styles.emptyBlock}>
          <Inbox size={24} />
          <div>belum ada request</div>
        </div>
      ) : (
        <div>
          {allRequests.map((req, i) => (
            <div
              key={req.id}
              className={
                req.status === 'PENDING'
                  ? `${styles.request} ${styles.requestPending}`
                  : styles.request
              }
              style={{ opacity: i < visibleItems ? 1 : 0 }}
            >
              <div className={styles.requestTop}>
                <div className={styles.requestWho}>
                  {/* Silhouette Wajah */}
                  <div
                    className={
                      req.status === 'PENDING'
                        ? `${styles.avatar} ${styles.avatarPending}`
                        : styles.avatar
                    }
                  >
                    {req.nama.toLowerCase().includes('ibu') ||
                    req.nama.toLowerCase().includes('ny') ||
                    req.nama.toLowerCase().includes('siti') ||
                    req.nama.toLowerCase().includes('ani') ||
                    req.nama.toLowerCase().includes('wi') ||
                    req.nama.toLowerCase().includes('ma') ? (
                      /* Silhouette Wajah Perempuan */
                      <svg width="28" height="28" viewBox="0 0 48 48" fill="currentColor">
                        {/* Kepala */}
                        <ellipse cx="24" cy="20" rx="10" ry="12" opacity="0.9" />
                        {/* Rambut - model perempuan */}
                        <path
                          d="M14 16c0-6 4.5-11 10-11s10 5 10 11c0 3-1 6-3 8-1-3-3.5-5-7-5s-6 2-7 5c-2-2-3-5-3-8z"
                          opacity="0.7"
                        />
                        {/* Leher */}
                        <rect x="20" y="30" width="8" height="6" rx="2" opacity="0.9" />
                        {/* Bahu */}
                        <path d="M12 38c0-3 3-5 6-5h12c3 0 6 2 6 5v2H12v-2z" opacity="0.8" />
                        {/* Poni rambut */}
                        <path
                          d="M16 14c2-2 5-3 8-3s6 1 8 3"
                          stroke="currentColor"
                          strokeWidth="1.5"
                          fill="none"
                          opacity="0.5"
                        />
                      </svg>
                    ) : (
                      /* Silhouette Wajah Laki-laki */
                      <svg width="28" height="28" viewBox="0 0 48 48" fill="currentColor">
                        {/* Kepala */}
                        <ellipse cx="24" cy="21" rx="10" ry="11" opacity="0.9" />
                        {/* Rambut - model laki-laki pendek */}
                        <path
                          d="M14 18c0-5.5 4.5-10 10-10s10 4.5 10 10c0 1.5-.3 3-1 4-.5-2-2-3.5-4-3.5s-3.5 1.5-5 1.5-3-1.5-5-1.5-3.5 1.5-4 3.5c-.7-1-1-2.5-1-4z"
                          opacity="0.7"
                        />
                        {/* Leher */}
                        <rect x="20" y="31" width="8" height="5" rx="1" opacity="0.9" />
                        {/* Bahu/leher atas */}
                        <path
                          d="M14 38c0-2.5 2.5-4.5 5-4.5h10c2.5 0 5 2 5 4.5v2H14v-2z"
                          opacity="0.8"
                        />
                        {/* Garis rambut samping */}
                        <path
                          d="M14 20c0-4 2-7 5-8"
                          stroke="currentColor"
                          strokeWidth="1"
                          fill="none"
                          opacity="0.4"
                        />
                        <path
                          d="M34 20c0-4-2-7-5-8"
                          stroke="currentColor"
                          strokeWidth="1"
                          fill="none"
                          opacity="0.4"
                        />
                      </svg>
                    )}
                  </div>
                  <span
                    className={styles.rowName}
                    style={{
                      color: req.status === 'PENDING' ? 'var(--text)' : 'var(--text-secondary)',
                      fontWeight: req.status === 'PENDING' ? 500 : 400,
                    }}
                  >
                    {req.nama}
                  </span>
                  <span className={styles.requestSmall}>{req.usia}th</span>
                </div>
                <div className={styles.requestWho}>
                  <span className={styles.requestSmall}>{formatTime(req.createdAt)}</span>
                  <button
                    onClick={() => handleDelete(req.id)}
                    disabled={deletingId === req.id}
                    title="Hapus request"
                    className={styles.iconButton}
                  >
                    <Trash2 size={14} />
                  </button>
                </div>
              </div>
              <div className={styles.requestMeta}>
                <Phone size={12} />
                <span>{req.hp}</span>
                <span className="ui-badge ui-badge--primary">{req.poli}</span>
              </div>
              {req.bpjs && <div className={styles.requestSmall}>BPJS: {req.bpjs}</div>}
              <div className={styles.requestComplaint}>
                {req.keluhan.length > 60 ? req.keluhan.slice(0, 60) + '…' : req.keluhan}
              </div>
              {req.status === 'PENDING' && (
                <div>
                  <button
                    onClick={() => onMarkHandled(req.id)}
                    className="ui-btn ui-btn--secondary ui-btn--sm"
                  >
                    TANDAI HANDLED
                  </button>
                </div>
              )}
              {req.status === 'HANDLED' && <span className={styles.requestSmall}>✓ handled</span>}
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

/* ── Main Page ── */
export default function TelemedicinePage(): React.JSX.Element {
  const router = useRouter()
  const [appointments, setAppointments] = useState<AppointmentWithDetails[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [showBooking, setShowBooking] = useState(false)
  const [isOnline, setIsOnline] = useState(false)
  const [isDoctor, setIsDoctor] = useState(false)
  const [togglingStatus, setTogglingStatus] = useState(false)
  const [requests, setRequests] = useState<TeleRequest[]>([])
  const [consults, setConsults] = useState<AssistConsult[]>([])
  const [activeConsult, setActiveConsult] = useState<AssistConsult | null>(null)
  const [acceptingConsult, setAcceptingConsult] = useState(false)
  const [acceptedForTransfer, setAcceptedForTransfer] = useState<{
    consultId: string
    patientName: string
  } | null>(null)
  const [transferPelayananId, setTransferPelayananId] = useState('')
  const [transferLoading, setTransferLoading] = useState(false)
  const [transferError, setTransferError] = useState<string | null>(null)
  const [doctorName, setDoctorName] = useState<string>('')
  const canonicalSnapshotTone = useMemo(
    () => resolveCanonicalSnapshotTone(activeConsult?.canonical_clinical),
    [activeConsult]
  )
  const sortedConsults = useMemo(() => sortAssistConsults(consults), [consults])
  const topConsultTone = useMemo(
    () => resolveCanonicalSnapshotTone(sortedConsults[0]?.canonical_clinical),
    [sortedConsults]
  )

  const loadAppointments = useCallback(async () => {
    setIsLoading(true)
    try {
      const res = await fetch('/api/telemedicine/appointments?limit=30')
      const data = (await res.json()) as { data?: AppointmentWithDetails[] }
      setAppointments(data.data ?? [])
    } catch {
      setAppointments([])
    } finally {
      setIsLoading(false)
    }
  }, [])

  const loadRequests = useCallback(async () => {
    try {
      const res = await fetch('/api/telemedicine/request')
      const data = (await res.json()) as {
        ok: boolean
        requests?: TeleRequest[]
      }
      setRequests(data.requests ?? [])
    } catch {
      /* silent */
    }
  }, [])

  useEffect(() => {
    void (async () => {
      try {
        const res = await fetch('/api/auth/session')
        const data = (await res.json()) as {
          user?: { displayName?: string; profession?: string }
        }
        const name = data.user?.displayName ?? ''
        const profession = data.user?.profession ?? ''
        const isDocProfession = isDoctorProfession(profession)
        if (isDocProfession) {
          setIsDoctor(true)
          setDoctorName(name)
          const statusRes = await fetch('/api/telemedicine/doctor-status')
          const statusData = (await statusRes.json()) as {
            doctors?: { doctorName: string }[]
          }
          const online = (statusData.doctors ?? []).some(d => d.doctorName === name)
          setIsOnline(online)
        }
      } catch {
        /* silent */
      }
    })()
  }, [])

  useEffect(() => {
    const socket = socketIO({ path: '/socket.io', transports: ['websocket'] })
    socket.on('telemedicine:new-request', (req: TeleRequest) => {
      setRequests(prev => (prev.some(item => item.id === req.id) ? prev : [req, ...prev]))
      try {
        const ctx = new AudioContext()
        const t = ctx.currentTime
        const o1 = ctx.createOscillator()
        const g1 = ctx.createGain()
        o1.connect(g1)
        g1.connect(ctx.destination)
        o1.frequency.value = 880
        g1.gain.setValueAtTime(0.4, t)
        g1.gain.exponentialRampToValueAtTime(0.001, t + 0.6)
        o1.start(t)
        o1.stop(t + 0.6)
        const o2 = ctx.createOscillator()
        const g2 = ctx.createGain()
        o2.connect(g2)
        g2.connect(ctx.destination)
        o2.frequency.value = 1100
        g2.gain.setValueAtTime(0.3, t + 0.15)
        g2.gain.exponentialRampToValueAtTime(0.001, t + 0.8)
        o2.start(t + 0.15)
        o2.stop(t + 0.8)
      } catch {
        /* AudioContext tidak tersedia */
      }
    })

    socket.on('assist:consult', (payload: AssistConsult) => {
      // CONTRACT: targetDoctorId harus sama persis dengan session.displayName
      // (EMR/Asisten Medis mengirim displayName dokter yang ditarget)
      setDoctorName(currentName => {
        if (payload.targetDoctorId === currentName) {
          setConsults(prev =>
            prev.some(c => c.consultId === payload.consultId)
              ? prev
              : sortAssistConsults([payload, ...prev])
          )
          setActiveConsult(payload)
          // Notif suara — income.mp3 (fallback 3 beep jika file tidak ada)
          try {
            const audio = new Audio('/sounds/income.mp3')
            audio.volume = 0.8
            void audio.play().catch(() => {
              const ctx = new AudioContext()
              ;[0, 0.2, 0.4].forEach(delay => {
                const o = ctx.createOscillator()
                const g = ctx.createGain()
                o.connect(g)
                g.connect(ctx.destination)
                o.frequency.value = 1320
                g.gain.setValueAtTime(0.3, ctx.currentTime + delay)
                g.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + delay + 0.15)
                o.start(ctx.currentTime + delay)
                o.stop(ctx.currentTime + delay + 0.15)
              })
            })
          } catch {
            /* silent */
          }
        }
        return currentName
      })
    })

    return () => {
      socket.disconnect()
    }
  }, [])

  // DB fallback: poll /api/consult/pending every 15s to catch consults
  // that Socket.IO missed (e.g. connection drop, Railway proxy timeout)
  useEffect(() => {
    if (!isDoctor || !doctorName) return

    let cancelled = false

    const pollPending = async () => {
      try {
        const res = await fetch('/api/consult/pending')
        if (!res.ok) return
        const data = (await res.json()) as { ok: boolean; consults?: AssistConsult[] }
        if (!data.ok || !data.consults?.length) return
        if (cancelled) return

        setConsults(prev => {
          const existingIds = new Set(prev.map(c => c.consultId))
          const newConsults = data.consults!.filter(c => !existingIds.has(c.consultId))
          if (newConsults.length === 0) return prev
          return sortAssistConsults([...newConsults, ...prev])
        })
      } catch {
        /* silent — socket is primary, this is fallback */
      }
    }

    // Initial poll after 3s (give socket time to connect first)
    const initialTimer = setTimeout(() => {
      void pollPending()
    }, 3_000)

    // Then poll every 15s
    const interval = setInterval(() => {
      void pollPending()
    }, 15_000)

    return () => {
      cancelled = true
      clearTimeout(initialTimer)
      clearInterval(interval)
    }
  }, [isDoctor, doctorName])

  useEffect(() => {
    void loadAppointments()
    void loadRequests()
  }, [loadAppointments, loadRequests])

  const handleToggleOnline = async () => {
    setTogglingStatus(true)
    try {
      const res = await fetch('/api/telemedicine/doctor-status', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ isOnline: !isOnline }),
      })
      const data = (await res.json()) as { ok: boolean; isOnline?: boolean }
      if (data.ok) setIsOnline(data.isOnline ?? false)
    } catch {
      /* silent */
    } finally {
      setTogglingStatus(false)
    }
  }

  const handleMarkHandled = async (id: string) => {
    try {
      await fetch(`/api/telemedicine/request/${id}/handled`, {
        method: 'POST',
      })
      setRequests(prev => prev.map(r => (r.id === id ? { ...r, status: 'HANDLED' as const } : r)))
    } catch {
      /* silent */
    }
  }

  const handleDeleteRequest = async (id: string) => {
    try {
      const res = await fetch(`/api/telemedicine/request/${id}`, {
        method: 'DELETE',
      })
      if (res.ok) {
        setRequests(prev => prev.filter(r => r.id !== id))
      }
    } catch {
      /* silent */
    }
  }

  const handleBookingSuccess = useCallback(
    (appointmentId: string) => {
      setShowBooking(false)
      void loadAppointments()
      router.push(`/telemedicine/${appointmentId}`)
    },
    [loadAppointments, router]
  )

  const handleAcceptConsult = useCallback(async () => {
    if (!activeConsult) return
    setAcceptingConsult(true)
    try {
      const res = await fetch('/api/consult/accept', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          consultId: activeConsult.consultId,
          consult: activeConsult,
        }),
      })
      const data = (await res.json()) as { ok?: boolean; error?: string }
      if (data.ok) {
        setConsults(prev => prev.filter(c => c.consultId !== activeConsult.consultId))
        setActiveConsult(null)
        setTransferError(null)
        setAcceptedForTransfer({
          consultId: activeConsult.consultId,
          patientName: activeConsult.patient.name,
        })
      }
    } catch {
      // Gagal persist — modal tetap terbuka, user bisa coba lagi
    } finally {
      setAcceptingConsult(false)
    }
  }, [activeConsult])

  const activeAppointments = appointments.filter(a =>
    ACTIVE_APPOINTMENT_STATUSES.includes(a.status)
  )
  const pastAppointments = appointments.filter(a => PAST_APPOINTMENT_STATUSES.includes(a.status))
  const pendingRequests = requests.filter(request => request.status === 'PENDING')
  const latestActive = activeAppointments[0]

  return (
    <div className={styles.page}>
      {/* ── ASSIST CONSULT MODAL ── */}
      {activeConsult && (
        <div className="ui-dialog-backdrop" style={{ zIndex: 9999 }}>
          <div className="ui-dialog" style={{ maxWidth: 480 }}>
            <div className="ui-dialog__header">
              <div className={styles.dialogHead}>
                <div>
                  <div className={styles.dialogLabel}>Asisten Medis — Konsultasi</div>
                  <h2 className="ui-dialog__title">{activeConsult.patient.name}</h2>
                  <div className={styles.kpiHint}>
                    {activeConsult.patient.age} thn ·{' '}
                    {activeConsult.patient.gender === 'L' ? 'Laki-laki' : 'Perempuan'} · RM{' '}
                    {activeConsult.patient.rm}
                  </div>
                </div>
              </div>
              <button
                onClick={() => setActiveConsult(null)}
                className="ui-btn ui-btn--ghost ui-btn--sm"
              >
                ✕
              </button>
            </div>

            <div className={styles.dialogBody}>
              {/* Keluhan */}
              <div className={styles.dialogSection}>
                <div className={styles.dialogLabel}>Keluhan Utama</div>
                <div className={styles.dialogText}>{activeConsult.keluhan_utama}</div>
              </div>

              {/* TTV Grid */}
              <div className={`${styles.dialogSection} ${styles.ttvGrid}`}>
                {[
                  {
                    label: 'TD',
                    value: `${activeConsult.ttv.sbp}/${activeConsult.ttv.dbp}`,
                    unit: 'mmHg',
                  },
                  { label: 'Nadi', value: activeConsult.ttv.hr, unit: 'x/mnt' },
                  { label: 'RR', value: activeConsult.ttv.rr, unit: 'x/mnt' },
                  { label: 'Suhu', value: activeConsult.ttv.temp, unit: '°C' },
                  { label: 'SpO2', value: activeConsult.ttv.spo2, unit: '%' },
                  {
                    label: 'GDS',
                    value: activeConsult.ttv.glucose,
                    unit: 'mg/dL',
                  },
                ].map(v => (
                  <div key={v.label} className={styles.ttvCell}>
                    <div className={styles.dialogLabel}>{v.label}</div>
                    <div className={styles.ttvValue}>{v.value}</div>
                    <div className={styles.kpiLabel}>{v.unit}</div>
                  </div>
                ))}
              </div>

              {/* Anthropometrics */}
              <div className={styles.dialogSection}>
                <div className={styles.dialogLabel}>Antropometri</div>
                <div className={`${styles.chips} ${styles.dialogText}`} style={{ gap: 16 }}>
                  <span>
                    TB: <b>{activeConsult.anthropometrics.tinggi} cm</b>
                  </span>
                  <span>
                    BB: <b>{activeConsult.anthropometrics.berat} kg</b>
                  </span>
                  <span>
                    IMT: <b>{activeConsult.anthropometrics.imt}</b> (
                    {activeConsult.anthropometrics.hasil_imt})
                  </span>
                </div>
              </div>

              {/* Risk factors */}
              {activeConsult.risk_factors.length > 0 && (
                <div className={`${styles.dialogSection} ${styles.chips}`}>
                  {activeConsult.risk_factors.map((r, i) => (
                    <span
                      key={`risk-${i}-${String(r).slice(0, 24)}`}
                      className="ui-badge ui-badge--critical"
                    >
                      {r}
                    </span>
                  ))}
                </div>
              )}

              {activeConsult.mira_differential && (
                <MiraDifferentialCard differential={activeConsult.mira_differential} />
              )}

              {activeConsult.canonical_clinical && (
                <div
                  style={{
                    background: canonicalSnapshotTone.background,
                    borderLeft: `2px solid ${canonicalSnapshotTone.border}`,
                    borderRadius: '0 var(--radius-sm) var(--radius-sm) 0',
                    padding: 'var(--gap-md) var(--gap-lg)',
                  }}
                >
                  <div className={styles.snapshotTop}>
                    <div className={styles.dialogLabel} style={{ marginBottom: 0 }}>
                      Canonical Clinical Snapshot
                    </div>
                    <span
                      className="ui-badge"
                      style={{
                        background: canonicalSnapshotTone.pillBackground,
                        color: canonicalSnapshotTone.pillColor,
                      }}
                    >
                      {canonicalSnapshotTone.label}
                    </span>
                  </div>

                  <div className={styles.snapshotValue} style={{ marginBottom: 'var(--gap-md)' }}>
                    {canonicalSnapshotTone.emphasis}
                  </div>

                  <div
                    className={styles.snapshotGrid}
                    style={{
                      marginBottom:
                        activeConsult.canonical_clinical.immediate_actions?.length ||
                        activeConsult.canonical_clinical.trajectory?.narrative
                          ? 12
                          : 0,
                    }}
                  >
                    <div>
                      <div className={styles.dialogLabel}>Canonical NEWS2</div>
                      <div className={styles.snapshotValue}>
                        {activeConsult.canonical_clinical.news2
                          ? `${activeConsult.canonical_clinical.news2.score} · ${humanizeCanonicalValue(
                              activeConsult.canonical_clinical.news2.risk_level
                            )}`
                          : 'Tidak tersedia'}
                      </div>
                    </div>

                    <div>
                      <div className={styles.dialogLabel}>Canonical Trajectory</div>
                      <div className={styles.snapshotValue}>
                        {activeConsult.canonical_clinical.trajectory?.overall_trend
                          ? `${humanizeCanonicalValue(
                              activeConsult.canonical_clinical.trajectory.overall_trend
                            )} · ${humanizeCanonicalValue(
                              activeConsult.canonical_clinical.trajectory.overall_risk
                            )}`
                          : 'Tidak tersedia'}
                      </div>
                    </div>
                  </div>

                  {activeConsult.canonical_clinical.trajectory?.narrative && (
                    <div
                      className={styles.dialogText}
                      style={{
                        marginBottom: activeConsult.canonical_clinical.immediate_actions?.length
                          ? 8
                          : 0,
                      }}
                    >
                      {activeConsult.canonical_clinical.trajectory.narrative}
                    </div>
                  )}

                  {!!activeConsult.canonical_clinical.immediate_actions?.length && (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                      <div className={styles.dialogLabel} style={{ marginBottom: 0 }}>
                        Immediate Actions
                      </div>
                      <div className={styles.chips}>
                        {activeConsult.canonical_clinical.immediate_actions.map((action, index) => (
                          <span
                            key={`canonical-action-${index}-${action.slice(0, 24)}`}
                            className="ui-badge"
                            style={{
                              background: canonicalSnapshotTone.pillBackground,
                              color: 'var(--text)',
                            }}
                          >
                            {action}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>

            <div className="ui-dialog__footer">
              <button
                disabled={acceptingConsult}
                onClick={() => void handleAcceptConsult()}
                className="ui-btn ui-btn--primary"
                style={{ width: '100%', cursor: acceptingConsult ? 'wait' : undefined }}
              >
                {acceptingConsult ? 'Menyimpan…' : 'Ambil kasus'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── TRANSFER KE EMR (setelah Ambil kasus) ── */}
      {acceptedForTransfer && (
        <div className={styles.toast}>
          <div className={styles.dialogLabel}>Transfer ke ePuskesmas</div>
          <div className={styles.rowName} style={{ marginBottom: 'var(--gap-md)' }}>
            {acceptedForTransfer.patientName}
          </div>
          <input
            type="text"
            className="ui-input"
            placeholder="No. pelayanan (ID pelayanan)"
            value={transferPelayananId}
            onChange={e => {
              setTransferPelayananId(e.target.value)
              if (transferError) setTransferError(null)
            }}
            disabled={transferLoading}
          />
          {transferError && (
            <div
              className="ui-alert ui-alert--critical"
              role="alert"
              style={{ marginTop: 'var(--gap-md)' }}
            >
              {transferError}
            </div>
          )}
          <div className={styles.toastActions}>
            <button
              type="button"
              className="ui-btn ui-btn--primary ui-btn--sm"
              disabled={transferLoading || !transferPelayananId.trim()}
              onClick={async () => {
                if (!acceptedForTransfer || !transferPelayananId.trim()) return
                setTransferLoading(true)
                setTransferError(null)
                try {
                  const res = await fetch('/api/consult/transfer-to-emr', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                      consultId: acceptedForTransfer.consultId,
                      pelayananId: transferPelayananId.trim(),
                    }),
                  })
                  const data = (await res.json()) as {
                    ok?: boolean
                    entry?: { id: string }
                    error?: string
                  }
                  if (data.ok && data.entry?.id) {
                    const consultId = acceptedForTransfer.consultId
                    setAcceptedForTransfer(null)
                    setTransferPelayananId('')
                    router.push(
                      buildEmrSourceHref({
                        consultId,
                        bridgeEntryId: data.entry.id,
                        sourceOrigin: EMR_SOURCE_ORIGINS.assistConsult,
                      })
                    )
                    return
                  }
                  setTransferError(
                    data.error?.trim() ||
                      'Transfer berhasil dimulai, tetapi ID bridge belum diterima. Coba kirim ulang.'
                  )
                } catch {
                  setTransferError('Gagal membuat transfer ke EMR. Coba beberapa saat lagi.')
                } finally {
                  setTransferLoading(false)
                }
              }}
              style={{ flex: 1, cursor: transferLoading ? 'wait' : undefined }}
            >
              {transferLoading ? 'Mengirim…' : 'Kirim & buka EMR'}
            </button>
            <button
              type="button"
              className="ui-btn ui-btn--secondary ui-btn--sm"
              onClick={() => {
                setAcceptedForTransfer(null)
                setTransferPelayananId('')
                setTransferError(null)
              }}
            >
              Nanti
            </button>
          </div>
        </div>
      )}

      {/* ── ASSIST CONSULT BADGE (jika ada yg belum di-ack) ── */}
      {sortedConsults.length > 0 && !activeConsult && (
        <div
          className={styles.consultBadge}
          onClick={() => setActiveConsult(sortedConsults[0])}
          style={{
            background: topConsultTone.pillBackground,
            borderLeftColor: topConsultTone.border,
            color: topConsultTone.pillColor,
          }}
        >
          {sortedConsults.length} Consult dari Assist · {topConsultTone.label}
        </div>
      )}

      <div className="ui-page-header" style={{ marginBottom: 0 }}>
        <div>
          <h1 className={styles.title}>Telemedicine</h1>
          <p className="ui-page-header__description">
            Clinical Command Desk untuk konsultasi video, triase masuk, dan timeline layanan jarak
            jauh
          </p>
          <div className={styles.meta}>
            <span className="ui-badge ui-badge--primary">VIDEO CONSULTATION</span>
            {activeAppointments.length > 0 && (
              <span className="ui-badge ui-badge--success">{activeAppointments.length} AKTIF</span>
            )}
            <span className="ui-badge ui-badge--neutral">COMMAND DESK</span>
          </div>
        </div>
        <div className="ui-page-header__actions">
          {isDoctor && (
            <button
              onClick={() => void handleToggleOnline()}
              disabled={togglingStatus}
              className={
                isOnline
                  ? `ui-btn ui-btn--secondary ${styles.onlineOn}`
                  : 'ui-btn ui-btn--secondary'
              }
            >
              {isOnline ? <Wifi size={14} /> : <WifiOff size={14} />}
              {isOnline ? 'DOKTER ONLINE' : 'DOKTER OFFLINE'}
            </button>
          )}
          <button onClick={() => void loadAppointments()} className="ui-btn ui-btn--secondary">
            <RefreshCw size={14} />
            REFRESH
          </button>
          <button
            onClick={() => setShowBooking(current => !current)}
            className="ui-btn ui-btn--primary"
          >
            <Plus size={14} />
            {showBooking ? 'TUTUP FORM' : 'BUAT SESI'}
          </button>
        </div>
      </div>

      <div className={styles.kpiRow}>
        <OverviewMetric
          label="Dokter"
          value={isDoctor ? (isOnline ? 'Online' : 'Offline') : 'Standby'}
          hint={
            isDoctor
              ? 'Status kesiapan dokter pada jalur konsultasi.'
              : 'Masuk sebagai staf non-dokter.'
          }
          toneVariant={isDoctor && isOnline ? 'green' : 'muted'}
          statusWord={!isDoctor ? 'Staf' : isOnline ? 'Aktif' : 'Tidak aktif'}
        />
        <OverviewMetric
          label="Queue"
          value={`${pendingRequests.length}`}
          hint={
            pendingRequests.length > 0
              ? 'Request masuk menunggu tindak lanjut.'
              : 'Tidak ada triase baru saat ini.'
          }
          toneVariant={pendingRequests.length > 0 ? 'accent' : 'muted'}
          statusWord={pendingRequests.length > 0 ? 'Menunggu' : 'Bersih'}
        />
        <OverviewMetric
          label="Sesi Aktif"
          value={`${activeAppointments.length}`}
          hint={
            latestActive
              ? `Terdekat ${new Date(latestActive.scheduledAt).toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' })}`
              : 'Belum ada sesi aktif.'
          }
          toneVariant={activeAppointments.length > 0 ? 'green' : 'muted'}
          statusWord={activeAppointments.length > 0 ? 'Terjadwal' : 'Kosong'}
        />
        <OverviewMetric
          label="Arsip"
          value={`${pastAppointments.length}`}
          hint="Riwayat sesi selesai, batal, atau no-show."
          toneVariant={pastAppointments.length > 0 ? 'gold' : 'muted'}
          statusWord={pastAppointments.length > 0 ? 'Tersimpan' : 'Kosong'}
        />
      </div>

      <div className={styles.columns}>
        <div className={styles.stack}>
          <div className={styles.card}>
            <h2 className={styles.cardTitle}>Clinical Command Desk</h2>
            <p className={styles.cardIntro}>
              Satu panel kerja untuk triase masuk, kontrol kesiapan dokter, dan aktivasi sesi.
            </p>
            <p className={styles.cardText}>
              Fokus kiri disiapkan untuk operasional langsung: cek request baru, ubah status dokter,
              refresh antrean, lalu buka konsultasi tanpa perlu pindah konteks.
            </p>

            <div className={`${styles.statGrid} ${styles.divided}`}>
              {[
                {
                  label: 'Mode Desk',
                  value: isDoctor ? 'Dokter' : 'Staf',
                  hint: isDoctor
                    ? 'Jalur klinis siap menerima pasien.'
                    : 'Mode observasi & administrasi.',
                },
                {
                  label: 'Request Baru',
                  value: `${pendingRequests.length}`,
                  hint:
                    pendingRequests.length > 0
                      ? 'Perlu verifikasi dan follow-up.'
                      : 'Inbox sedang bersih.',
                },
                {
                  label: 'Slot Aktif',
                  value: `${activeAppointments.length}`,
                  hint:
                    activeAppointments.length > 0
                      ? 'Ada sesi yang dapat langsung dibuka.'
                      : 'Belum ada sesi aktif.',
                },
              ].map(item => (
                <div key={item.label} className={styles.stat}>
                  <div className={styles.statLabel}>{item.label}</div>
                  <div className={styles.statValue}>{item.value}</div>
                  <div className={styles.statHint}>{item.hint}</div>
                </div>
              ))}
            </div>
          </div>

          <RequestInbox
            requests={requests}
            onMarkHandled={handleMarkHandled}
            onDeleteRequest={handleDeleteRequest}
          />
          <PatientFlowDiagram />
        </div>

        <div className={styles.stack}>
          <div className={styles.card}>
            <h2 className={styles.cardTitle}>Consultation Timeline</h2>
            <p className={styles.cardIntro}>
              Timeline konsultasi dari antrean aktif sampai arsip layanan.
            </p>
            <p className={styles.cardText}>
              Sisi kanan dibentuk sebagai alur kerja yang mudah dipindai: sesi aktif di atas untuk
              tindakan cepat, lalu histori di bawah untuk audit dan penelusuran kasus.
            </p>

            <div className={`${styles.stat} ${styles.divided}`} style={{ marginBottom: 'var(--gap-xl)' }}>
              <div className={styles.statLabel}>Focus Saat Ini</div>
              <div className={styles.focusValue}>
                {latestActive ? `Pasien ${latestActive.patientId}` : 'Belum ada pasien aktif'}
              </div>
              <div className={styles.statHint}>
                {latestActive
                  ? `Sesi terdekat dijadwalkan ${new Date(latestActive.scheduledAt).toLocaleString('id-ID', { dateStyle: 'medium', timeStyle: 'short' })}.`
                  : 'Buka form pembuatan konsultasi untuk mulai mengisi jalur timeline.'}
              </div>
            </div>

            {showBooking && (
              <div className={styles.booking}>
                <h3 className={styles.bookingTitle}>Buat Konsultasi Baru</h3>
                <AppointmentBooking
                  onSuccess={handleBookingSuccess}
                  onCancel={() => setShowBooking(false)}
                />
              </div>
            )}

            {isLoading ? (
              <div className={styles.emptyBlock}>
                <div className={styles.spinner} style={{ animation: 'spin 1s linear infinite' }} />
                <div>memuat timeline konsultasi...</div>
              </div>
            ) : appointments.length === 0 ? (
              <div className={styles.emptyBlock}>
                <div className="ui-empty__title">timeline masih kosong</div>
                <div>
                  Belum ada appointment yang masuk. Mulai dari form konsultasi baru untuk
                  menghidupkan jalur telemedicine.
                </div>
                <button onClick={() => setShowBooking(true)} className="ui-btn ui-btn--primary">
                  <Plus size={14} /> BUAT KONSULTASI
                </button>
              </div>
            ) : (
              <div className={styles.listGroups}>
                <div>
                  <h3 className={styles.listHead}>Sesi Aktif ({activeAppointments.length})</h3>
                  {activeAppointments.length > 0 ? (
                    <div className={styles.list}>
                      {activeAppointments.map(appt => (
                        <AppointmentRow
                          key={appt.id}
                          appointment={appt}
                          onJoin={() => router.push(`/telemedicine/${appt.id}`)}
                        />
                      ))}
                    </div>
                  ) : (
                    <div className={styles.empty}>
                      Belum ada sesi aktif. Timeline operasional akan muncul di sini begitu
                      appointment dibuat atau dikonfirmasi.
                    </div>
                  )}
                </div>

                <div>
                  <h3 className={`${styles.listHead} ${styles.listHeadMuted}`}>
                    Riwayat ({pastAppointments.length})
                  </h3>
                  {pastAppointments.length > 0 ? (
                    <div className={styles.list}>
                      {pastAppointments.map(appt => (
                        <AppointmentRow key={appt.id} appointment={appt} />
                      ))}
                    </div>
                  ) : (
                    <div className={styles.empty}>Arsip sesi belum tersedia.</div>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Powered By - Technical Credit */}
      <div className={styles.credit}>
        <span>
          Infrastructure by <span className={styles.creditStrong}>LIVEKIT</span>
        </span>
        <span>
          Powered by <span className={styles.creditStrong}>SENTRA ENGINE</span>
        </span>
        <span>VIDEO SDK v2.0</span>
        <span>RFC 4566</span>
      </div>
    </div>
  )
}
