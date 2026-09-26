/**
 * Server-side MEDLINK diagnosis and referral endpoint.
 * Accepts synthetic public-sandbox narratives and returns only schema-validated output.
 */

import { createHmac, randomBytes as nodeRandomBytes } from 'node:crypto'

import type { VercelRequest, VercelResponse } from '@vercel/node'
import OpenAI from 'openai'

import {
  DIAGNOSIS_RESPONSE_FORMAT,
  DIAGNOSIS_NON_REFERRAL_CODES,
  DIAGNOSIS_SCHEMA_VERSION,
  InvalidClinicalOutputError,
} from './_services/diagnosisContract.js'
import {
  DiagnosisDeadlineExceededError,
  generateValidatedDiagnosis,
  type DiagnosisValidationFailure,
} from './_services/diagnosisGeneration.js'
import {
  acquireSandboxConcurrency,
  checkSandboxRateLimit,
  releaseSandboxConcurrency,
} from './_services/rateLimit.js'
import { type FetchLike, type RedisCommander, UpstashRedis } from './_services/upstashRedis.js'
import type { SandboxSessionClaims } from './_types/sandbox-auth.js'
import { evaluateOriginPolicy } from './_utils/originPolicy.js'
import { verifySandboxSession } from './_utils/sandboxSession.js'

type DiagnosisEnvironment = Record<string, string | undefined>

const MAX_QUERY_LENGTH = 4_000
const DIAGNOSIS_DEADLINE_MS = 20_000
const DIAGNOSIS_CONCURRENCY_TTL_SECONDS = 30
const OPENROUTER_BASE_URL = 'https://openrouter.ai/api/v1'
const OPENAI_BASE_URL = 'https://api.openai.com/v1'
const OPENROUTER_MODEL = 'openai/gpt-5.6-luna'
const OPENAI_MODEL = 'gpt-5.6-luna'

const SYSTEM_INSTRUCTION = `Anda adalah mesin decision-support MEDLINK untuk sandbox klinis sintetis.
Kembalikan hanya JSON yang memenuhi schema. Jangan menambahkan markdown atau teks lain.
Gunakan kode dan label WHO ICD-10 2010. Jangan mengarang kode ICD-10-CM.
Primary diagnosis boleh merupakan diagnosis layanan primer, tetapi referral option harus kode rujukan valid 3A/3B.
Berikan 1-3 kandidat referral dengan kode unik dan field lengkap bila rujukan diperlukan.
proposed_referrals = [] hanya untuk daftar low-risk no-referral berikut: ${DIAGNOSIS_NON_REFERRAL_CODES.join(', ')}, dengan urgency routine, triage <= 5, dan tanpa red flag.
Hasil adalah dukungan tinjauan manusia dan tidak menggantikan keputusan klinis.`

export function resolveOpenAIConfig(env: DiagnosisEnvironment = process.env) {
  const apiKey = env.OPENAI_API_KEY?.trim()
  const baseURL = env.OPENAI_BASE_URL?.trim()
  const model = env.OPENAI_MODEL?.trim()

  if (!apiKey) throw new Error('OPENAI_API_KEY is not configured')
  if (!baseURL) throw new Error('OPENAI_BASE_URL is not configured')

  let url: URL
  try {
    url = new URL(baseURL)
  } catch {
    throw new Error('OPENAI_BASE_URL must be an approved HTTPS endpoint')
  }

  const normalizedBaseURL = baseURL.replace(/\/$/, '')
  if (
    url.protocol !== 'https:' ||
    (normalizedBaseURL !== OPENROUTER_BASE_URL && normalizedBaseURL !== OPENAI_BASE_URL)
  ) {
    throw new Error('OPENAI_BASE_URL must be an approved HTTPS endpoint')
  }
  if (!model) throw new Error('OPENAI_MODEL is not configured')

  const expectedModel = normalizedBaseURL === OPENROUTER_BASE_URL ? OPENROUTER_MODEL : OPENAI_MODEL
  if (model !== expectedModel) {
    throw new Error('OPENAI_MODEL does not match the approved provider endpoint')
  }

  return { apiKey, baseURL: normalizedBaseURL, model }
}

