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
import { useTheme } from '@/components/ThemeProvider'
import { AppointmentBooking } from '@/components/telemedicine/AppointmentBooking'
import { isDoctorProfession } from '@/lib/crew-access'
import { buildEmrSourceHref, EMR_SOURCE_ORIGINS } from '@/lib/emr/source-trace'
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
}

/* ── Design tokens — EMR Clinical Flow Style ── */
function useL() {
  const { theme } = useTheme()
  const isDark = theme === 'dark'
  return {
    bg: isDark ? 'var(--bg-canvas)' : 'var(--bg-canvas)',
    bgPanel: isDark ? 'var(--bg-card, #212121)' : 'var(--bg-card, #EDE4D9)',
    bgHover: isDark ? 'rgba(255,255,255,0.05)' : 'rgba(230,126,34,0.06)',
    border: isDark ? 'rgba(255,255,255,0.10)' : 'var(--line-base)',
    borderAcc: isDark ? 'rgba(230,126,34,0.4)' : 'rgba(211,84,0,0.5)',
    text: isDark ? '#d4d4d4' : 'var(--text-main)',
    muted: isDark ? '#777777' : 'var(--text-muted)',
    accent: isDark ? '#E67E22' : '#D35400',
    actionTone: '#101012',
    actionToneSoft: 'rgba(16,16,18,0.10)',
    actionToneBorder: 'rgba(16,16,18,0.22)',
    actionNeumorph: '3px 3px 10px rgba(0,0,0,0.22), inset 1px 1px 0 rgba(255,255,255,0.04)',
    green: '#4ADE80',
    mono: 'var(--font-mono)',
    sans: 'var(--font-sans)',
  }
}

