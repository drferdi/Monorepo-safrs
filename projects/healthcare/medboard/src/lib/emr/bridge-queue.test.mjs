// Bridge Queue unit tests — collocated with source
// Tests: createBridgeEntry, getBridgeEntry, listBridgeEntries, claimBridgeEntry,
//        updateBridgeEntryStatus, getBridgeStats
//
// Uses .mjs for ESM top-level await — required to mock "server-only" before import
import assert from 'node:assert/strict'
import fs from 'node:fs'
import Module from 'node:module'
import path from 'node:path'
import test, { afterEach, describe } from 'node:test'

// ── Mock "server-only" before importing bridge-queue ────────────────────────
const nodeModule = Module
const originalLoad = nodeModule._load
nodeModule._load = function patchedLoad(request, parent, isMain) {
  if (request === 'server-only') return {}
  return originalLoad.call(this, request, parent, isMain)
}

const {
  createBridgeEntry,
  getBridgeEntry,
  listBridgeEntries,
  claimBridgeEntry,
  updateBridgeEntryStatus,
  getBridgeStats,
} = await import('./bridge-queue.ts')

// ── Test helpers ────────────────────────────────────────────────────────────
const TEST_QUEUE_DIR = path.join(process.cwd(), 'runtime', 'bridge-queue')

function makeMockPayload() {
  return {
    anamnesa: {
      keluhan_utama: 'Demam 3 hari',
      riwayat_penyakit_sekarang: 'Demam naik turun',
    },
  }
}

function cleanTestEntries(ids) {
  for (const id of ids) {
    const fp = path.join(TEST_QUEUE_DIR, `${id}.json`)
    try {
      fs.unlinkSync(fp)
    } catch {
      /* ok */
    }
  }
}

