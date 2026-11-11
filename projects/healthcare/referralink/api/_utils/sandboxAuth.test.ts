import assert from 'node:assert/strict'
import { test } from 'node:test'

import type { RedisCommander } from '../_services/upstashRedis.js'

import {
  SandboxAuthStoreError,
  consumeSandboxChallenge,
  createSandboxChallenge,
  createSandboxVerificationCode,
} from './sandboxAuth.js'

const fixedNow = Date.parse('2026-07-22T12:00:00.000Z')
const env = { SANDBOX_AUTH_SECRET: 'synthetic-secret-value-with-more-than-thirty-two-characters' }

class StatefulChallengeRedis implements RedisCommander {
  readonly commands: Array<ReadonlyArray<string | number>> = []
  readonly values = new Map<string, string>()

  async command<T>(command: ReadonlyArray<string | number>): Promise<T> {
    this.commands.push(command)
    if (command[0] === 'SET') {
      const key = String(command[1])
      if (this.values.has(key)) return null as T
      this.values.set(key, String(command[2]))
      return 'OK' as T
    }
    if (command[0] === 'EVAL') {
      const key = String(command[3])
      const expected = String(command[4])
      const actual = this.values.get(key)
      if (actual === undefined) return 0 as T
      this.values.delete(key)
      return (actual === expected ? 1 : -1) as T
    }
    throw new Error('Unexpected synthetic Redis command')
  }
}

class FixedResponseRedis implements RedisCommander {
  constructor(private readonly response: unknown) {}

  async command<T>(): Promise<T> {
    return this.response as T
  }
}

test('creates a deterministic six-digit code from injected randomness', () => {
  assert.equal(
    createSandboxVerificationCode(() => Buffer.from([1, 2, 3, 4, 5, 6])),
    '123456'
  )
})

test('stores only a keyed verification hash behind a random opaque challenge ID', async () => {
  const redis = new StatefulChallengeRedis()
  const result = await createSandboxChallenge(
    { email: '  Doctor@Example.com ', code: '123 456' },
    {
      redis,
      env,
      now: () => fixedNow,
      randomBytes: (size) => Buffer.alloc(size, 7),
    }
  )

  assert.match(result.challengeToken, /^[A-Za-z0-9_-]{32,}$/)
  assert.equal(result.challengeToken.includes('.'), false)
  assert.equal(result.challengeToken.includes('Doctor'), false)
  assert.equal(result.challengeToken.includes('123456'), false)
  assert.equal(result.expiresAt, '2026-07-22T12:15:00.000Z')

  const command = redis.commands[0]
  assert.deepEqual(command?.slice(0, 2), ['SET', `medlink:auth:challenge:${result.challengeToken}`])
  assert.match(String(command?.[2]), /^[A-Za-z0-9_-]{43}$/)
  assert.equal(String(command?.[2]).includes('doctor@example.com'), false)
  assert.equal(String(command?.[2]).includes('123456'), false)
  assert.deepEqual(command?.slice(3), ['NX', 'EX', 900])
})

test('uses the configured secret as the keyed-hash boundary', async () => {
  const firstRedis = new StatefulChallengeRedis()
  const secondRedis = new StatefulChallengeRedis()
  const dependencies = {
    now: () => fixedNow,
    randomBytes: (size: number) => Buffer.alloc(size, 9),
  }

  await createSandboxChallenge(
    { email: 'doctor@example.com', code: '123456' },
    { ...dependencies, redis: firstRedis, env }
  )
  await createSandboxChallenge(
    { email: 'doctor@example.com', code: '123456' },
    {
      ...dependencies,
      redis: secondRedis,
      env: { SANDBOX_AUTH_SECRET: `${env.SANDBOX_AUTH_SECRET}-different` },
    }
  )

  assert.notEqual(firstRedis.commands[0]?.[2], secondRedis.commands[0]?.[2])
})

test('atomically consumes a successful challenge exactly once', async () => {
  const redis = new StatefulChallengeRedis()
  const dependencies = {
    redis,
    env,
    now: () => fixedNow,
    randomBytes: (size: number) => Buffer.alloc(size, 11),
  }
  const challenge = await createSandboxChallenge(
    { email: 'doctor@example.com', code: '123456' },
    dependencies
  )

  assert.deepEqual(
    await consumeSandboxChallenge(
      {
        email: 'DOCTOR@example.com',
        code: '123 456',
        challengeToken: challenge.challengeToken,
      },
      dependencies
    ),
    { valid: true, verifiedAt: '2026-07-22T12:00:00.000Z' }
  )
  assert.deepEqual(
    await consumeSandboxChallenge(
      {
        email: 'doctor@example.com',
        code: '123456',
        challengeToken: challenge.challengeToken,
      },
      dependencies
    ),
    { valid: false, reason: 'expired' }
  )
  assert.equal(redis.commands[1]?.[0], 'EVAL')
  assert.match(String(redis.commands[1]?.[1]), /redis\.call\('GET'/)
  assert.match(String(redis.commands[1]?.[1]), /redis\.call\('DEL'/)
})

test('consumes a mismatched challenge so the attempt cannot be replayed', async () => {
  const redis = new StatefulChallengeRedis()
  const dependencies = {
    redis,
    env,
    now: () => fixedNow,
    randomBytes: (size: number) => Buffer.alloc(size, 13),
  }
  const challenge = await createSandboxChallenge(
    { email: 'doctor@example.com', code: '123456' },
    dependencies
  )

  assert.deepEqual(
    await consumeSandboxChallenge(
      {
        email: 'doctor@example.com',
        code: '654321',
        challengeToken: challenge.challengeToken,
      },
      dependencies
    ),
    { valid: false, reason: 'mismatch' }
  )
  assert.deepEqual(
    await consumeSandboxChallenge(
      {
        email: 'doctor@example.com',
        code: '123456',
        challengeToken: challenge.challengeToken,
      },
      dependencies
    ),
    { valid: false, reason: 'expired' }
  )
})

test('rejects coerced or malformed challenge consume results', async () => {
  for (const response of [true, '1', [1], null]) {
    await assert.rejects(
      () =>
        consumeSandboxChallenge(
          {
            email: 'doctor@example.com',
            code: '123456',
            challengeToken: Buffer.alloc(24, 19).toString('base64url'),
          },
          {
            redis: new FixedResponseRedis(response),
            env,
            now: () => fixedNow,
          }
        ),
      SandboxAuthStoreError
    )
  }
})
