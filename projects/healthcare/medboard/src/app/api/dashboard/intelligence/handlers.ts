import type {
  ApiResponse,
  DashboardEncounterSummary,
  DashboardOperationalMetrics,
} from '@abyss/types'
import { NextResponse } from 'next/server'
import { z } from 'zod'

import {
  canAccessIntelligenceEncounters,
  canAccessIntelligenceMetrics,
  canSubmitIntelligenceOverride,
  type OverrideAuditResult,
} from '@/lib/intelligence/server'

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

const OverridePayloadBaseSchema = z.object({
  encounterId: z.string().min(1),
  selectedIcd: z.string().min(1).optional(),
  selectedConfidence: z.number().min(0).max(1).optional(),
  outcomeConfirmed: z.boolean().nullable().optional(),
  followUpNote: z.string().max(1000).optional(),
  metadata: z.record(z.string(), z.unknown()).optional(),
})

const OverridePayloadSchema = z.discriminatedUnion('action', [
  OverridePayloadBaseSchema.extend({
    action: z.literal('accept'),
    finalIcd: z.string().min(1).optional(),
    overrideReason: z.string().max(500).optional(),
  }),
  OverridePayloadBaseSchema.extend({
    action: z.literal('modify'),
    finalIcd: z.string().min(1),
    overrideReason: z.string().min(1).max(500),
  }),
  OverridePayloadBaseSchema.extend({
    action: z.literal('reject'),
    finalIcd: z.string().min(1).optional(),
    overrideReason: z.string().min(1).max(500),
  }),
])

export interface EncountersRouteDependencies {
  getSession: (request: Request) => DashboardSession | null
  getIp: (request: Request) => string | null
  listEncounterSummaries: (options: {
    limit?: number
    status?: string | null
  }) => Promise<DashboardEncounterSummary[]>
  writeSecurityAuditLog: (input: SecurityAuditWriterInput) => Promise<void>
}

export interface MetricsRouteDependencies {
  getSession: (request: Request) => DashboardSession | null
  getIp: (request: Request) => string | null
  getOperationalMetrics: () => Promise<DashboardOperationalMetrics>
  writeSecurityAuditLog: (input: SecurityAuditWriterInput) => Promise<void>
}

export interface OverrideRouteDependencies {
  getSession: (request: Request) => DashboardSession | null
  getIp: (request: Request) => string | null
  recordOverride: (input: {
    encounterId: string
    action: 'accept' | 'modify' | 'reject'
    selectedIcd?: string
    finalIcd?: string
    selectedConfidence?: number
    outcomeConfirmed?: boolean | null
    followUpNote?: string
    overrideReason?: string
    metadata?: Record<string, unknown>
    actorUserId: string
    actorRole: string
  }) => Promise<OverrideAuditResult>
  writeSecurityAuditLog: (input: SecurityAuditWriterInput) => Promise<void>
}

function buildJsonResponse<T>(status: number, payload: ApiResponse<T>): NextResponse {
  return NextResponse.json<ApiResponse<T>>(payload, { status })
}

function buildOverrideValidationResponse(
  validationErrors: Array<{ field: string; message: string; rule: string }>
): NextResponse {
  return buildJsonResponse<OverrideAuditResult>(400, {
    success: false,
    error: {
      code: 'VALIDATION-400',
      message: 'Payload override tidak valid',
      validationErrors,
    },
  })
}

