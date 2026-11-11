import assert from 'node:assert/strict'

import {
  createLogbookRepository,
  createMemoryLogbookStorage,
  isLogbookAuditEnvelope,
  pruneLogbookRecords,
} from './logbookRepository.js'
import type { LogbookAuditEnvelope } from './logbookTypes.js'

const now = Date.parse('2026-07-21T12:00:00.000Z')
const record = (id: string, ageDays: number): LogbookAuditEnvelope => ({
  id,
  schemaVersion: 2,
  createdAt: new Date(now - ageDays * 86_400_000).toISOString(),
  status: 'failed',
  durationMs: 100,
  urgency: null,
  referralCount: 0,
  resultSchemaVersion: null,
  humanReviewRequired: true,
  failureCode: 'service-unavailable',
})

const schemaV1 = {
  id: 'legacy',
  schemaVersion: 1,
  createdAt: '2026-07-21T12:00:00.000Z',
  status: 'failed',
  input: { query: 'raw narrative' },
  outcome: null,
  durationMs: 100,
  logs: ['raw provider detail'],
  errorMessage: 'raw provider error',
}
assert.equal(isLogbookAuditEnvelope(schemaV1), false)
assert.equal(isLogbookAuditEnvelope(record('valid', 0)), true)
assert.equal(isLogbookAuditEnvelope({ ...record('unsafe', 0), query: 'raw narrative' }), false)
assert.deepEqual(await createMemoryLogbookStorage([schemaV1, record('kept', 0)]).list(), [
  record('kept', 0),
])

assert.deepEqual(pruneLogbookRecords([record('old', 91), record('new', 1)], now), [
  record('new', 1),
])

const overflow = Array.from({ length: 501 }, (_, index) => record(String(index), 0))
assert.equal(pruneLogbookRecords(overflow, now).length, 500)

const failingStorage = {
  list: async () => Promise.reject(new Error('blocked')),
  put: async () => Promise.reject(new Error('blocked')),
  delete: async () => Promise.reject(new Error('blocked')),
  clear: async () => Promise.reject(new Error('blocked')),
}
const repository = createLogbookRepository({ primary: failingStorage, now: () => now })
await repository.put(record('session', 0))
assert.equal((await repository.list()).records[0]?.id, 'session')
assert.equal((await repository.list()).storageStatus, 'unavailable')

const memory = createMemoryLogbookStorage()
const persistent = createLogbookRepository({ primary: memory, now: () => now })
await persistent.put(record('saved', 0))
assert.equal((await persistent.list()).records[0]?.id, 'saved')

const migrationStorage = {
  ...createMemoryLogbookStorage(),
  async consumePrivacyMigrationNotice() {
    return true
  },
}
const migratedRepository = createLogbookRepository({
  primary: migrationStorage,
  now: () => now,
})
assert.equal((await migratedRepository.list()).privacyMigrationApplied, true)
assert.equal((await migratedRepository.list()).privacyMigrationApplied, true)

const unsafeRecord = {
  ...record('unsafe-write', 0),
  query: 'raw narrative',
  clinicalNotes: 'clinical detail',
  logs: ['raw provider log'],
  errorMessage: 'raw provider error',
  email: 'patient@example.test',
  patientIdentifier: 'MRN-9988',
} as unknown as LogbookAuditEnvelope
await assert.rejects(persistent.put(unsafeRecord), {
  name: 'TypeError',
  message: 'Invalid logbook audit envelope.',
})
assert.deepEqual(await memory.list(), [record('saved', 0)])
assert.deepEqual((await persistent.list()).records, [record('saved', 0)])

console.log('logbook repository privacy contracts passed')
