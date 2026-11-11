// Designed and constructed by Drferdi.
/**
 * Precision-Architected. Future-Built by Docsyanpse
 * Sentra Healthcare Artificial Intelligence
 */

/**
 * Provider-agnostic AI type definitions for CDSS diagnosis suggestions
 *
 * @module lib/api/ai-types
 * @version 1.0.0
 */

import type { VitalSigns } from '@/types/api';

// =============================================================================
// CHAT MESSAGE
// =============================================================================

/**
 * Chat message format for OpenAI-compatible chat completions APIs
 */
export interface ChatMessage {
  role: 'system' | 'user' | 'assistant';
  content: string;
}

// =============================================================================
// CLINICAL CONTEXT
// =============================================================================

/**
 * Anonymized clinical context for diagnosis request
 */
export interface AnonymizedClinicalContext {
  /** Chief complaint (keluhan utama) */
  keluhan_utama: string;

  /** Additional complaints (keluhan tambahan) */
  keluhan_tambahan?: string;

  /** Patient age in years */
  usia_tahun: number;

  /** Patient gender */
  jenis_kelamin: 'L' | 'P';

  /** Vital signs if available */
  vital_signs?: VitalSigns;

  /** Duration of illness */
  lama_sakit?: {
    hari: number;
    bulan: number;
    tahun: number;
  };

  /** Known chronic diseases */
  chronic_diseases?: string[];

  /** Known allergies */
  allergies?: string[];

  /** Pregnancy status (for female patients) */
  is_pregnant?: boolean;

  /** Physical examination findings */
  pemeriksaan_fisik?: string;

  /** Laboratory results if any */
  lab_results?: string;
}

// =============================================================================
// DIAGNOSIS SUGGESTIONS
// =============================================================================

/**
 * Parsed diagnosis suggestion from AI response
 */
export interface AIDiagnosisSuggestion {
  /** Rank (1-5) */
  rank: number;

  /** Diagnosis name in Indonesian */
  diagnosis_name: string;

  /** ICD-10 code */
  icd10_code: string;

  /** Confidence score (0.0-1.0) */
  confidence: number;

  /** Clinical reasoning */
  reasoning: string;

  /** Red flags identified */
  red_flags: string[];

  /** Recommended actions */
  recommended_actions: string[];
}

/**
 * Structured AI response format
 */
export interface AIResponseFormat {
  /** Diagnosis suggestions */
  suggestions: AIDiagnosisSuggestion[];

  /** Data quality note if input incomplete */
  data_quality_note?: string;

  /** Reasoning chain (chain-of-thought) */
  reasoning_chain?: string;
}

// =============================================================================
// TYPE GUARDS
// =============================================================================

/**
 * Type guard for AI response format
 */
export function isAIResponseFormat(obj: unknown): obj is AIResponseFormat {
  return (
    typeof obj === 'object' &&
    obj !== null &&
    'suggestions' in obj &&
    Array.isArray((obj as AIResponseFormat).suggestions)
  );
}

/**
 * Validate AI diagnosis suggestion structure
 */
export function isValidAISuggestion(obj: unknown): obj is AIDiagnosisSuggestion {
  if (typeof obj !== 'object' || obj === null) return false;

  const suggestion = obj as AIDiagnosisSuggestion;

  return (
    typeof suggestion.diagnosis_name === 'string' &&
    typeof suggestion.icd10_code === 'string' &&
    typeof suggestion.confidence === 'number' &&
    suggestion.confidence >= 0 &&
    suggestion.confidence <= 1
  );
}
