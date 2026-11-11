// Designed and constructed by Drferdi.
/**
 * Soft penalty from KB diagnosis_banding among competing candidates (H9).
 * Soft only — never hard-drops or invents ICD codes.
 *
 * @module lib/iskandar-diagnosis-engine/diagnosis-banding-penalty
 */

import type { MatchedCandidate } from './symptom-matcher';

/** Multiplier applied once when a stronger peer lists this candidate in banding. */
export const BANDING_SOFT_PENALTY = 0.85;

function normalizeText(value: string): string {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9\u00c0-\u024f]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function bandingMentionsCandidate(
  bandingEntries: string[],
  candidate: MatchedCandidate
): boolean {
  const nama = normalizeText(candidate.nama);
  const icd = normalizeText(candidate.icd10);
  const namaStem = nama.split(' ').find((token) => token.length >= 4) || nama;

  return bandingEntries.some((entry) => {
    const normalized = normalizeText(entry);
    if (!normalized) return false;
    if (icd && (normalized === icd || normalized.includes(icd))) return true;
    if (nama && (normalized === nama || normalized.includes(nama) || nama.includes(normalized))) {
      return true;
    }
    return Boolean(namaStem && namaStem.length >= 4 && normalized.includes(namaStem));
  });
}

/**
 * When a stronger candidate lists a weaker peer in `diagnosis_banding`,
 * soft-penalize the weaker peer's matchScore (auditable via bandingSoftPenalty).
 */
export function applyDiagnosisBandingSoftPenalty(
  candidates: MatchedCandidate[]
): MatchedCandidate[] {
  if (candidates.length <= 1) {
    return candidates.map((c) => ({
      ...c,
      bandingSoftPenalty: c.bandingSoftPenalty ?? 1,
    }));
  }

  const ordered = [...candidates].sort((a, b) => b.matchScore - a.matchScore);
  const adjusted = ordered.map((c) => ({
    ...c,
    bandingSoftPenalty: 1,
  }));

  for (let i = 0; i < adjusted.length; i += 1) {
    const stronger = adjusted[i];
    for (let j = i + 1; j < adjusted.length; j += 1) {
      const weaker = adjusted[j];
      if (!bandingMentionsCandidate(stronger.diagnosisBanding || [], weaker)) continue;
      weaker.bandingSoftPenalty = (weaker.bandingSoftPenalty ?? 1) * BANDING_SOFT_PENALTY;
      weaker.matchScore = Math.min(1, weaker.matchScore * BANDING_SOFT_PENALTY);
    }
  }

  adjusted.sort((a, b) => b.matchScore - a.matchScore);
  return adjusted;
}
