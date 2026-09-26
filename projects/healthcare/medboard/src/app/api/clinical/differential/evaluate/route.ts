import { NextResponse, type NextRequest } from 'next/server'

import type { CDSSEngineInput } from '@/lib/cdss/types'

export const runtime = 'nodejs'

const CORS_METHODS = ['POST', 'OPTIONS'] as const
type MaybePromise<T> = T | Promise<T>
const DEFAULT_ALLOWED_ORIGINS = [
  'https://puskesmasbalowerti.com',
  'https://www.puskesmasbalowerti.com',
  'https://crew.puskesmasbalowerti.com',
  'https://primary-healthcare-production.up.railway.app',
]
const DEFAULT_ALLOWED_HEADERS = [
  'Content-Type',
  'Authorization',
  'X-Crew-Access-Token',
  'X-Correlation-Id',
]
const DEV_ALLOWED_ORIGIN_PATTERNS = [
  /^http:\/\/localhost:\d+$/i,
  /^http:\/\/192\.168\.\d+\.\d+:\d+$/i,
]

type CanonicalDifferentialSession = {
  username: string
  role: string
  profession?: string | null
}

type CanonicalDifferentialRequest = {
  request_id?: string
  patient?: {
    age?: number
    gender?: 'L' | 'P'
  }
  narrative?: {
    keluhan_utama?: string
    keluhan_tambahan?: string
  }
  vitals?: {
    sbp?: number
    dbp?: number
    hr?: number
    rr?: number
    temp?: number
    spo2?: number
    glucose?: number
  }
  context?: {
    allergies?: string[]
    chronic_diseases?: string[]
    is_pregnant?: boolean
  }
  canonical_clinical?: {
    trajectory_context?: CDSSEngineInput['trajectory_context']
    deterioration_summary_text?: string
  }
}

type SecurityAuditInput = {
  endpoint: string
  action: string
  result: 'success' | 'unauthenticated' | 'forbidden' | 'failure'
  userId?: string | null
  role?: string | null
  ip?: string | null
  metadata?: Record<string, unknown>
}

type CDSSAuditEntryInput = {
  sessionId?: string
  action: string
  validationStatus: string
  outputSummary?: Record<string, unknown>
  modelVersion?: string
  latencyMs?: number
  metadata?: Record<string, unknown>
}

type CanonicalDifferentialSuggestion = {
  rank: number
  icd10_code: string
  diagnosis_name: string
  confidence: number
  reasoning: string
  red_flags: string[]
  recommended_actions: string[]
}

type CanonicalDifferentialRedFlag = {
  severity: 'emergency' | 'urgent' | 'warning'
  condition: string
  action: string
  criteria_met: string[]
  icd_codes?: string[]
}

type CanonicalDifferentialResult = {
  suggestions: CanonicalDifferentialSuggestion[]
  red_flags: CanonicalDifferentialRedFlag[]
  processing_time_ms: number
  source: 'ai' | 'local' | 'error'
  model_version: string
  validation_summary: {
    total_raw: number
    total_validated: number
    recommended_count: number
    review_count: number
    must_not_miss_count: number
    deferred_count: number
    requires_more_data: boolean
    unverified_codes: string[]
    warnings: string[]
  }
  next_best_questions: string[]
  _reasoning_content?: string
}

type CanonicalDifferentialHandlerDependencies = {
  getIp: (request: Request) => MaybePromise<string | null>
  getSession: (request: Request) => MaybePromise<CanonicalDifferentialSession | null>
  getAuthorizationMode: (
    request: Request
  ) => MaybePromise<'session' | 'automation-token' | 'none'>
  isClinicalRole: (role: string | null | undefined) => MaybePromise<boolean>
  runDiagnosis: (input: CDSSEngineInput) => Promise<CanonicalDifferentialResult>
  writeClinicalAudit: (input: CDSSAuditEntryInput) => Promise<void>
  writeSecurityAudit: (input: SecurityAuditInput) => Promise<void>
}

