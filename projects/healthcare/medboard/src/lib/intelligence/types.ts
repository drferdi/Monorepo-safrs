// Intelligence Dashboard — Shared Types
// Server + Client boundary: types only, no runtime logic.

import type { IntelligenceEventStatus } from './socket-payload'

export type IntelligenceEventName =
  | 'encounter:updated'
  | 'alert:critical'
  | 'eklaim:status-changed'
  | 'cdss:suggestion-ready'

/** Base schema semua event di namespace /intelligence */
export interface IntelligenceEventPayload {
  encounterId: string
  status: IntelligenceEventStatus
  timestamp: string
  data: Record<string, unknown>
}

export interface IntelligenceSocketState {
  isConnected: boolean
  isReconnecting: boolean
  lastEncounterUpdate: IntelligenceEventPayload | null
  lastCriticalAlert: IntelligenceEventPayload | null
  lastEklaimStatus: IntelligenceEventPayload | null
  lastCdssSuggestion: IntelligenceEventPayload | null
}
