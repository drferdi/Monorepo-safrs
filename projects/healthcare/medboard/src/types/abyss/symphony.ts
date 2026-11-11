export const SYMPHONY_CONTRACT_VERSION = '0.8.0' as const

export type SymphonyContractVersion = typeof SYMPHONY_CONTRACT_VERSION

export type SymphonyEngineStatus = 'ready' | 'busy' | 'degraded' | 'offline'

export type SymphonyDecisionCategory = 'recommended' | 'review' | 'must_not_miss' | 'deferred'

export type SymphonyAlertSeverity = 'critical' | 'high' | 'warning' | 'info'

export type SymphonyAlertSource =
  | 'vitals'
  | 'trajectory'
  | 'news2'
  | 'pattern'
  | 'composite'
  | 'llm'
  | 'safety_gate'
  | 'fallback'

export type SymphonyActionProtocolId =
  | 'PROTO_RESP_FAILURE'
  | 'PROTO_SHOCK'
  | 'PROTO_SEPSIS'
  | 'PROTO_ANAPHYLAXIS'
  | 'PROTO_ACS'
  | 'PROTO_STROKE'
  | 'PROTO_DKA_HHS'
  | 'PROTO_HYPOGLYCEMIA'
  | 'PROTO_CARDIAC_ARREST'

export type SymphonyActionProtocolSectionKey = 'A' | 'B' | 'C' | 'D' | 'E' | 'other'

export type SymphonyReferralUrgency = 'immediate' | 'emergency' | 'urgent'

export interface SymphonyActionProtocolSection {
  key: SymphonyActionProtocolSectionKey
  title: string
  steps: string[]
}

export interface SymphonyActionProtocolReferral {
  required: boolean
  urgency: SymphonyReferralUrgency
  criteria: string[]
}

export interface SymphonyActionProtocol {
  id: SymphonyActionProtocolId
  title: string
  summary: string
  sections: SymphonyActionProtocolSection[]
  referral: SymphonyActionProtocolReferral
}

export type SymphonySafetyGate =
  | 'GATE_1_VITALS'
  | 'GATE_2_HTN'
  | 'GATE_3_GLUCOSE'
  | 'GATE_4_OCCULT_SHOCK'
  | 'GATE_5_SEPSIS'
  | 'GATE_6_RESPIRATORY'
  | 'GATE_7_PEDIATRIC'
  | 'GATE_8_OBSTETRIC'
  | 'GATE_9_PE'
  | 'GATE_10_ANAPHYLAXIS'
  | 'GATE_11_ACS'
  | 'GATE_12_STROKE'
  | 'GATE_13_ANEMIA_BLEED'

export type SymphonyConfidenceBand = 'high' | 'moderate' | 'low' | 'insufficient_data'

export type SymphonySexAtBirth = 'female' | 'male' | 'intersex' | 'unknown'

export type SymphonyPregnancyStatus = 'pregnant' | 'not_pregnant' | 'unknown' | 'not_applicable'

export type SymphonyConsciousnessLevel = 'alert' | 'voice' | 'pain' | 'unresponsive' | 'unknown'

export type SymphonyTrajectoryDirection = 'improving' | 'stable' | 'worsening' | 'unknown'

export type SymphonyTrajectoryMomentum = 'rapid' | 'gradual' | 'flat' | 'insufficient_data'

export interface SymphonyMetadata {
  engineVersion: string
  contractVersion: SymphonyContractVersion
  generatedAt: string
  status: SymphonyEngineStatus
  confidenceBand: SymphonyConfidenceBand
  rationale: string[]
  latencyMs?: number
  degradedReason?: string
}

export interface SymphonyPatientContext {
  encounterId: string
  patientRef: string
  ageYears?: number
  sexAtBirth?: SymphonySexAtBirth
  pregnancyStatus?: SymphonyPregnancyStatus
}

export interface SymphonyVitalsInput {
  observedAt: string
  systolicBp?: number
  diastolicBp?: number
  heartRate?: number
  respiratoryRate?: number
  temperatureC?: number
  spo2?: number
  glucoseMgDl?: number
  capillaryRefillSec?: number
  oxygenSupplement?: boolean
  consciousness?: SymphonyConsciousnessLevel
}

export interface SymphonyDiagnosisSuggestion {
  id: string
  icd10Code: string
  diagnosisName: string
  confidence: number
  decisionCategory: SymphonyDecisionCategory
  reasoning: string[]
  evidenceRefs: string[]
  mustNotMiss: boolean
}

export interface SymphonyAlert {
  id: string
  severity: SymphonyAlertSeverity
  title: string
  reasoning: string[]
  source: SymphonyAlertSource
  gate?: SymphonySafetyGate
  actionProtocolId?: SymphonyActionProtocolId
  actionProtocol?: SymphonyActionProtocol
  acknowledged: boolean
  triggeredAt: string
}

