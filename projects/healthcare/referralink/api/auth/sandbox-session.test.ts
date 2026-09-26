import assert from 'node:assert/strict'
import { test } from 'node:test'

import type { VercelRequest, VercelResponse } from '@vercel/node'

import type { RedisCommander } from '../_services/upstashRedis.js'
import { createSandboxSession } from '../_utils/sandboxSession.js'

import { createSandboxRegisterHandler } from './sandbox-register.js'
import { createSandboxSessionHandler } from './sandbox-session.js'
import { createSandboxVerifyHandler } from './sandbox-verify.js'

const fixedNow = Date.parse('2026-07-22T12:00:00.000Z')
const env = {
  APP_URL: 'https://medlink.example.com',
  SANDBOX_AUTH_SECRET: 'synthetic-secret-value-with-more-than-thirty-two-characters',
}

class SyntheticRedis implements RedisCommander {
  readonly commands: Array<ReadonlyArray<string | number>> = []

  constructor(readonly responses: Array<unknown | Error>) {}

  async command<T>(command: ReadonlyArray<string | number>): Promise<T> {
    this.commands.push(command)
    const response = this.responses.shift()
    if (response instanceof Error) throw response
    return response as T
  }
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
  handler: ReturnType<typeof createSandboxSessionHandler>,
  method: 'GET' | 'DELETE',
  cookie?: string
) {
  const { capture, response } = responseCapture()
  await handler(
    {
      method,
      headers: {
        origin: 'https://medlink.example.com',
        host: 'medlink.example.com',
        ...(cookie ? { cookie } : {}),
      },
    } as VercelRequest,
    response
  )
  return capture
}

test('GET returns only the public authenticated session projection', async () => {
  const redis = new SyntheticRedis(['OK'])
  const created = await createSandboxSession(
    { email: 'doctor@example.com' },
    { redis, env, now: () => fixedNow, randomBytes: (size) => Buffer.alloc(size, 7) }
  )
  redis.responses.push(created.claims.sub)

  const result = await invoke(
    createSandboxSessionHandler({ redis, env, now: () => fixedNow }),
    'GET',
    `medlink_session=${created.token}`
  )

  assert.equal(result.statusCode, 200)
  assert.equal(result.headers['Cache-Control'], 'no-store')
  assert.deepEqual(result.body, {
    authenticated: true,
    accessMode: 'sandbox',
    expiresAt: '2026-07-22T20:00:00.000Z',
  })
  assert.deepEqual(Object.keys(result.body as object).sort(), [
    'accessMode',
    'authenticated',
    'expiresAt',
  ])
})

test('GET rejects missing, tampered, and expired sessions with 401', async () => {
  const setupRedis = new SyntheticRedis(['OK'])
  const created = await createSandboxSession(
    { email: 'doctor@example.com' },
    { redis: setupRedis, env, now: () => fixedNow, randomBytes: (size) => Buffer.alloc(size, 9) }
  )

  for (const [cookie, now] of [
    [undefined, fixedNow],
    [`medlink_session=${created.token}x`, fixedNow],
    [`medlink_session=${created.token}`, fixedNow + 8 * 60 * 60 * 1000],
  ] as const) {
    const result = await invoke(
      createSandboxSessionHandler({ redis: new SyntheticRedis([]), env, now: () => now }),
      'GET',
      cookie
    )
    assert.equal(result.statusCode, 401)
    assert.deepEqual(result.body, {
      authenticated: false,
      accessMode: null,
      expiresAt: null,
    })
  }
})

test('GET fails closed with 503 when Redis session lookup fails', async () => {
  const setupRedis = new SyntheticRedis(['OK'])
  const created = await createSandboxSession(
    { email: 'doctor@example.com' },
    { redis: setupRedis, env, now: () => fixedNow, randomBytes: (size) => Buffer.alloc(size, 11) }
  )
  const result = await invoke(
    createSandboxSessionHandler({
      redis: new SyntheticRedis([new Error('synthetic outage')]),
      env,
      now: () => fixedNow,
    }),
    'GET',
    `medlink_session=${created.token}`
  )
  assert.equal(result.statusCode, 503)
})

