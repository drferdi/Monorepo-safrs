// Designed and constructed by Drferdi.
/**
 * Precision-Architected. Future-Built by Docsyanpse
 * Sentra Healthcare Artificial Intelligence
 */

/**
 * Iskandar Diagnosis Engine V1 — CDSS Engine Orchestrator
 * Full 159-disease CDSS replacing legacy emergency detector.
 *
 * @module lib/iskandar-diagnosis-engine/engine
 * @version 1.0.0
 *
 * ARCHITECTURE:
 * 1. Anonymize (NEVER skip) → Strip PII before any processing
 * 2. Red Flag Check (FIRST) → Hardcoded rules, no API dependency
 * 3. Symptom Matcher → Deterministic IDF+Coverage+Jaccard against 159-disease KB
 * 4. Epidemiology Weights → Bayesian prior from 45,030 real cases
 * 5. LLM Reasoner → Constrained AI enrichment (with KB-only fallback)
 * 6. Traffic Light → 8-rule safety gate (escalation-only)
 * 7. Validation → ICD-10 verification + confidence adjustment
 * 8. Audit Log → Append-only trail (async, non-blocking)
 */
import { anonymize, validateAnonymization } from './anonymizer';
import { auditLogger, logDiagnosisRequest, logSuggestionDisplayed } from './audit-logger';
import { applyEpidemiologyWeights, getEpidemiologyMeta } from './epidemiology-weights';
import { getDiagnosisEngineConfig } from './feature-flags';
import { buildKBOnlySuggestions, runLLMReasoning } from './llm-reasoner';
import type { RedFlag } from './red-flags';
import { runRedFlagChecksFromContext } from './red-flags';
import { getKBDiseaseCount, matchSymptoms } from './symptom-matcher';
import type { TrafficLightLevel } from './traffic-light';
import { classifyTrafficLight } from './traffic-light';
import { runValidationPipeline } from './validation';
import type { ValidatedSuggestion, ValidationResult } from './validation/types';

import type { AnonymizedClinicalContext } from '@/lib/api/ai-types';
import type { AlertSeverity, CDSSAlertType, DiagnosisRequestContext } from '@/types/api';
import { createLogger } from '@/utils/logger';
import type { Encounter } from '~/utils/types';

// =============================================================================
// TYPES (unchanged — same contract as before)
// =============================================================================

/**
 * CDSS Engine Result
 * Final output after all processing layers
 */
export interface CDSSEngineResult {
  /** Validated diagnosis suggestions */
  suggestions: ValidatedSuggestion[];

  /** Red flags detected (hardcoded rules) */
  red_flags: RedFlag[];

  /** Clinical alerts for UI display */
  alerts: CDSSAlert[];

  /** Total processing time in milliseconds */
  processing_time_ms: number;

  /** Source of suggestions */
  source: 'ai' | 'local' | 'error';

  /** Model version used */
  model_version: string;

  /** Validation result summary */
  validation_summary: {
    total_raw: number;
    total_validated: number;
    unverified_codes: string[];
    warnings: string[];
  };
}

/**
 * Clinical alert for UI display
 * Uses CDSSAlertType from types/api.ts for consistency
 */
export interface CDSSAlert {
  /** Unique alert ID */
  id: string;

  /** Alert type */
  type: CDSSAlertType;

  /** Severity level */
  severity: AlertSeverity;

  /** Alert title */
  title: string;

  /** Alert message */
  message: string;

  /** Related ICD-10 codes */
  icd_codes?: string[];

  /** Recommended action */
  action?: string;
}

/**
 * Engine configuration
 */
export interface CDSSEngineConfig {
  /** Enable AI inference (can be disabled for testing) */
  enableAI: boolean;

  /** Maximum suggestions to return */
  maxSuggestions: number;

  /** Minimum confidence threshold */
  minConfidence: number;

  /** Timeout for API calls in milliseconds */
  apiTimeout: number;

  /** Enable audit logging */
  enableAudit: boolean;
}

/**
 * Default engine configuration
 * Iskandar Diagnosis Engine V1: Lowered minConfidence to 0.10 (matcher handles threshold internally)
 */
export const DEFAULT_ENGINE_CONFIG: CDSSEngineConfig = {
  enableAI: true,
  maxSuggestions: 5,
  minConfidence: 0.1,
  apiTimeout: 60000,
  enableAudit: true,
};

const engineLog = createLogger('DiagnosisEngine', 'global');

