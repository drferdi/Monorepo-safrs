'use client'

// ============================================================
// PKM Dashboard — useLiveKitSession Hook
// ============================================================

import {
  ConnectionQuality,
  type LocalParticipant,
  type RemoteParticipant,
  Room,
  RoomEvent,
} from 'livekit-client'
import { useCallback, useEffect, useRef, useState } from 'react'

import type {
  LiveKitTokenResponse,
  SessionParticipantInfo,
  SessionParticipantRole,
  SessionState,
} from '@/types/telemedicine.types'

interface UseLiveKitSessionParams {
  appointmentId: string
  participantRole: SessionParticipantRole
  onSessionEnd?: () => void
  onParticipantJoined?: (participant: SessionParticipantInfo) => void
  onParticipantLeft?: (identity: string) => void
}

interface UseLiveKitSessionReturn {
  room: Room | null
  sessionState: SessionState
  participants: SessionParticipantInfo[]
  connect: () => Promise<void>
  disconnect: () => Promise<void>
  toggleMic: () => Promise<void>
  toggleCamera: () => Promise<void>
  toggleScreenShare: () => Promise<void>
  error: string | null
}

const INITIAL_STATE: SessionState = {
  isConnected: false,
  isConnecting: false,
  isMicEnabled: true,
  isCameraEnabled: true,
  isScreenSharing: false,
  participantCount: 0,
  networkQuality: 'unknown',
  elapsedSeconds: 0,
}

export function useLiveKitSession({
  appointmentId,
  participantRole,
  onSessionEnd,
  onParticipantJoined,
  onParticipantLeft,
}: UseLiveKitSessionParams): UseLiveKitSessionReturn {
  const [room] = useState(
    () =>
      new Room({
        adaptiveStream: true,
        dynacast: true,
        audioCaptureDefaults: {
          noiseSuppression: true,
          echoCancellation: true,
          autoGainControl: true,
        },
        videoCaptureDefaults: {
          resolution: { width: 1280, height: 720, frameRate: 24 },
        },
      })
  )

  const [sessionState, setSessionState] = useState<SessionState>(INITIAL_STATE)
  const [participants, setParticipants] = useState<SessionParticipantInfo[]>([])
  const [error, setError] = useState<string | null>(null)
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null)

  const updateState = useCallback((updates: Partial<SessionState>) => {
    setSessionState(prev => ({ ...prev, ...updates }))
  }, [])

  const mapParticipant = useCallback(
    (p: RemoteParticipant | LocalParticipant): SessionParticipantInfo => {
      const meta = (() => {
        try {
          return JSON.parse(p.metadata ?? '{}')
        } catch {
          return {}
        }
      })()
      return {
        identity: p.identity,
        name: p.name ?? p.identity,
        role: (meta.role ?? 'OBSERVER') as SessionParticipantRole,
        isSpeaking: p.isSpeaking,
        isCameraOn: p.isCameraEnabled,
        isMicOn: p.isMicrophoneEnabled,
        networkQuality:
          p.connectionQuality === ConnectionQuality.Excellent
            ? 5
            : p.connectionQuality === ConnectionQuality.Good
              ? 3
              : p.connectionQuality === ConnectionQuality.Poor
                ? 1
                : 0,
      }
    },
    []
  )

  const refreshParticipants = useCallback(() => {
    const list: SessionParticipantInfo[] = [
      mapParticipant(room.localParticipant),
      ...Array.from(room.remoteParticipants.values()).map(mapParticipant),
    ]
    setParticipants(list)
    updateState({ participantCount: list.length })
  }, [room, mapParticipant, updateState])

  useEffect(() => {
    const handleConnected = () => {
      updateState({ isConnected: true, isConnecting: false })
      refreshParticipants()
      timerRef.current = setInterval(() => {
        setSessionState(s => ({
          ...s,
          elapsedSeconds: s.elapsedSeconds + 1,
        }))
      }, 1000)
    }

    const handleDisconnected = () => {
      updateState({ isConnected: false, isConnecting: false })
      if (timerRef.current) clearInterval(timerRef.current)
      onSessionEnd?.()
    }

    const handleParticipantConnected = (p: RemoteParticipant) => {
      refreshParticipants()
      onParticipantJoined?.(mapParticipant(p))
    }

    const handleParticipantDisconnected = (p: RemoteParticipant) => {
      refreshParticipants()
      onParticipantLeft?.(p.identity)
    }

    const handleConnectionQuality = () => {
      const quality = room.localParticipant.connectionQuality
      const mapped =
        quality === ConnectionQuality.Excellent
          ? 'excellent'
          : quality === ConnectionQuality.Good
            ? 'good'
            : quality === ConnectionQuality.Poor
              ? 'poor'
              : 'unknown'
      updateState({ networkQuality: mapped })
    }

    room
      .on(RoomEvent.Connected, handleConnected)
      .on(RoomEvent.Disconnected, handleDisconnected)
      .on(RoomEvent.ParticipantConnected, handleParticipantConnected)
      .on(RoomEvent.ParticipantDisconnected, handleParticipantDisconnected)
      .on(RoomEvent.LocalTrackPublished, refreshParticipants)
      .on(RoomEvent.LocalTrackUnpublished, refreshParticipants)
      .on(RoomEvent.ConnectionQualityChanged, handleConnectionQuality)
      .on(RoomEvent.TrackMuted, refreshParticipants)
      .on(RoomEvent.TrackUnmuted, refreshParticipants)

    return () => {
      room.removeAllListeners()
      if (timerRef.current) clearInterval(timerRef.current)
    }
  }, [
    room,
    refreshParticipants,
    mapParticipant,
    updateState,
    onSessionEnd,
    onParticipantJoined,
    onParticipantLeft,
  ])

  const connect = useCallback(async () => {
    if (sessionState.isConnecting || sessionState.isConnected) return
    setError(null)
    updateState({ isConnecting: true })

    try {
      const res = await fetch('/api/telemedicine/token', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ appointmentId, participantRole }),
      })

      if (!res.ok) {
        const body = (await res.json()) as { message?: string }
        throw new Error(body.message ?? 'Gagal mendapatkan token')
      }

      const { data } = (await res.json()) as { data: LiveKitTokenResponse }
      if (!data) throw new Error('Token tidak tersedia')

      await room.connect(data.serverUrl, data.token)
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Gagal terhubung ke sesi'
      setError(msg)
      updateState({ isConnecting: false })
    }
  }, [room, appointmentId, participantRole, sessionState, updateState])

  const disconnect = useCallback(async () => {
    await room.disconnect()
  }, [room])

  const toggleMic = useCallback(async () => {
    const enabled = !sessionState.isMicEnabled
    await room.localParticipant.setMicrophoneEnabled(enabled)
    updateState({ isMicEnabled: enabled })
  }, [room, sessionState.isMicEnabled, updateState])

  const toggleCamera = useCallback(async () => {
    const enabled = !sessionState.isCameraEnabled
    await room.localParticipant.setCameraEnabled(enabled)
    updateState({ isCameraEnabled: enabled })
  }, [room, sessionState.isCameraEnabled, updateState])

  const toggleScreenShare = useCallback(async () => {
    const enabled = !sessionState.isScreenSharing
    await room.localParticipant.setScreenShareEnabled(enabled)
    updateState({ isScreenSharing: enabled })
  }, [room, sessionState.isScreenSharing, updateState])

  return {
    room,
    sessionState,
    participants,
    connect,
    disconnect,
    toggleMic,
    toggleCamera,
    toggleScreenShare,
    error,
  }
}
