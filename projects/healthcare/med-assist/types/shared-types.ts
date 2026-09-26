export interface ClinicalTrajectoryV1 {
  response: {
    direction: string;
    summary: string;
    momentum: string;
    instabilityPattern: string;
    severityBand: string;
    confidence: string;
    evidenceRefs: string[];
  };
  quality?: {
    completenessScore?: number | string;
    sparseSamplingFlag?: boolean;
  };
}

export interface PlatformValidationSummary {
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

export interface PlatformDiagnoseRequest {
  keluhan_utama: string;
  usia: number;
  jenis_kelamin: 'L' | 'P';
  vital_signs: {
    systolic: number;
    diastolic: number;
    heart_rate: number;
    respiratory_rate: number;
    spo2: number;
    temperature: number;
    glucose?: number;
  };
  [key: string]: unknown;
}

export interface PlatformDiagnoseResponse {
  suggestions: Array<Record<string, unknown>>;
  red_flags: Array<Record<string, unknown> | string>;
  alerts: Array<Record<string, unknown> | string>;
  processing_time_ms: number;
  source: string;
  model_version: string;
  validation_summary: PlatformValidationSummary;
  next_best_questions: string[];
  [key: string]: unknown;
}

export interface PlatformRedFlagAckRequest {
  session_id: string;
  red_flags: string[];
  [key: string]: unknown;
}

export interface PlatformSuggestionSelectedRequest {
  session_id: string;
  selected_icd: string;
  diagnosis_name: string;
  rank: number;
  decision_status: string;
  selection_intent: string;
  [key: string]: unknown;
}

export interface PlatformOutcomeFeedbackRequest {
  session_id: string;
  selected_icd: string;
  final_icd: string;
  outcome_confirmed: boolean;
  [key: string]: unknown;
}

export interface PlatformTrajectorySuccessResponse {
  success: true;
  data: ClinicalTrajectoryV1 | Record<string, unknown>;
  visit_history: Array<Record<string, unknown>>;
  momentum_history: Array<Record<string, unknown>>;
  meta: {
    patientIdentifier: string;
    visitCount: number;
    analyzedAt: string;
    [key: string]: unknown;
  };
}

export interface PlatformTrajectoryErrorResponse {
  success: false;
  error: string;
  code?: string;
  meta?: Record<string, unknown>;
}

export type PlatformTrajectoryResponse =
  | PlatformTrajectorySuccessResponse
  | PlatformTrajectoryErrorResponse;
