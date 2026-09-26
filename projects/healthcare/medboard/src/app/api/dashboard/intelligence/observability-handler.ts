import type { ApiResponse } from '@abyss/types'
import { NextResponse } from 'next/server'
import { z } from 'zod'

import { canAccessIntelligenceInsights, type OverrideAuditResult } from '@/lib/intelligence/server'

const ObservabilityPayloadSchema = z.object({
  encounterId: z.string().min(1),
  requestId: z.string().min(1).optional(),
  interaction: z.enum(['rendered', 'guardrail_blocked', 'degraded', 'alert_acknowledged']),
  latencyMs: z.number().min(0).optional(),
  suggestionCount: z.number().int().min(0),
  violationCount: z.number().int().min(0),
  warningCount: z.number().int().min(0),
  primaryConfidence: z.number().min(0).max(1).optional(),
  metadata: z.record(z.string(), z.unknown()).optional(),
})

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

export interface ObservabilityRouteDependencies {
  getSession: (request: Request) => DashboardSession | null
  getIp: (request: Request) => string | null
  recordInteraction: (
    input: z.infer<typeof ObservabilityPayloadSchema> & {
      actorUserId: string
      actorRole: string
    }
  ) => Promise<OverrideAuditResult>
  writeSecurityAuditLog: (input: SecurityAuditWriterInput) => Promise<void>
}

function buildJsonResponse<T>(status: number, payload: ApiResponse<T>): NextResponse {
  return NextResponse.json<ApiResponse<T>>(payload, { status })
}

export function createObservabilityPostHandler(deps: ObservabilityRouteDependencies) {
  return async function POST(request: Request): Promise<NextResponse> {
    const session = deps.getSession(request)
    const ip = deps.getIp(request)

    if (!session) {
      await deps.writeSecurityAuditLog({
        endpoint: '/api/dashboard/intelligence/observability',
        action: 'INTELLIGENCE_OBSERVABILITY',
        result: 'unauthenticated',
        ip,
      })

      return buildJsonResponse<OverrideAuditResult>(401, {
        success: false,
        error: { code: 'AUTH-401', message: 'Unauthorized' },
      })
    }

    if (!canAccessIntelligenceInsights(session.role)) {
      await deps.writeSecurityAuditLog({
        endpoint: '/api/dashboard/intelligence/observability',
        action: 'INTELLIGENCE_OBSERVABILITY',
        result: 'forbidden',
        userId: session.username,
        role: session.role,
        ip,
      })

      return buildJsonResponse<OverrideAuditResult>(403, {
        success: false,
        error: { code: 'RBAC-403', message: 'Akses ditolak' },
      })
    }

    const rawBody = await request.json().catch(() => null)
    const parsed = ObservabilityPayloadSchema.safeParse(rawBody)

    if (!parsed.success) {
      await deps.writeSecurityAuditLog({
        endpoint: '/api/dashboard/intelligence/observability',
        action: 'INTELLIGENCE_OBSERVABILITY',
        result: 'failure',
        userId: session.username,
        role: session.role,
        ip,
        metadata: {
          error: 'validation_failed',
          issueCount: parsed.error.issues.length,
        },
      })

      return buildJsonResponse<OverrideAuditResult>(400, {
        success: false,
        error: {
          code: 'VALIDATION-400',
          message: 'Payload observability tidak valid',
        },
      })
    }

    try {
      const result = await deps.recordInteraction({
        ...parsed.data,
        actorUserId: session.username,
        actorRole: session.role,
      })

      await deps.writeSecurityAuditLog({
        endpoint: '/api/dashboard/intelligence/observability',
        action: 'INTELLIGENCE_OBSERVABILITY',
        result: 'success',
        userId: session.username,
        role: session.role,
        ip,
        metadata: {
          encounterId: parsed.data.encounterId,
          interaction: parsed.data.interaction,
          suggestionCount: parsed.data.suggestionCount,
        },
      })

      return buildJsonResponse<OverrideAuditResult>(202, {
        success: true,
        data: result,
      })
    } catch (error) {
      await deps.writeSecurityAuditLog({
        endpoint: '/api/dashboard/intelligence/observability',
        action: 'INTELLIGENCE_OBSERVABILITY',
        result: 'failure',
        userId: session.username,
        role: session.role,
        ip,
        metadata: {
          error: error instanceof Error ? error.message : 'Unknown error',
        },
      })

      return buildJsonResponse<OverrideAuditResult>(500, {
        success: false,
        error: {
          code: 'INTELLIGENCE-500',
          message: 'Gagal merekam observability intelligence',
        },
      })
    }
  }
}
