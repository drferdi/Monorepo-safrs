'use client'

import type React from 'react'

// ============================================================
// PKM Dashboard — VideoRoom Component
// ============================================================

import {
  GridLayout,
  LayoutContextProvider,
  ParticipantTile,
  RoomAudioRenderer,
  RoomContext,
  useTracks,
} from '@livekit/components-react'
import { useCallback, useEffect, useRef } from 'react'
import '@livekit/components-styles'
import { Track } from 'livekit-client'

import { useLiveKitSession } from '@/hooks/useLiveKitSession'
import type { AppointmentWithDetails, SessionParticipantRole } from '@/types/telemedicine.types'
import { ConsultationControls } from './ConsultationControls'
import { ConsultationTimer } from './ConsultationTimer'
import { NetworkQualityBadge } from './NetworkQualityBadge'

interface VideoRoomProps {
  appointment: AppointmentWithDetails
  participantRole: SessionParticipantRole
  onSessionComplete: (appointmentId: string) => void
}

// ── TrackGrid: komponen internal agar useTracks dipanggil di level komponen ──
function TrackGrid(): React.JSX.Element {
  const tracks = useTracks([
    { source: Track.Source.Camera, withPlaceholder: true },
    { source: Track.Source.ScreenShare, withPlaceholder: false },
  ])
  return (
    <GridLayout tracks={tracks} style={{ height: 'calc(100% - 60px)' }}>
      <ParticipantTile />
    </GridLayout>
  )
}

export function VideoRoom({
  appointment,
  participantRole,
  onSessionComplete,
}: VideoRoomProps): React.JSX.Element {
  const {
    room,
    sessionState,
    connect,
    disconnect,
    toggleMic,
    toggleCamera,
    toggleScreenShare,
    error,
  } = useLiveKitSession({
    appointmentId: appointment.id,
    participantRole,
    onSessionEnd: () => onSessionComplete(appointment.id),
  })

  const connectRef = useRef(connect)
  const disconnectRef = useRef(disconnect)
  connectRef.current = connect
  disconnectRef.current = disconnect
  useEffect(() => {
    void connectRef.current()
    return () => {
      void disconnectRef.current()
    }
    // Mount-only: connect on mount, disconnect on unmount. Refs ensure we call latest impl.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const handleEndCall = useCallback(async () => {
    await disconnect()
    onSessionComplete(appointment.id)
  }, [disconnect, onSessionComplete, appointment.id])

  // ── Error state ──
  if (error) {
    return (
      <div
        style={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          gap: 16,
          height: '100%',
          background: 'var(--surface)',
          padding: 32,
          textAlign: 'center',
        }}
      >
        <h3 style={{ color: 'var(--text)', fontSize: 16, fontWeight: 600, margin: 0 }}>
          Gagal Terhubung
        </h3>
        <p style={{ color: 'var(--text-secondary)', fontSize: 14, margin: 0 }}>{error}</p>
        <button onClick={() => void connect()} className="ui-btn ui-btn--primary">
          Coba Lagi
        </button>
      </div>
    )
  }

  // ── Connecting state ──
  if (sessionState.isConnecting) {
    return (
      <div
        style={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          height: '100%',
          background: 'var(--surface)',
          color: 'var(--text)',
        }}
      >
        <div
          style={{
            width: 32,
            height: 32,
            border: '2px solid var(--primary)',
            borderTopColor: 'transparent',
            borderRadius: '50%',
            animation: 'spin 1s linear infinite',
            marginBottom: 16,
          }}
        />
        <p style={{ color: 'var(--text-secondary)', fontSize: 14, margin: 0 }}>
          Menghubungkan ke ruang konsultasi...
        </p>
      </div>
    )
  }

  return (
    <div
      style={{
        position: 'relative',
        display: 'flex',
        flexDirection: 'column',
        height: '100%',
        background: 'var(--surface)',
        overflow: 'hidden',
      }}
    >
      {/* Header */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: '12px 24px',
          background: 'var(--surface)',
          borderBottom: '1px solid var(--border)',
          zIndex: 10,
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <div
            style={{
              width: 8,
              height: 8,
              borderRadius: '50%',
              background: 'var(--success)',
            }}
          />
          <span style={{ color: 'var(--text)', fontSize: 16, fontWeight: 600 }}>
            Konsultasi MedLink
          </span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <NetworkQualityBadge quality={sessionState.networkQuality} />
          <ConsultationTimer elapsedSeconds={sessionState.elapsedSeconds} />
          <span style={{ color: 'var(--text-secondary)', fontSize: 14 }}>
            {sessionState.participantCount} peserta
          </span>
        </div>
      </div>

      {/* Video Grid */}
      <div style={{ flex: 1, position: 'relative', background: 'var(--surface-subtle)' }}>
        {room && sessionState.isConnected ? (
          <RoomContext.Provider value={room}>
            <div data-lk-theme="default" style={{ height: '100%' }}>
              <LayoutContextProvider>
                <div style={{ height: '100%' }}>
                  <TrackGrid />
                  <RoomAudioRenderer />
                </div>
              </LayoutContextProvider>
            </div>
          </RoomContext.Provider>
        ) : (
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              height: '100%',
              color: 'var(--text-secondary)',
              fontSize: 14,
            }}
          >
            Menunggu koneksi...
          </div>
        )}
      </div>

      {/* Controls */}
      <ConsultationControls
        sessionState={sessionState}
        participantRole={participantRole}
        appointment={appointment}
        onToggleMic={toggleMic}
        onToggleCamera={toggleCamera}
        onToggleScreenShare={toggleScreenShare}
        onEndCall={handleEndCall}
      />
    </div>
  )
}
