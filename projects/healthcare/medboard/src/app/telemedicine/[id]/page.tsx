'use client'

import type React from 'react'

// ============================================================
// PKM Dashboard — Halaman Video Room Telemedicine
// Route: /telemedicine/[id]
// ============================================================

import { ArrowLeft, Check } from 'lucide-react'
import { useParams, useRouter } from 'next/navigation'
import { useCallback, useEffect, useState } from 'react'

import { TranscriptPanel } from '@/components/telemedicine/TranscriptPanel'
import { VideoRoom } from '@/components/telemedicine/VideoRoom'
import { buildEmrSourceHref, EMR_SOURCE_ORIGINS } from '@/lib/emr/source-trace'
import type { TranscriptLine } from '@/lib/telemedicine/epuskesmas-summary'
import type { AppointmentWithDetails, SessionParticipantRole } from '@/types/telemedicine.types'

import styles from '../telemedicine.module.css'

interface CrewSession {
  username: string
  role: string
  displayName?: string
}

function deriveParticipantRole(
  session: CrewSession | null,
  appointment: AppointmentWithDetails | null
): SessionParticipantRole {
  if (!session || !appointment) return 'DOCTOR'
  const isAssignedDoctor = appointment.doctorId === session.username
  switch (session.role) {
    case 'DOKTER':
      return isAssignedDoctor ? 'DOCTOR' : 'OBSERVER'
    case 'PERAWAT':
      return 'NURSE'
    case 'KEPALA_PUSKESMAS':
    case 'ADMIN':
      return 'OBSERVER'
    case 'CEO':
    case 'CHIEF_EXECUTIVE_OFFICER':
    case 'ADMINISTRATOR':
      return isAssignedDoctor ? 'DOCTOR' : 'OBSERVER'
    default:
      return isAssignedDoctor ? 'DOCTOR' : 'OBSERVER'
  }
}

