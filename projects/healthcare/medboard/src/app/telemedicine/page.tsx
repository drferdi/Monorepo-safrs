'use client'

import {
  Check,
  RefreshCw,
  Trash2,
  Video,
  X,
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
import { tidyCase } from '@/lib/text/tidy-case'
import type { AppointmentStatus, AppointmentWithDetails } from '@/types/telemedicine.types'

import { MedLinkStudio } from './MedLinkStudio'
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

/* ── Status config ── */
type StatusTone = 'warning' | 'primary' | 'success' | 'neutral' | 'critical'

const STATUS_CONFIG: Record<AppointmentStatus, { label: string; tone: StatusTone }> = {
  PENDING: { label: 'Menunggu', tone: 'warning' },
  CONFIRMED: { label: 'Dikonfirmasi', tone: 'primary' },
  IN_PROGRESS: { label: 'Berlangsung', tone: 'success' },
  COMPLETED: { label: 'Selesai', tone: 'neutral' },
  CANCELLED: { label: 'Dibatalkan', tone: 'critical' },
  NO_SHOW: { label: 'Tidak hadir', tone: 'warning' },
}

const ACTIVE_APPOINTMENT_STATUSES: AppointmentStatus[] = ['PENDING', 'CONFIRMED', 'IN_PROGRESS']
const PAST_APPOINTMENT_STATUSES: AppointmentStatus[] = ['COMPLETED', 'CANCELLED', 'NO_SHOW']

const clock = (iso: string) => new Date(iso).toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' })

/* ── The work under the studio, in the order it happens (Chief 2026-10-07) ── */
const TABS = [
  { id: 'requests', label: 'Permintaan' },
  { id: 'schedule', label: 'Jadwal' },
  { id: 'consult', label: 'Konsultasi' },
  { id: 'history', label: 'Riwayat' },
] as const

type TabId = (typeof TABS)[number]['id']

/* ── One consultation session ── */
function AppointmentRow({ appointment, onJoin }: { appointment: AppointmentWithDetails; onJoin?: () => void }) {
  const status = STATUS_CONFIG[appointment.status]
  const type =
    appointment.consultationType === 'VIDEO' ? 'Video' : appointment.consultationType === 'AUDIO' ? 'Audio' : 'Chat'
  const when = new Date(appointment.scheduledAt).toLocaleString('id-ID', { dateStyle: 'medium', timeStyle: 'short' })

  return (
    <li className={styles.row}>
      <div className={styles.rowMain}>
        <span className={styles.rowName}>Pasien {appointment.patientId}</span>
        <span className={styles.rowMeta}>
          {when} · {type} · {appointment.durationMinutes} menit
          {appointment.keluhanUtama ? ` · ${tidyCase(appointment.keluhanUtama)}` : ''}
        </span>
      </div>
      <div className={styles.rowActions}>
        <span className={`ui-badge ui-badge--${status.tone}`}>{status.label}</span>
        {onJoin && (
          <button type="button" onClick={onJoin} className="ui-btn ui-btn--primary ui-btn--sm">
            <Video size={14} aria-hidden="true" />
            Masuk
          </button>
        )}
      </div>
    </li>
  )
}

/* ── One request from the website ── */
function RequestRow({
  request,
  onMarkHandled,
  onDelete,
}: {
  request: TeleRequest
  onMarkHandled: (id: string) => void
  onDelete: (id: string) => void
}) {
  const handled = request.status === 'HANDLED'
  return (
    <li className={handled ? `${styles.row} ${styles.rowMuted}` : styles.row}>
      <div className={styles.rowMain}>
        <span className={styles.rowName}>
          {tidyCase(request.nama, 'name')}, {request.usia} th · {request.poli}
        </span>
        <span className={styles.rowMeta}>
          {clock(request.createdAt)} · {request.hp}
          {request.bpjs ? ` · BPJS ${request.bpjs}` : ''} · {tidyCase(request.keluhan)}
        </span>
      </div>
      <div className={styles.rowActions}>
        {handled ? (
          <span className={styles.rowMeta}>
            <Check size={14} aria-hidden="true" /> Ditangani
          </span>
        ) : (
          <button type="button" onClick={() => onMarkHandled(request.id)} className="ui-btn ui-btn--secondary ui-btn--sm">
            Ditangani
          </button>
        )}
        <button
          type="button"
          onClick={() => {
            if (confirm('Hapus permintaan ini?')) onDelete(request.id)
          }}
          aria-label={`Hapus permintaan ${request.nama}`}
          className="ui-btn ui-btn--ghost ui-btn--sm"
        >
          <Trash2 size={14} aria-hidden="true" />
        </button>
      </div>
    </li>
  )
}

/* ── Main Page ── */
export default function TelemedicinePage(): React.JSX.Element {
  const router = useRouter()
  const [appointments, setAppointments] = useState<AppointmentWithDetails[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [tab, setTab] = useState<TabId>('requests')
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
  const counts: Partial<Record<TabId, number>> = {
    requests: pendingRequests.length + sortedConsults.length,
    consult: activeAppointments.length,
    history: pastAppointments.length,
  }

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
                aria-label="Tutup"
              >
                <X size={14} />
              </button>
            </div>

            <div className={styles.dialogBody}>
              {/* Keluhan */}
              <div className={styles.dialogSection}>
                <div className={styles.dialogLabel}>Keluhan Utama</div>
                <div className={styles.dialogText}>{tidyCase(activeConsult.keluhan_utama ?? '')}</div>
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
            {tidyCase(acceptedForTransfer.patientName ?? '', 'name')}
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

      <header className={styles.header}>
        <h1 className={styles.title}>MedLink</h1>
        <p className={styles.subtitle}>Konsultasi video jarak jauh, dari permintaan sampai selesai.</p>
      </header>

      <MedLinkStudio
        doctorName={doctorName}
        isDoctor={isDoctor}
        isOnline={isOnline}
        toggling={togglingStatus}
        onToggleOnline={() => void handleToggleOnline()}
      />

      <div className={styles.work}>
        <div className="ui-tabs" role="tablist" aria-label="Pekerjaan MedLink">
          {TABS.map(item => (
            <button
              key={item.id}
              type="button"
              role="tab"
              id={`medlink-tab-${item.id}`}
              aria-selected={tab === item.id}
              aria-controls="medlink-panel"
              onClick={() => setTab(item.id)}
              className="ui-tab"
            >
              {item.label}
              {counts[item.id] !== undefined && <span className={styles.tabCount}>{counts[item.id]}</span>}
            </button>
          ))}
        </div>

        <div className={styles.panel} role="tabpanel" id="medlink-panel" aria-labelledby={`medlink-tab-${tab}`}>
          {tab === 'requests' &&
            (requests.length === 0 && sortedConsults.length === 0 ? (
              <p className={styles.note}>Belum ada permintaan.</p>
            ) : (
              <ul className={styles.list}>
                {sortedConsults.map(consult => (
                  <li key={consult.consultId} className={styles.row}>
                    <div className={styles.rowMain}>
                      <span className={styles.rowName}>
                        {tidyCase(consult.patient.name, 'name')}, {consult.patient.age} th · Asisten Medis
                      </span>
                      <span className={styles.rowMeta}>
                        {clock(consult.sentAt)} · {resolveCanonicalSnapshotTone(consult.canonical_clinical).label} ·{' '}
                        {tidyCase(consult.keluhan_utama ?? '')}
                      </span>
                    </div>
                    <div className={styles.rowActions}>
                      <button
                        type="button"
                        onClick={() => setActiveConsult(consult)}
                        className="ui-btn ui-btn--secondary ui-btn--sm"
                      >
                        Buka
                      </button>
                    </div>
                  </li>
                ))}
                {[...pendingRequests, ...requests.filter(r => r.status !== 'PENDING')].map(request => (
                  <RequestRow
                    key={request.id}
                    request={request}
                    onMarkHandled={id => void handleMarkHandled(id)}
                    onDelete={id => void handleDeleteRequest(id)}
                  />
                ))}
              </ul>
            ))}

          {tab === 'schedule' && (
            <AppointmentBooking onSuccess={handleBookingSuccess} onCancel={() => setTab('consult')} />
          )}

          {tab === 'consult' && (
            <>
              <div className={styles.panelHead}>
                <p className={styles.note}>Pasien masuk lewat tautan WhatsApp, tanpa memasang aplikasi.</p>
                <button
                  type="button"
                  onClick={() => void loadAppointments()}
                  aria-label="Muat ulang sesi"
                  className="ui-btn ui-btn--secondary ui-btn--sm"
                >
                  <RefreshCw size={14} aria-hidden="true" />
                </button>
              </div>
              {isLoading ? (
                <p className={styles.note}>Memuat sesi…</p>
              ) : activeAppointments.length === 0 ? (
                <p className={styles.note}>Belum ada sesi aktif.</p>
              ) : (
                <ul className={styles.list}>
                  {activeAppointments.map(appt => (
                    <AppointmentRow
                      key={appt.id}
                      appointment={appt}
                      onJoin={() => router.push(`/telemedicine/${appt.id}`)}
                    />
                  ))}
                </ul>
              )}
            </>
          )}

          {tab === 'history' &&
            (pastAppointments.length === 0 ? (
              <p className={styles.note}>Belum ada sesi yang selesai.</p>
            ) : (
              <ul className={styles.list}>
                {pastAppointments.map(appt => (
                  <AppointmentRow key={appt.id} appointment={appt} />
                ))}
              </ul>
            ))}
        </div>
      </div>
    </div>
  )
}
