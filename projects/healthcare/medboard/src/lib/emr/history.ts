/**
 * Sentra EMR Auto-Fill Engine — Transfer History (NDJSON append-only)
 * Pattern dari src/lib/lb1/history.ts
 */

import { appendFile, mkdir, readFile } from 'node:fs/promises'
import path from 'node:path'
import type { EMRHistoryEntry } from './types'

const HISTORY_FILE = path.join(process.cwd(), 'runtime', 'emr-history.ndjson')

async function pathExists(p: string): Promise<boolean> {
  const { access } = await import('node:fs/promises')
  return access(p)
    .then(() => true)
    .catch(() => false)
}

export async function appendEMRHistory(
  entry: Omit<EMRHistoryEntry, 'id' | 'timestamp'> & {
    id?: string
    timestamp?: string
  }
): Promise<EMRHistoryEntry> {
  await mkdir(path.dirname(HISTORY_FILE), { recursive: true })

  const payload: EMRHistoryEntry = {
    id: entry.id || `emr_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
    timestamp: entry.timestamp || new Date().toISOString(),
    transferId: entry.transferId,
    patientId: entry.patientId,
    state: entry.state,
    steps: entry.steps,
    totalLatencyMs: entry.totalLatencyMs,
    error: entry.error,
    reasonCodes: entry.reasonCodes ?? [],
  }

  await appendFile(HISTORY_FILE, `${JSON.stringify(payload)}\n`, 'utf-8')
  return payload
}

export async function readEMRHistory(limit = 30): Promise<EMRHistoryEntry[]> {
  if (!(await pathExists(HISTORY_FILE))) return []

  const raw = await readFile(HISTORY_FILE, 'utf-8')
  const lines = raw
    .split(/\r?\n/)
    .map(l => l.trim())
    .filter(l => l.length > 0)

  const parsed: EMRHistoryEntry[] = []
  for (let i = lines.length - 1; i >= 0; i--) {
    try {
      parsed.push(JSON.parse(lines[i]) as EMRHistoryEntry)
      if (parsed.length >= limit) break
    } catch {
      // skip malformed line
    }
  }
  return parsed
}