export default function TelemedicineRoomPage(): React.JSX.Element {
  const { id } = useParams<{ id: string }>()
  const router = useRouter()

  const [appointment, setAppointment] = useState<AppointmentWithDetails | null>(null)
  const [session, setSession] = useState<CrewSession | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [sessionComplete, setSessionComplete] = useState(false)
  const [sessionCompleteError, setSessionCompleteError] = useState<string | null>(null)
  const [transcript, setTranscript] = useState<TranscriptLine[]>([])
  const [transcribing, setTranscribing] = useState(false)
  const [transcriptError, setTranscriptError] = useState('')
  const addUtterance = useCallback((line: TranscriptLine) => {
    setTranscriptError('')
    setTranscript(current => [...current, line])
  }, [])

  const participantRole = deriveParticipantRole(session, appointment)

  const loadAppointment = useCallback(async () => {
    if (!id) return
    setIsLoading(true)
    try {
      const res = await fetch(`/api/telemedicine/appointments/${id}`)
      if (!res.ok) throw new Error('Appointment tidak ditemukan')
      const data = (await res.json()) as { data?: AppointmentWithDetails }
      if (!data.data) throw new Error('Data appointment kosong')
      setAppointment(data.data)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Gagal memuat appointment')
    } finally {
      setIsLoading(false)
    }
  }, [id])

  useEffect(() => {
    void loadAppointment()
  }, [loadAppointment])

  useEffect(() => {
    void (async () => {
      try {
        const res = await fetch('/api/auth/session')
        const data = (await res.json()) as {
          user?: { username?: string; role?: string; displayName?: string }
        }
        const user = data.user
        if (user?.username && user?.role) {
          setSession({
            username: user.username,
            role: user.role,
            displayName: user.displayName,
          })
        }
      } catch {
        /* silent */
      }
    })()
  }, [])

  const handleSessionComplete = useCallback(async (appointmentId: string) => {
    // Update status ke COMPLETED
    setSessionCompleteError(null)
    try {
      const response = await fetch(`/api/telemedicine/appointments/${appointmentId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: 'COMPLETED' }),
      })
      if (!response.ok) {
        throw new Error('Status konsultasi gagal diperbarui. Mohon ulangi kembali.')
      }
      setSessionComplete(true)
    } catch (err) {
      setSessionCompleteError(
        err instanceof Error
          ? err.message
          : 'Koneksi bermasalah. Status konsultasi belum tersimpan.'
      )
    }
  }, [])

  // ── Loading ──
  if (isLoading) {
    return (
      <div className={styles.roomLoading}>
        <div
          style={{
            width: 32,
            height: 32,
            border: '2px solid var(--primary)',
            borderTopColor: 'transparent',
            borderRadius: '50%',
            animation: 'spin 1s linear infinite',
          }}
        />
      </div>
    )
  }

  // ── Error ──
  if (error || !appointment) {
    return (
      <div className={styles.roomCenter}>
        <h2 className={styles.cardTitle}>Appointment Tidak Ditemukan</h2>
        {error && (
          <div className="ui-alert ui-alert--critical" role="alert">
            {error}
          </div>
        )}
        <div className={styles.roomCenterActions}>
          <button onClick={() => router.push('/telemedicine')} className="ui-btn ui-btn--primary">
            <ArrowLeft size={14} /> Kembali ke MedLink
          </button>
        </div>
      </div>
    )
  }

  // ── Session Complete ──
  if (sessionComplete) {
    return (
      <div className={styles.roomCenter}>
        <span className="ui-badge ui-badge--success">
          <Check size={12} />
        </span>
        <h2 className={styles.cardTitle}>Konsultasi Selesai</h2>
        <p className={styles.cardText} style={{ margin: 0 }}>
          Appointment #{appointment.id.slice(-6)} telah direkam
        </p>
        {appointment.diagnosis && (
          <p className={styles.cardText} style={{ margin: 0 }}>
            Diagnosis: {appointment.diagnosis}
          </p>
        )}
        <div className={styles.roomCenterActions}>
          <button
            onClick={() =>
              router.push(
                buildEmrSourceHref({
                  appointmentId: appointment.id,
                  sourceOrigin: EMR_SOURCE_ORIGINS.telemedicineAppointment,
                })
              )
            }
            className="ui-btn ui-btn--secondary"
          >
            Lanjut ke EMR
          </button>
          <button onClick={() => router.push('/telemedicine')} className="ui-btn ui-btn--primary">
            <ArrowLeft size={14} /> Daftar Konsultasi
          </button>
        </div>
      </div>
    )
  }

  // ── Room View ──
  return (
    <div className={styles.roomPage}>
      <div className="ui-page-header" style={{ marginBottom: 0 }}>
        <div>
          <button
            onClick={() => router.push('/telemedicine')}
            className={`ui-btn ui-btn--ghost ui-btn--sm ${styles.roomBack}`}
          >
            <ArrowLeft size={16} /> Kembali
          </button>
          <h1 className={styles.title}>MedLink · #{appointment.id.slice(-6)}</h1>
          <p className="ui-page-header__description">
            {new Date(appointment.scheduledAt).toLocaleString('id-ID', {
              dateStyle: 'short',
              timeStyle: 'short',
            })}
          </p>
        </div>
      </div>
      {sessionCompleteError && (
        <div className="ui-alert ui-alert--critical" role="alert">
          {sessionCompleteError}
        </div>
      )}

      <div className={styles.roomSplit}>
        {/* VideoRoom — left column of the workspace */}
        <div className={styles.roomStage}>
          <VideoRoom
            appointment={appointment}
            participantRole={participantRole}
            onSessionComplete={(apptId) => void handleSessionComplete(apptId)}
            transcribing={transcribing}
            onUtterance={addUtterance}
            onTranscriptError={setTranscriptError}
          />
        </div>
        {participantRole === 'DOCTOR' && (
          <TranscriptPanel
            lines={transcript}
            capturing={transcribing}
            onCapturingChange={setTranscribing}
            error={transcriptError}
          />
        )}
      </div>
    </div>
  )
}