type LTokens = ReturnType<typeof useL>

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
      background: 'rgba(239,68,68,0.10)',
      border: 'rgba(239,68,68,0.22)',
      pillBackground: 'rgba(239,68,68,0.16)',
      pillColor: '#f87171',
    }
  }

  if (urgencyWeight >= 2) {
    return {
      label: 'Risiko Sedang',
      emphasis: 'Perlu monitoring ketat',
      background: 'rgba(245,158,11,0.10)',
      border: 'rgba(245,158,11,0.20)',
      pillBackground: 'rgba(245,158,11,0.16)',
      pillColor: '#fbbf24',
    }
  }

  return {
    label: 'Risiko Rendah',
    emphasis: 'Tetap perlu review klinis',
    background: 'rgba(74,222,128,0.10)',
    border: 'rgba(74,222,128,0.18)',
    pillBackground: 'rgba(74,222,128,0.16)',
    pillColor: '#4ADE80',
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

function SectionEyebrow({
  children,
  muted = false,
}: {
  L: LTokens
  children: React.ReactNode
  muted?: boolean
}) {
  return (
    <div
      className={
        muted ? `${styles.sectionEyebrow} ${styles.sectionEyebrowMuted}` : styles.sectionEyebrow
      }
    >
      {children}
    </div>
  )
}

type OverviewMetricTone = 'green' | 'muted' | 'accent' | 'gold'

function OverviewMetric({
  label,
  value,
  hint,
  toneVariant,
}: {
  L: LTokens
  label: string
  value: string
  hint: string
  toneVariant: OverviewMetricTone
}) {
  const toneClass =
    toneVariant === 'green'
      ? styles.overviewMetricToneDotGreen
      : toneVariant === 'accent'
        ? styles.overviewMetricToneDotAccent
        : toneVariant === 'gold'
          ? styles.overviewMetricToneDotGold
          : styles.overviewMetricToneDotMuted
  return (
    <div className={styles.overviewMetric}>
      <div className={styles.overviewMetricHeader}>
        <span className={styles.overviewMetricLabel}>{label}</span>
        <span className={`${styles.overviewMetricToneDot} ${toneClass}`} />
      </div>
      <div>
        <div className={styles.overviewMetricValue}>{value}</div>
        <div className={styles.overviewMetricHint}>{hint}</div>
      </div>
    </div>
  )
}

/* ── Status config ── */
const STATUS_CONFIG: Record<
  AppointmentStatus,
  { label: string; color: string; icon: React.ReactNode }
> = {
  PENDING: { label: 'Menunggu', color: '#facc15', icon: <Clock size={11} /> },
  CONFIRMED: {
    label: 'Dikonfirmasi',
    color: '#60a5fa',
    icon: <CheckCircle size={11} />,
  },
  IN_PROGRESS: {
    label: 'Berlangsung',
    color: '#4ADE80',
    icon: <Video size={11} />,
  },
  COMPLETED: {
    label: 'Selesai',
    color: '#777777',
    icon: <CheckCircle size={11} />,
  },
  CANCELLED: {
    label: 'Dibatalkan',
    color: '#f87171',
    icon: <XCircle size={11} />,
  },
  NO_SHOW: {
    label: 'Tidak Hadir',
    color: '#fb923c',
    icon: <AlertCircle size={11} />,
  },
}

const ACTIVE_APPOINTMENT_STATUSES: AppointmentStatus[] = ['PENDING', 'CONFIRMED', 'IN_PROGRESS']
const PAST_APPOINTMENT_STATUSES: AppointmentStatus[] = ['COMPLETED', 'CANCELLED', 'NO_SHOW']

/* ── PatientFlowDiagram with motion typing animation ── */
const FLOW_STEPS = [
  {
    num: '01',
    code: 'PETUGAS',
    label: 'Isi No. HP Pasien',
    sub: 'saat buat appointment',
  },
  {
    num: '02',
    code: 'SISTEM',
    label: 'Generate Token Unik',
    sub: 'disimpan ke database',
  },
  {
    num: '03',
    code: 'WHATSAPP',
    label: 'Kirim Link via WhatsApp',
    sub: '/join/[token]',
  },
  {
    num: '04',
    code: 'PASIEN',
    label: 'Klik Link → Buka Browser',
    sub: 'tanpa install / login',
  },
  {
    num: '05',
    code: 'INPUT',
    label: 'Masukkan Nama',
    sub: 'klik Masuk Konsultasi',
  },
  {
    num: '06',
    code: 'LIVEKIT',
    label: 'Connect ke Video Room',
    sub: 'role: PATIENT',
  },
  {
    num: '07',
    code: 'SELESAI',
    label: 'Dokter & Pasien Terhubung',
    sub: 'konsultasi berlangsung',
  },
]

function PatientFlowDiagram({ L }: { L: LTokens }) {
  const [visibleItems, setVisibleItems] = useState(0)

  useEffect(() => {
    setVisibleItems(0)
    const timer = setInterval(() => {
      setVisibleItems(prev => (prev >= FLOW_STEPS.length ? prev : prev + 1))
    }, 180)
    return () => clearInterval(timer)
  }, [])

  return (
    <div className={`blueprint-wrapper ${styles.flowDiagramWrapper}`}>
      <div
        style={{
          marginBottom: 16,
          display: 'flex',
          flexDirection: 'column',
          gap: 6,
        }}
      >
        <SectionEyebrow L={L}>Pathway Pasien</SectionEyebrow>
        <div style={{ fontSize: 13, color: L.muted }}>
          Tahapan praktis dari pembuatan appointment sampai pasien masuk ke room konsultasi.
        </div>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 0 }}>
        {FLOW_STEPS.map((step, i) => (
          <div
            key={step.code}
            style={{
              opacity: i < visibleItems ? 1 : 0,
              transform: i < visibleItems ? 'translateY(0)' : 'translateY(8px)',
              transition: `all 0.4s cubic-bezier(0.16, 1, 0.3, 1) ${i * 60}ms`,
            }}
          >
            <div
              style={{
                display: 'flex',
                alignItems: 'flex-start',
                gap: 12,
                padding: '8px 0',
              }}
            >
              <div
                style={{
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  flexShrink: 0,
                  width: 28,
                }}
              >
                <div
                  className={styles.flowStepNumber}
                  style={{
                    borderColor: i === 6 ? L.accent : L.border,
                    background: i === 6 ? `${L.accent}15` : 'transparent',
                    color: i === 6 ? L.accent : L.muted,
                  }}
                >
                  {step.num}
                </div>
                {i < FLOW_STEPS.length - 1 && (
                  <div
                    style={{
                      width: 1,
                      height: 20,
                      background: L.border,
                      marginTop: 3,
                    }}
                  />
                )}
              </div>
              <div style={{ paddingTop: 4 }}>
                <div
                  style={{
                    fontSize: 12,
                    color: L.accent,
                    letterSpacing: '0.1em',
                    marginBottom: 2,
                    fontFamily: L.mono,
                  }}
                >
                  {step.code}
                </div>
                <div
                  style={{
                    fontSize: 14,
                    color: i === 6 ? L.text : L.muted,
                    fontWeight: i === 6 ? 500 : 400,
                    marginBottom: 1,
                  }}
                >
                  {step.label}
                </div>
                <div style={{ fontSize: 13, color: L.muted }}>{step.sub}</div>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}

/* ── AppointmentRow ── */
interface AppointmentCardProps {
  L: LTokens
  appointment: AppointmentWithDetails
  onJoin?: () => void
}

function AppointmentRow({ L, appointment, onJoin }: AppointmentCardProps) {
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
      style={{
        display: 'grid',
        gridTemplateColumns: 'auto minmax(0, 1fr)',
        alignItems: 'stretch',
        gap: 16,
        padding: '16px 18px',
        borderBottom: `1px solid ${L.border}`,
        background: 'transparent',
        transition: 'background 0.15s',
      }}
      onMouseEnter={e => {
        ;(e.currentTarget as HTMLDivElement).style.background = L.bgHover
      }}
      onMouseLeave={e => {
        ;(e.currentTarget as HTMLDivElement).style.background = 'transparent'
      }}
    >
      <div
        style={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          gap: 8,
        }}
      >
        <div
          style={{
            width: 12,
            height: 12,
            borderRadius: '50%',
            background: status.color,
            boxShadow: `0 0 0 4px ${status.color}18`,
            marginTop: 4,
          }}
        />
        <div style={{ width: 1, flex: 1, minHeight: 42, background: L.border }} />
      </div>

      <div>
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            flexWrap: 'wrap',
            gap: 8,
            marginBottom: 8,
          }}
        >
          <span
            style={{
              fontSize: 13,
              color: L.accent,
              letterSpacing: '0.05em',
              fontFamily: L.mono,
            }}
          >
            #{appointment.id.slice(-8).toUpperCase()}
          </span>
          <span
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: 3,
              padding: '2px 8px',
              borderRadius: 2,
              background: `${status.color}18`,
              color: status.color,
              fontSize: 12,
              letterSpacing: '0.06em',
              fontFamily: L.mono,
            }}
          >
            {status.icon}&nbsp;{status.label}
          </span>
          <span
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              padding: '2px 8px',
              border: `1px solid ${L.border}`,
              color: L.muted,
              fontSize: 12,
              letterSpacing: '0.06em',
              fontFamily: L.mono,
            }}
          >
            {appointmentType}
          </span>
        </div>
        <div style={{ fontSize: 18, color: L.text, marginBottom: 6 }}>
          Pasien {appointment.patientId}
        </div>
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            flexWrap: 'wrap',
            gap: 12,
          }}
        >
          <span style={{ fontSize: 13, color: L.muted, fontFamily: L.mono }}>
            {scheduledAt.toLocaleString('id-ID', {
              dateStyle: 'medium',
              timeStyle: 'short',
            })}
          </span>
          <span style={{ color: L.border }}>·</span>
          <span style={{ fontSize: 13, color: L.muted }}>{appointment.durationMinutes}m</span>
          <span style={{ color: L.border }}>·</span>
          <span style={{ fontSize: 13, color: L.muted }}>{appointment.doctorId}</span>
          {appointment.patientPhone && (
            <>
              <span style={{ color: L.border }}>·</span>
              <span style={{ fontSize: 13, color: L.muted }}>{appointment.patientPhone}</span>
            </>
          )}
          {appointment.keluhanUtama && (
            <>
              <span style={{ color: L.border }}>·</span>
              <span style={{ fontSize: 13, color: L.muted, fontStyle: 'italic' }}>
                {appointment.keluhanUtama.slice(0, 35)}
                {appointment.keluhanUtama.length > 35 ? '…' : ''}
              </span>
            </>
          )}
        </div>
        {isActive && onJoin && (
          <button
            onClick={onJoin}
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: 6,
              padding: '10px 14px',
              background: isInProgress ? 'rgba(74,222,128,0.15)' : `${L.accent}15`,
              border: `1px solid ${isInProgress ? L.green : L.accent}`,
              borderRadius: 3,
              color: isInProgress ? L.green : L.accent,
              fontSize: 12,
              letterSpacing: '0.08em',
              fontFamily: L.mono,
              cursor: 'pointer',
              transition: 'all 0.15s ease',
              marginTop: 14,
              justifyContent: 'center',
              minWidth: 92,
            }}
          >
            <Video size={12} />
            {isInProgress ? 'MASUK' : 'JOIN'}
          </button>
        )}
      </div>
    </div>
  )
}

