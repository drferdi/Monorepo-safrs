// Designed and constructed by Drferdi.
/**
 * Pattern Evaluation Engine — Clinical Pattern-Matching Engine (v2).
 *
 * Evaluates 70 clinical patterns against a ClinicalSnapshot simultaneously.
 * Returns matched patterns sorted by severity, with deduplication against
 * existing buildAlerts() output.
 *
 * Source: docs/specs/assist-gate 2-detect-trigger-action.md
 * @module lib/emergency-detector/pattern-engine
 */

import type { ClinicalSnapshot } from './clinical-snapshot';
import type {
  AlertSeverity,
  ClinicalPattern,
  Criterion,
  PatternMatch,
  PatternTier,
  ScoreResult,
} from './pattern-types';

// ---------------------------------------------------------------------------
// ScreeningAlert shape (matches TTVInferenceUI.tsx ScreeningAlert interface)
// ---------------------------------------------------------------------------

/** Matches the existing ScreeningAlert interface in TTVInferenceUI.tsx. */
export interface PatternScreeningAlert {
  id: string;
  type: string;
  severity: AlertSeverity;
  title: string;
  gate: string;
  reasoning: string;
  recommendations: string[];
  actionProtocolId?: string;
  clinicalData?: Record<string, number | undefined>;
}

// ---------------------------------------------------------------------------
// Severity ordering
// ---------------------------------------------------------------------------

const SEVERITY_ORDER: Record<AlertSeverity, number> = {
  critical: 0,
  high: 1,
  warning: 2,
};

// ---------------------------------------------------------------------------
// Dot-path field resolver
// ---------------------------------------------------------------------------

/**
 * Resolve a dot-path field from a ClinicalSnapshot.
 *
 * @example
 * resolveField(snapshot, 'vitals.rr') → snapshot.vitals.rr
 * resolveField(snapshot, 'symptoms.chestPain') → snapshot.symptoms.chestPain
 * resolveField(snapshot, 'derived.shockIndex') → snapshot.derived.shockIndex
 */
function resolveField(snapshot: ClinicalSnapshot, field: string): unknown {
  const parts = field.split('.');
  let current: unknown = snapshot;
  for (const part of parts) {
    if (current === null || current === undefined) return undefined;
    current = (current as Record<string, unknown>)[part];
  }
  return current;
}

// ---------------------------------------------------------------------------
// Criterion evaluator
// ---------------------------------------------------------------------------

/**
 * Evaluate a single criterion against the snapshot.
 *
 * @returns true if the criterion is satisfied
 */
function evaluateCriterion(snapshot: ClinicalSnapshot, criterion: Criterion): boolean {
  const value = resolveField(snapshot, criterion.field);
  if (value === undefined || value === null) return false;

  switch (criterion.op) {
    case 'gte':
      return typeof value === 'number' && value >= (criterion.value as number);
    case 'lte':
      return typeof value === 'number' && value <= (criterion.value as number);
    case 'gt':
      return typeof value === 'number' && value > (criterion.value as number);
    case 'lt':
      return typeof value === 'number' && value < (criterion.value as number);
    case 'eq':
      return value === criterion.value;
    case 'neq':
      return value !== criterion.value;
    case 'true':
      return value === true;
    case 'false':
      return value === false;
    case 'between': {
      if (typeof value !== 'number' || !Array.isArray(criterion.value)) return false;
      const [min, max] = criterion.value as [number, number];
      return value >= min && value <= max;
    }
    case 'in': {
      if (typeof criterion.value !== 'string') return false;
      return criterion.value.split(',').includes(String(value));
    }
    default:
      return false;
  }
}

// ---------------------------------------------------------------------------
// Required vitals check
// ---------------------------------------------------------------------------

/**
 * Check if required vitals are present (non-zero) in the snapshot.
 */