// ── Tests ───────────────────────────────────────────────────────────────────
describe('bridge-queue', () => {
  const createdIds = []

  afterEach(() => {
    cleanTestEntries(createdIds)
    createdIds.length = 0
  })

  describe('createBridgeEntry', () => {
    test('creates entry with correct structure', () => {
      const entry = createBridgeEntry('dr-test', 'PEL-001', makeMockPayload(), 'Pasien Test')
      createdIds.push(entry.id)

      assert.ok(entry.id.startsWith('brg_'), 'ID harus prefix brg_')
      assert.equal(entry.status, 'pending')
      assert.equal(entry.createdBy, 'dr-test')
      assert.equal(entry.pelayananId, 'PEL-001')
      assert.equal(entry.patientName, 'Pasien Test')
      assert.ok(entry.createdAt, 'createdAt harus ada')
      assert.ok(entry.payload.anamnesa, 'payload.anamnesa harus ada')
    })

    test('persists entry to filesystem', () => {
      const entry = createBridgeEntry('dr-test', 'PEL-002', makeMockPayload())
      createdIds.push(entry.id)

      const fp = path.join(TEST_QUEUE_DIR, `${entry.id}.json`)
      assert.ok(fs.existsSync(fp), 'File JSON harus ada di disk')

      const raw = JSON.parse(fs.readFileSync(fp, 'utf-8'))
      assert.equal(raw.id, entry.id)
      assert.equal(raw.status, 'pending')
    })
  })

  describe('getBridgeEntry', () => {
    test('returns entry by ID', () => {
      const entry = createBridgeEntry('dr-test', 'PEL-003', makeMockPayload())
      createdIds.push(entry.id)

      const fetched = getBridgeEntry(entry.id)
      assert.ok(fetched, 'Entry harus ditemukan')
      assert.equal(fetched.id, entry.id)
      assert.equal(fetched.pelayananId, 'PEL-003')
    })

    test('returns null for non-existent ID', () => {
      const fetched = getBridgeEntry('brg_nonexistent_00000000')
      assert.equal(fetched, null)
    })
  })

  describe('claimBridgeEntry', () => {
    test('claims pending entry', () => {
      const entry = createBridgeEntry('dr-test', 'PEL-004', makeMockPayload())
      createdIds.push(entry.id)

      const claimed = claimBridgeEntry(entry.id, 'assist-v1')
      assert.ok(claimed, 'Claim harus berhasil')
      assert.equal(claimed.status, 'claimed')
      assert.equal(claimed.claimedBy, 'assist-v1')
      assert.ok(claimed.claimedAt, 'claimedAt harus ada')
    })

    test('rejects double claim', () => {
      const entry = createBridgeEntry('dr-test', 'PEL-005', makeMockPayload())
      createdIds.push(entry.id)

      claimBridgeEntry(entry.id, 'assist-v1')
      const secondClaim = claimBridgeEntry(entry.id, 'assist-v2')
      assert.equal(secondClaim, null, 'Double claim harus gagal')
    })

    test('rejects claim on non-existent entry', () => {
      const result = claimBridgeEntry('brg_fake_00000000', 'assist-v1')
      assert.equal(result, null)
    })
  })

  describe('updateBridgeEntryStatus', () => {
    test('transitions claimed to processing', () => {
      const entry = createBridgeEntry('dr-test', 'PEL-006', makeMockPayload())
      createdIds.push(entry.id)
      claimBridgeEntry(entry.id, 'assist-v1')

      const updated = updateBridgeEntryStatus(entry.id, 'processing')
      assert.ok(updated)
      assert.equal(updated.status, 'processing')
    })

    test('transitions processing to completed with result', () => {
      const entry = createBridgeEntry('dr-test', 'PEL-007', makeMockPayload())
      createdIds.push(entry.id)
      claimBridgeEntry(entry.id, 'assist-v1')
      updateBridgeEntryStatus(entry.id, 'processing')

      const result = { state: 'success', filledFields: 3 }
      const completed = updateBridgeEntryStatus(entry.id, 'completed', result)
      assert.ok(completed)
      assert.equal(completed.status, 'completed')
      assert.ok(completed.completedAt, 'completedAt harus ada')
      assert.deepEqual(completed.result, result)
    })

    test('transitions to failed with error message', () => {
      const entry = createBridgeEntry('dr-test', 'PEL-008', makeMockPayload())
      createdIds.push(entry.id)

      const failed = updateBridgeEntryStatus(
        entry.id,
        'failed',
        undefined,
        'Timeout saat mengisi ePuskesmas'
      )
      assert.ok(failed)
      assert.equal(failed.status, 'failed')
      assert.equal(failed.error, 'Timeout saat mengisi ePuskesmas')
      assert.ok(failed.completedAt)
    })

    test('returns null for non-existent entry', () => {
      const result = updateBridgeEntryStatus('brg_fake_00000000', 'processing')
      assert.equal(result, null)
    })
  })

  describe('listBridgeEntries', () => {
    test('filters by status', () => {
      const e1 = createBridgeEntry('dr-test', 'PEL-009', makeMockPayload())
      const e2 = createBridgeEntry('dr-test', 'PEL-010', makeMockPayload())
      createdIds.push(e1.id, e2.id)
      claimBridgeEntry(e2.id, 'assist-v1')

      const pending = listBridgeEntries({ status: ['pending'] })
      const pendingIds = pending.map(e => e.id)
      assert.ok(pendingIds.includes(e1.id), 'e1 harus ada di pending')
      assert.ok(!pendingIds.includes(e2.id), 'e2 sudah claimed, bukan pending')
    })

    test('respects limit parameter', () => {
      const ids = []
      for (let i = 0; i < 3; i++) {
        const e = createBridgeEntry('dr-test', `PEL-LIM-${i}`, makeMockPayload())
        ids.push(e.id)
      }
      createdIds.push(...ids)

      const limited = listBridgeEntries({ limit: 2 })
      assert.ok(limited.length <= 2, `Limit 2, got ${limited.length}`)
    })
  })

  describe('getBridgeStats', () => {
    test('returns correct counts', () => {
      const e1 = createBridgeEntry('dr-test', 'PEL-S1', makeMockPayload())
      const e2 = createBridgeEntry('dr-test', 'PEL-S2', makeMockPayload())
      createdIds.push(e1.id, e2.id)
      claimBridgeEntry(e2.id, 'assist-v1')

      const stats = getBridgeStats()
      assert.ok(stats.total >= 2, 'Total harus >= 2')
      assert.ok(stats.pending >= 1, 'Pending harus >= 1')
      assert.ok(stats.claimed >= 1, 'Claimed harus >= 1')
    })
  })
})
