import assert from 'node:assert/strict'
import test from 'node:test'

import type { DashboardEncounterSummary, DashboardOperationalMetrics } from '@abyss/types'

import {
  createEncountersGetHandler,
  createMetricsGetHandler,
  createOverridePostHandler,
} from './handlers'

const sessionClinical = {
  username: 'dokter-a',
  displayName: 'Dokter A',
  email: 'dokter@example.com',
  institution: 'Puskesmas Balowerti Kota Kediri',
  profession: 'Dokter' as const,
  role: 'DOKTER',
  issuedAt: 1,
  expiresAt: 2,
}

const sessionManagement = {
  ...sessionClinical,
  username: 'kepala-a',
  displayName: 'Kepala A',
  role: 'KEPALA_PUSKESMAS',
}

test('encounters route returns 401 when session is missing', async () => {
  const handler = createEncountersGetHandler({
    getSession: () => null,
    getIp: () => null,
    listEncounterSummaries: async () => [],
    writeSecurityAuditLog: async () => undefined,
  })

  const response = await handler(
    new Request('http://localhost/api/dashboard/intelligence/encounters')
  )

  assert.equal(response.status, 401)
})

test('encounters route returns 403 for non-clinical and non-management roles', async () => {
  const handler = createEncountersGetHandler({
    getSession: () => ({ ...sessionClinical, role: 'PUBLIC' }),
    getIp: () => null,
    listEncounterSummaries: async () => [],
    writeSecurityAuditLog: async () => undefined,
  })

  const response = await handler(
    new Request('http://localhost/api/dashboard/intelligence/encounters')
  )

  assert.equal(response.status, 403)
})

test('encounters route returns typed encounter summaries for allowed roles', async () => {
  const summaries: DashboardEncounterSummary[] = [
    {
      encounterId: 'apt-001',
      patientLabel: 'Pasien #001',
      status: 'completed',
      suggestions: [],
      alerts: [],
      eklaimReadiness: {
        isReady: true,
        checkedAt: '2026-03-13T10:00:00.000Z',
        blockers: [],
      },
      activeComplianceFailures: [],
      lastUpdatedAt: '2026-03-13T10:00:00.000Z',
    },
  ]

  const handler = createEncountersGetHandler({
    getSession: () => sessionClinical,
    getIp: () => null,
    listEncounterSummaries: async () => summaries,
    writeSecurityAuditLog: async () => undefined,
  })

  const response = await handler(
    new Request('http://localhost/api/dashboard/intelligence/encounters')
  )
  const body = await response.json()

  assert.equal(response.status, 200)
  assert.equal(body.success, true)
  assert.deepEqual(body.data, summaries)
})

test('metrics route is management-only', async () => {
  const handler = createMetricsGetHandler({
    getSession: () => sessionClinical,
    getIp: () => null,
    getOperationalMetrics: async () => {
      throw new Error('should not be called')
    },
    writeSecurityAuditLog: async () => undefined,
  })

  const response = await handler(new Request('http://localhost/api/dashboard/intelligence/metrics'))

  assert.equal(response.status, 403)
})

test('override route rejects management roles with 403', async () => {
  const handler = createOverridePostHandler({
    getSession: () => sessionManagement,
    getIp: () => null,
    recordOverride: async () => {
      throw new Error('should not be called')
    },
    writeSecurityAuditLog: async () => undefined,
  })

  const response = await handler(
    new Request('http://localhost/api/dashboard/intelligence/override', {
      method: 'POST',
      body: JSON.stringify({
        encounterId: 'apt-001',
        action: 'accept',
        selectedIcd: 'J10.1',
        selectedConfidence: 0.78,
      }),
      headers: { 'content-type': 'application/json' },
    })
  )

  assert.equal(response.status, 403)
})

test('metrics route returns typed metrics for management roles', async () => {
  const metrics: DashboardOperationalMetrics = {
    shiftLabel: 'Shift Operasional',
    totalEncounters: 1,
    encountersByStatus: {
      waiting: 0,
      in_consultation: 0,
      cdss_pending: 0,
      documentation_incomplete: 0,
      completed: 1,
    },
    cdssUtilizationRate: 1,
    eklaimReadinessRate: 1,
    averageConfidenceScore: 0.91,
    overrideCount: 0,
    overrideRate: 0,
    generatedAt: '2026-03-13T10:00:00.000Z',
  }

  const handler = createMetricsGetHandler({
    getSession: () => sessionManagement,
    getIp: () => null,
    getOperationalMetrics: async () => metrics,
    writeSecurityAuditLog: async () => undefined,
  })

  const response = await handler(new Request('http://localhost/api/dashboard/intelligence/metrics'))
  const body = await response.json()

  assert.equal(response.status, 200)
  assert.deepEqual(body.data, metrics)
})

