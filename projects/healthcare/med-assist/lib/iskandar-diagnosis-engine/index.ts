// Designed and constructed by Drferdi.
/**
 * Precision-Architected. Future-Built by Docsyanpse
 * Sentra Healthcare Artificial Intelligence
 */

/**
 * CDSS Module Public API
 * Clinical Decision Support System for Sentra Assist
 *
 * @module lib/iskandar-diagnosis-engine
 * @version 1.0.0
 *
 * CORE EXPORTS:
 * - Engine: runDiagnosisEngine, initCDSSEngine, getCDSSEngineStatus
 * - Anonymizer: anonymize, validateAnonymization
 * - Red Flags: runRedFlagChecks, runRedFlagChecksFromContext
 * - Validation: runValidationPipeline
 * - Audit: auditLogger, log* functions
 */

// =============================================================================
// ENGINE EXPORTS (Main Entry Point)
// =============================================================================

export type { CDSSAlert, CDSSEngineConfig, CDSSEngineResult, CDSSEngineStatus } from './engine';
export {
  DEFAULT_ENGINE_CONFIG,
  getCDSSEngineStatus,
  initCDSSEngine,
  runDiagnosisEngine,
} from './engine';

// =============================================================================
// Iskandar Diagnosis Engine V1 MODULE EXPORTS
// =============================================================================

export type { EpiWeightResult } from './epidemiology-weights';
export {
  applyEpidemiologyWeights,
  getEpidemiologyMeta,
  getEpidemiologyWeight,
  getLocalEpidemiologyContext,
} from './epidemiology-weights';
export type { ReasonerInput, ReasonerOutput } from './llm-reasoner';
export { runLLMReasoning } from './llm-reasoner';
export type { MatchedCandidate, MatcherInput } from './symptom-matcher';
export { clearMatcherCache, getKBDiseaseCount, matchSymptoms } from './symptom-matcher';
export type { TrafficLightInput, TrafficLightLevel, TrafficLightOutput } from './traffic-light';
export { classifyTrafficLight } from './traffic-light';

// =============================================================================
// ANONYMIZER EXPORTS
// =============================================================================

export { anonymize, containsPII, redactPII, validateAnonymization } from './anonymizer';

// =============================================================================
// RED FLAG EXPORTS
// =============================================================================

export type { RedFlag, RedFlagContext } from './red-flags';
export {
  checkACS,
  checkAnaphylaxis,
  checkHypoglycemia,
  checkPreeclampsia,
  checkSepsis,
  checkStroke,
  runRedFlagChecks,
  runRedFlagChecksFromContext,
} from './red-flags';

// =============================================================================
// VALIDATION EXPORTS
// =============================================================================

export { runValidationPipeline } from './validation';

export type {
  ValidatedSuggestion,
  ValidationContext,
  ValidationFlag,
  ValidationResult,
} from './validation/types';

// =============================================================================
// AUDIT EXPORTS
// =============================================================================

export type { AuditAction, AuditEntry } from './audit-logger';
export {
  auditLogger,
  logDiagnosisRequest,
  logEngineError,
  logFallbackUsed,
  logRedFlagShown,
  logShadowComparison,
  logSuggestionDisplayed,
  logSuggestionSelected,
} from './audit-logger';

// =============================================================================
// DIAGNOSIS V2 SHADOW EXPORTS
// =============================================================================

export type {
  DiagnosisV2Comparison,
  DiagnosisV2ShadowResult,
  DiagnosisV2UncertaintyLevel,
} from './diagnosis-v2';
export {
  compareDiagnosisVersions,
  isDiagnosisV2ShadowEnabled,
  runDiagnosisV2Shadow,
  shadowComparisonToAuditMetadata,
} from './diagnosis-v2';

// =============================================================================
// CHRONIC DISEASE CLASSIFIER EXPORTS
// =============================================================================

export type {
  BadgeConfig,
  ChronicDiseaseClassification,
  ChronicDiseaseSeverity,
} from './chronic-disease-classifier';
export {
  ChronicDiseaseType,
  classifyChronicDisease,
  getBadgeConfig,
  getBadgeConfigForDisease,
  getDiseaseFullName,
  getSupportedDiseaseTypes,
  isChronicDisease,
} from './chronic-disease-classifier';

// =============================================================================
// DDI (DRUG-DRUG INTERACTION) CHECKER EXPORTS
// =============================================================================

export {
  checkDrugInteractions,
  getDDIStatus,
  getSeverityColor,
  getSeverityLabel,
  hasBlockingInteractions,
  loadDDIDatabase,
} from './ddi-checker';

// =============================================================================
// HYBRID TRAJECTORY EXPORTS
// =============================================================================

export type {
  ClinicalContextExtraction,
  ClinicianSourceContext,
  ComplaintSignal,
  HistoricalDiagnosisSignal,
  HybridIntegratedAssessment,
  HybridTrajectoryComparison,
  HybridTrajectoryInput,
  HybridTrajectoryRedFlag,
  HybridTrajectoryResult,
  TherapySignal,
} from './hybrid-trajectory';
export {
  adaptVisitRecordsToSymphonyVitals,
  analyzeHybridTrajectory,
  compareTrajectoryEngines,
  extractClinicalTrajectoryContext,
  isClinicalTrajectoryV2Enabled,
  isHybridTrajectoryEngineEnabled,
  isTrajectoryCompareModeEnabled,
  mapHybridTrajectoryToLegacyAnalysis,
} from './hybrid-trajectory';

