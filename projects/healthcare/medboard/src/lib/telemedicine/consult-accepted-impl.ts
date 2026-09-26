// Persistensi "Ambil kasus" — implementasi (no server-only; testable).
import fs from 'node:fs'
import path from 'node:path'

import { resolveRuntimeDataFile } from '@/lib/server/runtime-data-path'

import type { AssistConsultPayload } from './socket-bridge'

export function getAcceptedFilePath(): string {
  return process.env.CONSULT_ACCEPTED_FILE || resolveRuntimeDataFile('consult-accepted.jsonl')
}

export interface AcceptedConsultRecord {
  consultId: string
  acceptedBy: string
  acceptedAt: string
  consult: AssistConsultPayload
}

function ensureDir(): void {
  const filePath = getAcceptedFilePath()
  const dir = path.dirname(filePath)
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true })
  }
}

/**
 * Append satu record consult accepted ke runtime/consult-accepted.jsonl.
 */
export function appendAcceptedConsult(record: AcceptedConsultRecord): void {
  ensureDir()
  const line = JSON.stringify(record) + '\n'
  fs.appendFileSync(getAcceptedFilePath(), line, 'utf-8')
  if (process.env.NODE_ENV !== 'production') {
    console.log(`[Consult] Accepted ${record.consultId} by ${record.acceptedBy}`)
  }
}

/**
 * Baca satu accepted consult by consultId (scan file dari akhir).
 */
export function getAcceptedConsult(consultId: string): AcceptedConsultRecord | null {
  const filePath = getAcceptedFilePath()
  if (!fs.existsSync(filePath)) return null
  const content = fs.readFileSync(filePath, 'utf-8')
  const lines = content.trim().split('\n').filter(Boolean)
  for (let i = lines.length - 1; i >= 0; i--) {
    try {
      const record = JSON.parse(lines[i]) as AcceptedConsultRecord
      if (record.consultId === consultId) return record
    } catch {
      /* skip invalid line */
    }
  }
  return null
}

/**
 * Daftar accepted consults terbaru (limit baris dari akhir file).
 */
export function listAcceptedConsults(limit: number): AcceptedConsultRecord[] {
  const filePath = getAcceptedFilePath()
  if (!fs.existsSync(filePath)) return []
  const content = fs.readFileSync(filePath, 'utf-8')
  const lines = content.trim().split('\n').filter(Boolean)
  const out: AcceptedConsultRecord[] = []
  for (let i = lines.length - 1; i >= 0 && out.length < limit; i--) {
    try {
      out.push(JSON.parse(lines[i]) as AcceptedConsultRecord)
    } catch {
      /* skip */
    }
  }
  return out
}
