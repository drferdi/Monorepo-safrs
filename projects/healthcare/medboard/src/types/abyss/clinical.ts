/**
 * @abyss/types — Clinical Domain Types
 * ─────────────────────────────────────
 * Shared clinical data structures for Sentra Healthcare AI.
 * All apps and platform packages reference these types.
 */

// ─── ICD-10 ───────────────────────────────────────────────────────

export interface ICD10Code {
  code: string
  description: string
  descriptionId?: string
  category: string
  chapter: string
  isEklaimEligible: boolean
}

export interface ICD10SearchResult {
  codes: ICD10Code[]
  query: string
  totalResults: number
}

export interface EklaimMapping {
  icd10Code: string
  eklaimCode: string
  tariffGroup: string
  severity: 'ringan' | 'sedang' | 'berat'
  description: string
}

// ─── PATIENT ──────────────────────────────────────────────────────

export interface Patient {
  id: string
  medicalRecordNumber: string
  name: string
  dateOfBirth: string
  gender: 'male' | 'female'
  bloodType?: BloodType
  address?: string
  phone?: string
  bpjsNumber?: string
  allergies: string[]
  createdAt: string
  updatedAt: string
}

export type BloodType = 'A+' | 'A-' | 'B+' | 'B-' | 'AB+' | 'AB-' | 'O+' | 'O-'

// ─── ENCOUNTER / VISIT ────────────────────────────────────────────

export interface Encounter {
  id: string
  patientId: string
  practitionerId: string
  puskesmasId: string
  type: EncounterType
  status: EncounterStatus
  startedAt: string
  completedAt?: string
  anamnesis?: Anamnesis
  vitals?: VitalSigns
  diagnoses: Diagnosis[]
  prescriptions: Prescription[]
  referral?: Referral
}

export type EncounterType = 'outpatient' | 'emergency' | 'referral' | 'follow_up' | 'screening'
export type EncounterStatus = 'in_progress' | 'completed' | 'cancelled' | 'referred'

// ─── ANAMNESIS ────────────────────────────────────────────────────

export interface Anamnesis {
  chiefComplaint: string
  historyOfPresentIllness: string
  pastMedicalHistory?: string
  familyHistory?: string
  socialHistory?: string
  reviewOfSystems?: ReviewOfSystems
  source: AnamnesisSource
  rawTranscript?: string
  recordedAt: string
}

export type AnamnesisSource = 'manual' | 'audrey_voice' | 'structured_form'

export interface ReviewOfSystems {
  general?: string
  cardiovascular?: string
  respiratory?: string
  gastrointestinal?: string
  musculoskeletal?: string
  neurological?: string
  skin?: string
  [system: string]: string | undefined
}

// ─── VITAL SIGNS ──────────────────────────────────────────────────

export interface VitalSigns {
  bloodPressureSystolic?: number
  bloodPressureDiastolic?: number
  heartRate?: number
  respiratoryRate?: number
  temperature?: number
  oxygenSaturation?: number
  weight?: number
  height?: number
  bmi?: number
  recordedAt: string
}

// ─── DIAGNOSIS ────────────────────────────────────────────────────

export interface Diagnosis {
  id: string
  icd10Code: string
  icd10Description: string
  type: DiagnosisType
  confidence: number
  source: DiagnosisSource
  notes?: string
  iskandarSuggestion?: IskandarSuggestion
}

export type DiagnosisType = 'primary' | 'secondary' | 'differential'
export type DiagnosisSource = 'clinician' | 'cdss_iskandar' | 'ai_suggested'

export interface IskandarSuggestion {
  engineVersion: string
  confidence: number
  reasoning: string
  supportingEvidence: string[]
  differentialDiagnoses: Array<{
    icd10Code: string
    description: string
    confidence: number
  }>
  suggestedAt: string
}

// ─── PRESCRIPTION ─────────────────────────────────────────────────

export interface Prescription {
  id: string
  medicationName: string
  dosage: string
  frequency: string
  route: string
  duration: string
  quantity: number
  instructions?: string
}

// ─── REFERRAL ─────────────────────────────────────────────────────

export interface Referral {
  id: string
  fromFacilityId: string
  toFacilityId: string
  urgency: 'routine' | 'urgent' | 'emergency'
  reason: string
  clinicalSummary: string
  diagnoses: string[]
  status: 'pending' | 'accepted' | 'rejected' | 'completed'
  createdAt: string
}

// ─── PUSKESMAS / FACILITY ─────────────────────────────────────────

export interface Facility {
  id: string
  name: string
  type: 'puskesmas' | 'rumah_sakit' | 'klinik' | 'lab'
  address: string
  district: string
  province: string
  phone?: string
  bpjsFacilityCode?: string
  services: string[]
}

// ─── PRACTITIONER ─────────────────────────────────────────────────

export interface Practitioner {
  id: string
  name: string
  role: PractitionerRole
  specialization?: string
  sipNumber?: string
  facilityId: string
  isActive: boolean
}

export type PractitionerRole =
  | 'doctor'
  | 'nurse'
  | 'midwife'
  | 'pharmacist'
  | 'lab_technician'
  | 'admin'

// ─── CDSS / ISKANDAR ─────────────────────────────────────────────

