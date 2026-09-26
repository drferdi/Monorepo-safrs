// Designed and constructed by Drferdi.
/**
 * Iskandar Diagnosis Engine V1 — Traffic Light Safety Gate
 * 8 deterministic rules, escalation-only (NEVER downgrades).
 *
 * GREEN  = Safe for FKTP management
 * YELLOW = Caution, monitor closely, consider referral
 * RED    = Immediate action required, referral mandatory
 *
 * @module lib/iskandar-diagnosis-engine/traffic-light
 */

import type { RedFlag } from './red-flags';
import type { MatchedCandidate } from './symptom-matcher';

// =============================================================================
// TYPES
// =============================================================================

export type TrafficLightLevel = 'GREEN' | 'YELLOW' | 'RED';

/**
 * GateResult interface
 *
 * @remarks
 * TODO: Add type description and property documentation
 * Auto-generated on 2026-03-12
 */

export interface GateResult {
  rule: string;
  triggered: boolean;
  detail: string;
}

/**
 * TrafficLightOutput interface
 *
 * @remarks
 * TODO: Add type description and property documentation
 * Auto-generated on 2026-03-12
 */

export interface TrafficLightOutput {
  level: TrafficLightLevel;
  reason: string;
  gateResults: GateResult[];
  overrideApplied: boolean;
}

/**
 * TrafficLightInput interface
 *
 * @remarks
 * TODO: Add type description and property documentation
 * Auto-generated on 2026-03-12
 */

export interface TrafficLightInput {
  candidates: MatchedCandidate[];
  redFlags: RedFlag[];
  patientAge?: number;
  patientGender?: 'L' | 'P';
  ddiSeverityMax?: 'minor' | 'moderate' | 'major' | 'contraindicated';
  chronicDiseases?: string[];
  confidence: number;
}

// =============================================================================
// LEVEL ORDERING
// =============================================================================

const LEVEL_ORDER: Record<TrafficLightLevel, number> = {
  GREEN: 0,
  YELLOW: 1,
  RED: 2,
};

function escalate(current: TrafficLightLevel, target: TrafficLightLevel): TrafficLightLevel {
  // Escalation-only: can ONLY go up, NEVER down
  return LEVEL_ORDER[target] > LEVEL_ORDER[current] ? target : current;
}

// =============================================================================
// 8 SAFETY RULES
// =============================================================================

