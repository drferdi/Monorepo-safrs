// Designed and constructed by Drferdi.
/**
 * Precision-Architected. Future-Built by Docsyanpse
 * Sentra Healthcare Artificial Intelligence
 */

/**
 * 5-Layer Validation Pipeline
 * Multi-stage validation for AI diagnosis suggestions
 *
 * @module lib/iskandar-diagnosis-engine/validation
 * @version 1.0.0
 *
 * Pipeline:
 * Layer 1: Syntax - JSON format and required fields
 * Layer 2: Schema - ICD-10 code existence in RAG database
 * Layer 3: Clinical - Medical plausibility (age, gender, pregnancy)
 * Layer 4: Safety - Enrich matched suggestions with KB red-flag text;
 *           emergency red flags remain on ValidationResult (alerts), not dx inject
 * Layer 5: Confidence - Threshold filtering and adjustment
 */

import type { AIDiagnosisSuggestion } from '../../api/ai-types';
import { icd10DB } from '../../rag/icd10-db';
import type { ICD10Entry } from '../../rag/types';
import type { RedFlag } from '../red-flags';

import type {
  LayerResult,
  ValidatedSuggestion,
  ValidationContext,
  ValidationResult,
} from './types';

// =============================================================================
// LAYER 1: SYNTAX VALIDATION
// =============================================================================

/**
 * Validate JSON structure and required fields
 */
function validateSyntax(suggestions: unknown[]): {
  passed: boolean;
  valid: AIDiagnosisSuggestion[];
  errors: string[];
} {
  const valid: AIDiagnosisSuggestion[] = [];
  const errors: string[] = [];

  if (!Array.isArray(suggestions)) {
    return { passed: false, valid: [], errors: ['Input is not an array'] };
  }

  for (let i = 0; i < suggestions.length; i++) {
    const s = suggestions[i] as Record<string, unknown>;

    // Check required fields
    if (!s || typeof s !== 'object') {
      errors.push(`Suggestion ${i}: not an object`);
      continue;
    }

    const requiredFields = ['diagnosis_name', 'icd10_code', 'confidence'];
    const missingFields = requiredFields.filter((f) => !(f in s));

    if (missingFields.length > 0) {
      errors.push(`Suggestion ${i}: missing fields: ${missingFields.join(', ')}`);
      continue;
    }

    // Validate types
    if (typeof s.diagnosis_name !== 'string' || s.diagnosis_name.length === 0) {
      errors.push(`Suggestion ${i}: invalid diagnosis_name`);
      continue;
    }

    if (typeof s.icd10_code !== 'string' || s.icd10_code.length === 0) {
      errors.push(`Suggestion ${i}: invalid icd10_code`);
      continue;
    }

    if (typeof s.confidence !== 'number' || s.confidence < 0 || s.confidence > 1) {
      errors.push(`Suggestion ${i}: invalid confidence (must be 0-1)`);
      continue;
    }

    // Normalize to AIDiagnosisSuggestion
    valid.push({
      rank: (s.rank as number) || i + 1,
      diagnosis_name: s.diagnosis_name as string,
      icd10_code: (s.icd10_code as string).toUpperCase(),
      confidence: s.confidence as number,
      reasoning: (s.reasoning as string) || '',
      red_flags: Array.isArray(s.red_flags) ? s.red_flags : [],
      recommended_actions: Array.isArray(s.recommended_actions) ? s.recommended_actions : [],
    });
  }

  return {
    passed: valid.length > 0,
    valid,
    errors,
  };
}

// =============================================================================
// LAYER 2: SCHEMA VALIDATION (ICD-10 Code Existence)
// =============================================================================

/**
 * Schema validation result with ICD10 entries
 */
interface SchemaValidationResult {
  passed: boolean;
  verified: Map<string, boolean>;
  unverified: string[];
  /** ICD10 entries from RAG database for enrichment */
  entries: Map<string, ICD10Entry>;
}

/**
 * Verify ICD-10 codes exist in RAG database
 * Also fetches full ICD10Entry for enrichment (red flags, terapi, etc.)
 */
