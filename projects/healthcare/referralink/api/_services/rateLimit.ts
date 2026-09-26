import type { RedisCommander } from './upstashRedis.js'

export const SANDBOX_RATE_LIMIT_WINDOW_SECONDS = 15 * 60
export const SANDBOX_SUBJECT_LIMIT = 10
export const SANDBOX_IP_LIMIT = 30

const RATE_LIMIT_SCRIPT = `
local subjectCount = redis.call('INCR', KEYS[1])
if subjectCount == 1 then redis.call('EXPIRE', KEYS[1], ARGV[1]) end
local ipCount = redis.call('INCR', KEYS[2])
if ipCount == 1 then redis.call('EXPIRE', KEYS[2], ARGV[1]) end
local subjectTtl = redis.call('TTL', KEYS[1])
local ipTtl = redis.call('TTL', KEYS[2])
return {subjectCount, subjectTtl, ipCount, ipTtl}
`.trim()

const RELEASE_CONCURRENCY_SCRIPT = `
if redis.call('GET', KEYS[1]) == ARGV[1] then
  return redis.call('DEL', KEYS[1])
end
return 0
`.trim()

export type SandboxRateLimitResult = {
  allowed: boolean
  reason?: 'subject' | 'ip' | 'store_unavailable'
  remaining: number
  retryAfterSeconds: number
}

function toRedisInteger(value: unknown): number | undefined {
  return typeof value === 'number' && Number.isSafeInteger(value) ? value : undefined
}

function positiveTtl(value: number | undefined, fallback: number): number {
  return value !== undefined && value > 0 ? value : fallback
}

export async function checkSandboxRateLimit(
  redis: RedisCommander,
  input: { subjectHash: string; ipHash: string }
): Promise<SandboxRateLimitResult> {
  try {
    const response = await redis.command<unknown>([
      'EVAL',
      RATE_LIMIT_SCRIPT,
      2,
      `medlink:rate:subject:${input.subjectHash}`,
      `medlink:rate:ip:${input.ipHash}`,
      SANDBOX_RATE_LIMIT_WINDOW_SECONDS,
    ])

    if (!Array.isArray(response) || response.length !== 4) throw new Error('invalid result')

    const subjectCount = toRedisInteger(response[0])
    const subjectTtl = toRedisInteger(response[1])
    const ipCount = toRedisInteger(response[2])
    const ipTtl = toRedisInteger(response[3])
    if (
      subjectCount === undefined ||
      subjectCount < 1 ||
      subjectTtl === undefined ||
      subjectTtl < 1 ||
      subjectTtl > SANDBOX_RATE_LIMIT_WINDOW_SECONDS ||
      ipCount === undefined ||
      ipCount < 1 ||
      ipTtl === undefined ||
      ipTtl < 1 ||
      ipTtl > SANDBOX_RATE_LIMIT_WINDOW_SECONDS
    ) {
      throw new Error('invalid result')
    }

    const remaining = Math.max(0, SANDBOX_SUBJECT_LIMIT - subjectCount)
    if (subjectCount > SANDBOX_SUBJECT_LIMIT) {
      return {
        allowed: false,
        reason: 'subject',
        remaining,
        retryAfterSeconds: positiveTtl(subjectTtl, SANDBOX_RATE_LIMIT_WINDOW_SECONDS),
      }
    }
    if (ipCount > SANDBOX_IP_LIMIT) {
      return {
        allowed: false,
        reason: 'ip',
        remaining,
        retryAfterSeconds: positiveTtl(ipTtl, SANDBOX_RATE_LIMIT_WINDOW_SECONDS),
      }
    }

    return { allowed: true, reason: undefined, remaining, retryAfterSeconds: 0 }
  } catch {
    return {
      allowed: false,
      reason: 'store_unavailable',
      remaining: 0,
      retryAfterSeconds: SANDBOX_RATE_LIMIT_WINDOW_SECONDS,
    }
  }
}

export type SandboxConcurrencyResult = {
  allowed: boolean
  retryAfterSeconds: number
  reason?: 'store_unavailable'
}

export async function acquireSandboxConcurrency(
  redis: RedisCommander,
  input: { subjectHash: string; leaseId: string; ttlSeconds: number }
): Promise<SandboxConcurrencyResult> {
  try {
    const key = `medlink:concurrency:${input.subjectHash}`
    const result = await redis.command<unknown>([
      'SET',
      key,
      input.leaseId,
      'NX',
      'EX',
      input.ttlSeconds,
    ])

    if (result === 'OK') return { allowed: true, retryAfterSeconds: 0 }
    if (result !== null) throw new Error('invalid result')

    const ttl = toRedisInteger(await redis.command<unknown>(['TTL', key]))
    return {
      allowed: false,
      retryAfterSeconds: positiveTtl(ttl, input.ttlSeconds),
    }
  } catch {
    return {
      allowed: false,
      retryAfterSeconds: input.ttlSeconds,
      reason: 'store_unavailable',
    }
  }
}

export async function releaseSandboxConcurrency(
  redis: RedisCommander,
  input: { subjectHash: string; leaseId: string }
): Promise<boolean> {
  try {
    const released = await redis.command<unknown>([
      'EVAL',
      RELEASE_CONCURRENCY_SCRIPT,
      1,
      `medlink:concurrency:${input.subjectHash}`,
      input.leaseId,
    ])
    return toRedisInteger(released) === 1
  } catch {
    return false
  }
}
