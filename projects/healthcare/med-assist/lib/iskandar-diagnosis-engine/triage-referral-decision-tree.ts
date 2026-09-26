/**
 * Triage & Referral Decision Tree
 *
 * Deterministic, auditable decision tree that turns the existing disease
 * knowledge base (`public/data/penyakit.json`) into an explicit branching
 * triage outcome plus an audit trail. It formalizes safety gating that the
 * scoring engine performs implicitly; it does NOT invent clinical criteria and
 * does NOT replace the ranked diagnosis shown to clinicians.
 *
 * Safety ordering is fixed: emergency > urgent review > referral > insufficient
 * data > local treatment. When inputs are invalid or ambiguous the tree fails
 * closed toward the safer branch, never toward routine local treatment.
 *
 * SSOT: docs/clinical-rules.md
 */

import type { PenyakitRawData } from '../rag/types';

import type { ConfidenceBand } from './diagnosis-algorithm';
import type { DifferentialVitals } from './differential-diagnosis';
import { runRedFlagChecks } from './red-flags';

import type { VitalSigns } from '@/types/api';

export type TriageOutcome =
  | 'emergency'
  | 'urgent_review'
  | 'refer'
  | 'insufficient'
  | 'treat_locally';

export type ConfidenceTier = 'high' | 'moderate' | 'low' | 'insufficient';

/** Disease fields consumed from the KB entry (`PenyakitRawData`). */
export type TriageDisease = Pick<
  PenyakitRawData,
  | 'id'
  | 'nama'
  | 'icd10'
  | 'kompetensi'
  | 'red_flags'
  | 'kriteria_rujukan'
  | 'gejala_klinis'
  | 'diagnosis_banding'
>;

export interface TriageDecisionInput {
  /** Cleaned complaint signal tokens. */
  complaintSignals: string[];
  /** Raw complaint text, scanned for red-flag keyword matches. */
  complaintText?: string;
  vitals: DifferentialVitals;
  disease: TriageDisease;
  confidenceBand: ConfidenceBand;
  pregnant?: boolean;
  chronicDiseases?: string[];
  allergies?: string[];
}

export interface TriageAuditEntry {
  node: number;
  nodeLabel: string;
  fired: boolean;
  firedCriteria: string[];
  sourceRef: string;
}

export interface TriageDecisionResult {
  outcome: TriageOutcome;
  confidenceTier: ConfidenceTier;
  /** Criteria of the terminal (deciding) node. */
  firedCriteria: string[];
  /** Free-text referral criteria from the KB, when present. */
  referralGuidance: string | null;
  icd10: string;
  auditTrail: TriageAuditEntry[];
  /** Non-fatal validation notes (e.g. out-of-range vitals). */
  invalidInputs: string[];
}

/** SKDI competence levels a Puskesmas GP cannot fully manage → refer. */
const REFERRAL_COMPETENCE_LEVELS = new Set(['1', '2', '3A', '3B']);

/** Physiologic bounds used only for input validation. `0` means "not measured". */
const VITAL_BOUNDS: Record<keyof DifferentialVitals, { min: number; max: number }> = {
  sbp: { min: 40, max: 300 },
  dbp: { min: 20, max: 200 },
  hr: { min: 20, max: 250 },
  rr: { min: 4, max: 60 },
  temp: { min: 30, max: 45 },
  glucose: { min: 10, max: 1000 },
};

function validateVitals(vitals: DifferentialVitals): {
  invalidInputs: string[];
  hasInvalidVital: boolean;
} {
  const invalidInputs: string[] = [];

  (Object.keys(VITAL_BOUNDS) as Array<keyof DifferentialVitals>).forEach((key) => {
    const value = vitals[key];
    if (value === 0) return; // not measured — allowed
    const bounds = VITAL_BOUNDS[key];
    if (!Number.isFinite(value) || value < bounds.min || value > bounds.max) {
      invalidInputs.push(
        `${key}=${value} di luar rentang fisiologis (${bounds.min}-${bounds.max})`
      );
    }
  });

  return { invalidInputs, hasInvalidVital: invalidInputs.length > 0 };
}

/** Map the engine vitals shape to the red-flag checker shape; drop invalid/zero. */
function toVitalSigns(vitals: DifferentialVitals): VitalSigns {
  const pick = (key: keyof DifferentialVitals): number | undefined => {
    const value = vitals[key];
    const bounds = VITAL_BOUNDS[key];
    if (value === 0 || !Number.isFinite(value) || value < bounds.min || value > bounds.max) {
      return undefined;
    }
    return value;
  };

  return {
    systolic: pick('sbp'),
    diastolic: pick('dbp'),
    heart_rate: pick('hr'),
    respiratory_rate: pick('rr'),
    temperature: pick('temp'),
  };
}

function mapConfidenceTier(band: ConfidenceBand): ConfidenceTier {
  if (band === 'very_high' || band === 'high') return 'high';
  if (band === 'moderate') return 'moderate';
  return 'low';
}

function normalizeText(value: string): string {
  return value.toLowerCase().replace(/\s+/g, ' ').trim();
}

/** KB red-flag phrases matched as text (numeric/threshold phrases are left to the structured checker). */
function matchKbRedFlags(redFlags: string[], complaintText: string): string[] {
  const haystack = normalizeText(complaintText);
  if (!haystack) return [];

  return redFlags.filter((flag) => {
    const phrase = normalizeText(flag);
    if (!phrase || /[0-9></]/.test(phrase)) return false;
    return haystack.includes(phrase);
  });
}

