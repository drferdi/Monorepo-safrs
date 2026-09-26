import assert from 'node:assert/strict'
import { test } from 'node:test'

import {
  SANDBOX_RATE_LIMIT_WINDOW_SECONDS,
  acquireSandboxConcurrency,
  checkSandboxRateLimit,
  releaseSandboxConcurrency,
} from './rateLimit.js'
import type { RedisCommander } from './upstashRedis.js'

class SyntheticRedis implements RedisCommander {
  readonly commands: Array<ReadonlyArray<string | number>> = []

  constructor(private readonly responses: Array<unknown | Error>) {}

  async command<T>(command: ReadonlyArray<string | number>): Promise<T> {
    this.commands.push(command)
    const response = this.responses.shift()
    if (response instanceof Error) throw response
    return response as T
  }
}

const failClosedResult = {
  allowed: false,
  reason: 'store_unavailable',
  remaining: 0,
  retryAfterSeconds: 900,
} as const

async function expectRateLimitFailClosed(response: unknown) {
  assert.deepEqual(
    await checkSandboxRateLimit(new SyntheticRedis([response]), {
      subjectHash: 'subject-hash',
      ipHash: 'ip-hash',
    }),
    failClosedResult
  )
}

test('uses one atomic script to create counters with a 15-minute TTL', async () => {
  const redis = new SyntheticRedis([[1, 900, 1, 900]])

  const result = await checkSandboxRateLimit(redis, {
    subjectHash: 'subject-hash',
    ipHash: 'ip-hash',
  })

  assert.deepEqual(result, {
    allowed: true,
    reason: undefined,
    remaining: 9,
    retryAfterSeconds: 0,
  })
  assert.equal(SANDBOX_RATE_LIMIT_WINDOW_SECONDS, 900)
  assert.equal(redis.commands.length, 1)
  assert.equal(redis.commands[0]?.[0], 'EVAL')
  assert.match(String(redis.commands[0]?.[1]), /redis\.call\('INCR'/)
  assert.match(String(redis.commands[0]?.[1]), /redis\.call\('EXPIRE'/)
  assert.deepEqual(redis.commands[0]?.slice(2), [
    2,
    'medlink:rate:subject:subject-hash',
    'medlink:rate:ip:ip-hash',
    900,
  ])
})

test('enforces the subject limit at 10 requests per 15 minutes with Retry-After', async () => {
  const redis = new SyntheticRedis([[11, 847, 20, 700]])

  const result = await checkSandboxRateLimit(redis, {
    subjectHash: 'subject-hash',
    ipHash: 'ip-hash',
  })

  assert.deepEqual(result, {
    allowed: false,
    reason: 'subject',
    remaining: 0,
    retryAfterSeconds: 847,
  })
})

test('enforces the IP limit at 30 requests per 15 minutes with Retry-After', async () => {
  const redis = new SyntheticRedis([[7, 600, 31, 721]])

  const result = await checkSandboxRateLimit(redis, {
    subjectHash: 'subject-hash',
    ipHash: 'ip-hash',
  })

  assert.deepEqual(result, {
    allowed: false,
    reason: 'ip',
    remaining: 3,
    retryAfterSeconds: 721,
  })
})

test('fails closed when the rate-limit store is unavailable or malformed', async () => {
  const unavailableRedis = new SyntheticRedis([new Error('synthetic Redis outage')])
  const malformedRedis = new SyntheticRedis([['unexpected']])

  for (const redis of [unavailableRedis, malformedRedis]) {
    assert.deepEqual(
      await checkSandboxRateLimit(redis, {
        subjectHash: 'subject-hash',
        ipHash: 'ip-hash',
      }),
      failClosedResult
    )
  }
})

test('fails closed for malformed counter and TTL entry types', async () => {
  const malformedEntries: unknown[] = [null, true, '', '1', [], [1]]

  for (const malformed of malformedEntries) {
    for (let index = 0; index < 4; index += 1) {
      const response: unknown[] = [1, 900, 1, 900]
      response[index] = malformed
      await expectRateLimitFailClosed(response)
    }
  }
})

test('fails closed for unsafe counter and TTL ranges', async () => {
  for (const response of [
    [0, 900, 1, 900],
    [-1, 900, 1, 900],
    [1.5, 900, 1, 900],
    [Number.MAX_SAFE_INTEGER + 1, 900, 1, 900],
    [1, 0, 1, 900],
    [1, -1, 1, 900],
    [1, 901, 1, 900],
    [1, 900, 0, 900],
    [1, 900, -1, 900],
    [1, 900, 1.5, 900],
    [1, 900, Number.MAX_SAFE_INTEGER + 1, 900],
    [1, 900, 1, 0],
    [1, 900, 1, -1],
    [1, 900, 1, 901],
  ]) {
    await expectRateLimitFailClosed(response)
  }
})

test('allows only one active concurrency lease per subject', async () => {
  const acquiredRedis = new SyntheticRedis(['OK'])
  const acquired = await acquireSandboxConcurrency(acquiredRedis, {
    subjectHash: 'subject-hash',
    leaseId: 'lease-one',
    ttlSeconds: 120,
  })

  assert.deepEqual(acquired, { allowed: true, retryAfterSeconds: 0 })
  assert.deepEqual(acquiredRedis.commands[0], [
    'SET',
    'medlink:concurrency:subject-hash',
    'lease-one',
    'NX',
    'EX',
    120,
  ])

  const blockedRedis = new SyntheticRedis([null, 73])
  const blocked = await acquireSandboxConcurrency(blockedRedis, {
    subjectHash: 'subject-hash',
    leaseId: 'lease-two',
    ttlSeconds: 120,
  })

  assert.deepEqual(blocked, { allowed: false, retryAfterSeconds: 73 })
  assert.deepEqual(blockedRedis.commands[1], ['TTL', 'medlink:concurrency:subject-hash'])
})

test('releases only the matching concurrency lease with an atomic script', async () => {
  const redis = new SyntheticRedis([1])

  assert.equal(
    await releaseSandboxConcurrency(redis, {
      subjectHash: 'subject-hash',
      leaseId: 'lease-one',
    }),
    true
  )
  assert.equal(redis.commands[0]?.[0], 'EVAL')
  assert.match(String(redis.commands[0]?.[1]), /redis\.call\('GET'/)
  assert.match(String(redis.commands[0]?.[1]), /redis\.call\('DEL'/)
})

test('fails closed when the concurrency store is unavailable', async () => {
  const redis = new SyntheticRedis([new Error('synthetic Redis outage')])

  assert.deepEqual(
    await acquireSandboxConcurrency(redis, {
      subjectHash: 'subject-hash',
      leaseId: 'lease-one',
      ttlSeconds: 120,
    }),
    { allowed: false, retryAfterSeconds: 120, reason: 'store_unavailable' }
  )
})
