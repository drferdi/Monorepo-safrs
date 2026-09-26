import assert from 'node:assert/strict'
import test from 'node:test'

import type { DashboardOperationalMetrics } from '@abyss/types'

import {
  buildDashboardEncounterSummary,
  buildDashboardOperationalMetrics,
  canAccessIntelligenceEncounters,
  canAccessIntelligenceInsights,
  canAccessIntelligenceMetrics,
  canSubmitIntelligenceOverride,
  resolveIntelligenceDashboardAccess,
  sanitizeIntelligenceMetadata,
  type TemporaryEncounterRecord,
} from './server'

function createEncounterRecord(
  overrides: Partial<TemporaryEncounterRecord> = {}
): TemporaryEncounterRecord {
  return {
    id: 'apt-001',
    patientId: 'PATIENT-RAW-001',
    doctorId: 'doctor-1',
    scheduledAt: '2026-03-13T09:00:00.000Z',
    startedAt: '2026-03-13T09:05:00.000Z',
    endedAt: '2026-03-13T09:20:00.000Z',
    updatedAt: '2026-03-13T09:30:00.000Z',
    status: 'COMPLETED',
    keluhanUtama: 'Demam sejak tadi pagi',
    riwayatPenyakit: 'Hipertensi terkontrol',
    anamnesis: 'Pasien datang dengan keluhan demam dan batuk',
    pemeriksaan: null,
    diagnosis: null,
    diagnosaICD10: null,
    resepDigital: null,
    rujukan: false,
    rujukanTujuan: null,
    ...overrides,
  }
}

test('temporary RBAC follows the approved intelligence role groups', () => {
  assert.equal(canAccessIntelligenceEncounters('DOKTER'), true)
  assert.equal(canAccessIntelligenceEncounters('PERAWAT'), true)
  assert.equal(canAccessIntelligenceEncounters('KEPALA_PUSKESMAS'), true)
  assert.equal(canAccessIntelligenceEncounters('CEO_SENTRA'), true)
  assert.equal(canAccessIntelligenceEncounters('PUBLIC'), false)

  assert.equal(canAccessIntelligenceInsights('DOKTER'), true)
  assert.equal(canAccessIntelligenceInsights('PERAWAT'), true)
  assert.equal(canAccessIntelligenceInsights('KEPALA_PUSKESMAS'), false)
  assert.equal(canAccessIntelligenceInsights('CEO_SENTRA'), true)

  assert.equal(canAccessIntelligenceMetrics('ADMINISTRATOR'), true)
  assert.equal(canAccessIntelligenceMetrics('KEPALA_PUSKESMAS'), true)
  assert.equal(canAccessIntelligenceMetrics('CEO_SENTRA'), true)
  assert.equal(canAccessIntelligenceMetrics('DOKTER'), false)

  assert.equal(canSubmitIntelligenceOverride('DOKTER'), true)
  assert.equal(canSubmitIntelligenceOverride('CEO_SENTRA'), true)
  assert.equal(canSubmitIntelligenceOverride('KEPALA_PUSKESMAS'), false)
  assert.equal(canSubmitIntelligenceOverride('PUBLIC'), false)
})

test('resolveIntelligenceDashboardAccess splits clinical and management surfaces', () => {
  assert.deepEqual(resolveIntelligenceDashboardAccess('DOKTER'), {
    canViewAlerts: true,
    canViewEncounters: true,
    canViewInsights: true,
    canViewMetrics: false,
    canSubmitOverride: true,
    hasAnyAccess: true,
  })

  assert.deepEqual(resolveIntelligenceDashboardAccess('KEPALA_PUSKESMAS'), {
    canViewAlerts: true,
    canViewEncounters: true,
    canViewInsights: false,
    canViewMetrics: true,
    canSubmitOverride: false,
    hasAnyAccess: true,
  })

  assert.deepEqual(resolveIntelligenceDashboardAccess('CEO_SENTRA'), {
    canViewAlerts: true,
    canViewEncounters: true,
    canViewInsights: true,
    canViewMetrics: true,
    canSubmitOverride: true,
    hasAnyAccess: true,
  })

  assert.deepEqual(resolveIntelligenceDashboardAccess('PUBLIC'), {
    canViewAlerts: false,
    canViewEncounters: false,
    canViewInsights: false,
    canViewMetrics: false,
    canSubmitOverride: false,
    hasAnyAccess: false,
  })
})