function normalizeCompetence(value: string): string {
  return value.trim().toUpperCase();
}

/**
 * Evaluate the triage & referral decision tree.
 *
 * Pure and deterministic: identical input yields identical output, no I/O.
 */
export function evaluateTriageReferralTree(input: TriageDecisionInput): TriageDecisionResult {
  const { disease, vitals, complaintSignals, confidenceBand } = input;
  const complaintText = input.complaintText ?? '';
  const icd10 = disease.icd10;
  const referralGuidance =
    disease.kriteria_rujukan && disease.kriteria_rujukan.trim().length > 0
      ? disease.kriteria_rujukan.trim()
      : null;

  const { invalidInputs, hasInvalidVital } = validateVitals(vitals);
  const auditTrail: TriageAuditEntry[] = [];

  const finalize = (
    outcome: TriageOutcome,
    confidenceTier: ConfidenceTier,
    firedCriteria: string[]
  ): TriageDecisionResult => ({
    outcome,
    confidenceTier,
    firedCriteria,
    referralGuidance,
    icd10,
    auditTrail,
    invalidInputs,
  });

  const record = (
    node: number,
    nodeLabel: string,
    fired: boolean,
    firedCriteria: string[],
    sourceRef: string
  ): void => {
    auditTrail.push({ node, nodeLabel, fired, firedCriteria, sourceRef });
  };

  // ── Node 1 — EMERGENCY (structured red-flag checker) ──────────────────────
  const redFlags = runRedFlagChecks({
    keluhan: complaintText,
    vitals: toVitalSigns(vitals),
    pregnant: input.pregnant ?? false,
    chronic_diseases: input.chronicDiseases ?? [],
    allergies: input.allergies ?? [],
  });
  const emergencyFlag = redFlags.find((flag) => flag.severity === 'emergency');
  if (emergencyFlag) {
    record(1, 'Emergency', true, emergencyFlag.criteria_met, `${emergencyFlag.id}#red_flags`);
    return finalize('emergency', 'high', emergencyFlag.criteria_met);
  }
  record(1, 'Emergency', false, [], `${disease.id}#red_flags`);

  // ── Node 2 — URGENT REVIEW (urgent/warning red flags + KB red-flag text) ──
  const urgentFlag = redFlags.find(
    (flag) => flag.severity === 'urgent' || flag.severity === 'warning'
  );
  const kbRedFlagHits = matchKbRedFlags(disease.red_flags, complaintText);
  if (urgentFlag || kbRedFlagHits.length > 0) {
    const criteria = [...(urgentFlag ? urgentFlag.criteria_met : []), ...kbRedFlagHits];
    record(2, 'Urgent review', true, criteria, `${disease.id}#red_flags`);
    return finalize('urgent_review', mapConfidenceTier(confidenceBand), criteria);
  }
  record(2, 'Urgent review', false, [], `${disease.id}#red_flags`);

  // ── Node 3 — REFER (SKDI competence below GP-complete) ────────────────────
  const competence = normalizeCompetence(disease.kompetensi);
  if (REFERRAL_COMPETENCE_LEVELS.has(competence)) {
    const criteria = [`Kompetensi SKDI ${competence} (di luar tuntas dokter umum)`];
    record(3, 'Refer', true, criteria, `${disease.id}#kompetensi`);
    return finalize('refer', mapConfidenceTier(confidenceBand), criteria);
  }
  record(3, 'Refer', false, [], `${disease.id}#kompetensi`);

  // ── Node 4 — INSUFFICIENT DATA (fail-closed on sparse/invalid input) ──────
  const measuredVitalCount = (Object.keys(VITAL_BOUNDS) as Array<keyof DifferentialVitals>).filter(
    (key) => vitals[key] !== 0 && Number.isFinite(vitals[key])
  ).length;
  const sparseSignals = complaintSignals.length < 2;
  const insufficient =
    complaintSignals.length === 0 ||
    (confidenceBand === 'low' && sparseSignals) ||
    (hasInvalidVital && sparseSignals && measuredVitalCount === 0);
  if (insufficient) {
    const criteria = ['Data klinis belum cukup untuk keputusan triase yang aman'];
    record(4, 'Insufficient data', true, criteria, `${disease.id}#gejala_klinis`);
    return finalize('insufficient', 'insufficient', criteria);
  }
  record(4, 'Insufficient data', false, [], `${disease.id}#gejala_klinis`);

  // ── Node 5 — TREAT LOCALLY (default; fail-closed to urgent on invalid vitals) ─
  if (hasInvalidVital) {
    const criteria = ['Tanda vital tidak valid — verifikasi ulang sebelum tata laksana lokal'];
    record(5, 'Treat locally', false, criteria, `${disease.id}#kompetensi`);
    return finalize('urgent_review', mapConfidenceTier(confidenceBand), criteria);
  }
  const criteria = [`Kompetensi SKDI ${competence} — tuntas di layanan primer`];
  record(5, 'Treat locally', true, criteria, `${disease.id}#kompetensi`);
  return finalize('treat_locally', mapConfidenceTier(confidenceBand), criteria);
}
