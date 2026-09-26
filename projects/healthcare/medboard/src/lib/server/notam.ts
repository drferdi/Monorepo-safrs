import 'server-only'

import fs from 'node:fs'
import path from 'node:path'
import { resolveRuntimeDataFile } from '@/lib/server/runtime-data-path'

/* ── Types ── */

export interface NOTAMRecord {
  id: string
  title: string
  body: string
  priority: 'info' | 'warning' | 'urgent'
  createdBy: string
  createdByName: string
  createdAt: string
  expiresAt: string | null
  active: boolean
}

interface CreateNOTAMInput {
  title: string
  body: string
  priority: 'info' | 'warning' | 'urgent'
  expiresAt: string | null
}

interface NOTAMAuthor {
  username: string
  displayName: string
}

/* ── File paths ── */

function getNotamFilePath(): string {
  return resolveRuntimeDataFile('notam-board.json')
}

function getNotamLockFilePath(): string {
  return `${getNotamFilePath()}.lock`
}

function ensureRuntimeDirectory(filePath: string): void {
  fs.mkdirSync(path.dirname(filePath), { recursive: true })
}

/* ── File locking (same pattern as crew-access-registration.ts) ── */

async function withNotamLock<T>(task: () => Promise<T>): Promise<T> {
  const lockPath = getNotamLockFilePath()
  ensureRuntimeDirectory(lockPath)
  const startedAt = Date.now()

  while (true) {
    try {
      const handle = fs.openSync(lockPath, 'wx')

      try {
        return await task()
      } finally {
        fs.closeSync(handle)
        fs.rmSync(lockPath, { force: true })
      }
    } catch (error) {
      const isLockBusy =
        error instanceof Error &&
        'code' in error &&
        (error as NodeJS.ErrnoException).code === 'EEXIST'
      if (!isLockBusy) throw error

      /* Remove stale locks left by crashed processes (>5s old) */
      try {
        const stat = fs.statSync(lockPath)
        if (Date.now() - stat.mtimeMs > 5_000) {
          fs.rmSync(lockPath, { force: true })
          continue
        }
      } catch {
        /* lock file disappeared, retry */ continue
      }

      if (Date.now() - startedAt > 2000) {
        throw new Error('Sistem NOTAM sedang sibuk. Silakan coba lagi beberapa saat.')
      }

      await new Promise(resolve => setTimeout(resolve, 50))
    }
  }
}

/* ── CRUD Operations ── */

export function loadNotams(): NOTAMRecord[] {
  const filePath = getNotamFilePath()
  if (!fs.existsSync(filePath)) return []

  const raw = fs.readFileSync(filePath, 'utf-8').trim()
  if (!raw) return []

  try {
    const parsed = JSON.parse(raw) as unknown
    return Array.isArray(parsed) ? (parsed as NOTAMRecord[]) : []
  } catch {
    throw new Error('File NOTAM board rusak dan perlu diperbaiki.')
  }
}

function saveNotams(records: NOTAMRecord[]): void {
  const filePath = getNotamFilePath()
  ensureRuntimeDirectory(filePath)

  const tempPath = `${filePath}.tmp`
  fs.writeFileSync(tempPath, JSON.stringify(records, null, 2), 'utf-8')
  fs.renameSync(tempPath, filePath)
}

const VALID_PRIORITIES = new Set(['info', 'warning', 'urgent'])

function validateCreateInput(raw: unknown): CreateNOTAMInput {
  if (!raw || typeof raw !== 'object') {
    throw new Error('Payload NOTAM tidak valid.')
  }

  const body = raw as Record<string, unknown>
  const title = String(body.title ?? '').trim()
  const content = String(body.body ?? '').trim()
  const priority = String(body.priority ?? 'info').trim()
  const expiresAt = body.expiresAt ? String(body.expiresAt).trim() : null

  if (!title || title.length < 3 || title.length > 200) {
    throw new Error('Judul NOTAM harus 3-200 karakter.')
  }

  if (!content || content.length < 3 || content.length > 2000) {
    throw new Error('Isi NOTAM harus 3-2000 karakter.')
  }

  if (!VALID_PRIORITIES.has(priority)) {
    throw new Error('Prioritas harus salah satu dari: info, warning, urgent.')
  }

  if (expiresAt) {
    const parsed = new Date(expiresAt)
    if (Number.isNaN(parsed.getTime())) {
      throw new Error('Tanggal kedaluwarsa tidak valid.')
    }
    if (parsed <= new Date()) {
      throw new Error('Tanggal kedaluwarsa harus di masa mendatang.')
    }
  }

  return {
    title,
    body: content,
    priority: priority as 'info' | 'warning' | 'urgent',
    expiresAt,
  }
}

export async function createNotam(raw: unknown, author: NOTAMAuthor): Promise<NOTAMRecord> {
  const input = validateCreateInput(raw)

  return withNotamLock(async () => {
    const records = loadNotams()

    const record: NOTAMRecord = {
      id: `notam_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
      title: input.title,
      body: input.body,
      priority: input.priority,
      createdBy: author.username,
      createdByName: author.displayName,
      createdAt: new Date().toISOString(),
      expiresAt: input.expiresAt,
      active: true,
    }

    records.push(record)
    saveNotams(records)

    return record
  })
}

export async function deactivateNotam(id: string): Promise<boolean> {
  return withNotamLock(async () => {
    const records = loadNotams()
    const index = records.findIndex(r => r.id === id)
    if (index < 0) return false

    records[index] = { ...records[index], active: false }
    saveNotams(records)

    return true
  })
}

export function getActiveNotams(): NOTAMRecord[] {
  const records = loadNotams()
  const now = new Date()

  return records.filter(r => {
    if (!r.active) return false
    if (r.expiresAt) {
      const expiry = new Date(r.expiresAt)
      if (expiry <= now) return false
    }
    return true
  })
}

export function listAllNotams(): NOTAMRecord[] {
  return loadNotams()
}