function hasRequiredVitals(snapshot: ClinicalSnapshot, pattern: ClinicalPattern): boolean {
  if (!pattern.requiresVitals || pattern.requiresVitals.length === 0) return true;
  return pattern.requiresVitals.every((field) => {
    const val = resolveField(snapshot, `vitals.${field}`);
    return typeof val === 'number' && val > 0;
  });
}

// ---------------------------------------------------------------------------
// Template resolution
// ---------------------------------------------------------------------------

/**
 * Fill {placeholder} tokens in a template string with values from the snapshot.
 *
 * Supported tokens: {sbp}, {dbp}, {hr}, {rr}, {temp}, {spo2}, {glucose},
 * {map}, {shockIndex}, {avpuLevel}, {htnSeverity}, {glucoseCategory}, {age}
 */
function resolveTemplate(template: string, snapshot: ClinicalSnapshot): string {
  return template.replace(/\{(\w+)\}/g, (match, key: string) => {
    switch (key) {
      case 'sbp':
        return String(snapshot.vitals.sbp);
      case 'dbp':
        return String(snapshot.vitals.dbp);
      case 'hr':
        return String(snapshot.vitals.hr);
      case 'rr':
        return String(snapshot.vitals.rr);
      case 'temp':
        return String(snapshot.vitals.temp);
      case 'spo2':
        return String(snapshot.vitals.spo2);
      case 'glucose':
        return String(snapshot.vitals.glucose);
      case 'map':
        return snapshot.derived.map != null ? String(snapshot.derived.map) : '--';
      case 'shockIndex':
        return snapshot.derived.shockIndex != null ? snapshot.derived.shockIndex.toFixed(2) : '--';
      case 'avpuLevel':
        return snapshot.derived.avpuLevel;
      case 'htnSeverity':
        return snapshot.derived.htnSeverity ?? '--';
      case 'glucoseCategory':
        return snapshot.derived.glucoseCategory ?? '--';
      case 'age':
        return String(snapshot.patient.age);
      default:
        return match; // Leave unrecognized tokens as-is
    }
  });
}

// ---------------------------------------------------------------------------
// Confidence calculator
// ---------------------------------------------------------------------------

/**
 * Calculate confidence for a pattern match.
 *
 * Base confidence:
 * - Tier A (vitals-only): 0.90
 * - Tier B (vitals + keywords): 0.70
 * - Tier C (needs structured input): 0.50
 *
 * Adjusted by: pattern.confidenceWeight and scored criteria ratio.
 */
function calculateConfidence(pattern: ClinicalPattern, score?: ScoreResult): number {
  const tierBase: Record<PatternTier, number> = { A: 0.9, B: 0.7, C: 0.5 };
  let confidence = tierBase[pattern.tier];

  // Apply pattern-specific weight
  if (pattern.confidenceWeight != null) {
    confidence *= pattern.confidenceWeight;
  }

  // Boost if scored criteria exceeded minimum
  if (score && score.total > 0) {
    const ratio = score.achieved / score.total;
    confidence *= 0.8 + 0.2 * ratio; // Range: 0.8x to 1.0x
  }

  return Math.min(1.0, Math.max(0.0, confidence));
}

// ---------------------------------------------------------------------------
// Engine options
// ---------------------------------------------------------------------------

/** Options for pattern evaluation. */
export interface EvaluateOptions {
  /** Only evaluate patterns in these tiers. Default: all tiers. */
  tierFilter?: PatternTier[];
}

// ---------------------------------------------------------------------------
// Main evaluation function
// ---------------------------------------------------------------------------

/**
 * Evaluate ALL patterns against a clinical snapshot.
 *
 * @param snapshot - ClinicalSnapshot built by buildClinicalSnapshot()
 * @param patterns - Array of ClinicalPattern definitions (from clinical-patterns.ts)
 * @param existingAlertIds - IDs from existing buildAlerts() output (for deduplication)
 * @param options - Optional tier filtering
 * @returns Matched patterns sorted by severity (critical first)
 */
