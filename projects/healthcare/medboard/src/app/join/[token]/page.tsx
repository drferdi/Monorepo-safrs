'use client'

// ============================================================
// PKM Dashboard — Halaman Publik Pasien: Join Konsultasi
// Route: /join/[token]
// TIDAK perlu login — akses via link WhatsApp
// ============================================================

import {
  GridLayout,
  LayoutContextProvider,
  ParticipantTile,
  RoomAudioRenderer,
  RoomContext,
  useTracks,
} from '@livekit/components-react'
import { Room, RoomEvent, Track } from 'livekit-client'
import { useParams } from 'next/navigation'
import type React from 'react'
import { useCallback, useEffect, useRef, useState } from 'react'
import '@livekit/components-styles'
import { AlertCircle, Loader2, Mic, MicOff, Phone, Video, VideoOff } from 'lucide-react'

// ── Internal: Grid video untuk pasien ──
function PatientTrackGrid(): React.JSX.Element {
  const tracks = useTracks([
    { source: Track.Source.Camera, withPlaceholder: true },
    { source: Track.Source.ScreenShare, withPlaceholder: false },
  ])
  return (
    <GridLayout tracks={tracks} style={{ height: '100%' }}>
      <ParticipantTile />
    </GridLayout>
  )
}

type PageState = 'loading' | 'form' | 'connecting' | 'connected' | 'ended' | 'error'

interface AppointmentInfo {
  appointmentId: string
  doctorId: string
  scheduledAt: string
  durationMinutes: number
  consultationType: string
  status: string
}

