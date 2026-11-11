import type { ICD10Result } from '../types'

import type { AuditFailureCode, LogbookAuditEnvelope } from './logbookTypes'

interface SettledRequest {
  id: string
  createdAt: string
  durationMs: number
}

export function buildCompletedLogbookRecord(
  request: SettledRequest & { outcome: ICD10Result }
): LogbookAuditEnvelope {
  return {
    id: request.id,
    schemaVersion: 2,
    createdAt: request.createdAt,
    status: 'completed',
    durationMs: request.durationMs,
    urgency: request.outcome.urgency,
    referralCount: request.outcome.proposed_referrals.length,
    resultSchemaVersion: request.outcome.schema_version,
    humanReviewRequired: true,
    failureCode: null,
  }
}

export function buildFailedLogbookRecord(
  request: SettledRequest & { failureCode: AuditFailureCode }
): LogbookAuditEnvelope {
  return {
    id: request.id,
    schemaVersion: 2,
    createdAt: request.createdAt,
    status: 'failed',
    durationMs: request.durationMs,
    urgency: null,
    referralCount: 0,
    resultSchemaVersion: null,
    humanReviewRequired: true,
    failureCode: request.failureCode,
  }
}
