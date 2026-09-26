/**
 * CDSS Types — Iskandar Diagnosis Engine V2 (LLM-First)
 * Backward compatible dengan EMR page interface.
 */

// TODO: Move AVPULevel and GCSComponents to src/types/clinical-primitives.ts
// (a zero-dependency shared types module) so that cdss/types.ts and
// vitals/unified-vitals.ts can both import from there without cross-module coupling.
import type { AVPULevel, GCSComponents } from '../vitals/unified-vitals'

export interface VitalSigns {
  systolic?: number
  diastolic?: number
  heart_rate?: number
  spo2?: number
  temperature?: number
  respiratory_rate?: number
  glucose?: number
  weight_kg?: number
  height_cm?: number
  // Phase 1A: Consciousness & supplemental parameters
  avpu?: AVPULevel
  gcs?: GCSComponents
  supplemental_o2?: boolean
  pain_score?: number
  has_copd?: boolean
}

/**
 * Phase 3: Trajectory context injected from Clinical Momentum Engine.
 * Optional — CDSS runs without it for backward compatibility.
 * When present, enriches LLM prompt with multi-visit clinical dynamics.
 */
export interface CDSSTrajectoryContext {
  momentumLevel: string // MomentumLevel enum value
  convergencePattern: string // ConvergencePattern enum value
  convergenceScore: number // Number of params converging
  worseningParams: string[] // Parameter names currently worsening
  isAccelerating: boolean // Any param accelerating toward danger
  timeToCriticalDays: number | null // Nearest TTC estimate (days)
  treatmentResponseNote: string // Human-readable treatment response
  narrative: string // Full momentum narrative
  visitCount?: number // Number of visits used for analysis
}

export interface CDSSEngineInput {
  keluhan_utama: string
  keluhan_tambahan?: string
  assessment_conclusion?: string
  usia: number
  jenis_kelamin: 'L' | 'P'
  vital_signs?: VitalSigns
  allergies?: string[]
  chronic_diseases?: string[]
  is_pregnant?: boolean
  current_drugs?: string[]
  session_id?: string
  // Phase 3: Optional trajectory context from momentum engine
  trajectory_context?: CDSSTrajectoryContext
  // Phase 3: Structured bedside triage signs from Assist/bedside (text summary — avoids cross-module coupling)
  structured_signs_text?: string
  // Phase 4: Composite deterioration summary from multi-syndrome bedside/trend orchestrator
  deterioration_summary_text?: string
}

export interface ValidatedSuggestion {
  rank: number
  llm_rank?: number
  icd10_code: string
  diagnosis_name: string
  confidence: number
  reasoning: string
  key_reasons: string[]
  missing_information: string[]
  red_flags: string[]
  recommended_actions: string[]
  rag_verified: boolean
  decision_status?: 'recommended' | 'review' | 'must_not_miss' | 'deferred'
  decision_reason?: string
  deterministic_score?: number
  rank_source?: 'llm' | 'hybrid'
  validation_flags?: Array<{
    type: string
    code: string
    message: string
  }>
}

export type AlertSeverity = 'emergency' | 'high' | 'medium' | 'low' | 'info'
export type CDSSAlertType =
  | 'red_flag'
  | 'vital_sign'
  | 'validation_warning'
  | 'low_confidence'
  | 'guideline'

export interface CDSSAlert {
  id: string
  type: CDSSAlertType
  severity: AlertSeverity
  title: string
  message: string
  icd_codes?: string[]
  action?: string
}

export interface CDSSEngineResult {
  suggestions: ValidatedSuggestion[]
  red_flags: Array<{
    severity: 'emergency' | 'urgent' | 'warning'
    condition: string
    action: string
    criteria_met: string[]
    icd_codes?: string[]
  }>
  alerts: CDSSAlert[]
  processing_time_ms: number
  source: 'ai' | 'local' | 'error'
  model_version: string
  validation_summary: {
    total_raw: number
    total_validated: number
    recommended_count: number
    review_count: number
    must_not_miss_count: number
    deferred_count: number
    requires_more_data: boolean
    unverified_codes: string[]
    warnings: string[]
  }
  next_best_questions: string[]
  _reasoning_content?: string
}