export default function PatientJoinPage(): React.JSX.Element {
  const { token } = useParams<{ token: string }>()
  const [state, setState] = useState<PageState>('loading')
  const [info, setInfo] = useState<AppointmentInfo | null>(null)
  const [displayName, setDisplayName] = useState('')
  const [errorMsg, setErrorMsg] = useState('')
  const [room, setRoom] = useState<Room | null>(null)
  const [micOn, setMicOn] = useState(true)
  const [camOn, setCamOn] = useState(true)
  const roomRef = useRef<Room | null>(null)

  // Load appointment info
  useEffect(() => {
    if (!token) return
    fetch(`/api/telemedicine/join/${token}`)
      .then(r => r.json())
      .then((d: { success: boolean; data?: AppointmentInfo; message?: string }) => {
        if (!d.success || !d.data) {
          setErrorMsg(d.message ?? 'Link tidak valid')
          setState('error')
        } else {
          setInfo(d.data)
          setState('form')
        }
      })
      .catch(() => {
        setErrorMsg('Gagal memuat informasi konsultasi')
        setState('error')
      })
  }, [token])

  const handleJoin = useCallback(async () => {
    if (!displayName.trim()) return
    setState('connecting')

    try {
      const res = await fetch(`/api/telemedicine/join/${token}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ displayName: displayName.trim() }),
      })
      const data = (await res.json()) as {
        success: boolean
        data?: { token: string; roomName: string; serverUrl: string }
        message?: string
      }
      if (!data.success || !data.data) throw new Error(data.message ?? 'Gagal mendapat token')

      const newRoom = new Room({ adaptiveStream: true, dynacast: true })
      roomRef.current = newRoom

      newRoom.on(RoomEvent.Disconnected, () => setState('ended'))

      await newRoom.connect(data.data.serverUrl, data.data.token, {
        autoSubscribe: true,
      })
      await newRoom.localParticipant.enableCameraAndMicrophone()

      setRoom(newRoom)
      setState('connected')
    } catch (err) {
      setErrorMsg(err instanceof Error ? err.message : 'Gagal terhubung')
      setState('error')
    }
  }, [displayName, token])

  const handleLeave = useCallback(async () => {
    await roomRef.current?.disconnect()
    setState('ended')
  }, [])

  const toggleMic = useCallback(async () => {
    if (!roomRef.current) return
    const next = !micOn
    await roomRef.current.localParticipant.setMicrophoneEnabled(next)
    setMicOn(next)
  }, [micOn])

  const toggleCam = useCallback(async () => {
    if (!roomRef.current) return
    const next = !camOn
    await roomRef.current.localParticipant.setCameraEnabled(next)
    setCamOn(next)
  }, [camOn])

  const scheduledDate = info
    ? new Date(info.scheduledAt).toLocaleString('id-ID', {
        weekday: 'long',
        day: 'numeric',
        month: 'long',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
        timeZone: 'Asia/Jakarta',
      }) + ' WIB'
    : ''

  // ── UI ──────────────────────────────────────────────────────

  if (state === 'loading') {
    return (
      <div style={fullCenter}>
        <Loader2 size={36} style={{ color: '#D47A57', animation: 'spin 1s linear infinite' }} />
        <p
          style={{
            color: 'rgba(255,255,255,0.5)',
            marginTop: 16,
            fontSize: 14,
          }}
        >
          Memuat informasi konsultasi...
        </p>
      </div>
    )
  }

  if (state === 'error') {
    return (
      <div style={fullCenter}>
        <AlertCircle size={48} style={{ color: '#f87171', marginBottom: 16 }} />
        <h2 style={{ color: '#fff', fontSize: 18, marginBottom: 8 }}>Link Tidak Valid</h2>
        <p
          style={{
            color: 'rgba(255,255,255,0.5)',
            fontSize: 14,
            textAlign: 'center',
            maxWidth: 300,
          }}
        >
          {errorMsg}
        </p>
      </div>
    )
  }

  if (state === 'ended') {
    return (
      <div style={fullCenter}>
        <div style={{ fontSize: 56, marginBottom: 16 }}>✓</div>
        <h2 style={{ color: '#fff', fontSize: 20, marginBottom: 8 }}>Konsultasi Selesai</h2>
        <p style={{ color: 'rgba(255,255,255,0.5)', fontSize: 14 }}>
          Terima kasih telah menggunakan layanan telemedicine Puskesmas.
        </p>
      </div>
    )
  }

  if (state === 'form') {
    return (
      <div style={fullCenter}>
        <div
          style={{
            width: '100%',
            maxWidth: 400,
            background: 'rgba(255,255,255,0.05)',
            border: '1px solid rgba(255,255,255,0.1)',
            borderRadius: 20,
            padding: 32,
          }}
        >
          {/* Header */}
          <div style={{ textAlign: 'center', marginBottom: 28 }}>
            <div
              style={{
                width: 52,
                height: 52,
                borderRadius: '50%',
                background: 'rgba(212,122,87,0.2)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                margin: '0 auto 16px',
              }}
            >
              <Video size={24} style={{ color: '#D47A57' }} />
            </div>
            <h1
              style={{
                color: '#fff',
                fontSize: 20,
                fontWeight: 700,
                margin: 0,
              }}
            >
              Konsultasi Video
            </h1>
            <p
              style={{
                color: 'rgba(255,255,255,0.4)',
                fontSize: 14,
                marginTop: 4,
              }}
            >
              Puskesmas Balowerti
            </p>
          </div>

          {/* Info Jadwal */}
          <div
            style={{
              background: 'rgba(212,122,87,0.1)',
              border: '1px solid rgba(212,122,87,0.25)',
              borderRadius: 12,
              padding: '12px 16px',
              marginBottom: 24,
            }}
          >
            <p
              style={{
                color: 'rgba(255,255,255,0.5)',
                fontSize: 13,
                fontWeight: 600,
                textTransform: 'uppercase',
                letterSpacing: '0.08em',
                margin: '0 0 6px',
              }}
            >
              Jadwal Konsultasi
            </p>
            <p style={{ color: '#fff', fontSize: 14, margin: 0 }}>{scheduledDate}</p>
            <p
              style={{
                color: 'rgba(255,255,255,0.5)',
                fontSize: 13,
                margin: '4px 0 0',
              }}
            >
              Dokter: {info?.doctorId} · {info?.durationMinutes} menit
            </p>
          </div>

          {/* Input Nama */}
          <div style={{ marginBottom: 20 }}>
            <label
              style={{
                color: 'rgba(255,255,255,0.6)',
                fontSize: 14,
                fontWeight: 600,
                display: 'block',
                marginBottom: 8,
              }}
            >
              Nama Anda
            </label>
            <input
              placeholder="Masukkan nama lengkap Anda..."
              value={displayName}
              onChange={e => setDisplayName(e.target.value)}
              onKeyDown={e => {
                if (e.key === 'Enter' && displayName.trim()) void handleJoin()
              }}
              style={{
                width: '100%',
                boxSizing: 'border-box',
                background: 'rgba(255,255,255,0.08)',
                border: '1px solid rgba(255,255,255,0.15)',
                borderRadius: 10,
                padding: '12px 14px',
                color: '#fff',
                fontSize: 14,
                outline: 'none',
              }}
              autoFocus
            />
          </div>

          <button
            onClick={() => void handleJoin()}
            disabled={!displayName.trim()}
            style={{
              width: '100%',
              padding: '14px',
              background: displayName.trim() ? '#D47A57' : 'rgba(212,122,87,0.3)',
              border: 'none',
              borderRadius: 12,
              color: '#fff',
              fontSize: 15,
              fontWeight: 700,
              cursor: displayName.trim() ? 'pointer' : 'not-allowed',
              transition: 'background 0.2s',
            }}
          >
            Masuk Konsultasi
          </button>

          <p
            style={{
              color: 'rgba(255,255,255,0.3)',
              fontSize: 13,
              textAlign: 'center',
              marginTop: 16,
            }}
          >
            Dengan masuk, browser akan meminta akses kamera & mikrofon
          </p>
        </div>
      </div>
    )
  }

  if (state === 'connecting') {
    return (
      <div style={fullCenter}>
        <Loader2 size={36} style={{ color: '#D47A57', animation: 'spin 1s linear infinite' }} />
        <p
          style={{
            color: 'rgba(255,255,255,0.5)',
            marginTop: 16,
            fontSize: 14,
          }}
        >
          Menghubungkan ke ruang konsultasi...
        </p>
      </div>
    )
  }

  // ── Connected: Video Room ──
  return (
    <div
      style={{
        height: '100dvh',
        display: 'flex',
        flexDirection: 'column',
        background: '#0a0a0a',
      }}
    >
      {/* Top bar */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: '10px 16px',
          background: 'rgba(0,0,0,0.6)',
          borderBottom: '1px solid rgba(255,255,255,0.06)',
          flexShrink: 0,
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <Video size={14} style={{ color: '#D47A57' }} />
          <span style={{ color: '#fff', fontSize: 14, fontWeight: 600 }}>
            Konsultasi Berlangsung
          </span>
        </div>
        <span style={{ color: 'rgba(255,255,255,0.4)', fontSize: 14 }}>Puskesmas Balowerti</span>
      </div>

      {/* Video area */}
      <div style={{ flex: 1, overflow: 'hidden' }}>
        {room && (
          <RoomContext.Provider value={room}>
            <div data-lk-theme="default" style={{ height: '100%' }}>
              <LayoutContextProvider>
                <PatientTrackGrid />
                <RoomAudioRenderer />
              </LayoutContextProvider>
            </div>
          </RoomContext.Provider>
        )}
      </div>

      {/* Controls */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          gap: 16,
          padding: '16px',
          background: 'rgba(0,0,0,0.6)',
          borderTop: '1px solid rgba(255,255,255,0.06)',
          flexShrink: 0,
        }}
      >
        <button onClick={() => void toggleMic()} style={ctrlBtn(micOn)}>
          {micOn ? <Mic size={20} /> : <MicOff size={20} />}
        </button>
        <button onClick={() => void toggleCam()} style={ctrlBtn(camOn)}>
          {camOn ? <Video size={20} /> : <VideoOff size={20} />}
        </button>
        <button
          onClick={() => void handleLeave()}
          style={{
            ...ctrlBtn(false),
            background: 'rgba(239,68,68,0.85)',
            color: '#fff',
          }}
        >
          <Phone size={20} style={{ transform: 'rotate(135deg)' }} />
        </button>
      </div>
    </div>
  )
}

// ── Styles ──────────────────────────────────────────────────

const fullCenter: React.CSSProperties = {
  minHeight: '100dvh',
  display: 'flex',
  flexDirection: 'column',
  alignItems: 'center',
  justifyContent: 'center',
  background: '#0a0a0a',
  padding: 24,
}

function ctrlBtn(active: boolean): React.CSSProperties {
  return {
    width: 52,
    height: 52,
    borderRadius: '50%',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    background: active ? 'rgba(255,255,255,0.15)' : 'rgba(255,255,255,0.08)',
    border: `1px solid ${active ? 'rgba(255,255,255,0.2)' : 'rgba(255,255,255,0.1)'}`,
    color: active ? '#fff' : 'rgba(255,255,255,0.5)',
    cursor: 'pointer',
  }
}
