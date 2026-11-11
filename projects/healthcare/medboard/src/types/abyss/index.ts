/**
 * @abyss/types
 * ─────────────
 * Sentra Healthcare AI — Shared Type Definitions
 *
 * Usage:
 *   import type { Patient, Diagnosis, CDSSResponse } from "@abyss/types";
 *   import type { ApiResponse, PaginatedResponse } from "@abyss/types";
 *   import type { ICD10Code } from "@abyss/types/clinical";
 */

// API types
export type {
  ApiEndpoint,
  ApiError,
  ApiMeta,
  ApiResponse,
  ConnectionStatus,
  HttpMethod,
  RealtimeEvent,
  SearchRequest,
  SearchResponse,
  ValidationError,
  WebhookPayload,
} from './api'
// Clinical domain types
export type {
  Anamnesis,
  AnamnesisSource,
  AudreyConfig,
  AudreySession,
  BloodType,
  CDSSRequest,
  CDSSResponse,
  ClinicalAlert,
  CompositeAlert,
  CompositeAlertConfidence,
  CompositeAlertSeverity,
  CompositeDataCompleteness,
  CompositeDerivedMetrics,
  CompositeDeteriorationInput,
  CompositeDeteriorationResult,
  CompositeEncounterBaseline,
  CompositeHardStopAlert,
  CompositePersonalBaseline,
  CompositePersonalBaselineParam,
  CompositeSyndromeId,
  CompositeVitalSnapshot,
  CompositeWeightedParameter,
  Diagnosis,
  DiagnosisSource,
  DiagnosisType,
  EncounterDelta,
  EncounterDeltaSource,
  EklaimMapping,
  Encounter,
  EncounterStatus,
  EncounterType,
  Facility,
  ICD10Code,
  ICD10SearchResult,
  IskandarSuggestion,
  Patient,
  Practitioner,
  PractitionerRole,
  Prescription,
  Referral,
  ReviewOfSystems,
  TriageLevel,
  VitalSigns,
  WeightedComponentScore,
} from './clinical'
// Common types
export type {
  AppError,
  AuditEntry,
  AuthUser,
  DeepPartial,
  Notification,
  Nullable,
  Optional,
  PaginatedRequest,
  PaginatedResponse,
  Permission,
  Result,
  Session,
  UserRole,
  WithId,
  WithTimestamps,
} from './common'

// Intelligence dashboard types
export type {
  DashboardAlertFeed,
  DashboardComplianceIssue,
  DashboardEklaimReadiness,
  DashboardEncounterStatus,
  DashboardEncounterSummary,
  DashboardOperationalMetrics,
} from './dashboard'

// Clinical Trajectory & CME types
export type {
  AcuteAttackRisk24h,
  BaselineParam,
  BaselineStat,
  ClinicalSafeOutput,
  ClinicalUrgencyTier,
  ConfirmedChronicDiagnosis,
  ConvergenceParam,
  ConvergencePattern,
  ConvergenceResult,
  EarlyWarningBurden,
  GlobalDeterioration,
  GlobalDeteriorationState,
  MomentumAnalysis,
  MomentumLevel,
  MortalityProxyRisk,
  MortalityProxyTier,
  ParamMomentum,
  PersonalBaseline,
  RiskLevel,
  TimeToCriticalEstimate,
  TrajectoryAnalysis,
  TrajectoryRecommendation,
  TrajectoryVolatility,
  TrendDirection,
  VitalParam,
  VitalTrend,
} from './trajectory'
export {
  ACUTE_RISK_LABELS,
  CONVERGENCE_PATTERN_LABELS,
  MOMENTUM_LEVEL_CONFIG,
  PatientIdentifierSchema,
  RISK_LEVEL_CONFIG,
  TrajectoryQuerySchema,
  URGENCY_TIER_CONFIG,
  VITAL_PARAM_LABELS,
  formatETAHours,
  getETAUrgencyColor,
} from './trajectory'
