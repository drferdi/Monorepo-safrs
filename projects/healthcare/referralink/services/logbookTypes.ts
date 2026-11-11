export type LogbookStatus = 'completed' | 'failed'
export type LogbookStorageStatus = 'ready' | 'unavailable'
export type AuditUrgency = 'routine' | 'urgent' | 'emergency'
export type AuditFailureCode =
  | 'timeout'
  | 'rate-limited'
  | 'invalid-output'
  | 'service-unavailable'
  | 'network'
  | 'unknown'

export interface LogbookAuditEnvelope {
  id: string
  schemaVersion: 2
  createdAt: string
  status: LogbookStatus
  durationMs: number
  urgency: AuditUrgency | null
  referralCount: number
  resultSchemaVersion: number | null
  humanReviewRequired: true
  failureCode: AuditFailureCode | null
}
