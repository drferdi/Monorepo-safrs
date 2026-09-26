import assert from 'node:assert/strict'
import test from 'node:test'

import type { DashboardOperationalMetrics } from '@abyss/types'

import {
  extractOperationalMetrics,
  getOperationalMetricsErrorMessage,
} from './useOperationalMetrics'

const metrics: DashboardOperationalMetrics = {
  shiftLabel: 'Shift Operasional',
  totalEncounters: 8,
  encountersByStatus: {
    waiting: 1,
    in_consultation: 2,
    cdss_pending: 1,
    documentation_incomplete: 1,
    completed: 3,
  },
  cdssUtilizationRate: 0.5,
  eklaimReadinessRate: 0.625,
  averageConfidenceScore: 0.81,
  overrideCount: 2,
  overrideRate: 0.25,
  generatedAt: '2026-03-13T10:00:00.000Z',
}

test('extractOperationalMetrics accepts success-based API responses', () => {
  assert.deepEqual(
    extractOperationalMetrics({
      success: true,
      data: metrics,
    }),
    metrics
  )
})

test('extractOperationalMetrics returns null for invalid payloads', () => {
  assert.equal(
    extractOperationalMetrics({
      ok: true,
      data: metrics,
    }),
    null
  )
})

test('getOperationalMetricsErrorMessage maps auth failures to role-aware copy', () => {
  assert.equal(
    getOperationalMetricsErrorMessage(403),
    'Ringkasan operasional hanya tersedia untuk role manajemen.'
  )
  assert.equal(
    getOperationalMetricsErrorMessage(401),
    'Sesi berakhir. Silakan login kembali untuk memuat ringkasan operasional.'
  )
})