function parseEnvList(name: string): string[] {
  return (process.env[name] ?? '')
    .split(',')
    .map((value) => value.trim())
    .filter(Boolean)
}

function getAllowedOrigins(): Set<string> {
  return new Set([...DEFAULT_ALLOWED_ORIGINS, ...parseEnvList('CORS_ALLOWED_ORIGINS')])
}

function getAllowedExtensionOrigins(): Set<string> {
  return new Set(
    parseEnvList('CORS_ALLOWED_EXTENSION_IDS').map(
      (extensionId) => `chrome-extension://${extensionId}`
    )
  )
}

function isAllowedOrigin(origin: string): boolean {
  if (getAllowedOrigins().has(origin)) return true
  if (getAllowedExtensionOrigins().has(origin)) return true

  if (process.env.NODE_ENV !== 'production') {
    return DEV_ALLOWED_ORIGIN_PATTERNS.some((pattern) => pattern.test(origin))
  }

  return false
}

function getOrigin(request: Request): string | null {
  const origin = request.headers.get('origin')?.trim()
  if (!origin) return null
  return isAllowedOrigin(origin) ? origin : null
}

function buildAllowedHeaders(request: Request): string {
  const allowed = new Set([...DEFAULT_ALLOWED_HEADERS, ...parseEnvList('CORS_ALLOWED_HEADERS')])
  const allowedLookup = new Set(Array.from(allowed).map((header) => header.toLowerCase()))
  const requestedHeaders = request.headers.get('access-control-request-headers')
  const invalidRequested: string[] = []

  if (requestedHeaders) {
    for (const header of requestedHeaders.split(',')) {
      const normalized = header.trim()
      if (!normalized) continue
      if (allowedLookup.has(normalized.toLowerCase())) {
        allowed.add(normalized)
      } else {
        invalidRequested.push(normalized)
      }
    }
  }

  return invalidRequested.length > 0 ? '' : Array.from(allowed).join(', ')
}

function buildCorsHeaderMap(
  request: Request,
  methods: readonly string[]
): Record<string, string> | null {
  const origin = getOrigin(request)
  if (!origin) return null

  const allowedHeaders = buildAllowedHeaders(request)
  if (!allowedHeaders) return null

  return {
    'Access-Control-Allow-Origin': origin,
    'Access-Control-Allow-Credentials': 'true',
    'Access-Control-Allow-Methods': methods.join(', '),
    'Access-Control-Allow-Headers': allowedHeaders,
    'Access-Control-Max-Age': '86400',
    Vary: 'Origin, Access-Control-Request-Headers',
  }
}

function withCanonicalCors(
  request: Request,
  response: NextResponse,
  methods: readonly string[]
): NextResponse {
  const headers = buildCorsHeaderMap(request, methods)
  if (!headers) return response

  for (const [key, value] of Object.entries(headers)) {
    response.headers.set(key, value)
  }

  return response
}

function jsonWithCanonicalCors(
  request: Request,
  methods: readonly string[],
  body: unknown,
  init?: ResponseInit
): NextResponse {
  return withCanonicalCors(request, NextResponse.json(body, init), methods)
}

function handleCanonicalCorsPreflight(request: Request, methods: readonly string[]): NextResponse {
  const headers = buildCorsHeaderMap(request, methods)
  if (!headers) {
    return new NextResponse(null, {
      status: 403,
      headers: { Vary: 'Origin' },
    })
  }

  return new NextResponse(null, {
    status: 204,
    headers,
  })
}

