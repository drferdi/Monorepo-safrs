// Designed and constructed by Drferdi.
/**
 * Gate 1: TTV (Vital Signs) Inference Algorithm
 *
 * Purpose: Auto-fill unmeasured vital signs based on patient complaints
 * Evidence Base: WHO, AHA guidelines
 *
 * @module lib/emergency-detector/ttv-inference
 */

import {
  estimateRestingHeartRate,
  estimateRestingRespiratoryRate,
  getVitalScreeningProfile,
  type VitalScreeningProfile,
} from '@/lib/clinical/vital-screening-thresholds';

// ============================================================================
// TYPES & INTERFACES
// ============================================================================

/**
 * Evidence-based normal ranges for vital signs
 * Source: WHO, AHA
 */
export interface VitalRanges {
  pulse: { min: number; max: number };
  rr: { min: number; max: number };
  temp: { min: number; max: number };
}

/**
 * Measured or inferred vital signs
 */
export interface VitalSigns {
  pulse?: number;
  rr?: number;
  temp?: number;
  sbp?: number;
  dbp?: number;
}

/**
 * Metadata about how vital was obtained
 */
export interface VitalMetadata {
  source: 'measured' | 'inferred';
  confidence?: 'high' | 'medium' | 'low';
  reasoning?: string;
}

/**
 * Complete vital signs with metadata
 */
export interface VitalsWithMetadata {
  values: VitalSigns;
  metadata: {
    pulse?: VitalMetadata;
    rr?: VitalMetadata;
    temp?: VitalMetadata;
  };
}

/**
 * Symptom pattern for inference
 */
export interface SymptomPattern {
  id: string;
  keywords: string[];
  vitals: {
    pulse?: { min: number; max: number };
    rr?: { min: number; max: number };
    temp?: { min: number; max: number };
  };
  reasoning: string;
}

// ============================================================================
// CONSTANTS
// ============================================================================

/**
 * Evidence-based normal ranges (WHO/AHA)
 */
export const NORMAL_RANGES: VitalRanges = {
  pulse: { min: 60, max: 100 },
  rr: { min: 12, max: 20 },
  temp: { min: 36.5, max: 37.2 },
};

/**
 * Symptom patterns for vital signs inference
 * Based on clinical evidence and pathophysiology
 */
