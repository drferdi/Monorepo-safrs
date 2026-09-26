/**
 * Validasi body untuk API consult (accept & transfer-to-emr).
 * Pure functions — testable tanpa server-only.
 */
import type { AssistConsultPayload } from './socket-bridge'

const CONSULT_ID_MAX = 128
const PELAYANAN_ID_MAX = 64

export type AcceptBody = {
  consultId?: string
  consult?: AssistConsultPayload
}

export type TransferBody = {
  consultId?: string
  pelayananId?: string
}

export type ValidationResult<T> = { ok: true; data: T } | { ok: false; error: string; status: 400 }

export function validateAcceptBody(
  body: unknown
): ValidationResult<{ consultId: string; consult: AssistConsultPayload }> {
  const b = body as AcceptBody
  if (!b?.consultId || typeof b.consultId !== 'string') {
    return { ok: false, error: 'consultId wajib diisi.', status: 400 }
  }
  if (b.consultId.length > CONSULT_ID_MAX) {
    return {
      ok: false,
      error: `consultId maksimal ${CONSULT_ID_MAX} karakter.`,
      status: 400,
    }
  }
  if (!b.consult || !b.consult.patient?.name || !b.consult.keluhan_utama) {
    return {
      ok: false,
      error: 'consult (patient, keluhan_utama) wajib diisi.',
      status: 400,
    }
  }
  return { ok: true, data: { consultId: b.consultId, consult: b.consult } }
}

export function validateTransferBody(
  body: unknown
): ValidationResult<{ consultId: string; pelayananId: string }> {
  const b = body as TransferBody
  if (!b?.consultId || typeof b.consultId !== 'string') {
    return { ok: false, error: 'consultId wajib diisi.', status: 400 }
  }
  if (b.consultId.length > CONSULT_ID_MAX) {
    return {
      ok: false,
      error: `consultId maksimal ${CONSULT_ID_MAX} karakter.`,
      status: 400,
    }
  }
  if (!b?.pelayananId || typeof b.pelayananId !== 'string') {
    return {
      ok: false,
      error: 'pelayananId wajib diisi (no. pelayanan ePuskesmas).',
      status: 400,
    }
  }
  const pelayananId = b.pelayananId.trim()
  if (pelayananId.length === 0) {
    return {
      ok: false,
      error: 'pelayananId wajib diisi (no. pelayanan ePuskesmas).',
      status: 400,
    }
  }
  if (pelayananId.length > PELAYANAN_ID_MAX) {
    return {
      ok: false,
      error: `pelayananId maksimal ${PELAYANAN_ID_MAX} karakter.`,
      status: 400,
    }
  }
  return { ok: true, data: { consultId: b.consultId, pelayananId } }
}