test('override route validates input and rejects malformed payloads', async () => {
  const handler = createOverridePostHandler({
    getSession: () => sessionClinical,
    getIp: () => null,
    recordOverride: async () => {
      throw new Error('should not be called')
    },
    writeSecurityAuditLog: async () => undefined,
  })

  const response = await handler(
    new Request('http://localhost/api/dashboard/intelligence/override', {
      method: 'POST',
      body: JSON.stringify({ encounterId: '' }),
      headers: { 'content-type': 'application/json' },
    })
  )

  assert.equal(response.status, 400)
})

test('override route rejects modify payloads without final ICD', async () => {
  const handler = createOverridePostHandler({
    getSession: () => sessionClinical,
    getIp: () => null,
    recordOverride: async () => {
      throw new Error('should not be called')
    },
    writeSecurityAuditLog: async () => undefined,
  })

  const response = await handler(
    new Request('http://localhost/api/dashboard/intelligence/override', {
      method: 'POST',
      body: JSON.stringify({
        encounterId: 'apt-001',
        action: 'modify',
        selectedIcd: 'J10.1',
        selectedConfidence: 0.78,
        overrideReason: 'Dokter mengubah final ICD.',
      }),
      headers: { 'content-type': 'application/json' },
    })
  )

  const body = await response.json()

  assert.equal(response.status, 400)
  assert.equal(body.success, false)
  assert.match(JSON.stringify(body.error?.validationErrors ?? []), /finalIcd/i)
})

test('override route rejects reject payloads without override reason', async () => {
  const handler = createOverridePostHandler({
    getSession: () => sessionClinical,
    getIp: () => null,
    recordOverride: async () => {
      throw new Error('should not be called')
    },
    writeSecurityAuditLog: async () => undefined,
  })

  const response = await handler(
    new Request('http://localhost/api/dashboard/intelligence/override', {
      method: 'POST',
      body: JSON.stringify({
        encounterId: 'apt-001',
        action: 'reject',
        selectedIcd: 'J10.1',
        selectedConfidence: 0.78,
      }),
      headers: { 'content-type': 'application/json' },
    })
  )

  const body = await response.json()

  assert.equal(response.status, 400)
  assert.equal(body.success, false)
  assert.match(JSON.stringify(body.error?.validationErrors ?? []), /overrideReason/i)
})

test('override route writes the audit trail before returning 200', async () => {
  const calls: string[] = []

  const handler = createOverridePostHandler({
    getSession: () => sessionClinical,
    getIp: () => null,
    recordOverride: async () => {
      calls.push('recordOverride')
      return {
        encounterId: 'apt-001',
        auditedAt: '2026-03-13T10:00:00.000Z',
      }
    },
    writeSecurityAuditLog: async () => {
      calls.push('writeSecurityAuditLog')
    },
  })

  const response = await handler(
    new Request('http://localhost/api/dashboard/intelligence/override', {
      method: 'POST',
      body: JSON.stringify({
        encounterId: 'apt-001',
        action: 'modify',
        selectedIcd: 'J10.1',
        finalIcd: 'J10.1',
        selectedConfidence: 0.78,
        overrideReason: 'Dokter memverifikasi dan menyimpan final ICD.',
      }),
      headers: { 'content-type': 'application/json' },
    })
  )

  const body = await response.json()

  assert.equal(response.status, 200)
  assert.deepEqual(calls, ['recordOverride', 'writeSecurityAuditLog'])
  assert.equal(body.success, true)
  assert.deepEqual(body.data, {
    encounterId: 'apt-001',
    auditedAt: '2026-03-13T10:00:00.000Z',
  })
})

test('override route returns 500 when audit persistence fails', async () => {
  const calls: string[] = []

  const handler = createOverridePostHandler({
    getSession: () => sessionClinical,
    getIp: () => null,
    recordOverride: async () => {
      calls.push('recordOverride')
      throw new Error('audit storage unavailable')
    },
    writeSecurityAuditLog: async () => {
      calls.push('writeSecurityAuditLog')
    },
  })

  const response = await handler(
    new Request('http://localhost/api/dashboard/intelligence/override', {
      method: 'POST',
      body: JSON.stringify({
        encounterId: 'apt-001',
        action: 'reject',
        selectedIcd: 'J10.1',
        selectedConfidence: 0.78,
        overrideReason: 'Clinician rejected the suggestion.',
      }),
      headers: { 'content-type': 'application/json' },
    })
  )

  const body = await response.json()

  assert.equal(response.status, 500)
  assert.deepEqual(calls, ['recordOverride', 'writeSecurityAuditLog'])
  assert.equal(body.success, false)
  assert.equal(body.error?.code, 'INTELLIGENCE-500')
})
