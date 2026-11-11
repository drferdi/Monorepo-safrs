import { appendFile, mkdir, readFile } from 'node:fs/promises'
import path from 'node:path'
import { getHistoryFile, pathExists } from './config'
import type { RunHistoryEntry } from './types'

export type { RunHistoryEntry }

export async function appendRunHistory(
  entry: Omit<RunHistoryEntry, 'id' | 'timestamp'> & {
    id?: string
    timestamp?: string
  }
): Promise<RunHistoryEntry> {
  const historyFile = getHistoryFile()
  await mkdir(path.dirname(historyFile), { recursive: true })

  const payload: RunHistoryEntry = {
    id: entry.id || `run_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
    timestamp: entry.timestamp || new Date().toISOString(),
    mode: entry.mode,
    year: entry.year,
    month: entry.month,
    status: entry.status,
    command: entry.command || 'ts-engine',
    code: Number.isFinite(entry.code) ? entry.code : 0,
    outputFile: entry.outputFile || '',
    summaryFile: entry.summaryFile || '',
    validRows: Number.isFinite(entry.validRows) ? entry.validRows : 0,
    invalidRows: Number.isFinite(entry.invalidRows) ? entry.invalidRows : 0,
    rawatJalan: Number.isFinite(entry.rawatJalan) ? entry.rawatJalan : 0,
    rawatInap: Number.isFinite(entry.rawatInap) ? entry.rawatInap : 0,
    error: entry.error || '',
  }

  await appendFile(historyFile, `${JSON.stringify(payload)}\n`, 'utf-8')
  return payload
}

export async function readRunHistory(limit = 30): Promise<RunHistoryEntry[]> {
  const historyFile = getHistoryFile()
  if (!(await pathExists(historyFile))) return []

  const raw = await readFile(historyFile, 'utf-8')
  const lines = raw
    .split(/\r?\n/)
    .map(l => l.trim())
    .filter(l => l.length > 0)

  const parsed: RunHistoryEntry[] = []
  for (let i = lines.length - 1; i >= 0; i--) {
    try {
      parsed.push(JSON.parse(lines[i]) as RunHistoryEntry)
      if (parsed.length >= limit) break
    } catch {
      // skip malformed line
    }
  }
  return parsed
}