async function validateSchema(
  suggestions: AIDiagnosisSuggestion[]
): Promise<SchemaValidationResult> {
  const verified = new Map<string, boolean>();
  const unverified: string[] = [];
  const entries = new Map<string, ICD10Entry>();

  for (const suggestion of suggestions) {
    const code = suggestion.icd10_code;

    // Fetch full entry from RAG database
    const entry = await icd10DB.getByCode(code);

    if (entry) {
      verified.set(code, true);
      entries.set(code, entry);
    } else {
      verified.set(code, false);
      unverified.push(code);
    }
  }

  return {
    passed: unverified.length < suggestions.length, // At least some verified
    verified,
    unverified,
    entries,
  };
}

// =============================================================================
// LAYER 3: CLINICAL PLAUSIBILITY
// =============================================================================

/**
 * Check medical plausibility based on patient demographics
 */
function validateClinical(
  suggestions: AIDiagnosisSuggestion[],
  context: ValidationContext
): {
  passed: boolean;
  filtered: AIDiagnosisSuggestion[];
  removed: Array<{ code: string; reason: string }>;
} {
  const filtered: AIDiagnosisSuggestion[] = [];
  const removed: Array<{ code: string; reason: string }> = [];

  for (const suggestion of suggestions) {
    const code = suggestion.icd10_code;

    // Check pregnancy codes (O00-O99) for male patients
    if (context.patient_gender === 'L' && code.startsWith('O')) {
      removed.push({ code, reason: 'Pregnancy code for male patient' });
      continue;
    }

    // Check neonatal codes (P00-P96) for non-infants
    if (code.startsWith('P') && context.patient_age > 1) {
      removed.push({ code, reason: 'Neonatal code for non-infant' });
      continue;
    }

    // Check pediatric-specific codes for adults
    // (This is simplified - in production would have more specific rules)

    // Check obstetric codes for non-pregnant females
    if (
      context.patient_gender === 'P' &&
      !context.is_pregnant &&
      code.startsWith('O') &&
      !['O80', 'O82'].includes(code.substring(0, 3)) // Delivery codes OK
    ) {
      // Add warning but don't remove
      suggestion.red_flags = [
        ...(suggestion.red_flags || []),
        'Kode obstetri untuk pasien tidak hamil',
      ];
    }

    filtered.push(suggestion);
  }

  return {
    passed: filtered.length > 0,
    filtered,
    removed,
  };
}

// =============================================================================
// LAYER 4: SAFETY INTEGRATION
// =============================================================================

/**
 * Integrate red flags into suggestions
 * Sources:
 * 1. Hardcoded red flags from vital signs (emergency detection) — stay as
 *    ValidationResult.red_flags / engine alerts; do NOT inject into dx list.
 * 2. Disease-specific red flags from penyakit.json (144 Penyakit Puskesmas)
 *    enrich text on already-matched suggestions only.
 */
function integrateSafety(
  suggestions: AIDiagnosisSuggestion[],
  _emergencyRedFlags: RedFlag[],
  icd10Entries: Map<string, ICD10Entry>
): AIDiagnosisSuggestion[] {
  // Fail-closed ranking: emergency red-flag ICDs must not pollute differential.
  // Engine already maps `existing_red_flags` → CDSS alerts (redFlagsToAlerts).
  // Enrich suggestions with disease-specific red flags from penyakit.json
  for (const suggestion of suggestions) {
    const entry = icd10Entries.get(suggestion.icd10_code);

    if (entry) {
      // Add disease-specific red flags from 144 Penyakit Puskesmas
      if (entry.red_flags && entry.red_flags.length > 0) {
        const existingFlags = new Set(suggestion.red_flags || []);
        for (const rf of entry.red_flags) {
          if (!existingFlags.has(rf)) {
            suggestion.red_flags = [...(suggestion.red_flags || []), rf];
            existingFlags.add(rf);
          }
        }
      }

      // Add therapy recommendations if available
      if (entry.terapi && entry.terapi.length > 0 && suggestion.recommended_actions) {
        const terapiSummary = entry.terapi
          .slice(0, 3) // Limit to top 3 medications
          .map((t) => `${t.obat} ${t.dosis} ${t.frek}`)
          .join('; ');

        if (
          terapiSummary &&
          !suggestion.recommended_actions.some((a) => a.includes(terapiSummary))
        ) {
          suggestion.recommended_actions.push(`Terapi PPK: ${terapiSummary}`);
        }
      }

      // Add referral criteria if available
      if (entry.kriteria_rujukan && entry.kriteria_rujukan.length > 0) {
        if (!suggestion.recommended_actions) {
          suggestion.recommended_actions = [];
        }
        const rujukanExists = suggestion.recommended_actions.some(
          (a) => a.toLowerCase().includes('rujuk') || a.toLowerCase().includes('referral')
        );
        if (!rujukanExists) {
          suggestion.recommended_actions.push(`Kriteria Rujukan: ${entry.kriteria_rujukan}`);
        }
      }
    }
  }

  return suggestions;
}