export const SYMPTOM_PATTERNS: SymptomPattern[] = [
  {
    id: 'fever_infection',
    keywords: ['demam', 'panas', 'fever', 'meriang'],
    vitals: {
      temp: { min: 38.0, max: 39.5 },
      pulse: { min: 90, max: 110 }, // Tachycardia (↑10-20 bpm per 1°C)
      rr: { min: 20, max: 24 }, // Mild tachypnea
    },
    reasoning: 'Demam → ↑metabolisme → ↑HR, ↑RR',
  },
  {
    id: 'respiratory_distress',
    keywords: ['sesak', 'napas', 'dyspnea', 'breathless', 'asma', 'asthma'],
    vitals: {
      rr: { min: 24, max: 30 }, // Tachypnea
      pulse: { min: 90, max: 110 }, // Compensatory tachycardia
      temp: { min: 36.5, max: 37.2 }, // Normal (unless infection)
    },
    reasoning: 'Respiratory distress → ↑RR, ↑HR kompensasi',
  },
  {
    id: 'chest_pain_cardiac',
    keywords: ['nyeri dada', 'chest pain', 'angina', 'jantung'],
    vitals: {
      pulse: { min: 80, max: 100 }, // May be normal or elevated
      rr: { min: 16, max: 22 }, // Mild elevation
      temp: { min: 36.5, max: 37.2 }, // Normal
    },
    reasoning: 'Cardiac ischemia → stress response → mild ↑HR, ↑RR',
  },
  {
    id: 'hypoglycemia',
    keywords: ['lemas', 'pusing', 'keringat dingin', 'tremor', 'gemetar'],
    vitals: {
      pulse: { min: 90, max: 120 }, // Tachycardia (sympathetic)
      rr: { min: 16, max: 22 }, // Mild tachypnea
      temp: { min: 36.0, max: 36.8 }, // May be slightly low
    },
    reasoning: 'Hipoglikemia → aktivasi simpatis → ↑HR, keringat dingin',
  },
  {
    id: 'sepsis_infection',
    keywords: ['menggigil', 'rigors', 'infeksi berat', 'sepsis'],
    vitals: {
      temp: { min: 38.5, max: 40.0 }, // High fever
      pulse: { min: 100, max: 130 }, // Tachycardia
      rr: { min: 22, max: 28 }, // Tachypnea
    },
    reasoning: 'Sepsis → SIRS response → ↑↑HR, ↑↑RR, ↑↑Temp',
  },
  {
    id: 'pain_acute',
    keywords: ['nyeri', 'sakit', 'pain'],
    vitals: {
      pulse: { min: 80, max: 100 }, // Mild tachycardia
      rr: { min: 16, max: 22 }, // Mild tachypnea
      temp: { min: 36.5, max: 37.2 }, // Normal
    },
    reasoning: 'Nyeri akut → stress response → mild ↑HR, ↑RR',
  },
  {
    id: 'gi_distress',
    keywords: ['mual', 'muntah', 'diare', 'nausea', 'vomiting', 'diarrhea'],
    vitals: {
      pulse: { min: 80, max: 100 }, // May be elevated if dehydrated
      rr: { min: 14, max: 20 }, // Usually normal
      temp: { min: 36.5, max: 38.0 }, // May have low-grade fever
    },
    reasoning: 'GI distress → possible dehydration → mild ↑HR',
  },
  {
    id: 'anxiety_panic',
    keywords: ['cemas', 'panik', 'anxiety', 'panic', 'deg-degan'],
    vitals: {
      pulse: { min: 90, max: 120 }, // Tachycardia
      rr: { min: 20, max: 28 }, // Hyperventilation
      temp: { min: 36.5, max: 37.2 }, // Normal
    },
    reasoning: 'Anxiety → aktivasi simpatis → ↑HR, hyperventilasi',
  },
];

// ============================================================================
// UTILITY FUNCTIONS
// ============================================================================

/**
 * Generate random value within normal range
 * Uses uniform distribution
 *
 * @param min - Minimum value (inclusive)
 * @param max - Maximum value (inclusive)
 * @param decimals - Number of decimal places (default: 0)
 * @returns Random value within range
 */
export function getRandomNormal(min: number, max: number, decimals: number = 0): number {
  const value = Math.random() * (max - min) + min;
  return Number(value.toFixed(decimals));
}

/**
 * Re-centers a symptom pattern's pulse/RR range (authored against adult
 * physiology) onto the patient's own age-cohort resting baseline.
 *
 * @remarks
 * Each SYMPTOM_PATTERNS entry encodes an offset from adult resting vitals
 * (e.g. "fever adds ~10-30 bpm"). Applied unscaled to a pediatric or
 * geriatric patient, that offset lands on the wrong baseline entirely — an
 * infant's own resting HR (100-160) already exceeds the fixed adult-shaped
 * "fever" range (90-110). Shifting by the cohort's own resting baseline
 * keeps the pattern's clinical intent (elevated relative to that patient)
 * without inventing new per-age-per-pattern numbers.
 */
function scaleRangeToProfile(
  range: { min: number; max: number },
  adultRange: { min: number; max: number },
  cohortRestingValue: number
): { min: number; max: number } {
  const delta = cohortRestingValue - (adultRange.min + adultRange.max) / 2;
  return { min: range.min + delta, max: range.max + delta };
}

/**
 * Parse complaint text to extract symptom keywords
 * Case-insensitive, supports Indonesian and English
 *
 * @param complaint - Patient complaint text
 * @returns Array of matched keywords
 */
