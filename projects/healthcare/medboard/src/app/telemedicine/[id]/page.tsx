'use client'

import type React from 'react'

// ============================================================
// PKM Dashboard — Halaman Video Room Telemedicine
// Route: /telemedicine/[id]
// ============================================================

import { AlertCircle, ArrowLeft, Video } from 'lucide-react'
import { useParams, useRouter } from 'next/navigation'
import { useCallback, useEffect, useState } from 'react'

import { VideoRoom } from '@/components/telemedicine/VideoRoom'
import { buildEmrSourceHref, EMR_SOURCE_ORIGINS } from '@/lib/emr/source-trace'
import type { AppointmentWithDetails, SessionParticipantRole } from '@/types/telemedicine.types'

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
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          height: '100vh',
          background: 'var(--bg-canvas)',
        }}
      >
        <div
          style={{
            width: 48,
            height: 48,
            border: '4px solid var(--c-asesmen)',
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
      <div
        style={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          height: '100vh',
          background: 'var(--bg-canvas)',
          padding: 32,
        }}
      >
        <AlertCircle size={48} style={{ color: '#f87171', marginBottom: 16 }} />
        <h2 style={{ color: 'var(--text-main)', fontSize: 20, marginBottom: 8 }}>
          Appointment Tidak Ditemukan
        </h2>
        <p style={{ color: 'var(--text-muted)', marginBottom: 24 }}>{error}</p>
        <button
          onClick={() => router.push('/telemedicine')}
          style={{
            padding: '8px 20px',
            background: 'var(--c-asesmen)',
            border: 'none',
            borderRadius: 8,
            color: '#fff',
            cursor: 'pointer',
            fontSize: 13,
            fontWeight: 600,
          }}
        >
          ← Kembali ke Telemedicine
        </button>
      </div>
    )
  }

  // ── Session Complete ──
  if (sessionComplete) {
    return (
      <div
        style={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          height: '100vh',
          background: 'var(--bg-canvas)',
          padding: 32,
        }}
      >
        <div style={{ fontSize: 64, marginBottom: 16 }}>✓</div>
        <h2 style={{ color: 'var(--text-main)', fontSize: 22, marginBottom: 8 }}>
          Konsultasi Selesai
        </h2>
        <p style={{ color: 'var(--text-muted)', marginBottom: 8 }}>
          Appointment #{appointment.id.slice(-6)} telah direkam
        </p>
        {appointment.diagnosis && (
          <p style={{ color: 'var(--text-muted)', fontSize: 13 }}>
            Diagnosis: {appointment.diagnosis}
          </p>
        )}
        <div style={{ display: 'flex', gap: 12, marginTop: 28 }}>
          <button
            onClick={() =>
              router.push(
                buildEmrSourceHref({
                  appointmentId: appointment.id,
                  sourceOrigin: EMR_SOURCE_ORIGINS.telemedicineAppointment,
                })
              )
            }
            style={{
              padding: '8px 20px',
              background: 'transparent',
              border: '1px solid var(--c-asesmen)',
              borderRadius: 8,
              color: 'var(--text-main)',
              cursor: 'pointer',
              fontSize: 13,
              fontWeight: 600,
            }}
          >
            Lanjut ke EMR
          </button>
          <button
            onClick={() => router.push('/telemedicine')}
            style={{
              padding: '8px 20px',
              background: 'var(--c-asesmen)',
              border: 'none',
              borderRadius: 8,
              color: '#fff',
              cursor: 'pointer',
              fontSize: 13,
              fontWeight: 600,
            }}
          >
            ← Daftar Konsultasi
          </button>
        </div>
      </div>
    )
  }

  // ── Room View ──
  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        height: '100vh',
        background: '#0a0a0a',
      }}
    >
      {/* Top bar */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: 16,
          padding: '12px 24px',
          background: 'rgba(0,0,0,0.6)',
          borderBottom: '1px solid rgba(255,255,255,0.06)',
          flexShrink: 0,
        }}
      >
        <button
          onClick={() => router.push('/telemedicine')}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 6,
            color: 'rgba(255,255,255,0.5)',
            background: 'none',
            border: 'none',
            cursor: 'pointer',
            fontSize: 13,
            padding: 4,
          }}
        >
          <ArrowLeft size={16} /> Kembali
        </button>
        <div style={{ width: 1, height: 16, background: 'rgba(255,255,255,0.1)' }} />
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <Video size={15} style={{ color: 'var(--c-asesmen)' }} />
          <span style={{ color: '#fff', fontSize: 14, fontWeight: 600 }}>
            Telemedicine · #{appointment.id.slice(-6)}
          </span>
          <span style={{ color: 'rgba(255,255,255,0.4)', fontSize: 13 }}>
            ·{' '}
            {new Date(appointment.scheduledAt).toLocaleString('id-ID', {
              dateStyle: 'short',
              timeStyle: 'short',
            })}
          </span>
        </div>
      </div>
      {sessionCompleteError && (
        <div
          role="alert"
          style={{
            margin: '12px 24px 0',
            padding: '10px 12px',
            borderRadius: 8,
            border: '1px solid rgba(248,113,113,0.35)',
            background: 'rgba(127,29,29,0.2)',
            color: '#fecaca',
            fontSize: 13,
          }}
        >
          {sessionCompleteError}
        </div>
      )}

      {/* VideoRoom — takes remaining height */}
      <div style={{ flex: 1, overflow: 'hidden' }}>
        <VideoRoom
          appointment={appointment}
          participantRole={participantRole}
          onSessionComplete={(apptId) => void handleSessionComplete(apptId)}
        />
      </div>
    </div>
  )
}
