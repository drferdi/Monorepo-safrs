/**
 * @abyss/types — Clinical Trajectory V1 contract
 * ─────────────────────────────────────────────
 * VENDORED 2026-07-28 from `packages/shared/shared-types/src/clinical-trajectory.ts`.
 * Do not re-point imports at `@the-abyss/shared-types`: this app must build
 * outside the monorepo (App Independence, `apps/AGENTS.md`). medboard hosts the
 * trajectory endpoint, so this file is the shape it serves — keep it and the
 * platform definition changed together.
 *
 * The `mock*Trajectory` exports below are test fixtures, not clinical data.
 */
export type ClinicalTrajectoryDirection =
  | 'improving'
  | 'stable'
  | 'worsening'
  | 'fluctuating'
  | 'unknown'

export type ClinicalTrajectoryMomentum = 'slow' | 'moderate' | 'rapid' | 'unknown'

export type ClinicalInstabilityPattern =
  | 'respiratory'
  | 'hemodynamic'
  | 'infectious'
  | 'metabolic'
  | 'neurologic'
  | 'allergic'
  | 'mixed'
  | 'unknown'

export type ClinicalTreatmentResponsiveness =
  | 'responsive'
  | 'partially_responsive'
  | 'non_responsive'
  | 'worsening'
  | 'unknown'

export type ClinicalDataSource = 'manual' | 'device' | 'imported' | 'self_report' | 'derived'

export type ClinicalConsciousnessLevel = 'alert' | 'voice' | 'pain' | 'unresponsive' | 'unknown'

export type ClinicalTrajectorySeverityBand = 'low' | 'watch' | 'concerning' | 'critical' | 'unknown'

export type ClinicalTrajectoryConfidence = 'high' | 'moderate' | 'low' | 'insufficient_data'

export type ClinicalTrajectoryCalculationBasis =
  | 'official_score'
  | 'standard_formula'
  | 'sentra_rule_v1'
  | 'clinician_entered'
  | 'unknown'

export interface ClinicalTrajectoryBaseline {
  ageYears?: number
  sexAtBirth?: 'male' | 'female' | 'intersex' | 'unknown'
  pregnancyStatus?: 'pregnant' | 'not_pregnant' | 'unknown' | 'not_applicable'
  chronicDiseases?: string[]
  usualSbp?: number
  usualDbp?: number
  usualSpo2?: number
  usualGlucose?: number
  baselineNotes?: string[]
}

export interface ClinicalTrajectoryEncounterContext {
  patientId?: string
  caseId?: string
  encounterId?: string
  facilityName?: string
  observedByRole?: 'doctor' | 'nurse' | 'assistant' | 'system' | 'unknown'
  workflowStage?: 'intake' | 'enrichment' | 'evaluation' | 'review' | 'unknown'
}

export interface ClinicalTrajectoryVitalPoint {
  id: string
  observedAt: string
  source: Exclude<ClinicalDataSource, 'derived'>
  sbp?: number | null
  dbp?: number | null
  hr?: number | null
  rr?: number | null
  temp?: number | null
  spo2?: number | null
  glucose?: number | null
  consciousness?: ClinicalConsciousnessLevel
  notes?: string[]
}

export interface ClinicalTrajectoryLabPoint {
  id: string
  observedAt: string
  source: Exclude<ClinicalDataSource, 'derived'>
  name: string
  value: string
  unit?: string
  referenceRange?: string
  interpretation?: 'normal' | 'high' | 'low' | 'critical' | 'unknown'
  notes?: string[]
}

export interface ClinicalTrajectoryGCSPoint {
  id: string
  observedAt: string
  source: Exclude<ClinicalDataSource, 'derived'>
  gcsTotal: number
  eyeScore?: number
  verbalScore?: number
  motorScore?: number
  interpretation?: 'normal' | 'mild_impairment' | 'moderate_impairment' | 'severe_impairment'
  notes?: string[]
}

export interface ClinicalTrajectorySymptomPoint {
  id: string
  observedAt: string
  source: Exclude<ClinicalDataSource, 'derived'>
  symptom: string
  severity?: 'mild' | 'moderate' | 'severe' | 'unknown'
  notes?: string[]
}

