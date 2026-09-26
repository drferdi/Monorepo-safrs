import 'server-only'

import { randomBytes } from 'node:crypto'
import fs from 'node:fs'
import path from 'node:path'
import { CREW_ACCESS_INSTITUTIONS_SEED } from '@/lib/crew-access'
import { resolveRuntimeDataFile } from '@/lib/server/runtime-data-path'

export interface InstitutionRecord {
  id: string
  name: string
  createdAt: string
}

function getFilePath(): string {
  return (
    process.env.CREW_ACCESS_INSTITUTIONS_FILE?.trim() ||
    resolveRuntimeDataFile('crew-access-institutions.json')
  )
}

function getLockPath(): string {
  return `${getFilePath()}.lock`
}

function ensureDir(filePath: string): void {
  fs.mkdirSync(path.dirname(filePath), { recursive: true })
}

async function withLock<T>(task: () => Promise<T>): Promise<T> {
  const lockPath = getLockPath()
  ensureDir(lockPath)
  const startedAt = Date.now()
  const staleMs = 30_000

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
        if (Date.now() - stat.mtimeMs > staleMs) {
          fs.rmSync(lockPath, { force: true })
          continue
        }
      } catch {
        continue
      }

      if (Date.now() - startedAt > 2000) {
        throw new Error('Institusi sedang diperbarui. Silakan coba lagi.')
      }
      await new Promise(r => setTimeout(r, 50))
    }
  }
}

function readStore(): InstitutionRecord[] {
  const filePath = getFilePath()
  if (!fs.existsSync(filePath)) return []
  const raw = fs.readFileSync(filePath, 'utf-8').trim()
  if (!raw) return []
  try {
    const parsed = JSON.parse(raw) as unknown
    return Array.isArray(parsed) ? (parsed as InstitutionRecord[]) : []
  } catch {
    return []
  }
}

function writeStore(records: InstitutionRecord[]): void {
  const filePath = getFilePath()
  ensureDir(filePath)
  const tmp = `${filePath}.tmp`
  fs.writeFileSync(tmp, JSON.stringify(records, null, 2), 'utf-8')
  fs.renameSync(tmp, filePath)
}

function generateId(): string {
  return `inst-${Date.now()}-${randomBytes(4).toString('hex')}`
}

/** Auto-seed from hardcoded array if file doesn't exist or is empty */
function seedIfEmpty(): InstitutionRecord[] {
  let records = readStore()
  if (records.length > 0) return records

  const now = new Date().toISOString()
  records = CREW_ACCESS_INSTITUTIONS_SEED.map(name => ({
    id: generateId(),
    name,
    createdAt: now,
  }))
  writeStore(records)
  return records
}

export function listInstitutions(): InstitutionRecord[] {
  return seedIfEmpty()
}

export function getInstitutionNames(): string[] {
  return seedIfEmpty().map(r => r.name)
}

export async function addInstitution(name: string): Promise<InstitutionRecord> {
  const trimmed = name.trim()
  if (!trimmed || trimmed.length > 200) {
    throw new Error('Nama institusi wajib 1-200 karakter.')
  }

  return withLock(async () => {
    const records = seedIfEmpty()
    const exists = records.some(r => r.name.toLowerCase() === trimmed.toLowerCase())
    if (exists) throw new Error('Institusi dengan nama tersebut sudah ada.')

    const record: InstitutionRecord = {
      id: generateId(),
      name: trimmed,
      createdAt: new Date().toISOString(),
    }
    records.push(record)
    writeStore(records)
    return record
  })
}

export async function updateInstitution(id: string, name: string): Promise<InstitutionRecord> {
  const trimmed = name.trim()
  if (!trimmed || trimmed.length > 200) {
    throw new Error('Nama institusi wajib 1-200 karakter.')
  }

  return withLock(async () => {
    const records = seedIfEmpty()
    const index = records.findIndex(r => r.id === id)
    if (index < 0) throw new Error('Institusi tidak ditemukan.')

    const duplicate = records.some(
      r => r.id !== id && r.name.toLowerCase() === trimmed.toLowerCase()
    )
    if (duplicate) throw new Error('Institusi dengan nama tersebut sudah ada.')

    records[index] = { ...records[index], name: trimmed }
    writeStore(records)
    return records[index]
  })
}

export async function deleteInstitution(id: string, userCount: number): Promise<void> {
  if (userCount > 0) {
    throw new Error('Tidak dapat menghapus institusi yang masih memiliki anggota crew.')
  }

  return withLock(async () => {
    const records = seedIfEmpty()
    const index = records.findIndex(r => r.id === id)
    if (index < 0) throw new Error('Institusi tidak ditemukan.')

    records.splice(index, 1)
    writeStore(records)
  })
}
