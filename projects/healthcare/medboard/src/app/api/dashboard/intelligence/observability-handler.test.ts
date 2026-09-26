import assert from 'node:assert/strict'
import test from 'node:test'

import { createObservabilityPostHandler } from './observability-handler'

const sessionClinical = {
  username: 'dokter-a',
  role: 'DOKTER',
}

const sessionManagement = {
  username: 'kepala-a',
  role: 'KEPALA_PUSKESMAS',
}

test('observability route returns 401 when session is missing', async () => {
  const handler = createObservabilityPostHandler({
    getSession: () => null,
    getIp: () => null,
    recordInteraction: async () => {
      throw new Error('should not be called')
    },
    writeSecurityAuditLog: async () => undefined,
  })

  const response = await handler(
    new Request('http://localhost/api/dashboard/intelligence/observability', {
      method: 'POST',
      body: JSON.stringify({ encounterId: 'enc-001' }),
      headers: { 'content-type': 'application/json' },
    })
  )

  assert.equal(response.status, 401)
})

test('observability route records interaction audit', async () => {
  const handler = createObservabilityPostHandler({
    getSession: () => sessionClinical,
    getIp: () => null,
    recordInteraction: async input => ({
      encounterId: input.encounterId,
      auditedAt: '2026-03-13T10:00:00.000Z',
    }),
    writeSecurityAuditLog: async () => undefined,
  })

  const response = await handler(
    new Request('http://localhost/api/dashboard/intelligence/observability', {
      method: 'POST',
      body: JSON.stringify({
        encounterId: 'enc-001',
        requestId: 'req-001',
        interaction: 'rendered',
        latencyMs: 280,
        suggestionCount: 1,
        violationCount: 0,
        warningCount: 0,
        primaryConfidence: 0.82,
      }),
      headers: { 'content-type': 'application/json' },
    })
  )

  const body = await response.json()
  assert.equal(response.status, 202)
  assert.equal(body.success, true)
  assert.deepEqual(body.data, {
    encounterId: 'enc-001',
    auditedAt: '2026-03-13T10:00:00.000Z',
  })
})

test('observability route returns 403 for management roles without clinical AI access', async () => {
  const handler = createObservabilityPostHandler({
    getSession: () => sessionManagement,
    getIp: () => null,
    recordInteraction: async () => {
      throw new Error('should not be called')
    },
    writeSecurityAuditLog: async () => undefined,
  })

  const response = await handler(
    new Request('http://localhost/api/dashboard/intelligence/observability', {
      method: 'POST',
      body: JSON.stringify({
        encounterId: 'enc-001',
        interaction: 'rendered',
        suggestionCount: 1,
        violationCount: 0,
        warningCount: 0,
      }),
      headers: { 'content-type': 'application/json' },
    })
  )

  assert.equal(response.status, 403)
})