// =============================================================================
// LAYER 5: CONFIDENCE FILTERING
// =============================================================================

/**
 * Filter by confidence threshold and adjust overconfident suggestions
 */
function filterConfidence(suggestions: AIDiagnosisSuggestion[]): {
  filtered: ValidatedSuggestion[];
  adjustments: Array<{ code: string; from: number; to: number; reason: string }>;
} {
  // Validation is sanity check only (removes obvious junk).
  // Real filtering happens in diagnosis-algorithm.ts using adjustedConfidence.
  const MIN_CONFIDENCE = 0.15; // Sanity threshold (keep low to allow composite boosting)
  const CONSIDER_THRESHOLD = 0.6; // Tier marker for UI (informational)
  const MAX_CONFIDENCE = 0.95;
  const OVERCONFIDENCE_THRESHOLD = 0.95;

  const filtered: ValidatedSuggestion[] = [];
  const adjustments: Array<{ code: string; from: number; to: number; reason: string }> = [];

  for (const suggestion of suggestions) {
    // Skip only obvious junk (15% is garbage threshold)
    if (suggestion.confidence < MIN_CONFIDENCE) {
      continue;
    }

    const validated: ValidatedSuggestion = {
      ...suggestion,
      rag_verified: false, // Will be set by schema layer
      confidence_adjusted: false,
      validation_flags: [],
    };

    // Warn and cap overconfident suggestions
    if (suggestion.confidence > OVERCONFIDENCE_THRESHOLD) {
      validated.original_confidence = suggestion.confidence;
      validated.confidence = MAX_CONFIDENCE;
      validated.confidence_adjusted = true;
      validated.validation_flags.push({
        type: 'warning',
        code: 'OVERCONFIDENCE',
        message: `Confidence diturunkan dari ${(suggestion.confidence * 100).toFixed(0)}% ke ${(MAX_CONFIDENCE * 100).toFixed(0)}%`,
      });

      adjustments.push({
        code: suggestion.icd10_code,
        from: suggestion.confidence,
        to: MAX_CONFIDENCE,
        reason: 'Overconfidence warning',
      });
    }

    if (suggestion.confidence >= CONSIDER_THRESHOLD) {
      // Primary tier: High confidence (≥60%)
      validated.validation_flags.push({
        type: 'info',
        code: 'CONFIDENCE_TIER_PRIMARY',
        message: 'Kepercayaan tinggi - rekomendasi utama',
      });
    } else {
      // Secondary tier: Moderate confidence (40-60%)
      validated.validation_flags.push({
        type: 'info',
        code: 'CONFIDENCE_TIER_SECONDARY',
        message: '⚠️ Pertimbangkan juga (kepercayaan sedang)',
      });
    }

    // Check for empty reasoning
    if (!suggestion.reasoning || suggestion.reasoning.length < 20) {
      validated.validation_flags.push({
        type: 'warning',
        code: 'INCOMPLETE_REASONING',
        message: 'Reasoning tidak lengkap',
      });
    }

    filtered.push(validated);
  }

  // Re-rank by confidence
  filtered.sort((a, b) => b.confidence - a.confidence);
  filtered.forEach((s, i) => {
    s.rank = i + 1;
  });

  return { filtered, adjustments };
}

// =============================================================================
// MAIN PIPELINE
// =============================================================================

/**
 * Run full validation pipeline
 */
