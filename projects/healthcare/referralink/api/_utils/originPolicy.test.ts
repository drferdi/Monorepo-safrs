import assert from 'node:assert/strict'
import { test } from 'node:test'

import { evaluateOriginPolicy } from './originPolicy.js'

const productionEnv = { APP_URL: 'https://medlink.example.com' }

test('allows only the canonical APP_URL origin', () => {
  assert.deepEqual(evaluateOriginPolicy({ origin: 'https://medlink.example.com' }, productionEnv), {
    allowed: true,
  })
  assert.deepEqual(evaluateOriginPolicy({ origin: 'https://unknown.example.com' }, productionEnv), {
    allowed: false,
    reason: 'forbidden',
  })
})

test('allows missing Origin only when Host identifies the canonical server', () => {
  assert.deepEqual(evaluateOriginPolicy({ host: 'medlink.example.com' }, productionEnv), {
    allowed: true,
  })
  assert.deepEqual(evaluateOriginPolicy({ host: 'attacker.example.com' }, productionEnv), {
    allowed: false,
    reason: 'forbidden',
  })
})

test('fails closed for missing or malformed APP_URL', () => {
  assert.deepEqual(evaluateOriginPolicy({ host: 'medlink.example.com' }, {}), {
    allowed: false,
    reason: 'not_configured',
  })
  assert.deepEqual(
    evaluateOriginPolicy({ host: 'medlink.example.com' }, { APP_URL: 'not-a-url' }),
    {
      allowed: false,
      reason: 'not_configured',
    }
  )
})

test('supports explicit localhost development origins without broadening production', () => {
  const localEnv = { APP_URL: 'http://127.0.0.1:3007' }
  assert.deepEqual(evaluateOriginPolicy({ origin: 'http://127.0.0.1:3007' }, localEnv), {
    allowed: true,
  })
  assert.deepEqual(evaluateOriginPolicy({ origin: 'http://localhost:3007' }, localEnv), {
    allowed: false,
    reason: 'forbidden',
  })
})
