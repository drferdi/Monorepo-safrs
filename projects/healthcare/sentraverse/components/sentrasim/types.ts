export type HeaderTone = 'muted' | 'accent'
export type HistoryPhase = 'idle' | 'loading' | 'ready'
export type AnomalyTone = 'critical' | 'warning' | 'default'
export type ReasoningTone = 'primary' | 'warning' | 'muted'
export type PlanTone = 'urgent' | 'primary' | 'supportive'
export type SeverityKey = 'ringan' | 'sedang' | 'berat'

export type VitalSign = {
  label: string
  value: string
  unit: string
  critical?: boolean
}

export type EntityTag = {
  text: string
  type: string
}

export type LabRecommendation = {
  name: string
  status: string
}

export type LabResult = {
  name: string
  value: string
  interpretation: string
  alert?: boolean
}

export type TrajectoryPoint = {
  label: string
  value: string
}

export type TrajectoryMedication = {
  name: string
  dosage: string
}

export type PhysicalExamRow = {
  organ: string
  result: string
  alert?: boolean
}

export type AnomalyTag = EntityTag & {
  tone: AnomalyTone
}

export type ClinicalReasoning = {
  title: string
  type: string
  summary: string
  tone: ReasoningTone
}

export type ManagementStep = {
  title: string
  detail: string
  tone: PlanTone
}

export type AllergyRow = {
  label: string
  value: string
  alert?: boolean
}

export type MedicationOrder = {
  name: string
  regimen: string
  note: string
  tone: PlanTone
}

export type SimulationBranch = {
  label: string
  severityLabel: string
  headline: string
  finalAnamnesaText: string
  caseMetadata: readonly string[]
  directedHistory: readonly string[]
  historyNow: string
  pastHistory: string
  positiveFlags: string
  negativeFlags: string
  allergies: readonly AllergyRow[]
  anamnesaTags: readonly EntityTag[]
  vitals: readonly VitalSign[]
  labRecommendations: readonly LabRecommendation[]
  labResults: readonly LabResult[]
  trajectoryPoints: readonly TrajectoryPoint[]
  trajectoryOxygenPolyline: string
  trajectoryTemperaturePolyline: string
  trajectoryFinalPoint: { x: number; y: number }
  trajectoryMedications: readonly TrajectoryMedication[]
  physicalExamRows: readonly PhysicalExamRow[]
  anomalyTags: readonly AnomalyTag[]
  clinicalReasoning: readonly ClinicalReasoning[]
  medications: readonly MedicationOrder[]
  therapies: readonly ManagementStep[]
  routeTitle: string
  routeDetail: string
  routeReason: string
  trajectoryInsight: string
}

export interface SimulationState {
  isRunning: boolean
  isComplete: boolean
  status: string
  headerTone: HeaderTone
  anamnesaText: string
  anamnesaTagCount: number
  historyPhase: HistoryPhase
  showVitalsAnomaly: boolean
  vitalsTagCount: number
  labOpen: boolean
  selectedLabCount: number
  showLabResults: boolean
  labResultCount: number
  trajectoryOpen: boolean
  showTrajectoryInsight: boolean
  showDiagnosis: boolean
  diagnosisCount: number
  showManagement: boolean
  managementCount: number
}
