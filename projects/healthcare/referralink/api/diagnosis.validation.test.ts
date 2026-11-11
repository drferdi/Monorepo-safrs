import assert from 'node:assert/strict'

import type { VercelRequest, VercelResponse } from '@vercel/node'

import { createDiagnosisHandler } from './diagnosis.js'

const subject = Buffer.alloc(32, 3).toString('base64url')

type ResponseCapture = {
  statusCode: number
  body: unknown
  headers: Record<string, string>
}

async function invoke(body: unknown, headers: Record<string, string> = {}) {
  const capture: ResponseCapture = { statusCode: 200, body: undefined, headers: {} }
  const response = {
    setHeader(name: string, value: string) {
      capture.headers[name] = value
    },
    status(statusCode: number) {
      capture.statusCode = statusCode
      return response
    },
    json(payload: unknown) {
      capture.body = payload
      return response
    },
    end() {
      return response
    },
  }

  const handler = createDiagnosisHandler({
    env: {
      ...process.env,
      APP_URL: 'https://medlink.example.com',
      SANDBOX_AUTH_SECRET: 'synthetic-secret-value-with-more-than-thirty-two-characters',
    },
    redis: {
      async command<T>() {
        return null as T
      },
    },
    verifySession: async () => ({
      valid: true,
      claims: {
        version: 'v1',
        sub: subject,
        scope: 'sandbox',
        iat: 1,
        exp: 99_999_999_999,
        aud: 'medlink',
        jti: Buffer.alloc(24, 4).toString('base64url'),
      },
    }),
    checkRateLimit: async () => ({ allowed: true, remaining: 9, retryAfterSeconds: 0 }),
    acquireConcurrency: async () => ({ allowed: true, retryAfterSeconds: 0 }),
    releaseConcurrency: async () => true,
  })

  await handler(
    {
      method: 'POST',
      headers: {
        origin: 'https://medlink.example.com',
        host: 'medlink.example.com',
        cookie: 'medlink_session=synthetic',
        ...headers,
      },
      socket: { remoteAddress: '203.0.113.10' },
      body,
    } as VercelRequest,
    response as unknown as VercelResponse
  )

  return capture
}

const originalGeminiKey = process.env.GEMINI_API_KEY
const originalOpenAiKey = process.env.OPENAI_API_KEY
const originalUpstashUrl = process.env.UPSTASH_VECTOR_REST_URL
const originalUpstashToken = process.env.UPSTASH_VECTOR_REST_TOKEN
process.env.GEMINI_API_KEY = ''
delete process.env.OPENAI_API_KEY
delete process.env.UPSTASH_VECTOR_REST_URL
delete process.env.UPSTASH_VECTOR_REST_TOKEN

const missingContentType = await invoke({ query: 'nyeri dada' })
assert.equal(missingContentType.statusCode, 415)
assert.deepEqual(missingContentType.body, {
  success: false,
  error: { code: 'INVALID_CONTENT_TYPE', message: 'Content-Type must be application/json' },
})

const whitespaceQuery = await invoke({ query: '   ' }, { 'content-type': 'application/json' })
assert.equal(whitespaceQuery.statusCode, 400)
assert.deepEqual(whitespaceQuery.body, {
  success: false,
  error: { code: 'INVALID_QUERY', message: 'Query must not be empty' },
})

const invalidSkipCache = await invoke(
  { query: 'nyeri dada', skipCache: 'false' },
  { 'content-type': 'application/json' }
)
assert.equal(invalidSkipCache.statusCode, 400)
assert.deepEqual(invalidSkipCache.body, {
  success: false,
  error: { code: 'INVALID_SKIP_CACHE', message: 'skipCache must be a boolean when provided' },
})

const unavailableService = await invoke(
  { query: 'nyeri dada' },
  { 'content-type': 'application/json' }
)
assert.equal(unavailableService.statusCode, 500)
assert.deepEqual(unavailableService.body, {
  success: false,
  error: {
    code: 'DIAGNOSIS_UNAVAILABLE',
    message: 'Diagnosis service is temporarily unavailable. Please try again later.',
  },
})

if (originalGeminiKey === undefined) delete process.env.GEMINI_API_KEY
else process.env.GEMINI_API_KEY = originalGeminiKey
if (originalOpenAiKey === undefined) delete process.env.OPENAI_API_KEY
else process.env.OPENAI_API_KEY = originalOpenAiKey
if (originalUpstashUrl === undefined) delete process.env.UPSTASH_VECTOR_REST_URL
else process.env.UPSTASH_VECTOR_REST_URL = originalUpstashUrl
if (originalUpstashToken === undefined) delete process.env.UPSTASH_VECTOR_REST_TOKEN
else process.env.UPSTASH_VECTOR_REST_TOKEN = originalUpstashToken

console.log('diagnosis request validation tests passed')