export function createEncountersGetHandler(deps: EncountersRouteDependencies) {
  return async function GET(request: Request): Promise<NextResponse> {
    const session = deps.getSession(request)
    const ip = deps.getIp(request)

    if (!session) {
      await deps.writeSecurityAuditLog({
        endpoint: '/api/dashboard/intelligence/encounters',
        action: 'INTELLIGENCE_ENCOUNTERS_READ',
        result: 'unauthenticated',
        ip,
      })

      return buildJsonResponse<DashboardEncounterSummary[]>(401, {
        success: false,
        error: {
          code: 'AUTH-401',
          message: 'Unauthorized',
        },
      })
    }

    if (!canAccessIntelligenceEncounters(session.role)) {
      await deps.writeSecurityAuditLog({
        endpoint: '/api/dashboard/intelligence/encounters',
        action: 'INTELLIGENCE_ENCOUNTERS_READ',
        result: 'forbidden',
        userId: session.username,
        role: session.role,
        ip,
      })

      return buildJsonResponse<DashboardEncounterSummary[]>(403, {
        success: false,
        error: {
          code: 'RBAC-403',
          message: 'Akses ditolak',
        },
      })
    }

    try {
      const url = new URL(request.url)
      const limit = Number.parseInt(url.searchParams.get('limit') ?? '50', 10)
      const status = url.searchParams.get('status')
      const summaries = await deps.listEncounterSummaries({
        limit: Number.isFinite(limit) ? limit : 50,
        status,
      })

      await deps.writeSecurityAuditLog({
        endpoint: '/api/dashboard/intelligence/encounters',
        action: 'INTELLIGENCE_ENCOUNTERS_READ',
        result: 'success',
        userId: session.username,
        role: session.role,
        ip,
        metadata: {
          encounterCount: summaries.length,
        },
      })

      return buildJsonResponse<DashboardEncounterSummary[]>(200, {
        success: true,
        data: summaries,
      })
    } catch (error) {
      await deps.writeSecurityAuditLog({
        endpoint: '/api/dashboard/intelligence/encounters',
        action: 'INTELLIGENCE_ENCOUNTERS_READ',
        result: 'failure',
        userId: session.username,
        role: session.role,
        ip,
        metadata: {
          error: error instanceof Error ? error.message : 'Unknown error',
        },
      })

      return buildJsonResponse<DashboardEncounterSummary[]>(500, {
        success: false,
        error: {
          code: 'INTELLIGENCE-500',
          message: 'Gagal memuat data encounter intelligence',
        },
      })
    }
  }
}

export function createMetricsGetHandler(deps: MetricsRouteDependencies) {
  return async function GET(request: Request): Promise<NextResponse> {
    const session = deps.getSession(request)
    const ip = deps.getIp(request)

    if (!session) {
      await deps.writeSecurityAuditLog({
        endpoint: '/api/dashboard/intelligence/metrics',
        action: 'INTELLIGENCE_METRICS_READ',
        result: 'unauthenticated',
        ip,
      })

      return buildJsonResponse<DashboardOperationalMetrics>(401, {
        success: false,
        error: {
          code: 'AUTH-401',
          message: 'Unauthorized',
        },
      })
    }

    if (!canAccessIntelligenceMetrics(session.role)) {
      await deps.writeSecurityAuditLog({
        endpoint: '/api/dashboard/intelligence/metrics',
        action: 'INTELLIGENCE_METRICS_READ',
        result: 'forbidden',
        userId: session.username,
        role: session.role,
        ip,
      })

      return buildJsonResponse<DashboardOperationalMetrics>(403, {
        success: false,
        error: {
          code: 'RBAC-403',
          message: 'Akses ditolak',
        },
      })
    }

    try {
      const metrics = await deps.getOperationalMetrics()

      await deps.writeSecurityAuditLog({
        endpoint: '/api/dashboard/intelligence/metrics',
        action: 'INTELLIGENCE_METRICS_READ',
        result: 'success',
        userId: session.username,
        role: session.role,
        ip,
        metadata: {
          totalEncounters: metrics.totalEncounters,
          overrideCount: metrics.overrideCount,
        },
      })

      return buildJsonResponse<DashboardOperationalMetrics>(200, {
        success: true,
        data: metrics,
      })
    } catch (error) {
      await deps.writeSecurityAuditLog({
        endpoint: '/api/dashboard/intelligence/metrics',
        action: 'INTELLIGENCE_METRICS_READ',
        result: 'failure',
        userId: session.username,
        role: session.role,
        ip,
        metadata: {
          error: error instanceof Error ? error.message : 'Unknown error',
        },
      })

      return buildJsonResponse<DashboardOperationalMetrics>(500, {
        success: false,
        error: {
          code: 'INTELLIGENCE-500',
          message: 'Gagal memuat ringkasan operasional intelligence',
        },
      })
    }
  }
}

