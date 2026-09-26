// Designed and constructed by Drferdi.
/**
 * Symptom Signal Extraction — Clinical Pattern-Matching Engine (v2).
 *
 * Extracts boolean symptom signals from free-text symptomText via keyword
 * matching. Includes negation handling to reduce false positives.
 *
 * Source: docs/specs/assist-gate 2-detect-trigger-action.md
 * @module lib/emergency-detector/symptom-signals
 */

import type { VitalScreeningProfile } from '@/lib/clinical/vital-screening-thresholds';

// ---------------------------------------------------------------------------
// Negation patterns — reduce false positives from "tidak sesak", "sesak (-)"
// ---------------------------------------------------------------------------

/**
 * Indonesian negation prefixes that, when preceding a keyword, negate it.
 * Checked within a window of ~20 chars before the keyword match.
 */
const NEGATION_PREFIXES = [
  'tidak ',
  'tidak ada ',
  'tdk ',
  'tak ',
  'tanpa ',
  'bukan ',
  'menyangkal ',
  'deny ',
  'no ',
] as const;

/** Negation suffixes that appear right after the keyword. */
const NEGATION_SUFFIXES = [' (-)', ' (negatif)', ' disangkal', ' tidak ada', ' tdk ada'] as const;

// ---------------------------------------------------------------------------
// Keyword groups — Indonesian clinical terms organized by signal
// ---------------------------------------------------------------------------

export const KEYWORD_GROUPS = {
  // ── Existing signals (mirrored from TTVInferenceUI for snapshot use) ──
  dizziness: ['pusing', 'oyong', 'mau pingsan', 'berputar', 'vertigo'],
  weakness: ['lemas', 'lemah', 'tidak kuat', 'lesu', 'loyo'],
  presyncope: ['hampir pingsan', 'mau jatuh', 'kunang', 'gelap'],
  syncope: ['pingsan', 'hilang kesadaran', 'jatuh tiba'],
  orthostaticCue: [
    'pusing',
    'berkunang',
    'limbung',
    'jatuh',
    'sinkop',
    'pingsan',
    'lemas',
    'lemah',
  ],
  atypicalInfectionCue: [
    'bingung',
    'delirium',
    'jatuh',
    'lemas',
    'lemah',
    'nafsu makan turun',
    'intake turun',
    'penurunan aktivitas',
    'penurunan fungsi',
  ],

  // ── New signals for GATE v2 ──

  suspectedInfection: [
    'demam',
    'panas',
    'menggigil',
    'infeksi',
    'luka bernanah',
    'batuk berdahak',
    'pilek',
    'radang',
    'bengkak merah',
    'nyeri telan',
  ],
  highRiskWoundInfection: [
    'luka bernanah',
    'luka kaki bernanah',
    'luka di kaki bernanah',
    'borok',
    'ulkus',
    'ulkus diabetikum',
    'luka diabetik',
    'kaki diabetes',
    'diabetic foot',
    'gangren',
    'gangrene',
    'nekrosis',
    'jaringan menghitam',
    'kaki menghitam',
    'luka kehitaman',
    'bau busuk pada luka',
    'bau busuk dari luka',
  ],
  chestPain: [
    'nyeri dada',
    'dada terasa berat',
    'dada seperti ditekan',
    'dada seperti ditindih',
    'dada seperti terbakar',
    'dada sesak',
    'rasa tertekan di dada',
    'sakit dada',
  ],
  chestPainDuration20min: [
    'sudah 20 menit',
    'lebih 20 menit',
    'sejak 20 menit',
    'lebih dari 20 menit',
    'sudah setengah jam',
    'lebih setengah jam',
  ],
  diaphoresis: ['keringat dingin', 'berkeringat dingin', 'keringat banyak saat istirahat'],
  dyspnea: ['sesak napas', 'sulit bernapas', 'sesak', 'napas pendek', 'ngos-ngosan'],
  suddenDyspnea: ['sesak mendadak', 'tiba-tiba sesak', 'sesak tiba-tiba'],
  wheezing: ['mengi', 'ngik-ngik', 'bunyi napas', 'wheezing', 'napas bunyi'],
  focalNeuroDeficit: [
    'wajah merot',
    'mulut mencong',
    'lengan lemah',
    'tangan lemah',
    'kaki lemah',
    'bicara pelo',
    'bicara tidak jelas',
    'cadel mendadak',
    'pandangan kabur mendadak',
    'buta mendadak',
    'mata kabur tiba-tiba',
  ],
  suddenOnset: ['mendadak', 'tiba-tiba', 'secara tiba-tiba', 'onset akut'],
  skinMucosalSymptoms: [
    'urtikaria',
    'bengkak bibir',
    'bengkak mata',
    'bengkak wajah',
    'gatal seluruh',
    'biduran',
    'ruam merah',
    'bentol-bentol',
  ],
  allergenExposure: [
    'setelah makan',
    'setelah minum obat',
    'setelah disuntik',
    'tersengat',
    'alergi',
    'setelah gigitan',
  ],
  kussmaulBreathing: [
    'napas dalam cepat',
    'napas kussmaul',
    'napas dalam dan cepat',
    'napas cepat dalam',
  ],
  giSymptoms: ['mual', 'muntah', 'nyeri perut', 'diare', 'sakit perut', 'kembung berat'],
  fatigue: ['lelah', 'capek', 'lesu', 'lemah kronik', 'mudah lelah', 'cepat capek'],
  pallor: ['pucat', 'wajah pucat', 'bibir pucat', 'konjungtiva pucat'],
  difficultySpeaking: [
    'sulit bicara karena sesak',
    'tidak bisa bicara',
    'bicara terputus-putus',
    'hanya bisa beberapa kata',
  ],
  accessoryMuscles: [
    'otot bantu napas',
    'retraksi',
    'napas cuping hidung',
    'tarikan dinding dada',
    'retraksi suprasternal',
  ],
  thromboembolismRisk: [
    'immobilisasi',
    'pasca operasi',
    'pil kb',
    'kontrasepsi hormonal',
    'perjalanan jauh',
    'tirah baring lama',
    'riwayat dvt',
    'riwayat pe',
    'kanker',
  ],
  nausea: ['mual', 'mau muntah'],
  polyuria: ['sering kencing', 'kencing terus', 'poliuria', 'banyak kencing'],
  polydipsia: ['haus terus', 'minum banyak', 'polidipsia'],
  seizure: ['kejang', 'step', 'klonus'],
  alteredMentalStatus: [
    'bingung',
    'gelisah',
    'tidak nyambung',
    'disorientasi',
    'delirium',
    'kesadaran menurun',
    'mengantuk berat',
  ],
  bleedingHistory: [
    'bab hitam',
    'melena',
    'muntah darah',
    'haid banyak',
    'perdarahan',
    'mimisan',
    'gusi berdarah',
  ],
} as const;

