/**
 * The MIRA differential that goes to MedBoard with a consult.
 *
 * The differential panel and the TTV "Doctor" button are never mounted together, so the
 * background remembers the latest MIRA result per encounter and TTV asks for it at send time.
 * Memory lives as long as the service worker; a run without MIRA output clears it.
 */
import { MIRA_CANNOT_MISS_TAG, MIRA_TAG } from './run-diagnosis';

import type { ConsultMiraDifferential } from '@/lib/api/bridge-client';
import type { CDSSResponse } from '@/types/api';

let latest: { encounterId: string; differential: ConsultMiraDifferential } | null = null;

/** MIRA-tagged suggestions only; null when the response carries none (legacy output). */
export function toConsultMiraDifferential(
  data: CDSSResponse,
  generatedAt: string
): ConsultMiraDifferential | null {
  const items = data.diagnosis_suggestions
    .filter((item) => item.engine_tag === MIRA_TAG || item.engine_tag === MIRA_CANNOT_MISS_TAG)
    .map((item) => ({
      rank: item.rank,
      icd10: item.icd10_code ?? item.icd_x,
      nama: item.nama,
      confidence: item.confidence,
      cannot_miss: item.engine_tag === MIRA_CANNOT_MISS_TAG,
      rationale: item.rationale,
    }));
  if (items.length === 0) return null;

  return {
    engine: 'MIRA',
    generated_at: generatedAt,
    items,
    next_best_actions: data.next_best_actions ?? [],
    missing_information: data.missing_information ?? [],
  };
}

export function rememberConsultMiraDifferential(
  encounterId: string,
  differential: ConsultMiraDifferential | null
): void {
  latest = differential ? { encounterId, differential } : null;
}

export function getConsultMiraDifferential(encounterId: string): ConsultMiraDifferential | null {
  return latest?.encounterId === encounterId ? latest.differential : null;
}

/** Test helper: start from an empty memory. */
export function forgetConsultMiraDifferentials(): void {
  latest = null;
}