export function createCanonicalDifferentialPostHandler(
  deps: CanonicalDifferentialHandlerDependencies
) {
  return async function POST(request: Request) {
    const [ip, session, authorizationMode] = await Promise.all([
      deps.getIp(request),
      deps.getSession(request),
      deps.getAuthorizationMode(request),
    ])

    if (!session) {
      await deps.writeSecurityAudit({
        endpoint: '/api/clinical/differential/evaluate',
        action: 'CLINICAL_DIFFERENTIAL_EVALUATE',
        result: 'unauthenticated',
        userId: null,
        role: null,
        ip,
        metadata: {
          authorizationMode,
        },
      })
      return jsonWithCanonicalCors(
        request,
        CORS_METHODS,
        { ok: false, error: 'Unauthorized' },
        { status: 401 }
      )
    }

    const [roleIsClinical, professionIsClinical] = await Promise.all([
      deps.isClinicalRole(session.role),
      deps.isClinicalRole(session.profession),
    ])

    if (!roleIsClinical && !professionIsClinical) {
      await deps.writeSecurityAudit({
        endpoint: '/api/clinical/differential/evaluate',
        action: 'CLINICAL_DIFFERENTIAL_EVALUATE',
        result: 'forbidden',
        userId: session.username,
        role: session.role,
        ip,
        metadata: {
          authorizationMode,
        },
      })
      return jsonWithCanonicalCors(
        request,
        CORS_METHODS,
        { ok: false, error: 'Akses ditolak' },
        { status: 403 }
      )
    }

    let body: CanonicalDifferentialRequest
    try {
      body = (await request.json()) as CanonicalDifferentialRequest
    } catch {
      return jsonWithCanonicalCors(
        request,
        CORS_METHODS,
        { ok: false, error: 'Invalid JSON body' },
        { status: 400 }
      )
    }

    if (!body.patient?.age || !body.patient?.gender || !body.narrative?.keluhan_utama?.trim()) {
      return jsonWithCanonicalCors(
        request,
        CORS_METHODS,
        { ok: false, error: 'Field wajib patient.age, patient.gender, dan narrative.keluhan_utama harus terisi' },
        { status: 400 }
      )
    }

    const input: CDSSEngineInput = {
      keluhan_utama: body.narrative.keluhan_utama.trim(),
      keluhan_tambahan: body.narrative.keluhan_tambahan?.trim() || undefined,
      usia: body.patient.age,
      jenis_kelamin: body.patient.gender,
      vital_signs: {
        systolic: body.vitals?.sbp,
        diastolic: body.vitals?.dbp,
        heart_rate: body.vitals?.hr,
        respiratory_rate: body.vitals?.rr,
        temperature: body.vitals?.temp,
        spo2: body.vitals?.spo2,
        glucose: body.vitals?.glucose,
      },
      allergies: Array.isArray(body.context?.allergies) ? body.context?.allergies : undefined,
      chronic_diseases: Array.isArray(body.context?.chronic_diseases) ? body.context?.chronic_diseases : undefined,
      is_pregnant: typeof body.context?.is_pregnant === 'boolean' ? body.context.is_pregnant : undefined,
      session_id: body.request_id?.trim() || `assist-diff-${Date.now()}`,
      trajectory_context: body.canonical_clinical?.trajectory_context,
      deterioration_summary_text: body.canonical_clinical?.deterioration_summary_text,
    }

    try {
      const result = await deps.runDiagnosis(input)
      await deps.writeClinicalAudit({
        sessionId: input.session_id,
        action: 'DIAGNOSE_RESULT',
        validationStatus: result.validation_summary.requires_more_data
          ? 'needs_more_data'
          : 'completed',
        modelVersion: result.model_version,
        latencyMs: result.processing_time_ms,
        outputSummary: {
          totalDisplayed: result.suggestions.length,
          redFlagCount: result.red_flags.length,
          unverifiedCount: result.validation_summary.unverified_codes.length,
          recommendedCount: result.validation_summary.recommended_count,
          reviewCount: result.validation_summary.review_count,
          mustNotMissCount: result.validation_summary.must_not_miss_count,
          deferredCount: result.validation_summary.deferred_count,
        },
        metadata: {
          endpoint: '/api/clinical/differential/evaluate',
          source: result.source,
          nextBestQuestionCount: result.next_best_questions.length,
          hasReasoningContent: !!result._reasoning_content,
          reasoningContentLength: result._reasoning_content?.length ?? 0,
        },
      })
      await deps.writeSecurityAudit({
        endpoint: '/api/clinical/differential/evaluate',
        action: 'CLINICAL_DIFFERENTIAL_EVALUATE',
        result: 'success',
        userId: session.username,
        role: session.role,
        ip,
        metadata: {
          authorizationMode,
          source: result.source,
          modelVersion: result.model_version,
          totalRawSuggestions: result.validation_summary.total_raw,
          totalValidatedSuggestions: result.validation_summary.total_validated,
          unverifiedCodes: result.validation_summary.unverified_codes,
        },
      })
      return jsonWithCanonicalCors(
        request,
        CORS_METHODS,
        {
          ok: true,
          data: {
            diagnosis_suggestions: result.suggestions.map((suggestion) => ({
              rank: suggestion.rank,
              icd_x: suggestion.icd10_code,
              nama: suggestion.diagnosis_name,
              diagnosis_name: suggestion.diagnosis_name,
              icd10_code: suggestion.icd10_code,
              confidence: suggestion.confidence,
              rationale: suggestion.reasoning,
              reasoning: suggestion.reasoning,
              red_flags: suggestion.red_flags,
              recommended_actions: suggestion.recommended_actions,
            })),
            alerts: result.red_flags,
            validation_summary: {
              total_raw: result.validation_summary.total_raw,
              total_validated: result.validation_summary.total_validated,
              unverified_codes: result.validation_summary.unverified_codes,
              warnings: result.validation_summary.warnings,
            },
            meta: {
              processing_time_ms: result.processing_time_ms,
              source: 'dashboard-canonical-differential',
              model_version: result.model_version,
            },
          },
        },
        { status: 200 }
      )
    } catch (error) {
      await deps.writeSecurityAudit({
        endpoint: '/api/clinical/differential/evaluate',
        action: 'CLINICAL_DIFFERENTIAL_EVALUATE',
        result: 'failure',
        userId: session.username,
        role: session.role,
        ip,
        metadata: {
          authorizationMode,
          error: error instanceof Error ? error.message : String(error),
        },
      })
      return jsonWithCanonicalCors(
        request,
        CORS_METHODS,
        { ok: false, error: 'Gagal mengevaluasi canonical differential' },
        { status: 500 }
      )
    }
  }
}