// ---------------------------------------------------------------------------
// SymptomSignals interface — boolean outputs consumed by ClinicalSnapshot
// ---------------------------------------------------------------------------

export interface SymptomSignals {
  // ── Existing signals (replicated for snapshot isolation) ──
  dizziness: boolean;
  weakness: boolean;
  presyncope: boolean;
  syncope: boolean;
  orthostaticCue: boolean;
  atypicalInfectionCue: boolean;

  // ── New signals for pattern engine ──
  suspectedInfection: boolean;
  highRiskWoundInfection: boolean;
  chestPain: boolean;
  chestPainDuration20min: boolean;
  diaphoresis: boolean;
  dyspnea: boolean;
  suddenDyspnea: boolean;
  wheezing: boolean;
  focalNeuroDeficit: boolean;
  suddenOnset: boolean;
  skinMucosalSymptoms: boolean;
  allergenExposure: boolean;
  kussmaulBreathing: boolean;
  giSymptoms: boolean;
  fatigue: boolean;
  pallor: boolean;
  difficultySpeaking: boolean;
  accessoryMuscles: boolean;
  thromboembolismRisk: boolean;
  nausea: boolean;
  polyuria: boolean;
  polydipsia: boolean;
  seizure: boolean;
  alteredMentalStatus: boolean;
  bleedingHistory: boolean;
  clinicalConcern: boolean; // Tier C — future UI checkbox (pattern #70)
}

// ---------------------------------------------------------------------------
// Negation-aware keyword matching
// ---------------------------------------------------------------------------