export function parseComplaint(complaint: string): string[] {
  if (!complaint) return [];

  const normalized = complaint.toLowerCase().trim();
  const matches: string[] = [];

  // Check each pattern's keywords
  for (const pattern of SYMPTOM_PATTERNS) {
    for (const keyword of pattern.keywords) {
      if (normalized.includes(keyword.toLowerCase())) {
        matches.push(keyword);
      }
    }
  }

  return [...new Set(matches)]; // Remove duplicates
}

/**
 * Find matching symptom patterns based on complaint
 * Returns patterns sorted by keyword match count (descending)
 *
 * @param complaint - Patient complaint text
 * @returns Array of matching patterns, sorted by relevance
 */
export function findMatchingPatterns(complaint: string): SymptomPattern[] {
  if (!complaint) return [];

  const normalized = complaint.toLowerCase().trim();
  const patternMatches: Array<{ pattern: SymptomPattern; matchCount: number }> = [];

  for (const pattern of SYMPTOM_PATTERNS) {
    let matchCount = 0;

    for (const keyword of pattern.keywords) {
      if (normalized.includes(keyword.toLowerCase())) {
        matchCount++;
      }
    }

    if (matchCount > 0) {
      patternMatches.push({ pattern, matchCount });
    }
  }

  // Sort by match count (descending)
  patternMatches.sort((a, b) => b.matchCount - a.matchCount);

  return patternMatches.map((pm) => pm.pattern);
}

// ============================================================================
// CORE INFERENCE ALGORITHM
// ============================================================================

/**
 * Infer missing vital signs based on patient complaint
 *
 * Algorithm:
 * 1. Parse complaint for symptom keywords
 * 2. Find matching symptom patterns
 * 3. Use pattern ranges if match found, otherwise use normal ranges
 * 4. Generate random values within determined ranges
 * 5. Return vitals with metadata (source, reasoning)
 *
 * @param complaint - Patient complaint text
 * @param measured - Already measured vitals (will not be overridden)
 * @param patientAge - Patient age in years. When provided, pulse/RR ranges are
 *   re-centered onto the patient's own age-cohort baseline instead of the flat
 *   adult ranges below (an infant's normal resting HR already exceeds the
 *   adult-shaped "fever" range) — see getVitalScreeningProfile and
 *   scaleRangeToProfile. Temperature ranges are not age-scaled: core body
 *   temperature does not vary by age in this model the way HR/RR do.
 * @returns Complete vitals with metadata
 */
