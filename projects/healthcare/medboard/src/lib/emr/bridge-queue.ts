import 'server-only'

import { randomBytes } from 'node:crypto'
import fs from 'node:fs'
import path from 'node:path'

import type { RMETransferPayload, RMETransferResult } from './types'

// ============================================================================
// BRIDGE QUEUE — File-based queue for Dashboard → Assist transfers
// ============================================================================

export type BridgeEntryStatus =
  | 'pending'
  | 'claimed'
  | 'processing'
  | 'completed'
  | 'failed'
  | 'expired'

export interface BridgeQueueEntry {
  id: string
  createdAt: string
  createdBy: string
  status: BridgeEntryStatus
  pelayananId: string
  patientName?: string
  payload: RMETransferPayload
  result?: RMETransferResult
  claimedAt?: string
  claimedBy?: string
  completedAt?: string
  error?: string
}

const QUEUE_DIR = path.join(process.cwd(), 'runtime', 'bridge-queue')
const ENTRY_TTL_MS = 4 * 60 * 60 * 1000 // 4 hours

function ensureQueueDir(): void {
  if (!fs.existsSync(QUEUE_DIR)) {
    fs.mkdirSync(QUEUE_DIR, { recursive: true })
  }
}

function entryPath(id: string): string {
  return path.join(QUEUE_DIR, `${id}.json`)
}

function generateId(): string {
  const ts = Date.now().toString(36)
  const rand = randomBytes(4).toString('hex')
  return `brg_${ts}_${rand}`
}

function readEntry(filePath: string): BridgeQueueEntry | null {
  try {
    const raw = fs.readFileSync(filePath, 'utf-8')
    return JSON.parse(raw) as BridgeQueueEntry
  } catch {
    return null
  }
}

function writeEntry(entry: BridgeQueueEntry): void {
  ensureQueueDir()
  const tmp = `${entryPath(entry.id)}.tmp`
  fs.writeFileSync(tmp, JSON.stringify(entry, null, 2), 'utf-8')
  fs.renameSync(tmp, entryPath(entry.id))
}

// ============================================================================
// PUBLIC API
// ============================================================================

export function createBridgeEntry(
  createdBy: string,
  pelayananId: string,
  payload: RMETransferPayload,
  patientName?: string
): BridgeQueueEntry {
  const entry: BridgeQueueEntry = {
    id: generateId(),
    createdAt: new Date().toISOString(),
    createdBy,
    status: 'pending',
    pelayananId,
    patientName,
    payload,
  }
  writeEntry(entry)
  return entry
}

export function getBridgeEntry(id: string): BridgeQueueEntry | null {
  const fp = entryPath(id)
  if (!fs.existsSync(fp)) return null
  return readEntry(fp)
}

export function listBridgeEntries(filter?: {
  status?: BridgeEntryStatus | BridgeEntryStatus[]
  limit?: number
}): BridgeQueueEntry[] {
  ensureQueueDir()

  const files = fs.readdirSync(QUEUE_DIR).filter(f => f.endsWith('.json'))
  const entries: BridgeQueueEntry[] = []
  const now = Date.now()

  for (const file of files) {
    const entry = readEntry(path.join(QUEUE_DIR, file))
    if (!entry) continue

    // Auto-expire stale pending entries
    if (entry.status === 'pending' && now - new Date(entry.createdAt).getTime() > ENTRY_TTL_MS) {
      entry.status = 'expired'
      writeEntry(entry)
      continue
    }

    if (filter?.status) {
      const statuses = Array.isArray(filter.status) ? filter.status : [filter.status]
      if (!statuses.includes(entry.status)) continue
    }

    entries.push(entry)
  }

  // Sort newest first
  entries.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())

  if (filter?.limit && filter.limit > 0) {
    return entries.slice(0, filter.limit)
  }

  return entries
}

export function claimBridgeEntry(id: string, claimedBy: string): BridgeQueueEntry | null {
  const entry = getBridgeEntry(id)
  if (!entry || entry.status !== 'pending') return null

  entry.status = 'claimed'
  entry.claimedAt = new Date().toISOString()
  entry.claimedBy = claimedBy
  writeEntry(entry)

  return entry
}

export function updateBridgeEntryStatus(
  id: string,
  status: 'processing' | 'completed' | 'failed',
  result?: RMETransferResult,
  error?: string
): BridgeQueueEntry | null {
  const entry = getBridgeEntry(id)
  if (!entry) return null

  entry.status = status
  if (result) entry.result = result
  if (error) entry.error = error
  if (status === 'completed' || status === 'failed') {
    entry.completedAt = new Date().toISOString()
  }
  writeEntry(entry)

  return entry
}

export function getBridgeStats(): {
  pending: number
  claimed: number
  processing: number
  completed: number
  failed: number
  total: number
} {
  const entries = listBridgeEntries()
  const stats = {
    pending: 0,
    claimed: 0,
    processing: 0,
    completed: 0,
    failed: 0,
    total: 0,
  }
  for (const entry of entries) {
    stats.total++
    if (entry.status in stats) {
      stats[entry.status as keyof typeof stats]++
    }
  }
  return stats
}