/**
 * Check if a keyword appears in text WITHOUT being negated.
 *
 * Handles Indonesian negation patterns:
 * - "tidak sesak" → negated → false
 * - "sesak (-)" → negated → false
 * - "sesak napas berat" → NOT negated → true
 *
 * @param text - Normalized (lowercased, trimmed) symptom text
 * @param keyword - Single keyword to search for
 * @returns true if keyword is present and NOT negated
 */
function isKeywordPresentNotNegated(text: string, keyword: string): boolean {
  let searchFrom = 0;
  while (searchFrom < text.length) {
    const idx = text.indexOf(keyword, searchFrom);
    if (idx === -1) return false;

    // Check negation prefix (look back up to 20 chars)
    const windowStart = Math.max(0, idx - 20);
    const prefix = text.slice(windowStart, idx);
    const negatedByPrefix = NEGATION_PREFIXES.some((neg) => prefix.endsWith(neg));

    if (!negatedByPrefix) {
      // Check negation suffix
      const afterKeyword = text.slice(idx + keyword.length, idx + keyword.length + 15);
      const negatedBySuffix = NEGATION_SUFFIXES.some((neg) => afterKeyword.startsWith(neg));

      if (!negatedBySuffix) {
        return true; // Found non-negated occurrence
      }
    }

    // This occurrence was negated — keep searching for next occurrence
    searchFrom = idx + keyword.length;
  }
  return false;
}

/**
 * Check if ANY keyword in the group is present in text without negation.
 *
 * @param text - Normalized (lowercased, trimmed) symptom text
 * @param keywords - Array of keywords to check
 * @returns true if at least one keyword matches without negation
 */
export function hasSignal(text: string, keywords: readonly string[]): boolean {
  return keywords.some((keyword) => isKeywordPresentNotNegated(text, keyword));
}

// ---------------------------------------------------------------------------
// Main extraction function
// ---------------------------------------------------------------------------

/**
 * Extract all symptom signals from free text + structured inputs.
 *
 * @param symptomText - Raw symptom text from user (will be lowercased)
 * @param allergies - Selected allergies from checkbox inputs
 * @param physiology - Age-stratified vital screening profile
 * @returns SymptomSignals with all boolean flags
 */
export function extractSymptomSignals(
  symptomText: string,
  _allergies: string[],
  physiology: VitalScreeningProfile
): SymptomSignals {
  const text = symptomText.toLowerCase().trim();
  const match = (group: keyof typeof KEYWORD_GROUPS) => hasSignal(text, KEYWORD_GROUPS[group]);

  return {
    // Existing signals
    dizziness: match('dizziness'),
    weakness: match('weakness'),
    presyncope: match('presyncope'),
    syncope: match('syncope'),
    orthostaticCue: physiology.isOlderAdult && match('orthostaticCue'),
    atypicalInfectionCue: physiology.isOlderAdult && match('atypicalInfectionCue'),

    // New signals for GATE v2
    suspectedInfection: match('suspectedInfection'),
    highRiskWoundInfection: match('highRiskWoundInfection'),
    chestPain: match('chestPain'),
    chestPainDuration20min: match('chestPainDuration20min'),
    diaphoresis: match('diaphoresis'),
    dyspnea: match('dyspnea'),
    suddenDyspnea: match('suddenDyspnea'),
    wheezing: match('wheezing'),
    focalNeuroDeficit: match('focalNeuroDeficit'),
    suddenOnset: match('suddenOnset'),
    skinMucosalSymptoms: match('skinMucosalSymptoms'),
    allergenExposure: match('allergenExposure'),
    kussmaulBreathing: match('kussmaulBreathing'),
    giSymptoms: match('giSymptoms'),
    fatigue: match('fatigue'),
    pallor: match('pallor'),
    difficultySpeaking: match('difficultySpeaking'),
    accessoryMuscles: match('accessoryMuscles'),
    thromboembolismRisk: match('thromboembolismRisk'),
    nausea: match('nausea'),
    polyuria: match('polyuria'),
    polydipsia: match('polydipsia'),
    seizure: match('seizure'),
    alteredMentalStatus: match('alteredMentalStatus'),
    bleedingHistory: match('bleedingHistory'),
    clinicalConcern: false, // Tier C — placeholder until UI checkbox exists
  };
}
