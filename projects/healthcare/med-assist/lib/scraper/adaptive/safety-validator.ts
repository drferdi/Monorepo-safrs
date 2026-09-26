// Designed and constructed by Drferdi.
/**
 * Precision-Architected. Future-Built by Docsyanpse
 * Sentra Healthcare Artificial Intelligence
 */

/**
 * DAS Phase 2: Safety Validator
 *
 * Ensures clinical safety by validating AI mappings before execution.
 * Enforces confidence thresholds and blocks critical field auto-fills.
 *
 * @module lib/scraper/adaptive/safety-validator
 */

import type {
  ClinicalFieldCategory,
  FieldMapping,
  FieldSignature,
  ValidationResult,
} from './types';

// ============================================================================
// CLINICAL FIELD PATTERNS
// ============================================================================

/**
 * Patterns for identifying clinical-critical fields
 */
const CRITICAL_FIELD_PATTERNS: Record<ClinicalFieldCategory, RegExp[]> = {
  vital_signs: [
    /sistol/i,
    /diastol/i,
    /tekanan.*darah/i,
    /blood.*pressure/i,
    /nadi/i,
    /pulse/i,
    /heart.*rate/i,
    /nafas/i,
    /respir/i,
    /suhu/i,
    /temp/i,
    /spo2/i,
    /saturasi/i,
    /berat.*badan/i,
    /weight/i,
    /tinggi.*badan/i,
    /height/i,
  ],
  medication: [
    /obat/i,
    /drug/i,
    /medication/i,
    /dosis/i,
    /dosage/i,
    /dose/i,
    /signa/i,
    /aturan.*pakai/i,
    /jumlah.*obat/i,
    /rute/i,
    /route/i,
    /frekuensi/i,
    /frequency/i,
  ],
  allergy: [/alergi/i, /allergy/i, /allergic/i, /intoleran/i, /reaksi.*obat/i, /drug.*reaction/i],
  patient_id: [
    /no.*rm/i,
    /rekam.*medis/i,
    /medical.*record/i,
    /nik/i,
    /bpjs/i,
    /kartu.*identitas/i,
    /pasien.*id/i,
    /patient.*id/i,
  ],
  diagnosis: [/icd/i, /diagnos/i, /penyakit/i, /disease/i, /kondisi/i, /condition/i],
  general: [], // Catch-all, no specific patterns
};

/**
 * Confidence thresholds by field category
 * Critical fields require higher confidence
 */
const CATEGORY_THRESHOLDS: Record<ClinicalFieldCategory, number> = {
  vital_signs: 0.9, // High threshold for vitals
  medication: 0.95, // Highest for medications
  allergy: 0.95, // Highest for allergies
  patient_id: 0.99, // Almost always require exact match
  diagnosis: 0.85, // Moderate for diagnosis
  general: 0.8, // Standard threshold
};

// ============================================================================
// FIELD CLASSIFICATION
// ============================================================================

/**
 * Classify a field into clinical category
 *
 * @param field - Field to classify
 * @returns Clinical category
 */
export function classifyClinicalCategory(field: FieldSignature): ClinicalFieldCategory {
  // Build search text from all field attributes
  const searchText = [
    field.attributes.name,
    field.attributes.id,
    field.attributes.placeholder,
    field.attributes.ariaLabel,
    field.label,
    ...field.context.siblingLabels,
  ]
    .filter(Boolean)
    .join(' ')
    .toLowerCase();

  // Check each category
  for (const [category, patterns] of Object.entries(CRITICAL_FIELD_PATTERNS)) {
    if (category === 'general') continue;

    for (const pattern of patterns) {
      if (pattern.test(searchText)) {
        return category as ClinicalFieldCategory;
      }
    }
  }

  return 'general';
}

/**
 * Check if a field is clinically critical
 *
 * @param field - Field to check
 * @returns True if field is critical
 */
export function isCriticalField(field: FieldSignature): boolean {
  const category = classifyClinicalCategory(field);
  return category !== 'general' && category !== 'diagnosis';
}

// ============================================================================
// VALIDATION FUNCTIONS
// ============================================================================

/**
 * Validate AI mappings against clinical safety rules
 *
 * @param mappings - AI-generated field mappings
 * @returns Validation result with approved/blocked mappings
 */
