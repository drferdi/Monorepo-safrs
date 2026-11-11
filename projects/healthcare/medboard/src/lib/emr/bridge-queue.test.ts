import assert from 'node:assert/strict'
import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'
import test from 'node:test'

import type { RMETransferPayload } from './types'

// The queue directory is resolved from process.cwd() at import time: run in a temp directory.
const workDir = fs.mkdtempSync(path.join(os.tmpdir(), 'bridge-queue-test-'))
let queueModule: Promise<typeof import('./bridge-queue')> | undefined

function loadQueue() {
  if (!queueModule) {
    process.chdir(workDir)
    queueModule = import('./bridge-queue')
  }
  return queueModule
}

const payload: RMETransferPayload = {
  anamnesa: {
    keluhan_utama: 'Demam',
    keluhan_tambahan: '',
    lama_sakit: { thn: 0, bln: 0, hr: 2 },
    alergi: { obat: [], makanan: [], udara: [], lainnya: [] },
  },
}

test('a bridge entry id that walks out of the queue directory is rejected', async () => {
  const queue = await loadQueue()
  queue.createBridgeEntry('test', 'PLY-TEST-0', payload)
  fs.writeFileSync(path.join(workDir, 'runtime', 'outside.json'), JSON.stringify({ id: 'outside' }))

  assert.equal(queue.getBridgeEntry('../outside'), null)
})

test('a failure report does not overwrite a completed entry', async () => {
  const queue = await loadQueue()
  const entry = queue.createBridgeEntry('test', 'PLY-TEST-1', payload)
  queue.claimBridgeEntry(entry.id, 'assist-extension')
  queue.updateBridgeEntryStatus(entry.id, 'completed')

  assert.equal(queue.updateBridgeEntryStatus(entry.id, 'failed', undefined, 'late failure'), null)
  assert.equal(queue.getBridgeEntry(entry.id)?.status, 'completed')
})

test('an entry nobody claimed cannot be marked processing, completed or failed', async () => {
  const queue = await loadQueue()
  const entry = queue.createBridgeEntry('test', 'PLY-TEST-2', payload)

  assert.equal(queue.updateBridgeEntryStatus(entry.id, 'processing'), null)
  assert.equal(queue.updateBridgeEntryStatus(entry.id, 'failed', undefined, 'not claimed'), null)
  assert.equal(queue.getBridgeEntry(entry.id)?.status, 'pending')
})

test('a claimed entry moves through processing to completed', async () => {
  const queue = await loadQueue()
  const entry = queue.createBridgeEntry('test', 'PLY-TEST-3', payload)
  queue.claimBridgeEntry(entry.id, 'assist-extension')

  assert.equal(queue.updateBridgeEntryStatus(entry.id, 'processing')?.status, 'processing')
  assert.equal(queue.updateBridgeEntryStatus(entry.id, 'completed')?.status, 'completed')
})