test('encounter summary uses a PHI-safe label and compliance enrichment', () => {
  const summary = buildDashboardEncounterSummary({
    encounter: createEncounterRecord(),
    suggestions: [],
    alerts: [],
  })

  assert.equal(summary.encounterId, 'apt-001')
  assert.notEqual(summary.patientLabel, 'PATIENT-RAW-001')
  assert.equal(summary.status, 'documentation_incomplete')
  assert.equal(summary.eklaimReadiness.isReady, false)
  assert.ok(summary.eklaimReadiness.blockers.length > 0)
  assert.ok(summary.activeComplianceFailures.some(issue => issue.code === 'DOC-002'))
  assert.equal(summary.lastUpdatedAt, '2026-03-13T09:30:00.000Z')
})

test('encounter summary promotes completed encounters with enough data to completed status', () => {
  const summary = buildDashboardEncounterSummary({
    encounter: createEncounterRecord({
      diagnosis: 'Influenza',
      diagnosaICD10: 'J10.1',
      pemeriksaan: 'Suhu 38.1C',
      resepDigital: [
        {
          medicationName: 'Paracetamol',
          dosage: '500 mg',
          frequency: '3x sehari',
          route: 'oral',
          duration: '3 hari',
          quantity: 10,
        },
      ],
    }),
    suggestions: [],
    alerts: [],
  })

  assert.equal(summary.status, 'completed')
  assert.equal(summary.eklaimReadiness.isReady, true)
  assert.deepEqual(summary.activeComplianceFailures, [])
})

test('operational metrics aggregate encounter counts and AI rates', () => {
  const metrics = buildDashboardOperationalMetrics({
    encounterSummaries: [
      buildDashboardEncounterSummary({
        encounter: createEncounterRecord({
          id: 'apt-001',
          diagnosis: 'Influenza',
          diagnosaICD10: 'J10.1',
          pemeriksaan: 'Suhu 38.1C',
          resepDigital: [
            {
              medicationName: 'Paracetamol',
              dosage: '500 mg',
              frequency: '3x sehari',
              route: 'oral',
              duration: '3 hari',
              quantity: 10,
            },
          ],
        }),
        suggestions: [],
        alerts: [],
      }),
      buildDashboardEncounterSummary({
        encounter: createEncounterRecord({
          id: 'apt-002',
          status: 'IN_PROGRESS',
          diagnosis: null,
          diagnosaICD10: null,
          pemeriksaan: null,
          resepDigital: null,
        }),
        suggestions: [],
        alerts: [],
      }),
    ],
    cdssUsageCount: 1,
    overrideCount: 2,
    averageConfidenceScore: 0.82,
    generatedAt: '2026-03-13T10:00:00.000Z',
  })

  const expected: DashboardOperationalMetrics = {
    shiftLabel: 'Shift Operasional',
    totalEncounters: 2,
    encountersByStatus: {
      waiting: 0,
      in_consultation: 0,
      cdss_pending: 1,
      documentation_incomplete: 0,
      completed: 1,
    },
    cdssUtilizationRate: 0.5,
    eklaimReadinessRate: 0.5,
    averageConfidenceScore: 0.82,
    overrideCount: 2,
    overrideRate: 1,
    generatedAt: '2026-03-13T10:00:00.000Z',
  }

  assert.deepEqual(metrics, expected)
})

test('metadata scrubbing removes direct PHI-bearing fields before audit logging', () => {
  const scrubbed = sanitizeIntelligenceMetadata({
    encounterId: 'apt-001',
    patientId: 'PATIENT-RAW-001',
    medicalRecordNumber: 'RM-7788',
    bpjsNumber: '0001112223334',
    anamnesis: 'Pasien datang dengan keluhan batuk dan demam',
    selectedIcd: 'J10.1',
  })

  assert.deepEqual(scrubbed, {
    encounterId: 'apt-001',
    selectedIcd: 'J10.1',
  })
})
