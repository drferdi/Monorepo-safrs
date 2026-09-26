import assert from 'node:assert/strict'
import { test } from 'node:test'

import type { SandboxRegisterResponse } from '../_types/sandbox-auth.js'

import { processSandboxRegister, processSandboxVerify } from './sandboxAuthService.js'

const fixedNow = Date.parse('2026-07-22T12:00:00.000Z')
const env = {
  SANDBOX_AUTH_SECRET: 'synthetic-secret-value-with-more-than-thirty-two-characters',
  UPSTASH_REDIS_REST_URL: 'https://example.upstash.io',
  UPSTASH_REDIS_REST_TOKEN: 'synthetic-test-token',
}

const emailDeliveryMode: SandboxRegisterResponse['deliveryMode'] = 'email'
assert.equal(emailDeliveryMode, 'email')

// @ts-expect-error server-log delivery is not part of the production response contract
const invalidDeliveryMode: SandboxRegisterResponse['deliveryMode'] = 'server_log'
assert.notEqual(emailDeliveryMode, invalidDeliveryMode)

test('registers an opaque challenge using injected env, fetch, time, random, and email delivery', async () => {
  const redisCommands: unknown[] = []
  let delivered: { email: string; code: string; expiresAt: string } | undefined
  const result = await processSandboxRegister(
    { email: '  Doctor@Example.com ', clientIp: 'synthetic-register-1' },
    {
      env,
      now: () => fixedNow,
      randomBytes: (size) => Buffer.alloc(size, 7),
      fetch: async (_input, init) => {
        redisCommands.push(JSON.parse(String(init?.body)))
        return new Response(JSON.stringify({ result: 'OK' }), {
          headers: { 'Content-Type': 'application/json' },
        })
      },
      sendVerificationEmail: async (options) => {
        delivered = options
        return true
      },
    }
  )

  assert.equal(result.status, 200)
  assert.equal(result.body.success, true)
  assert.equal(result.body.data?.email, 'doctor@example.com')
  assert.match(result.body.data?.challengeToken ?? '', /^[A-Za-z0-9_-]{32,}$/)
  assert.equal((result.body.data?.challengeToken ?? '').includes('.'), false)
  assert.deepEqual(delivered, {
    email: 'doctor@example.com',
    code: '777777',
    expiresAt: '2026-07-22T12:15:00.000Z',
  })
  assert.equal(JSON.stringify(redisCommands).includes('doctor@example.com'), false)
  assert.equal(JSON.stringify(redisCommands).includes('777777'), false)
})

test('atomically verifies the opaque challenge through the injected Redis transport', async () => {
  const redisCommands: unknown[][] = []
  const dependencies = {
    env,
    now: () => fixedNow,
    randomBytes: (size: number) => Buffer.alloc(size, 11),
    fetch: async (_input: string | URL | Request, init?: RequestInit) => {
      const command = JSON.parse(String(init?.body)) as unknown[]
      redisCommands.push(command)
      return new Response(JSON.stringify({ result: command[0] === 'SET' ? 'OK' : 1 }), {
        headers: { 'Content-Type': 'application/json' },
      })
    },
    sendVerificationEmail: async () => true,
  }
  const registered = await processSandboxRegister(
    { email: 'doctor@example.com', clientIp: 'synthetic-register-2' },
    dependencies
  )
  assert.equal(registered.status, 200)
  const challengeToken = registered.body.data?.challengeToken
  assert.ok(challengeToken)

  const verified = await processSandboxVerify(
    {
      email: 'DOCTOR@example.com',
      code: '111111',
      challengeToken,
      clientIp: 'synthetic-verify-1',
    },
    dependencies
  )

  assert.equal(verified.status, 200)
  assert.equal(verified.body.success, true)
  assert.equal(verified.body.data?.email, 'doctor@example.com')
  assert.equal(redisCommands[1]?.[0], 'EVAL')
})

test('fails closed when Redis cannot store a registration challenge', async () => {
  const result = await processSandboxRegister(
    { email: 'doctor@example.com', clientIp: 'synthetic-register-3' },
    {
      env,
      now: () => fixedNow,
      randomBytes: (size) => Buffer.alloc(size, 13),
      fetch: async () => {
        throw new TypeError('synthetic Redis outage')
      },
      sendVerificationEmail: async () => true,
    }
  )

  assert.equal(result.status, 503)
  assert.equal(result.body.error?.code, 'AUTH_STORE_UNAVAILABLE')
})

test('fails closed when Redis returns a command error', async () => {
  const result = await processSandboxRegister(
    { email: 'doctor@example.com', clientIp: 'synthetic-register-4' },
    {
      env,
      now: () => fixedNow,
      randomBytes: (size) => Buffer.alloc(size, 15),
      fetch: async () =>
        new Response(JSON.stringify({ error: 'ERR synthetic command failure' }), {
          headers: { 'Content-Type': 'application/json' },
        }),
      sendVerificationEmail: async () => true,
    }
  )

  assert.equal(result.status, 503)
  assert.equal(result.body.error?.code, 'AUTH_STORE_UNAVAILABLE')
})

test('maps an atomically consumed mismatch to a stable verification failure', async () => {
  const result = await processSandboxVerify(
    {
      email: 'doctor@example.com',
      code: '123456',
      challengeToken: Buffer.alloc(24, 17).toString('base64url'),
      clientIp: 'synthetic-verify-2',
    },
    {
      env,
      now: () => fixedNow,
      randomBytes: (size) => Buffer.alloc(size, 17),
      fetch: async () =>
        new Response(JSON.stringify({ result: -1 }), {
          headers: { 'Content-Type': 'application/json' },
        }),
      sendVerificationEmail: async () => true,
    }
  )

  assert.equal(result.status, 400)
  assert.equal(result.body.error?.code, 'SANDBOX_MISMATCH')
})
