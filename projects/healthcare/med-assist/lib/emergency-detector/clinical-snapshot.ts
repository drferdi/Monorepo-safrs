// Designed and constructed by Drferdi.
/**
 * Clinical Snapshot Builder — Clinical Pattern-Matching Engine (v2).
 *
 * Builds a unified ClinicalSnapshot from TTVStateShape + patient context.
 * Existing detectors (AVPU, HTN, Glucose, Shock) run as ENRICHERS to populate
 * derived values — they are NOT modified.
 *
 * Source: docs/specs/assist-gate 2-detect-trigger-action.md
 * @module lib/emergency-detector/clinical-snapshot
 */

import type { AvpuLevel } from '@/lib/clinical/aassist-v2/avpu-engine';
import { determineAVPU } from '@/lib/clinical/aassist-v2/avpu-engine';
import type { VitalScreeningProfile } from '@/lib/clinical/vital-screening-thresholds';
import { getVitalScreeningProfile } from '@/lib/clinical/vital-screening-thresholds';
import type { GlucoseCategory } from './glucose-classifier';
import { classifyBloodGlucose } from './glucose-classifier';
import type { HTNSeverity } from './htn-classifier';
import { getHTNSeverity } from './htn-classifier';
import type { HistoricalBP } from './occult-shock-detector';
import { calculateMAP } from './occult-shock-detector';
import type { SymptomSignals } from './symptom-signals';
import { extractSymptomSignals } from './symptom-signals';

// ---------------------------------------------------------------------------
// Parsed Vitals — numeric values from string inputs
// ---------------------------------------------------------------------------

/** Numeric vitals parsed from string form inputs. 0 = not entered. */
export interface ParsedVitals {
  sbp: number;
  dbp: number;
  hr: number;
  rr: number;
  temp: number;
  spo2: number;
  glucose: number;
}

// ---------------------------------------------------------------------------
// Derived Values — computed from vitals + existing detectors
// ---------------------------------------------------------------------------

/** Values computed by running existing detectors as enrichers. */
export interface DerivedValues {
  /** Mean Arterial Pressure: (SBP + 2*DBP) / 3 */
  map: number | undefined;
  /** Shock Index: HR / SBP */
  shockIndex: number | undefined;
  /** AVPU consciousness level from avpu-engine */
  avpuLevel: AvpuLevel;
  /** HTN severity from htn-classifier */
  htnSeverity: HTNSeverity | undefined;
  /** Glucose category from glucose-classifier */
  glucoseCategory: GlucoseCategory | undefined;
  /** Whether SBP is below age-appropriate hypotension floor */
  hasHypotension: boolean;
  /** Pulse pressure: SBP - DBP */
  pulsePressure: number | undefined;
}

// ---------------------------------------------------------------------------
// Clinical History
// ---------------------------------------------------------------------------

/** Patient history and context flags. */
export interface ClinicalHistory {
  bpHistory: HistoricalBP[];
  knownHTN: boolean;
  knownDM: boolean; // Tier C — placeholder until UI input exists
  knownAsthma: boolean; // Tier C
  knownCOPD: boolean; // Tier C
  pregnancyStatus: boolean | null;
  allergies: string[];
  chronicDiseases: string[]; // Tier C
}

// ---------------------------------------------------------------------------
// Patient Context
// ---------------------------------------------------------------------------

/** Patient demographics and physiology profile. */
export interface PatientContext {
  age: number;
  physiology: VitalScreeningProfile;
  /** Manual AVPU selection from form dropdown (C = Confused, maps to V for clinical purposes) */
  avpuManual: 'A' | 'C' | 'V' | 'P' | 'U';
  supplementalO2: boolean;
  painScore: number;
}

// ---------------------------------------------------------------------------
// ClinicalSnapshot — the unified input to the pattern engine
// ---------------------------------------------------------------------------

/**
 * Unified clinical snapshot evaluated by the pattern engine.
 * Built once per vital-sign change, consumed by all 70 patterns.
 */
export interface ClinicalSnapshot {
  vitals: ParsedVitals;
  derived: DerivedValues;
  symptoms: SymptomSignals;
  history: ClinicalHistory;
  patient: PatientContext;
  /** Timestamp for temporal patterns (Date.now()) */
  timestamp: number;
}

// ---------------------------------------------------------------------------
// Minimal form state interface (avoids importing the full TTVInferenceUI)
// ---------------------------------------------------------------------------

/**
 * Subset of TTVStateShape needed to build a snapshot.
 * Avoids circular dependency with TTVInferenceUI.tsx.
 */