export function validateMappings(mappings: FieldMapping[]): ValidationResult {
  const approved: FieldMapping[] = [];
  const needsReview: FieldMapping[] = [];
  const blocked: FieldMapping[] = [];
  const warnings: string[] = [];

  for (const mapping of mappings) {
    const category = classifyClinicalCategory(mapping.targetField);
    const threshold = CATEGORY_THRESHOLDS[category];

    // Check confidence against category threshold
    if (mapping.confidence >= threshold) {
      // High confidence - approve
      if (mapping.confidence >= 0.95) {
        approved.push(mapping);
      } else {
        // Moderate confidence - needs review
        needsReview.push(mapping);
        warnings.push(
          `Field "${mapping.payloadKey}" mapped with ${Math.round(mapping.confidence * 100)}% confidence - review recommended`
        );
      }
    } else {
      // Below threshold - block or require review based on criticality
      if (isCriticalField(mapping.targetField)) {
        blocked.push(mapping);
        warnings.push(
          `BLOCKED: Critical field "${mapping.payloadKey}" (${category}) has low confidence (${Math.round(mapping.confidence * 100)}%)`
        );
      } else {
        needsReview.push(mapping);
        warnings.push(
          `Field "${mapping.payloadKey}" has low confidence (${Math.round(mapping.confidence * 100)}%) - human confirmation required`
        );
      }
    }
  }

  return {
    isValid: blocked.length === 0,
    approved,
    needsReview,
    blocked,
    warnings,
  };
}

/**
 * Enforce confidence thresholds on mappings
 * Updates action field based on confidence and clinical category
 *
 * @param mappings - Field mappings to process
 * @returns Mappings with updated actions
 */
export function enforceConfidenceThresholds(mappings: FieldMapping[]): FieldMapping[] {
  return mappings.map((mapping) => {
    const category = classifyClinicalCategory(mapping.targetField);
    const threshold = CATEGORY_THRESHOLDS[category];

    // Determine action based on confidence and category
    let action = mapping.action;

    if (mapping.confidence >= 0.95 && mapping.confidence >= threshold) {
      action = 'AUTO_FILL';
    } else if (mapping.confidence >= threshold) {
      action = 'CAUTIOUS_FILL';
    } else {
      action = 'HUMAN_REQUIRED';
    }

    // Critical fields always require at least CAUTIOUS_FILL
    if (isCriticalField(mapping.targetField) && action === 'AUTO_FILL') {
      action = 'CAUTIOUS_FILL';
    }

    return { ...mapping, action };
  });
}

/**
 * Filter mappings to only auto-fillable ones
 *
 * @param mappings - All mappings
 * @returns Only mappings safe for auto-fill
 */
export function filterAutoFillable(mappings: FieldMapping[]): FieldMapping[] {
  return mappings.filter((m) => m.action === 'AUTO_FILL');
}

/**
 * Filter mappings requiring human confirmation
 *
 * @param mappings - All mappings
 * @returns Mappings requiring confirmation
 */
export function filterNeedsConfirmation(mappings: FieldMapping[]): FieldMapping[] {
  return mappings.filter((m) => m.action === 'CAUTIOUS_FILL' || m.action === 'HUMAN_REQUIRED');
}

// ============================================================================
// SAFETY AUDIT LOGGING
// ============================================================================

/**
 * Log safety decision for audit trail
 *
 * @param mapping - Mapping that was validated
 * @param decision - Validation decision
 * @param reason - Reason for decision
 */
export function logSafetyDecision(
  mapping: FieldMapping,
  decision: 'approved' | 'review' | 'blocked',
  reason: string
): void {
  const logEntry = {
    timestamp: new Date().toISOString(),
    payloadKey: mapping.payloadKey,
    targetSelector: mapping.targetField.selector,
    confidence: mapping.confidence,
    category: classifyClinicalCategory(mapping.targetField),
    decision,
    reason,
  };

  // Log to console (can be extended to send to analytics)
  console.warn('[DAS:Safety] Decision:', logEntry);

  // Store in session for debugging (optional)
  try {
    const sessionKey = 'das:safety:log';
    const existing = sessionStorage.getItem(sessionKey);
    const logs = existing ? JSON.parse(existing) : [];
    logs.push(logEntry);

    // Keep only last 100 entries
    if (logs.length > 100) {
      logs.shift();
    }

    sessionStorage.setItem(sessionKey, JSON.stringify(logs));
  } catch {
    // Ignore storage errors
  }
}

// ============================================================================
// VALIDATION SUMMARY
// ============================================================================

/**
 * Generate human-readable validation summary
 *
 * @param result - Validation result
 * @returns Summary string
 */
export function generateValidationSummary(result: ValidationResult): string {
  const parts: string[] = [];

  parts.push(`Validation: ${result.isValid ? 'PASSED' : 'FAILED'}`);
  parts.push(`Approved: ${result.approved.length}`);
  parts.push(`Needs Review: ${result.needsReview.length}`);
  parts.push(`Blocked: ${result.blocked.length}`);

  if (result.warnings.length > 0) {
    parts.push(`Warnings: ${result.warnings.length}`);
  }

  return parts.join(' | ');
}