export function createOverridePostHandler(deps: OverrideRouteDependencies) {
  return async function POST(request: Request): Promise<NextResponse> {
    const session = deps.getSession(request)
    const ip = deps.getIp(request)

    if (!session) {
      await deps.writeSecurityAuditLog({
        endpoint: '/api/dashboard/intelligence/override',
        action: 'INTELLIGENCE_OVERRIDE',
        result: 'unauthenticated',
        ip,
      })

      return buildJsonResponse<OverrideAuditResult>(401, {
        success: false,
        error: {
          code: 'AUTH-401',
          message: 'Unauthorized',
        },
      })
    }

    if (!canSubmitIntelligenceOverride(session.role)) {
      await deps.writeSecurityAuditLog({
        endpoint: '/api/dashboard/intelligence/override',
        action: 'INTELLIGENCE_OVERRIDE',
        result: 'forbidden',
        userId: session.username,
        role: session.role,
        ip,
      })

      return buildJsonResponse<OverrideAuditResult>(403, {
        success: false,
        error: {
          code: 'RBAC-403',
          message: 'Akses ditolak',
        },
      })
    }

    const rawBody = await request.json().catch(() => null)
    const parsed = OverridePayloadSchema.safeParse(rawBody)

    if (!parsed.success) {
      await deps.writeSecurityAuditLog({
        endpoint: '/api/dashboard/intelligence/override',
        action: 'INTELLIGENCE_OVERRIDE',
        result: 'failure',
        userId: session.username,
        role: session.role,
        ip,
        metadata: {
          error: 'validation_failed',
          issueCount: parsed.error.issues.length,
        },
      })

      return buildOverrideValidationResponse(
        parsed.error.issues.map(issue => ({
          field: issue.path.join('.'),
          message: issue.message,
          rule: issue.code,
        }))
      )
    }

    const businessValidationErrors: Array<{
      field: string
      message: string
      rule: string
    }> = []

    if (parsed.data.action === 'modify' && !parsed.data.finalIcd?.trim()) {
      businessValidationErrors.push({
        field: 'finalIcd',
        message: 'Final ICD-10 wajib diisi untuk aksi modify.',
        rule: 'required_for_modify',
      })
    }

    if (
      (parsed.data.action === 'modify' || parsed.data.action === 'reject') &&
      !parsed.data.overrideReason?.trim()
    ) {
      businessValidationErrors.push({
        field: 'overrideReason',
        message: 'Alasan override wajib diisi untuk aksi modify atau reject.',
        rule: 'required_for_override',
      })
    }

    if (businessValidationErrors.length > 0) {
      await deps.writeSecurityAuditLog({
        endpoint: '/api/dashboard/intelligence/override',
        action: 'INTELLIGENCE_OVERRIDE',
        result: 'failure',
        userId: session.username,
        role: session.role,
        ip,
        metadata: {
          error: 'business_validation_failed',
          issueCount: businessValidationErrors.length,
        },
      })

      return buildOverrideValidationResponse(businessValidationErrors)
    }

    try {
      const result = await deps.recordOverride({
        ...parsed.data,
        actorUserId: session.username,
        actorRole: session.role,
      })

      await deps.writeSecurityAuditLog({
        endpoint: '/api/dashboard/intelligence/override',
        action: 'INTELLIGENCE_OVERRIDE',
        result: 'success',
        userId: session.username,
        role: session.role,
        ip,
        metadata: {
          encounterId: parsed.data.encounterId,
          action: parsed.data.action,
          selectedIcd: parsed.data.selectedIcd,
          finalIcd: parsed.data.finalIcd,
        },
      })

      return buildJsonResponse<OverrideAuditResult>(200, {
        success: true,
        data: result,
      })
    } catch (error) {
      await deps.writeSecurityAuditLog({
        endpoint: '/api/dashboard/intelligence/override',
        action: 'INTELLIGENCE_OVERRIDE',
        result: 'failure',
        userId: session.username,
        role: session.role,
        ip,
        metadata: {
          error: error instanceof Error ? error.message : 'Unknown error',
          encounterId: parsed.data.encounterId,
        },
      })

      return buildJsonResponse<OverrideAuditResult>(500, {
        success: false,
        error: {
          code: 'INTELLIGENCE-500',
          message: 'Gagal merekam override intelligence',
        },
      })
    }
  }
}