export interface ClinicalTrajectoryTreatmentPoint {
  id: string
  observedAt: string
  source: Exclude<ClinicalDataSource, 'derived'>
  intervention: string
  response?: ClinicalTreatmentResponsiveness
  notes?: string[]
}

export interface ClinicalTrajectoryDerivedPoint {
  id: string
  observedAt: string
  source: 'derived'
  calculationBasis: ClinicalTrajectoryCalculationBasis
  calculationLabel: string
  evidenceRefs: string[]
  news2Total?: number
  shockIndex?: number
  flags?: string[]
  summary?: string
}

export interface ClinicalTrajectoryResponseAssessment {
  direction: ClinicalTrajectoryDirection
  momentum: ClinicalTrajectoryMomentum
  instabilityPattern: ClinicalInstabilityPattern
  treatmentResponsiveness: ClinicalTreatmentResponsiveness
  severityBand: ClinicalTrajectorySeverityBand
  confidence: ClinicalTrajectoryConfidence
  summary: string
  evidenceRefs: string[]
  requiresEscalation?: boolean
  nextBestClinicalQuestion?: string
  nextBestClinicalCheck?: string
  recommendedMonitoringCadence?: string
}

export interface ClinicalTrajectoryQuality {
  completenessScore?: number
  missingFields?: string[]
  duplicateReadingFlag?: boolean
  conflictingReadingFlag?: boolean
  sparseSamplingFlag?: boolean
  timestampIntegrityFlag?: boolean
  notes?: string[]
}

export interface ClinicalTrajectoryV1 {
  version: 'ct.v1'
  generatedAt: string
  baseline?: ClinicalTrajectoryBaseline
  encounterContext?: ClinicalTrajectoryEncounterContext
  vitalsTimeline: ClinicalTrajectoryVitalPoint[]
  labsTimeline?: ClinicalTrajectoryLabPoint[]
  gcsTimeline?: ClinicalTrajectoryGCSPoint[]
  symptomsTimeline?: ClinicalTrajectorySymptomPoint[]
  treatmentTimeline?: ClinicalTrajectoryTreatmentPoint[]
  derivedTimeline?: ClinicalTrajectoryDerivedPoint[]
  response: ClinicalTrajectoryResponseAssessment
  quality?: ClinicalTrajectoryQuality
}

export interface ClinicalTrajectoryEnvelope {
  trajectory: ClinicalTrajectoryV1
  linkedReasoning?: {
    authority: 'SYMPHONY'
    symphonyResultId?: string
    caseId?: string
  }
}

export interface ClinicalTrajectoryReviewNote {
  trajectoryId: string
  reviewerRole: 'doctor' | 'nurse' | 'clinical_steward' | 'qa'
  reviewedAt: string
  agreement: 'agree' | 'partially_agree' | 'disagree' | 'unable_to_assess'
  safetyConcern?: boolean
  notes?: string
}

