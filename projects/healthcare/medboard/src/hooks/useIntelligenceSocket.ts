'use client'

import { useEffect, useRef, useState } from 'react'
import { io, type Socket } from 'socket.io-client'
import { isIntelligenceEventPayload } from '@/lib/intelligence/socket-payload'
import type { IntelligenceSocketState } from '@/lib/intelligence/types'

// NFR-001: throttle event state updates — max 1 re-render per 200ms per event type.
// Prevents burst of 50 concurrent encounter updates causing 50 re-renders.
const THROTTLE_MS = 200

const INITIAL_STATE: IntelligenceSocketState = {
  isConnected: false,
  isReconnecting: false,
  lastEncounterUpdate: null,
  lastCriticalAlert: null,
  lastEklaimStatus: null,
  lastCdssSuggestion: null,
}

interface UseIntelligenceSocketOptions {
  enableCdssSuggestions?: boolean
}

/**
 * Hook untuk koneksi Socket.IO ke namespace /intelligence.
 * Reconnection: exponential backoff (1s → 30s max, randomized).
 * Disconnection indicator: state.isReconnecting === true → tampilkan 'Memperbarui...'
 * Throttle: event state updates dibatasi 1x per 200ms per event type (NFR-001).
 */
export function useIntelligenceSocket(
  options: UseIntelligenceSocketOptions = {}
): IntelligenceSocketState {
  const [state, setState] = useState<IntelligenceSocketState>(INITIAL_STATE)
  const socketRef = useRef<Socket | null>(null)
  const throttleRef = useRef<Record<string, number>>({})
  const { enableCdssSuggestions = true } = options

  useEffect(() => {
    // Returns true if enough time has passed since last processed event of this type.
    function shouldProcess(event: string): boolean {
      const now = Date.now()
      const last = throttleRef.current[event] ?? 0
      if (now - last < THROTTLE_MS) return false
      throttleRef.current[event] = now
      return true
    }

    const socket = io('/intelligence', {
      // Exponential backoff: 1s awal, max 30s, randomized ±30%
      reconnection: true,
      reconnectionAttempts: Number.POSITIVE_INFINITY,
      reconnectionDelay: 1000,
      reconnectionDelayMax: 30_000,
      randomizationFactor: 0.3,
      // Kirim cookies untuk session auth (middleware server.ts)
      withCredentials: true,
    })

    socketRef.current = socket

    socket.on('connect', () => {
      setState(prev => ({
        ...prev,
        isConnected: true,
        isReconnecting: false,
      }))
    })

    socket.on('disconnect', () => {
      setState(prev => ({
        ...prev,
        isConnected: false,
        isReconnecting: false,
      }))
    })

    socket.on('connect_error', () => {
      setState(prev => ({
        ...prev,
        isConnected: false,
        isReconnecting: true,
      }))
    })

    socket.on('reconnect_attempt', () => {
      setState(prev => ({ ...prev, isReconnecting: true }))
    })

    socket.on('reconnect', () => {
      setState(prev => ({
        ...prev,
        isConnected: true,
        isReconnecting: false,
      }))
    })

    socket.on('encounter:updated', (payload: unknown) => {
      if (!shouldProcess('encounter:updated')) return
      if (!isIntelligenceEventPayload(payload)) return
      setState(prev => ({ ...prev, lastEncounterUpdate: payload }))
    })

    socket.on('alert:critical', (payload: unknown) => {
      // Critical alerts are NOT throttled — patient safety requires immediate delivery.
      if (!isIntelligenceEventPayload(payload)) return
      setState(prev => ({ ...prev, lastCriticalAlert: payload }))
    })

    socket.on('eklaim:status-changed', (payload: unknown) => {
      if (!shouldProcess('eklaim:status-changed')) return
      if (!isIntelligenceEventPayload(payload)) return
      setState(prev => ({ ...prev, lastEklaimStatus: payload }))
    })

    socket.on('cdss:suggestion-ready', (payload: unknown) => {
      if (!enableCdssSuggestions) return
      if (!shouldProcess('cdss:suggestion-ready')) return
      if (!isIntelligenceEventPayload(payload)) return
      setState(prev => ({ ...prev, lastCdssSuggestion: payload }))
    })

    return () => {
      socket.disconnect()
      socketRef.current = null
    }
  }, [enableCdssSuggestions])

  return state
}