export async function runValidationPipeline(
  rawSuggestions: AIDiagnosisSuggestion[],
  context: ValidationContext
): Promise<ValidationResult> {
  const layerResults: LayerResult[] = [];
  const warnings: string[] = [];
  let currentSuggestions = rawSuggestions;

  // Layer 1: Syntax
  const syntaxResult = validateSyntax(currentSuggestions as unknown[]);
  layerResults.push({
    layer: 1,
    name: 'Syntax Validation',
    passed: syntaxResult.passed,
    affected_count: rawSuggestions.length - syntaxResult.valid.length,
    details: syntaxResult.errors,
  });

  if (!syntaxResult.passed) {
    return {
      valid: false,
      layer_passed: 1,
      filtered_suggestions: [],
      unverified_codes: [],
      red_flags: context.existing_red_flags,
      warnings: syntaxResult.errors,
      layer_results: layerResults,
    };
  }

  currentSuggestions = syntaxResult.valid;

  // Layer 2: Schema (ICD-10 verification)
  const schemaResult = await validateSchema(currentSuggestions);
  layerResults.push({
    layer: 2,
    name: 'ICD-10 Schema Validation',
    passed: schemaResult.passed,
    affected_count: schemaResult.unverified.length,
    details: schemaResult.unverified.map((c) => `Unverified: ${c}`),
  });

  if (schemaResult.unverified.length > 0) {
    warnings.push(
      `${schemaResult.unverified.length} kode ICD-10 tidak terverifikasi dalam database`
    );
  }

  // Layer 3: Clinical plausibility
  const clinicalResult = validateClinical(currentSuggestions, context);
  layerResults.push({
    layer: 3,
    name: 'Clinical Plausibility',
    passed: clinicalResult.passed,
    affected_count: clinicalResult.removed.length,
    details: clinicalResult.removed.map((r) => `${r.code}: ${r.reason}`),
  });

  if (!clinicalResult.passed) {
    warnings.push('Semua saran diagnosis tidak sesuai dengan profil pasien');
  }

  currentSuggestions = clinicalResult.filtered;

  // Layer 4: Safety integration (hardcoded + disease-specific red flags)
  const safetyResult = integrateSafety(
    currentSuggestions,
    context.existing_red_flags,
    schemaResult.entries
  );

  // Count disease-specific red flags enriched
  let diseaseRedFlagCount = 0;
  for (const [, entry] of schemaResult.entries) {
    if (entry.red_flags && entry.red_flags.length > 0) {
      diseaseRedFlagCount += entry.red_flags.length;
    }
  }

  layerResults.push({
    layer: 4,
    name: 'Safety Integration',
    passed: true,
    affected_count: context.existing_red_flags.length + diseaseRedFlagCount,
    details: [
      ...context.existing_red_flags.map(
        (f) => `Emergency red flag (alert-only, not dx inject): ${f.condition}`
      ),
      ...(diseaseRedFlagCount > 0
        ? [`${diseaseRedFlagCount} disease-specific red flags dari PPK`]
        : []),
    ],
  });

  currentSuggestions = safetyResult;

  // Layer 5: Confidence filtering
  const confidenceResult = filterConfidence(currentSuggestions);
  layerResults.push({
    layer: 5,
    name: 'Confidence Filtering',
    passed: confidenceResult.filtered.length > 0,
    affected_count: currentSuggestions.length - confidenceResult.filtered.length,
    details: confidenceResult.adjustments.map(
      (a) => `${a.code}: ${(a.from * 100).toFixed(0)}% → ${(a.to * 100).toFixed(0)}%`
    ),
  });

  // Mark RAG verification status
  for (const suggestion of confidenceResult.filtered) {
    suggestion.rag_verified = schemaResult.verified.get(suggestion.icd10_code) || false;

    if (!suggestion.rag_verified) {
      suggestion.validation_flags.push({
        type: 'warning',
        code: 'UNVERIFIED_CODE',
        message: 'Kode ICD-10 tidak terverifikasi dalam database lokal',
      });
    }
  }

  return {
    valid: confidenceResult.filtered.length > 0,
    layer_passed: 5,
    filtered_suggestions: confidenceResult.filtered,
    unverified_codes: schemaResult.unverified,
    red_flags: context.existing_red_flags,
    warnings,
    layer_results: layerResults,
  };
}

// =============================================================================
// EXPORTS
// =============================================================================

export type {
  LayerResult,
  ValidatedSuggestion,
  ValidationContext,
  ValidationFlag,
  ValidationResult,
} from './types';
