/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

export interface MedicalQuery {
  id: string
  query: string
  timestamp: number
}

export interface MultiDomainAssessment {
  severity_distress: string // Tingkat keparahan & distress
  risk_assessment: string // Risiko membahayakan diri/orang lain
  functional_impact: string // Dampak ke ADL/Pekerjaan
  comorbidities: string[] // Penyakit penyerta & komplikasi
  treatment_history: string // Riwayat pengobatan sebelumnya
  socio_economic: string // Faktor ekonomi & lingkungan
  support_system: string // Ketersediaan dukungan keluarga/sosial
  engagement_compliance: string // Kepatuhan pasien
}

export interface EvidenceBase {
  clinical_reasoning?: string // Auto-generated reasoning
  guidelines?: string[] // Referensi PMK/Protocols
  red_flags?: string[] // Tanda bahaya terdeteksi
  differential_diagnosis?: string[] // Kemungkinan diagnosa lain
}

export const DIAGNOSIS_SCHEMA_VERSION = 2 as const

export interface ProposedReferral {
  code: string
  description: string
  kompetensi: '3B' | '3A'
  destination_service: string
  facility_level: string
  referral_reason: string
  required_capability: string
  urgency: 'routine' | 'urgent' | 'emergency'
  clinical_reasoning: string
}

export interface ICD10Result {
  schema_version: typeof DIAGNOSIS_SCHEMA_VERSION
  code: string
  description: string
  category: string
  urgency: 'routine' | 'urgent' | 'emergency'
  triage_score: number
  clinical_notes: string
  evidence: EvidenceBase & {
    clinical_reasoning: string
    red_flags: string[]
    differential_diagnosis: string[]
  }
  proposed_referrals: ProposedReferral[]
}

export interface ProcessedResult {
  id: string
  input: MedicalQuery
  output: ICD10Result | null
  logs: string[]
  durationMs: number
  status: 'processing' | 'completed' | 'failed'
}

/**
 * Streaming callbacks for progressive AI reasoning display
 */
export interface StreamCallbacks {
  onThinkingChunk: (text: string) => void
  onComplete: (result: ICD10Result) => void
  onError: (error: Error) => void
}
