import assert from 'node:assert/strict'

import type { ICD10Result } from '../types'

import { buildCompletedLogbookRecord, buildFailedLogbookRecord } from './logbookRecordFactory.js'

const outcome = {
  schema_version: 2,
  code: 'I20.0',
  description: 'Unstable angina for patient MRN-9988',
  category: 'Cardiovascular',
  urgency: 'urgent',
  triage_score: 8,
  clinical_notes: 'Contact patient@example.test',
  evidence: {
    clinical_reasoning: 'Synthetic reasoning',
    red_flags: ['chest pain'],
    differential_diagnosis: ['Acute coronary syndrome'],
  },
  proposed_referrals: [
    {
      code: 'R-001',
      description: 'Cardiology review',
      kompetensi: '3B',
      destination_service: 'Cardiology',
      facility_level: 'Secondary',
      referral_reason: 'Persistent synthetic symptoms',
      required_capability: 'Cardiac monitoring',
      urgency: 'urgent',
      clinical_reasoning: 'Synthetic referral reasoning',
    },
  ],
} as ICD10Result

const completed = buildCompletedLogbookRecord({
  id: 'medlink-1',
  createdAt: '2026-07-21T12:00:00.000Z',
  durationMs: 245,
  outcome,
})
assert.deepEqual(completed, {
  id: 'medlink-1',
  schemaVersion: 2,
  createdAt: '2026-07-21T12:00:00.000Z',
  status: 'completed',
  durationMs: 245,
  urgency: 'urgent',
  referralCount: 1,
  resultSchemaVersion: 2,
  humanReviewRequired: true,
  failureCode: null,
})

const failed = buildFailedLogbookRecord({
  id: 'medlink-2',
  createdAt: '2026-07-21T12:00:00.000Z',
  durationMs: 125,
  failureCode: 'service-unavailable',
})
assert.deepEqual(failed, {
  id: 'medlink-2',
  schemaVersion: 2,
  createdAt: '2026-07-21T12:00:00.000Z',
  status: 'failed',
  durationMs: 125,
  urgency: null,
  referralCount: 0,
  resultSchemaVersion: null,
  humanReviewRequired: true,
  failureCode: 'service-unavailable',
})

const serialized = JSON.stringify(completed)
for (const sensitiveValue of [
  'I20.0',
  'Unstable angina',
  'MRN-9988',
  'patient@example.test',
  'Persistent synthetic symptoms',
  'Synthetic reasoning',
]) {
  assert.doesNotMatch(serialized, new RegExp(sensitiveValue, 'i'))
}
assert.deepEqual(Object.keys(completed), [
  'id',
  'schemaVersion',
  'createdAt',
  'status',
  'durationMs',
  'urgency',
  'referralCount',
  'resultSchemaVersion',
  'humanReviewRequired',
  'failureCode',
])

console.log('logbook record factory privacy contracts passed')
