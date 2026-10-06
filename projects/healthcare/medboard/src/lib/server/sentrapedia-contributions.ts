// Sentrapedia contributions, one JSON record per line in runtime/sentrapedia-contributions.jsonl.
import { randomUUID } from 'node:crypto'
import fs from 'node:fs'
import path from 'node:path'

import {
  findDisease,
  type AiReview,
  type Contribution,
  type ContributionDraft,
} from '@/lib/sentrapedia/contribution'

import { resolveRuntimeDataFile } from './runtime-data-path'

function contributionsFile(): string {
  return process.env.SENTRAPEDIA_CONTRIBUTIONS_FILE || resolveRuntimeDataFile('sentrapedia-contributions.jsonl')
}

function readAll(): Contribution[] {
  const file = contributionsFile()
  if (!fs.existsSync(file)) return []
  const records: Contribution[] = []
  for (const line of fs.readFileSync(file, 'utf-8').split('\n')) {
    if (!line.trim()) continue
    try {
      records.push(JSON.parse(line) as Contribution)
    } catch {
      // A damaged line is skipped; the rest of the queue stays readable.
    }
  }
  return records
}

function writeAll(records: Contribution[]): void {
  const file = contributionsFile()
  const temp = `${file}.${process.pid}.tmp`
  fs.writeFileSync(temp, records.map((record) => `${JSON.stringify(record)}\n`).join(''), 'utf-8')
  fs.renameSync(temp, file)
}

function update(id: string, change: (record: Contribution) => Contribution): Contribution | null {
  const records = readAll()
  const index = records.findIndex((record) => record.id === id)
  if (index < 0) return null
  records[index] = change(records[index])
  writeAll(records)
  return records[index]
}

export function listContributions(): Contribution[] {
  return readAll().sort((a, b) => b.createdAt.localeCompare(a.createdAt))
}

export function listApprovedContributions(): Contribution[] {
  return listContributions().filter((record) => record.status === 'approved')
}

export function getContribution(id: string): Contribution | null {
  return readAll().find((record) => record.id === id) ?? null
}

export function saveNewContribution(
  draft: ContributionDraft,
  contributor: Contribution['contributor'],
  now: Date = new Date()
): Contribution {
  const record: Contribution = {
    id: randomUUID(),
    diseaseId: draft.diseaseId,
    field: draft.field,
    proposedText: draft.proposedText,
    reference: draft.reference,
    note: draft.note,
    diseaseName: findDisease(draft.diseaseId)?.nama ?? '',
    contributor,
    createdAt: now.toISOString(),
    status: 'ai_review',
    aiReview: null,
    decision: null,
  }
  const file = contributionsFile()
  fs.mkdirSync(path.dirname(file), { recursive: true })
  fs.appendFileSync(file, `${JSON.stringify(record)}\n`, 'utf-8')
  return record
}

// A review that ran moves the contribution on to Chief; one that could not run keeps it in AI review.
export function recordAiReview(id: string, review: AiReview): Contribution | null {
  return update(id, (record) =>
    record.status === 'ai_review' || record.status === 'awaiting_approval'
      ? { ...record, aiReview: review, status: review.available ? 'awaiting_approval' : 'ai_review' }
      : record
  )
}

export function decideContribution(
  id: string,
  decision: 'approved' | 'rejected',
  by: string,
  note: string
): { ok: true; record: Contribution } | { ok: false; status: 404 | 409; error: string } {
  const record = getContribution(id)
  if (!record) return { ok: false, status: 404, error: 'Kontribusi tidak ditemukan.' }
  if (record.status !== 'awaiting_approval') {
    return {
      ok: false,
      status: 409,
      error: record.status === 'ai_review' ? 'Kontribusi belum selesai ditinjau AI.' : 'Kontribusi ini sudah diputuskan.',
    }
  }
  const decided = update(id, (current) => ({
    ...current,
    status: decision,
    decision: { by, at: new Date().toISOString(), note },
  }))
  return decided ? { ok: true, record: decided } : { ok: false, status: 404, error: 'Kontribusi tidak ditemukan.' }
}