export type SymphonyTrafficLightLevel = 'GREEN' | 'YELLOW' | 'RED'

export interface SymphonyTrafficLightGateResult {
  rule: string
  triggered: boolean
  detail: string
}

export interface SymphonyTrafficLightOutput {
  level: SymphonyTrafficLightLevel
  reason: string
  gateResults: SymphonyTrafficLightGateResult[]
  overrideApplied: boolean
}

export interface SymphonyTrajectorySummary {
  direction: SymphonyTrajectoryDirection
  momentum: SymphonyTrajectoryMomentum
  summary: string
  evidenceRefs: string[]
}

export interface SymphonyQualitySummary {
  completenessScore: number
  missingFields: string[]
  safetyFlags: string[]
  auditHints: string[]
}

// =============================================================================
// AADI V2: Native diagnostic reasoning contracts (added in v0.7.0)
// Additive only — does not remove or rename existing fields.
// =============================================================================

export type SymphonyClinicalDisposition =
  | 'ok'
  | 'requires_review'
  | 'insufficient_data'
  | 'degraded'

export interface SymphonyClinicalFact {
  key: string
  value: string | number | boolean
  confidence?: number
  sourceRefs: string[]
}

export interface SymphonyReasoningEvidence {
  supports: string[]
  weakens: string[]
  missing: string[]
  nextBestQuestions: string[]
}

export interface SymphonyDiagnosticHypothesis {
  id: string
  icd10Code: string
  diagnosisName: string
  rank: number
  confidence: number
  category: 'working' | 'review' | 'must_not_miss' | 'deferred'
  evidence: SymphonyReasoningEvidence
  evidenceRefs: string[]
}

export interface SymphonyShadowComparison {
  oldPathAvailable: boolean
  newPathAvailable: boolean
  agreementLevel: 'high' | 'partial' | 'low' | 'not_comparable'
  topDiagnosisChanged: boolean
  escalationChanged: boolean
  clinicalDispositionChanged: boolean
  notes: string[]
}

export interface SymphonyResult {
  metadata: SymphonyMetadata
  clinicalDisposition?: SymphonyClinicalDisposition
  patientContext: SymphonyPatientContext
  latestVitals?: SymphonyVitalsInput
  diagnosisSuggestions: SymphonyDiagnosisSuggestion[]
  nativeHypotheses?: SymphonyDiagnosticHypothesis[]
  clinicalFacts?: SymphonyClinicalFact[]
  alerts: SymphonyAlert[]
  trafficLight?: SymphonyTrafficLightOutput
  trajectory: SymphonyTrajectorySummary
  quality: SymphonyQualitySummary
  shadowComparison?: SymphonyShadowComparison
}

// =============================================================================
// Phase 2: Pattern Engine — public contract types
// Promoted from symphony-internal types in feat(shared-types): Phase 2 commit 9.
// =============================================================================

// ---------------------------------------------------------------------------
// Symptom signals (promoted from symphony/src/engine/symptom-signals.ts)
// ---------------------------------------------------------------------------

export type SymphonySymptomSignal =
  | 'fever'
  | 'dyspnea'
  | 'chest_pain'
  | 'headache'
  | 'vomit'
  | 'seizure'
  | 'altered_consciousness'
  | 'bleeding'
  | 'pallor'
  | 'weakness'
  | 'dizziness'
  | 'syncope'
  | 'diaphoresis'
  | 'rash_or_angioedema'
  | 'allergen_exposure'
  | 'abdominal_pain'
  | 'kussmaul_breathing'
  | 'polyuria'
  | 'neurologic_focal_deficit'

export interface SymphonySymptomSignalInput {
  chiefComplaint: string
  additionalComplaint?: string
  medicalHistory?: string
}

export interface SymphonySymptomSignalResult {
  signals: SymphonySymptomSignal[]
  negatedSignals: SymphonySymptomSignal[]
}

/** Boolean symptom flags used by Tier B/C clinical patterns (CP-002 through CP-070).
 *  Consumers populate these alongside signals/negatedSignals on the snapshot. */
export interface SymphonySymptomContext {
  accessoryMuscles?: boolean
  allergenExposure?: boolean
  alteredMentalStatus?: boolean
  bleedingHistory?: boolean
  chestPain?: boolean
  chestPainDuration?: boolean
  clinicalConcern?: boolean
  diaphoresis?: boolean
  difficultySpeaking?: boolean
  dizziness?: boolean
  dyspnea?: boolean
  fatigue?: boolean
  focalNeuroDeficit?: boolean
  giSymptoms?: boolean
  kussmaulBreathing?: boolean
  nausea?: boolean
  pallor?: boolean
  polyuria?: boolean
  seizure?: boolean
  skinMucosalSymptoms?: boolean
  suddenDyspnea?: boolean
  suddenOnset?: boolean
  suspectedInfection?: boolean
  syncope?: boolean
  thromboembolismRisk?: boolean
  weakness?: boolean
  wheezing?: boolean
}