export function inferVitals(
  complaint: string,
  measured: VitalSigns = {},
  patientAge?: number
): VitalsWithMetadata {
  const result: VitalsWithMetadata = {
    values: { ...measured },
    metadata: {},
  };

  const profile: VitalScreeningProfile | null =
    patientAge !== undefined ? getVitalScreeningProfile(patientAge) : null;

  // Mark measured vitals
  if (measured.pulse !== undefined) {
    result.metadata.pulse = { source: 'measured' };
  }
  if (measured.rr !== undefined) {
    result.metadata.rr = { source: 'measured' };
  }
  if (measured.temp !== undefined) {
    result.metadata.temp = { source: 'measured' };
  }

  // Find matching patterns
  const patterns = findMatchingPatterns(complaint);
  const primaryPattern = patterns[0]; // Highest match count

  // Infer missing vitals

  // PULSE
  if (result.values.pulse === undefined) {
    if (primaryPattern?.vitals.pulse) {
      const range = profile
        ? scaleRangeToProfile(
            primaryPattern.vitals.pulse,
            NORMAL_RANGES.pulse,
            estimateRestingHeartRate(profile)
          )
        : primaryPattern.vitals.pulse;
      result.values.pulse = getRandomNormal(range.min, range.max);
      result.metadata.pulse = {
        source: 'inferred',
        confidence: 'medium',
        reasoning: primaryPattern.reasoning,
      };
    } else {
      const range = profile
        ? { min: profile.bradycardiaThreshold, max: profile.tachycardiaThreshold }
        : NORMAL_RANGES.pulse;
      result.values.pulse = getRandomNormal(range.min, range.max);
      result.metadata.pulse = {
        source: 'inferred',
        confidence: 'low',
        reasoning: 'No specific pattern matched - using normal range',
      };
    }
  }

  // RESPIRATORY RATE
  if (result.values.rr === undefined) {
    if (primaryPattern?.vitals.rr) {
      const range = profile
        ? scaleRangeToProfile(
            primaryPattern.vitals.rr,
            NORMAL_RANGES.rr,
            estimateRestingRespiratoryRate(profile)
          )
        : primaryPattern.vitals.rr;
      result.values.rr = getRandomNormal(range.min, range.max);
      result.metadata.rr = {
        source: 'inferred',
        confidence: 'medium',
        reasoning: primaryPattern.reasoning,
      };
    } else {
      const range = profile
        ? { min: profile.bradypneaThreshold, max: profile.tachypneaThreshold }
        : NORMAL_RANGES.rr;
      result.values.rr = getRandomNormal(range.min, range.max);
      result.metadata.rr = {
        source: 'inferred',
        confidence: 'low',
        reasoning: 'No specific pattern matched - using normal range',
      };
    }
  }

  // TEMPERATURE
  if (result.values.temp === undefined) {
    if (primaryPattern?.vitals.temp) {
      result.values.temp = getRandomNormal(
        primaryPattern.vitals.temp.min,
        primaryPattern.vitals.temp.max,
        1 // 1 decimal place for temperature
      );
      result.metadata.temp = {
        source: 'inferred',
        confidence: 'medium',
        reasoning: primaryPattern.reasoning,
      };
    } else {
      result.values.temp = getRandomNormal(NORMAL_RANGES.temp.min, NORMAL_RANGES.temp.max, 1);
      result.metadata.temp = {
        source: 'inferred',
        confidence: 'low',
        reasoning: 'No specific pattern matched - using normal range',
      };
    }
  }

  return result;
}

/**
 * Check if vital signs are within normal ranges
 *
 * @param vitals - Vital signs to check
 * @param patientAge - Patient age in years. When provided, pulse/RR bounds use
 *   the patient's own age-cohort thresholds instead of flat adult ranges.
 * @returns Object indicating which vitals are abnormal
 */
export function checkVitalRanges(
  vitals: VitalSigns,
  patientAge?: number
): {
  pulse: 'low' | 'normal' | 'high' | null;
  rr: 'low' | 'normal' | 'high' | null;
  temp: 'low' | 'normal' | 'high' | null;
} {
  const profile = patientAge !== undefined ? getVitalScreeningProfile(patientAge) : null;
  const pulseRange = profile
    ? { min: profile.bradycardiaThreshold, max: profile.tachycardiaThreshold }
    : NORMAL_RANGES.pulse;
  const rrRange = profile
    ? { min: profile.bradypneaThreshold, max: profile.tachypneaThreshold }
    : NORMAL_RANGES.rr;

  return {
    pulse:
      vitals.pulse === undefined
        ? null
        : vitals.pulse < pulseRange.min
          ? 'low'
          : vitals.pulse > pulseRange.max
            ? 'high'
            : 'normal',

    rr:
      vitals.rr === undefined
        ? null
        : vitals.rr < rrRange.min
          ? 'low'
          : vitals.rr > rrRange.max
            ? 'high'
            : 'normal',

    temp:
      vitals.temp === undefined
        ? null
        : vitals.temp < NORMAL_RANGES.temp.min
          ? 'low'
          : vitals.temp > NORMAL_RANGES.temp.max
            ? 'high'
            : 'normal',
  };
}

// ============================================================================
// EXPORTS
// ============================================================================

export default {
  NORMAL_RANGES,
  SYMPTOM_PATTERNS,
  getRandomNormal,
  parseComplaint,
  findMatchingPatterns,
  inferVitals,
  checkVitalRanges,
};