export const mockImprovingTrajectory: ClinicalTrajectoryV1 = {
  version: 'ct.v1',
  generatedAt: '2026-05-01T06:00:00.000Z',
  baseline: {
    ageYears: 42,
    sexAtBirth: 'female',
    chronicDiseases: ['hypertension'],
    usualSbp: 134,
    usualDbp: 84,
    usualSpo2: 98,
    usualGlucose: 126,
    baselineNotes: ['Baseline derived from repeated outpatient visits'],
  },
  encounterContext: {
    patientId: 'patient-ct-001',
    caseId: 'case-ct-001',
    encounterId: 'enc-ct-001',
    facilityName: 'Sentra Clinical Review',
    observedByRole: 'doctor',
    workflowStage: 'review',
  },
  vitalsTimeline: [
    {
      id: 'vital-001',
      observedAt: '2026-04-29T08:00:00.000Z',
      source: 'manual',
      sbp: 156,
      dbp: 96,
      hr: 104,
      rr: 22,
      temp: 37.8,
      spo2: 96,
      glucose: 164,
      consciousness: 'alert',
      notes: ['Initial review showed mild instability'],
    },
    {
      id: 'vital-002',
      observedAt: '2026-04-30T08:00:00.000Z',
      source: 'device',
      sbp: 144,
      dbp: 90,
      hr: 96,
      rr: 20,
      temp: 37.4,
      spo2: 97,
      glucose: 148,
      consciousness: 'alert',
      notes: ['Trend improving after treatment'],
    },
  ],
  symptomsTimeline: [
    {
      id: 'symptom-001',
      observedAt: '2026-04-29T08:00:00.000Z',
      source: 'self_report',
      symptom: 'sesak ringan',
      severity: 'moderate',
    },
    {
      id: 'symptom-002',
      observedAt: '2026-04-30T08:00:00.000Z',
      source: 'self_report',
      symptom: 'sesak berkurang',
      severity: 'mild',
    },
  ],
  treatmentTimeline: [
    {
      id: 'treat-001',
      observedAt: '2026-04-29T09:00:00.000Z',
      source: 'manual',
      intervention: 'observasi dan terapi suportif',
      response: 'partially_responsive',
    },
    {
      id: 'treat-002',
      observedAt: '2026-04-30T09:00:00.000Z',
      source: 'manual',
      intervention: 'monitoring lanjutan',
      response: 'responsive',
    },
  ],
  derivedTimeline: [
    {
      id: 'derived-001',
      observedAt: '2026-04-30T08:15:00.000Z',
      source: 'derived',
      calculationBasis: 'official_score',
      calculationLabel: 'NEWS2',
      evidenceRefs: ['vital-001', 'vital-002'],
      news2Total: 5,
      flags: ['improving'],
      summary: 'Skor NEWS2 menurun dari periode sebelumnya.',
    },
    {
      id: 'derived-002',
      observedAt: '2026-04-30T08:15:00.000Z',
      source: 'derived',
      calculationBasis: 'standard_formula',
      calculationLabel: 'Shock Index = HR / SBP',
      evidenceRefs: ['vital-001', 'vital-002'],
      shockIndex: 0.67,
      summary: 'Shock index tetap dalam zona aman.',
    },
  ],
  response: {
    direction: 'improving',
    momentum: 'moderate',
    instabilityPattern: 'mixed',
    treatmentResponsiveness: 'responsive',
    severityBand: 'watch',
    confidence: 'moderate',
    summary: 'Observed trajectory is improving with response to supportive treatment.',
    evidenceRefs: ['vital-001', 'vital-002', 'derived-001'],
    nextBestClinicalQuestion:
      'Apakah sesak dan intoleransi aktivitas masih muncul saat mobilisasi?',
    nextBestClinicalCheck: 'Ulang vital signs dalam 4-6 jam dan evaluasi saturasi oksigen.',
    recommendedMonitoringCadence: 'monitoring rutin setiap shift',
  },
  quality: {
    completenessScore: 86,
    missingFields: ['lab trend serial'],
    sparseSamplingFlag: false,
    conflictingReadingFlag: false,
    duplicateReadingFlag: false,
    timestampIntegrityFlag: true,
    notes: ['Evidence trail is adequate for consumer-safe review.'],
  },
}