// =============================================================================
// UTILITY FUNCTIONS
// =============================================================================

function generateAlertId(): string {
  return `alert-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;
}

function generateSessionId(encounter: Encounter): string {
  if (encounter.id) return `session-${encounter.id}`;
  return `session-${Date.now()}`;
}

function mapRedFlagSeverity(severity: RedFlag['severity']): CDSSAlert['severity'] {
  const severityMap: Record<RedFlag['severity'], CDSSAlert['severity']> = {
    emergency: 'emergency',
    urgent: 'high',
    warning: 'medium',
  };
  return severityMap[severity];
}

function redFlagsToAlerts(redFlags: RedFlag[]): CDSSAlert[] {
  return redFlags.map((flag) => ({
    id: generateAlertId(),
    type: 'red_flag' as const,
    severity: mapRedFlagSeverity(flag.severity),
    title: flag.condition,
    message: flag.criteria_met.join('; '),
    icd_codes: flag.icd_codes,
    action: flag.action,
  }));
}

function validationToAlerts(validation: ValidationResult): CDSSAlert[] {
  const alerts: CDSSAlert[] = [];
  if (validation.unverified_codes.length > 0) {
    alerts.push({
      id: generateAlertId(),
      type: 'validation_warning',
      severity: 'medium',
      title: 'Kode ICD-10 Tidak Terverifikasi',
      message: `${validation.unverified_codes.length} kode tidak ditemukan di database lokal`,
      icd_codes: validation.unverified_codes,
    });
  }
  for (const warning of validation.warnings) {
    alerts.push({
      id: generateAlertId(),
      type: 'validation_warning',
      severity: 'low',
      title: 'Peringatan Validasi',
      message: warning,
    });
  }
  return alerts;
}

function trafficLightToAlert(level: TrafficLightLevel, reason: string): CDSSAlert | null {
  if (level === 'GREEN') return null;

  return {
    id: generateAlertId(),
    type: level === 'RED' ? 'red_flag' : 'vital_sign',
    severity: level === 'RED' ? 'high' : 'medium',
    title:
      level === 'RED'
        ? 'Perhatian: Rujukan Segera Direkomendasikan'
        : 'Perhatian: Monitor Ketat Diperlukan',
    message: reason,
    action:
      level === 'RED'
        ? 'Stabilisasi dan rujuk ke fasilitas yang lebih tinggi.'
        : 'Monitor TTV serial, pertimbangkan pemeriksaan penunjang.',
  };
}

// =============================================================================
// MAIN ENGINE — Iskandar Diagnosis Engine V1
// =============================================================================

/**
 * Run Iskandar Diagnosis Engine V1
 *
 * Pipeline:
 * 1. ANONYMIZE → Strip PII
 * 2. RED FLAGS → Hardcoded emergency detection (no API)
 * 3. SYMPTOM MATCHER → IDF+Coverage+Jaccard against 159-disease KB
 * 4. EPIDEMIOLOGY WEIGHTS → Bayesian prior from real data
 * 5. LLM REASONER → Constrained AI enrichment (with fallback)
 * 6. TRAFFIC LIGHT → 8-rule safety gate
 * 7. VALIDATION → ICD-10 verification
 * 8. AUDIT → Governance trail
 */
export async function runDiagnosisEngine(
  encounter: Encounter,
  config: CDSSEngineConfig = DEFAULT_ENGINE_CONFIG,
  requestContext?: DiagnosisRequestContext
): Promise<CDSSEngineResult> {
  const startTime = Date.now();
  const sessionId = generateSessionId(encounter);
  const alerts: CDSSAlert[] = [];
  const warnings: string[] = [];

  // =========================================================================
  // STEP 1: ANONYMIZE (CRITICAL — NEVER SKIP)
  // =========================================================================

  const anonymizedContext = anonymize(encounter);
  const effectiveContext = mergeRequestContext(anonymizedContext, requestContext);

  if (config.enableAudit) {
    logDiagnosisRequest({
      session_id: sessionId,
      input_context: JSON.stringify(effectiveContext),
      model_version: 'IDE-V1',
    }).catch(console.error);
  }

  const anonValidation = validateAnonymization(effectiveContext);
  if (!anonValidation.valid) {
    console.error(
      '[Iskandar Engine] CRITICAL: Anonymization validation failed!',
      anonValidation.violations
    );
    throw new Error(`PII leak detected: ${anonValidation.violations.join(', ')}`);
  }

  // =========================================================================
  // STEP 2: RED FLAG CHECK (FIRST — NO API DEPENDENCY)
  // =========================================================================

  const redFlags = runRedFlagChecksFromContext(effectiveContext);
  engineLog.debug('diagnosis_engine_input', {
    sessionId,
    chiefComplaint: effectiveContext.keluhan_utama || '',
    additionalComplaint: effectiveContext.keluhan_tambahan || '',
    patientAge: effectiveContext.usia_tahun ?? null,
    patientGender: effectiveContext.jenis_kelamin ?? null,
    redFlagCount: redFlags.length,
  });

  if (redFlags.length > 0) {
    console.warn(`[Iskandar Engine] ${redFlags.length} red flag(s) detected!`);
    alerts.push(...redFlagsToAlerts(redFlags));
  }

  // =========================================================================
  // STEP 3: SYMPTOM MATCHER (deterministic, <100ms)
  // =========================================================================

  let matcherSource: 'ai' | 'local' = 'local';
  let modelVersion = 'IDE-V1-KB';

  const keluhanUtama = effectiveContext.keluhan_utama || encounter.anamnesa?.keluhan_utama || '';
  const keluhanTambahan =
    effectiveContext.keluhan_tambahan || encounter.anamnesa?.keluhan_tambahan || '';
  const patientGender = effectiveContext.jenis_kelamin as 'L' | 'P' | undefined;
  const patientAge = effectiveContext.usia_tahun;

  let candidates = await matchSymptoms(
    {
      keluhanUtama,
      keluhanTambahan,
      usia: patientAge,
      jenisKelamin: patientGender,
    },
    10
  );
  engineLog.debug('diagnosis_engine_matcher', {
    sessionId,
    kbDiseaseCount: getKBDiseaseCount(),
    candidateCount: candidates.length,
    topCandidate: candidates[0]
      ? { icd10: candidates[0].icd10, nama: candidates[0].nama, score: candidates[0].matchScore }
      : null,
  });

  // =========================================================================
  // STEP 4: EPIDEMIOLOGY WEIGHTS (Bayesian prior)
  // =========================================================================

  candidates = await applyEpidemiologyWeights(candidates, patientGender);

  // =========================================================================
  // STEP 5: LLM REASONER (with KB-only fallback + high-confidence skip)
  // =========================================================================

  const engineConfig = getDiagnosisEngineConfig();
  const topCandidateScore = candidates[0]?.matchScore ?? 0;
  const skipLLM =
    topCandidateScore >= engineConfig.llmSkipHighConfidenceThreshold &&
    !effectiveContext.chronic_diseases?.length;

  const reasonerResult = skipLLM
    ? {
        suggestions: buildKBOnlySuggestions(candidates),
        source: 'local' as const,
        modelVersion: 'IDE-V1-KB-fast',
        latencyMs: 0,
        dataQualityWarnings: [
          `LLM skipped: KB confidence ${(topCandidateScore * 100).toFixed(0)}% >= threshold`,
        ],
      }
    : await runLLMReasoning({
        candidates,
        keluhanUtama,
        keluhanTambahan,
        usia: patientAge,
        jenisKelamin: patientGender,
        chronicDiseases: effectiveContext.chronic_diseases,
      });

  matcherSource = reasonerResult.source;
  modelVersion = reasonerResult.modelVersion;
  if (reasonerResult.dataQualityWarnings.length > 0) {
    warnings.push(...reasonerResult.dataQualityWarnings);
  }
  engineLog.debug('diagnosis_engine_reasoner', {
    sessionId,
    source: matcherSource,
    modelVersion,
    suggestionCount: reasonerResult.suggestions.length,
    topSuggestion: reasonerResult.suggestions[0]
      ? {
          icd10: reasonerResult.suggestions[0].icd10_code,
          confidence: reasonerResult.suggestions[0].confidence,
        }
      : null,
  });

  // =========================================================================
  // STEP 6: TRAFFIC LIGHT (8-rule safety gate)
  // =========================================================================

  const topConfidence =
    reasonerResult.suggestions.length > 0 ? reasonerResult.suggestions[0].confidence : 0;

  const trafficLight = classifyTrafficLight({
    candidates,
    redFlags,
    patientAge,
    patientGender,
    chronicDiseases: effectiveContext.chronic_diseases,
    confidence: topConfidence,
  });

  const tlAlert = trafficLightToAlert(trafficLight.level, trafficLight.reason);
  if (tlAlert) alerts.push(tlAlert);

  // =========================================================================
  // STEP 7: VALIDATION (ICD-10 verification + confidence adjustment)
  // =========================================================================

  const rawSuggestions = reasonerResult.suggestions;
  const validationContext = {
    patient_age: effectiveContext.usia_tahun,
    patient_gender: effectiveContext.jenis_kelamin,
    is_pregnant: effectiveContext.is_pregnant || false,
    keluhan_utama: effectiveContext.keluhan_utama,
    existing_red_flags: redFlags,
  };

  let validationResult: ValidationResult;

  try {
    validationResult = await runValidationPipeline(rawSuggestions, validationContext);
  } catch {
    // Fallback: wrap raw suggestions as validated (conservative)
    validationResult = buildConservativeValidationFallback(rawSuggestions);
    warnings.push('Validation pipeline degraded: menggunakan fallback konservatif.');
  }

  alerts.push(...validationToAlerts(validationResult));

  // Filter by confidence
  const filteredSuggestions = validationResult.filtered_suggestions
    .filter((s) => s.confidence >= config.minConfidence)
    .slice(0, config.maxSuggestions);
  engineLog.debug('diagnosis_engine_output', {
    sessionId,
    validatedCount: filteredSuggestions.length,
    alertCount: alerts.length,
    status: filteredSuggestions.length > 0 ? 'ok' : 'no_safe_match',
  });

  // Low confidence alert
  if (filteredSuggestions.length > 0) {
    const avgConfidence =
      filteredSuggestions.reduce((sum, s) => sum + s.confidence, 0) / filteredSuggestions.length;
    if (avgConfidence < 0.3) {
      alerts.push({
        id: generateAlertId(),
        type: 'low_confidence',
        severity: 'info',
        title: 'Kepercayaan Rendah',
        message:
          'Saran diagnosis memiliki tingkat kepercayaan rendah. Pertimbangkan anamnesis tambahan.',
      });
    }
  }

  // =========================================================================
  // STEP 8: AUDIT LOG (ASYNC, NON-BLOCKING)
  // =========================================================================

  const processingTime = Date.now() - startTime;

  if (config.enableAudit) {
    logSuggestionDisplayed({
      session_id: sessionId,
      suggestions: filteredSuggestions.map((s) => ({
        icd10_code: s.icd10_code,
        confidence: s.confidence,
      })),
      red_flag_count: redFlags.length,
      model_version: modelVersion,
      latency_ms: processingTime,
      validation_status: validationResult.valid
        ? 'PASS'
        : validationResult.layer_passed >= 3
          ? 'WARN'
          : 'FAIL',
    }).catch(console.error);
  }

  // Disclaimer is mandatory (Governance Rule 3)
  alerts.push({
    id: generateAlertId(),
    type: 'guideline',
    severity: 'info',
    title: 'Disclaimer',
    message: 'Ini adalah alat bantu keputusan klinis. Keputusan akhir ada pada dokter.',
  });

  return {
    suggestions: filteredSuggestions,
    red_flags: redFlags,
    alerts,
    processing_time_ms: processingTime,
    source: matcherSource,
    model_version: modelVersion,
    validation_summary: {
      total_raw: rawSuggestions.length,
      total_validated: filteredSuggestions.length,
      unverified_codes: validationResult.unverified_codes,
      warnings: [...validationResult.warnings, ...warnings],
    },
  };
}

function buildConservativeValidationFallback(
  rawSuggestions: Array<{
    rank: number;
    diagnosis_name: string;
    icd10_code: string;
    confidence: number;
    reasoning: string;
    red_flags?: string[];
    recommended_actions?: string[];
  }>
): ValidationResult {
  const filtered_suggestions = rawSuggestions.slice(0, 5).map((suggestion, index) => ({
    ...suggestion,
    rank: suggestion.rank || index + 1,
    confidence: Math.min(0.5, suggestion.confidence),
    rag_verified: false,
    confidence_adjusted: true,
    original_confidence: suggestion.confidence,
    validation_flags: [
      {
        type: 'warning' as const,
        code: 'VALIDATION_DEGRADED',
        message: 'Pipeline validasi penuh tidak tersedia, confidence diturunkan konservatif.',
      },
    ],
    red_flags: suggestion.red_flags || [],
    recommended_actions: suggestion.recommended_actions || [],
  }));

  return {
    valid: false,
    layer_passed: 1,
    filtered_suggestions,
    unverified_codes: filtered_suggestions.map((s) => s.icd10_code),
    red_flags: [],
    warnings: [
      'Validation pipeline degraded: menggunakan fallback konservatif Iskandar Diagnosis Engine.',
    ],
    layer_results: [
      {
        layer: 1,
        name: 'Syntax Validation',
        passed: true,
        affected_count: filtered_suggestions.length,
        details: ['Fallback konservatif aktif, validasi lanjutan tidak dijalankan.'],
      },
    ],
  };
}

function mergeRequestContext(
  anonymizedContext: AnonymizedClinicalContext,
  requestContext?: DiagnosisRequestContext
): AnonymizedClinicalContext {
  if (!requestContext) return anonymizedContext;

  const hasMeaningfulRequestContext =
    Boolean(requestContext.keluhan_utama?.trim()) ||
    Boolean(requestContext.keluhan_tambahan?.trim()) ||
    (Number.isFinite(requestContext.patient_age) && requestContext.patient_age > 0) ||
    Boolean(requestContext.vital_signs) ||
    Boolean(requestContext.allergies?.length) ||
    Boolean(requestContext.chronic_diseases?.length);

  if (!hasMeaningfulRequestContext) return anonymizedContext;

  const mappedGender = requestContext.patient_gender === 'F' ? 'P' : 'L';
  const mergedVitals = requestContext.vital_signs
    ? { ...anonymizedContext.vital_signs, ...requestContext.vital_signs }
    : anonymizedContext.vital_signs;

  return {
    ...anonymizedContext,
    keluhan_utama: requestContext.keluhan_utama || anonymizedContext.keluhan_utama,
    keluhan_tambahan: requestContext.keluhan_tambahan ?? anonymizedContext.keluhan_tambahan,
    usia_tahun:
      Number.isFinite(requestContext.patient_age) && requestContext.patient_age > 0
        ? requestContext.patient_age
        : anonymizedContext.usia_tahun,
    jenis_kelamin: requestContext.patient_gender ? mappedGender : anonymizedContext.jenis_kelamin,
    vital_signs: mergedVitals,
    allergies:
      requestContext.allergies && requestContext.allergies.length > 0
        ? requestContext.allergies
        : anonymizedContext.allergies,
    chronic_diseases:
      requestContext.chronic_diseases && requestContext.chronic_diseases.length > 0
        ? requestContext.chronic_diseases
        : anonymizedContext.chronic_diseases,
  };
}

// =============================================================================
// STATUS & DIAGNOSTICS
// =============================================================================

export interface CDSSEngineStatus {
  ready: boolean;
  icd10_count: number;
  model: string;
  audit_entries: number;
  last_error?: string;
}

export async function getCDSSEngineStatus(): Promise<CDSSEngineStatus> {
  try {
    const { icd10DB } = await import('@/lib/rag/icd10-db');
    const stats = await icd10DB.getStats();
    const auditCount = await auditLogger.getEntryCount();
    const kbCount = await getKBDiseaseCount();

    return {
      ready: stats.total_entries > 0,
      icd10_count: kbCount,
      model: 'IDE-V1',
      audit_entries: auditCount,
    };
  } catch (error) {
    return {
      ready: false,
      icd10_count: 0,
      model: 'IDE-V1',
      audit_entries: 0,
      last_error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}

export async function initCDSSEngine(): Promise<boolean> {
  try {
    console.warn('[Iskandar Engine V1] Initializing...');

    // Ensure ICD-10 database is loaded
    const { ensureICD10DataLoaded } = await import('@/lib/rag');
    await ensureICD10DataLoaded((progress) => {
      console.warn(`[Iskandar Engine] ICD-10 loading: ${progress.phase} (${progress.progress}%)`);
    });

    // Pre-warm symptom matcher cache
    await getKBDiseaseCount();

    // Pre-warm epidemiology cache
    await getEpidemiologyMeta();

    // Initialize audit logger
    await auditLogger.init();

    const status = await getCDSSEngineStatus();
    console.warn(
      `[Iskandar Engine V1] Ready. KB: ${status.icd10_count} diseases. Model: ${status.model}`
    );

    return status.ready;
  } catch (error) {
    console.error('[Iskandar Engine] Initialization failed:', error);
    return false;
  }
}
