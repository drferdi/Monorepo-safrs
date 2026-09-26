// Designed and constructed by Drferdi.
/**
 * Iskandar Diagnosis Engine V1 — Epidemiology Weights (Bayesian Prior)
 * Real-world disease burden from 45,030 cases / 1,930 ICD-10 codes
 *
 * Adjusts match scores based on local disease prevalence.
 * Formula: adjustedScore = matchScore × genderAdjustedWeight
 * Weight capped at 1.35 to prevent excessive boosting.
 *
 * @module lib/iskandar-diagnosis-engine/epidemiology-weights
 */

import type { MatchedCandidate } from './symptom-matcher';

// =============================================================================
// TYPES
// =============================================================================

export interface EpiWeightEntry {
  weight: number;
  cases_per_month: number;
  prevalence_pct: number;
  total_annual: number;
  nama: string;
  male_pct: number;
  female_pct: number;
}

interface EpiWeightRegistry {
  meta: {
    source: string;
    period: string;
    totalCases: number;
    totalIcd10: number;
  };
  weights: Record<string, EpiWeightEntry>;
}

/**
 * EpiWeightResult interface
 *
 * @remarks
 * TODO: Add type description and property documentation
 * Auto-generated on 2026-03-12
 */

export interface EpiWeightResult {
  weight: number;
  genderAdjusted: number;
  localPrevalence: number;
}

/**
 * EpiMeta interface
 *
 * @remarks
 * TODO: Add type description and property documentation
 * Auto-generated on 2026-03-12
 */

export interface EpiMeta {
  source: string;
  period: string;
  totalCases: number;
  totalIcd10: number;
}

// =============================================================================
// SINGLETON CACHE
// =============================================================================

let cachedRegistry: EpiWeightRegistry | null = null;

async function loadRegistry(): Promise<EpiWeightRegistry> {
  if (cachedRegistry) return cachedRegistry;

  const response = await fetch('/data/epidemiology_weights_v2.json');
  if (!response.ok) {
    console.warn('[Epi] Failed to load epidemiology weights, using neutral weights');
    cachedRegistry = {
      meta: { source: 'fallback', period: 'N/A', totalCases: 0, totalIcd10: 0 },
      weights: {},
    };
    return cachedRegistry;
  }
  cachedRegistry = await response.json();
  return cachedRegistry!;
}

// =============================================================================
// WEIGHT CALCULATION
// =============================================================================

/**
 * Get epidemiology weight for a specific ICD-10 code.
 * Tries exact match, then parent code (e.g., J06.9 → J06).
 */
export async function getEpidemiologyWeight(
  icd10: string,
  patientGender?: 'L' | 'P'
): Promise<EpiWeightResult> {
  const registry = await loadRegistry();
  const entry = registry.weights[icd10] || registry.weights[icd10.split('.')[0]] || null;

  if (!entry) {
    return { weight: 1.0, genderAdjusted: 1.0, localPrevalence: 0 };
  }

  let genderAdjusted = entry.weight;

  // Gender adjustment: +0.05 if patient gender matches dominant gender (>60%)
  // Only for diseases with ≥20 cases/month (statistically significant)
  if (patientGender && entry.cases_per_month >= 20) {
    const dominantFemale = entry.female_pct > 60;
    const dominantMale = entry.male_pct > 60;
    if (patientGender === 'P' && dominantFemale) {
      genderAdjusted = Math.min(entry.weight + 0.05, 1.35);
    } else if (patientGender === 'L' && dominantMale) {
      genderAdjusted = Math.min(entry.weight + 0.05, 1.35);
    }
  }

  return {
    weight: entry.weight,
    genderAdjusted: Math.round(genderAdjusted * 1000) / 1000,
    localPrevalence: entry.prevalence_pct,
  };
}

/**
 * Apply epidemiology weights to all candidates.
 * Mutates matchScore and adds epidemiologyWeight field.
 */
export async function applyEpidemiologyWeights(
  candidates: MatchedCandidate[],
  patientGender?: 'L' | 'P'
): Promise<MatchedCandidate[]> {
  const weighted = await Promise.all(
    candidates.map(async (c) => {
      const epi = await getEpidemiologyWeight(c.icd10, patientGender);
      return {
        ...c,
        matchScore: Math.min(1, c.rawMatchScore * epi.genderAdjusted),
        epidemiologyWeight: epi.genderAdjusted,
        localPrevalence: epi.localPrevalence,
      };
    })
  );

  // Re-sort after weighting
  weighted.sort((a, b) => b.matchScore - a.matchScore);
  return weighted;
}

/**
 * Get formatted local epidemiology context for LLM prompt injection.
 */
export async function getLocalEpidemiologyContext(topN = 15): Promise<string> {
  const registry = await loadRegistry();
  const entries = Object.entries(registry.weights)
    .filter(([, v]) => v.total_annual > 50)
    .sort((a, b) => b[1].total_annual - a[1].total_annual)
    .slice(0, topN);

  if (entries.length === 0) return '';

  const lines = entries.map(
    ([code, v]) =>
      `- ${code} ${v.nama}: ${v.prevalence_pct.toFixed(1)}% (${v.total_annual} kasus/tahun, M:${v.male_pct}% F:${v.female_pct}%)`
  );

  return `EPIDEMIOLOGI LOKAL (Puskesmas Balowerti, Kediri — data 14 bulan):\n${lines.join('\n')}`;
}

/**
 * Get epidemiology metadata for audit trail.
 */
export async function getEpidemiologyMeta(): Promise<EpiMeta> {
  const registry = await loadRegistry();
  return { ...registry.meta };
}

/**
 * Clear cached data (for testing)
 */
export function clearEpiCache(): void {
  cachedRegistry = null;
}