test('DELETE revokes the active jti and clears the hardened cookie', async () => {
  const redis = new SyntheticRedis(['OK'])
  const created = await createSandboxSession(
    { email: 'doctor@example.com' },
    { redis, env, now: () => fixedNow, randomBytes: (size) => Buffer.alloc(size, 13) }
  )
  redis.responses.push(created.claims.sub, 1)

  const result = await invoke(
    createSandboxSessionHandler({ redis, env, now: () => fixedNow }),
    'DELETE',
    `medlink_session=${created.token}`
  )

  assert.equal(result.statusCode, 200)
  assert.deepEqual(result.body, { authenticated: false, accessMode: null, expiresAt: null })
  assert.equal(
    result.headers['Set-Cookie'],
    'medlink_session=; Max-Age=0; Path=/api; HttpOnly; Secure; SameSite=Strict'
  )
  assert.deepEqual(redis.commands.at(-1), ['DEL', `medlink:auth:session:${created.claims.jti}`])
})

test('register and verify handlers reject unknown origins before processing input', async () => {
  let registerCalls = 0
  let verifyCalls = 0
  const register = createSandboxRegisterHandler({
    env,
    processRegister: async () => {
      registerCalls += 1
      throw new Error('must not run')
    },
  })
  const verify = createSandboxVerifyHandler({
    env,
    redis: new SyntheticRedis([]),
    processVerify: async () => {
      verifyCalls += 1
      throw new Error('must not run')
    },
  })

  for (const handler of [register, verify]) {
    const { capture, response } = responseCapture()
    await handler(
      {
        method: 'POST',
        headers: { origin: 'https://attacker.example.com', host: 'medlink.example.com' },
        body: {},
      } as VercelRequest,
      response
    )
    assert.equal(capture.statusCode, 403)
  }
  assert.equal(registerCalls, 0)
  assert.equal(verifyCalls, 0)
})

test('successful verification issues the HttpOnly session cookie', async () => {
  const redis = new SyntheticRedis(['OK'])
  const handler = createSandboxVerifyHandler({
    env,
    redis,
    now: () => fixedNow,
    randomBytes: (size) => Buffer.alloc(size, 17),
    processVerify: async () => ({
      status: 200 as const,
      body: {
        success: true,
        data: {
          email: 'doctor@example.com',
          accessMode: 'sandbox' as const,
          verifiedAt: '2026-07-22T12:00:00.000Z',
        },
      },
    }),
  })
  const { capture, response } = responseCapture()
  await handler(
    {
      method: 'POST',
      headers: { origin: 'https://medlink.example.com', host: 'medlink.example.com' },
      body: {
        email: 'doctor@example.com',
        code: '123456',
        challengeToken: 'synthetic-challenge',
      },
      socket: { remoteAddress: '203.0.113.10' },
    } as VercelRequest,
    response
  )

  assert.equal(capture.statusCode, 200)
  assert.match(capture.headers['Set-Cookie'], /^medlink_session=/)
  assert.match(capture.headers['Set-Cookie'], /HttpOnly; Secure; SameSite=Strict/)
  assert.equal(redis.commands[0]?.[0], 'SET')
})

test('verification fails closed with 503 when the session cannot be stored', async () => {
  const handler = createSandboxVerifyHandler({
    env,
    redis: new SyntheticRedis([new Error('synthetic store outage')]),
    now: () => fixedNow,
    randomBytes: (size) => Buffer.alloc(size, 19),
    processVerify: async () => ({
      status: 200 as const,
      body: {
        success: true,
        data: {
          email: 'doctor@example.com',
          accessMode: 'sandbox' as const,
          verifiedAt: '2026-07-22T12:00:00.000Z',
        },
      },
    }),
  })
  const { capture, response } = responseCapture()
  await handler(
    {
      method: 'POST',
      headers: { origin: 'https://medlink.example.com', host: 'medlink.example.com' },
      body: {
        email: 'doctor@example.com',
        code: '123456',
        challengeToken: 'synthetic-challenge',
      },
      socket: { remoteAddress: '203.0.113.10' },
    } as VercelRequest,
    response
  )

  assert.equal(capture.statusCode, 503)
  assert.equal(
    (capture.body as { error?: { code?: string } }).error?.code,
    'AUTH_STORE_UNAVAILABLE'
  )
})
