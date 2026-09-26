import assert from 'node:assert/strict'
import { test } from 'node:test'

import {
  UpstashRedis,
  UpstashRedisConfigurationError,
  UpstashRedisUnavailableError,
} from './upstashRedis.js'

const validEnv = {
  UPSTASH_REDIS_REST_URL: 'https://example.upstash.io/',
  UPSTASH_REDIS_REST_TOKEN: 'synthetic-test-token',
}

test('rejects missing or non-HTTPS Redis configuration before fetching', async () => {
  let fetchCalls = 0
  const fetchImpl = async () => {
    fetchCalls += 1
    return new Response(JSON.stringify({ result: 'OK' }))
  }

  assert.throws(
    () => new UpstashRedis({ env: {}, fetch: fetchImpl }),
    UpstashRedisConfigurationError
  )
  assert.throws(
    () =>
      new UpstashRedis({
        env: {
          UPSTASH_REDIS_REST_URL: 'http://example.upstash.io',
          UPSTASH_REDIS_REST_TOKEN: 'synthetic-test-token',
        },
        fetch: fetchImpl,
      }),
    UpstashRedisConfigurationError
  )
  assert.throws(
    () =>
      new UpstashRedis({
        env: {
          UPSTASH_REDIS_REST_URL: 'not-a-url',
          UPSTASH_REDIS_REST_TOKEN: 'synthetic-test-token',
        },
        fetch: fetchImpl,
      }),
    UpstashRedisConfigurationError
  )
  assert.equal(fetchCalls, 0)
})

test('posts a command array with bearer authorization to the configured endpoint', async () => {
  let requestUrl = ''
  let requestInit: RequestInit | undefined
  const redis = new UpstashRedis({
    env: validEnv,
    fetch: async (input, init) => {
      requestUrl = String(input)
      requestInit = init
      return new Response(JSON.stringify({ result: 'OK' }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      })
    },
  })

  const result = await redis.command<string>(['SET', 'medlink:test', 'value', 'EX', 900])

  assert.equal(result, 'OK')
  assert.equal(requestUrl, 'https://example.upstash.io/')
  assert.equal(requestInit?.method, 'POST')
  assert.deepEqual(requestInit?.headers, {
    Authorization: 'Bearer synthetic-test-token',
    'Content-Type': 'application/json',
  })
  assert.equal(requestInit?.body, '["SET","medlink:test","value","EX",900]')
})

test('rejects Redis error responses without returning a result', async () => {
  const redis = new UpstashRedis({
    env: validEnv,
    fetch: async () =>
      new Response(JSON.stringify({ error: 'ERR synthetic command failure' }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      }),
  })

  await assert.rejects(() => redis.command(['GET', 'medlink:test']), /Redis command failed/)
})

test('maps network failures to a fail-closed unavailable error', async () => {
  const redis = new UpstashRedis({
    env: validEnv,
    fetch: async () => {
      throw new TypeError('synthetic network failure')
    },
  })

  await assert.rejects(() => redis.command(['GET', 'medlink:test']), UpstashRedisUnavailableError)
})

test('aborts timed-out requests using injected timers', async () => {
  let timeoutDelay = 0
  let clearedHandle: unknown
  const redis = new UpstashRedis({
    env: validEnv,
    timeoutMs: 25,
    setTimeout: (callback, delay) => {
      timeoutDelay = delay
      callback()
      return 'synthetic-timeout'
    },
    clearTimeout: (handle) => {
      clearedHandle = handle
    },
    fetch: async (_input, init) => {
      assert.equal(init?.signal?.aborted, true)
      throw new DOMException('synthetic timeout', 'AbortError')
    },
  })

  await assert.rejects(() => redis.command(['GET', 'medlink:test']), UpstashRedisUnavailableError)
  assert.equal(timeoutDelay, 25)
  assert.equal(clearedHandle, 'synthetic-timeout')
})
