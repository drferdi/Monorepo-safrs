import type { ICD10Result } from '../../types'

export type ClinicalReasoningPhase = 'idle' | 'loading' | 'success' | 'error'
export type ClinicalReasoningStageKind = 'neutral' | 'result' | 'summary'
export type ClinicalReasoningStageStatus = 'pending' | 'active' | 'completed' | 'interrupted'

export interface ClinicalReasoningStage {
  id: string
  kind: ClinicalReasoningStageKind
  title: string
  description: string
}

export const CLINICAL_REASONING_STAGES: readonly ClinicalReasoningStage[] = [
  {
    id: 'received',
    kind: 'neutral',
    title: 'Konteks klinis diterima',
    description: 'Meninjau keluhan dan konteks klinis yang disampaikan.',
  },
  {
    id: 'findings',
    kind: 'neutral',
    title: 'Temuan utama disusun',
    description: 'Mengelompokkan gejala, durasi, tingkat keparahan, dan faktor klinis.',
  },
  {
    id: 'safety',
    kind: 'neutral',
    title: 'Sinyal keselamatan diperiksa',
    description: 'Memeriksa temuan yang memerlukan eskalasi segera.',
  },
  {
    id: 'patterns',
    kind: 'neutral',
    title: 'Pola klinis dicocokkan',
    description: 'Membandingkan temuan dengan pola klinis yang relevan.',
  },
  {
    id: 'prioritized',
    kind: 'neutral',
    title: 'Kandidat diagnosis diprioritaskan',
    description: 'Memprioritaskan kandidat diagnosis untuk tinjauan klinisi.',
  },
] as const

export function buildClinicalReasoningStages(
  phase: ClinicalReasoningPhase,
  result: ICD10Result | null
): ClinicalReasoningStage[] {
  const neutralStages = CLINICAL_REASONING_STAGES.map((stage) => ({ ...stage }))

  if (phase !== 'success' || !result) return neutralStages

  const referral = result.proposed_referrals?.[0]

  return [
    ...neutralStages,
    {
      id: 'differential',
      kind: 'result',
      title: 'Diagnosis banding',
      description:
        result.evidence?.differential_diagnosis?.[0] ||
        'Tidak ada diagnosis banding tambahan yang dikembalikan.',
    },
    {
      id: 'referral',
      kind: 'result',
      title: 'Analisis rujukan',
      description: referral
        ? `${referral.destination_service} · ${referral.referral_reason}`
        : 'Tidak ada opsi rujukan tambahan yang dikembalikan.',
    },
    {
      id: 'icd10',
      kind: 'result',
      title: 'Pemetaan ICD-10',
      description: `${result.code} · ${result.description}`,
    },
    {
      id: 'final',
      kind: 'summary',
      title: 'Ringkasan tinjauan klinis',
      description:
        referral?.clinical_reasoning ||
        result.clinical_notes ||
        'Hasil tervalidasi siap ditinjau oleh klinisi.',
    },
  ]
}

export function getClinicalReasoningStageStatus(
  stageIndex: number,
  activeIndex: number,
  phase: ClinicalReasoningPhase
): ClinicalReasoningStageStatus {
  if (phase === 'idle') return 'pending'
  if (phase === 'success') return 'completed'
  if (stageIndex < activeIndex) return 'completed'
  if (stageIndex > activeIndex) return 'pending'
  return phase === 'error' ? 'interrupted' : 'active'
}

export function getNextClinicalReasoningStage(activeIndex: number) {
  return Math.min(activeIndex + 1, CLINICAL_REASONING_STAGES.length - 1)
}

export function getVisibleResultStageCount(currentIndex: number, total: number) {
  return Math.min(currentIndex + 1, total)
}
