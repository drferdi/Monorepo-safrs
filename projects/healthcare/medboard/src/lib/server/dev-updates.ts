import 'server-only'

import fs from 'node:fs'
import path from 'node:path'
import { resolveRuntimeDataFile } from '@/lib/server/runtime-data-path'
import type { DevUpdateCategory, DevUpdateRecord } from '@/lib/dev-updates'

interface CreateDevUpdateInput {
  title: string
  body: string
  category: DevUpdateCategory
  expiresAt: string | null
}

interface DevUpdateAuthor {
  username: string
  displayName: string
}

function getDevUpdateFilePath(): string {
  return resolveRuntimeDataFile('dev-updates-board.json')
}

function getDevUpdateLockFilePath(): string {
  return `${getDevUpdateFilePath()}.lock`
}

function ensureRuntimeDirectory(filePath: string): void {
  fs.mkdirSync(path.dirname(filePath), { recursive: true })
}

async function withDevUpdateLock<T>(task: () => Promise<T>): Promise<T> {
  const lockPath = getDevUpdateLockFilePath()
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

      try {
        const stat = fs.statSync(lockPath)
        if (Date.now() - stat.mtimeMs > 30_000) {
          fs.rmSync(lockPath, { force: true })
          continue
        }
      } catch {
        continue
      }

      if (Date.now() - startedAt > 2000) {
        throw new Error('Board update dev sedang sibuk. Silakan coba lagi beberapa saat.')
      }

      await new Promise(resolve => setTimeout(resolve, 50))
    }
  }
}

export function loadDevUpdates(): DevUpdateRecord[] {
  const filePath = getDevUpdateFilePath()
  if (!fs.existsSync(filePath)) return []

  const raw = fs.readFileSync(filePath, 'utf-8').trim()
  if (!raw) return []

  try {
    const parsed = JSON.parse(raw) as unknown
    return Array.isArray(parsed) ? (parsed as DevUpdateRecord[]) : []
  } catch {
    throw new Error('File board update dev rusak dan perlu diperbaiki.')
  }
}

function saveDevUpdates(records: DevUpdateRecord[]): void {
  const filePath = getDevUpdateFilePath()
  ensureRuntimeDirectory(filePath)

  const tempPath = `${filePath}.tmp`
  fs.writeFileSync(tempPath, JSON.stringify(records, null, 2), 'utf-8')
  fs.renameSync(tempPath, filePath)
}

const VALID_CATEGORIES = new Set(['release', 'improvement', 'maintenance'])

function sortByLatest(records: DevUpdateRecord[]): DevUpdateRecord[] {
  return [...records].sort(
    (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
  )
}

function validateCreateInput(raw: unknown): CreateDevUpdateInput {
  if (!raw || typeof raw !== 'object') {
    throw new Error('Payload update dev tidak valid.')
  }

  const body = raw as Record<string, unknown>
  const title = String(body.title ?? '').trim()
  const content = String(body.body ?? '').trim()
  const category = String(body.category ?? 'improvement').trim()
  const expiresAt = body.expiresAt ? String(body.expiresAt).trim() : null

  if (!title || title.length < 3 || title.length > 200) {
    throw new Error('Judul update dev harus 3-200 karakter.')
  }

  if (!content || content.length < 3 || content.length > 2000) {
    throw new Error('Isi update dev harus 3-2000 karakter.')
  }

  if (!VALID_CATEGORIES.has(category)) {
    throw new Error('Kategori harus salah satu dari: release, improvement, maintenance.')
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
    category: category as DevUpdateCategory,
    expiresAt: expiresAt ? new Date(expiresAt).toISOString() : null,
  }
}

export async function createDevUpdate(
  raw: unknown,
  author: DevUpdateAuthor
): Promise<DevUpdateRecord> {
  const input = validateCreateInput(raw)

  return withDevUpdateLock(async () => {
    const records = loadDevUpdates()

    const record: DevUpdateRecord = {
      id: `devupdate_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
      title: input.title,
      body: input.body,
      category: input.category,
      createdBy: author.username,
      createdByName: author.displayName,
      createdAt: new Date().toISOString(),
      expiresAt: input.expiresAt,
      active: true,
    }

    records.push(record)
    saveDevUpdates(records)

    return record
  })
}

export async function deactivateDevUpdate(id: string): Promise<boolean> {
  return withDevUpdateLock(async () => {
    const records = loadDevUpdates()
    const index = records.findIndex(record => record.id === id)
    if (index < 0) return false

    records[index] = { ...records[index], active: false }
    saveDevUpdates(records)

    return true
  })
}

export function getActiveDevUpdates(): DevUpdateRecord[] {
  const records = loadDevUpdates()
  const now = new Date()

  return sortByLatest(
    records.filter(record => {
      if (!record.active) return false
      if (record.expiresAt) {
        const expiry = new Date(record.expiresAt)
        if (expiry <= now) return false
      }
      return true
    })
  )
}

export function listAllDevUpdates(): DevUpdateRecord[] {
  return sortByLatest(loadDevUpdates())
}