// ---------------------------------------------------------------------------
// ClinicalSnapshot sub-types
// ---------------------------------------------------------------------------

export type SymphonyAvpuLevel = 'A' | 'V' | 'P' | 'U'
export type SymphonyHtnSeverity = 'normal' | 'prehypertension' | 'stage1' | 'stage2' | 'crisis'
export type SymphonyGlucoseCategory =
  | 'hypoglycemic'
  | 'normal'
  | 'prediabetic'
  | 'diabetic'
  | 'severe_hyperglycemia'
export type SymphonyPhysiologyBand =
  | 'infant'
  | 'toddler'
  | 'child'
  | 'adolescent'
  | 'adult'
  | 'elderly'
  | 'geriatric'

export interface SymphonyParsedVitals {
  sbp: number
  dbp: number
  hr: number
  rr: number
  temp: number
  spo2: number
  /** 0 = not entered (sentinel per Assist parseVital convention) */
  glucose: number
}

export interface SymphonyHistoricalBP {
  sbp: number
  dbp: number
  timestamp: number
}

export interface SymphonyDerivedValues {
  map: number | undefined
  shockIndex: number | undefined
  avpuLevel: SymphonyAvpuLevel
  htnSeverity: SymphonyHtnSeverity | undefined
  glucoseCategory: SymphonyGlucoseCategory | undefined
  hasHypotension: boolean
  pulsePressure: number | undefined
}

export interface SymphonyClinicalHistory {
  bpHistory: SymphonyHistoricalBP[]
  knownHTN: boolean
  knownDM: boolean
  knownAsthma: boolean
  knownCOPD: boolean
  pregnancyStatus: boolean | null
  allergies: string[]
  chronicDiseases: string[]
}

export interface SymphonySnapshotPatient {
  age: number
  physiology: SymphonyPhysiologyBand
  /** Raw AVPU from form; 'C' (Confused) maps to 'V' for clinical evaluation; 'unknown' = form field present but value not recorded */
  avpuManual: 'A' | 'C' | 'V' | 'P' | 'U' | 'unknown'
  supplementalO2: boolean
  painScore: number
}

export interface SymphonyClinicalSnapshot {
  vitals: SymphonyParsedVitals
  derived: SymphonyDerivedValues
  symptoms: SymphonySymptomSignalResult & SymphonySymptomContext
  history: SymphonyClinicalHistory
  patient: SymphonySnapshotPatient
  timestamp: number
}

// ---------------------------------------------------------------------------
// Pattern Engine types (internal-turned-public for Phase 3 CP registry)
// ---------------------------------------------------------------------------

/** 10 criterion operators. 'in' operator added from Assist source (not in FEATURE.md§737). */
export type SymphonyCriterionOp =
  | 'gte'
  | 'lte'
  | 'gt'
  | 'lt'
  | 'eq'
  | 'neq'
  | 'between'
  | 'true'
  | 'false'
  | 'in'

export interface SymphonyCriterion {
  field: string
  op: SymphonyCriterionOp
  value: number | string | boolean | [number, number]
  label?: string
}

export type SymphonyPatternTier = 'A' | 'B' | 'C'
export type SymphonyPatternSeverity = 'critical' | 'high' | 'warning'

export interface SymphonyScoreResult {
  achieved: number
  required: number
  total: number
}

export interface SymphonyClinicalPattern {
  id: string
  gate: SymphonySafetyGate
  severity: SymphonyPatternSeverity
  tier: SymphonyPatternTier
  title: string
  reasoning: string
  requiredCriteria: SymphonyCriterion[]
  scoredCriteria?: SymphonyCriterion[]
  minScore?: number
  recommendations: string[]
  actionProtocolId?: SymphonyActionProtocolId
  supersededBy?: string[]
  requiresVitals?: string[]
  source: string
  differentials?: string[]
  confidenceWeight?: number
}

/** Relaxed pattern type for internal or future extended registries beyond the canonical gate union. */
export type SymphonyEvaluablePattern = Omit<SymphonyClinicalPattern, 'gate'> & { gate: string }

export interface SymphonyPatternMatch<
  P extends SymphonyEvaluablePattern = SymphonyClinicalPattern,
> {
  pattern: P
  matchedCriteria: SymphonyCriterion[]
  score?: SymphonyScoreResult
  confidence: number
  actionProtocolId?: SymphonyActionProtocolId
}
