// Designed and constructed by Drferdi.
/**
 * Pattern Engine Type Definitions — Clinical Pattern-Matching Engine (v2).
 *
 * Patterns are DATA, not functions — inspectable, serializable, testable.
 * Each pattern encodes a clinical rule from the GATE v2 spec as a set of
 * criteria evaluated against a ClinicalSnapshot.
 *
 * Source: docs/specs/assist-gate 2-detect-trigger-action.md
 * @module lib/emergency-detector/pattern-types
 */

import type { ClinicalGateId } from './gate-registry';

// ---------------------------------------------------------------------------
// Criterion — a single testable condition
// ---------------------------------------------------------------------------

/** Comparison operators for criterion evaluation. */
export type CriterionOp =
  | 'gte' // >=
  | 'lte' // <=
  | 'gt' // >
  | 'lt' // <
  | 'eq' // ===
  | 'neq' // !==
  | 'true' // value === true
  | 'false' // value === false
  | 'between' // value >= min && value <= max
  | 'in'; // value in comma-separated list

/**
 * A single testable condition within a pattern.
 *
 * @example
 * { field: 'vitals.rr', op: 'gte', value: 22, label: 'RR >= 22 (qSOFA)' }
 * { field: 'symptoms.chestPain', op: 'true', value: true, label: 'Nyeri dada tipikal' }
 * { field: 'derived.shockIndex', op: 'between', value: [0.9, 1.2], label: 'SI 0.9-1.2' }
 */
export interface Criterion {
  /** Dot-path into ClinicalSnapshot, e.g. 'vitals.rr', 'symptoms.chestPain' */
  field: string;
  /** Comparison operator */
  op: CriterionOp;
  /** Threshold value(s). [min, max] for 'between'; comma-string for 'in'. */
  value: number | string | boolean | [number, number];
  /** Human-readable label for audit trail / UI display */
  label?: string;
}

// ---------------------------------------------------------------------------
// Pattern Tier
// ---------------------------------------------------------------------------

/**
 * Implementation priority tier.
 * - A: Fires with current vital-sign-only inputs
 * - B: Fires with vitals + keyword extraction from symptomText
 * - C: Needs new structured UI inputs (knownDM, CRT, etc.)
 */
export type PatternTier = 'A' | 'B' | 'C';

// ---------------------------------------------------------------------------
// ClinicalPattern — one of 70 pattern definitions
// ---------------------------------------------------------------------------

/** Alert severity levels matching existing ScreeningAlert. */
export type AlertSeverity = 'critical' | 'high' | 'warning';

/**
 * A clinical pattern definition.
 * 70 of these are defined as const data in clinical-patterns.ts.
 */
export interface ClinicalPattern {
  /** Unique pattern ID: 'CP-001' through 'CP-070' */
  id: string;

  /** Which GATE category this pattern belongs to */
  gate: ClinicalGateId;

  /** Alert severity when pattern fires */
  severity: AlertSeverity;

  /** Alert title (may include {placeholder} tokens for vitals) */
  title: string;

  /** Clinical reasoning template (may include {placeholder} tokens) */
  reasoning: string;

  /**
   * REQUIRED criteria — ALL must pass for the pattern to match.
   * These are "hard gates"; if any fails, the pattern is skipped entirely.
   */
  requiredCriteria: Criterion[];

  /**
   * SCORED criteria — at least `minScore` of these must pass.
   * Models clinical scoring systems like qSOFA (2 of 3).
   * If empty or undefined, only requiredCriteria matter.
   */
  scoredCriteria?: Criterion[];

  /** Minimum scored criteria that must pass. Defaults to length of scoredCriteria. */
  minScore?: number;

  /** Static recommendations (FKTP action items) */
  recommendations: string[];

  /** Reference to ABCDE action protocol ID (if applicable) */
  actionProtocolId?: string;

  /** Implementation tier */
  tier: PatternTier;

  /**
   * IDs of existing buildAlerts() alerts, or of patterns listed earlier in the
   * pattern array, that already cover this pattern. If any of these IDs exist
   * in the current alert set or among earlier matches, this pattern match is
   * suppressed to prevent duplicate or contradictory alerts.
   */
  supersededBy?: string[];

  /**
   * Vital sign fields that must be present (> 0) for this pattern to evaluate.
   * Dot-paths relative to `vitals.`, e.g. ['sbp', 'hr', 'rr'].
   * Pattern is skipped if any listed vital is 0 (not entered).
   */
  requiresVitals?: string[];

  /** Evidence source citation (guideline, journal, protocol) */
  source: string;

  /** Differential diagnoses to consider */
  differentials?: string[];

  /** Confidence weight: 1.0 = full confidence, 0.5 = keyword-dependent */
  confidenceWeight?: number;
}

// ---------------------------------------------------------------------------
// PatternMatch — output of the evaluation engine
// ---------------------------------------------------------------------------

/** Score breakdown for scored-criteria patterns (e.g. qSOFA 2/3). */
export interface ScoreResult {
  /** Number of scored criteria that passed */
  achieved: number;
  /** Minimum required to match */
  required: number;
  /** Total scored criteria in the pattern */
  total: number;
}

/**
 * Result of a single pattern evaluation — produced by the engine,
 * consumed by the alert builder to create ScreeningAlert objects.
 */
export interface PatternMatch {
  /** The pattern that matched */
  pattern: ClinicalPattern;

  /** Which criteria were satisfied (for audit/reasoning) */
  matchedCriteria: Criterion[];

  /** Score breakdown for scored-criteria patterns */
  score?: ScoreResult;

  /** Resolved title with {placeholder} tokens filled from snapshot */
  resolvedTitle: string;

  /** Resolved reasoning with {placeholder} tokens filled */
  resolvedReasoning: string;

  /** Vital sign data at time of match (for clinicalData field on alert) */
  clinicalData: Record<string, number>;

  /** Computed confidence (0.0 - 1.0) */
  confidence: number;

  /** Reference to action protocol if applicable */
  actionProtocolId?: string;
}