/* ── RequestInbox with motion typing animation ── */
function RequestInbox({
  L,
  requests,
  onMarkHandled,
  onDeleteRequest,
}: {
  L: LTokens
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
    <div className="blueprint-wrapper" style={{ padding: '20px 24px' }}>
      <div
        style={{
          display: 'flex',
          alignItems: 'flex-start',
          justifyContent: 'space-between',
          gap: 12,
          marginBottom: 12,
        }}
      >
        <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
          <SectionEyebrow L={L}>Triage Request</SectionEyebrow>
          <div style={{ fontSize: 13, color: L.muted }}>
            Request masuk dari website untuk dipilah, ditindaklanjuti, atau diarsipkan.
          </div>
        </div>
        {pending.length > 0 && (
          <span
            style={{
              background: `${L.accent}20`,
              color: L.accent,
              fontSize: 12,
              padding: '2px 8px',
              borderRadius: 2,
              fontFamily: L.mono,
              letterSpacing: '0.05em',
            }}
          >
            {pending.length} baru
          </span>
        )}
      </div>

      {requests.length === 0 ? (
        <div
          style={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            padding: '32px 0',
            gap: 8,
            color: L.muted,
          }}
        >
          <Inbox size={24} style={{ opacity: 0.3 }} />
          <div style={{ fontSize: 13 }}>belum ada request</div>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 0 }}>
          {allRequests.map((req, i) => (
            <div
              key={req.id}
              style={{
                padding: '12px 0',
                borderBottom: i < allRequests.length - 1 ? `1px solid ${L.border}` : 'none',
                background: req.status === 'PENDING' ? `${L.accent}06` : 'transparent',
                margin: '0 -8px',
                paddingLeft: 8,
                paddingRight: 8,
                borderRadius: req.status === 'PENDING' ? 3 : 0,
                opacity: i < visibleItems ? 1 : 0,
                transform: i < visibleItems ? 'translateY(0)' : 'translateY(6px)',
                transition: `all 0.4s cubic-bezier(0.16, 1, 0.3, 1) ${i * 60}ms`,
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
                <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                  {/* Silhouette Wajah */}
                  <div
                    style={{
                      width: 40,
                      height: 40,
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      borderRadius: '50%',
                      background:
                        req.status === 'PENDING' ? `${L.accent}15` : 'rgba(255,255,255,0.03)',
                      border: `1px solid ${req.status === 'PENDING' ? L.accent : L.border}`,
                      flexShrink: 0,
                    }}
                  >
                    {req.nama.toLowerCase().includes('ibu') ||
                    req.nama.toLowerCase().includes('ny') ||
                    req.nama.toLowerCase().includes('siti') ||
                    req.nama.toLowerCase().includes('ani') ||
                    req.nama.toLowerCase().includes('wi') ||
                    req.nama.toLowerCase().includes('ma') ? (
                      /* Silhouette Wajah Perempuan */
                      <svg
                        width="28"
                        height="28"
                        viewBox="0 0 48 48"
                        fill="currentColor"
                        style={{ color: L.muted }}
                      >
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
                      <svg
                        width="28"
                        height="28"
                        viewBox="0 0 48 48"
                        fill="currentColor"
                        style={{ color: L.muted }}
                      >
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
                    style={{
                      fontSize: 14,
                      color: req.status === 'PENDING' ? L.text : L.muted,
                      fontWeight: req.status === 'PENDING' ? 500 : 400,
                    }}
                  >
                    {req.nama}
                  </span>
                  <span style={{ fontSize: 12, color: L.muted, fontFamily: L.mono }}>
                    {req.usia}th
                  </span>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <span style={{ fontSize: 12, color: L.muted, fontFamily: L.mono }}>
                    {formatTime(req.createdAt)}
                  </span>
                  <button
                    onClick={() => handleDelete(req.id)}
                    disabled={deletingId === req.id}
                    title="Hapus request"
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      width: 22,
                      height: 22,
                      background: 'transparent',
                      border: 'none',
                      color: L.muted,
                      cursor: 'pointer',
                      opacity: deletingId === req.id ? 0.5 : 0.6,
                      transition: 'all 0.15s ease',
                      borderRadius: 3,
                    }}
                    onMouseEnter={e => {
                      ;(e.currentTarget as HTMLButtonElement).style.color = '#E74C3C'
                      ;(e.currentTarget as HTMLButtonElement).style.opacity = '1'
                    }}
                    onMouseLeave={e => {
                      ;(e.currentTarget as HTMLButtonElement).style.color = L.muted
                      ;(e.currentTarget as HTMLButtonElement).style.opacity = '0.6'
                    }}
                  >
                    <Trash2 size={12} />
                  </button>
                </div>
              </div>
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 8,
                  marginBottom: 4,
                }}
              >
                <Phone size={10} style={{ color: L.muted }} />
                <span style={{ fontSize: 13, color: L.muted }}>{req.hp}</span>
                <span style={{ fontSize: 12, color: L.accent, fontFamily: L.mono }}>
                  {req.poli}
                </span>
              </div>
              {req.bpjs && (
                <div
                  style={{
                    fontSize: 12,
                    color: L.muted,
                    marginBottom: 4,
                    fontFamily: L.mono,
                  }}
                >
                  BPJS: {req.bpjs}
                </div>
              )}
              <div
                style={{
                  fontSize: 13,
                  color: L.muted,
                  fontStyle: 'italic',
                  marginBottom: req.status === 'PENDING' ? 8 : 0,
                }}
              >
                {req.keluhan.length > 60 ? req.keluhan.slice(0, 60) + '…' : req.keluhan}
              </div>
              {req.status === 'PENDING' && (
                <button
                  onClick={() => onMarkHandled(req.id)}
                  style={{
                    padding: '4px 10px',
                    background: `${L.accent}12`,
                    border: `1px solid ${L.accent}`,
                    borderRadius: 3,
                    color: L.accent,
                    fontSize: 11,
                    cursor: 'pointer',
                    fontFamily: L.mono,
                    letterSpacing: '0.05em',
                  }}
                >
                  TANDAI HANDLED
                </button>
              )}
              {req.status === 'HANDLED' && (
                <span
                  style={{
                    fontSize: 12,
                    color: L.muted,
                    opacity: 0.5,
                    fontFamily: L.mono,
                  }}
                >
                  ✓ handled
                </span>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

/* ── Main Page ── */
export default function TelemedicinePage(): React.JSX.Element {
  const L = useL()
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
      // (EMR/Ghost Protocols mengirim displayName dokter yang ditarget)
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
    <div style={{ width: '100%', maxWidth: 1400 }}>
      {/* ── ASSIST CONSULT MODAL ── */}
      {activeConsult && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            zIndex: 9999,
            background: 'rgba(0,0,0,0.7)',
            backdropFilter: 'blur(4px)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <div
            style={{
              background: 'var(--bg-surface)',
              border: '1px solid var(--border-subtle)',
              borderRadius: 12,
              padding: 28,
              width: 480,
              maxWidth: '90vw',
              boxShadow: '0 24px 64px rgba(0,0,0,0.5)',
            }}
          >
            <div
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'flex-start',
                marginBottom: 16,
              }}
            >
              <div>
                <div
                  style={{
                    fontSize: 11,
                    color: 'var(--text-muted)',
                    letterSpacing: '0.12em',
                    textTransform: 'uppercase',
                    marginBottom: 4,
                  }}
                >
                  Ghost Protocols — Assist Consult
                </div>
                <div
                  style={{
                    fontSize: 18,
                    fontWeight: 700,
                    color: 'var(--text-primary)',
                  }}
                >
                  {activeConsult.patient.name}
                </div>
                <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>
                  {activeConsult.patient.age} thn ·{' '}
                  {activeConsult.patient.gender === 'L' ? 'Laki-laki' : 'Perempuan'} · RM{' '}
                  {activeConsult.patient.rm}
                </div>
              </div>
              <button
                onClick={() => setActiveConsult(null)}
                style={{
                  background: 'none',
                  border: 'none',
                  cursor: 'pointer',
                  color: 'var(--text-muted)',
                  fontSize: 20,
                }}
              >
                ✕
              </button>
            </div>

            {/* Keluhan */}
            <div
              style={{
                background: 'var(--bg-canvas)',
                borderRadius: 8,
                padding: '10px 14px',
                marginBottom: 12,
              }}
            >
              <div
                style={{
                  fontSize: 10,
                  color: 'var(--text-muted)',
                  textTransform: 'uppercase',
                  letterSpacing: '0.1em',
                  marginBottom: 4,
                }}
              >
                Keluhan Utama
              </div>
              <div style={{ fontSize: 13, color: 'var(--text-primary)' }}>
                {activeConsult.keluhan_utama}
              </div>
            </div>

            {/* TTV Grid */}
            <div
              style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(3, 1fr)',
                gap: 8,
                marginBottom: 12,
              }}
            >
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
                <div
                  key={v.label}
                  style={{
                    background: 'var(--bg-canvas)',
                    borderRadius: 6,
                    padding: '6px 10px',
                    textAlign: 'center',
                  }}
                >
                  <div style={{ fontSize: 10, color: 'var(--text-muted)' }}>{v.label}</div>
                  <div
                    style={{
                      fontSize: 14,
                      fontWeight: 700,
                      color: 'var(--text-primary)',
                    }}
                  >
                    {v.value}
                  </div>
                  <div style={{ fontSize: 9, color: 'var(--text-muted)' }}>{v.unit}</div>
                </div>
              ))}
            </div>

            {/* Anthropometrics */}
            <div
              style={{
                background: 'var(--bg-canvas)',
                borderRadius: 8,
                padding: '10px 14px',
                marginBottom: 12,
              }}
            >
              <div
                style={{
                  fontSize: 10,
                  color: 'var(--text-muted)',
                  textTransform: 'uppercase',
                  letterSpacing: '0.1em',
                  marginBottom: 6,
                }}
              >
                Antropometri
              </div>
              <div
                style={{
                  display: 'flex',
                  gap: 16,
                  fontSize: 12,
                  color: 'var(--text-primary)',
                }}
              >
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
              <div
                style={{
                  display: 'flex',
                  gap: 6,
                  flexWrap: 'wrap',
                  marginBottom: 12,
                }}
              >
                {activeConsult.risk_factors.map((r, i) => (
                  <span
                    key={`risk-${i}-${String(r).slice(0, 24)}`}
                    style={{
                      fontSize: 10,
                      padding: '3px 8px',
                      borderRadius: 4,
                      background: 'rgba(239,68,68,0.15)',
                      color: '#f87171',
                      border: '1px solid rgba(239,68,68,0.3)',
                    }}
                  >
                    {r}
                  </span>
                ))}
              </div>
            )}

            {activeConsult.canonical_clinical && (
              <div
                style={{
                  background: canonicalSnapshotTone.background,
                  borderRadius: 8,
                  padding: '10px 14px',
                  marginBottom: 12,
                  border: `1px solid ${canonicalSnapshotTone.border}`,
                }}
              >
                <div
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    gap: 10,
                    marginBottom: 8,
                    flexWrap: 'wrap',
                  }}
                >
                  <div
                    style={{
                      fontSize: 10,
                      color: 'var(--text-muted)',
                      textTransform: 'uppercase',
                      letterSpacing: '0.1em',
                    }}
                  >
                    Canonical Clinical Snapshot
                  </div>
                  <span
                    style={{
                      fontSize: 10,
                      fontWeight: 700,
                      padding: '4px 8px',
                      borderRadius: 999,
                      background: canonicalSnapshotTone.pillBackground,
                      color: canonicalSnapshotTone.pillColor,
                      border: `1px solid ${canonicalSnapshotTone.border}`,
                    }}
                  >
                    {canonicalSnapshotTone.label}
                  </span>
                </div>

                <div
                  style={{
                    fontSize: 12,
                    color: 'var(--text-primary)',
                    fontWeight: 600,
                    marginBottom: 8,
                  }}
                >
                  {canonicalSnapshotTone.emphasis}
                </div>

                <div
                  style={{
                    display: 'grid',
                    gridTemplateColumns: 'repeat(2, minmax(0, 1fr))',
                    gap: 8,
                    marginBottom:
                      activeConsult.canonical_clinical.immediate_actions?.length ||
                      activeConsult.canonical_clinical.trajectory?.narrative
                        ? 10
                        : 0,
                  }}
                >
                  <div
                    style={{
                      borderRadius: 6,
                      padding: '8px 10px',
                      background: 'rgba(255,255,255,0.03)',
                    }}
                  >
                    <div style={{ fontSize: 10, color: 'var(--text-muted)', marginBottom: 2 }}>
                      Canonical NEWS2
                    </div>
                    <div style={{ fontSize: 14, fontWeight: 700, color: 'var(--text-primary)' }}>
                      {activeConsult.canonical_clinical.news2
                        ? `${activeConsult.canonical_clinical.news2.score} · ${humanizeCanonicalValue(
                            activeConsult.canonical_clinical.news2.risk_level
                          )}`
                        : 'Tidak tersedia'}
                    </div>
                  </div>

                  <div
                    style={{
                      borderRadius: 6,
                      padding: '8px 10px',
                      background: 'rgba(255,255,255,0.03)',
                    }}
                  >
                    <div style={{ fontSize: 10, color: 'var(--text-muted)', marginBottom: 2 }}>
                      Canonical Trajectory
                    </div>
                    <div style={{ fontSize: 14, fontWeight: 700, color: 'var(--text-primary)' }}>
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
                    style={{
                      fontSize: 12,
                      color: 'var(--text-primary)',
                      lineHeight: 1.55,
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
                    <div
                      style={{
                        fontSize: 10,
                        color: 'var(--text-muted)',
                        textTransform: 'uppercase',
                        letterSpacing: '0.1em',
                      }}
                    >
                      Immediate Actions
                    </div>
                    <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                      {activeConsult.canonical_clinical.immediate_actions.map((action, index) => (
                        <span
                          key={`canonical-action-${index}-${action.slice(0, 24)}`}
                          style={{
                            fontSize: 10,
                            padding: '4px 8px',
                            borderRadius: 999,
                            background: canonicalSnapshotTone.pillBackground,
                            color: 'var(--text-primary)',
                            border: `1px solid ${canonicalSnapshotTone.border}`,
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

            <button
              disabled={acceptingConsult}
              onClick={() => void handleAcceptConsult()}
              style={{
                width: '100%',
                padding: '12px 0',
                borderRadius: 8,
                border: 'none',
                background: 'var(--accent, #E67E22)',
                color: '#fff',
                fontWeight: 600,
                fontSize: 14,
                cursor: acceptingConsult ? 'wait' : 'pointer',
                opacity: acceptingConsult ? 0.8 : 1,
              }}
            >
              {acceptingConsult ? 'Menyimpan…' : 'Ambil kasus'}
            </button>
          </div>
        </div>
      )}

      {/* ── TRANSFER KE EMR (setelah Ambil kasus) ── */}
      {acceptedForTransfer && (
        <div
          style={{
            position: 'fixed',
            bottom: 24,
            right: 24,
            zIndex: 999,
            background: 'var(--bg-surface)',
            border: '1px solid var(--border-subtle)',
            borderRadius: 12,
            padding: 16,
            width: 320,
            maxWidth: '90vw',
            boxShadow: '0 8px 32px rgba(0,0,0,0.3)',
          }}
        >
          <div
            style={{
              fontSize: 11,
              color: 'var(--text-muted)',
              textTransform: 'uppercase',
              letterSpacing: '0.1em',
              marginBottom: 4,
            }}
          >
            Transfer ke ePuskesmas
          </div>
          <div
            style={{
              fontSize: 13,
              fontWeight: 600,
              color: 'var(--text-primary)',
              marginBottom: 10,
            }}
          >
            {acceptedForTransfer.patientName}
          </div>
          <input
            type="text"
            placeholder="No. pelayanan (ID pelayanan)"
            value={transferPelayananId}
            onChange={e => {
              setTransferPelayananId(e.target.value)
              if (transferError) setTransferError(null)
            }}
            disabled={transferLoading}
            style={{
              width: '100%',
              padding: '8px 12px',
              marginBottom: 10,
              border: '1px solid var(--border-subtle)',
              borderRadius: 8,
              background: 'var(--bg-canvas)',
              color: 'var(--text-primary)',
              fontSize: 13,
            }}
          />
          {transferError && (
            <div
              style={{
                marginBottom: 10,
                fontSize: 12,
                color: '#ff9f7a',
              }}
            >
              {transferError}
            </div>
          )}
          <div style={{ display: 'flex', gap: 8 }}>
            <button
              type="button"
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
              style={{
                flex: 1,
                padding: '8px 12px',
                borderRadius: 8,
                border: 'none',
                background: 'var(--accent, #E67E22)',
                color: '#fff',
                fontWeight: 600,
                fontSize: 12,
                cursor: transferLoading ? 'wait' : 'pointer',
              }}
            >
              {transferLoading ? 'Mengirim…' : 'Kirim & buka EMR'}
            </button>
            <button
              type="button"
              onClick={() => {
                setAcceptedForTransfer(null)
                setTransferPelayananId('')
                setTransferError(null)
              }}
              style={{
                padding: '8px 12px',
                borderRadius: 8,
                border: '1px solid var(--border-subtle)',
                background: 'transparent',
                color: 'var(--text-muted)',
                fontSize: 12,
                cursor: 'pointer',
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
          onClick={() => setActiveConsult(sortedConsults[0])}
          style={{
            position: 'fixed',
            bottom: 24,
            right: 24,
            zIndex: 999,
            background: topConsultTone.pillColor,
            color: '#fff',
            borderRadius: 10,
            padding: '10px 18px',
            cursor: 'pointer',
            fontWeight: 600,
            fontSize: 13,
            boxShadow:
              topConsultTone.label === 'Risiko Tinggi'
                ? '0 4px 20px rgba(239,68,68,0.5)'
                : topConsultTone.label === 'Risiko Sedang'
                  ? '0 4px 20px rgba(245,158,11,0.4)'
                  : '0 4px 20px rgba(74,222,128,0.35)',
            animation: 'pulse 1.5s infinite',
          }}
        >
          📋 {sortedConsults.length} Consult dari Assist · {topConsultTone.label}
        </div>
      )}

      <div className="page-header" style={{ maxWidth: '100%', marginBottom: 24 }}>
        <div className="page-title">Telemedicine</div>
        <div className="page-subtitle">
          Clinical Command Desk untuk konsultasi video, triase masuk, dan timeline layanan jarak
          jauh
        </div>
        <div className="page-header-divider" />
        <div className="page-header-badges">
          <span
            style={{
              fontSize: 12,
              color: '#fff',
              background: L.actionTone,
              border: '1px solid rgba(255,255,255,0.06)',
              boxShadow: L.actionNeumorph,
              padding: '2px 10px',
              borderRadius: 2,
              letterSpacing: '0.05em',
              fontFamily: L.mono,
            }}
          >
            VIDEO CONSULTATION
          </span>
          {activeAppointments.length > 0 && (
            <span
              style={{
                fontSize: 12,
                color: L.green,
                border: `1px solid ${L.green}`,
                padding: '2px 10px',
                borderRadius: 2,
                letterSpacing: '0.05em',
                fontFamily: L.mono,
              }}
            >
              {activeAppointments.length} AKTIF
            </span>
          )}
          <span
            style={{
              fontSize: 12,
              color: L.muted,
              border: `1px solid ${L.border}`,
              padding: '2px 10px',
              borderRadius: 2,
              letterSpacing: '0.05em',
              fontFamily: L.mono,
            }}
          >
            COMMAND DESK
          </span>
        </div>
      </div>

      <div className="blueprint-wrapper" style={{ padding: '20px 24px', marginBottom: 18 }}>
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(210px, 1fr))',
            gap: 12,
          }}
        >
          <OverviewMetric
            L={L}
            label="Dokter"
            value={isDoctor ? (isOnline ? 'Online' : 'Offline') : 'Standby'}
            hint={
              isDoctor
                ? 'Status kesiapan dokter pada jalur konsultasi.'
                : 'Masuk sebagai staf non-dokter.'
            }
            toneVariant={isDoctor && isOnline ? 'green' : 'muted'}
          />
          <OverviewMetric
            L={L}
            label="Queue"
            value={`${pendingRequests.length}`}
            hint={
              pendingRequests.length > 0
                ? 'Request masuk menunggu tindak lanjut.'
                : 'Tidak ada triase baru saat ini.'
            }
            toneVariant={pendingRequests.length > 0 ? 'accent' : 'muted'}
          />
          <OverviewMetric
            L={L}
            label="Sesi Aktif"
            value={`${activeAppointments.length}`}
            hint={
              latestActive
                ? `Terdekat ${new Date(latestActive.scheduledAt).toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' })}`
                : 'Belum ada sesi aktif.'
            }
            toneVariant={activeAppointments.length > 0 ? 'green' : 'muted'}
          />
          <OverviewMetric
            L={L}
            label="Arsip"
            value={`${pastAppointments.length}`}
            hint="Riwayat sesi selesai, batal, atau no-show."
            toneVariant={pastAppointments.length > 0 ? 'gold' : 'muted'}
          />
        </div>
      </div>

      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))',
          gap: 14,
          width: '100%',
        }}
      >
        <div
          style={{
            display: 'flex',
            flexDirection: 'column',
            gap: 12,
            minWidth: 0,
          }}
        >
          <div className="blueprint-wrapper" style={{ padding: '20px 24px' }}>
            <div
              style={{
                display: 'flex',
                alignItems: 'flex-start',
                justifyContent: 'space-between',
                flexWrap: 'wrap',
                gap: 14,
                marginBottom: 18,
              }}
            >
              <div style={{ maxWidth: 420 }}>
                <SectionEyebrow L={L}>Clinical Command Desk</SectionEyebrow>
                <div
                  style={{
                    fontSize: 26,
                    color: L.text,
                    marginTop: 8,
                    marginBottom: 8,
                  }}
                >
                  Satu panel kerja untuk triase masuk, kontrol kesiapan dokter, dan aktivasi sesi.
                </div>
                <div style={{ fontSize: 14, color: L.muted, lineHeight: 1.65 }}>
                  Fokus kiri disiapkan untuk operasional langsung: cek request baru, ubah status
                  dokter, refresh antrean, lalu buka konsultasi tanpa perlu pindah konteks.
                </div>
              </div>

              <div
                style={{
                  display: 'flex',
                  gap: 8,
                  alignItems: 'center',
                  flexWrap: 'wrap',
                }}
              >
                {isDoctor && (
                  <button
                    onClick={() => void handleToggleOnline()}
                    disabled={togglingStatus}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: 6,
                      padding: '9px 14px',
                      background: isOnline ? 'rgba(74,222,128,0.12)' : L.bgHover,
                      border: `1px solid ${isOnline ? L.green : L.border}`,
                      borderRadius: 3,
                      color: isOnline ? L.green : L.muted,
                      fontSize: 12,
                      fontFamily: L.mono,
                      letterSpacing: '0.06em',
                      cursor: togglingStatus ? 'not-allowed' : 'pointer',
                      opacity: togglingStatus ? 0.6 : 1,
                      transition: 'all 0.2s',
                    }}
                  >
                    {isOnline ? <Wifi size={12} /> : <WifiOff size={12} />}
                    {isOnline ? 'DOKTER ONLINE' : 'DOKTER OFFLINE'}
                  </button>
                )}
                <button
                  onClick={() => void loadAppointments()}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 6,
                    padding: '9px 12px',
                    background: 'transparent',
                    border: `1px solid ${L.border}`,
                    borderRadius: 3,
                    color: L.muted,
                    fontSize: 12,
                    cursor: 'pointer',
                    fontFamily: L.mono,
                    letterSpacing: '0.06em',
                  }}
                >
                  <RefreshCw size={12} />
                  REFRESH
                </button>
                <button
                  onClick={() => setShowBooking(current => !current)}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 6,
                    padding: '9px 14px',
                    background: L.actionTone,
                    border: '1px solid rgba(255,255,255,0.06)',
                    borderRadius: 3,
                    color: '#ffffff',
                    boxShadow: L.actionNeumorph,
                    fontSize: 12,
                    letterSpacing: '0.08em',
                    fontFamily: L.mono,
                    cursor: 'pointer',
                    transition: 'all 0.15s ease',
                  }}
                >
                  <Plus size={12} />
                  {showBooking ? 'TUTUP FORM' : 'BUAT SESI'}
                </button>
              </div>
            </div>

            <div
              style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))',
                gap: 10,
                paddingTop: 16,
                borderTop: `1px solid ${L.border}`,
              }}
            >
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
                <div key={item.label} style={{ display: 'grid', gap: 6 }}>
                  <SectionEyebrow L={L} muted>
                    {item.label}
                  </SectionEyebrow>
                  <div style={{ fontSize: 22, color: L.text }}>{item.value}</div>
                  <div style={{ fontSize: 13, color: L.muted }}>{item.hint}</div>
                </div>
              ))}
            </div>
          </div>

          <RequestInbox
            L={L}
            requests={requests}
            onMarkHandled={handleMarkHandled}
            onDeleteRequest={handleDeleteRequest}
          />
          <PatientFlowDiagram L={L} />
        </div>

        <div
          style={{
            display: 'flex',
            flexDirection: 'column',
            gap: 12,
            minWidth: 0,
          }}
        >
          <div className="blueprint-wrapper" style={{ padding: '20px 24px' }}>
            <div
              style={{
                display: 'flex',
                alignItems: 'flex-start',
                justifyContent: 'space-between',
                flexWrap: 'wrap',
                gap: 14,
                marginBottom: 18,
              }}
            >
              <div style={{ maxWidth: 520 }}>
                <SectionEyebrow L={L}>Consultation Timeline</SectionEyebrow>
                <div
                  style={{
                    fontSize: 28,
                    color: L.text,
                    marginTop: 8,
                    marginBottom: 8,
                  }}
                >
                  Timeline konsultasi dari antrean aktif sampai arsip layanan.
                </div>
                <div style={{ fontSize: 14, color: L.muted, lineHeight: 1.65 }}>
                  Sisi kanan dibentuk sebagai alur kerja yang mudah dipindai: sesi aktif di atas
                  untuk tindakan cepat, lalu histori di bawah untuk audit dan penelusuran kasus.
                </div>
              </div>
              <div
                style={{
                  minWidth: 220,
                  paddingLeft: 16,
                  borderLeft: `1px solid ${L.border}`,
                  display: 'grid',
                  gap: 10,
                }}
              >
                <div>
                  <SectionEyebrow L={L} muted>
                    Focus Saat Ini
                  </SectionEyebrow>
                  <div style={{ fontSize: 20, color: L.text, marginTop: 6 }}>
                    {latestActive ? `Pasien ${latestActive.patientId}` : 'Belum ada pasien aktif'}
                  </div>
                </div>
                <div style={{ fontSize: 13, color: L.muted, lineHeight: 1.65 }}>
                  {latestActive
                    ? `Sesi terdekat dijadwalkan ${new Date(latestActive.scheduledAt).toLocaleString('id-ID', { dateStyle: 'medium', timeStyle: 'short' })}.`
                    : 'Buka form pembuatan konsultasi untuk mulai mengisi jalur timeline.'}
                </div>
              </div>
            </div>

            {showBooking && (
              <div
                style={{
                  marginBottom: 20,
                  padding: '18px 18px 6px',
                  border: `1px solid ${L.border}`,
                  background: 'rgba(255,255,255,0.015)',
                }}
              >
                <div style={{ marginBottom: 16 }}>
                  <SectionEyebrow L={L}>Buat Konsultasi Baru</SectionEyebrow>
                </div>
                <AppointmentBooking
                  onSuccess={handleBookingSuccess}
                  onCancel={() => setShowBooking(false)}
                />
              </div>
            )}

            {isLoading ? (
              <div style={{ padding: '52px 24px', textAlign: 'center' }}>
                <div
                  style={{
                    width: 32,
                    height: 32,
                    border: `2px solid ${L.accent}`,
                    borderTopColor: 'transparent',
                    borderRadius: '50%',
                    animation: 'spin 1s linear infinite',
                    margin: '0 auto 12px',
                  }}
                />
                <div style={{ fontSize: 14, color: L.muted }}>memuat timeline konsultasi...</div>
              </div>
            ) : appointments.length === 0 ? (
              <div style={{ padding: '56px 24px', textAlign: 'center' }}>
                <Video size={36} style={{ opacity: 0.15, marginBottom: 16, color: L.muted }} />
                <div style={{ fontSize: 15, color: L.text, marginBottom: 8 }}>
                  timeline masih kosong
                </div>
                <div
                  style={{
                    fontSize: 14,
                    color: L.muted,
                    marginBottom: 20,
                    opacity: 0.8,
                  }}
                >
                  Belum ada appointment yang masuk. Mulai dari form konsultasi baru untuk
                  menghidupkan jalur telemedicine.
                </div>
                <button
                  onClick={() => setShowBooking(true)}
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: 6,
                    padding: '8px 16px',
                    background: L.actionTone,
                    border: '1px solid rgba(255,255,255,0.06)',
                    borderRadius: 3,
                    color: '#ffffff',
                    boxShadow: L.actionNeumorph,
                    fontSize: 13,
                    cursor: 'pointer',
                    fontFamily: L.mono,
                    letterSpacing: '0.05em',
                  }}
                >
                  <Plus size={12} /> BUAT KONSULTASI
                </button>
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 22 }}>
                <div>
                  <div style={{ marginBottom: 10 }}>
                    <SectionEyebrow L={L}>Sesi Aktif ({activeAppointments.length})</SectionEyebrow>
                  </div>
                  {activeAppointments.length > 0 ? (
                    <div
                      style={{
                        display: 'flex',
                        flexDirection: 'column',
                        borderTop: `1px solid ${L.border}`,
                      }}
                    >
                      {activeAppointments.map(appt => (
                        <AppointmentRow
                          L={L}
                          key={appt.id}
                          appointment={appt}
                          onJoin={() => router.push(`/telemedicine/${appt.id}`)}
                        />
                      ))}
                    </div>
                  ) : (
                    <div
                      style={{
                        padding: '18px 0 4px',
                        borderTop: `1px solid ${L.border}`,
                        fontSize: 14,
                        color: L.muted,
                      }}
                    >
                      Belum ada sesi aktif. Timeline operasional akan muncul di sini begitu
                      appointment dibuat atau dikonfirmasi.
                    </div>
                  )}
                </div>

                <div>
                  <div style={{ marginBottom: 10 }}>
                    <SectionEyebrow L={L} muted>
                      Riwayat ({pastAppointments.length})
                    </SectionEyebrow>
                  </div>
                  {pastAppointments.length > 0 ? (
                    <div
                      style={{
                        display: 'flex',
                        flexDirection: 'column',
                        borderTop: `1px solid ${L.border}`,
                      }}
                    >
                      {pastAppointments.map(appt => (
                        <AppointmentRow L={L} key={appt.id} appointment={appt} />
                      ))}
                    </div>
                  ) : (
                    <div
                      style={{
                        padding: '18px 0 4px',
                        borderTop: `1px solid ${L.border}`,
                        fontSize: 14,
                        color: L.muted,
                      }}
                    >
                      Arsip sesi belum tersedia.
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Powered By - Technical Credit */}
      <div
        style={{
          marginTop: 32,
          padding: '16px 20px',
          borderTop: `1px solid ${L.border}`,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          flexWrap: 'wrap',
          gap: 12,
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
          {/* LiveKit Badge */}
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 8,
              padding: '6px 12px',
              background: 'rgba(121,85,72,0.08)',
              border: `1px solid ${L.border}`,
              borderRadius: 3,
            }}
          >
            <div
              style={{
                width: 8,
                height: 8,
                borderRadius: '50%',
                background: '#4ADE80',
                animation: 'pulse 2s infinite',
              }}
            />
            <span
              style={{
                fontFamily: L.mono,
                fontSize: 11,
                letterSpacing: '0.15em',
                color: L.muted,
                textTransform: 'uppercase',
              }}
            >
              Infrastructure by
            </span>
            <span
              style={{
                fontFamily: L.mono,
                fontSize: 12,
                fontWeight: 600,
                letterSpacing: '0.08em',
                color: L.text,
              }}
            >
              LIVEKIT
            </span>
          </div>

          {/* Separator */}
          <div style={{ width: 1, height: 20, background: L.border }} />

          {/* Sentra Engine Badge */}
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 6,
            }}
          >
            <span
              style={{
                fontFamily: L.mono,
                fontSize: 11,
                letterSpacing: '0.15em',
                color: L.muted,
                textTransform: 'uppercase',
              }}
            >
              Powered by
            </span>
            <span
              style={{
                fontFamily: L.mono,
                fontSize: 12,
                fontWeight: 600,
                letterSpacing: '0.1em',
                color: L.accent,
              }}
            >
              SENTRA ENGINE
            </span>
          </div>
        </div>

        {/* Version & License */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 12,
          }}
        >
          <span
            style={{
              fontFamily: L.mono,
              fontSize: 10,
              letterSpacing: '0.1em',
              color: L.muted,
              opacity: 0.6,
            }}
          >
            VIDEO SDK v2.0
          </span>
          <span
            style={{
              fontFamily: L.mono,
              fontSize: 10,
              letterSpacing: '0.1em',
              color: L.muted,
              opacity: 0.6,
            }}
          >
            RFC 4566
          </span>
        </div>
      </div>
    </div>
  )
}