export const mockWorseningRespiratoryTrajectory: ClinicalTrajectoryV1 = {
  version: 'ct.v1',
  generatedAt: '2026-05-01T06:00:00.000Z',
  baseline: {
    ageYears: 58,
    sexAtBirth: 'male',
    chronicDiseases: ['chronic lung disease'],
    usualSpo2: 97,
    baselineNotes: ['Baseline respiratory reserve is limited'],
  },
  encounterContext: {
    patientId: 'patient-ct-002',
    caseId: 'case-ct-002',
    encounterId: 'enc-ct-002',
    facilityName: 'Sentra Clinical Review',
    observedByRole: 'nurse',
    workflowStage: 'evaluation',
  },
  vitalsTimeline: [
    {
      id: 'vital-101',
      observedAt: '2026-04-29T08:00:00.000Z',
      source: 'device',
      sbp: 138,
      dbp: 86,
      hr: 108,
      rr: 24,
      temp: 37.6,
      spo2: 95,
      glucose: 138,
      consciousness: 'alert',
    },
    {
      id: 'vital-102',
      observedAt: '2026-04-30T08:00:00.000Z',
      source: 'device',
      sbp: 126,
      dbp: 78,
      hr: 122,
      rr: 30,
      temp: 38.4,
      spo2: 91,
      glucose: 144,
      consciousness: 'voice',
      notes: ['Respiratory effort increased across latest observation window'],
    },
  ],
  symptomsTimeline: [
    {
      id: 'symptom-101',
      observedAt: '2026-04-30T08:00:00.000Z',
      source: 'self_report',
      symptom: 'sesak memberat',
      severity: 'severe',
      notes: ['Pattern consistent with respiratory instability'],
    },
  ],
  treatmentTimeline: [
    {
      id: 'treat-101',
      observedAt: '2026-04-30T09:00:00.000Z',
      source: 'manual',
      intervention: 'oksigen dan observasi ketat',
      response: 'partially_responsive',
    },
  ],
  derivedTimeline: [
    {
      id: 'derived-101',
      observedAt: '2026-04-30T08:20:00.000Z',
      source: 'derived',
      calculationBasis: 'official_score',
      calculationLabel: 'NEWS2',
      evidenceRefs: ['vital-101', 'vital-102'],
      news2Total: 8,
      flags: ['respiratory-instability', 'escalation-context'],
      summary: 'Respiratory deterioration accelerated over the last two observations.',
    },
    {
      id: 'derived-102',
      observedAt: '2026-04-30T08:20:00.000Z',
      source: 'derived',
      calculationBasis: 'standard_formula',
      calculationLabel: 'Shock Index = HR / SBP',
      evidenceRefs: ['vital-101', 'vital-102'],
      shockIndex: 0.97,
      summary: 'Shock index is elevated relative to baseline.',
    },
  ],
  response: {
    direction: 'worsening',
    momentum: 'rapid',
    instabilityPattern: 'respiratory',
    treatmentResponsiveness: 'unknown',
    severityBand: 'critical',
    confidence: 'moderate',
    summary: 'Observed trajectory is worsening with a respiratory instability pattern.',
    evidenceRefs: ['vital-101', 'vital-102', 'derived-101'],
    requiresEscalation: true,
    nextBestClinicalQuestion: 'Apakah kebutuhan oksigen meningkat atau ada tanda gagal napas?',
    nextBestClinicalCheck: 'Ulang respiratory assessment dan saturasi oksigen sekarang.',
    recommendedMonitoringCadence: 'monitoring kontinu sampai stabil',
  },
  quality: {
    completenessScore: 91,
    missingFields: ['serial blood gas'],
    sparseSamplingFlag: false,
    conflictingReadingFlag: false,
    duplicateReadingFlag: false,
    timestampIntegrityFlag: true,
    notes: ['Pattern meets consumer-safe escalation context.'],
  },
}

export const mockSparseDataTrajectory: ClinicalTrajectoryV1 = {
  version: 'ct.v1',
  generatedAt: '2026-05-01T06:00:00.000Z',
  encounterContext: {
    patientId: 'patient-ct-003',
    caseId: 'case-ct-003',
    encounterId: 'enc-ct-003',
    facilityName: 'Sentra Clinical Review',
    observedByRole: 'system',
    workflowStage: 'intake',
  },
  vitalsTimeline: [
    {
      id: 'vital-201',
      observedAt: '2026-04-30T08:00:00.000Z',
      source: 'imported',
      sbp: null,
      dbp: null,
      hr: null,
      rr: null,
      temp: null,
      spo2: null,
      glucose: null,
      notes: ['No stable longitudinal readings available'],
    },
  ],
  response: {
    direction: 'unknown',
    momentum: 'unknown',
    instabilityPattern: 'unknown',
    treatmentResponsiveness: 'unknown',
    severityBand: 'unknown',
    confidence: 'insufficient_data',
    summary: 'Limited data available for safe longitudinal interpretation.',
    evidenceRefs: ['vital-201'],
    nextBestClinicalQuestion:
      'Data apa yang paling penting untuk melengkapi interpretasi trajectory?',
    nextBestClinicalCheck: 'Tambahkan seri vital signs dan dokumentasi respons terapi.',
    recommendedMonitoringCadence: 'assessment ulang setelah data tambahan tersedia',
  },
  quality: {
    completenessScore: 18,
    missingFields: ['baseline', 'labsTimeline', 'symptomsTimeline', 'treatmentTimeline'],
    sparseSamplingFlag: true,
    conflictingReadingFlag: false,
    duplicateReadingFlag: false,
    timestampIntegrityFlag: false,
    notes: ['Insufficient data should remain visible to consumers.'],
  },
}
