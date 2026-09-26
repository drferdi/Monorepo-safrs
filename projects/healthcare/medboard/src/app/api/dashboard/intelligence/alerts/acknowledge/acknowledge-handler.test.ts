import assert from 'node:assert/strict'
import test from 'node:test'

import { createAcknowledgePostHandler } from './acknowledge-handler'

const sessionClinical = {
  username: 'dokter-a',
  role: 'DOKTER',
}

test('acknowledge route returns 401 when session is missing', async () => {
  const handler = createAcknowledgePostHandler({
    getSession: () => null,
    getIp: () => null,
    recordInteraction: async () => {
      throw new Error('should not be called')
    },
    writeSecurityAuditLog: async () => undefined,
  })

  const response = await handler(
    new Request('http://localhost/api/dashboard/intelligence/alerts/acknowledge', {
      method: 'POST',
      body: JSON.stringify({
        encounterId: 'enc-001',
        alertTimestamp: '2026-03-13T10:00:00.000Z',
        acknowledgedAt: '2026-03-13T10:01:00.000Z',
      }),
      headers: { 'content-type': 'application/json' },
    })
  )

  assert.equal(response.status, 401)
})

test('acknowledge route records structured interaction audit before returning success', async () => {
  const calls: string[] = []

  const handler = createAcknowledgePostHandler({
    getSession: () => sessionClinical,
    getIp: () => '127.0.0.1',
    recordInteraction: async input => {
      calls.push('recordInteraction')
      assert.deepEqual(input, {
        encounterId: 'enc-001',
        interaction: 'alert_acknowledged',
        latencyMs: 0,
        suggestionCount: 0,
        violationCount: 1,
        warningCount: 0,
        metadata: {
          alertTimestamp: '2026-03-13T10:00:00.000Z',
          acknowledgedAt: '2026-03-13T10:01:00.000Z',
          source: 'critical-alert-banner',
        },
        actorUserId: 'dokter-a',
        actorRole: 'DOKTER',
      })

      return {
        encounterId: input.encounterId,
        auditedAt: '2026-03-13T10:01:00.000Z',
      }
    },
    writeSecurityAuditLog: async () => {
      calls.push('writeSecurityAuditLog')
    },
  })

  const response = await handler(
    new Request('http://localhost/api/dashboard/intelligence/alerts/acknowledge', {
      method: 'POST',
      body: JSON.stringify({
        encounterId: 'enc-001',
        alertTimestamp: '2026-03-13T10:00:00.000Z',
        acknowledgedAt: '2026-03-13T10:01:00.000Z',
      }),
      headers: { 'content-type': 'application/json' },
    })
  )

  const body = await response.json()

  assert.equal(response.status, 202)
  assert.deepEqual(calls, ['recordInteraction', 'writeSecurityAuditLog'])
  assert.deepEqual(body, {
    ok: true,
    acknowledgedAt: '2026-03-13T10:01:00.000Z',
    audit: {
      encounterId: 'enc-001',
      auditedAt: '2026-03-13T10:01:00.000Z',
    },
  })
})

test('acknowledge route returns 500 when audit persistence fails', async () => {
  const calls: string[] = []

  const handler = createAcknowledgePostHandler({
    getSession: () => sessionClinical,
    getIp: () => '127.0.0.1',
    recordInteraction: async () => {
      calls.push('recordInteraction')
      throw new Error('audit unavailable')
    },
    writeSecurityAuditLog: async () => {
      calls.push('writeSecurityAuditLog')
    },
  })

  const response = await handler(
    new Request('http://localhost/api/dashboard/intelligence/alerts/acknowledge', {
      method: 'POST',
      body: JSON.stringify({
        encounterId: 'enc-001',
        alertTimestamp: '2026-03-13T10:00:00.000Z',
        acknowledgedAt: '2026-03-13T10:01:00.000Z',
      }),
      headers: { 'content-type': 'application/json' },
    })
  )

  const body = await response.json()

  assert.equal(response.status, 500)
  assert.deepEqual(calls, ['recordInteraction', 'writeSecurityAuditLog'])
  assert.deepEqual(body, {
    ok: false,
    error: 'Failed to record alert acknowledgement audit',
  })
})
