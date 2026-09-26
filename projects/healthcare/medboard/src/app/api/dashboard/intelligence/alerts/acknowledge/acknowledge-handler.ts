import { NextResponse } from 'next/server'

import { captureDashboardObservabilityError } from '@/lib/intelligence/runtime-observability'
import { canAccessIntelligenceEncounters } from '@/lib/intelligence/server'

interface AcknowledgeBody {
  encounterId: string
  alertTimestamp: string
  acknowledgedAt: string
}

interface DashboardSession {
  username: string
  role: string
}

interface SecurityAuditWriterInput {
  endpoint: string
  action: string
  result: 'success' | 'unauthenticated' | 'forbidden' | 'failure'
  userId?: string | null
  role?: string | null
  ip?: string | null
  metadata?: Record<string, unknown>
}

interface RecordInteractionInput {
  encounterId: string
  interaction: 'alert_acknowledged'
  latencyMs: number
  suggestionCount: number
  violationCount: number
  warningCount: number
  metadata: Record<string, unknown>
  actorUserId: string
  actorRole: string
}

interface InteractionAuditResult {
  encounterId: string
  auditedAt: string
}

export interface AcknowledgeRouteDependencies {
  getSession: (request: Request) => DashboardSession | null
  getIp: (request: Request) => string | null
  recordInteraction: (input: RecordInteractionInput) => Promise<InteractionAuditResult>
  writeSecurityAuditLog: (input: SecurityAuditWriterInput) => Promise<void>
}

function isValidBody(value: unknown): value is AcknowledgeBody {
  if (!value || typeof value !== 'object') {
    return false
  }

  const candidate = value as Record<string, unknown>
  return (
    typeof candidate.encounterId === 'string' &&
    typeof candidate.alertTimestamp === 'string' &&
    typeof candidate.acknowledgedAt === 'string'
  )
}

export function createAcknowledgePostHandler(deps: AcknowledgeRouteDependencies) {
  return async function POST(request: Request): Promise<NextResponse> {
    const session = deps.getSession(request)
    const ip = deps.getIp(request)

    if (!session) {
      await deps.writeSecurityAuditLog({
        endpoint: '/api/dashboard/intelligence/alerts/acknowledge',
        action: 'INTELLIGENCE_ALERT_ACKNOWLEDGE',
        result: 'unauthenticated',
        ip,
      })

      return NextResponse.json({ ok: false, error: 'Unauthorized' }, { status: 401 })
    }

    if (!canAccessIntelligenceEncounters(session.role)) {
      await deps.writeSecurityAuditLog({
        endpoint: '/api/dashboard/intelligence/alerts/acknowledge',
        action: 'INTELLIGENCE_ALERT_ACKNOWLEDGE',
        result: 'forbidden',
        userId: session.username,
        role: session.role,
        ip,
      })

      return NextResponse.json({ ok: false, error: 'Akses ditolak' }, { status: 403 })
    }

    const rawBody = await request.json().catch(() => null)
    if (!isValidBody(rawBody)) {
      await deps.writeSecurityAuditLog({
        endpoint: '/api/dashboard/intelligence/alerts/acknowledge',
        action: 'INTELLIGENCE_ALERT_ACKNOWLEDGE',
        result: 'failure',
        userId: session.username,
        role: session.role,
        ip,
        metadata: { error: 'validation_failed' },
      })

      return NextResponse.json({ ok: false, error: 'Missing required fields' }, { status: 400 })
    }

    try {
      const audit = await deps.recordInteraction({
        encounterId: rawBody.encounterId,
        interaction: 'alert_acknowledged',
        latencyMs: 0,
        suggestionCount: 0,
        violationCount: 1,
        warningCount: 0,
        metadata: {
          alertTimestamp: rawBody.alertTimestamp,
          acknowledgedAt: rawBody.acknowledgedAt,
          source: 'critical-alert-banner',
        },
        actorUserId: session.username,
        actorRole: session.role,
      })

      await deps.writeSecurityAuditLog({
        endpoint: '/api/dashboard/intelligence/alerts/acknowledge',
        action: 'INTELLIGENCE_ALERT_ACKNOWLEDGE',
        result: 'success',
        userId: session.username,
        role: session.role,
        ip,
        metadata: {
          encounterId: rawBody.encounterId,
          acknowledgedAt: rawBody.acknowledgedAt,
        },
      })

      return NextResponse.json(
        {
          ok: true,
          acknowledgedAt: rawBody.acknowledgedAt,
          audit,
        },
        { status: 202 }
      )
    } catch (error) {
      void captureDashboardObservabilityError(error, {
        area: 'intelligence-alert-acknowledge',
        encounterId: rawBody.encounterId,
      })

      await deps.writeSecurityAuditLog({
        endpoint: '/api/dashboard/intelligence/alerts/acknowledge',
        action: 'INTELLIGENCE_ALERT_ACKNOWLEDGE',
        result: 'failure',
        userId: session.username,
        role: session.role,
        ip,
        metadata: {
          encounterId: rawBody.encounterId,
          error: 'audit_persistence_failed',
        },
      })

      return NextResponse.json(
        {
          ok: false,
          error: 'Failed to record alert acknowledgement audit',
        },
        { status: 500 }
      )
    }
  }
}
