// Sentrapedia contributions (Chief 2026-10-07): a crew member proposes new text for one
// section of a disease, an AI reviews it, and Chief approves or rejects it.
import { DISEASES, type Disease } from './data'

export const CONTRIBUTION_FIELDS = ['definisi', 'gejala', 'diagnosis', 'terapi', 'rujukan'] as const
export type ContributionField = (typeof CONTRIBUTION_FIELDS)[number]

export const CONTRIBUTION_FIELD_LABELS: Record<ContributionField, string> = {
  definisi: 'Definisi',
  gejala: 'Gejala klinis',
  diagnosis: 'Diagnosis',
  terapi: 'Terapi',
  rujukan: 'Kriteria rujukan',
}

export type ContributionStatus = 'ai_review' | 'awaiting_approval' | 'approved' | 'rejected'

export const CONTRIBUTION_STATUS_LABELS: Record<ContributionStatus, string> = {
  ai_review: 'Ditinjau AI',
  awaiting_approval: 'Menunggu persetujuan',
  approved: 'Disetujui',
  rejected: 'Ditolak',
}

// ui-badge tone per status.
export const CONTRIBUTION_STATUS_TONES: Record<ContributionStatus, 'warning' | 'primary' | 'success' | 'critical'> = {
  ai_review: 'warning',
  awaiting_approval: 'primary',
  approved: 'success',
  rejected: 'critical',
}

export type AiVerdict = 'layak' | 'perlu_perbaikan' | 'tidak_layak'

export const AI_VERDICT_LABELS: Record<AiVerdict, string> = {
  layak: 'Layak',
  perlu_perbaikan: 'Perlu perbaikan',
  tidak_layak: 'Tidak layak',
}

export type AiReview =
  | { available: true; verdict: AiVerdict; summary: string; concerns: string[]; reviewedAt: string }
  | { available: false; reason: string; reviewedAt: string }

export type ContributionDraft = {
  diseaseId: number
  field: ContributionField
  proposedText: string
  reference: string
  note: string
}

export type Contribution = ContributionDraft & {
  id: string
  diseaseName: string
  contributor: { username: string; displayName: string; profession: string }
  createdAt: string
  status: ContributionStatus
  aiReview: AiReview | null
  decision: { by: string; at: string; note: string } | null
}

export const PROPOSED_TEXT_LIMITS = { min: 20, max: 4000 } as const
export const REFERENCE_LIMITS = { min: 3, max: 500 } as const
export const NOTE_MAX = 1000

export function findDisease(id: number): Disease | undefined {
  return DISEASES.find((disease) => disease.id === id)
}

export function currentSectionText(disease: Disease, field: ContributionField): string {
  return field === 'gejala' ? disease.gejala.join('\n') : disease[field]
}

function text(value: unknown): string {
  return typeof value === 'string' ? value.trim() : ''
}

export function validateContributionDraft(
  input: unknown
): { ok: true; draft: ContributionDraft } | { ok: false; error: string } {
  if (!input || typeof input !== 'object') return { ok: false, error: 'Isian kontribusi tidak terbaca.' }
  const raw = input as Record<string, unknown>
  const diseaseId = Number(raw.diseaseId)
  if (!Number.isInteger(diseaseId) || !findDisease(diseaseId)) return { ok: false, error: 'Pilih penyakit dari daftar Sentrapedia.' }
  const field = CONTRIBUTION_FIELDS.find((name) => name === raw.field)
  if (!field) return { ok: false, error: 'Pilih bagian yang ingin diperbarui.' }
  const proposedText = text(raw.proposedText)
  if (proposedText.length < PROPOSED_TEXT_LIMITS.min || proposedText.length > PROPOSED_TEXT_LIMITS.max) {
    return { ok: false, error: `Usulan teks ${PROPOSED_TEXT_LIMITS.min}–${PROPOSED_TEXT_LIMITS.max} karakter.` }
  }
  const reference = text(raw.reference)
  if (reference.length < REFERENCE_LIMITS.min || reference.length > REFERENCE_LIMITS.max) {
    return { ok: false, error: 'Sebutkan sumber referensi usulan Anda.' }
  }
  const note = text(raw.note)
  if (note.length > NOTE_MAX) return { ok: false, error: `Catatan paling banyak ${NOTE_MAX} karakter.` }
  return { ok: true, draft: { diseaseId, field, proposedText, reference, note } }
}

// The latest approved change per section replaces the original text.
export function applyApprovedContributions(disease: Disease, approved: Contribution[]): Disease {
  const latest = new Map<ContributionField, Contribution>()
  for (const item of approved) {
    if (item.status !== 'approved' || item.diseaseId !== disease.id) continue
    const current = latest.get(item.field)
    if (!current || (item.decision?.at ?? '') > (current.decision?.at ?? '')) latest.set(item.field, item)
  }
  const shown: Disease = { ...disease }
  for (const [field, item] of latest) {
    if (field === 'gejala') {
      shown.gejala = item.proposedText.split('\n').map((line) => line.trim()).filter(Boolean)
    } else {
      shown[field] = item.proposedText
    }
  }
  return shown
}
