import assert from 'node:assert/strict'
import fs from 'node:fs'
import path from 'node:path'
import { test } from 'node:test'
import { fileURLToPath } from 'node:url'

import type { VercelRequest, VercelResponse } from '@vercel/node'

import type { RedisCommander } from './_services/upstashRedis.js'
import type { SandboxSessionClaims } from './_types/sandbox-auth.js'
import { createDiagnosisHandler } from './diagnosis.js'

const currentDir = path.dirname(fileURLToPath(import.meta.url))

const claims: SandboxSessionClaims = {
  version: 'v1',
  sub: Buffer.alloc(32, 3).toString('base64url'),
  scope: 'sandbox',
  iat: 1,
  exp: 99_999_999_999,
  aud: 'medlink',
  jti: Buffer.alloc(24, 4).toString('base64url'),
}
const env = {
  APP_URL: 'https://medlink.example.com',
  SANDBOX_AUTH_SECRET: 'synthetic-secret-value-with-more-than-thirty-two-characters',
}
const redis: RedisCommander = {
  async command<T>() {
    return null as T
  },
}

function responseCapture() {
  const capture = {
    statusCode: 200,
    body: undefined as unknown,
    headers: {} as Record<string, string>,
  }
  const response = {
    setHeader(name: string, value: string) {
      capture.headers[name] = value
      return response
    },
    status(statusCode: number) {
      capture.statusCode = statusCode
      return response
    },
    json(body: unknown) {
      capture.body = body
      return response
    },
    end() {
      return response
    },
  }
  return { capture, response: response as unknown as VercelResponse }
}

async function invoke(
  overrides: Parameters<typeof createDiagnosisHandler>[0],
  request: Partial<VercelRequest> = {}
) {
  let providerCalls = 0
  const handler = createDiagnosisHandler({
    env,
    redis,
    verifySession: async () => ({ valid: true, claims }),
    checkRateLimit: async () => ({ allowed: true, remaining: 9, retryAfterSeconds: 0 }),
    acquireConcurrency: async () => ({ allowed: true, retryAfterSeconds: 0 }),
    releaseConcurrency: async () => true,
    generate: async () => {
      providerCalls += 1
      throw new Error('synthetic provider call')
    },
    ...overrides,
  })
  const { capture, response } = responseCapture()
  await handler(
    {
      method: 'POST',
      headers: {
        origin: 'https://medlink.example.com',
        host: 'medlink.example.com',
        cookie: 'medlink_session=synthetic',
        'content-type': 'application/json',
      },
      socket: { remoteAddress: '203.0.113.10' },
      body: { query: 'narasi sintetis' },
      ...request,
    } as VercelRequest,
    response
  )
  return { ...capture, providerCalls }
}

test('rejects an unknown origin before session or provider access', async () => {
  let sessionCalls = 0
  const result = await invoke(
    {
      verifySession: async () => {
        sessionCalls += 1
        return { valid: true, claims }
      },
    },
    { headers: { origin: 'https://attacker.example.com', host: 'medlink.example.com' } }
  )
  assert.equal(result.statusCode, 403)
  assert.equal(sessionCalls, 0)
  assert.equal(result.providerCalls, 0)
})

test('rejects missing, tampered, and expired sessions with 401 before provider access', async () => {
  for (const reason of ['invalid', 'expired', 'inactive'] as const) {
    const result = await invoke({ verifySession: async () => ({ valid: false, reason }) })
    assert.equal(result.statusCode, 401)
    assert.equal(result.providerCalls, 0)
  }
})

test('rejects a valid non-sandbox scope with 403 before quota or provider access', async () => {
  let quotaCalls = 0
  const result = await invoke({
    verifySession: async () => ({
      valid: true,
      claims: { ...claims, scope: 'admin' as 'sandbox' },
    }),
    checkRateLimit: async () => {
      quotaCalls += 1
      return { allowed: true, remaining: 9, retryAfterSeconds: 0 }
    },
  })
  assert.equal(result.statusCode, 403)
  assert.equal(quotaCalls, 0)
  assert.equal(result.providerCalls, 0)
})

test('returns 429 with Retry-After when subject or IP quota is exhausted', async () => {
  const result = await invoke({
    checkRateLimit: async () => ({
      allowed: false,
      reason: 'subject',
      remaining: 0,
      retryAfterSeconds: 321,
    }),
  })
  assert.equal(result.statusCode, 429)
  assert.equal(result.headers['Retry-After'], '321')
  assert.equal(result.providerCalls, 0)
})

test('returns 429 when the subject already has one in-flight request', async () => {
  const result = await invoke({
    acquireConcurrency: async () => ({ allowed: false, retryAfterSeconds: 17 }),
  })
  assert.equal(result.statusCode, 429)
  assert.equal(result.headers['Retry-After'], '17')
  assert.equal(result.providerCalls, 0)
})

test('fails closed with 503 for Redis failure before provider access', async () => {
  for (const overrides of [
    {
      verifySession: async () => ({ valid: false as const, reason: 'store_unavailable' as const }),
    },
    {
      checkRateLimit: async () => ({
        allowed: false,
        reason: 'store_unavailable' as const,
        remaining: 0,
        retryAfterSeconds: 900,
      }),
    },
  ]) {
    const result = await invoke(overrides)
    assert.equal(result.statusCode, 503)
    assert.equal(result.providerCalls, 0)
  }
})

test('runs request validation after quota acquisition and releases concurrency in finally', async () => {
  const events: string[] = []
  const result = await invoke(
    {
      checkRateLimit: async () => {
        events.push('quota')
        return { allowed: true, remaining: 9, retryAfterSeconds: 0 }
      },
      acquireConcurrency: async () => {
        events.push('acquire')
        return { allowed: true, retryAfterSeconds: 0 }
      },
      releaseConcurrency: async () => {
        events.push('release')
        return true
      },
    },
    { body: { query: '   ' } }
  )
  assert.equal(result.statusCode, 400)
  assert.deepEqual(events, ['quota', 'acquire', 'release'])
  assert.equal(result.providerCalls, 0)
})

test('browser clients use credentialed same-origin requests without browser identity access control', () => {
  const appSource = fs.readFileSync(path.join(currentDir, '..', 'App.tsx'), 'utf8')
  const authClientSource = fs.readFileSync(
    path.join(currentDir, '..', 'services', 'authService.ts'),
    'utf8'
  )
  const diagnosisClientSource = fs.readFileSync(
    path.join(currentDir, '..', 'services', 'diagnosisApiClient.ts'),
    'utf8'
  )
  const viteEnvSource = fs.readFileSync(path.join(currentDir, '..', 'vite-env.d.ts'), 'utf8')

  assert.doesNotMatch(appSource, /medlink_sandbox_session|DEV_PREVIEW_SESSION/)
  assert.match(authClientSource, /credentials:\s*['"]include['"]/)
  assert.match(authClientSource, /\/api\/auth\/sandbox-session/)
  assert.match(diagnosisClientSource, /credentials:\s*['"]include['"]/)
  assert.doesNotMatch(diagnosisClientSource, /VITE_API_BASE_PATH/)
  assert.doesNotMatch(viteEnvSource, /VITE_API_BASE_(URL|PATH)/)
  assert.match(diagnosisClientSource, /['"]\/api\/diagnosis['"]/)
  assert.doesNotMatch(diagnosisClientSource, /\[Detail\].*message|\$\{message\}/)
})
