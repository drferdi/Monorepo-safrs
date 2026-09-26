import 'server-only'
/**
 * Intelligence Dashboard — Socket.IO Server Bridge
 * Mengikuti pola yang sama dengan emr/socket-bridge.ts.
 * setIntelligenceSocketIO() dipanggil dari server.ts setelah io dibuat.
 * emit* functions dipanggil dari API routes untuk broadcast ke klien.
 */

import type { Namespace } from 'socket.io'
import type { IntelligenceEventPayload } from './types'

const GLOBAL_KEY = '__sentra_intelligence_ns__' as const

function getNS(): Namespace | null {
  return (globalThis as Record<string, unknown>)[GLOBAL_KEY] as Namespace | null
}

export function setIntelligenceNamespace(ns: Namespace): void {
  ;(globalThis as Record<string, unknown>)[GLOBAL_KEY] = ns
}

function emitToIntelligence(event: string, payload: IntelligenceEventPayload): void {
  const ns = getNS()
  if (!ns) {
    console.warn(
      `[Intelligence] emitToIntelligence: namespace belum diinisialisasi (event: ${event})`
    )
    return
  }
  ns.emit(event, payload)
}

export function emitEncounterUpdated(payload: IntelligenceEventPayload): void {
  emitToIntelligence('encounter:updated', payload)
}

export function emitCriticalAlert(payload: IntelligenceEventPayload): void {
  emitToIntelligence('alert:critical', payload)
}

export function emitEklaimStatusChanged(payload: IntelligenceEventPayload): void {
  emitToIntelligence('eklaim:status-changed', payload)
}

export function emitCdssSuggestionReady(payload: IntelligenceEventPayload): void {
  emitToIntelligence('cdss:suggestion-ready', payload)
}