export type {
  SymphonyClinicalSafeOutput,
  SymphonyConsciousnessLevel,
  SymphonyMomentumAnalysis,
  SymphonyTrajectoryAnalysis,
  SymphonyTrajectoryDirection,
  SymphonyTrajectoryMomentum,
  SymphonyTrajectoryRiskLevel,
  SymphonyVitalsInput,
} from './symphony-trajectory-core';
export {
  analyzeSymphonyTrajectory,
  buildSymphonyPersonalBaseline,
  detectSymphonyTreatmentResponse,
  trajectoryDirectionFromAnalysis,
  trajectoryMomentumFromAnalysis,
} from './symphony-trajectory-core';

// =============================================================================
// CLINICAL REASONING EVIDENCE EXPORTS
// =============================================================================

export type {
  BuildReasoningEvidencePackInput,
  ClinicalFact,
  ClinicalReasoningFactCategory,
  ClinicalReasoningFactKey,
  ClinicalReasoningFactSeverity,
  ReasoningEvidencePack,
  ReasoningEvidenceSourceMapEntry,
} from './clinical-reasoning-evidence';
export { buildReasoningEvidencePackFromTrajectoryV2 } from './clinical-reasoning-evidence';

export type {
  DiagnosisPack,
  DifferentialCandidateCategory,
  DifferentialDiagnosisCandidate,
  DifferentialEvidenceItem,
  DifferentialFitBand,
} from './clinical-reasoning-differential';
export {
  buildDifferentialCandidatesFromEvidencePack,
  getAssistDiagnosisPacks,
} from './clinical-reasoning-differential';

export type {
  ClinicalReasoningArbiterDecision,
  ClinicalReasoningArbiterResult,
  ClinicalReasoningTherapyGate,
  ClinicalReasoningTherapyGateReason,
  ClinicalReasoningTherapyGateStatus,
  RunClinicalReasoningArbiterInput,
} from './clinical-reasoning-arbiter';
export { runClinicalReasoningArbiter } from './clinical-reasoning-arbiter';

export type {
  BuildTherapyReasoningPackInput,
  TherapyReasoningAction,
  TherapyReasoningActionCategory,
  TherapyReasoningPack,
  TherapyReasoningPackStatus,
  TherapyReasoningPriority,
  TherapyReasoningSafetyCheck,
} from './clinical-reasoning-therapy';
export { buildTherapyReasoningPackFromArbiter } from './clinical-reasoning-therapy';

export type {
  BuildClinicalReasoningWorkflowInput,
  ClinicalReasoningWorkflowAuditEvent,
  ClinicalReasoningWorkflowAuditStatus,
  ClinicalReasoningWorkflowResult,
  ClinicalReasoningWorkflowStage,
  ClinicalReasoningWorkflowStatus,
} from './clinical-reasoning-workflow';
export { buildClinicalReasoningWorkflowFromTrajectoryV2 } from './clinical-reasoning-workflow';

export type {
  ClinicalReasoningWorkflowAuditRecord,
  ClinicalReasoningWorkflowAuditStageRecord,
  ClinicalReasoningWorkflowAuditStorage,
  ClinicalReasoningWorkflowTherapyAuditSummary,
  ListClinicalReasoningWorkflowAuditRecordsInput,
  PersistClinicalReasoningWorkflowAuditInput,
} from './clinical-reasoning-workflow-audit';
export {
  createMemoryClinicalWorkflowAuditStorage,
  listClinicalReasoningWorkflowAuditRecords,
  persistClinicalReasoningWorkflowAudit,
} from './clinical-reasoning-workflow-audit';

export type {
  ClinicalReasoningWorkflowEvaluationExpectations,
  ClinicalReasoningWorkflowEvaluationFixture,
  ClinicalReasoningWorkflowEvaluationReport,
  ClinicalReasoningWorkflowEvaluationResult,
} from './clinical-reasoning-workflow-evaluation';
export { evaluateClinicalReasoningWorkflowFixtures } from './clinical-reasoning-workflow-evaluation';

// =============================================================================
// PRESENTATION SAFETY EXPORTS
// =============================================================================

export type { PhysicianSafeTrajectoryPresentation } from './presentation-safety';
export {
  buildPhysicianSafeTrajectoryPresentation,
  findForbiddenPhysicianTrajectoryTerms,
  FORBIDDEN_PHYSICIAN_TRAJECTORY_PATTERNS,
  sanitizeTrajectoryPresentationLines,
  sanitizeTrajectoryPresentationText,
  sanitizeTrajectoryRecommendations,
  serializePhysicianSafeTrajectoryPresentation,
} from './presentation-safety';

// =============================================================================
// TRAJECTORY VISUALIZATION VIEWMODEL EXPORTS
// =============================================================================

export type {
  TrajectoryBaselineAvailability,
  TrajectoryBaselineDeviation,
  TrajectoryDriverContribution,
  TrajectoryTimelinePoint,
  TrajectoryTimelineState,
  TrajectoryVisualizationViewModel,
  TrajectoryVitalTrendMeta,
  TrajectoryVitalTrendPoint,
} from './trajectory-visualization-view-model';
export { buildTrajectoryVisualizationViewModel } from './trajectory-visualization-view-model';