export interface CDSSRequest {
  encounterId: string
  patientId: string
  anamnesis: Anamnesis
  vitals?: VitalSigns
  existingDiagnoses?: Diagnosis[]
  requestedBy: string
}

export interface CDSSResponse {
  requestId: string
  engineVersion: string
  suggestions: IskandarSuggestion[]
  triageLevel?: TriageLevel
  alerts: ClinicalAlert[]
  processedAt: string
  latencyMs: number
}

export type TriageLevel = 1 | 2 | 3 | 4 | 5

export interface ClinicalAlert {
  id: string
  type: 'drug_interaction' | 'allergy' | 'contraindication' | 'critical_value' | 'guideline'
  severity: 'info' | 'warning' | 'critical'
  message: string
  source: string
  actionRequired: boolean
}

// ─── AUDREY VOICE ─────────────────────────────────────────────────

export interface AudreySession {
  id: string
  encounterId: string
  status: 'listening' | 'processing' | 'completed' | 'error'
  language: 'id' | 'en'
  rawTranscript: string
  structuredAnamnesis?: Anamnesis
  confidence: number
  startedAt: string
  completedAt?: string
}

export interface AudreyConfig {
  language: 'id' | 'en'
  autoStructure: boolean
  realTimeTranscript: boolean
  noiseReduction: boolean
}

// ─── COMPOSITE DETERIORATION / CLINICAL WATCHERS ─────────────────

export type CompositeAlertSeverity = 'critical' | 'high' | 'warning'
export type CompositeAlertConfidence = 'high' | 'medium' | 'low'
export type CompositeAlertBucket = 'composite_alert' | 'watcher'

export type CompositeSyndromeId =
  | 'sepsis_shock_pathway'
  | 'respiratory_deterioration'
  | 'neuro_intracranial_pathway'
  | 'silent_bleed_occult_shock'

export interface CompositeAlert {
  id: string
  syndrome: CompositeSyndromeId
  bucket: CompositeAlertBucket
  severity: CompositeAlertSeverity
  confidence: CompositeAlertConfidence
  title: string
  summary: string
  rationale: string
  evidence: string[]
  recommendedActions: string[]
  triggeredAt: string
  suppressionKey: string
}

export interface CompositeHardStopAlert {
  id: string
  bucket: 'hard_stop_alert'
  severity: CompositeAlertSeverity
  title: string
  rationale: string
  recommendations: string[]
}

export type EncounterDeltaSource = 'encounter_window' | 'personal_baseline' | 'none'

export interface EncounterDelta {
  valueDelta?: number
  percentDelta?: number
  baselineValue?: number
  baselineWindowMinutes?: number
  sampleCount?: number
  source: EncounterDeltaSource
}

export interface CompositeDerivedMetrics {
  map?: number
  pulsePressure?: number
  shockIndex?: number
  modifiedShockIndex?: number
  deltas: {
    hr: EncounterDelta
    spo2: EncounterDelta
    sbp: EncounterDelta
    pulsePressure: EncounterDelta
  }
}

export type CompositeWeightedParameter =
  | 'rr'
  | 'spo2'
  | 'hr'
  | 'sbp'
  | 'temp'
  | 'avpu'
  | 'shock_index'

export interface WeightedComponentScore {
  parameter: CompositeWeightedParameter
  score: number
  reason: string
}

export type CompositeAvpuLevel = 'A' | 'C' | 'V' | 'P' | 'U'

export interface CompositeVitalSnapshot {
  hr?: number
  sbp?: number
  dbp?: number
  rr?: number
  temp?: number
  spo2?: number
  avpu?: CompositeAvpuLevel
  supplementalO2?: boolean
  glucose?: number
  capillaryRefillSec?: number
  measuredAt?: string
}

export interface CompositePersonalBaselineParam {
  mean?: number
  median?: number
  currentZScore?: number
}

export interface CompositePersonalBaseline {
  computedAt: string
  visitCount: number
  params: Record<string, CompositePersonalBaselineParam>
}

export interface CompositeEncounterBaseline {
  computedAt: string
  windowMinutes: number
  measurements: CompositeVitalSnapshot[]
}

export interface CompositeDeteriorationInput {
  patientIdHash?: string
  patientAgeYears?: number
  patientAgeMonths?: number
  patientGender?: 'L' | 'P'
  isPregnant?: boolean
  hasCOPD?: boolean
  medicalHistory?: string[]
  chiefComplaint?: string
  additionalComplaint?: string
  structuredSigns?: unknown
  current: CompositeVitalSnapshot
  encounterBaseline?: CompositeEncounterBaseline
  personalBaseline?: CompositePersonalBaseline
}

export interface CompositeDataCompleteness {
  requiredSignalsPresent: string[]
  missingSignals: string[]
  encounterTrendAvailable: boolean
  personalBaselineAvailable: boolean
}

export interface CompositeDeteriorationResult {
  derived: CompositeDerivedMetrics
  weightedScores: WeightedComponentScore[]
  hardStopAlerts: CompositeHardStopAlert[]
  compositeAlerts: CompositeAlert[]
  watchers: CompositeAlert[]
  dataCompleteness: CompositeDataCompleteness
}
