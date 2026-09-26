import type { IntelligenceEventPayload } from './types'

export const INTELLIGENCE_EVENT_STATUSES = [
  'waiting',
  'in_consultation',
  'cdss_pending',
  'documentation_incomplete',
  'completed',
] as const

const INTELLIGENCE_EVENT_STATUS_LABELS: Record<IntelligenceEventStatus, string> = {
  waiting: 'Waiting',
  in_consultation: 'In Consultation',
  cdss_pending: 'CDSS Pending',
  documentation_incomplete: 'Documentation Incomplete',
  completed: 'Completed',
}

export type IntelligenceEventStatus = (typeof INTELLIGENCE_EVENT_STATUSES)[number]

export function isIntelligenceEventStatus(value: unknown): value is IntelligenceEventStatus {
  return (
    typeof value === 'string' &&
    INTELLIGENCE_EVENT_STATUSES.includes(value as IntelligenceEventStatus)
  )
}

export function getIntelligenceEventStatusLabel(status: IntelligenceEventStatus): string {
  return INTELLIGENCE_EVENT_STATUS_LABELS[status]
}

export function isIntelligenceEventPayload(payload: unknown): payload is IntelligenceEventPayload {
  if (!payload || typeof payload !== 'object') {
    return false
  }

  const raw = payload as Record<string, unknown>

  return (
    typeof raw.encounterId === 'string' &&
    isIntelligenceEventStatus(raw.status) &&
    typeof raw.timestamp === 'string' &&
    Number.isNaN(Date.parse(raw.timestamp)) === false &&
    typeof raw.data === 'object' &&
    raw.data !== null
  )
}
