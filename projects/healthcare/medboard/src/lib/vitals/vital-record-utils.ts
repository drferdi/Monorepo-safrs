/**
 * Vital Record Utilities — pure functions, no server-only dependency.
 * Can be imported in both server and client contexts, and in tests.
 *
 * Clinical Momentum Engine — Phase 1B (Data Foundation)
 */

import { createHash } from 'node:crypto'

// ── Patient Identifier Hashing ───────────────────────────────────────────────

/**
 * Derive a stable, privacy-safe patient identifier from identifying fields.
 * SHA-256 of a canonical string — deterministic, non-reversible.
 *
 * Input fields are normalized (lowercased, trimmed) before hashing
 * to handle minor data entry inconsistencies.
 *
 * @param noRm - Medical record number (most stable identifier)
 * @param nama - Patient name (normalized to lowercase)
 * @param tanggalLahir - Date of birth in YYYY-MM-DD format
 */
export function buildPatientIdentifierHash(
  noRm: string,
  nama: string,
  tanggalLahir: string
): string {
  const normalized = [
    noRm.trim().toUpperCase(),
    nama.trim().toLowerCase().replace(/\s+/g, ' '),
    tanggalLahir.trim(),
  ]
    .join('|')
    .normalize('NFC')

  return createHash('sha256').update(normalized).digest('hex')
}

/**
 * Build patient identifier from medical record number only.
 * Use when name/DOB are not available (e.g. triage-only context).
 * Uses "rm:" prefix to namespace separately from composite hash.
 */
export function buildPatientIdentifierFromRM(noRm: string): string {
  return createHash('sha256').update(`rm:${noRm.trim().toUpperCase()}`).digest('hex')
}