export function classifyTrafficLight(input: TrafficLightInput): TrafficLightOutput {
  let level: TrafficLightLevel = 'GREEN';
  const reasons: string[] = [];
  const gateResults: GateResult[] = [];
  let overrideApplied = false;

  // ─── RULE 1: RED if any red flag from matched diseases ───────────────
  const topCandidate = input.candidates[0];
  const hasKBRedFlags = topCandidate?.redFlags && topCandidate.redFlags.length > 0;
  if (hasKBRedFlags) {
    level = escalate(level, 'YELLOW');
    overrideApplied = true;
    reasons.push(`Red flags: ${topCandidate.redFlags.slice(0, 2).join('; ')}`);
  }
  gateResults.push({
    rule: 'Rule 1: KB Red Flags',
    triggered: !!hasKBRedFlags,
    detail: hasKBRedFlags
      ? `${topCandidate.redFlags.length} red flag(s) in top diagnosis`
      : 'No KB red flags',
  });

  // ─── RULE 2: RED if rujukan criteria met ─────────────────────────────
  const hasRujukan =
    topCandidate?.kriteria_rujukan &&
    topCandidate.kriteria_rujukan.trim().length > 0 &&
    topCandidate.kompetensi !== '4A';
  if (hasRujukan) {
    level = escalate(level, 'YELLOW');
    overrideApplied = true;
    reasons.push(
      `Kompetensi ${topCandidate.kompetensi}: ${topCandidate.kriteria_rujukan.substring(0, 100)}`
    );
  }
  gateResults.push({
    rule: 'Rule 2: Rujukan Criteria',
    triggered: !!hasRujukan,
    detail: hasRujukan
      ? `Top diagnosis requires referral (${topCandidate.kompetensi})`
      : 'No referral criteria triggered',
  });

  // ─── RULE 3: RED if low confidence ───────────────────────────────────
  const isLowConfidence = input.confidence < 0.3;
  if (isLowConfidence) {
    level = escalate(level, 'YELLOW');
    overrideApplied = true;
    reasons.push(`Low confidence: ${(input.confidence * 100).toFixed(0)}%`);
  }
  gateResults.push({
    rule: 'Rule 3: Low Confidence',
    triggered: isLowConfidence,
    detail: isLowConfidence
      ? `Confidence ${(input.confidence * 100).toFixed(0)}% < 30% threshold`
      : `Confidence ${(input.confidence * 100).toFixed(0)}% adequate`,
  });

  // ─── RULE 4: RED if extreme age + acute ──────────────────────────────
  const isExtremeAge =
    input.patientAge !== undefined && (input.patientAge < 2 || input.patientAge > 70);
  const hasAcuteSymptoms = input.candidates.some(
    (c) =>
      c.redFlags.length > 0 ||
      c.bodySystem === 'SISTEM KARDIOVASKULAR' ||
      c.bodySystem === 'SISTEM SARAF'
  );
  const ageRisk = isExtremeAge && hasAcuteSymptoms;
  if (ageRisk) {
    level = escalate(level, 'RED');
    overrideApplied = true;
    reasons.push(`Extreme age (${input.patientAge} yr) with acute presentation → RED`);
  }
  gateResults.push({
    rule: 'Rule 4: Extreme Age + Acute',
    triggered: ageRisk,
    detail: ageRisk ? `Age ${input.patientAge} with acute symptoms` : 'No age-based escalation',
  });

  // ─── RULE 5: YELLOW if no KB match ───────────────────────────────────
  const noMatch = input.candidates.length === 0;
  if (noMatch) {
    level = escalate(level, 'YELLOW');
    overrideApplied = true;
    reasons.push('No KB match found — unknown presentation');
  }
  gateResults.push({
    rule: 'Rule 5: No KB Match',
    triggered: noMatch,
    detail: noMatch
      ? 'No diseases matched from KB'
      : `${input.candidates.length} candidates matched`,
  });

  // ─── RULE 6: DDI severity escalation ─────────────────────────────────
  const ddiCritical =
    input.ddiSeverityMax === 'major' || input.ddiSeverityMax === 'contraindicated';
  if (ddiCritical) {
    level = escalate(level, 'RED');
    overrideApplied = true;
    reasons.push(`DDI severity: ${input.ddiSeverityMax} — medication interaction risk`);
  }
  gateResults.push({
    rule: 'Rule 6: DDI Severity',
    triggered: ddiCritical,
    detail: ddiCritical ? `DDI severity ${input.ddiSeverityMax}` : 'No critical DDI',
  });

  // ─── RULE 7: Cardiometabolic cluster ─────────────────────────────────
  const ncdIcds = ['I10', 'E11', 'E10', 'I25', 'I50', 'E78'];
  const ncdMatches = input.candidates.filter((c) => ncdIcds.some((ncd) => c.icd10.startsWith(ncd)));
  const hasNcdCluster = ncdMatches.length >= 2;
  if (hasNcdCluster && LEVEL_ORDER[level] < LEVEL_ORDER['YELLOW']) {
    level = escalate(level, 'YELLOW');
    overrideApplied = true;
    reasons.push(
      `Cardiometabolic cluster: ${ncdMatches.length} NCD candidates (${ncdMatches.map((c) => c.icd10).join(', ')})`
    );
  }
  gateResults.push({
    rule: 'Rule 7: Cardiometabolic Cluster',
    triggered: hasNcdCluster,
    detail: hasNcdCluster ? `${ncdMatches.length} NCD candidates detected` : 'No NCD cluster',
  });

  // ─── RULE 8: Acute-on-chronic ────────────────────────────────────────
  const chronicIcds = (input.chronicDiseases || []).map((d) => d.toUpperCase().trim());
  const acuteOnChronic =
    chronicIcds.length > 0 &&
    input.candidates.some((c) => {
      const candidatePrefix = c.icd10.split('.')[0];
      return chronicIcds.some((ch) => ch.startsWith(candidatePrefix)) && c.redFlags.length > 0;
    });
  if (acuteOnChronic) {
    level = escalate(level, 'RED');
    overrideApplied = true;
    reasons.push('Acute-on-chronic: acute symptoms on known chronic disease');
  }
  gateResults.push({
    rule: 'Rule 8: Acute-on-Chronic',
    triggered: acuteOnChronic,
    detail: acuteOnChronic
      ? 'Acute symptoms on chronic disease detected'
      : 'No acute-on-chronic pattern',
  });

  // ─── EXISTING RED FLAGS (from red-flags.ts) ──────────────────────────
  // If the separate red-flags module detected emergencies, escalate
  if (input.redFlags.length > 0) {
    const hasEmergency = input.redFlags.some((r) => r.severity === 'emergency');
    const hasUrgent = input.redFlags.some((r) => r.severity === 'urgent');
    if (hasEmergency) {
      level = escalate(level, 'RED');
      overrideApplied = true;
      reasons.push(
        `Emergency red flag: ${input.redFlags
          .filter((r) => r.severity === 'emergency')
          .map((r) => r.condition)
          .join('; ')}`
      );
    } else if (hasUrgent) {
      level = escalate(level, 'RED');
      overrideApplied = true;
      reasons.push(
        `Urgent red flag: ${input.redFlags
          .filter((r) => r.severity === 'urgent')
          .map((r) => r.condition)
          .join('; ')}`
      );
    }
  }

  return {
    level,
    reason: reasons.length > 0 ? reasons.join(' | ') : 'No safety concerns detected',
    gateResults,
    overrideApplied,
  };
}