export function evaluatePatterns(
  snapshot: ClinicalSnapshot,
  patterns: readonly ClinicalPattern[],
  existingAlertIds: string[],
  options?: EvaluateOptions
): PatternMatch[] {
  const tierFilter = options?.tierFilter;
  const matches: PatternMatch[] = [];

  for (const pattern of patterns) {
    // 1. Tier filter
    if (tierFilter && !tierFilter.includes(pattern.tier)) continue;

    // 2. Deduplication — skip if superseded by existing alert
    if (pattern.supersededBy?.some((id) => existingAlertIds.includes(id))) continue;

    // 3. Required vitals check
    if (!hasRequiredVitals(snapshot, pattern)) continue;

    // 4. Evaluate ALL required criteria (must all pass)
    const requiredResults = pattern.requiredCriteria.map((c) => ({
      criterion: c,
      passed: evaluateCriterion(snapshot, c),
    }));
    if (requiredResults.some((r) => !r.passed)) continue;

    // 5. Evaluate scored criteria (if any)
    let scoreResult: ScoreResult | undefined;
    let scoredPassed: Criterion[] = [];
    if (pattern.scoredCriteria && pattern.scoredCriteria.length > 0) {
      const scoredResults = pattern.scoredCriteria.map((c) => ({
        criterion: c,
        passed: evaluateCriterion(snapshot, c),
      }));
      const achieved = scoredResults.filter((r) => r.passed).length;
      const required = pattern.minScore ?? pattern.scoredCriteria.length;
      if (achieved < required) continue;
      scoreResult = { achieved, required, total: pattern.scoredCriteria.length };
      scoredPassed = scoredResults.filter((r) => r.passed).map((r) => r.criterion);
    }

    // 6. Collect all matched criteria for audit trail
    const matchedCriteria: Criterion[] = [
      ...requiredResults.filter((r) => r.passed).map((r) => r.criterion),
      ...scoredPassed,
    ];

    // 7. Build PatternMatch
    const confidence = calculateConfidence(pattern, scoreResult);

    matches.push({
      pattern,
      matchedCriteria,
      score: scoreResult,
      resolvedTitle: resolveTemplate(pattern.title, snapshot),
      resolvedReasoning: resolveTemplate(pattern.reasoning, snapshot),
      clinicalData: {
        sbp: snapshot.vitals.sbp,
        dbp: snapshot.vitals.dbp,
        hr: snapshot.vitals.hr,
        rr: snapshot.vitals.rr,
        temp: snapshot.vitals.temp,
        spo2: snapshot.vitals.spo2,
        glucose: snapshot.vitals.glucose,
        map: snapshot.derived.map ?? 0,
      },
      confidence,
      actionProtocolId: pattern.actionProtocolId,
    });
  }

  // Sort by severity (critical first), then by confidence (highest first)
  return matches.sort((a, b) => {
    const sevDiff = SEVERITY_ORDER[a.pattern.severity] - SEVERITY_ORDER[b.pattern.severity];
    if (sevDiff !== 0) return sevDiff;
    return b.confidence - a.confidence;
  });
}

// ---------------------------------------------------------------------------
// Converter: PatternMatch[] → ScreeningAlert[]
// ---------------------------------------------------------------------------

/**
 * Convert pattern matches to ScreeningAlert-compatible objects.
 * These merge directly with existing buildAlerts() output.
 */
export function patternMatchesToAlerts(matches: PatternMatch[]): PatternScreeningAlert[] {
  return matches.map((m) => ({
    id: `pattern-${m.pattern.id}`,
    type: m.pattern.gate,
    severity: m.pattern.severity,
    title: m.resolvedTitle,
    gate: m.pattern.gate,
    reasoning:
      m.resolvedReasoning +
      (m.score ? ` (Score: ${m.score.achieved}/${m.score.total})` : '') +
      ` [Confidence: ${(m.confidence * 100).toFixed(0)}%]`,
    recommendations: m.pattern.recommendations,
    actionProtocolId: m.pattern.actionProtocolId,
    clinicalData: m.clinicalData,
  }));
}
