/**
 * Diagnosis engine contract.
 *
 * Every diagnosis engine (the legacy Iskandar engine, and the MIRA candidate) takes the same
 * de-identified `CaseState` and returns the same `EngineResult`. Fields an engine cannot fill are
 * left empty and listed in `unfilled`; an engine never invents them.
 *
 * Safety rules (red flags, emergency gates, triage/referral) are deliberately not part of this
 * contract: they run outside any engine, whichever engine is active.
 *
 * @module lib/diagnosis-engine/types
 */

export type DiagnosisEngineId = 'legacy' | 'mira';

/** Same scale as the side panel's confidence band (`ClinicalDifferential.tsx`). */
export type ConfidenceTier = 'high' | 'moderate' | 'low' | 'unknown';

/** De-identified case. Never contains names, record numbers, ID numbers or contact details. */
export interface CaseState {
  demographics: {
    ageYears: number | null;
    sex: 'M' | 'F' | 'unknown';
    pregnant?: boolean;
  };
  chiefComplaint: string;
  anamnesis: {
    freeText?: string;
    qa?: Array<{ question: string; answer: string }>;
  };
  vitals: {
    systolic?: number;
    diastolic?: number;
    heartRate?: number;
    respiratoryRate?: number;
    /** Degrees Celsius. */
    temperature?: number;
    spo2?: number;
    gcs?: number;
  };
  physicalExam: string[];
  results: Array<{
    name: string;
    value: string | number;
    unit?: string;
    flag?: 'normal' | 'abnormal';
  }>;
  currentMedications: string[];
  /** Known chronic conditions and allergies: the legacy engine uses both. */
  knownConditions: string[];
  allergies: string[];
  /** What the facility can do on site, e.g. "lab:darah-rutin", "ekg". Empty when unknown. */
  facilityCapabilities: string[];
}

export interface DiagnosisItem {
  icd10: string;
  label: string;
  confidenceTier: ConfidenceTier;
  /** The engine's own 0–1 score, when it has one. */
  score?: number;
}

export interface DiagnosisEvidence {
  icd10: string;
  supporting: string[];
  opposing: string[];
}

export interface NextBestAction {
  kind: 'question' | 'exam' | 'test';
  item: string;
  reason: string;
}

export interface DispositionSuggestion {
  decision: 'treat' | 'refer';
  urgency: 'routine' | 'urgent' | 'emergency';
}

export type EngineResultField =
  | 'differential.likely'
  | 'differential.alternatives'
  | 'differential.cannotMiss'
  | 'evidence.supporting'
  | 'evidence.opposing'
  | 'missingInformation'
  | 'nextBestActions'
  | 'disposition';

export interface UnfilledField {
  field: EngineResultField;
  reason: string;
}

export interface EngineResultMeta {
  engineId: DiagnosisEngineId;
  version: string;
  model: string | null;
  costUsd: number | null;
  latencyMs: number | null;
  traceId: string;
}

export interface EngineResult {
  /** `unavailable`: the engine failed, timed out or was blocked; the differential is empty. */
  status: 'ok' | 'unavailable';
  differential: {
    likely: DiagnosisItem[];
    alternatives: DiagnosisItem[];
    cannotMiss: DiagnosisItem[];
  };
  evidence: DiagnosisEvidence[];
  missingInformation: string[];
  nextBestActions: NextBestAction[];
  disposition: DispositionSuggestion | null;
  unfilled: UnfilledField[];
  error?: { code: string; message: string };
  meta: EngineResultMeta;
}

export interface DiagnosisEngine {
  readonly id: DiagnosisEngineId;
  readonly version: string;
  step(input: CaseState, opts?: { signal?: AbortSignal }): Promise<EngineResult>;
}
