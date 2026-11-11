// Designed and constructed by Drferdi.
/**
 * Precision-Architected. Future-Built by Docsyanpse
 * Sentra Healthcare Artificial Intelligence
 */

/**
 * Validation Pipeline Type Definitions
 *
 * @module lib/iskandar-diagnosis-engine/validation/types
 * @version 1.0.0
 */

import type { AIDiagnosisSuggestion } from '../../api/ai-types';
import type { RedFlag } from '../red-flags';

// =============================================================================
// VALIDATION RESULT TYPES
// =============================================================================

/**
 * Result from validation pipeline
 */
export interface ValidationResult {
  /** Overall validation passed */
  valid: boolean;

  /** Highest layer passed (1-5) */
  layer_passed: 1 | 2 | 3 | 4 | 5;

  /** Filtered and validated suggestions */
  filtered_suggestions: ValidatedSuggestion[];

  /** ICD-10 codes that could not be verified */
  unverified_codes: string[];

  /** Red flags from safety layer */
  red_flags: RedFlag[];

  /** Warning messages */
  warnings: string[];

  /** Detailed layer results */
  layer_results: LayerResult[];
}

/**
 * Validated diagnosis suggestion with additional metadata
 */
export interface ValidatedSuggestion extends AIDiagnosisSuggestion {
  /** Whether ICD-10 code was verified in RAG database */
  rag_verified: boolean;

  /** Confidence adjustment applied */
  confidence_adjusted: boolean;

  /** Original confidence before adjustment */
  original_confidence?: number;

  /** Validation flags */
  validation_flags: ValidationFlag[];
}

/**
 * Validation flag for individual suggestion
 */
export interface ValidationFlag {
  /** Flag type */
  type: 'warning' | 'info' | 'error';

  /** Flag code */
  code: string;

  /** Human-readable message */
  message: string;
}

/**
 * Result from individual validation layer
 */
export interface LayerResult {
  /** Layer number */
  layer: 1 | 2 | 3 | 4 | 5;

  /** Layer name */
  name: string;

  /** Whether layer passed */
  passed: boolean;

  /** Number of suggestions filtered/modified */
  affected_count: number;

  /** Details about what was done */
  details: string[];
}

// =============================================================================
// VALIDATION CONTEXT TYPES
// =============================================================================

/**
 * Context passed through validation pipeline
 */
export interface ValidationContext {
  /** Patient age in years */
  patient_age: number;

  /** Patient gender */
  patient_gender: 'L' | 'P';

  /** Pregnancy status */
  is_pregnant: boolean;

  /** Original chief complaint */
  keluhan_utama: string;

  /** Red flags already detected */
  existing_red_flags: RedFlag[];
}

// =============================================================================
// LAYER-SPECIFIC TYPES
// =============================================================================

/**
 * Layer 1: Syntax validation errors
 */
export interface SyntaxError {
  field: string;
  expected: string;
  actual: string;
}

/**
 * Layer 2: Schema validation result
 */
export interface SchemaValidationResult {
  code: string;
  exists: boolean;
  name_en?: string;
  name_id?: string;
}

/**
 * Layer 3: Clinical plausibility check
 */
export interface ClinicalCheck {
  code: string;
  check_type: 'age' | 'gender' | 'pregnancy' | 'combination';
  passed: boolean;
  reason?: string;
}

/**
 * Layer 5: Confidence adjustment
 */
export interface ConfidenceAdjustment {
  code: string;
  original: number;
  adjusted: number;
  reason: string;
}
