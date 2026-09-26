import assert from 'node:assert/strict'

import { buildSentraBoardSummary, filterLogbookRecords } from './logbookSelectors.js'
import type { LogbookAuditEnvelope } from './logbookTypes.js'

const records: LogbookAuditEnvelope[] = [
  {
    id: '2',
    schemaVersion: 2,
    createdAt: '2026-07-21T12:00:00.000Z',
    status: 'completed',
    durationMs: 300,
    urgency: 'urgent',
    referralCount: 2,
    resultSchemaVersion: 2,
    humanReviewRequired: true,
    failureCode: null,
  },
  {
    id: '1',
    schemaVersion: 2,
    createdAt: '2026-07-20T12:00:00.000Z',
    status: 'failed',
    durationMs: 100,
    urgency: null,
    referralCount: 0,
    resultSchemaVersion: null,
    humanReviewRequired: true,
    failureCode: 'network',
  },
]

assert.deepEqual(buildSentraBoardSummary(records), {
  total: 2,
  completed: 1,
  attention: 1,
  averageDurationMs: 200,
  recent: records,
})
assert.deepEqual(filterLogbookRecords(records, { urgency: 'urgent' }), [records[0]])
assert.deepEqual(filterLogbookRecords(records, { status: 'failed' }), [records[1]])
assert.deepEqual(filterLogbookRecords(records, { from: '2026-07-21', to: '2026-07-21' }), [
  records[0],
])

console.log('logbook selector envelope contracts passed')
