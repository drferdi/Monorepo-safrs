import assert from 'node:assert/strict'
import test from 'node:test'

import type { DashboardEncounterSummary } from '@abyss/types'

import {
  type EncounterQueueItem,
  extractEncounterQueueData,
  getEncounterQueueErrorMessage,
  mergeEncounterUpdate,
} from './useEncounterQueue'

const encounterSummaries: DashboardEncounterSummary[] = [
  {
    encounterId: 'enc-001',
    patientLabel: 'Pasien #001',
    status: 'waiting',
    suggestions: [],
    alerts: [],
    eklaimReadiness: {
      isReady: false,
      checkedAt: '2026-03-13T10:00:00.000Z',
      blockers: [
        {
          code: 'EKL-001',
          message: 'Diagnosis primer belum ditetapkan',
          severity: 'critical',
        },
      ],
    },
    activeComplianceFailures: [
      {
        code: 'DOC-002',
        message: 'Tanda vital belum dicatat',
        severity: 'warning',
      },
    ],
    lastUpdatedAt: '2026-03-13T10:00:00.000Z',
  },
]

const queueItems: EncounterQueueItem[] = [
  {
    encounterId: 'enc-001',
    patientLabel: 'Pasien #001',
    status: 'waiting',
    note: 'Tanda vital belum dicatat',
    timestamp: '2026-03-13T10:00:00.000Z',
  },
]

test('extractEncounterQueueData accepts success-based API responses', () => {
  assert.deepEqual(
    extractEncounterQueueData({
      success: true,
      data: encounterSummaries,
    }),
    queueItems
  )
})

test('extractEncounterQueueData returns null for invalid payloads', () => {
  assert.equal(
    extractEncounterQueueData({
      ok: true,
      data: encounterSummaries,
    }),
    null
  )
})

test('getEncounterQueueErrorMessage maps auth failures to dashboard copy', () => {
  assert.equal(
    getEncounterQueueErrorMessage(403),
    'Akses antrian intelligence dibatasi untuk role saat ini.'
  )
  assert.equal(
    getEncounterQueueErrorMessage(401),
    'Sesi berakhir. Silakan login kembali untuk memuat antrian intelligence.'
  )
})

test('mergeEncounterUpdate keeps existing patient label when live payload omits it', () => {
  assert.deepEqual(
    mergeEncounterUpdate(queueItems, {
      encounterId: 'enc-001',
      patientLabel: 'Pasien',
      status: 'in_consultation',
      note: '',
      timestamp: '2026-03-13T10:05:00.000Z',
    }),
    [
      {
        encounterId: 'enc-001',
        patientLabel: 'Pasien #001',
        status: 'in_consultation',
        note: 'Tanda vital belum dicatat',
        timestamp: '2026-03-13T10:05:00.000Z',
      },
    ]
  )
})
