import assert from 'node:assert/strict'
import { createHmac } from 'node:crypto'
import { test } from 'node:test'

import type { RedisCommander } from '../_services/upstashRedis.js'
import type { SandboxSessionClaims } from '../_types/sandbox-auth.js'

import {
  SANDBOX_SESSION_TTL_SECONDS,
  clearSandboxSessionCookie,
  createSandboxSession,
  parseSandboxSessionCookie,
  verifySandboxSession,
} from './sandboxSession.js'

const fixedNow = Date.parse('2026-07-22T12:00:00.000Z')
const secret = 'synthetic-secret-value-with-more-than-thirty-two-characters'
const env = { SANDBOX_AUTH_SECRET: secret }

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

function forgeSignedToken(claims: SandboxSessionClaims): string {
  const encoded = Buffer.from(JSON.stringify(claims)).toString('base64url')
  const signingKey = createHmac('sha256', secret).update('medlink:sandbox-auth:session:v1').digest()
  const signature = createHmac('sha256', signingKey).update(encoded).digest('base64url')
  return `${encoded}.${signature}`
}

test('creates an eight-hour signed session and stores only its active jti', async () => {
  const redis = new SyntheticRedis(['OK'])
  const created = await createSandboxSession(
    { email: '  Doctor@Example.com ' },
    {
      redis,
      env,
      now: () => fixedNow,
      randomBytes: (size) => Buffer.alloc(size, 17),
    }
  )

  assert.equal(SANDBOX_SESSION_TTL_SECONDS, 8 * 60 * 60)
  assert.equal(created.claims.version, 'v1')
  assert.equal(created.claims.scope, 'sandbox')
  assert.equal(created.claims.aud, 'medlink')
  assert.equal(created.claims.iat, fixedNow / 1000)
  assert.equal(created.claims.exp, fixedNow / 1000 + 8 * 60 * 60)
  assert.match(created.claims.sub, /^[A-Za-z0-9_-]{43}$/)
  assert.match(created.claims.jti, /^[A-Za-z0-9_-]{32,}$/)
  assert.equal(created.token.includes('doctor@example.com'), false)
  assert.equal(created.expiresAt, '2026-07-22T20:00:00.000Z')
  assert.deepEqual(redis.commands[0], [
    'SET',
    `medlink:auth:session:${created.claims.jti}`,
    created.claims.sub,
    'NX',
    'EX',
    28_800,
  ])
  assert.equal(
    created.cookie,
    `medlink_session=${created.token}; Max-Age=28800; Path=/api; HttpOnly; Secure; SameSite=Strict`
  )
  assert.equal(parseSandboxSessionCookie(`theme=dark; ${created.cookie}`), created.token)
})

test('verifies exact signed claims and an active Redis jti', async () => {
  const redis = new SyntheticRedis(['OK'])
  const dependencies = {
    redis,
    env,
    now: () => fixedNow,
    randomBytes: (size: number) => Buffer.alloc(size, 19),
  }
  const created = await createSandboxSession({ email: 'doctor@example.com' }, dependencies)
  redis.responses.push(created.claims.sub)

  assert.deepEqual(await verifySandboxSession(`medlink_session=${created.token}`, dependencies), {
    valid: true,
    claims: created.claims,
  })
  assert.deepEqual(redis.commands[1], ['GET', `medlink:auth:session:${created.claims.jti}`])
})

test('rejects tampered, expired, and wrong-scope tokens before Redis access', async () => {
  const redis = new SyntheticRedis([])
  const dependencies = {
    redis,
    env,
    now: () => fixedNow,
    randomBytes: (size: number) => Buffer.alloc(size, 23),
  }
  const baseClaims: SandboxSessionClaims = {
    version: 'v1',
    sub: Buffer.alloc(32, 1).toString('base64url'),
    scope: 'sandbox',
    iat: fixedNow / 1000 - 60,
    exp: fixedNow / 1000 + 60,
    aud: 'medlink',
    jti: Buffer.alloc(24, 2).toString('base64url'),
  }

  const validToken = forgeSignedToken(baseClaims)
  assert.deepEqual(await verifySandboxSession(`${validToken}x`, dependencies), {
    valid: false,
    reason: 'invalid',
  })
  assert.deepEqual(
    await verifySandboxSession(
      forgeSignedToken({ ...baseClaims, exp: fixedNow / 1000 - 1 }),
      dependencies
    ),
    { valid: false, reason: 'expired' }
  )
  assert.deepEqual(
    await verifySandboxSession(
      forgeSignedToken({ ...baseClaims, scope: 'admin' as 'sandbox' }),
      dependencies
    ),
    { valid: false, reason: 'wrong_scope' }
  )
  assert.deepEqual(
    await verifySandboxSession(
      forgeSignedToken({ ...baseClaims, aud: 'other' as 'medlink' }),
      dependencies
    ),
    { valid: false, reason: 'invalid' }
  )
  assert.equal(redis.commands.length, 0)
})

test('fails closed when the active session is missing, mismatched, or unavailable', async () => {
  const claims: SandboxSessionClaims = {
    version: 'v1',
    sub: Buffer.alloc(32, 3).toString('base64url'),
    scope: 'sandbox',
    iat: fixedNow / 1000 - 60,
    exp: fixedNow / 1000 + 60,
    aud: 'medlink',
    jti: Buffer.alloc(24, 4).toString('base64url'),
  }
  const token = forgeSignedToken(claims)

  for (const [response, reason] of [
    [null, 'inactive'],
    ['different-subject', 'inactive'],
    [new Error('synthetic Redis outage'), 'store_unavailable'],
  ] as const) {
    const redis = new SyntheticRedis([response])
    assert.deepEqual(
      await verifySandboxSession(token, {
        redis,
        env,
        now: () => fixedNow,
        randomBytes: (size) => Buffer.alloc(size, 29),
      }),
      { valid: false, reason }
    )
  }
})

test('clears the session cookie with the same hardened attributes', () => {
  assert.equal(
    clearSandboxSessionCookie(),
    'medlink_session=; Max-Age=0; Path=/api; HttpOnly; Secure; SameSite=Strict'
  )
})