export async function OPTIONS(request: NextRequest) {
  return handleCanonicalCorsPreflight(request, CORS_METHODS)
}

export const POST = createCanonicalDifferentialPostHandler({
  getIp: async request => {
    const { getRequestIp } = await import('@/lib/server/security-audit')
    return getRequestIp(request)
  },
  getSession: async request => {
    const { getCrewSessionFromRequest } = await import('@/lib/server/crew-access-auth')
    return getCrewSessionFromRequest(request)
  },
  getAuthorizationMode: async request => {
    const { getCrewAuthorizationMode } = await import('@/lib/server/crew-access-auth')
    return getCrewAuthorizationMode(request)
  },
  isClinicalRole: async role => {
    const { isClinicalCrewRole } = await import('@/lib/server/crew-access-auth')
    return isClinicalCrewRole(role)
  },
  runDiagnosis: async input => {
    const { runDiagnosisEngine } = await import('@/lib/cdss/engine')
    return runDiagnosisEngine(input)
  },
  writeClinicalAudit: async input => {
    const { writeCDSSAuditEntry } = await import('@/lib/cdss/workflow')
    await writeCDSSAuditEntry(input)
  },
  writeSecurityAudit: async input => {
    const { writeSecurityAuditLog } = await import('@/lib/server/security-audit')
    await writeSecurityAuditLog(input)
  },
})