export interface SnapshotFormState {
  sbp: string;
  dbp: string;
  hr: string;
  rr: string;
  temp: string;
  spo2: string;
  glucose: string;
  symptomText: string;
  allergies: string[];
  pregnancyStatus: boolean | null;
  avpu: 'A' | 'C' | 'V' | 'P' | 'U';
  supplemental_o2: boolean;
  pain_score: string;
}

// ---------------------------------------------------------------------------
// Utility: parse string to number (same logic as buildAlerts)
// ---------------------------------------------------------------------------

/** Parse a string vital to a number. Returns 0 for empty/invalid. */
function parseVital(val: string): number {
  if (!val || val.trim() === '' || val === '---') return 0;
  const n = Number(val.replace(',', '.'));
  return Number.isFinite(n) ? n : 0;
}

// ---------------------------------------------------------------------------
// Factory function
// ---------------------------------------------------------------------------

/**
 * Build a ClinicalSnapshot from form state and patient context.
 *
 * Runs existing detectors as ENRICHERS to populate derived values.
 * All enricher calls are pure functions (no I/O, no side effects).
 *
 * @param state - Current TTV form state (string values)
 * @param patient - Patient info (age required)
 * @param context - Optional BP history and HTN flag
 * @returns ClinicalSnapshot ready for pattern evaluation
 */
export function buildClinicalSnapshot(
  state: SnapshotFormState,
  patient: { patientAge?: number },
  context?: { bpHistory?: HistoricalBP[]; knownHTN?: boolean }
): ClinicalSnapshot {
  const age = patient.patientAge || 0;

  // 1. Parse string vitals to numbers
  const vitals: ParsedVitals = {
    sbp: parseVital(state.sbp),
    dbp: parseVital(state.dbp),
    hr: parseVital(state.hr),
    rr: parseVital(state.rr),
    temp: parseVital(state.temp),
    spo2: parseVital(state.spo2),
    glucose: parseVital(state.glucose),
  };

  // 2. Age-stratified physiology profile
  const physiology = getVitalScreeningProfile(age);

  // 3. Derived values — existing detectors as enrichers
  const hasBP = vitals.sbp > 0 && vitals.dbp > 0;
  const map = hasBP ? calculateMAP(vitals.sbp, vitals.dbp) : undefined;
  const shockIndex = vitals.sbp > 0 && vitals.hr > 0 ? vitals.hr / vitals.sbp : undefined;
  const pulsePressure = hasBP ? vitals.sbp - vitals.dbp : undefined;

  // AVPU enricher
  const avpuResult =
    vitals.sbp > 0 && vitals.spo2 > 0
      ? determineAVPU({
          sbp: vitals.sbp,
          spo2: vitals.spo2,
          rr: vitals.rr,
          hr: vitals.hr,
          glucose: vitals.glucose > 0 ? vitals.glucose : -1,
        })
      : { avpu: 'A' as const };

  // HTN severity enricher
  const htnSeverity = hasBP ? getHTNSeverity({ sbp: vitals.sbp, dbp: vitals.dbp }) : undefined;

  // Glucose category enricher
  const glucoseCategory =
    vitals.glucose > 0
      ? classifyBloodGlucose({
          gds: vitals.glucose,
          sample_type: 'capillary',
          has_classic_symptoms: false,
        }).category
      : undefined;

  // Hypotension check (age-appropriate floor)
  const hasHypotension = vitals.sbp > 0 && vitals.sbp < physiology.hypotensionSbpFloor;

  // 4. Symptom signals from text
  const symptoms = extractSymptomSignals(state.symptomText, state.allergies, physiology);

  // 5. Clinical history
  const history: ClinicalHistory = {
    bpHistory: context?.bpHistory ?? [],
    knownHTN: Boolean(context?.knownHTN),
    knownDM: false, // Tier C
    knownAsthma: false, // Tier C
    knownCOPD: false, // Tier C
    pregnancyStatus: state.pregnancyStatus,
    allergies: state.allergies,
    chronicDiseases: [], // Tier C
  };

  // 6. Patient context
  const patientCtx: PatientContext = {
    age,
    physiology,
    avpuManual: state.avpu,
    supplementalO2: state.supplemental_o2,
    painScore: parseVital(state.pain_score),
  };

  return {
    vitals,
    derived: {
      map,
      shockIndex,
      avpuLevel: avpuResult.avpu,
      htnSeverity,
      glucoseCategory,
      hasHypotension,
      pulsePressure,
    },
    symptoms,
    history,
    patient: patientCtx,
    timestamp: Date.now(),
  };
}
