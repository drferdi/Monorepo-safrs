/**
 * Indonesian notice for the side panel when MIRA did not answer, keyed by the engine result's
 * `error.code` (client codes from `mira-engine.ts`, service codes from the reasoning service)
 * or by the supervisor state (`NOT_INSTALLED`, `STARTING`).
 *
 * @module lib/diagnosis-engine/mira-notice
 */

export const MIRA_UNAVAILABLE_NOTICE = 'MIRA tidak tersedia';

const NOTICES: Record<string, string> = {
  NOT_INSTALLED: 'MIRA belum terpasang',
  STARTING: 'MIRA sedang menyala',
  NETWORK_ERROR: 'MIRA mati',
  NOT_CONFIGURED: 'MIRA mati',
  BUDGET_EXHAUSTED: 'MIRA: batas biaya harian',
  STEP_BUDGET_EXCEEDED: 'MIRA: batas biaya harian',
  TIMEOUT: 'MIRA: waktu habis',
  MODEL_OUTPUT_INVALID: 'MIRA: hasil tidak valid',
  CONTRACT_MISMATCH: 'MIRA: hasil tidak valid',
  PII_DETECTED: 'MIRA: data pasien ditolak (PII)',
  PII_BLOCKED: 'MIRA: data pasien ditolak (PII)',
};

export function miraNoticeFor(code: string | undefined): string {
  if (!code) return MIRA_UNAVAILABLE_NOTICE;
  return NOTICES[code] ?? `${MIRA_UNAVAILABLE_NOTICE} (${code})`;
}
