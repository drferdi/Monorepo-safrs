// ============================================
// PLATFORM API CONTRACT — CDSS + trajectory
// ============================================
//
// Host-agnostic contract for the canonical platform API. Today `medboard`
// hosts these endpoints. Consumer apps (sentra-assist, referralink, sentra-main) resolve
// the base URL via `PLATFORM_API_BASE_URL` env and should not hardcode host names.
//
// VENDORED 2026-07-28 from `packages/shared/shared-types/src/platform-api.ts`.
// Do not re-point this at `@the-abyss/shared-types`: this app must build outside
// the monorepo (App Independence, `apps/AGENTS.md`), and that import resolved
// only through the root node_modules hoist — it was never declared as a
// dependency here. A wire contract belongs with the client that speaks it; if
// the platform changes these shapes, update this file in the same change.

/**
 * Vital-sign payload for CDSS diagnose. Mirrors the medboard CDSS vital-signs shape.
 * kept permissive so clients that don't compute consciousness levels locally can
 * pass through whatever the source system reports.
 */
export interface PlatformVitalSigns {
  systolic?: number;
  diastolic?: number;
  heart_rate?: number;
  spo2?: number;
  temperature?: number;
  respiratory_rate?: number;
  glucose?: number;
  weight_kg?: number;
  height_cm?: number;
  avpu?: 'A' | 'V' | 'P' | 'U' | string;
  gcs?: {
    eye?: number;
    verbal?: number;
    motor?: number;
  };
  supplemental_o2?: boolean;
  pain_score?: number;
  has_copd?: boolean;
}

/**
 * Trajectory context derived from the Clinical Momentum Engine (medboard).
 */
export interface PlatformTrajectoryContext {
  momentumLevel: string;
  convergencePattern: string;
  convergenceScore: number;
  worseningParams: string[];
  isAccelerating: boolean;
  timeToCriticalDays: number | null;
  treatmentResponseNote: string;
  narrative: string;
  visitCount?: number;
}

/** Request body for `POST /api/cdss/diagnose`. */
export interface PlatformDiagnoseRequest {
  keluhan_utama: string;
  keluhan_tambahan?: string;
  assessment_conclusion?: string;
  usia: number;
  jenis_kelamin: 'L' | 'P';
  vital_signs?: PlatformVitalSigns;
  allergies?: string[];
  chronic_diseases?: string[];
  is_pregnant?: boolean;
  current_drugs?: string[];
  session_id?: string;
  trajectory_context?: PlatformTrajectoryContext;
  structured_signs_text?: string;
  deterioration_summary_text?: string;
}

export interface PlatformValidatedSuggestion {
  rank: number;
  llm_rank?: number;
  icd10_code: string;
  diagnosis_name: string;
  confidence: number;
  reasoning: string;
  key_reasons: string[];
  missing_information: string[];
  red_flags: string[];
  recommended_actions: string[];
  rag_verified: boolean;
  decision_status?: 'recommended' | 'review' | 'must_not_miss' | 'deferred';
  decision_reason?: string;
  deterministic_score?: number;
  rank_source?: 'llm' | 'hybrid';
  validation_flags?: Array<{
    type: string;
    code: string;
    message: string;
  }>;
}

export interface PlatformRedFlag {
  severity: 'emergency' | 'urgent' | 'warning';
  condition: string;
  action: string;
  criteria_met: string[];
  icd_codes?: string[];
}

export type PlatformAlertSeverity = 'emergency' | 'high' | 'medium' | 'low' | 'info';

export type PlatformCDSSAlertType =
  | 'red_flag'
  | 'vital_sign'
  | 'validation_warning'
  | 'low_confidence'
  | 'guideline';

export interface PlatformCDSSAlert {
  id: string;
  type: PlatformCDSSAlertType;
  severity: PlatformAlertSeverity;
  title: string;
  message: string;
  icd_codes?: string[];
  action?: string;
}

export interface PlatformDiagnoseValidationSummary {
  total_raw: number;
  total_validated: number;
  recommended_count: number;
  review_count: number;
  must_not_miss_count: number;
  deferred_count: number;
  requires_more_data: boolean;
  unverified_codes: string[];
  warnings: string[];
}

/** Response body for `POST /api/cdss/diagnose`. */
export interface PlatformDiagnoseResponse {
  suggestions: PlatformValidatedSuggestion[];
  red_flags: PlatformRedFlag[];
  alerts: PlatformCDSSAlert[];
  processing_time_ms: number;
  source: 'ai' | 'local' | 'error';
  model_version: string;
  validation_summary: PlatformDiagnoseValidationSummary;
  next_best_questions: string[];
}

/** Request body for `POST /api/cdss/red-flag-ack`. */
export interface PlatformRedFlagAckRequest {
  session_id?: string;
  red_flags: string[];
}

/** Request body for `POST /api/cdss/suggestion-selected`. */
export interface PlatformSuggestionSelectedRequest {
  session_id?: string;
  selected_icd: string;
  selected_confidence?: number;
  diagnosis_name: string;
  rank?: number;
  decision_status?: 'recommended' | 'review' | 'must_not_miss' | 'deferred';
  decision_reason?: string;
  selection_intent?: 'working_diagnosis' | 'review_selection' | 'must_not_miss_considered';
  review_reason?: string;
}

/** Request body for `POST /api/cdss/outcome-feedback`. */
export interface PlatformOutcomeFeedbackRequest {
  session_id?: string;
  selected_icd: string;
  selected_confidence?: number;
  final_icd: string;
  outcome_confirmed?: boolean | null;
  follow_up_note?: string;
  review_accept_reason?: string;
  override_reason?: string;
}

/**
 * Vital-sign snapshot attached to a single historical visit in the trajectory
 * response. Nullable fields reflect missing observations at that visit.
 */
export interface PlatformVitalSnapshot {
  visitDate: string;
  sbp?: number | null;
  dbp?: number | null;
  hr?: number | null;
  rr?: number | null;
  temp?: number | null;
  glucose?: number | null;
  spo2?: number | null;
}

/**
 * Momentum score at a specific historical visit. `level` is a momentum enum
 * produced by the Clinical Momentum Engine and is left as a free string here
 * so Assist does not need to import medboard enums directly.
 */
export interface PlatformMomentumSnapshot {
  visitDate: string;
  score: number;
  level: string;
}

/**
 * Success response envelope for `GET /api/patients/<sha256>/trajectory`.
 * `data` carries the full `TrajectoryAnalysis` from `analyzeTrajectory()`.
 * Its shape is intentionally kept opaque (`unknown`) at the contract layer
 * because it is produced and consumed by medboard's momentum engine
 * and is not yet stabilized for cross-app import. Consumers that need the
 * full analysis should narrow `data` at the call site.
 */
export interface PlatformTrajectorySuccessResponse {
  success: true;
  data: unknown;
  visit_history: PlatformVitalSnapshot[];
  momentum_history: PlatformMomentumSnapshot[];
  meta: {
    patientIdentifier: string;
    visitCount: number;
    analyzedAt: string;
  };
}

export interface PlatformTrajectoryErrorResponse {
  success: false;
  error: string;
}

export type PlatformTrajectoryResponse =
  | PlatformTrajectorySuccessResponse
  | PlatformTrajectoryErrorResponse;