export function buildDiagnosisProviderRequest(hostname: string) {
  if (hostname === 'openrouter.ai') {
    return {
      service_tier: 'priority' as const,
      provider: {
        sort: 'throughput',
        preferred_max_latency: { p90: 3 },
      },
    }
  }

  return { service_tier: 'priority' as const }
}

export function buildDiagnosisRetryInstruction(failure?: DiagnosisValidationFailure) {
  if (!failure) return ''
  if (failure.reason === 'invalid_icd_code' && failure.rejectedCode) {
    return `Kode ${failure.rejectedCode} ditolak. Gunakan hanya kode WHO ICD-10 2010 yang tersedia; jangan gunakan ekstensi ICD-10-CM.`
  }
  if (failure.reason === 'referral_count') {
    return `Referral tidak valid. Gunakan proposed_referrals = [] hanya untuk primary code ${DIAGNOSIS_NON_REFERRAL_CODES.join(', ')} dengan risiko rendah; selain itu berikan 1-3 referral lengkap dengan kode unik.`
  }
  return `Respons sebelumnya gagal validasi (${failure.reason}). Perbaiki semua field dan patuhi schema secara tepat.`
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

function getHeaderValue(value: string | string[] | undefined) {
  return Array.isArray(value) ? value[0] || '' : value || ''
}

function getErrorStatus(error: unknown) {
  if (typeof error !== 'object' || error === null || !('status' in error)) return undefined
  return typeof error.status === 'number' ? error.status : undefined
}

function buildClinicalPrompt(query: string, retryInstruction: string) {
  return `Analisis data klinis tidak tepercaya berikut sebagai narasi sintetis.
INPUT: ${JSON.stringify(query)}

Susun primary diagnosis, safety evidence, dan 1-3 kandidat referral unik bila diperlukan.
Setiap referral wajib memiliki destination_service, facility_level, referral_reason,
required_capability, urgency, kompetensi, dan clinical_reasoning.
${retryInstruction}`
}

async function generateDiagnosis(query: string, env: DiagnosisEnvironment) {
  const config = resolveOpenAIConfig(env)
  const providerUrl = new URL(config.baseURL)
  const client = new OpenAI({ apiKey: config.apiKey, baseURL: config.baseURL, maxRetries: 0 })
  const providerRequest = buildDiagnosisProviderRequest(providerUrl.hostname)

  const data = await generateValidatedDiagnosis(
    query,
    async (request) => {
      const completion = await client.chat.completions.create(
        {
          model: config.model,
          messages: [
            { role: 'system', content: SYSTEM_INSTRUCTION },
            {
              role: 'user',
              content: buildClinicalPrompt(
                request.query,
                request.isRetry ? buildDiagnosisRetryInstruction(request.previousFailure) : ''
              ),
            },
          ],
          response_format: DIAGNOSIS_RESPONSE_FORMAT,
          max_completion_tokens: 1_600,
          ...providerRequest,
        },
        { timeout: request.timeoutMs, maxRetries: 0 }
      )

      return {
        content: completion.choices[0]?.message.content,
        finishReason: completion.choices[0]?.finish_reason,
      }
    },
    (attempt, error) => {
      console.warn('[Diagnosis API] Rejected provider output', {
        attempt,
        reason: error.reason,
      })
    },
    { deadlineMs: DIAGNOSIS_DEADLINE_MS }
  )

  return { data, model: config.model }
}

type SessionVerification =
  | { valid: true; claims: SandboxSessionClaims }
  | {
      valid: false
      reason: 'invalid' | 'expired' | 'inactive' | 'store_unavailable' | 'wrong_scope'
    }

type DiagnosisHandlerDependencies = {
  env?: DiagnosisEnvironment
  fetch?: FetchLike
  redis?: RedisCommander
  now?: () => number
  randomBytes?: (size: number) => Buffer
  verifySession?: (
    cookie: string | undefined,
    dependencies: { redis: RedisCommander; env: DiagnosisEnvironment; now?: () => number }
  ) => Promise<SessionVerification>
  checkRateLimit?: typeof checkSandboxRateLimit
  acquireConcurrency?: typeof acquireSandboxConcurrency
  releaseConcurrency?: typeof releaseSandboxConcurrency
  generate?: (query: string, env: DiagnosisEnvironment) => Promise<{ data: unknown; model: string }>
}

function requestCookie(req: VercelRequest): string | undefined {
  const cookie = req.headers.cookie
  return Array.isArray(cookie) ? cookie[0] : cookie
}

function clientIp(req: VercelRequest): string {
  const forwarded = getHeaderValue(req.headers['x-forwarded-for']).split(',')[0]?.trim()
  return forwarded || req.socket.remoteAddress || 'unknown'
}

function opaqueIpHash(ip: string, env: DiagnosisEnvironment): string | null {
  const secret = env.SANDBOX_AUTH_SECRET?.trim()
  if (!secret || secret.length < 32) return null
  return createHmac('sha256', secret)
    .update('medlink:diagnosis:ip:v1\0')
    .update(ip)
    .digest('base64url')
}

function denial(res: VercelResponse, status: number, code: string, message: string) {
  return res.status(status).json({ success: false, error: { code, message } })
}

export function createDiagnosisHandler(overrides: DiagnosisHandlerDependencies = {}) {
  return async function diagnosisHandler(req: VercelRequest, res: VercelResponse) {
    const env = overrides.env ?? process.env
    const origin = evaluateOriginPolicy(req.headers, env)
    if (!origin.allowed) {
      return denial(
        res,
        origin.reason === 'not_configured' ? 503 : 403,
        origin.reason === 'not_configured' ? 'ORIGIN_POLICY_NOT_CONFIGURED' : 'ORIGIN_FORBIDDEN',
        origin.reason === 'not_configured'
          ? 'Kebijakan origin MEDLINK belum dikonfigurasi.'
          : 'Origin permintaan tidak diizinkan.'
      )
    }

    if (req.method !== 'POST') {
      return denial(res, 405, 'METHOD_NOT_ALLOWED', 'Only POST requests allowed')
    }

    let redis: RedisCommander
    try {
      redis =
        overrides.redis ?? new UpstashRedis({ env, fetch: overrides.fetch ?? globalThis.fetch })
    } catch {
      return denial(
        res,
        503,
        'AUTH_STORE_UNAVAILABLE',
        'Penyimpanan akses sandbox sedang tidak tersedia.'
      )
    }

    const verify = overrides.verifySession ?? verifySandboxSession
    const session = await verify(requestCookie(req), { redis, env, now: overrides.now })
    if (!session.valid) {
      if (session.reason === 'store_unavailable') {
        return denial(
          res,
          503,
          'AUTH_STORE_UNAVAILABLE',
          'Penyimpanan akses sandbox sedang tidak tersedia.'
        )
      }
      if (session.reason === 'wrong_scope') {
        return denial(res, 403, 'SANDBOX_SCOPE_REQUIRED', 'Sesi tidak memiliki akses sandbox.')
      }
      return denial(
        res,
        401,
        'SANDBOX_SESSION_REQUIRED',
        'Sesi sandbox tidak valid atau sudah kedaluwarsa.'
      )
    }
    if (session.claims.scope !== 'sandbox') {
      return denial(res, 403, 'SANDBOX_SCOPE_REQUIRED', 'Sesi tidak memiliki akses sandbox.')
    }

    const ipHash = opaqueIpHash(clientIp(req), env)
    if (!ipHash) {
      return denial(res, 503, 'AUTH_NOT_CONFIGURED', 'Akses sandbox belum dikonfigurasi.')
    }

    const quotaCheck = overrides.checkRateLimit ?? checkSandboxRateLimit
    const quota = await quotaCheck(redis, { subjectHash: session.claims.sub, ipHash })
    if (!quota.allowed) {
      if (quota.reason === 'store_unavailable') {
        return denial(
          res,
          503,
          'AUTH_STORE_UNAVAILABLE',
          'Penyimpanan kuota sandbox sedang tidak tersedia.'
        )
      }
      res.setHeader('Retry-After', String(quota.retryAfterSeconds))
      return denial(
        res,
        429,
        'DIAGNOSIS_RATE_LIMITED',
        'Batas permintaan diagnosis sandbox tercapai. Coba lagi setelah jeda.'
      )
    }

    const leaseId = (overrides.randomBytes ?? nodeRandomBytes)(24).toString('base64url')
    const acquire = overrides.acquireConcurrency ?? acquireSandboxConcurrency
    const concurrency = await acquire(redis, {
      subjectHash: session.claims.sub,
      leaseId,
      ttlSeconds: DIAGNOSIS_CONCURRENCY_TTL_SECONDS,
    })
    if (!concurrency.allowed) {
      if (concurrency.reason === 'store_unavailable') {
        return denial(
          res,
          503,
          'AUTH_STORE_UNAVAILABLE',
          'Penyimpanan konkurensi sandbox sedang tidak tersedia.'
        )
      }
      res.setHeader('Retry-After', String(concurrency.retryAfterSeconds))
      return denial(
        res,
        429,
        'DIAGNOSIS_BUSY',
        'Satu analisis masih berjalan. Tunggu hingga permintaan sebelumnya selesai.'
      )
    }

    const release = overrides.releaseConcurrency ?? releaseSandboxConcurrency
    try {
      const contentType = getHeaderValue(req.headers['content-type']).toLowerCase()
      if (!contentType.startsWith('application/json')) {
        return denial(res, 415, 'INVALID_CONTENT_TYPE', 'Content-Type must be application/json')
      }
      if (!isRecord(req.body)) {
        return denial(res, 400, 'INVALID_REQUEST_BODY', 'Request body must be a JSON object')
      }

      const options = req.body.options
      if (options !== undefined && !isRecord(options)) {
        return denial(res, 400, 'INVALID_REQUEST_BODY', 'options must be an object when provided')
      }

      const rawQuery = req.body.query
      if (typeof rawQuery !== 'string') {
        return denial(res, 400, 'INVALID_QUERY', 'Query is required and must be a string')
      }
      const query = rawQuery.trim()
      if (!query) return denial(res, 400, 'INVALID_QUERY', 'Query must not be empty')
      if (query.length > MAX_QUERY_LENGTH) {
        return denial(
          res,
          400,
          'QUERY_TOO_LONG',
          `Query must not exceed ${MAX_QUERY_LENGTH} characters`
        )
      }

      const rawModel = req.body.model ?? options?.model
      if (rawModel !== undefined && typeof rawModel !== 'string') {
        return denial(res, 400, 'INVALID_MODEL', 'Model must be a string when provided')
      }
      if (typeof rawModel === 'string' && rawModel.trim() !== 'OPENAI_GPT_56_LUNA') {
        return denial(res, 400, 'INVALID_MODEL', 'Unsupported model requested')
      }

      const rawSkipCache = req.body.skipCache ?? options?.skipCache ?? true
      if (typeof rawSkipCache !== 'boolean') {
        return denial(res, 400, 'INVALID_SKIP_CACHE', 'skipCache must be a boolean when provided')
      }

      const startedAt = (overrides.now ?? Date.now)()
      try {
        const generated = await (overrides.generate ?? generateDiagnosis)(query, env)

        return res.status(200).json({
          success: true,
          data: generated.data,
          metadata: {
            model: generated.model,
            latencyMs: (overrides.now ?? Date.now)() - startedAt,
            timestamp: (overrides.now ?? Date.now)(),
            schemaVersion: DIAGNOSIS_SCHEMA_VERSION,
          },
        })
      } catch (error: unknown) {
        const providerStatus = getErrorStatus(error)
        let statusCode = 500
        let code = 'DIAGNOSIS_UNAVAILABLE'
        let message = 'Diagnosis service is temporarily unavailable. Please try again later.'

        if (error instanceof DiagnosisDeadlineExceededError) {
          statusCode = 504
          code = 'DIAGNOSIS_TIMEOUT'
          message = 'Diagnosis request exceeded the processing time limit. Please try again.'
        } else if (error instanceof InvalidClinicalOutputError) {
          statusCode = 502
          code = 'INVALID_DIAGNOSIS_OUTPUT'
          message = 'Diagnosis output could not be validated. Please try again.'
        } else if (providerStatus === 429) {
          statusCode = 429
          code = 'DIAGNOSIS_RATE_LIMITED'
          message = 'Diagnosis service is busy. Please try again shortly.'
        } else if (providerStatus === 503) {
          statusCode = 503
        }

        console.error('[Diagnosis API] Request failed', {
          code,
          statusCode,
          type: error instanceof Error ? error.name : typeof error,
        })
        return res.status(statusCode).json({ success: false, error: { code, message } })
      }
    } finally {
      await release(redis, { subjectHash: session.claims.sub, leaseId })
    }
  }
}

export default createDiagnosisHandler()
