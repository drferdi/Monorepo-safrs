'use client'

import { DrugStatusBadge } from '@/components/clinical/DrugStatusBadge'
import { AudreyMicButton } from '@/components/features/audrey/AudreyMicButton'
import { isDoctorProfession } from '@/lib/crew-access'
import { useAudreySTT } from '@/hooks/useAudreySTT'
import {
  buildFinalizationTherapyPlan,
  type FinalizationMedicationItem,
} from '@/lib/clinical/finalization-therapy-engine'
import {
  type ManualMedicationSuggestion,
  searchManualMedicationSuggestions,
} from '@/lib/clinical/manual-medication-suggestions'
import { canReceiveTriage, type OnlineSource } from '@/lib/crew-online'
import { type DashboardEncounterData, mapDashboardToTransferPayload } from '@/lib/emr/bridge-mapper'
import {
  type EmrBridgeStatus,
  isBridgeActionLocked,
  mapBridgeQueueStatusToEmrStatus,
  resolveEmrSourceInput,
} from '@/lib/emr/source-trace'
import {
  getTrajectoryHistoryWindow,
  normalizeScrapedVisitHistory,
  type ScrapedVisit,
} from '@/lib/emr/visit-history'
import { LEGACY_CDSS_RETIRED_MESSAGE } from '@/lib/legacy-cdss-retirement'
import { MiraDifferentialCard } from '@/components/telemedicine/MiraDifferentialCard'
import type { MiraDifferential } from '@/lib/telemedicine/mira-differential'
import { generateNarrative } from '@/lib/narrative-generator'
import {
  hasRespiratoryComplaint,
  type MedicationFlag,
  type RecentActivity,
  type StressState,
  suggestContextualVitals,
} from '@/lib/ttv-inference'
import { evaluateCompositeDeteriorationFromEmrPayload } from '@/lib/vitals/composite-deterioration'
import {
  extractTriageSignalContext,
  type ScreeningAlert,
  type StructuredTriageSigns,
  type TriageSignalContext,
} from '@/lib/vitals/instant-red-alerts'
import type {
  CompositeAlert as CompositeDeteriorationAlert,
  CompositeVitalSnapshot,
  CompositeDeteriorationResult as SharedCompositeDeteriorationResult,
} from '@abyss/types'
import { useRouter, useSearchParams } from 'next/navigation'
import { Fragment, useCallback, useEffect, useMemo, useRef, useState } from 'react'
import type { Socket } from 'socket.io-client'
import ClinicalPrognosisChart from './ClinicalPrognosisChart'
import ClinicalTrajectoryChart from './ClinicalTrajectoryChart'
import TrajectoryPanel from './TrajectoryPanel'
import TrustLayerGhost, { PROCESSING_SCRIPT } from './TrustLayerGhost'
import { useFocusSpotlight } from './focus-spotlight'
import { buildEmergencyOverrideFlags, deriveEmergencyOverrideState } from './emergency-override'

// Iskandar Engine V1 response types
interface CDSSSuggestion {
  rank: number
  llm_rank?: number
  icd10_code: string
  diagnosis_name: string
  confidence: number
  reasoning: string
  key_reasons?: string[]
  missing_information?: string[]
  red_flags?: string[]
  recommended_actions?: string[]
  rag_verified?: boolean
  decision_status?: 'recommended' | 'review' | 'must_not_miss' | 'deferred'
  decision_reason?: string
  deterministic_score?: number
  rank_source?: 'llm' | 'hybrid'
  validation_flags?: Array<{ type: string; code: string; message: string }>
}
interface CDSSRedFlag {
  severity: 'emergency' | 'urgent' | 'warning'
  condition: string
  action: string
  criteria_met: string[]
}
interface CDSSAlert {
  id: string
  type: string
  severity: string
  title: string
  message: string
  icd_codes?: string[]
  action?: string
}
interface CDSSResult {
  suggestions: CDSSSuggestion[]
  red_flags: CDSSRedFlag[]
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
}

type CompositeDeteriorationState = SharedCompositeDeteriorationResult | null

const ENCOUNTER_BASELINE_WINDOW_MINUTES = 120
const MAX_ENCOUNTER_MEASUREMENTS = 12

interface ManualMedicationEntry {
  id: string
  name: string
  canonicalName: string | null
  dose: string
  frequency: string
  route: string
  duration?: string
  timingHint?: string
  stockLabel?: string
  source: 'catalog' | 'manual'
}

function formatManualMedicationInline(entry: ManualMedicationEntry): string {
  const details = [entry.dose, entry.frequency, entry.route ? `(${entry.route})` : '']
    .filter(Boolean)
    .join(' ')
  return details ? `${entry.name} ${details}` : entry.name
}

function createManualMedicationEntryFromSuggestion(
  suggestion: ManualMedicationSuggestion
): ManualMedicationEntry {
  return {
    id: suggestion.id,
    name: suggestion.name,
    canonicalName: suggestion.canonicalName,
    dose: suggestion.dose,
    frequency: suggestion.frequency,
    route: suggestion.route,
    duration: suggestion.duration,
    timingHint: suggestion.timingHint,
    stockLabel: suggestion.stockLabel,
    source: 'catalog',
  }
}

function createManualMedicationEntryFromFreeText(value: string): ManualMedicationEntry {
  const trimmed = value.trim()
  return {
    id: `manual-${trimmed.toLowerCase().replace(/[^a-z0-9]+/g, '-')}`,
    name: trimmed,
    canonicalName: null,
    dose: '',
    frequency: '',
    route: '',
    source: 'manual',
  }
}

type EmrVitalKey = 'gcs' | 'td' | 'nadi' | 'napas' | 'suhu' | 'spo2' | 'map'
type VitalEntryMode = 'empty' | 'measured' | 'estimated' | 'manual_required'
type VitalConfidence = 'high' | 'medium' | 'low'

type VitalEntryMeta = {
  mode: VitalEntryMode
  confidence?: VitalConfidence
  note?: string
}

type StructuredSignSection = keyof StructuredTriageSigns

function createInitialStructuredSigns(): StructuredTriageSigns {
  return {
    respiratoryDistress: {},
    hmod: {},
    dkaHhs: {},
    perfusionShock: {},
  }
}

function normalizeStructuredSignsDraft(
  signs?: StructuredTriageSigns | null
): StructuredTriageSigns {
  return {
    respiratoryDistress: { ...(signs?.respiratoryDistress ?? {}) },
    hmod: { ...(signs?.hmod ?? {}) },
    dkaHhs: { ...(signs?.dkaHhs ?? {}) },
    perfusionShock: { ...(signs?.perfusionShock ?? {}) },
  }
}

const STRUCTURED_SIGN_CONFIG = {
  respiratoryDistress: [
    { key: 'accessoryMuscleUse', label: 'Otot bantu napas' },
    { key: 'retractions', label: 'Retraksi' },
    { key: 'unableToSpeakFullSentences', label: 'Tidak bisa bicara kalimat penuh' },
    { key: 'cyanosis', label: 'Sianosis' },
    { key: 'distressObserved', label: 'Distress napas terobservasi' },
  ],
  hmod: [
    { key: 'chest_pain', label: 'Nyeri dada' },
    { key: 'pulmonary_edema', label: 'Edema paru / orthopnea' },
    { key: 'neurological_deficit', label: 'Defisit neurologis fokal' },
    { key: 'vision_changes', label: 'Perubahan visus' },
    { key: 'severe_headache', label: 'Sakit kepala hebat' },
    { key: 'oliguria', label: 'Oliguria' },
    { key: 'altered_mental_status', label: 'Gangguan kesadaran' },
  ],
  dkaHhs: [
    { key: 'kussmaul_breathing', label: 'Napas Kussmaul' },
    { key: 'acetone_breath', label: 'Napas aseton' },
    { key: 'nausea_vomiting', label: 'Mual / muntah' },
    { key: 'abdominal_pain', label: 'Nyeri perut' },
    { key: 'altered_mental_status', label: 'Gangguan kesadaran' },
    { key: 'severe_dehydration', label: 'Dehidrasi berat' },
    { key: 'seizures', label: 'Kejang' },
  ],
  perfusionShock: [
    { key: 'dizziness', label: 'Pusing' },
    { key: 'presyncope', label: 'Presinkop' },
    { key: 'syncope', label: 'Sinkop / pingsan' },
    { key: 'weakness', label: 'Lemah / malaise' },
    { key: 'clammySkin', label: 'Kulit dingin berkeringat' },
    { key: 'coldExtremities', label: 'Ekstremitas dingin' },
    { key: 'oliguria', label: 'Oliguria' },
  ],
} as const

type WorkflowTab = 'triage' | 'review' | 'assessment' | 'finalize'
type ImportantBestQuestionVisual = 'abdomen_mcburney'

interface ImportantBestQuestion {
  id: string
  title: string
  prompt: string
  cue: string
  visual?: ImportantBestQuestionVisual
}

function summarizeValidationWarning(warning: string): string {
  const trimmed = warning.trim()
  if (trimmed.length <= 140) return trimmed
  return `${trimmed.slice(0, 137).trimEnd()}...`
}

function summarizeClinicalSnippet(value: string, limit = 132): string {
  const normalized = normalizeClinicalPhrase(value)
  if (!normalized) return ''
  if (normalized.length <= limit) return normalized
  return `${normalized.slice(0, Math.max(0, limit - 3)).trimEnd()}...`
}

type ExamState = {
  kepala: string
  dada: string
  perut: string
  ekstremitas: string
  kulit: string
  genitalia: string
}

type ExamFocusDraft = {
  kepala: string[]
  dada: string[]
  perut: string[]
  ekstremitas: string[]
  kulit: string[]
  genitalia: string[]
}

type ExamTemplateSet = Record<keyof ExamState, string>

function getDecisionBucketLabel(status: CDSSSuggestion['decision_status']): string {
  switch (status) {
    case 'recommended':
      return 'Recommended'
    case 'review':
      return 'Review Dokter'
    case 'must_not_miss':
      return 'Must-not-miss'
    default:
      return 'Deferred'
  }
}

interface EmrPhaseFooterButtonProps {
  label: string
  tone: 'blue' | 'critical'
  onClick: () => void
  disabled?: boolean
}

function EmrPhaseFooterButton({ label, tone, onClick, disabled }: EmrPhaseFooterButtonProps) {
  return (
    <button
      type="button"
      className={`emr-neu-nav-btn emr-neu-nav-btn-${tone}`}
      onClick={onClick}
      disabled={disabled}
      aria-label={label}
    >
      <span className="emr-neu-nav-btn-label">{label}</span>
    </button>
  )
}

function getDecisionAccent(status: CDSSSuggestion['decision_status']): string {
  switch (status) {
    case 'recommended':
      return 'var(--c-asesmen)'
    case 'review':
      return 'var(--warning)'
    case 'must_not_miss':
      return 'var(--c-critical)'
    default:
      return 'var(--text-muted)'
  }
}

function getCompositeSeverityColor(severity: CompositeDeteriorationAlert['severity']): string {
  switch (severity) {
    case 'critical':
      return 'var(--critical)'
    case 'high':
      return 'var(--warning)'
    default:
      return 'var(--warning)'
  }
}

function getCompositeConfidenceLabel(
  confidence: CompositeDeteriorationAlert['confidence']
): string {
  switch (confidence) {
    case 'high':
      return 'High confidence'
    case 'medium':
      return 'Medium confidence'
    default:
      return 'Low confidence'
  }
}

function parseEncounterMeasurement(value: unknown): CompositeVitalSnapshot | null {
  if (!value || typeof value !== 'object') return null
  const record = value as Record<string, unknown>
  const toFinite = (input: unknown): number | undefined => {
    if (typeof input === 'number' && Number.isFinite(input)) return input
    if (typeof input === 'string') {
      const normalized = input.trim().replace(',', '.')
      if (!normalized) return undefined
      const parsed = Number.parseFloat(normalized)
      if (Number.isFinite(parsed)) return parsed
    }
    return undefined
  }
  const normalizeAvpu = (input: unknown): CompositeVitalSnapshot['avpu'] => {
    if (typeof input !== 'string') return undefined
    const normalized = input.trim().toUpperCase()
    return ['A', 'C', 'V', 'P', 'U'].includes(normalized)
      ? (normalized as CompositeVitalSnapshot['avpu'])
      : undefined
  }

  const snapshot: CompositeVitalSnapshot = {
    hr: toFinite(record.hr),
    sbp: toFinite(record.sbp),
    dbp: toFinite(record.dbp),
    rr: toFinite(record.rr),
    temp: toFinite(record.temp),
    spo2: toFinite(record.spo2),
    avpu: normalizeAvpu(record.avpu),
    supplementalO2: record.supplementalO2 === true,
    glucose: toFinite(record.glucose),
    capillaryRefillSec: toFinite(record.capillaryRefillSec),
    measuredAt:
      typeof record.measuredAt === 'string' && record.measuredAt.trim()
        ? record.measuredAt
        : undefined,
  }

  const hasCoreVitals =
    typeof snapshot.sbp === 'number' &&
    typeof snapshot.dbp === 'number' &&
    typeof snapshot.hr === 'number' &&
    typeof snapshot.rr === 'number' &&
    typeof snapshot.temp === 'number' &&
    typeof snapshot.spo2 === 'number'

  return hasCoreVitals ? snapshot : null
}

function normalizeEncounterMeasurements(value: unknown): CompositeVitalSnapshot[] {
  if (!Array.isArray(value)) return []
  return value
    .map((item) => parseEncounterMeasurement(item))
    .filter((item): item is CompositeVitalSnapshot => item !== null)
}

function trimEncounterMeasurements(
  measurements: CompositeVitalSnapshot[]
): CompositeVitalSnapshot[] {
  const cutoff = Date.now() - ENCOUNTER_BASELINE_WINDOW_MINUTES * 60 * 1000
  const filtered = measurements.filter((item) => {
    if (!item.measuredAt) return true
    const time = new Date(item.measuredAt).getTime()
    return Number.isFinite(time) ? time >= cutoff : true
  })
  return filtered.slice(-MAX_ENCOUNTER_MEASUREMENTS)
}

function buildEncounterMeasurementSignature(snapshot: CompositeVitalSnapshot): string {
  return [
    snapshot.sbp ?? '',
    snapshot.dbp ?? '',
    snapshot.hr ?? '',
    snapshot.rr ?? '',
    snapshot.temp ?? '',
    snapshot.spo2 ?? '',
    snapshot.avpu ?? '',
    snapshot.supplementalO2 ? '1' : '0',
    snapshot.glucose ?? '',
    snapshot.capillaryRefillSec ?? '',
  ].join('|')
}

function readObjectRecord(value: unknown): Record<string, unknown> {
  return value && typeof value === 'object' ? (value as Record<string, unknown>) : {}
}

function CdssCoreLoader() {
  return (
    <div className="cdss-core-loader" aria-hidden="true">
      <div className="cdss-core-loader-grid" />
      <div className="cdss-core-loader-scan" />
      <div className="cdss-core-loader-orbit cdss-core-loader-orbit-a">
        <span />
      </div>
      <div className="cdss-core-loader-orbit cdss-core-loader-orbit-b">
        <span />
      </div>
      <div className="cdss-core-loader-orbit cdss-core-loader-orbit-c">
        <span />
      </div>
      <div className="cdss-core-loader-nucleus">
        <span className="cdss-core-loader-nucleus-dot" />
      </div>
    </div>
  )
}

function getSuggestionKey(
  suggestion: Pick<
    CDSSSuggestion,
    'rank' | 'llm_rank' | 'icd10_code' | 'diagnosis_name' | 'decision_status'
  >
): string {
  return [
    suggestion.llm_rank ?? suggestion.rank,
    suggestion.icd10_code,
    suggestion.diagnosis_name.trim().toLowerCase(),
    suggestion.decision_status ?? 'review',
  ].join('::')
}

function normalizeDraftToken(value: string): string {
  return value
    .trim()
    .replace(/[.,;:]+$/g, '')
    .replace(/\s+/g, ' ')
    .toLowerCase()
}

function summarizeSuggestionReason(suggestion: CDSSSuggestion): string {
  const source =
    suggestion.decision_reason?.trim() ||
    suggestion.key_reasons?.[0]?.trim() ||
    suggestion.reasoning?.trim() ||
    'Perlu pertimbangan klinis lanjutan.'
  return source.length <= 132 ? source : `${source.slice(0, 129).trimEnd()}...`
}

function getSuggestionDisposition(suggestion: CDSSSuggestion): {
  label: string
  note: string
  tone: 'puskesmas' | 'referral'
} {
  const context = [
    suggestion.reasoning,
    suggestion.decision_reason,
    ...(suggestion.red_flags ?? []),
    ...(suggestion.recommended_actions ?? []),
    ...(suggestion.validation_flags?.map((flag) => flag.message) ?? []),
  ]
    .join(' ')
    .toLowerCase()

  const referralSignals = [
    'rujuk',
    'igd',
    'emergency',
    'urgent',
    'stabilisasi',
    'rawat inap',
    'observasi ketat',
    'sepsis',
    'syok',
    'acs',
    'stroke',
    'appendisitis akut',
  ]

  const shouldRefer =
    suggestion.decision_status === 'must_not_miss' ||
    referralSignals.some((signal) => context.includes(signal))

  if (shouldRefer) {
    return {
      label: 'Rujukan available',
      note: 'Pertimbangkan rujukan atau eskalasi layanan bila fasilitas Puskesmas tidak memadai.',
      tone: 'referral',
    }
  }

  return {
    label: 'Tuntaskan di Puskesmas',
    note: 'Dapat ditangani di layanan primer bila evaluasi klinis dan monitoring tetap terpenuhi.',
    tone: 'puskesmas',
  }
}

function getMedicationCategoryLabel(category: string): string {
  switch (category) {
    case 'cardiovascular':
      return 'Kardiovaskular'
    case 'analgesic':
      return 'Analgesik'
    case 'antibiotic':
      return 'Antibiotik'
    case 'antidiabetic':
      return 'Antidiabetik'
    case 'antihypertensive':
      return 'Antihipertensi'
    case 'bronchodilator':
      return 'Bronkodilator'
    case 'antihistamine':
      return 'Antihistamin'
    case 'gastrointestinal':
      return 'Gastrointestinal'
    case 'vitamin_mineral':
      return 'Vitamin / Mineral'
    case 'emergency':
      return 'Emergency'
    default:
      return 'Golongan lain'
  }
}

function inferMedicationRouteLabel(input: {
  name: string
  canonicalName: string | null
  dose: string
  frequency: string
}): string {
  const source = [input.name, input.canonicalName ?? '', input.dose, input.frequency]
    .join(' ')
    .toLowerCase()
  if (source.includes('subling')) return 'Sublingual'
  if (source.includes('iv') || source.includes('intravena')) return 'Intravena'
  if (source.includes('im') || source.includes('intramusk')) return 'Intramuskular'
  if (source.includes('inhal')) return 'Inhalasi'
  if (source.includes('salep') || source.includes('topikal')) return 'Topikal'
  if (source.includes('sirup')) return 'Sirup / oral'
  return 'Oral'
}

function sortSuggestionsForDisplay(suggestions: CDSSSuggestion[]): CDSSSuggestion[] {
  return [...suggestions].sort((left, right) => {
    const leftHybrid = typeof left.deterministic_score === 'number' ? left.deterministic_score : -1
    const rightHybrid =
      typeof right.deterministic_score === 'number' ? right.deterministic_score : -1

    if (rightHybrid !== leftHybrid) {
      return rightHybrid - leftHybrid
    }

    if (right.confidence !== left.confidence) {
      return right.confidence - left.confidence
    }

    const leftRank = left.llm_rank ?? left.rank
    const rightRank = right.llm_rank ?? right.rank
    return leftRank - rightRank
  })
}

function buildExamNarrative(template: string, focusNotes: string[] = []): string {
  const uniqueFocus = focusNotes.filter((note, index, source) => {
    const normalized = normalizeDraftToken(note)
    return (
      normalized &&
      source.findIndex((candidate) => normalizeDraftToken(candidate) === normalized) === index
    )
  })

  if (uniqueFocus.length === 0) {
    return template
  }

  return `${template} Fokus klinis: ${uniqueFocus.join('; ')}.`
}

function deriveExamFocusDraft(
  keluhanUtama: string,
  keluhanTambahan: string,
  physicalSuggestions: string[] = []
): ExamFocusDraft {
  const complaintContext = normalizeClinicalPhrase(
    `${keluhanUtama} ${keluhanTambahan}`
  ).toLowerCase()
  const joinedSuggestions = physicalSuggestions.join(' ').toLowerCase()
  const hasSignal = (keywords: string[]) =>
    keywords.some(
      (keyword) => complaintContext.includes(keyword) || joinedSuggestions.includes(keyword)
    )

  const draft: ExamFocusDraft = {
    kepala: [],
    dada: [],
    perut: [],
    ekstremitas: [],
    kulit: [],
    genitalia: [],
  }

  if (hasSignal(['sesak', 'batuk', 'nyeri dada', 'napas', 'wheezing'])) {
    draft.dada.push('Inspeksi kerja napas, retraksi, dan pola napas')
    draft.dada.push('Auskultasi cor-pulmo untuk ronki, wheezing, atau murmur')
    draft.ekstremitas.push('Perfusi perifer, CRT, dan akral hangat/dingin')
  }

  if (
    hasSignal([
      'nyeri perut',
      'perut kanan bawah',
      'mual',
      'muntah',
      'diare',
      'appendis',
      'apendisitis',
    ])
  ) {
    draft.perut.push('Inspeksi distensi dan bising usus')
    draft.perut.push('Palpasi nyeri tekan, rebound, dan defans muskular')
    draft.perut.push('Nilai titik McBurney bila nyeri kuadran kanan bawah')
    draft.kulit.push('Status hidrasi dan turgor kulit')
  }

  if (hasSignal(['nyeri pinggang', 'pinggang', 'anyang', 'disuria', 'cva', 'flank'])) {
    draft.perut.push('Ketok CVA kanan dan kiri')
    draft.perut.push('Palpasi abdomen bawah dan suprapubik')
    draft.kulit.push('Status hidrasi dan turgor kulit')
  }

  if (hasSignal(['demam', 'ruam', 'gatal', 'kulit'])) {
    draft.kulit.push('Inspeksi ruam, lesi, dan warna kulit')
    draft.kulit.push('Turgor dan suhu akral')
  }

  if (hasSignal(['sakit kepala', 'vertigo', 'mata', 'telinga', 'tenggorokan'])) {
    draft.kepala.push('Konjungtiva, pupil, dan refleks cahaya sesuai indikasi')
    draft.kepala.push('Orofaring, tonsil, dan KGB servikal')
  }

  if (hasSignal(['lemah', 'baal', 'kesemutan', 'lumpuh'])) {
    draft.ekstremitas.push('Kekuatan motorik dan ROM sendi')
    draft.ekstremitas.push('Status sensorik perifer sesuai keluhan')
  }

  return draft
}

function createNormalExamTemplate(vitals: Record<EmrVitalKey, string>): ExamTemplateSet {
  const gcs = vitals.gcs.trim() || 'E4 V5 M6'
  const td = vitals.td.trim() || '120/80'
  const nadi = vitals.nadi.trim() || '80'
  const napas = vitals.napas.trim() || '18'
  const suhu = vitals.suhu.trim() || '36.5'
  const spo2 = vitals.spo2.trim() || '99'

  return {
    kepala: `Status generalis: Keadaan umum tampak sakit sedang, compos mentis; GCS ${gcs}; TD ${td} mmHg | Nadi ${nadi} x/menit reguler | RR ${napas} x/menit | Suhu ${suhu} °C | SpO2 ${spo2}% on room air | Skala nyeri 0/10. Kepala & leher dalam batas normal: normocephal, deformitas (-), jejas (-); konjungtiva anemis (-/-), sklera ikterik (-/-), pupil isokor 3mm/3mm, refleks cahaya (+/+); mukosa bibir lembap, faring hiperemis (-), tonsil T1/T1; JVP 5-2 cmH2O, KGB servikal (-), tiroid (-), kaku kuduk (-).`,
    dada: 'Thorax dalam batas normal: inspeksi dada simetris statis-dinamis, retraksi interkostal (-), jejas (-); vokal fremitus dan ekspansi dada simetris; perkusi sonor di seluruh lapang paru; auskultasi paru vesikuler (+/+), ronki (-/-), wheezing (-/-); bunyi jantung I-II murni reguler, murmur (-), gallop (-).',
    perut:
      'Abdomen dalam batas normal: inspeksi datar, jejas (-), distensi (-), venektasi (-); bising usus (+) normal; perkusi timpani di seluruh kuadran, shifting dullness (-); palpasi supel, nyeri tekan (-), defans muskuler (-), hepatomegali (-), splenomegali (-).',
    ekstremitas:
      'Ekstremitas dalam batas normal: akral hangat, CRT < 2 detik; edema ekstremitas superior (-/-), inferior (-/-); pulsasi perifer teraba kuat; kekuatan motorik 5555 / 5555 atas dan 5555 / 5555 bawah.',
    kulit: 'Kulit dalam batas normal: turgor baik, ruam (-), ikterik (-), sianosis (-).',
    genitalia:
      'Genitalia tidak diperiksa rutin, dalam batas indikasi klinis; temuan khusus tidak ada saat ini.',
  }
}

function sanitizeClinicalInput(value: string): string {
  return value.replace(/[\u200B-\u200D\uFEFF]/g, '').replace(/\u00A0/g, ' ')
}

function normalizeClinicalPhrase(value: string): string {
  return sanitizeClinicalInput(value).replace(/\s+/g, ' ').trim()
}

function hasKeywordSignal(source: string, keywords: string[]): boolean {
  return keywords.some((keyword) => source.includes(keyword))
}

function deriveImportantBestQuestions(
  keluhanUtama: string,
  keluhanTambahan: string,
  nextBestQuestions: string[] = []
): ImportantBestQuestion[] {
  const complaintContext = normalizeClinicalPhrase(
    `${keluhanUtama} ${keluhanTambahan}`
  ).toLowerCase()
  const normalizedQuestions = nextBestQuestions
    .map((question) => {
      const original = question.trim()
      const normalized = normalizeClinicalPhrase(question).toLowerCase()
      return normalized ? { original, normalized } : null
    })
    .filter((item): item is { original: string; normalized: string } => Boolean(item))
  const items: ImportantBestQuestion[] = []

  const hasMcBurneyQuestion = normalizedQuestions.some((question) =>
    hasKeywordSignal(question.normalized, ['mcburney', 'kanan bawah', 'appendis', 'apendisitis'])
  )
  const hasRightLowerQuadrantComplaint = hasKeywordSignal(complaintContext, [
    'nyeri perut kanan bawah',
    'perut kanan bawah',
    'nyeri kuadran kanan bawah',
    'appendis',
    'apendisitis',
    'mcburney',
  ])
  const hasAcuteAbdominalSignal =
    hasKeywordSignal(complaintContext, ['nyeri perut', 'mual', 'muntah', 'demam']) &&
    hasKeywordSignal(complaintContext, ['kanan', 'bawah', 'perut'])

  if (hasMcBurneyQuestion || hasRightLowerQuadrantComplaint || hasAcuteAbdominalSignal) {
    items.push({
      id: 'mcburney-point',
      title: 'Nyeri tekan titik McBurney',
      prompt:
        'Pastikan ada atau tidak nyeri tekan pada titik McBurney untuk menilai kemungkinan apendisitis.',
      cue: 'Fokus pada kuadran kanan bawah abdomen sebelum masuk ke diferensial lanjutan.',
      visual: 'abdomen_mcburney',
    })
  }

  normalizedQuestions.forEach((question, index) => {
    if (
      hasKeywordSignal(question.normalized, ['mcburney', 'kanan bawah', 'appendis', 'apendisitis'])
    ) {
      return
    }

    items.push({
      id: `best-question-${index}`,
      title: 'Konfirmasi klinis penting',
      prompt: question.original,
      cue: 'Gunakan sebagai pertanyaan lanjut atau fokus pemeriksaan saat review dokter.',
    })
  })

  return items.slice(0, 4)
}

function renderImportantBestQuestionVisual(visual: ImportantBestQuestionVisual) {
  if (visual !== 'abdomen_mcburney') return null

  return (
    <div className="best-question-visual best-question-visual-abdomen" aria-hidden="true">
      <svg viewBox="0 0 220 150" focusable="false">
        <path
          d="M74 26 C66 44, 60 58, 60 72 C60 104, 76 124, 110 132 C144 124, 160 104, 160 72 C160 58, 154 44, 146 26"
          fill="none"
          stroke="rgba(240, 232, 220, 0.34)"
          strokeWidth="1.2"
          strokeDasharray="5 5"
        />
        <path
          d="M88 38 C90 62, 90 84, 82 106"
          fill="none"
          stroke="rgba(240, 232, 220, 0.18)"
          strokeWidth="1"
          strokeDasharray="4 5"
        />
        <path
          d="M132 38 C130 62, 130 84, 138 106"
          fill="none"
          stroke="rgba(240, 232, 220, 0.18)"
          strokeWidth="1"
          strokeDasharray="4 5"
        />
        <line
          x1="146"
          y1="92"
          x2="198"
          y2="66"
          stroke="rgba(232, 168, 56, 0.82)"
          strokeWidth="1.4"
          strokeDasharray="3 4"
        />
        <circle
          cx="146"
          cy="92"
          r="6"
          fill="rgba(232, 168, 56, 0.16)"
          stroke="rgba(232, 168, 56, 0.96)"
          strokeWidth="1.4"
        />
        <circle cx="146" cy="92" r="2.5" fill="rgba(232, 168, 56, 1)" />
        <text x="128" y="20" fill="rgba(240, 232, 220, 0.44)" fontSize="12" letterSpacing="0.14em">
          ABDOMEN
        </text>
        <text x="154" y="60" fill="rgba(232, 168, 56, 0.92)" fontSize="12" letterSpacing="0.08em">
          McBurney
        </text>
      </svg>
    </div>
  )
}

function normalizeBloodPressureInput(value: string): string {
  const digits = value.replace(/\D/g, '').slice(0, 6)
  if (digits.length <= 3 && !value.includes('/')) {
    return digits
  }

  const systolic = digits.slice(0, 3)
  const diastolic = digits.slice(3, 6)

  if (digits.length <= 3) {
    return `${systolic}/`
  }

  return `${systolic}/${diastolic}`
}

async function fetchAutocompleteChain(
  payload: { query: string; context: string[] },
  signal: AbortSignal,
  attempt = 0
): Promise<Response> {
  const response = await fetch('/api/cdss/autocomplete', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
    signal,
  })

  if (response.status !== 404 || attempt >= 4) {
    return response
  }

  console.warn(`[AC] route belum siap, retry ${attempt + 1}...`)
  await new Promise((resolve) => setTimeout(resolve, 450 + attempt * 350))
  if (signal.aborted) {
    throw new DOMException('Autocomplete request aborted', 'AbortError')
  }
  return fetchAutocompleteChain(payload, signal, attempt + 1)
}

function createInitialVitalMeta(): Record<EmrVitalKey, VitalEntryMeta> {
  return {
    gcs: { mode: 'empty' },
    td: { mode: 'empty' },
    nadi: { mode: 'empty' },
    napas: { mode: 'empty' },
    suhu: { mode: 'empty' },
    spo2: { mode: 'empty' },
    map: { mode: 'empty' },
  }
}

const MEDICATION_OPTIONS: Array<{ key: MedicationFlag; label: string }> = [
  { key: 'beta_blocker', label: 'Beta blocker' },
  { key: 'stimulant', label: 'Stimulan' },
  { key: 'sedative', label: 'Sedatif' },
  { key: 'antipyretic', label: 'Antipiretik' },
]

function appendUniqueDelimitedValue(previous: string, nextValue: string, joiner = ', '): string {
  const cleanNext = nextValue.trim().replace(/[.,;:]+$/g, '')
  if (!cleanNext) return previous

  const normalizedNext = normalizeDraftToken(cleanNext)
  const splitPattern = joiner.includes(';') ? /[;]/ : /[,]/
  const existingTokens = previous
    .split(splitPattern)
    .map((part) => normalizeDraftToken(part))
    .filter(Boolean)

  if (existingTokens.includes(normalizedNext)) return previous
  return previous.trim() ? `${previous.trimEnd()}${joiner}${cleanNext}` : cleanNext
}

function appendUniqueNarrativeValue(previous: string, nextValue: string): string {
  const cleanPrevious = previous.trim()
  const cleanNext = nextValue
    .trim()
    .replace(/\s+/g, ' ')
    .replace(/[.;:,]+$/g, '')
  if (!cleanNext) return previous

  const normalizedPrevious = normalizeDraftToken(cleanPrevious)
  const normalizedNext = normalizeDraftToken(cleanNext)

  if (normalizedPrevious && normalizedPrevious.includes(normalizedNext)) {
    return previous
  }

  if (normalizedPrevious && normalizedNext.includes(normalizedPrevious)) {
    return cleanNext
  }

  if (!cleanPrevious) {
    return cleanNext
  }

  const previousWithSentenceEnd = /[.!?]$/.test(cleanPrevious) ? cleanPrevious : `${cleanPrevious}.`

  return `${previousWithSentenceEnd} ${cleanNext}`
}

// Mapping sub-items pemeriksaan — keyword matching (lowercase)
const PEM_SUB_ITEMS: Record<string, string[]> = {
  'darah lengkap': [
    'Hemoglobin (Hb)',
    'Leukosit (WBC)',
    'Trombosit',
    'Hematokrit',
    'Eritrosit (RBC)',
    'MCV',
    'MCH',
    'MCHC',
    'Diff Count',
  ],
  'hitung darah': [
    'Hemoglobin (Hb)',
    'Leukosit (WBC)',
    'Trombosit',
    'Hematokrit',
    'Eritrosit (RBC)',
    'MCV',
    'MCH',
    'MCHC',
    'Diff Count',
  ],
  'fungsi hati': [
    'SGOT (AST)',
    'SGPT (ALT)',
    'Albumin',
    'Bilirubin Total',
    'Bilirubin Direk',
    'Bilirubin Indirek',
    'Gamma GT',
  ],
  'fungsi ginjal': ['Ureum', 'Kreatinin', 'Asam Urat', 'eGFR', 'BUN'],
  'urin lengkap': [
    'Protein Urin',
    'Glukosa Urin',
    'Keton',
    'pH',
    'Berat Jenis',
    'Sedimen Urin',
    'Leukosit Urin',
    'Eritrosit Urin',
  ],
  'gula darah': ['GDS (Gula Darah Sewaktu)', 'GDP (Gula Darah Puasa)', 'GD2PP (2 Jam PP)', 'HbA1c'],
  elektrolit: [
    'Natrium (Na)',
    'Kalium (K)',
    'Klorida (Cl)',
    'Kalsium (Ca)',
    'Magnesium (Mg)',
    'Fosfor (P)',
  ],
  lipid: ['Kolesterol Total', 'LDL', 'HDL', 'Trigliserida'],
  'profil lemak': ['Kolesterol Total', 'LDL', 'HDL', 'Trigliserida'],
  crp: ['CRP Kuantitatif', 'CRP Kualitatif'],
  led: ['LED (Laju Endap Darah)'],
  kultur: ['Kultur Darah', 'Kultur Urin', 'Kultur Sputum', 'Sensitivitas Antibiotik'],
  'foto toraks': ['PA (Posterior-Anterior)', 'Lateral', 'AP (Anterior-Posterior)'],
  rontgen: ['Foto Thorax PA', 'Foto Thorax Lateral'],
  ekg: ['EKG 12 Lead', 'Interpretasi Ritme', 'Interpretasi ST-T'],
  elektrokardiografi: ['EKG 12 Lead', 'Interpretasi Ritme', 'Interpretasi ST-T'],
  echocardiography: [
    'Fraksi Ejeksi (EF)',
    'Dimensi Ruang Jantung',
    'Fungsi Sistolik',
    'Fungsi Diastolik',
  ],
  'usg abdomen': ['USG Hati', 'USG Limpa', 'USG Ginjal', 'USG Kandung Kemih', 'USG Pankreas'],
  usg: ['USG Abdomen', 'USG Pelvis', 'USG Tiroid', 'USG Mammae'],
  thyroid: ['TSH', 'FT4', 'FT3', 'Anti-TPO'],
  tiroid: ['TSH', 'FT4', 'FT3', 'Anti-TPO'],
  hba1c: ['HbA1c (%)'],
  widal: ['Widal S. typhi O', 'Widal S. typhi H', 'Widal S. paratyphi AO', 'Widal S. paratyphi AH'],
  malaria: ['Apusan Darah Tebal', 'Apusan Darah Tipis', 'RDT Malaria'],
  dengue: ['NS1 Antigen', 'IgM Anti-Dengue', 'IgG Anti-Dengue'],
  covid: ['Antigen SARS-CoV-2', 'PCR SARS-CoV-2'],
  sputum: ['BTA Sputum (3 Spesimen)', 'Kultur Sputum', 'GeneXpert MTB/RIF'],
  'pungsi lumbal': [
    'Warna & Kejernihan CSS',
    'Protein CSS',
    'Glukosa CSS',
    'Sel CSS',
    'Kultur CSS',
  ],
}

function getPemSubItems(itemLabel: string): string[] {
  const lower = itemLabel.toLowerCase()
  for (const [key, subs] of Object.entries(PEM_SUB_ITEMS)) {
    if (lower.includes(key)) return subs
  }
  return []
}

// ── Kamus istilah medis — klik kanan untuk penjelasan ──
const MED_GLOSSARY: Record<string, string> = {
  // Lab
  DL: 'Darah Lengkap — Hb, Ht, Leukosit, Trombosit, Hitung Jenis',
  'Hb/Ht': 'Hemoglobin / Hematokrit',
  Hb: 'Hemoglobin — kadar sel darah merah',
  Trombosit: 'Hitung Trombosit — fungsi pembekuan darah',
  'LED/CRP': 'Laju Endap Darah / C-Reactive Protein — penanda inflamasi',
  LED: 'Laju Endap Darah — penanda inflamasi non-spesifik',
  CRP: 'C-Reactive Protein — protein fase akut, penanda inflamasi',
  'CRP/Prokalsitonin': 'C-Reactive Protein / Prokalsitonin — penanda infeksi bakteri',
  GDS: 'Gula Darah Sewaktu',
  GDP: 'Gula Darah Puasa',
  'GDP/GDS': 'Gula Darah Puasa / Sewaktu',
  'GDP/HbA1c': 'Gula Darah Puasa / HbA1c (kontrol gula 3 bulan)',
  'GDS/HbA1c': 'Gula Darah Sewaktu / HbA1c',
  HbA1c: 'Hemoglobin A1c — rata-rata gula darah 3 bulan terakhir',
  'BUN/SK': 'Blood Urea Nitrogen / Serum Kreatinin — fungsi ginjal',
  SK: 'Serum Kreatinin — fungsi filtrasi ginjal',
  'SGOT/SGPT': 'Enzim hati — Serum Glutamic Oxaloacetic/Pyruvic Transaminase',
  'SGOT/SGPT/ALP': 'Enzim hati + Alkaline Phosphatase',
  'SGOT/SGPT/BUN/SK': 'Fungsi hati + fungsi ginjal',
  'SGOT/SGPT/Amilase/Lipase': 'Fungsi hati + enzim pankreas',
  'Bilirubin Total/Direk': 'Bilirubin — penanda fungsi hati dan sumbatan empedu',
  Albumin: 'Albumin serum — status nutrisi dan fungsi hati',
  UL: 'Urinalisis Lengkap — warna, pH, protein, glukosa, sedimen',
  FL: 'Feses Lengkap — warna, konsistensi, parasit, darah samar',
  'FL/FOBT': 'Feses Lengkap + Fecal Occult Blood Test (darah samar)',
  FOBT: 'Fecal Occult Blood Test — deteksi darah samar dalam feses',
  PPT: 'Plano/Pregnancy Pack Test — tes kehamilan urin (hCG)',
  AGD: 'Analisis Gas Darah — pH, pO2, pCO2, HCO3, BE',
  Elektrolit: 'Natrium (Na), Kalium (K), Klorida (Cl)',
  'Elektrolit/BUN/SK': 'Elektrolit + fungsi ginjal',
  'DL/Elektrolit': 'Darah Lengkap + Elektrolit',
  'DL/GDS': 'Darah Lengkap + Gula Darah Sewaktu',
  'DL/LED/CRP': 'Darah Lengkap + penanda inflamasi',
  'Elektrolit/BUN/SK/SGOT/SGPT': 'Panel metabolik — elektrolit + ginjal + hati',
  'Elektrolit/TFT': 'Elektrolit + Tes Fungsi Tiroid',
  TFT: 'Thyroid Function Test — TSH, FT4, FT3',
  TSH: 'Thyroid Stimulating Hormone',
  'TSH/FT4': 'TSH + Free T4 — skrining fungsi tiroid',
  'PT/aPTT': 'Prothrombin Time / Activated Partial Thromboplastin Time — koagulasi',
  'BT/CT': 'Bleeding Time / Clotting Time — waktu perdarahan/pembekuan',
  'BT/PT': 'Bleeding Time / Prothrombin Time',
  'D-Dimer': 'D-Dimer — penanda pemecahan bekuan darah (DVT, emboli paru)',
  Troponin: 'Troponin I/T — penanda kerusakan otot jantung',
  'BNP/NT-proBNP': 'Brain Natriuretic Peptide — penanda gagal jantung',
  EKG: 'Elektrokardiogram — rekam aktivitas listrik jantung 12 lead',
  'Amilase/Lipase': 'Enzim pankreas — penanda pankreatitis',
  'Asam Urat': 'Asam Urat serum — penanda gout/hiperurisemia',
  'RF/Anti-CCP': 'Rheumatoid Factor / Anti-CCP — penanda autoimun sendi',
  'ANA/Anti-dsDNA': 'Antinuclear Antibody — penanda lupus/autoimun',
  'ANA/RF': 'Antinuclear Antibody / Rheumatoid Factor',
  'ASO/Viral Panel': 'Anti-Streptolysin O + Panel Virus',
  CK: 'Creatine Kinase — enzim otot (rhabdomyolisis)',
  'Vit B12/Folat': 'Vitamin B12 + Asam Folat serum',
  'FSH/LH/Prolaktin/TSH': 'Profil hormonal reproduksi + tiroid',
  Androgen: 'Hormon androgen (testosteron, DHEA-S)',
  'Profil Lipid': 'Kolesterol Total, LDL, HDL, Trigliserida',
  'GDS/Profil Lipid': 'Gula Darah Sewaktu + Profil Lipid',
  'H. pylori': 'Tes Helicobacter pylori — penyebab ulkus lambung',
  'Kultur Darah': 'Kultur Darah — identifikasi bakteri penyebab sepsis',
  'Kultur Urin': 'Kultur Urin — identifikasi bakteri ISK',
  'Kultur Sputum': 'Kultur Dahak — identifikasi bakteri pneumonia/TB',
  'BTA/Kultur Sputum': 'Basil Tahan Asam + Kultur Dahak (suspek TB)',
  'Kultur Feses': 'Kultur Feses — identifikasi bakteri diare',
  'Kultur Kulit': 'Kultur Kulit — identifikasi infeksi kulit',
  'Kultur Konjungtiva': 'Kultur swab mata — identifikasi infeksi konjungtiva',
  'Kultur Vaginal': 'Kultur cairan vagina — identifikasi infeksi',
  'Rapid Strep/Kultur': 'Tes Cepat Streptococcus + Kultur tenggorokan',
  'Rapid Influenza': 'Tes Cepat Antigen Influenza A/B',
  Monospot: 'Tes Monospot — deteksi mononukleosis (EBV)',
  Serologi: 'Pemeriksaan antibodi darah untuk infeksi',
  'IgE Total': 'Imunoglobulin E — penanda alergi',
  'IgE Total/Skin Prick': 'IgE Total + Skin Prick Test (uji tusuk alergi)',
  'Skin Prick/IgE Spesifik': 'Uji tusuk kulit + IgE spesifik alergen',
  'PCR Viral': 'Polymerase Chain Reaction — deteksi DNA/RNA virus',
  'PCR Trichomonas': 'PCR untuk Trichomonas vaginalis',
  'Anti-AChR': 'Anti-Acetylcholine Receptor — penanda Myasthenia Gravis',
  'Tumor Marker': 'Penanda Tumor (CEA, AFP, CA-125, PSA, dll)',
  'GD/Crossmatch': 'Golongan Darah + Crossmatch — persiapan transfusi',
  'Biopsi Kulit': 'Pengambilan jaringan kulit untuk pemeriksaan patologi',
  Toksikologi: 'Skrining toksikologi urin/darah',
  'Pungsi Lumbal': 'Pengambilan cairan otak (CSS) via tulang belakang bawah',
  'Mikroskopis Vaginal': 'Pemeriksaan mikroskopis cairan vagina',
  'Kultur Sekret Hidung': 'Kultur sekret hidung — identifikasi bakteri sinusitis',
  'Protein Urin 24 Jam': 'Pengumpulan urin 24 jam — kuantifikasi protein (nefropati)',
  // Fisik
  'Tanda Vital': 'TD, Nadi, Napas, Suhu — parameter dasar',
  'Tanda Vital/SpO2': 'Tanda Vital + Saturasi Oksigen',
  SpO2: 'Saturasi Oksigen — kadar O2 dalam darah (%)',
  Suhu: 'Pengukuran suhu tubuh',
  'Suhu Aksila/Oral': 'Pengukuran suhu ketiak atau mulut',
  TD: 'Tekanan Darah — sistolik/diastolik (mmHg)',
  'TD/Nadi': 'Tekanan Darah + Denyut Nadi',
  'TD Ortostatik': 'TD berdiri vs berbaring — deteksi hipotensi postural',
  Nadi: 'Denyut nadi — frekuensi, irama, isi',
  'Auskultasi Pulmo': 'Dengarkan suara napas paru dengan stetoskop',
  'Auskultasi Cor': 'Dengarkan suara jantung dengan stetoskop',
  'Auskultasi Cor/Pulmo': 'Dengarkan suara jantung + paru',
  'Auskultasi Abdomen': 'Dengarkan bising usus dengan stetoskop',
  'Palpasi Abdomen': 'Raba perut — nyeri tekan, massa, defans',
  'Palpasi KGB': 'Raba Kelenjar Getah Bening — leher, ketiak, inguinal',
  'Palpasi Thorax': 'Raba dada — nyeri tekan, krepitasi',
  'Palpasi Sinus': 'Raba sinus paranasal — nyeri tekan sinusitis',
  'Palpasi Tiroid': 'Raba kelenjar tiroid — pembesaran, nodul',
  'Palpasi Sendi': 'Raba sendi — bengkak, hangat, nyeri tekan',
  'Palpasi Vertebra': 'Raba tulang belakang — nyeri tekan',
  'Palpasi Hepar/Lien': 'Raba hati + limpa — pembesaran',
  'Palpasi Hepar': 'Raba hati — pembesaran (hepatomegali)',
  'Palpasi Nadi Perifer': 'Raba nadi di pergelangan kaki/tangan',
  'Palpasi Edema': 'Raba bengkak — pitting/non-pitting',
  'Palpasi Epigastrium': 'Raba ulu hati — nyeri tekan',
  'Perkusi Abdomen': 'Ketuk perut — timpani (gas) atau redup (cairan)',
  'Perkusi Pulmo': 'Ketuk dada — sonor/redup/hipersonor',
  'Inspeksi Kulit': 'Lihat kulit — ruam, lesi, warna, kelembaban',
  'Inspeksi Faring': 'Lihat tenggorokan — kemerahan, eksudat, tonsil',
  'Inspeksi Hidung/Faring': 'Lihat hidung + tenggorokan',
  'Inspeksi Konjungtiva': 'Lihat selaput mata — pucat (anemia), ikterus',
  'Inspeksi Sklera/Konjungtiva': 'Lihat putih mata + selaput mata',
  'Inspeksi Edema': 'Lihat bengkak — distribusi, simetri',
  'Inspeksi Abdomen': 'Lihat perut — distensi, asimetri, sikatriks',
  'Inspeksi Anus': 'Lihat anus — fisura, hemoroid, massa',
  'Inspeksi Genitalia': 'Lihat genitalia eksterna',
  Inspekulo: 'Pemeriksaan vagina + serviks dengan spekulum',
  Bimanual: 'Raba rahim + adneksa dengan dua tangan',
  Otoskopi: 'Lihat telinga dalam dengan otoskop — membran timpani',
  'Rinoskopi Anterior': 'Lihat rongga hidung dengan spekulum nasal',
  Funduskopi: 'Lihat retina mata dengan oftalmoskop',
  'Slit Lamp': 'Pemeriksaan mata depan dengan lampu celah',
  Visus: 'Tajam penglihatan — Snellen chart (6/6)',
  Tonometri: 'Ukur tekanan bola mata — skrining glaukoma',
  'Status Neurologis': 'Pemeriksaan saraf — kesadaran, refleks, motorik, sensorik',
  'Refleks Pupil': 'Respons pupil terhadap cahaya — langsung + konsensual',
  Nystagmus: 'Gerakan mata involunter — tanda gangguan vestibular',
  'Dix-Hallpike': 'Manuver provokasi BPPV — nystagmus posisional',
  'Tes Romberg': 'Tes keseimbangan — berdiri mata tertutup',
  'Tes Rinne/Weber': 'Tes garputala — membedakan tuli konduksi vs sensorineural',
  'ROM Sendi': 'Range of Motion — rentang gerak sendi',
  'ROM Spine': 'Range of Motion tulang belakang',
  'SLR Test': 'Straight Leg Raise — provokasi nyeri saraf sciatic (HNP)',
  'Tes Patrick/Laseque': 'Tes provokasi nyeri pinggul + saraf sciatic',
  RT: 'Rectal Touche — colok dubur',
  JVP: 'Jugular Venous Pressure — tekanan vena jugularis (gagal jantung)',
  'Tanda Homan': 'Nyeri betis saat dorsifleksi kaki — curiga DVT',
  'Tanda Meningeal': 'Kaku kuduk, Kernig, Brudzinski — curiga meningitis',
  'Tanda Peritonitis': 'Nyeri lepas, defans muskuler, perut papan',
  'Status Hidrasi': 'Turgor kulit, mukosa mulut, mata cekung',
  'BB/IMT': 'Berat Badan / Indeks Massa Tubuh',
  // Penunjang
  'Foto Thorax AP': 'Rontgen dada Anterior-Posterior',
  'Foto Sinus': 'Rontgen sinus paranasal (Waters view)',
  BNO: 'Buik Niet Overzicht — foto polos abdomen',
  'Foto Vertebra': 'Rontgen tulang belakang',
  'Foto Sendi': 'Rontgen sendi',
  'USG Abdomen': 'Ultrasonografi perut — hati, ginjal, limpa, pankreas',
  'USG Ginjal': 'Ultrasonografi ginjal + saluran kemih',
  'USG Pelvis': 'Ultrasonografi panggul — rahim, ovarium',
  'USG Transvaginal': 'USG melalui vagina — detail rahim + ovarium',
  'USG Tiroid': 'Ultrasonografi kelenjar tiroid',
  'USG Doppler Vena': 'USG aliran darah vena — deteksi DVT',
  'USG Doppler': 'USG aliran darah pembuluh darah',
  'CT-Scan Kepala': 'CT Scan otak — stroke, tumor, perdarahan',
  'CT-Scan Thorax': 'CT Scan dada — massa, infeksi, emboli paru',
  'CT-Scan Abdomen': 'CT Scan perut — massa, batu, abses',
  'CT-Scan Sinus': 'CT Scan sinus — sinusitis, polip, tumor',
  'CTA Paru': 'CT Angiografi paru — deteksi emboli paru',
  'MRI Kepala': 'MRI otak — detail jaringan lunak, tumor, MS',
  'MRI Spine': 'MRI tulang belakang — HNP, kompresi medula',
  Echocardiografi: 'USG jantung — fungsi pompa, katup, ruang jantung',
  'Holter Monitor': 'Rekam EKG 24 jam — deteksi aritmia intermiten',
  Spirometri: 'Tes fungsi paru — FEV1, FVC (asma, PPOK)',
  'Endoskopi/EGDS': 'Teropong saluran cerna atas — esofagus, lambung, duodenum',
  Kolonoskopi: 'Teropong usus besar — polip, tumor, kolitis',
  Bronkoskopi: 'Teropong saluran napas — massa, benda asing',
  Audiometri: 'Tes pendengaran — ambang dengar frekuensi',
  Timpanometri: 'Tes fungsi telinga tengah — tekanan, compliance',
  EEG: 'Elektroensefalografi — rekam aktivitas listrik otak (epilepsi)',
  'EMG/NCS': 'Elektromiografi + Nerve Conduction Study — saraf tepi',
  'Tilt Table Test': 'Tes meja miring — sinkop vasovagal',
}

function lookupMedTerm(term: string): string | null {
  if (MED_GLOSSARY[term]) return MED_GLOSSARY[term]
  // coba partial match — cari key yang ada di dalam term
  for (const [key, desc] of Object.entries(MED_GLOSSARY)) {
    if (term.includes(key)) return desc
  }
  return null
}

// ── Custom Select — replaces native <select> to fix OS white dropdown on Windows ──

type SelectOption = { value: string; label: string }

function CustomSelect({
  value,
  onChange,
  options,
  id,
}: {
  value: string
  onChange: (value: string) => void
  options: SelectOption[]
  id?: string
}) {
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)
  const selected = options.find((o) => o.value === value)

  useEffect(() => {
    if (!open) return
    function handleOutside(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener('mousedown', handleOutside)
    return () => document.removeEventListener('mousedown', handleOutside)
  }, [open])

  return (
    <div ref={ref} style={{ position: 'relative', width: '100%' }}>
      <button
        id={id}
        type="button"
        onClick={() => setOpen((o) => !o)}
        className="vitals-context-select"
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          width: '100%',
          textAlign: 'left',
        }}
        aria-haspopup="listbox"
        aria-expanded={open}
      >
        <span>{selected?.label ?? value}</span>
        <svg
          width="10"
          height="6"
          viewBox="0 0 10 6"
          fill="none"
          style={{
            flexShrink: 0,
            transform: open ? 'rotate(180deg)' : 'none',
            transition: 'transform 0.2s ease',
          }}
        >
          <path
            d="M1 1l4 4 4-4"
            stroke="currentColor"
            strokeWidth="1.5"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
      </button>
      {open && (
        <ul
          role="listbox"
          style={{
            position: 'absolute',
            top: 'calc(100% + 4px)',
            left: 0,
            right: 0,
            zIndex: 200,
            background: 'var(--surface)',
            border: '1px solid var(--border)',
            borderRadius: 'var(--radius-md)',
            padding: '4px 0',
            margin: 0,
            listStyle: 'none',
            boxShadow: 'var(--shadow-dialog)',
          }}
        >
          {options.map((opt) => (
            <li
              key={opt.value}
              role="option"
              aria-selected={opt.value === value}
              onClick={() => {
                onChange(opt.value)
                setOpen(false)
              }}
              style={{
                padding: '8px 12px',
                fontSize: 14,
                color: opt.value === value ? 'var(--primary)' : 'var(--text)',
                background: opt.value === value ? 'var(--primary-tint)' : 'transparent',
                cursor: 'pointer',
                transition: 'background 0.15s',
              }}
              onMouseEnter={(e) => {
                if (opt.value !== value)
                  (e.currentTarget as HTMLElement).style.background = 'rgba(255,255,255,0.05)'
              }}
              onMouseLeave={(e) => {
                ;(e.currentTarget as HTMLElement).style.background =
                  opt.value === value ? 'rgba(0, 33, 71, 0.08)' : 'transparent'
              }}
            >
              {opt.label}
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}

export default function EMRPage() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const {
    appointmentId: sourceAppointmentId,
    consultId: sourceConsultId,
    bridgeEntryId: sourceBridgeEntryId,
    sourceOrigin: resolvedSourceOrigin,
  } = resolveEmrSourceInput({
    appointmentId: searchParams.get('appointmentId'),
    consultId: searchParams.get('consultId'),
    bridgeEntryId: searchParams.get('bridgeEntryId'),
    sourceOrigin: searchParams.get('sourceOrigin'),
  })
  const [headerText, setHeaderText] = useState(
    'SENTRA / PUSKESMAS KEDIRI // RM-BARU // SENAUTO ENGINE: IDLE'
  )
  const [headerColor, setHeaderColor] = useState('var(--text-muted)')
  const [isTyping, setIsTyping] = useState(false)
  const [ghostVisible, setGhostVisible] = useState(true)
  const [words, setWords] = useState<string[]>([])
  const [anamnesaVisible, setAnamnesaVisible] = useState([false, false, false])
  const [showEmrLoader, setShowEmrLoader] = useState(false)
  const [historyLoaded, setHistoryLoaded] = useState(false)
  const [draftBorderColor, setDraftBorderColor] = useState('var(--text-muted)')

  const [activeScenario, setActiveScenario] = useState<string | null>(null)
  const [scanFlash, setScanFlash] = useState(false)
  const [flashingVital, setFlashingVital] = useState<string | null>(null)

  // ── Patient Context (Critical for CDSS V3.4) ──────────────────────────────
  const [patientAge, setPatientAge] = useState<number>(35)
  const [patientGender, setPatientGender] = useState<'L' | 'P'>('L')
  const [bodyWeightKg, setBodyWeightKg] = useState('')
  const [recentActivity, setRecentActivity] = useState<RecentActivity>('resting')
  const [stressState, setStressState] = useState<StressState>('calm')
  const [medicationFlags, setMedicationFlags] = useState<Set<MedicationFlag>>(new Set())
  const [isPregnant, setIsPregnant] = useState(false)
  const [activeViewPhase, setActiveViewPhase] = useState<'row1' | 'row2' | 'row3' | null>('row1')
  const [workflowTab, setWorkflowTab] = useState<WorkflowTab>('triage')
  const [manualMedicationNotes, setManualMedicationNotes] = useState<Record<string, string>>({})

  const [labOpen, setLabOpen] = useState(false)
  const [labSelected, setLabSelected] = useState([false, false, false])
  const [examOpen, setExamOpen] = useState(false)

  // ── Assist Incoming Consult Notification ──────────────────────────────────
  interface IncomingConsult {
    consultId: string
    patient: {
      name: string
      age: number
      gender: string
      rm: string
      dob?: string
      bpjsStatus?: string | null
      kelurahan?: string
    }
    keluhan_utama: string
    keluhan_tambahan?: string
    ttv: Record<string, string>
    risk_factors?: string[]
    anthropometrics?: {
      tinggi?: number
      berat?: number
      imt?: number
      hasil_imt?: string
      lingkar_perut?: number
    }
    penyakit_kronis?: string[]
    alergi?: string[]
    status_kehamilan?: 'hamil' | 'tidak_hamil' | 'tidak_diisi'
    avpu?: 'A' | 'C' | 'V' | 'P' | 'U'
    disability_type?: string
    clinical_context?: {
      facility_name?: string
      special_conditions?: string[]
      pregnancy_risk?: string
    }
    canonical_clinical?: {
      news2?: {
        score: number
        risk_level: 'low' | 'low-medium' | 'medium' | 'high'
        drivers: string[]
      }
      trajectory?: {
        overall_trend?: string
        overall_risk?: string
        deterioration_state?: string
        narrative?: string
      }
      immediate_actions?: string[]
    }
    /** MIRA's differential, when Assist had one for this encounter */
    mira_differential?: MiraDifferential
    physical_exam_context?: Record<string, string>
    visit_history?: Array<{
      encounter_id: string
      timestamp: string
      vitals: {
        sbp: number
        dbp: number
        hr: number
        rr: number
        temp: number
        glucose: number
        spo2?: number
      }
      keluhan_utama: string
      diagnosa?: { icd_x: string; nama: string } | null
    }>
    targetDoctorId?: string
    sentAt?: string
  }
  interface ConsultVisitRecord {
    consultId: string
    sentAt: string
    keluhanUtama: string
    ttv: Record<string, string>
    riskFactors: string[]
    penyakitKronis: string[]
    anthropometrics: Record<string, unknown>
  }
  interface AcceptedConsultState {
    consult: IncomingConsult
    acceptedAt: string
    visitHistory: ConsultVisitRecord[]
  }

  const [incomingConsult, setIncomingConsult] = useState<IncomingConsult | null>(null)
  const [acceptedConsult, setAcceptedConsult] = useState<AcceptedConsultState | null>(null)
  const seenConsultIds = useRef<Set<string>>(new Set())

  function handleIncomingConsult(payload: IncomingConsult) {
    if (seenConsultIds.current.has(payload.consultId)) return
    seenConsultIds.current.add(payload.consultId)
    setIncomingConsult(payload)
    try {
      new Audio('/sounds/incoming.mp3').play()
    } catch {
      /* silent */
    }
  }

  // ── Doctor Online Status (Asisten Medis) ────────────────────────────────
  const [isDoctor, setIsDoctor] = useState(false)
  const [isOnline, setIsOnline] = useState(false)

  useEffect(() => {
    void (async () => {
      try {
        const res = await fetch('/api/auth/session')
        const data = (await res.json()) as {
          user?: { profession?: string; displayName?: string }
        }
        const profession = data.user?.profession ?? ''
        if (isDoctorProfession(profession)) {
          setIsDoctor(true)
          const statusRes = await fetch('/api/telemedicine/doctor-status')
          const statusData = (await statusRes.json()) as {
            doctors?: { doctorName: string }[]
          }
          const name = data.user?.displayName ?? ''
          setIsOnline((statusData.doctors ?? []).some((d) => d.doctorName === name))
        }
      } catch {
        /* silent */
      }
    })()
  }, [])

  const row1SectionRef = useRef<HTMLElement | null>(null)
  const row2SectionRef = useRef<HTMLElement | null>(null)
  const row3SectionRef = useRef<HTMLElement | null>(null)
  const clinicalStreamRef = useRef<HTMLDivElement | null>(null)
  useFocusSpotlight(clinicalStreamRef, '.stream-section')
  const redFlagsRef = useRef<HTMLDivElement | null>(null)
  const [redFlagsInView, setRedFlagsInView] = useState(false)
  const assessmentEntryPanelRef = useRef<HTMLDivElement | null>(null)
  const finalizeAnchorRef = useRef<HTMLDivElement | null>(null)
  const reviewHandoffRef = useRef<HTMLDivElement | null>(null)
  const cdssPanelRef = useRef<HTMLDivElement | null>(null)
  const selectedDiagnosisPanelRef = useRef<HTMLDivElement | null>(null)
  const prognosisStageRef = useRef<HTMLDivElement | null>(null)
  const assessmentConclusionInputRef = useRef<HTMLInputElement | null>(null)
  const workflowScrollInitializedRef = useRef(false)
  const [row3Spotlight, setRow3Spotlight] = useState<'entry' | 'prognosis'>('entry')

  const [trajectoryActive, setTrajectoryActive] = useState(false)
  const [trajectoryOpen, setTrajectoryOpen] = useState(false)
  const [receivedVisitHistory, setReceivedVisitHistory] = useState<ScrapedVisit[]>([])
  const [encounterMeasurements, setEncounterMeasurements] = useState<CompositeVitalSnapshot[]>([])
  const [showInsight, setShowInsight] = useState(false)
  const insightTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const keluhanRef = useRef({ utama: '', tambahan: '' })
  const bridgeEntryIdRef = useRef<string | null>(null)
  const cdssRunStartedAtRef = useRef<number | null>(null)
  const latestEncounterMeasurementSignatureRef = useRef<string>('')

  const [cdssResult, setCdssResult] = useState<CDSSResult | null>(null)
  const [cdssLoading, setCdssLoading] = useState(false)
  const [cdssError, setCdssError] = useState('')
  // Set when MedBoard's own diagnosis engine is retired for MIRA; the CDSS button is then disabled.
  const [cdssRetiredMessage, setCdssRetiredMessage] = useState<string | null>(null)

  useEffect(() => {
    let cancelled = false
    void fetch('/api/cdss/diagnose')
      .then(res => (res.ok ? res.json() : null))
      .then((status: unknown) => {
        if (cancelled || typeof status !== 'object' || status === null) return
        if (!('enabled' in status) || status.enabled !== false) return
        const message = 'message' in status ? status.message : null
        setCdssRetiredMessage(typeof message === 'string' ? message : LEGACY_CDSS_RETIRED_MESSAGE)
      })
      .catch(() => undefined)
    return () => {
      cancelled = true
    }
  }, [])
  const [cdssBranchRunId, setCdssBranchRunId] = useState(0)
  const [selectedSuggestionKey, setSelectedSuggestionKey] = useState<string | null>(null)
  const [selectionSavingKey, setSelectionSavingKey] = useState<string | null>(null)
  const [selectedDiagnosisDraft, setSelectedDiagnosisDraft] = useState<CDSSSuggestion | null>(null)
  const [consideredMustNotMissKeys, setConsideredMustNotMissKeys] = useState<string[]>([])
  const [assessmentConclusion, setAssessmentConclusion] = useState('')
  const [assessmentConclusionMeta, setAssessmentConclusionMeta] = useState<{
    mode: 'idle' | 'auto' | 'edited'
    signature: string
  }>({ mode: 'idle', signature: '' })
  const [emergencyAcknowledged, setEmergencyAcknowledged] = useState(false)
  const [ackSaving, setAckSaving] = useState(false)
  const [safetyChecklist, setSafetyChecklist] = useState<Record<string, boolean>>({})
  const emergencyChecklistSignatureRef = useRef('')
  const [feedbackSaving, setFeedbackSaving] = useState(false)
  const [feedbackFinalIcd, setFeedbackFinalIcd] = useState('')
  const [reviewAcceptanceReason, setReviewAcceptanceReason] = useState('')
  const [feedbackOverrideReason, setFeedbackOverrideReason] = useState('')
  const [feedbackOutcomeConfirmed, setFeedbackOutcomeConfirmed] = useState<boolean | null>(null)
  const [feedbackFollowUpNote, setFeedbackFollowUpNote] = useState('')
  const [screeningAlerts, setScreeningAlerts] = useState<ScreeningAlert[]>([])
  const [compositeDeterioration, setCompositeDeterioration] =
    useState<CompositeDeteriorationState>(null)
  const [triageSignalContext, setTriageSignalContext] = useState<TriageSignalContext>({})
  const [structuredSignsDraft, setStructuredSignsDraft] = useState<StructuredTriageSigns>(
    createInitialStructuredSigns()
  )

  // Manual diagnosis & medication (dokter override)
  const [manualDiagnosis, setManualDiagnosis] = useState('')
  const [manualIcd10, setManualIcd10] = useState('')
  const [manualMedications, setManualMedications] = useState<ManualMedicationEntry[]>([])
  const [selectedAIMedicationKeys, setSelectedAIMedicationKeys] = useState<string[]>([])
  const [showSelectedAIMedicationsOnly, setShowSelectedAIMedicationsOnly] = useState(false)
  const [medInput, setMedInput] = useState('')
  const [activeMedicationSuggestionIndex, setActiveMedicationSuggestionIndex] = useState(0)

  // Editable vitals state
  const [vitals, setVitals] = useState({
    gcs: '',
    td: '',
    nadi: '',
    napas: '',
    suhu: '',
    spo2: '',
    map: '',
  })
  const [vitalMeta, setVitalMeta] =
    useState<Record<EmrVitalKey, VitalEntryMeta>>(createInitialVitalMeta)
  const [gulaDarah, setGulaDarah] = useState({
    nilai: '',
    tipe: 'GDS' as 'GDS' | 'GDP' | '2JPP',
  })
  const trajectoryCurrentVitals = useMemo(() => {
    if (!vitals.td) return undefined

    return {
      sbp: Number.parseInt(vitals.td.split('/')[0] ?? '', 10) || 0,
      dbp: Number.parseInt(vitals.td.split('/')[1] ?? '', 10) || 0,
      hr: Number.parseFloat(vitals.nadi) || 0,
      rr: Number.parseFloat(vitals.napas) || 0,
      temp: Number.parseFloat(vitals.suhu) || 0,
      glucose: Number.parseFloat(gulaDarah.nilai) || 0,
      spo2: Number.parseFloat(vitals.spo2) || 0,
    }
  }, [gulaDarah.nilai, vitals.nadi, vitals.napas, vitals.spo2, vitals.suhu, vitals.td])
  const trajectoryVisitHistory = useMemo(
    () => getTrajectoryHistoryWindow(receivedVisitHistory, Boolean(trajectoryCurrentVitals)),
    [receivedVisitHistory, trajectoryCurrentVitals]
  )
  const currentEncounterMeasurement = useMemo<CompositeVitalSnapshot | null>(() => {
    if (!vitals.td) return null
    const [sbpStr, dbpStr] = vitals.td.split('/')
    const snapshot = parseEncounterMeasurement({
      sbp: Number.parseInt(sbpStr ?? '', 10) || undefined,
      dbp: Number.parseInt(dbpStr ?? '', 10) || undefined,
      hr: Number.parseFloat(vitals.nadi) || undefined,
      rr: Number.parseFloat(vitals.napas) || undefined,
      temp: Number.parseFloat(vitals.suhu) || undefined,
      spo2: Number.parseFloat(vitals.spo2) || undefined,
      avpu: triageSignalContext.avpu,
      supplementalO2: triageSignalContext.supplementalO2,
      glucose: Number.parseFloat(gulaDarah.nilai) || undefined,
      capillaryRefillSec:
        normalizeStructuredSignsDraft(structuredSignsDraft).perfusionShock?.capillaryRefillSec ??
        triageSignalContext.structuredSigns?.perfusionShock?.capillaryRefillSec,
      measuredAt: new Date().toISOString(),
    })
    return snapshot
  }, [
    gulaDarah.nilai,
    triageSignalContext.avpu,
    triageSignalContext.supplementalO2,
    vitals.nadi,
    vitals.napas,
    vitals.spo2,
    vitals.suhu,
    vitals.td,
    structuredSignsDraft,
  ])

  // Editable anamnesa
  const [keluhanUtama, setKeluhanUtama] = useState('')
  const [keluhanTambahan, setKeluhanTambahan] = useState('')
  const [sttInterimPreview, setSttInterimPreview] = useState('')
  const [pemeriksaanPenunjang, setPemeriksaanPenunjang] = useState('')
  const [hasilLab, setHasilLab] = useState('')
  const [pemeriksaanFisikUsulan, setPemeriksaanFisikUsulan] = useState('')
  const [expandedPemItem, setExpandedPemItem] = useState<string | null>(null)

  // ── Audrey STT (voice dictation for keluhan utama) ──
  const audreySTT = useAudreySTT({
    onInterim: (text) => setSttInterimPreview(text),
    onTranscript: (text) => {
      if (text.trim()) {
        setKeluhanUtama((prev) => {
          const next = prev ? `${prev}. ${text}` : text
          keluhanRef.current.utama = next
          return next
        })
      }
      setSttInterimPreview('')
    },
  })

  // ── Socket.IO presence & triage transfer ──
  type OnlineUser = {
    userId: string
    name: string
    role: string
    source?: OnlineSource
  }
  const socketRef = useRef<Socket | null>(null)
  const [onlineDoctors, setOnlineDoctors] = useState<OnlineUser[]>([])
  const [selectedDoctor, setSelectedDoctor] = useState<string>('')
  const [currentUser, setCurrentUser] = useState<{
    username: string
    displayName: string
    role: string
  } | null>(null)
  const [triageReceived, setTriageReceived] = useState(false)

  const [keluhanAsli, setKeluhanAsli] = useState('') // teks asli sebelum SenAuto transform
  const [anamnesaEntities, setAnamnesaEntities] = useState({
    utama: '',
    onset: '',
    faktor: '',
  })
  const [rpsDraftState, setRpsDraftState] = useState<{
    sourceKeluhan: string
    mode: 'idle' | 'auto' | 'edited'
    stale: boolean
  }>({ sourceKeluhan: '', mode: 'idle', stale: false })

  // Autocomplete — Clinical Chain
  const [clinicalChain, setClinicalChain] = useState<{
    sifat: { formal: string[]; klinis: string[]; narasi: string[] }
    lokasi: string[]
    durasi: string[]
    logical_chain: string[]
    red_flags: string[]
    templates: string[]
    pemeriksaan: { fisik: string[]; lab: string[]; penunjang: string[] }
  } | null>(null)
  const [activeSifatTab, setActiveSifatTab] = useState<'formal' | 'klinis' | 'narasi'>('narasi')
  const [activeChainTab, setActiveChainTab] = useState<'penyerta' | 'bahaya'>('penyerta')
  const [sifatOpen, setSifatOpen] = useState(true)
  const [lokasiOpen, setLokasiOpen] = useState(true)
  const [penyertaOpen, setPenyertaOpen] = useState(true)
  const [usulanFisikOpen, setUsulanFisikOpen] = useState(true)
  const [usulanLabOpen, setUsulanLabOpen] = useState(true)
  const [usulanPenunjangOpen, setUsulanPenunjangOpen] = useState(true)
  const [autoOpenUsulanPending, setAutoOpenUsulanPending] = useState(false)
  const [medTooltip, setMedTooltip] = useState<{
    text: string
    x: number
    y: number
  } | null>(null)
  const [selectedPemeriksaan, setSelectedPemeriksaan] = useState<Set<string>>(new Set())
  const [isAutocompleteLoading, setIsAutocompleteLoading] = useState(false)
  const autocompleteTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const synthTimersRef = useRef<ReturnType<typeof setTimeout>[]>([])
  const synthRunIdRef = useRef(0)
  const pendingSynthResultRef = useRef<ReturnType<typeof generateNarrative> | null>(null)

  // Editable exam
  const [exam, setExam] = useState<ExamState>({
    kepala: '',
    dada: '',
    perut: '',
    ekstremitas: '',
    kulit: '',
    genitalia: '',
  })
  const [examAutofillKeys, setExamAutofillKeys] = useState<Array<keyof ExamState>>([])
  const examAutofillTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  // Riwayat penyakit & alergi
  const [riwayat, setRiwayat] = useState({ rps: '', rpk: '' })
  const [rpdSelected, setRpdSelected] = useState<Set<string>>(new Set())
  const [alergiSelected, setAlergiSelected] = useState<Set<string>>(new Set())
  const cdssSessionIdRef = useRef(
    `cdss-${globalThis.crypto?.randomUUID?.() ?? `${Date.now()}-${Math.random().toString(36).slice(2, 10)}`}`
  )

  // ── Inject Assist consult data ke form Pengkajian Awal → pindah ke tab Anamnesa ──
  function injectAssistConsultToTriage(consult: IncomingConsult, history: ConsultVisitRecord[]) {
    const ttv = consult.ttv ?? {}
    const sbp = ttv.sbp ?? ''
    const dbp = ttv.dbp ?? ''

    setVitals({
      gcs: '',
      td: sbp && dbp ? `${sbp}/${dbp}` : (sbp ?? ''),
      nadi: ttv.hr ?? '',
      napas: ttv.rr ?? '',
      suhu: ttv.temp ?? '',
      spo2: ttv.spo2 ?? '',
      map: '',
    })

    if (ttv.glucose) setGulaDarah({ nilai: ttv.glucose, tipe: 'GDS' })

    if (consult.patient.age) setPatientAge(consult.patient.age)
    if (consult.patient.gender) {
      const g = consult.patient.gender.toUpperCase()
      setPatientGender(g === 'L' || g.startsWith('LAKI') ? 'L' : 'P')
    }
    if (consult.anthropometrics?.berat) setBodyWeightKg(String(consult.anthropometrics.berat))
    if (consult.keluhan_utama) setKeluhanUtama(consult.keluhan_utama)
    if (consult.keluhan_tambahan) setKeluhanTambahan(consult.keluhan_tambahan)

    if ((consult.penyakit_kronis ?? []).length > 0) {
      setRpdSelected((prev) => new Set([...prev, ...(consult.penyakit_kronis ?? [])]))
    }
    if ((consult.alergi ?? []).length > 0) {
      setAlergiSelected((prev) => new Set([...prev, ...(consult.alergi ?? [])]))
    }
    if (consult.status_kehamilan === 'hamil') setIsPregnant(true)

    if (consult.avpu) {
      setTriageSignalContext((prev) => ({
        ...prev,
        avpu: consult.avpu as 'A' | 'C' | 'V' | 'P' | 'U',
      }))
    }

    // Prioritas 1: visit_history dari payload Assist (data ePuskesmas lengkap + ICD)
    // Prioritas 2: ConsultLog history (fallback — TTV saja, no ICD)
    const payloadHistory = consult.visit_history ?? []
    if (payloadHistory.length > 0) {
      const scraped: ScrapedVisit[] = payloadHistory.map((v) => ({
        encounter_id: v.encounter_id,
        date: v.timestamp,
        vitals: {
          sbp: v.vitals.sbp,
          dbp: v.vitals.dbp,
          hr: v.vitals.hr,
          rr: v.vitals.rr,
          temp: v.vitals.temp,
          glucose: v.vitals.glucose,
          spo2: v.vitals.spo2 ?? 0,
        },
        keluhan_utama: v.keluhan_utama,
        diagnosa: v.diagnosa ?? null,
      }))
      setReceivedVisitHistory(scraped)
    } else if (history.length > 0) {
      // Fallback ke ConsultLog history (no ICD, tapi tetap ada TTV historis)
      const scraped: ScrapedVisit[] = history.map((v) => ({
        encounter_id: v.consultId,
        date: v.sentAt,
        vitals: {
          sbp: Number(v.ttv.sbp) || 0,
          dbp: Number(v.ttv.dbp) || 0,
          hr: Number(v.ttv.hr) || 0,
          rr: Number(v.ttv.rr) || 0,
          temp: Number(v.ttv.temp) || 0,
          glucose: Number(v.ttv.glucose) || 0,
          spo2: Number(v.ttv.spo2) || 0,
        },
        keluhan_utama: v.keluhanUtama,
        diagnosa: null,
      }))
      setReceivedVisitHistory(scraped)
    }

    setTriageReceived(true)
    setWorkflowTab('review')
  }

  // ── Bridge to ePuskesmas state ──
  const [bridgeStatus, setBridgeStatus] = useState<EmrBridgeStatus>('idle')
  const [bridgeEntryId, setBridgeEntryId] = useState<string | null>(null)
  const [bridgeError, setBridgeError] = useState('')
  useEffect(() => {
    bridgeEntryIdRef.current = bridgeEntryId
  }, [bridgeEntryId])
  useEffect(() => {
    if (sourceBridgeEntryId && !bridgeEntryId) {
      bridgeEntryIdRef.current = sourceBridgeEntryId
      setBridgeEntryId(sourceBridgeEntryId)
      setBridgeStatus((current) => (current === 'idle' ? 'pending' : current))
    }
  }, [bridgeEntryId, sourceBridgeEntryId])
  useEffect(() => {
    if (!sourceBridgeEntryId) return

    let cancelled = false

    const syncBridgeEntry = async () => {
      try {
        const res = await fetch(`/api/emr/bridge/${encodeURIComponent(sourceBridgeEntryId)}`, {
          credentials: 'same-origin',
        })
        const data = (await res.json()) as {
          ok?: boolean
          entry?: {
            id?: string
            status?: 'pending' | 'claimed' | 'processing' | 'completed' | 'failed' | 'expired'
            error?: string
          }
          error?: string
        }
        if (cancelled) return

        if (res.ok && data.ok && data.entry?.id) {
          setBridgeEntryId(data.entry.id)
          setBridgeStatus(mapBridgeQueueStatusToEmrStatus(data.entry.status))
          setBridgeError(data.entry.error ?? '')
          return
        }

        if (res.status === 404) {
          setBridgeStatus('failed')
          setBridgeError(
            data.error?.trim() || 'Entry bridge tidak ditemukan atau sudah tidak valid.'
          )
          return
        }

        setBridgeError(
          data.error?.trim() || 'Status bridge belum bisa dimuat. Coba refresh halaman.'
        )
      } catch {
        if (cancelled) return
        setBridgeError('Status bridge belum bisa dimuat. Coba refresh halaman.')
      }
    }

    void syncBridgeEntry()

    return () => {
      cancelled = true
    }
  }, [sourceBridgeEntryId])

  const RPD_OPTIONS = [
    'Hipertensi',
    'Diabetes Mellitus Tipe 2',
    'Tuberkulosis Paru',
    'Asma Bronkial',
    'Gastritis / GERD',
    'Stroke',
    'Penyakit Jantung Koroner',
    'Gagal Ginjal Kronis',
    'Hepatitis B',
    'Dislipidemia',
  ]
  const ALERGI_OPTIONS = [
    'Penisilin / Antibiotik',
    'Seafood / Kacang',
    'Debu / Serbuk Sari',
    'NSAID / Aspirin',
  ]

  function inferRpdFromMedicalHistory(value: unknown): string[] {
    if (!Array.isArray(value)) return []

    const text = value
      .map((item) => {
        if (typeof item === 'string') return item
        if (item && typeof item === 'object') {
          const record = item as Record<string, unknown>
          return String(record.name ?? record.label ?? record.condition ?? '')
        }
        return ''
      })
      .join(' ')
      .toLowerCase()

    const inferred: string[] = []
    if (/hipertensi|ht\b|darah tinggi/.test(text)) inferred.push('Hipertensi')
    if (/diabetes|dm\b|kencing manis/.test(text)) inferred.push('Diabetes Mellitus Tipe 2')
    if (/tuberkulosis|tb\b/.test(text)) inferred.push('Tuberkulosis Paru')
    if (/asma/.test(text)) inferred.push('Asma Bronkial')
    if (/gerd|gastritis/.test(text)) inferred.push('Gastritis / GERD')
    if (/stroke/.test(text)) inferred.push('Stroke')
    if (/jantung koroner|cad|penyakit jantung/.test(text)) inferred.push('Penyakit Jantung Koroner')
    if (/gagal ginjal|ckd|ginjal kronis/.test(text)) inferred.push('Gagal Ginjal Kronis')
    if (/hepatitis b/.test(text)) inferred.push('Hepatitis B')
    if (/dislipidemia|kolesterol/.test(text)) inferred.push('Dislipidemia')
    return inferred.filter((option) => RPD_OPTIONS.includes(option))
  }

  function updateStructuredBoolean<
    TSection extends StructuredSignSection,
    TKey extends keyof NonNullable<StructuredTriageSigns[TSection]>,
  >(section: TSection, key: TKey, checked: boolean) {
    setStructuredSignsDraft((prev) => ({
      ...prev,
      [section]: {
        ...(prev[section] ?? {}),
        [key]: checked,
      },
    }))
  }

  function updateStructuredCapillaryRefill(value: string) {
    const cleaned = value.replace(/[^0-9.]/g, '')
    setStructuredSignsDraft((prev) => ({
      ...prev,
      perfusionShock: {
        ...(prev.perfusionShock ?? {}),
        capillaryRefillSec: cleaned ? Number.parseFloat(cleaned) : undefined,
      },
    }))
  }

  function renderStructuredSection<TSection extends StructuredSignSection>(
    sectionKey: TSection,
    sectionLabel: string,
    items: readonly {
      key: keyof NonNullable<StructuredTriageSigns[TSection]>
      label: string
    }[]
  ) {
    const sectionState = (structuredSignsDraft[sectionKey] ?? {}) as Record<
      string,
      boolean | number | undefined
    >

    return (
      <div
        key={sectionKey}
        style={{
          border: '1px solid var(--border)',
          background: 'var(--surface-subtle)',
          borderRadius: 'var(--radius-md)',
          padding: '12px 16px',
        }}
      >
        <div
          style={{
            fontSize: 14,
            fontWeight: 500,
            color: 'var(--text)',
            marginBottom: 8,
          }}
        >
          {sectionLabel}
        </div>
        <div style={{ display: 'grid', gap: 7 }}>
          {items.map(({ key, label }) => (
            <label
              key={String(key)}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 8,
                fontSize: 12,
                color: 'var(--text)',
                cursor: 'pointer',
              }}
            >
              <input
                type="checkbox"
                checked={Boolean(sectionState[String(key)])}
                onChange={(e) => updateStructuredBoolean(sectionKey, key, e.target.checked)}
              />
              <span>{label}</span>
            </label>
          ))}
          {sectionKey === 'perfusionShock' && (
            <label
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 8,
                fontSize: 12,
                color: 'var(--text)',
                marginTop: 4,
              }}
            >
              <span style={{ minWidth: 98 }}>CRT (detik)</span>
              <input
                type="text"
                value={structuredSignsDraft.perfusionShock?.capillaryRefillSec ?? ''}
                onChange={(e) => updateStructuredCapillaryRefill(e.target.value)}
                placeholder="opsional"
                className="ui-input"
                style={{ width: 90, height: 32 }}
              />
            </label>
          )}
        </div>
      </div>
    )
  }

  function buildStructuredSignsPayload(): StructuredTriageSigns {
    const complaintText = `${keluhanUtama} ${keluhanTambahan}`.toLowerCase()
    const rr = Number.parseFloat(vitals.napas) || 0
    const spo2 = Number.parseFloat(vitals.spo2) || 0
    const glucose = Number.parseFloat(gulaDarah.nilai) || 0
    const source = normalizeStructuredSignsDraft(structuredSignsDraft)

    return {
      respiratoryDistress: {
        accessoryMuscleUse:
          source.respiratoryDistress?.accessoryMuscleUse ??
          triageSignalContext.structuredSigns?.respiratoryDistress?.accessoryMuscleUse ??
          /otot bantu|aksesori/i.test(complaintText),
        retractions:
          source.respiratoryDistress?.retractions ??
          triageSignalContext.structuredSigns?.respiratoryDistress?.retractions ??
          /retraksi/i.test(complaintText),
        unableToSpeakFullSentences:
          source.respiratoryDistress?.unableToSpeakFullSentences ??
          triageSignalContext.structuredSigns?.respiratoryDistress?.unableToSpeakFullSentences ??
          /tidak bisa bicara|kalimat pendek|sepatah/i.test(complaintText),
        cyanosis:
          source.respiratoryDistress?.cyanosis ??
          triageSignalContext.structuredSigns?.respiratoryDistress?.cyanosis ??
          /sianosis|kebiruan/i.test(complaintText),
        distressObserved:
          source.respiratoryDistress?.distressObserved ??
          triageSignalContext.structuredSigns?.respiratoryDistress?.distressObserved ??
          (hasRespiratoryComplaint(keluhanUtama) && (rr > 22 || (spo2 > 0 && spo2 < 94))),
      },
      hmod: {
        chest_pain:
          source.hmod?.chest_pain ??
          triageSignalContext.structuredSigns?.hmod?.chest_pain ??
          /nyeri dada|chest pain|angina/i.test(complaintText),
        pulmonary_edema:
          source.hmod?.pulmonary_edema ??
          triageSignalContext.structuredSigns?.hmod?.pulmonary_edema ??
          /edema paru|orthopnea|pink frothy|sesak berat/i.test(complaintText),
        neurological_deficit:
          source.hmod?.neurological_deficit ??
          triageSignalContext.structuredSigns?.hmod?.neurological_deficit ??
          /pelo|hemiparesis|stroke|defisit neurologis/i.test(complaintText),
        vision_changes:
          source.hmod?.vision_changes ??
          triageSignalContext.structuredSigns?.hmod?.vision_changes ??
          /pandangan kabur|mata berkunang|visus/i.test(complaintText),
        severe_headache:
          source.hmod?.severe_headache ??
          triageSignalContext.structuredSigns?.hmod?.severe_headache ??
          /sakit kepala hebat|nyeri kepala hebat/i.test(complaintText),
        oliguria: source.hmod?.oliguria ?? triageSignalContext.structuredSigns?.hmod?.oliguria,
        altered_mental_status:
          source.hmod?.altered_mental_status ??
          triageSignalContext.structuredSigns?.hmod?.altered_mental_status ??
          (Number.parseFloat(vitals.gcs) || 15) < 15,
      },
      dkaHhs: {
        kussmaul_breathing:
          source.dkaHhs?.kussmaul_breathing ??
          triageSignalContext.structuredSigns?.dkaHhs?.kussmaul_breathing ??
          /kussmaul|napas dalam cepat/i.test(complaintText),
        acetone_breath:
          source.dkaHhs?.acetone_breath ??
          triageSignalContext.structuredSigns?.dkaHhs?.acetone_breath ??
          /aseton|bau buah/i.test(complaintText),
        nausea_vomiting:
          source.dkaHhs?.nausea_vomiting ??
          triageSignalContext.structuredSigns?.dkaHhs?.nausea_vomiting ??
          /mual|muntah/i.test(complaintText),
        abdominal_pain:
          source.dkaHhs?.abdominal_pain ??
          triageSignalContext.structuredSigns?.dkaHhs?.abdominal_pain ??
          /nyeri perut|abdominal pain/i.test(complaintText),
        altered_mental_status:
          source.dkaHhs?.altered_mental_status ??
          triageSignalContext.structuredSigns?.dkaHhs?.altered_mental_status ??
          (Number.parseFloat(vitals.gcs) || 15) < 15,
        severe_dehydration:
          source.dkaHhs?.severe_dehydration ??
          triageSignalContext.structuredSigns?.dkaHhs?.severe_dehydration ??
          /dehidrasi|sangat haus|mulut kering/i.test(complaintText),
        extreme_hyperglycemia:
          source.dkaHhs?.extreme_hyperglycemia ??
          triageSignalContext.structuredSigns?.dkaHhs?.extreme_hyperglycemia ??
          glucose >= 600,
        seizures:
          source.dkaHhs?.seizures ??
          triageSignalContext.structuredSigns?.dkaHhs?.seizures ??
          /kejang|seizure/i.test(complaintText),
      },
      perfusionShock: {
        dizziness:
          source.perfusionShock?.dizziness ??
          triageSignalContext.structuredSigns?.perfusionShock?.dizziness ??
          /pusing|melayang|dizziness/i.test(complaintText),
        presyncope:
          source.perfusionShock?.presyncope ??
          triageSignalContext.structuredSigns?.perfusionShock?.presyncope ??
          /mau pingsan|presinkop/i.test(complaintText),
        syncope:
          source.perfusionShock?.syncope ??
          triageSignalContext.structuredSigns?.perfusionShock?.syncope ??
          /pingsan|sinkop/i.test(complaintText),
        weakness:
          source.perfusionShock?.weakness ??
          triageSignalContext.structuredSigns?.perfusionShock?.weakness ??
          /lemas|weakness|malaise/i.test(complaintText),
        clammySkin:
          source.perfusionShock?.clammySkin ??
          triageSignalContext.structuredSigns?.perfusionShock?.clammySkin ??
          /keringat dingin|clammy/i.test(complaintText),
        coldExtremities:
          source.perfusionShock?.coldExtremities ??
          triageSignalContext.structuredSigns?.perfusionShock?.coldExtremities ??
          /ekstremitas dingin|tangan dingin|kaki dingin/i.test(complaintText),
        oliguria:
          source.perfusionShock?.oliguria ??
          triageSignalContext.structuredSigns?.perfusionShock?.oliguria,
        capillaryRefillSec:
          source.perfusionShock?.capillaryRefillSec ??
          triageSignalContext.structuredSigns?.perfusionShock?.capillaryRefillSec,
      },
    }
  }

  function buildRealtimeAlertPayload(): Record<string, unknown> {
    const structuredSigns = buildStructuredSignsPayload()
    return {
      keluhanUtama,
      keluhanTambahan,
      vitals,
      gulaDarah,
      patientAge,
      patientGender,
      medicalHistory: Array.from(rpdSelected),
      visitHistory: receivedVisitHistory,
      triageContext: {
        ...triageSignalContext,
        structuredSigns,
      },
      encounterBaseline:
        encounterMeasurements.length > 0
          ? {
              computedAt: new Date().toISOString(),
              windowMinutes: ENCOUNTER_BASELINE_WINDOW_MINUTES,
              measurements: encounterMeasurements,
            }
          : undefined,
      structuredSigns,
      isPregnant: patientGender === 'P' ? isPregnant : false,
    }
  }

  function toggleRpd(val: string) {
    setRpdSelected((prev) => {
      const s = new Set(prev)
      s.has(val) ? s.delete(val) : s.add(val)
      return s
    })
  }
  function toggleAlergi(val: string) {
    setAlergiSelected((prev) => {
      const s = new Set(prev)
      s.has(val) ? s.delete(val) : s.add(val)
      return s
    })
  }
  // ── Bridge: send encounter to ePuskesmas ──
  async function sendToEpuskesmas() {
    if (isBridgeActionLocked(bridgeStatus)) return
    if (!keluhanUtama.trim()) {
      setBridgeError('Keluhan utama wajib diisi.')
      return
    }
    setBridgeStatus('sending')
    setBridgeError('')
    try {
      const encounterData: DashboardEncounterData = {
        pelayananId: `pel-${Date.now()}`,
        patientName: undefined,
        keluhanUtama,
        keluhanTambahan,
        vitals,
        gulaDarah,
        isPregnant,
        riwayat,
        rpdSelected: Array.from(rpdSelected),
        alergiSelected: Array.from(alergiSelected),
        bodyWeightKg,
        diagnosa: selectedDiagnosisDraft
          ? {
              icdCode: selectedDiagnosisDraft.icd10_code || '',
              icdName: selectedDiagnosisDraft.diagnosis_name || '',
              jenis: 'PRIMER',
              kasus: 'BARU',
            }
          : undefined,
        prognosa: 'Baik',
        dokterNama: 'dr. Ferdi Iskandar',
        perawatNama: 'Joseph Arianto',
      }
      const payload = mapDashboardToTransferPayload(encounterData)
      const res = await fetch('/api/emr/bridge', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          pelayananId: encounterData.pelayananId,
          patientName: encounterData.patientName,
          payload,
        }),
      })
      const data = await res.json()
      if (data.ok) {
        bridgeEntryIdRef.current = data.entry.id
        setBridgeEntryId(data.entry.id)
        setBridgeStatus('pending')
      } else {
        setBridgeError(data.error || 'Gagal mengirim.')
        setBridgeStatus('failed')
      }
    } catch (err) {
      setBridgeError(err instanceof Error ? err.message : 'Network error')
      setBridgeStatus('failed')
    }
  }

  // ── Generate Clinical Report ──
  const [generatingReport, setGeneratingReport] = useState(false)

  async function generateClinicalReport() {
    setGeneratingReport(true)
    try {
      // Parse TD
      const tdParts = vitals.td.split('/')
      const tdSistolik = tdParts[0]?.trim() || ''
      const tdDiastolik = tdParts[1]?.trim() || ''

      // Format exam fields
      const examParts: string[] = []
      if (exam.kepala) examParts.push(`Kepala: ${exam.kepala}`)
      if (exam.dada) examParts.push(`Dada: ${exam.dada}`)
      if (exam.perut) examParts.push(`Perut: ${exam.perut}`)
      if (exam.ekstremitas) examParts.push(`Ekstremitas: ${exam.ekstremitas}`)
      if (exam.kulit) examParts.push(`Kulit: ${exam.kulit}`)
      if (exam.genitalia) examParts.push(`Genitalia: ${exam.genitalia}`)

      // Format medications from therapy plan
      const terapiLines: string[] = []
      const slotConfig = [
        { key: 'utama', label: 'R/ 1. OBAT UTAMA' },
        { key: 'adjuvant', label: 'R/ 2. OBAT ADJUVANT' },
        { key: 'vitamin', label: 'R/ 3. VITAMIN' },
      ] as const
      slotConfig.forEach(({ key, label }) => {
        const slotMeds = selectedFinalizationMedications.filter((m) => m.prescriptionSlot === key)
        if (slotMeds.length === 0) return
        terapiLines.push(`${label}:`)
        slotMeds.forEach((m) => {
          const medicationKey = getFinalizationMedicationKey(m)
          const note = manualMedicationNotes[medicationKey]?.trim()
          terapiLines.push(
            `   ${m.name} ${m.dose} ${m.frequency} (${m.route || 'oral'})${note ? ` — Catatan: ${note}` : ''}`
          )
        })
      })

      // Derive kesadaran from GCS
      const gcsNum = Number.parseInt(vitals.gcs) || 15
      const kesadaran =
        gcsNum >= 14
          ? 'Compos Mentis'
          : gcsNum >= 12
            ? 'Apatis'
            : gcsNum >= 9
              ? 'Somnolen'
              : gcsNum >= 6
                ? 'Sopor'
                : 'Koma'

      // Derive prognosis from care mode
      const careLabel = finalizationTherapyPlan.careMode.label.toLowerCase()
      const prognosis = careLabel.includes('rujuk')
        ? 'Dubia ad malam'
        : careLabel.includes('inap')
          ? 'Dubia ad bonam'
          : 'Bonam'
      const generatedAt = new Date()
      const payload = {
        sourceRefs: {
          appointmentId: sourceAppointmentId || undefined,
          consultId: sourceConsultId || undefined,
          origin: resolvedSourceOrigin,
          actorUserId: currentUser?.username || '',
          actorName: currentUser?.displayName || '',
        },
        auditTrail: {
          phase: 'emr-finalize',
          trialMode: true,
          savedForAudit: true,
          generatedAt: generatedAt.toISOString(),
          sourceAppointmentId,
          sourceConsultId,
          bridgeEntryId: bridgeEntryId || sourceBridgeEntryId || null,
          sourceOrigin: resolvedSourceOrigin,
          diagnosisSource: finalizationTherapyPlan.sourceLabel,
          careMode: finalizationTherapyPlan.careMode.label,
          referralDiagnoses: finalizationTherapyPlan.referralDiagnoses,
          aiMedicationRecommendations: finalizationTherapyPlan.medications.map((item) => {
            const medicationKey = getFinalizationMedicationKey(item)
            return {
              key: medicationKey,
              name: item.name,
              slot: item.prescriptionSlot,
              dose: item.dose,
              frequency: item.frequency,
              route: item.route,
              selected: selectedAIMedicationKeys.includes(medicationKey),
              doctorNote: manualMedicationNotes[medicationKey] ?? '',
            }
          }),
          selectedAIMedications: selectedFinalizationMedications.map((item) => {
            const medicationKey = getFinalizationMedicationKey(item)
            return {
              key: medicationKey,
              name: item.name,
              slot: item.prescriptionSlot,
              dose: item.dose,
              frequency: item.frequency,
              route: item.route,
              doctorNote: manualMedicationNotes[medicationKey] ?? '',
            }
          }),
          manualMedicationEntries: manualMedications.map((entry) => ({
            name: entry.name,
            dose: entry.dose,
            frequency: entry.frequency,
            route: entry.route,
            source: entry.source,
          })),
        },
        pasien: {
          umur: `${patientAge} tahun`,
          jenisKelamin: patientGender,
          alamat: '',
        },
        anamnesa: {
          keluhanUtama,
          rps: riwayat.rps,
          rpd: Array.from(rpdSelected).join(', ') || '-',
          rpk: riwayat.rpk || '-',
          alergi: Array.from(alergiSelected).join(', ') || 'NKDA',
        },
        pemeriksaanFisik: {
          tdSistolik,
          tdDiastolik,
          nadi: vitals.nadi,
          suhu: vitals.suhu,
          napas: vitals.napas,
          spo2: vitals.spo2,
          bb: bodyWeightKg,
          tb: '',
          keadaanUmum: 'Baik',
          kesadaran,
          pemeriksaanLain: examParts.join('\n') || '-',
        },
        asesmen: {
          diagnosisKerja: manualDiagnosis || selectedDiagnosisDraft?.diagnosis_name || '',
          icd10: manualIcd10 || selectedDiagnosisDraft?.icd10_code || '',
          diagnosisBanding: '',
          prognosis,
        },
        tataLaksana: {
          terapi:
            [
              ...terapiLines,
              ...manualMedications.map((entry) => `R/ ${formatManualMedicationInline(entry)}`),
            ].join('\n') || '-',
          tindakan: finalizationTherapyPlan.immediateActions.join('\n') || '-',
          edukasi: finalizationTherapyPlan.supportive.join('\n') || '-',
          tindakLanjut:
            [
              ...finalizationTherapyPlan.monitoring,
              `Diagnosis rujukan prioritas: ${finalizationTherapyPlan.referralDiagnoses.join('; ')}`,
            ].join('\n') || '-',
        },
        penutup: {
          dokter: 'dr. Ferdi Iskandar',
          perawat: 'Joseph Arianto',
          tanggalPemeriksaan: generatedAt.toISOString().slice(0, 10),
          jamPemeriksaan: generatedAt.toLocaleTimeString('id-ID', {
            hour: '2-digit',
            minute: '2-digit',
          }),
        },
      }

      const res = await fetch('/api/report/clinical', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      })
      const data = (await res.json()) as {
        ok: boolean
        report: { id: string }
      }
      if (data.ok) {
        router.push(`/report/clinical?id=${data.report.id}`)
      }
    } catch {
      /* ignore */
    } finally {
      setGeneratingReport(false)
    }
  }

  function toggleMedicationFlag(flag: MedicationFlag) {
    setMedicationFlags((prev) => {
      const next = new Set(prev)
      if (next.has(flag)) next.delete(flag)
      else next.add(flag)
      return next
    })
  }

  function buildSafetyChecklistForEmergencyFlags(
    emergencyFlags: ReadonlyArray<{ action?: string; condition?: string; title?: string }>
  ): Record<string, boolean> {
    const checklistItems: Record<string, boolean> = {}
    emergencyFlags.slice(0, 3).forEach((flag) => {
      const item = flag.action ?? flag.condition ?? flag.title
      if (item) checklistItems[item] = false
    })
    return checklistItems
  }

  function allSafetyChecklistChecked(): boolean {
    const values = Object.values(safetyChecklist)
    if (values.length === 0) return true
    return values.every(Boolean)
  }

  async function acknowledgeEmergencyProtocol() {
    if (!allSafetyChecklistChecked()) return
    const emergencyFlags = cdssResult?.red_flags.filter((rf) => rf.severity === 'emergency') ?? []
    if (emergencyFlags.length === 0) {
      setEmergencyAcknowledged(true)
      return
    }

    setAckSaving(true)
    try {
      const response = await fetch('/api/cdss/red-flag-ack', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          session_id: cdssSessionIdRef.current,
          red_flags: emergencyFlags.map((rf) => rf.condition),
        }),
      })
      if (!response.ok) throw new Error(`HTTP ${response.status}`)
      setEmergencyAcknowledged(true)
    } catch (error) {
      console.error('[CDSS Red Flag Ack]', error)
    } finally {
      setAckSaving(false)
    }
  }

  function handleMedContext(e: React.MouseEvent, term: string) {
    e.preventDefault()
    e.stopPropagation()
    const desc = lookupMedTerm(term)
    if (desc) {
      setMedTooltip({ text: `${term}: ${desc}`, x: e.clientX, y: e.clientY })
    } else {
      setMedTooltip({ text: term, x: e.clientX, y: e.clientY })
    }
  }

  // Dismiss tooltip on click anywhere (delayed to avoid immediate self-dismiss)
  useEffect(() => {
    if (!medTooltip) return
    const dismiss = () => setMedTooltip(null)
    const timer = setTimeout(() => {
      window.addEventListener('click', dismiss)
      window.addEventListener('contextmenu', dismiss)
    }, 50)
    return () => {
      clearTimeout(timer)
      window.removeEventListener('click', dismiss)
      window.removeEventListener('contextmenu', dismiss)
    }
  }, [medTooltip])

  // ── Socket.IO: fetch session, connect, presence, triage relay ──
  useEffect(() => {
    let mounted = true
    ;(async () => {
      try {
        const res = await fetch('/api/auth/session', { cache: 'no-store' })
        if (!res.ok || !mounted) return
        const json = await res.json()
        const u = json.user as {
          username: string
          displayName: string
          role: string
        }
        setCurrentUser(u)

        // Track EMR Clinical usage
        void fetch('/api/track-usage', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ type: 'emr-clinical' }),
        }).catch(() => {
          // Silent fail
        })

        const { io: socketIO } = await import('socket.io-client')
        const socket = socketIO({ transports: ['websocket'] })
        socketRef.current = socket

        socket.on('connect', () => {
          socket.emit('user:join', {
            userId: u.username,
            name: u.displayName,
            role: u.role,
          })
        })

        socket.on('users:online', (users: OnlineUser[]) => {
          if (!mounted) return
          setOnlineDoctors(
            users.filter(
              (x) =>
                (x.role === 'DOCTOR' || x.role === 'DOKTER') &&
                x.userId !== u.username &&
                canReceiveTriage(x)
            )
          )
        })

        // Bridge progress events from Assist → ePuskesmas
        socket.on(
          'emr:progress',
          (event: { transferId: string; step: string; status: string; message: string }) => {
            if (!mounted) return
            if (bridgeEntryIdRef.current && event.transferId === bridgeEntryIdRef.current) {
              if (event.status === 'success') setBridgeStatus('completed')
              else if (event.status === 'failed') {
                setBridgeStatus('failed')
                setBridgeError(event.message)
              } else if (event.step === 'init' && event.status === 'running')
                setBridgeStatus('claimed')
              else setBridgeStatus('processing')
            }
          }
        )

        // Assist consult incoming — notifikasi langsung di EMR
        socket.on('assist:consult', (payload: IncomingConsult) => {
          if (!mounted) return
          handleIncomingConsult(payload)
        })

        // DB fallback polling — every 15s jika socket miss
        const pollAssistConsult = async () => {
          try {
            const res = await fetch('/api/consult/pending')
            const data = (await res.json()) as { ok: boolean; consults?: IncomingConsult[] }
            if (data.ok && data.consults?.length) {
              for (const c of data.consults) handleIncomingConsult(c)
            }
          } catch {
            /* silent */
          }
        }
        void pollAssistConsult()
        const pollInterval = setInterval(() => {
          void pollAssistConsult()
        }, 15_000)
        // cleanup stored in outer scope via mounted flag
        void (async () => {
          await new Promise<void>((resolve) => {
            const checkUnmount = setInterval(() => {
              if (!mounted) {
                clearInterval(pollInterval)
                clearInterval(checkUnmount)
                resolve()
              }
            }, 1000)
          })
        })()

        // Doctor receives triage data from nurse
        socket.on('emr:triage-receive', (data: Record<string, unknown>) => {
          if (!mounted) return
          if (data.keluhanUtama) setKeluhanUtama(data.keluhanUtama as string)
          if (data.keluhanTambahan) setKeluhanTambahan(data.keluhanTambahan as string)
          if (data.vitals) setVitals(data.vitals as typeof vitals)
          if (data.gulaDarah) setGulaDarah(data.gulaDarah as typeof gulaDarah)
          if (data.patientAge) setPatientAge(data.patientAge as number)
          if (data.patientGender) setPatientGender(data.patientGender as 'L' | 'P')
          const nextTriageContext = extractTriageSignalContext(data)
          setTriageSignalContext(nextTriageContext)
          setStructuredSignsDraft(normalizeStructuredSignsDraft(nextTriageContext.structuredSigns))
          if (nextTriageContext.isPregnant !== undefined) {
            setIsPregnant(Boolean(nextTriageContext.isPregnant))
          }
          const inferredRpd = inferRpdFromMedicalHistory(data.medicalHistory)
          if (inferredRpd.length > 0) {
            setRpdSelected((prev) => new Set([...prev, ...inferredRpd]))
          }
          if (Array.isArray(data.screeningAlerts)) {
            setScreeningAlerts(data.screeningAlerts as ScreeningAlert[])
          }
          if (data.compositeDeterioration && typeof data.compositeDeterioration === 'object') {
            setCompositeDeterioration(
              data.compositeDeterioration as SharedCompositeDeteriorationResult
            )
          }
          const incomingMeasurements = trimEncounterMeasurements(
            normalizeEncounterMeasurements(
              readObjectRecord(data.encounterBaseline).measurements ?? data.encounterMeasurements
            )
          )
          setEncounterMeasurements(incomingMeasurements)
          latestEncounterMeasurementSignatureRef.current =
            incomingMeasurements.length > 0
              ? buildEncounterMeasurementSignature(
                  incomingMeasurements[incomingMeasurements.length - 1]
                )
              : ''
          setReceivedVisitHistory(normalizeScrapedVisitHistory(data.visitHistory))
          setTriageReceived(true)
          setWorkflowTab('review')
          // Play notification sound
          try {
            new Audio('/sounds/notif.mp3').play()
          } catch {
            /* silent */
          }
        })
      } catch {
        /* no session */
      }
    })()
    return () => {
      mounted = false
      socketRef.current?.disconnect()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // Auto-resize pemeriksaan textareas when values change programmatically (via item click)
  useEffect(() => {
    for (const id of ['pemeriksaan-fisik-usulan', 'hasil-lab', 'pemeriksaan-penunjang']) {
      const el = document.getElementById(id) as HTMLTextAreaElement | null
      if (el) {
        el.style.height = 'auto'
        el.style.height = el.scrollHeight + 'px'
      }
    }
  }, [pemeriksaanFisikUsulan, hasilLab, pemeriksaanPenunjang])

  useEffect(() => {
    if (!autoOpenUsulanPending || !clinicalChain?.pemeriksaan) return

    const hasUsulanItems =
      clinicalChain.pemeriksaan.fisik.length > 0 ||
      clinicalChain.pemeriksaan.lab.length > 0 ||
      clinicalChain.pemeriksaan.penunjang.length > 0

    if (!hasUsulanItems) return

    const timer = setTimeout(() => {
      setUsulanFisikOpen(clinicalChain.pemeriksaan.fisik.length > 0)
      setUsulanLabOpen(clinicalChain.pemeriksaan.lab.length > 0)
      setUsulanPenunjangOpen(clinicalChain.pemeriksaan.penunjang.length > 0)
      setAutoOpenUsulanPending(false)
    }, 620)

    return () => clearTimeout(timer)
  }, [autoOpenUsulanPending, clinicalChain])

  useEffect(() => {
    const normalizedKeluhan = normalizeDraftToken(keluhanUtama)
    setRpsDraftState((prev) => {
      const normalizedSource = normalizeDraftToken(prev.sourceKeluhan)
      const nextStale = Boolean(
        normalizedKeluhan && normalizedSource && normalizedKeluhan !== normalizedSource
      )
      if (prev.stale === nextStale) return prev
      return { ...prev, stale: nextStale }
    })
  }, [keluhanUtama])

  // Auto-fill Audrey entities saat user mengetik di Keluhan Utama / RPS
  useEffect(() => {
    if (!keluhanUtama.trim()) {
      setAnamnesaEntities({ utama: '', onset: '', faktor: '' })
      setAnamnesaVisible([false, false, false])
      return
    }
    const combined = `${keluhanUtama} ${riwayat.rps}`.toLowerCase()
    const onsetMatch =
      combined.match(/sejak\s+([\w\s]+?)(?=[,.\n]|$)/i) ??
      combined.match(/(\d+)\s*(jam|hari|minggu|bulan|tahun)(?:\s+(?:yang\s+lalu|lalu))?/i) ??
      combined.match(/sudah\s+([\w\s]+?)(?=[,.\n]|$)/i)
    const onset = onsetMatch ? onsetMatch[0].trim().slice(0, 42) : 'Perlu eksplorasi'
    const faktorMatch =
      combined.match(/(memberat|diperberat|memburuk|makin|tambah parah)[\w\s,]+?(?=[.;\n]|$)/i) ??
      combined.match(/(berkurang|membaik|hilang)\s+(saat|ketika|jika)[\w\s]+?(?=[.;\n]|$)/i)
    const faktor = faktorMatch ? faktorMatch[0].trim().slice(0, 42) : 'Belum teridentifikasi'
    setAnamnesaEntities({
      utama: keluhanUtama.trim().slice(0, 60),
      onset,
      faktor,
    })
    setAnamnesaVisible([true, true, true])
  }, [keluhanUtama, riwayat.rps])

  useEffect(() => () => clearSynthTimers(), [])

  function updateRpsDraft(
    nextRps: string,
    options?: {
      mode?: 'idle' | 'auto' | 'edited'
      sourceKeluhan?: string
      stale?: boolean
    }
  ) {
    setRiwayat((prev) => ({ ...prev, rps: nextRps }))
    if (!options) return
    setRpsDraftState((prev) => ({
      sourceKeluhan: options.sourceKeluhan ?? prev.sourceKeluhan,
      mode: options.mode ?? prev.mode,
      stale: options.stale ?? prev.stale,
    }))
  }

  function appendToClinicalField(
    setter: React.Dispatch<React.SetStateAction<string>>,
    value: string,
    joiner = ', '
  ) {
    setter((prev) => appendUniqueDelimitedValue(prev, value, joiner))
  }

  function applyExamAutoSentra() {
    const suggestions = [
      ...pemeriksaanFisikUsulan
        .split(';')
        .map((item) => item.trim())
        .filter(Boolean),
      ...(clinicalChain?.pemeriksaan.fisik ?? []),
    ]

    const uniqueSuggestions = suggestions.filter((item, index, source) => {
      const normalized = normalizeDraftToken(item)
      return (
        normalized &&
        source.findIndex((candidate) => normalizeDraftToken(candidate) === normalized) === index
      )
    })

    const keluhanLower = `${keluhanUtama} ${keluhanTambahan}`.toLowerCase()
    if (/(sesak|batuk|nyeri dada)/.test(keluhanLower)) {
      uniqueSuggestions.push('Auskultasi cor/pulmo, inspeksi retraksi, evaluasi kerja napas')
    }
    if (/(nyeri pinggang|pinggang|perut|mual|muntah|diare|anyang|disuria)/.test(keluhanLower)) {
      uniqueSuggestions.push('Palpasi abdomen, ketok CVA, status hidrasi')
    }
    if (/(demam|ruam|gatal)/.test(keluhanLower)) {
      uniqueSuggestions.push('Inspeksi kulit dan turgor')
    }
    if (/(sakit kepala|vertigo|mata|telinga|tenggorokan)/.test(keluhanLower)) {
      uniqueSuggestions.push('Inspeksi kepala-leher, konjungtiva, faring, KGB servikal')
    }

    const dedupedSuggestions = uniqueSuggestions.filter((item, index, source) => {
      const normalized = normalizeDraftToken(item)
      return (
        normalized &&
        source.findIndex((candidate) => normalizeDraftToken(candidate) === normalized) === index
      )
    })

    if (dedupedSuggestions.length === 0) return

    const examFocusDraft = deriveExamFocusDraft(keluhanUtama, keluhanTambahan, dedupedSuggestions)
    const examTemplates = createNormalExamTemplate(vitals)

    setExamOpen(true)
    setExam({
      kepala: buildExamNarrative(examTemplates.kepala, examFocusDraft.kepala),
      dada: buildExamNarrative(examTemplates.dada, examFocusDraft.dada),
      perut: buildExamNarrative(examTemplates.perut, examFocusDraft.perut),
      ekstremitas: buildExamNarrative(examTemplates.ekstremitas, examFocusDraft.ekstremitas),
      kulit: buildExamNarrative(examTemplates.kulit, examFocusDraft.kulit),
      genitalia: buildExamNarrative(examTemplates.genitalia, examFocusDraft.genitalia),
    })
    setExamAutofillKeys(['kepala', 'dada', 'perut', 'ekstremitas', 'kulit', 'genitalia'])
    if (examAutofillTimerRef.current) clearTimeout(examAutofillTimerRef.current)
    examAutofillTimerRef.current = setTimeout(() => setExamAutofillKeys([]), 1800)
    setPemeriksaanFisikUsulan((previous) =>
      dedupedSuggestions.reduce(
        (draft, item) => appendUniqueDelimitedValue(draft, item, '; '),
        previous
      )
    )
  }

  function clearSynthTimers() {
    synthTimersRef.current.forEach((timer) => clearTimeout(timer))
    synthTimersRef.current = []
  }

  const finalizeSynthRun = useCallback((runId: number) => {
    if (synthRunIdRef.current !== runId) return
    const pendingResult = pendingSynthResultRef.current

    setShowEmrLoader(false)
    setHistoryLoaded(true)
    setHeaderText('SENTRA // RM-BARU // Synthesia Engine: READY')
    setAnamnesaVisible([true, true, true])
    setAnamnesaEntities({
      utama:
        pendingResult?.entities?.keluhan_utama ||
        keluhanRef.current.utama.trim() ||
        'Belum terekam',
      onset: pendingResult?.entities?.onset_durasi || 'Perlu eksplorasi lebih lanjut',
      faktor: pendingResult?.entities?.faktor_pemberatan || 'Belum teridentifikasi',
    })
    setIsTyping(false)
    setWords([])
  }, [])

  function resetEmrDraft() {
    clearSynthTimers()
    if (examAutofillTimerRef.current) clearTimeout(examAutofillTimerRef.current)
    synthRunIdRef.current += 1
    pendingSynthResultRef.current = null
    setKeluhanUtama('')
    setKeluhanTambahan('')
    keluhanRef.current = { utama: '', tambahan: '' }
    setKeluhanAsli('')
    updateRpsDraft('', { mode: 'idle', sourceKeluhan: '', stale: false })
    setRiwayat((prev) => ({ ...prev, rpk: '' }))
    setPemeriksaanFisikUsulan('')
    setHasilLab('')
    setPemeriksaanPenunjang('')
    setBodyWeightKg('')
    setRecentActivity('resting')
    setStressState('calm')
    setMedicationFlags(new Set())
    setVitals({
      gcs: '',
      td: '',
      nadi: '',
      napas: '',
      suhu: '',
      spo2: '',
      map: '',
    })
    setVitalMeta(createInitialVitalMeta())
    setGulaDarah({ nilai: '', tipe: 'GDS' })
    setExam({
      kepala: '',
      dada: '',
      perut: '',
      ekstremitas: '',
      kulit: '',
      genitalia: '',
    })
    setExamAutofillKeys([])
    setRpdSelected(new Set())
    setAlergiSelected(new Set())
    setTriageSignalContext({})
    setStructuredSignsDraft(createInitialStructuredSigns())
    setScreeningAlerts([])
    setCompositeDeterioration(null)
    setReceivedVisitHistory([])
    setEncounterMeasurements([])
    latestEncounterMeasurementSignatureRef.current = ''
    setActiveScenario(null)
    setCdssResult(null)
    setCdssError('')
    setCdssLoading(false)
    setClinicalChain(null)
    setSelectedPemeriksaan(new Set())
    setIsAutocompleteLoading(false)
    setAssessmentConclusion('')
    setSelectedSuggestionKey(null)
    setSelectedDiagnosisDraft(null)
    setConsideredMustNotMissKeys([])
    setEmergencyAcknowledged(false)
    setSafetyChecklist({})
    setAssessmentConclusionMeta({ mode: 'idle', signature: '' })
    setReviewAcceptanceReason('')
    setFeedbackFinalIcd('')
    setFeedbackOverrideReason('')
    setFeedbackFollowUpNote('')
    setFeedbackOutcomeConfirmed(null)
    setWords([])
    setAnamnesaVisible([false, false, false])
    setAnamnesaEntities({ utama: '', onset: '', faktor: '' })
    setShowEmrLoader(false)
    setHistoryLoaded(false)
    setExpandedPemItem(null)
    setDraftBorderColor('var(--text-muted)')
    setHeaderText('SENTRA / PUSKESMAS KEDIRI // RM-BARU // SENAUTO ENGINE: IDLE')
    setHeaderColor('var(--text-muted)')
    setIsTyping(false)
    setGhostVisible(true)
    setScanFlash(false)
    setAutoOpenUsulanPending(false)
  }

  function handleSenAutoClick(e: React.MouseEvent) {
    e.stopPropagation()
    const normalizedKeluhan = normalizeClinicalPhrase(keluhanUtama)
    if (isTyping || !normalizedKeluhan) return

    clearSynthTimers()
    synthRunIdRef.current += 1
    const runId = synthRunIdRef.current

    // Flash scan effect — pink sweep selama 900ms sebelum synthesia dimulai
    setScanFlash(true)
    const flashTimer = setTimeout(() => {
      if (synthRunIdRef.current !== runId) return
      setScanFlash(false)
    }, 900)
    synthTimersRef.current.push(flashTimer)

    // Simpan teks asli untuk inferTTV, lalu generate narasi klinis
    const rawKeluhan = normalizedKeluhan
    setKeluhanAsli(rawKeluhan)
    let result: ReturnType<typeof generateNarrative>
    try {
      result = generateNarrative(rawKeluhan)
    } catch (error) {
      pendingSynthResultRef.current = null
      setScanFlash(false)
      setShowEmrLoader(false)
      setIsTyping(false)
      setWords([])
      setHeaderText('SENTRA // RM-BARU // Synthesia Engine: FAILED')
      setHeaderColor('var(--c-critical)')
      console.error('[Synthesia] gagal membentuk narasi:', error)
      return
    }
    pendingSynthResultRef.current = result
    const narrative = result.keluhan_utama || rawKeluhan
    updateRpsDraft(narrative, {
      mode: 'auto',
      sourceKeluhan: rawKeluhan,
      stale: false,
    })
    setHistoryLoaded(false)
    setAnamnesaVisible([false, false, false])
    setAnamnesaEntities({ utama: '', onset: '', faktor: '' })
    setShowEmrLoader(false)
    // Collapse lalu reveal ulang agar panel mengikuti alur synthesia secara bertahap.
    setAutoOpenUsulanPending(true)
    const collapseTimer = setTimeout(() => {
      if (synthRunIdRef.current !== runId) return
      setSifatOpen(false)
      setLokasiOpen(false)
      setPenyertaOpen(false)
      setUsulanFisikOpen(false)
      setUsulanLabOpen(false)
      setUsulanPenunjangOpen(false)
    }, 400)
    synthTimersRef.current.push(collapseTimer)
    // Trigger autocomplete dengan keluhan asli, tanpa debounce delay
    triggerAutocomplete(rawKeluhan, 0)

    setIsTyping(true)
    setGhostVisible(false)
    setDraftBorderColor('var(--c-asesmen)')
    setHeaderText('SENTRA // RM-BARU // SENAUTO ENGINE: SYNTHESIZING...')
    setHeaderColor('var(--c-asesmen)')
    const narrativeWords = narrative.split(/\s+/).filter(Boolean)
    const previewWords = narrativeWords.slice(0, 24)
    setWords(previewWords)

    const totalTime = Math.min(1600, Math.max(720, previewWords.length * 55))

    const retrievalTimer = setTimeout(() => {
      if (synthRunIdRef.current !== runId) return
      setHeaderText('SENTRA // RM-BARU // CLINICAL MIND ALGORITHM RETRIEVAL ACTIVE')
      setShowEmrLoader(true)
      ;[0, 1, 2].forEach((i) => {
        const entityTimer = setTimeout(() => {
          if (synthRunIdRef.current !== runId) return
          setAnamnesaVisible((prev) => {
            const next = [...prev]
            next[i] = true
            return next
          })
        }, i * 200)
        synthTimersRef.current.push(entityTimer)
      })

      const readyTimer = setTimeout(() => {
        finalizeSynthRun(runId)
      }, 1050)
      synthTimersRef.current.push(readyTimer)
    }, totalTime)
    synthTimersRef.current.push(retrievalTimer)

    const hardFinalizeTimer = setTimeout(() => {
      finalizeSynthRun(runId)
    }, totalTime + 1600)
    synthTimersRef.current.push(hardFinalizeTimer)
  }

  useEffect(() => {
    if (!isTyping) return

    const runId = synthRunIdRef.current
    const watchdogTimer = setTimeout(() => {
      finalizeSynthRun(runId)
    }, 3400)

    return () => clearTimeout(watchdogTimer)
  }, [isTyping, finalizeSynthRun])

  // Viewport-based phase dimming via IntersectionObserver
  useEffect(() => {
    const ids = ['row1', 'row2', 'row3'] as const
    const refs = [row1SectionRef, row2SectionRef, row3SectionRef]
    const elementToId = new Map<Element, 'row1' | 'row2' | 'row3'>()
    const ratios = new Map<'row1' | 'row2' | 'row3', number>()

    const pick = () => {
      if (ratios.size === 0) return
      let best: 'row1' | 'row2' | 'row3' = 'row1'
      let bestR = -1
      ratios.forEach((r, id) => {
        if (r > bestR) {
          bestR = r
          best = id
        }
      })
      setActiveViewPhase(best)
    }

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          const id = elementToId.get(entry.target)
          if (!id) return
          if (entry.isIntersecting) ratios.set(id, entry.intersectionRatio)
          else ratios.delete(id)
        })
        pick()
      },
      { threshold: [0, 0.1, 0.25, 0.5, 0.75, 1] }
    )

    ids.forEach((id, i) => {
      const el = refs[i].current
      if (el) {
        elementToId.set(el, id)
        observer.observe(el)
      }
    })

    return () => observer.disconnect()
  }, [])

  // Red Flags section — dim when scrolled out of viewport
  useEffect(() => {
    const el = redFlagsRef.current
    if (!el) return
    const obs = new IntersectionObserver(([entry]) => setRedFlagsInView(entry.isIntersecting), {
      threshold: 0.05,
    })
    obs.observe(el)
    return () => obs.disconnect()
  }, [])

  useEffect(() => {
    if (!workflowScrollInitializedRef.current) {
      workflowScrollInitializedRef.current = true
      return
    }

    const target =
      workflowTab === 'triage'
        ? row1SectionRef.current
        : workflowTab === 'review'
          ? (reviewHandoffRef.current ?? row2SectionRef.current)
          : workflowTab === 'assessment'
            ? row3SectionRef.current
            : (finalizeAnchorRef.current ?? row3SectionRef.current)

    if (!target) return

    const timer = window.setTimeout(() => {
      target.scrollIntoView({ behavior: 'smooth', block: 'start' })
    }, 80)

    return () => window.clearTimeout(timer)
  }, [workflowTab])

  function appendToRps(value: string) {
    const cleanValue = value.trim()
    if (!cleanValue) return
    setRiwayat((prev) => ({
      ...prev,
      rps: appendUniqueNarrativeValue(prev.rps, cleanValue),
    }))
    setRpsDraftState({
      sourceKeluhan: keluhanUtama.trim() || rpsDraftState.sourceKeluhan,
      mode: 'edited',
      stale: false,
    })
  }

  function moveToWorkflowTab(nextTab: WorkflowTab) {
    if (workflowTab === nextTab) return
    setWorkflowTab(nextTab)
    if (nextTab === 'review') {
      setActiveViewPhase('row1')
      setTimeout(() => {
        row1SectionRef.current?.scrollIntoView({
          behavior: 'smooth',
          block: 'start',
        })
      }, 60)
    }
  }

  function toggleTrajectory() {
    const next = !trajectoryActive
    setTrajectoryActive(next)
    setTrajectoryOpen(next)
    if (next) {
      if (insightTimeoutRef.current) clearTimeout(insightTimeoutRef.current)
      setShowInsight(true)
    } else {
      insightTimeoutRef.current = setTimeout(() => setShowInsight(false), 800)
    }
  }

  function toggleLab(index: number) {
    setLabSelected((prev) => {
      const next = [...prev]
      next[index] = !next[index]
      return next
    })
  }

  async function runCDSS() {
    const minimumBranchAnimationMs = 1400
    if (!keluhanUtama.trim()) return
    if (rpsDraftState.stale && riwayat.rps.trim()) {
      setCdssError(
        'Riwayat Penyakit Sekarang masih mengacu ke keluhan utama sebelumnya. Mohon perbarui RPS atau jalankan AUTO SENTRA lagi.'
      )
      return
    }
    setCdssLoading(true)
    setCdssError('')
    setCdssResult(null)
    setCdssBranchRunId((current) => current + 1)
    cdssRunStartedAtRef.current =
      typeof performance !== 'undefined' ? performance.now() : Date.now()
    setSelectedSuggestionKey(null)
    setSelectedDiagnosisDraft(null)
    setConsideredMustNotMissKeys([])
    setEmergencyAcknowledged(false)
    setSafetyChecklist({})
    setReviewAcceptanceReason('')

    const parseTD = (td: string) => {
      const parts = td.replace('/', ' ').split(/[\s/]+/)
      return {
        sbp: Number.parseFloat(parts[0]) || undefined,
        dbp: Number.parseFloat(parts[1]) || undefined,
      }
    }
    const { sbp, dbp } = vitals.td ? parseTD(vitals.td) : { sbp: undefined, dbp: undefined }

    // Gabung keluhan tambahan + RPS + RPK untuk konteks klinis lengkap
    const keluhanKombinasi =
      [
        keluhanTambahan,
        riwayat.rps ? `RPS: ${riwayat.rps}` : '',
        riwayat.rpk ? `RPK: ${riwayat.rpk}` : '',
      ]
        .filter(Boolean)
        .join('. ') || undefined

    const liveAlertPayload = buildRealtimeAlertPayload()
    const structuredSigns = liveAlertPayload.structuredSigns as StructuredTriageSigns
    const nextComposite = evaluateCompositeDeteriorationFromEmrPayload(liveAlertPayload)
    setCompositeDeterioration(nextComposite)
    setScreeningAlerts(nextComposite.screeningAlerts)

    try {
      const res = await fetch('/api/cdss/diagnose', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          keluhan_utama: keluhanUtama,
          keluhan_tambahan: keluhanKombinasi,
          assessment_conclusion: assessmentConclusion.trim() || undefined,
          structured_signs: structuredSigns,
          composite_deterioration: nextComposite,
          vital_signs: {
            systolic: sbp,
            diastolic: dbp,
            heart_rate: Number.parseFloat(vitals.nadi) || undefined,
            respiratory_rate: Number.parseFloat(vitals.napas) || undefined,
            temperature: Number.parseFloat(vitals.suhu) || undefined,
            spo2: Number.parseFloat(vitals.spo2) || undefined,
            gcs: Number.parseFloat(vitals.gcs) || undefined,
            glucose: Number.parseFloat(gulaDarah.nilai) || undefined,
          },
          chronic_diseases: rpdSelected.size > 0 ? Array.from(rpdSelected) : undefined,
          allergies: alergiSelected.size > 0 ? Array.from(alergiSelected) : undefined,
          usia: patientAge,
          jenis_kelamin: patientGender,
          is_pregnant: patientGender === 'P' ? isPregnant : false,
          session_id: cdssSessionIdRef.current,
        }),
      })
      if (!res.ok) {
        const errorPayload = (await res
          .json()
          .catch(() => ({ error: 'Gagal memproses diagnosis' }))) as {
          error?: string
        }
        if (res.status === 503) {
          setCdssRetiredMessage(errorPayload.error ?? LEGACY_CDSS_RETIRED_MESSAGE)
        }
        throw new Error(errorPayload.error ?? `HTTP ${res.status}`)
      }
      const data = (await res.json()) as CDSSResult
      const startedAt = cdssRunStartedAtRef.current
      const now = typeof performance !== 'undefined' ? performance.now() : Date.now()
      const elapsed = startedAt ? now - startedAt : minimumBranchAnimationMs
      const remainingDelay = Math.max(0, minimumBranchAnimationMs - elapsed)
      if (remainingDelay > 0) {
        await new Promise((resolve) => window.setTimeout(resolve, remainingDelay))
      }
      setCdssResult(data)
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Gagal menjalankan CDSS. Coba lagi.'
      setCdssError(message)
    } finally {
      cdssRunStartedAtRef.current = null
      setCdssLoading(false)
    }
  }

  async function selectCdssSuggestion(s: CDSSSuggestion) {
    const suggestionKey = getSuggestionKey(s)
    const status = s.decision_status ?? 'review'
    const selectionIntent = status === 'review' ? 'review_selection' : 'working_diagnosis'

    let reviewReason = ''
    if (status === 'review') {
      reviewReason =
        window
          .prompt(
            'Masukkan alasan menerima diagnosis berstatus review:',
            reviewAcceptanceReason.trim()
          )
          ?.trim() ?? ''
      if (!reviewReason) return
    }

    setSelectionSavingKey(suggestionKey)
    if (status === 'must_not_miss') {
      setConsideredMustNotMissKeys((prev) =>
        prev.includes(suggestionKey) ? prev : [...prev, suggestionKey]
      )
    }
    setSelectedSuggestionKey(suggestionKey)
    setSelectedDiagnosisDraft(s)
    setFeedbackFinalIcd(s.icd10_code)
    setReviewAcceptanceReason(reviewReason)
    setFeedbackOverrideReason('')
    setFeedbackOutcomeConfirmed(null)
    setFeedbackFollowUpNote('')
    setAssessmentConclusion((prev) => {
      const normalized = prev.trim()
      if (normalized.length > 0) return prev
      const prefix =
        status === 'recommended'
          ? 'Dx kerja (recommended)'
          : status === 'must_not_miss'
            ? 'Dx kerja (must-not-miss reviewed)'
            : 'Dx kerja (reviewed by doctor)'
      return `${prefix}: ${s.diagnosis_name} (${s.icd10_code}) — confidence ${Math.round(s.confidence * 100)}%`
    })
    globalThis.setTimeout(() => {
      selectedDiagnosisPanelRef.current?.scrollIntoView({
        behavior: 'smooth',
        block: 'nearest',
      })
    }, 260)
    try {
      const response = await fetch('/api/cdss/suggestion-selected', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          session_id: cdssSessionIdRef.current,
          selected_icd: s.icd10_code,
          selected_confidence: s.confidence,
          diagnosis_name: s.diagnosis_name,
          rank: s.rank,
          decision_status: status,
          decision_reason: s.decision_reason,
          selection_intent: selectionIntent,
          review_reason: reviewReason || undefined,
        }),
      })
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`)
      }
    } catch (error) {
      console.error('[CDSS Suggestion Selected]', error)
      if (status === 'must_not_miss') {
        setConsideredMustNotMissKeys((prev) => prev.filter((key) => key !== suggestionKey))
      }
      setSelectedSuggestionKey(null)
      setSelectedDiagnosisDraft(null)
      setReviewAcceptanceReason('')
    } finally {
      setSelectionSavingKey(null)
    }
  }

  async function submitOutcomeFeedback() {
    if (!selectedDiagnosisDraft) return
    if (!feedbackFinalIcd.trim()) return

    setFeedbackSaving(true)
    try {
      const response = await fetch('/api/cdss/outcome-feedback', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          session_id: cdssSessionIdRef.current,
          selected_icd: selectedDiagnosisDraft.icd10_code,
          selected_confidence: selectedDiagnosisDraft.confidence,
          final_icd: feedbackFinalIcd.trim().toUpperCase(),
          outcome_confirmed: feedbackOutcomeConfirmed,
          follow_up_note: feedbackFollowUpNote.trim() || undefined,
          review_accept_reason: reviewAcceptanceReason.trim() || undefined,
          override_reason: feedbackOverrideReason.trim() || undefined,
        }),
      })
      if (!response.ok) throw new Error(`HTTP ${response.status}`)
    } catch (error) {
      console.error('[CDSS Outcome Feedback]', error)
    } finally {
      setFeedbackSaving(false)
    }
  }

  const [sifatKey, setSifatKey] = useState(0)
  const [chainTabKey, setChainTabKey] = useState(0)

  useEffect(() => {
    if (!clinicalChain) return
    setSifatKey((k) => k + 1)
  }, [activeSifatTab]) // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (!clinicalChain) return
    setChainTabKey((k) => k + 1)
  }, [activeChainTab]) // eslint-disable-line react-hooks/exhaustive-deps

  // Autocomplete via clinical-chains.json (local) atau DeepSeek fallback
  function triggerAutocomplete(query: string, delay = 400) {
    if (autocompleteTimerRef.current) clearTimeout(autocompleteTimerRef.current)
    const normalizedQuery = normalizeClinicalPhrase(query)
    if (normalizedQuery.length < 3) {
      setClinicalChain(null)
      setSelectedPemeriksaan(new Set())
      setIsAutocompleteLoading(false)
      return
    }
    autocompleteTimerRef.current = setTimeout(async () => {
      setIsAutocompleteLoading(true)
      const controller = new AbortController()
      const timeoutId = setTimeout(() => {
        controller.abort()
        setIsAutocompleteLoading(false)
      }, 8000)
      try {
        const res = await fetchAutocompleteChain(
          {
            query: normalizedQuery,
            context: keluhanUtama
              .split(',')
              .map((part) => normalizeClinicalPhrase(part))
              .filter(Boolean),
          },
          controller.signal
        )
        clearTimeout(timeoutId)
        if (!res.ok) {
          console.warn('[AC] fetch warning:', res.status)
          setIsAutocompleteLoading(false)
          return
        }
        const data = (await res.json()) as {
          source: 'local' | 'llm'
          chain: {
            sifat: { formal: string[]; klinis: string[]; narasi: string[] }
            lokasi: string[]
            durasi: string[]
            logical_chain: string[]
            predictive_next: { red_flags: string[] }
            templates: string[]
            pemeriksaan: {
              fisik: string[]
              lab: string[]
              penunjang: string[]
            }
          }
        }
        const c = data.chain
        setClinicalChain({
          sifat: c.sifat ?? { formal: [], klinis: [], narasi: [] },
          lokasi: c.lokasi ?? [],
          durasi: c.durasi ?? [],
          logical_chain: c.logical_chain ?? [],
          red_flags: c.predictive_next?.red_flags ?? [],
          templates: c.templates ?? [],
          pemeriksaan: c.pemeriksaan ?? { fisik: [], lab: [], penunjang: [] },
        })
        setSelectedPemeriksaan(new Set())
      } catch (err) {
        if (err instanceof Error && err.name !== 'AbortError') {
          console.error('[AC] error:', err.message)
        }
      } finally {
        clearTimeout(timeoutId)
        setIsAutocompleteLoading(false)
      }
    }, delay)
  }

  useEffect(() => {
    if (!cdssResult || workflowTab !== 'assessment') return

    const timer = window.setTimeout(() => {
      cdssPanelRef.current?.scrollIntoView({
        behavior: 'smooth',
        block: 'start',
      })
    }, 120)

    return () => window.clearTimeout(timer)
  }, [cdssResult, workflowTab])

  useEffect(() => {
    if (!selectedDiagnosisDraft || !prognosisStageRef.current) {
      setRow3Spotlight('entry')
      return
    }

    const updateRow3Spotlight = () => {
      const prognosisRect = prognosisStageRef.current?.getBoundingClientRect()
      if (!prognosisRect) return

      const viewportFocusLine = window.innerHeight * 0.46
      const prognosisInFocus = prognosisRect.top <= viewportFocusLine && prognosisRect.bottom >= 120

      setRow3Spotlight(prognosisInFocus ? 'prognosis' : 'entry')
    }

    updateRow3Spotlight()
    window.addEventListener('scroll', updateRow3Spotlight, { passive: true })
    window.addEventListener('resize', updateRow3Spotlight)

    return () => {
      window.removeEventListener('scroll', updateRow3Spotlight)
      window.removeEventListener('resize', updateRow3Spotlight)
    }
  }, [selectedDiagnosisDraft])

  const cdssEmergencyFlags = useMemo(
    () => cdssResult?.red_flags.filter((rf) => rf.severity === 'emergency') ?? [],
    [cdssResult]
  )
  const emergencyFlags = useMemo(
    () =>
      buildEmergencyOverrideFlags({
        cdssRedFlags: cdssEmergencyFlags,
        screeningAlerts,
        compositeDeterioration,
      }),
    [cdssEmergencyFlags, compositeDeterioration, screeningAlerts]
  )
  const emergencyChecklistSignature = useMemo(
    () =>
      emergencyFlags
        .map((flag) => [flag.condition, flag.title, flag.action].filter(Boolean).join(':'))
        .join('|'),
    [emergencyFlags]
  )
  const emergencyOverride = useMemo(
    () =>
      deriveEmergencyOverrideState({
        activeViewPhase,
        emergencyAcknowledged,
        emergencyFlags,
      }),
    [activeViewPhase, emergencyAcknowledged, emergencyFlags]
  )
  const requiresEmergencyAck = emergencyOverride.requiresEmergencyAck

  useEffect(() => {
    if (!emergencyChecklistSignature) {
      emergencyChecklistSignatureRef.current = ''
      setEmergencyAcknowledged(true)
      setSafetyChecklist({})
      return
    }

    if (emergencyChecklistSignatureRef.current === emergencyChecklistSignature) return

    emergencyChecklistSignatureRef.current = emergencyChecklistSignature
    setSafetyChecklist(buildSafetyChecklistForEmergencyFlags(emergencyFlags))
    setEmergencyAcknowledged(false)
  }, [emergencyChecklistSignature, emergencyFlags])

  useEffect(() => {
    if (!emergencyOverride.overrideActive) return

    if (activeViewPhase !== emergencyOverride.forcedActiveViewPhase) {
      setActiveViewPhase(emergencyOverride.forcedActiveViewPhase)
    }

    if (
      emergencyOverride.requiredWorkflowTab &&
      workflowTab !== emergencyOverride.requiredWorkflowTab
    ) {
      setWorkflowTab(emergencyOverride.requiredWorkflowTab)
    }
  }, [activeViewPhase, emergencyOverride, workflowTab])
  const recommendedSuggestions = useMemo(
    () =>
      sortSuggestionsForDisplay(
        cdssResult?.suggestions.filter(
          (suggestion) => suggestion.decision_status === 'recommended'
        ) ?? []
      ),
    [cdssResult]
  )
  const reviewSuggestions = useMemo(
    () =>
      sortSuggestionsForDisplay(
        cdssResult?.suggestions.filter((suggestion) => suggestion.decision_status === 'review') ??
          []
      ),
    [cdssResult]
  )
  const mustNotMissSuggestions = useMemo(
    () =>
      sortSuggestionsForDisplay(
        cdssResult?.suggestions.filter(
          (suggestion) => suggestion.decision_status === 'must_not_miss'
        ) ?? []
      ),
    [cdssResult]
  )
  const hasOnlyMustNotMissResults =
    Boolean(cdssResult) &&
    recommendedSuggestions.length === 0 &&
    reviewSuggestions.length === 0 &&
    mustNotMissSuggestions.length > 0
  const hasConsideredMustNotMissOnly =
    hasOnlyMustNotMissResults && consideredMustNotMissKeys.length > 0
  const importantBestQuestions = useMemo(
    () =>
      deriveImportantBestQuestions(
        keluhanUtama,
        keluhanTambahan,
        cdssResult?.next_best_questions ?? []
      ),
    [keluhanUtama, keluhanTambahan, cdssResult]
  )
  const compactVitalsSignals = useMemo(() => {
    const items = [
      { label: 'TD', value: vitals.td ? `${vitals.td} mmHg` : null },
      { label: 'Nadi', value: vitals.nadi ? `${vitals.nadi} bpm` : null },
      { label: 'RR', value: vitals.napas ? `${vitals.napas} x/menit` : null },
      { label: 'Suhu', value: vitals.suhu ? `${vitals.suhu} °C` : null },
      { label: 'SpO2', value: vitals.spo2 ? `${vitals.spo2}%` : null },
      {
        label: gulaDarah.tipe,
        value: gulaDarah.nilai ? `${gulaDarah.nilai} mg/dL` : null,
      },
      {
        label: 'Alert',
        value: screeningAlerts.length > 0 ? `${screeningAlerts.length} aktif` : null,
      },
    ]
    return items.filter((item) => item.value)
  }, [
    gulaDarah.nilai,
    gulaDarah.tipe,
    screeningAlerts.length,
    vitals.nadi,
    vitals.napas,
    vitals.spo2,
    vitals.suhu,
    vitals.td,
  ])
  const showCdssAnimatedBranch = cdssLoading
  const cdssBranchFlowKey = `cdss-branch-${cdssBranchRunId}-${cdssResult?.processing_time_ms ?? 'loading'}-${cdssResult?.validation_summary.total_validated ?? 0}-${cdssResult?.validation_summary.must_not_miss_count ?? 0}`
  const assessmentStageBadge = cdssLoading
    ? 'ENGINE BERJALAN'
    : selectedDiagnosisDraft
      ? 'DIAGNOSIS KERJA TERPILIH'
      : hasConsideredMustNotMissOnly
        ? 'RISIKO TINGGI SUDAH DITANDAI'
        : cdssResult
          ? hasOnlyMustNotMissResults
            ? 'TINJAU MUST-NOT-MISS'
            : 'HASIL SIAP DIREVIEW'
          : assessmentConclusion.trim()
            ? 'SIAP MENJALANKAN ENGINE'
            : 'MENUNGGU ASSESSMENT'
  const readinessComplaintHeadline = useMemo(() => {
    const parts = [keluhanUtama.trim(), keluhanTambahan.trim()]
      .filter(Boolean)
      .flatMap((value) => value.split(/[;,]/))
      .map((value) => value.trim())
      .filter(Boolean)
    const uniqueParts = Array.from(new Set(parts))
    return uniqueParts.slice(0, 3).join(', ')
  }, [keluhanTambahan, keluhanUtama])
  const readinessOnsetLabel = useMemo(() => {
    const onset = anamnesaEntities.onset?.trim() ?? ''
    if (!onset || /^perlu eksplorasi/i.test(onset)) return null
    return onset
  }, [anamnesaEntities.onset])
  const readinessTriageLabel = useMemo(() => {
    if (screeningAlerts.length === 0) return 'Hijau'
    return 'Kuning'
  }, [screeningAlerts.length])
  const readinessTriageColor = readinessTriageLabel === 'Hijau' ? 'var(--success)' : 'var(--warning)'
  const assessmentAutoDraft = useMemo(() => {
    const complaint = summarizeClinicalSnippet(
      [keluhanUtama.trim(), keluhanTambahan.trim()].filter(Boolean).join(', '),
      92
    )
    const rps = summarizeClinicalSnippet(riwayat.rps, 152)
    const objective = compactVitalsSignals
      .filter((item) => item.label !== 'Alert')
      .slice(0, 4)
      .map((item) => `${item.label} ${item.value}`)
      .join(', ')
    const alerts =
      screeningAlerts.length > 0 ? `${screeningAlerts.length} alert klinis perlu perhatian` : ''
    const background = [
      rpdSelected.size > 0 ? `Komorbid: ${Array.from(rpdSelected).join(', ')}` : '',
      alergiSelected.size > 0 ? `Alergi: ${Array.from(alergiSelected).join(', ')}` : '',
    ]
      .filter(Boolean)
      .join(' · ')

    const segments = [
      complaint ? `Keluhan: ${complaint}` : '',
      rps ? `RPS: ${rps}` : '',
      objective ? `Objektif: ${objective}` : '',
      alerts ? `Triage: ${alerts}` : '',
      background,
    ].filter(Boolean)

    return segments.join('. ')
  }, [
    alergiSelected,
    compactVitalsSignals,
    keluhanTambahan,
    keluhanUtama,
    riwayat.rps,
    rpdSelected,
    screeningAlerts.length,
  ])
  const assessmentAutoDraftSignature = useMemo(
    () =>
      [
        keluhanUtama.trim(),
        keluhanTambahan.trim(),
        riwayat.rps.trim(),
        Array.from(rpdSelected).sort().join('|'),
        Array.from(alergiSelected).sort().join('|'),
        compactVitalsSignals.map((item) => `${item.label}:${item.value}`).join('|'),
        screeningAlerts.length,
      ].join('::'),
    [
      alergiSelected,
      compactVitalsSignals,
      keluhanTambahan,
      keluhanUtama,
      riwayat.rps,
      rpdSelected,
      screeningAlerts.length,
    ]
  )
  const surfacedSuggestionCount =
    recommendedSuggestions.length + reviewSuggestions.length + mustNotMissSuggestions.length
  const readinessOutputTitle = cdssLoading
    ? 'Engine sedang memproses'
    : cdssResult
      ? recommendedSuggestions.length > 0
        ? `${recommendedSuggestions.length} rekomendasi siap`
        : reviewSuggestions.length > 0
          ? `${reviewSuggestions.length} differential perlu review`
          : mustNotMissSuggestions.length > 0
            ? `${mustNotMissSuggestions.length} must-not-miss surfaced`
            : 'Belum ada keluaran'
      : 'CDSS belum dijalankan'
  const readinessOutputSubtitle = cdssLoading
    ? 'Iskandar sedang menyusun differential, validasi, dan safety lane.'
    : cdssResult
      ? [
          recommendedSuggestions.length > 0 ? `${recommendedSuggestions.length} recommended` : null,
          reviewSuggestions.length > 0 ? `${reviewSuggestions.length} review` : null,
          mustNotMissSuggestions.length > 0
            ? `${mustNotMissSuggestions.length} must-not-miss`
            : null,
          cdssResult.red_flags.length > 0 ? `${cdssResult.red_flags.length} alert klinis` : null,
        ]
          .filter(Boolean)
          .join(' · ') || `${surfacedSuggestionCount} keluaran klinis tersedia.`
      : 'Jalankan setelah sintesis klinis cukup jelas.'
  const topSuggestion =
    selectedDiagnosisDraft ??
    recommendedSuggestions[0] ??
    reviewSuggestions[0] ??
    mustNotMissSuggestions[0] ??
    null
  const readinessDecisionTitle = selectedDiagnosisDraft
    ? 'Keputusan klinis dipilih'
    : hasConsideredMustNotMissOnly
      ? 'Risiko tinggi sudah ditandai'
      : topSuggestion
        ? 'Menunggu keputusan klinis'
        : 'Belum ada keputusan klinis'
  const readinessDecisionSubtitle = selectedDiagnosisDraft
    ? `${selectedDiagnosisDraft.diagnosis_name} (${selectedDiagnosisDraft.icd10_code}) · ${Math.round(selectedDiagnosisDraft.confidence * 100)}% confidence`
    : hasConsideredMustNotMissOnly
      ? 'Must-not-miss sudah dipertimbangkan. Tetapkan diagnosis kerja manual bila sesuai.'
      : topSuggestion
        ? `Top suggestion: ${topSuggestion.diagnosis_name} (${topSuggestion.icd10_code}) · ${Math.round(topSuggestion.confidence * 100)}% confidence. Klik untuk review.`
        : 'Jalankan CDSS untuk mendapatkan differential dan lane keputusan.'
  useEffect(() => {
    if (workflowTab !== 'assessment') return
    if (selectedDiagnosisDraft) return
    if (!assessmentAutoDraft.trim()) return

    const shouldAutofill =
      assessmentConclusionMeta.mode !== 'edited' || !assessmentConclusion.trim()

    if (!shouldAutofill) return
    if (
      assessmentConclusionMeta.mode === 'auto' &&
      assessmentConclusionMeta.signature === assessmentAutoDraftSignature &&
      normalizeClinicalPhrase(assessmentConclusion) === normalizeClinicalPhrase(assessmentAutoDraft)
    ) {
      return
    }

    setAssessmentConclusion(assessmentAutoDraft)
    setAssessmentConclusionMeta({
      mode: 'auto',
      signature: assessmentAutoDraftSignature,
    })
  }, [
    assessmentAutoDraft,
    assessmentAutoDraftSignature,
    assessmentConclusion,
    assessmentConclusionMeta.mode,
    assessmentConclusionMeta.signature,
    selectedDiagnosisDraft,
    workflowTab,
  ])
  const finalizationSuggestion = useMemo(() => {
    if (!cdssResult || !selectedSuggestionKey) return null
    return (
      cdssResult.suggestions.find(
        (suggestion) => getSuggestionKey(suggestion) === selectedSuggestionKey
      ) ?? null
    )
  }, [cdssResult, selectedSuggestionKey])
  const finalizationReferralDiagnosisCandidates = useMemo(() => {
    if (!cdssResult) return []
    const primaryName = finalizationSuggestion?.diagnosis_name?.trim().toLowerCase()
    return cdssResult.suggestions
      .map((suggestion) => suggestion.diagnosis_name.trim())
      .filter((name) => name && name.toLowerCase() !== primaryName)
      .slice(0, 3)
  }, [cdssResult, finalizationSuggestion?.diagnosis_name])
  const finalizationTherapyPlan = useMemo(
    () =>
      buildFinalizationTherapyPlan({
        suggestion: finalizationSuggestion,
        keluhanUtama,
        referralDiagnosisCandidates: finalizationReferralDiagnosisCandidates,
        allergies: Array.from(alergiSelected),
        chronicDiseases: Array.from(rpdSelected),
        patientAge,
        patientGender,
        isPregnant: patientGender === 'P' ? isPregnant : false,
      }),
    [
      alergiSelected,
      finalizationReferralDiagnosisCandidates,
      finalizationSuggestion,
      isPregnant,
      keluhanUtama,
      patientAge,
      patientGender,
      rpdSelected,
    ]
  )
  const finalizationDiagnosisSummary = useMemo(
    () => (selectedDiagnosisDraft ? summarizeSuggestionReason(selectedDiagnosisDraft) : ''),
    [selectedDiagnosisDraft]
  )
  const finalizationDecisionBucket = useMemo(
    () =>
      selectedDiagnosisDraft ? getDecisionBucketLabel(selectedDiagnosisDraft.decision_status) : '',
    [selectedDiagnosisDraft]
  )
  const manualMedicationSuggestions = useMemo(
    () => searchManualMedicationSuggestions(medInput),
    [medInput]
  )
  useEffect(() => {
    if (!medInput.trim() || manualMedicationSuggestions.length === 0) {
      setActiveMedicationSuggestionIndex(0)
      return
    }

    setActiveMedicationSuggestionIndex((prev) => {
      if (prev < 0) return 0
      return Math.min(prev, manualMedicationSuggestions.length - 1)
    })
  }, [manualMedicationSuggestions, medInput])
  const appendManualMedication = useCallback((entry: ManualMedicationEntry) => {
    setManualMedications((prev) => {
      const duplicate = prev.some(
        (item) =>
          item.name.toLowerCase() === entry.name.toLowerCase() &&
          item.dose === entry.dose &&
          item.frequency === entry.frequency &&
          item.route === entry.route
      )
      if (duplicate || prev.length >= 4) {
        return prev
      }
      return [...prev, entry]
    })
    setMedInput('')
    setActiveMedicationSuggestionIndex(0)
  }, [])
  const submitManualMedication = useCallback(() => {
    if (!medInput.trim() || manualMedications.length >= 4) return
    const suggested =
      manualMedicationSuggestions[activeMedicationSuggestionIndex] ?? manualMedicationSuggestions[0]
    appendManualMedication(
      suggested
        ? createManualMedicationEntryFromSuggestion(suggested)
        : createManualMedicationEntryFromFreeText(medInput)
    )
  }, [
    activeMedicationSuggestionIndex,
    appendManualMedication,
    manualMedicationSuggestions,
    manualMedications.length,
    medInput,
  ])
  const getFinalizationMedicationKey = useCallback((item: FinalizationMedicationItem) => {
    return [item.canonicalName, item.name, item.dose, item.frequency].filter(Boolean).join('::')
  }, [])
  const finalizationMedicationKeys = useMemo(
    () => finalizationTherapyPlan.medications.map((item) => getFinalizationMedicationKey(item)),
    [finalizationTherapyPlan.medications, getFinalizationMedicationKey]
  )
  useEffect(() => {
    setSelectedAIMedicationKeys((prev) => {
      if (finalizationMedicationKeys.length === 0) return []
      if (prev.length === 0) return finalizationMedicationKeys

      const previousSelection = new Set(prev)
      const preserved = finalizationMedicationKeys.filter((key) => previousSelection.has(key))
      return preserved.length > 0 ? preserved : finalizationMedicationKeys
    })
  }, [finalizationMedicationKeys])
  const selectedAIMedicationKeySet = useMemo(
    () => new Set(selectedAIMedicationKeys),
    [selectedAIMedicationKeys]
  )
  const selectedFinalizationMedications = useMemo(
    () =>
      finalizationTherapyPlan.medications.filter((item) =>
        selectedAIMedicationKeySet.has(getFinalizationMedicationKey(item))
      ),
    [finalizationTherapyPlan.medications, getFinalizationMedicationKey, selectedAIMedicationKeySet]
  )
  const toggleAIMedicationSelection = useCallback((medicationKey: string) => {
    setSelectedAIMedicationKeys((prev) =>
      prev.includes(medicationKey)
        ? prev.filter((key) => key !== medicationKey)
        : [...prev, medicationKey]
    )
  }, [])
  const selectAllAIMedications = useCallback(() => {
    setSelectedAIMedicationKeys(finalizationMedicationKeys)
  }, [finalizationMedicationKeys])
  const clearAllAIMedications = useCallback(() => {
    setSelectedAIMedicationKeys([])
  }, [])
  const visibleFinalizationMedications = useMemo(
    () =>
      showSelectedAIMedicationsOnly
        ? selectedFinalizationMedications
        : finalizationTherapyPlan.medications,
    [
      finalizationTherapyPlan.medications,
      selectedFinalizationMedications,
      showSelectedAIMedicationsOnly,
    ]
  )
  const finalizationMedicationSummary = useMemo(() => {
    const available = finalizationTherapyPlan.medications.filter(
      (item) => item.stockStatus === 'mapped_available'
    ).length
    const limited = finalizationTherapyPlan.medications.filter(
      (item) => item.stockStatus === 'mapped_limited'
    ).length
    const unavailable = finalizationTherapyPlan.medications.filter(
      (item) => item.stockStatus === 'mapped_not_in_stock'
    ).length
    const unmapped = finalizationTherapyPlan.medications.filter(
      (item) => item.stockStatus === 'not_mapped_to_formulary'
    ).length
    return {
      total: finalizationTherapyPlan.medications.length,
      selected: selectedFinalizationMedications.length,
      available,
      limited,
      unavailable,
      unmapped,
    }
  }, [finalizationTherapyPlan, selectedFinalizationMedications.length])
  const finalizationReadiness = useMemo(() => {
    const checks = [
      {
        label: 'Diagnosis kerja',
        value: selectedDiagnosisDraft
          ? `${selectedDiagnosisDraft.icd10_code} • ${selectedDiagnosisDraft.diagnosis_name}`
          : 'Belum dipilih',
        state: selectedDiagnosisDraft ? 'ready' : ('pending' as const),
      },
      {
        label: 'Farmakologi',
        value:
          finalizationTherapyPlan.medications.length > 0
            ? `${selectedFinalizationMedications.length}/${finalizationTherapyPlan.medications.length} obat AI dipakai di resep`
            : 'Belum ada obat terpetakan',
        state:
          selectedFinalizationMedications.length > 0
            ? 'ready'
            : finalizationTherapyPlan.medications.length > 0
              ? 'review'
              : 'pending',
      },
      {
        label: 'Safety check',
        value:
          finalizationTherapyPlan.safetyChecks.length > 0
            ? `${finalizationTherapyPlan.safetyChecks.length} guardrail aktif`
            : 'Belum ada guardrail',
        state: finalizationTherapyPlan.safetyChecks.length > 0 ? 'ready' : 'pending',
      },
    ]

    const hasPending = checks.some((check) => check.state === 'pending')
    const hasReview = checks.some((check) => check.state === 'review')

    return {
      checks,
      title: hasPending
        ? 'Belum siap sign-off'
        : hasReview
          ? 'Siap dengan verifikasi akhir'
          : 'Siap untuk sign-off dokter',
      note: hasPending
        ? 'Lengkapi diagnosis kerja dan elemen terapi penting sebelum finalisasi dianggap utuh.'
        : hasReview
          ? 'Diagnosis sudah siap, tetapi susunan farmakologi masih perlu diverifikasi manual sebelum resep diterbitkan.'
          : 'Diagnosis, terapi awal, dan safety check sudah cukup rapi untuk verifikasi final dokter.',
      tone: hasPending ? 'pending' : hasReview ? 'review' : 'ready',
    }
  }, [
    finalizationTherapyPlan,
    finalizationTherapyPlan.medications.length,
    finalizationTherapyPlan.safetyChecks.length,
    selectedDiagnosisDraft,
    selectedFinalizationMedications.length,
  ])

  function renderSuggestionCard(s: CDSSSuggestion) {
    const suggestionKey = getSuggestionKey(s)
    const accent = getDecisionAccent(s.decision_status)
    const isMustNotMiss = s.decision_status === 'must_not_miss'
    const isReview = s.decision_status === 'review'
    const isSelected =
      selectedSuggestionKey === suggestionKey || consideredMustNotMissKeys.includes(suggestionKey)
    const summaryReason = summarizeSuggestionReason(s)
    const disposition = getSuggestionDisposition(s)

    return (
      <details
        key={`${s.rank}-${s.icd10_code}-${s.decision_status ?? 'review'}`}
        className={`cdss-dropbar${isSelected ? ' is-selected' : ''}`}
        open={isSelected}
        style={{ ['--cdss-accent' as any]: accent }}
      >
        <summary className="cdss-dropbar-summary">
          <div className="cdss-dropbar-main">
            <div className="cdss-dropbar-meta-row">
              <span className="cdss-dropbar-icd">
                {s.icd10_code}
                {s.rag_verified && <span style={{ marginLeft: 4, opacity: 0.6 }}>✓</span>}
              </span>
              <span className="cdss-dropbar-bucket">
                {getDecisionBucketLabel(s.decision_status)}
              </span>
            </div>
            <div className="cdss-dropbar-title">{s.diagnosis_name}</div>
            <div className="cdss-dropbar-reason">{summaryReason}</div>
          </div>
          <div className="cdss-dropbar-side">
            <span className="cdss-dropbar-score">
              {Math.round(s.confidence * 100)}%
              {typeof s.deterministic_score === 'number' &&
                ` · H${Math.round(s.deterministic_score * 100)}`}
            </span>
            <span className="cdss-dropbar-expand-hint">click</span>
            <span className="cdss-dropbar-chevron">▾</span>
          </div>
        </summary>
        <div className="cdss-dropbar-body">
          <div className="cdss-suggestion-meta">
            <span>source {s.rank_source ?? 'hybrid'}</span>
            {typeof s.llm_rank === 'number' && <span>llm #{s.llm_rank}</span>}
            {typeof s.deterministic_score === 'number' && (
              <span>hybrid {Math.round(s.deterministic_score * 100)}%</span>
            )}
          </div>
          <div className={`cdss-disposition-card cdss-disposition-card-${disposition.tone}`}>
            <div className="cdss-disposition-label">{disposition.label}</div>
            <div className="cdss-disposition-note">{disposition.note}</div>
          </div>
          <div style={{ fontSize: 14, color: 'var(--text-muted)' }}>{s.reasoning}</div>
          {s.validation_flags && s.validation_flags.length > 0 && (
            <div
              style={{
                width: '100%',
                marginTop: 4,
                padding: '8px 12px',
                borderLeft: '2px solid var(--warning)',
                background: 'var(--warning-tint)',
              }}
            >
              <div
                style={{
                  fontSize: 12,
                  fontWeight: 600,
                  color: 'var(--warning)',
                  marginBottom: 4,
                }}
              >
                CATATAN VALIDASI
              </div>
              {s.validation_flags.slice(0, 3).map((flag, idx) => (
                <div
                  key={`${s.icd10_code}-validation-${idx}`}
                  style={{ fontSize: 12, color: 'var(--text-muted)' }}
                >
                  • {flag.message}
                </div>
              ))}
            </div>
          )}
          {s.key_reasons && s.key_reasons.length > 0 && (
            <div style={{ width: '100%', marginTop: 4 }}>
              <div
                style={{
                  fontSize: 14,
                  color: 'var(--text-muted)',
                }}
              >
                TOP-3 ALASAN
              </div>
              {s.key_reasons.slice(0, 3).map((reason, idx) => (
                <div
                  key={`${s.icd10_code}-reason-${idx}`}
                  style={{ fontSize: 14, color: 'var(--text-main)' }}
                >
                  • {reason}
                </div>
              ))}
            </div>
          )}
          {s.missing_information && s.missing_information.length > 0 && (
            <div style={{ width: '100%', marginTop: 4 }}>
              <div
                style={{
                  fontSize: 14,
                  color: 'var(--text-muted)',
                }}
              >
                DATA TAMBAHAN DIBUTUHKAN
              </div>
              {s.missing_information.slice(0, 2).map((info, idx) => (
                <div
                  key={`${s.icd10_code}-missing-${idx}`}
                  style={{ fontSize: 14, color: 'var(--text-muted)' }}
                >
                  ▸ {info}
                </div>
              ))}
            </div>
          )}
          {s.recommended_actions && s.recommended_actions.length > 0 && (
            <div
              style={{
                fontSize: 14,
                color: 'var(--text-muted)',
                fontStyle: 'italic',
              }}
            >
              → {s.recommended_actions[0]}
            </div>
          )}
          <button
            type="button"
            onClick={() => void selectCdssSuggestion(s)}
            disabled={selectionSavingKey === suggestionKey || requiresEmergencyAck}
            style={{
              alignSelf: 'flex-start',
              marginTop: 4,
              height: 32,
              borderRadius: 'var(--radius-sm)',
              border: `1px solid ${isSelected ? accent : 'var(--border)'}`,
              background: isSelected
                ? `color-mix(in srgb, ${accent} 10%, var(--surface))`
                : 'var(--surface)',
              color: isSelected ? accent : 'var(--text)',
              fontSize: 14,
              fontWeight: 500,
              padding: '0 12px',
              cursor:
                selectionSavingKey === suggestionKey || requiresEmergencyAck
                  ? 'not-allowed'
                  : 'pointer',
              opacity: selectionSavingKey === suggestionKey || requiresEmergencyAck ? 0.6 : 1,
            }}
          >
            {requiresEmergencyAck
              ? 'WAJIB ACK EMERGENCY'
              : selectionSavingKey === suggestionKey
                ? 'MENYIMPAN...'
                : isMustNotMiss
                  ? isSelected
                    ? 'TERPILIH ✓'
                    : 'PILIH DIAGNOSIS KRITIS'
                  : isSelected
                    ? 'TERPILIH ✓'
                    : isReview
                      ? 'PILIH DENGAN ALASAN'
                      : 'PILIH DIAGNOSIS'}
          </button>
        </div>
      </details>
    )
  }

  function renderCdssBranchFlow() {
    const processingAgents = {
      left: [
        { key: 'intake', title: 'THE', subtitle: 'INTAKE AGENT' },
        { key: 'reasoning', title: 'THE', subtitle: 'REASONING AGENT' },
        { key: 'output', title: 'THE', subtitle: 'OUTPUT AGENT' },
      ],
      right: [
        { key: 'mapping', title: 'ICD-10', subtitle: 'SEMANTIC MAPPING' },
        { key: 'path', title: 'CLINICAL PATH', subtitle: 'INTELLIGENCE' },
        { key: 'resource', title: 'RESOURCE-AWARE', subtitle: 'DIAGNOSTICS' },
      ],
    }

    const branchFlowClassName = [
      'cdss-branch-flow',
      showCdssAnimatedBranch ? 'is-processing' : '',
      cdssResult && !cdssLoading ? 'is-result' : '',
    ]
      .filter(Boolean)
      .join(' ')

    const branchCoreClassName = [
      'cdss-branch-core-shell',
      cdssResult && !cdssLoading ? 'is-result' : '',
    ]
      .filter(Boolean)
      .join(' ')
    const showResultScanner = Boolean(cdssResult) && !cdssLoading
    const showProcessingGhost = showCdssAnimatedBranch

    return (
      <div key={cdssBranchFlowKey} className={branchFlowClassName} aria-hidden="true">
        {showResultScanner && (
          <>
            <div className="cdss-branch-scanner" aria-hidden="true">
              <div className="cdss-branch-scanner-title">TRUST LAYER</div>
              <TrustLayerGhost />
            </div>
          </>
        )}
        {showCdssAnimatedBranch && (
          <>
            <div className="cdss-branch-agents cdss-branch-agents-left">
              {processingAgents.left.map((agent, index) => (
                <div
                  key={agent.key}
                  className={`cdss-branch-agent-card cdss-branch-agent-card-left cdss-branch-agent-slot-${index}`}
                >
                  <div className="cdss-branch-agent-icon">{index + 1}</div>
                  <div className="cdss-branch-agent-copy">
                    <span>{agent.title}</span>
                    <strong>{agent.subtitle}</strong>
                  </div>
                </div>
              ))}
            </div>
            <div className="cdss-branch-agents cdss-branch-agents-right">
              {processingAgents.right.map((agent, index) => (
                <div
                  key={agent.key}
                  className={`cdss-branch-agent-card cdss-branch-agent-card-right cdss-branch-agent-slot-${index}`}
                >
                  <div className="cdss-branch-agent-icon">{index + 4}</div>
                  <div className="cdss-branch-agent-copy">
                    <span>{agent.title}</span>
                    <strong>{agent.subtitle}</strong>
                  </div>
                </div>
              ))}
            </div>
          </>
        )}
        <div className={branchCoreClassName}>
          <div className="cdss-branch-core-shadow" />
          <div className="cdss-branch-core-face">
            {cdssLoading || cdssResult ? <CdssCoreLoader /> : null}
          </div>
          <div className="cdss-branch-core-label">ISKANDAR CORE</div>
        </div>
        {showProcessingGhost && (
          <div className="cdss-branch-processing-status" aria-hidden="true">
            <div className="cdss-branch-processing-ghost">
              <TrustLayerGhost script={PROCESSING_SCRIPT} singleLine />
            </div>
          </div>
        )}
        <svg className="cdss-branch-svg" viewBox="0 0 1000 180" preserveAspectRatio="none">
          <defs>
            <marker
              id="cdss-branch-arrow"
              markerWidth="10"
              markerHeight="10"
              refX="8"
              refY="5"
              orient="auto"
              markerUnits="strokeWidth"
            >
              <path d="M0 0 L10 5 L0 10 Z" className="cdss-branch-arrowhead" />
            </marker>
          </defs>
          {showCdssAnimatedBranch ? (
            <>
              <path
                className="cdss-branch-path conduit-inbound"
                d="M168 46 C258 46 336 84 434 92"
              />
              <path
                className="cdss-branch-path conduit-inbound"
                d="M168 92 C258 92 336 92 434 92"
              />
              <path
                className="cdss-branch-path conduit-inbound"
                d="M168 138 C258 138 336 108 434 92"
              />

              <path
                className="cdss-branch-path conduit-outbound"
                d="M566 92 C664 84 742 46 832 46"
              />
              <path
                className="cdss-branch-path conduit-outbound"
                d="M566 92 C664 92 742 92 832 92"
              />
              <path
                className="cdss-branch-path conduit-outbound"
                d="M566 92 C664 108 742 138 832 138"
              />
            </>
          ) : (
            <>
              <path
                className="cdss-branch-path conduit-recommended result-branch result-branch-orb-left"
                d="M478 100 C438 118 304 134 176 146 C176 154 176 166 176 178"
                markerEnd="url(#cdss-branch-arrow)"
              />
              <path
                className="cdss-branch-path conduit-review result-branch result-branch-orb-center"
                d="M500 108 L500 178"
                markerEnd="url(#cdss-branch-arrow)"
              />
              <path
                className="cdss-branch-path conduit-critical result-branch result-branch-orb-right"
                d="M522 100 C562 118 696 134 824 146 C824 154 824 166 824 178"
                markerEnd="url(#cdss-branch-arrow)"
              />
            </>
          )}

          {showCdssAnimatedBranch ? (
            <>
              <circle
                className="cdss-branch-terminal-dot conduit-inbound"
                cx="168"
                cy="46"
                r="4.4"
              />
              <circle
                className="cdss-branch-terminal-dot conduit-inbound"
                cx="168"
                cy="92"
                r="4.4"
              />
              <circle
                className="cdss-branch-terminal-dot conduit-inbound"
                cx="168"
                cy="138"
                r="4.4"
              />
              <circle
                className="cdss-branch-terminal-dot conduit-outbound"
                cx="832"
                cy="46"
                r="4.4"
              />
              <circle
                className="cdss-branch-terminal-dot conduit-outbound"
                cx="832"
                cy="92"
                r="4.4"
              />
              <circle
                className="cdss-branch-terminal-dot conduit-outbound"
                cx="832"
                cy="138"
                r="4.4"
              />
            </>
          ) : null}
        </svg>
      </div>
    )
  }

  // ── TTV Inference — Gate 1: pakai Assist inferVitals + BP_THRESHOLDS ────────

  function inferTTV(overrideKeluhan?: string) {
    const rpdStr = Array.from(rpdSelected).join(' ').toLowerCase()
    const baseComplaint =
      overrideKeluhan ?? keluhanRef.current.utama + ' ' + keluhanRef.current.tambahan
    const complaint = (baseComplaint + ' ' + rpdStr).toLowerCase()
    const isAdultOutpatient = patientAge >= 18
    const respiratoryComplaint = hasRespiratoryComplaint(complaint)

    const contextualAdvice = suggestContextualVitals(complaint, {
      ageYears: patientAge,
      sex: patientGender,
      isPregnant: patientGender === 'P' ? isPregnant : false,
      bodyWeightKg: bodyWeightKg.trim() ? Number(bodyWeightKg) : undefined,
      recentActivity,
      stressState,
      medications: Array.from(medicationFlags),
      measured: {
        pulse: vitals.nadi.trim() ? Number(vitals.nadi) : undefined,
        rr: vitals.napas.trim() ? Number(vitals.napas) : undefined,
        temp: vitals.suhu.trim() ? Number(vitals.suhu) : undefined,
      },
    })

    const newVitals = {
      gcs: vitals.gcs.trim()
        ? vitals.gcs
        : isAdultOutpatient && contextualAdvice.defaults.gcs !== undefined
          ? String(contextualAdvice.defaults.gcs)
          : vitals.gcs,
      td: vitals.td,
      nadi:
        contextualAdvice.values.pulse !== undefined
          ? String(contextualAdvice.values.pulse)
          : vitals.nadi,
      napas:
        contextualAdvice.values.rr !== undefined
          ? String(contextualAdvice.values.rr)
          : vitals.napas,
      suhu:
        contextualAdvice.values.temp !== undefined
          ? String(contextualAdvice.values.temp)
          : vitals.suhu,
      spo2: vitals.spo2.trim()
        ? vitals.spo2
        : isAdultOutpatient && contextualAdvice.defaults.spo2 !== undefined
          ? String(contextualAdvice.defaults.spo2)
          : vitals.spo2,
      map: vitals.map,
    }

    const nextVitalMeta: Record<EmrVitalKey, VitalEntryMeta> = {
      gcs: vitals.gcs.trim()
        ? {
            mode: 'measured',
            confidence: 'high',
            note: 'Nilai GCS berasal dari input manual.',
          }
        : isAdultOutpatient && contextualAdvice.defaults.gcs !== undefined
          ? {
              mode: 'estimated',
              confidence: 'high',
              note: 'Default poli umum dewasa: GCS 15. Verifikasi bila ada perubahan kesadaran.',
            }
          : {
              mode: 'manual_required',
              note: 'GCS harus dinilai langsung di pasien.',
            },
      td: vitals.td.trim()
        ? {
            mode: 'measured',
            confidence: 'high',
            note: 'Tekanan darah berasal dari pengukuran manual.',
          }
        : {
            mode: 'manual_required',
            note: 'Tekanan darah wajib diukur manual sebelum keputusan klinis final.',
          },
      nadi:
        contextualAdvice.metadata.pulse?.source === 'measured'
          ? {
              mode: 'measured',
              confidence: 'high',
              note: 'Nadi berasal dari input manual.',
            }
          : {
              mode: 'estimated',
              confidence: contextualAdvice.metadata.pulse?.confidence ?? 'low',
              note: contextualAdvice.metadata.pulse?.range
                ? `Estimasi awal ${contextualAdvice.metadata.pulse.range.min}-${contextualAdvice.metadata.pulse.range.max} bpm.`
                : 'Estimasi awal, verifikasi dengan pengukuran manual bila memungkinkan.',
            },
      napas:
        contextualAdvice.metadata.rr?.source === 'measured'
          ? {
              mode: 'measured',
              confidence: 'high',
              note: 'Frekuensi napas berasal dari input manual.',
            }
          : {
              mode: 'estimated',
              confidence: contextualAdvice.metadata.rr?.confidence ?? 'low',
              note: contextualAdvice.metadata.rr?.range
                ? `Estimasi awal ${contextualAdvice.metadata.rr.range.min}-${contextualAdvice.metadata.rr.range.max} x/menit.`
                : 'Estimasi awal, verifikasi dengan pengamatan respirasi.',
            },
      suhu:
        contextualAdvice.metadata.temp?.source === 'measured'
          ? {
              mode: 'measured',
              confidence: 'high',
              note: 'Suhu berasal dari input manual.',
            }
          : {
              mode: 'estimated',
              confidence: contextualAdvice.metadata.temp?.confidence ?? 'low',
              note: contextualAdvice.metadata.temp?.range
                ? `Estimasi awal ${contextualAdvice.metadata.temp.range.min.toFixed(1)}-${contextualAdvice.metadata.temp.range.max.toFixed(1)}°C.`
                : 'Estimasi awal, verifikasi dengan termometer.',
            },
      spo2: vitals.spo2.trim()
        ? {
            mode: 'measured',
            confidence: 'high',
            note: 'SpO2 berasal dari pulse oximeter.',
          }
        : isAdultOutpatient && contextualAdvice.defaults.spo2 !== undefined
          ? {
              mode: 'estimated',
              confidence: 'high',
              note: 'Default poli umum dewasa: SpO2 98%. Jika keluhan sesak, wajib ukur manual.',
            }
          : {
              mode: 'manual_required',
              note: respiratoryComplaint
                ? 'Keluhan sesak membuat SpO2 wajib diukur manual.'
                : 'SpO2 tidak aman diestimasi; ukur manual jika alat tersedia.',
            },
      map: vitals.map.trim()
        ? {
            mode: 'measured',
            confidence: 'high',
            note: 'MAP berasal dari input manual atau perhitungan terukur.',
          }
        : {
            mode: 'manual_required',
            note: 'MAP mengikuti tekanan darah terukur; hitung setelah TD tersedia.',
          },
    }

    const fields = (['gcs', 'nadi', 'napas', 'suhu', 'spo2'] as const)
      .filter((field) => newVitals[field] && !vitals[field].trim())
      .slice()
      .sort(() => Math.random() - 0.5)
    const FLASH_DUR = 160 // ms kilat menyala per field
    const STEP_GAP = 200 // ms jarak antar field

    setVitalMeta(nextVitalMeta)

    fields.forEach((field, i) => {
      const t = i * STEP_GAP
      setTimeout(() => setFlashingVital(field), t)
      setTimeout(
        () => setVitals((prev) => ({ ...prev, [field]: newVitals[field] })),
        t + FLASH_DUR / 2
      )
      setTimeout(() => setFlashingVital(null), t + FLASH_DUR)
    })

    if (fields.length === 0) {
      setVitals((prev) => ({ ...prev, ...newVitals }))
    }

    setTimeout(
      () => {
        setHeaderText(
          'EMR Klinis dalam masa pengembangan intensif — khusus penggunaan Retrieval-Augmented Generation Based'
        )
        setHeaderColor('var(--c-asesmen)')
      },
      Math.max(fields.length, 1) * STEP_GAP
    )
  }

  // ── Shared bedside alert evaluation (hard-stop + composite) ─────────────
  useEffect(() => {
    if (!currentEncounterMeasurement) return

    const nextSignature = buildEncounterMeasurementSignature(currentEncounterMeasurement)
    if (!nextSignature || nextSignature === latestEncounterMeasurementSignatureRef.current) {
      return
    }

    const timer = window.setTimeout(() => {
      latestEncounterMeasurementSignatureRef.current = nextSignature
      setEncounterMeasurements((prev) =>
        trimEncounterMeasurements([
          ...prev,
          {
            ...currentEncounterMeasurement,
            measuredAt: new Date().toISOString(),
          },
        ])
      )
    }, 1200)

    return () => window.clearTimeout(timer)
  }, [currentEncounterMeasurement])

  useEffect(() => {
    const nextComposite = evaluateCompositeDeteriorationFromEmrPayload(buildRealtimeAlertPayload())

    setScreeningAlerts(nextComposite.screeningAlerts)
    setCompositeDeterioration(nextComposite)
  }, [
    gulaDarah.nilai,
    isPregnant,
    keluhanTambahan,
    keluhanUtama,
    patientAge,
    patientGender,
    receivedVisitHistory,
    rpdSelected,
    triageSignalContext,
    vitals.gcs,
    vitals.nadi,
    vitals.napas,
    vitals.spo2,
    vitals.suhu,
    vitals.td,
  ])

  // ── Auto-generate skenario klinis ────────────────────────────────────────
  const AUTOGEN_SCENARIOS = {
    hipertensi: {
      label: 'HIPERTENSI',
      keluhan_utama: 'nyeri kepala bagian belakang, tengkuk terasa berat',
      keluhan_tambahan: 'pandangan kadang kabur, riwayat hipertensi sejak 3 tahun',
      vitals: {
        gcs: '15',
        td: '170/100',
        nadi: '88',
        napas: '18',
        suhu: '36.8',
        spo2: '97',
        map: '123',
      },
    },
    hiperglikemi: {
      label: 'HIPERGLIKEMIA',
      keluhan_utama: 'sering buang air kecil, haus terus, badan lemas',
      keluhan_tambahan: 'penurunan berat badan 5 kg dalam 1 bulan, riwayat DM tipe 2',
      vitals: {
        gcs: '15',
        td: '130/85',
        nadi: '92',
        napas: '20',
        suhu: '37.2',
        spo2: '98',
        map: '100',
      },
    },
    hipoglikemi: {
      label: 'HIPOGLIKEMIA',
      keluhan_utama: 'tangan gemetar, keringat dingin, pusing mendadak',
      keluhan_tambahan: 'pasien DM pengguna insulin, telat makan siang, sempat lemas',
      vitals: {
        gcs: '14',
        td: '100/65',
        nadi: '110',
        napas: '22',
        suhu: '36.5',
        spo2: '96',
        map: '77',
      },
    },
  } as const

  function autoFillScenario(key: keyof typeof AUTOGEN_SCENARIOS) {
    // Toggle: klik lagi skenario yang aktif → reset
    if (activeScenario === key) {
      setActiveScenario(null)
      setVitals({
        gcs: '',
        td: '',
        nadi: '',
        napas: '',
        suhu: '',
        spo2: '',
        map: '',
      })
      setVitalMeta(createInitialVitalMeta())
      setHeaderText('SENTRA / PUSKESMAS KEDIRI // RM-BARU // SENAUTO ENGINE: IDLE')
      setHeaderColor('var(--text-muted)')
      return
    }
    const s = AUTOGEN_SCENARIOS[key]
    // Hanya set skenario aktif — vitals diisi oleh Auto TTV
    setActiveScenario(key)
    setHeaderText(`SENTRA // RM-BARU // AUTOGEN: SKENARIO ${s.label} AKTIF — JALANKAN AUTO TTV`)
    setHeaderColor('var(--c-asesmen)')
  }

  const labItems = [
    { name: 'Hematologi Lengkap', status: 'BELUM DIORDER' },
    { name: 'C-Reactive Protein (CRP)', status: 'BELUM DIORDER' },
    { name: 'Foto Thorax AP/PA', status: 'BELUM DIORDER' },
  ]

  const isCritical = (val: string, key: string) => {
    const n = Number.parseFloat(val)
    if (isNaN(n)) return false
    if (key === 'suhu' && n >= 38.0) return true
    if (key === 'spo2' && n < 95) return true
    if (key === 'nadi' && (n > 100 || n < 60)) return true
    return false
  }

  const vitalFields: {
    key: keyof typeof vitals
    label: string
    unit: string
  }[] = [
    { key: 'gcs', label: 'GCS', unit: '/15' },
    { key: 'td', label: 'Tekanan Darah', unit: 'mmHg' },
    { key: 'nadi', label: 'Nadi', unit: 'bpm' },
    { key: 'napas', label: 'Napas', unit: 'x/m' },
    { key: 'suhu', label: 'Suhu', unit: '°C' },
    { key: 'spo2', label: 'SpO2', unit: '%' },
    { key: 'map', label: 'MAP', unit: 'mmHg' },
  ]

  const getVitalMetaLabel = (meta: VitalEntryMeta) => {
    switch (meta.mode) {
      case 'measured':
        return 'MEASURED'
      case 'estimated':
        return meta.confidence ? `EST. ${meta.confidence.toUpperCase()}` : 'ESTIMATED'
      case 'manual_required':
        return 'UKUR MANUAL'
      default:
        return null
    }
  }

  const getVitalMetaClassName = (meta: VitalEntryMeta) => {
    switch (meta.mode) {
      case 'measured':
        return 'v-meta-badge is-measured'
      case 'estimated':
        return 'v-meta-badge is-estimated'
      case 'manual_required':
        return 'v-meta-badge is-manual'
      default:
        return 'v-meta-badge'
    }
  }

  const examFields: { key: keyof typeof exam; label: string }[] = [
    { key: 'kepala', label: 'Kepala & Leher' },
    { key: 'dada', label: 'Dada (Cor & Pulmo)' },
    { key: 'perut', label: 'Perut (Abdomen)' },
    { key: 'ekstremitas', label: 'Ekstremitas' },
    { key: 'kulit', label: 'Kulit' },
    { key: 'genitalia', label: 'Genitalia' },
  ]

  const filledVitals = Object.values(vitals).filter(Boolean).length
  const filledExam = Object.values(exam).filter(Boolean).length
  const progress = Math.round(
    (((keluhanUtama ? 1 : 0) + (keluhanTambahan ? 0.5 : 0) + filledVitals / 7 + filledExam / 6) /
      2.5) *
      100
  )
  const workflowTabs: Array<{
    id: WorkflowTab
    label: string
    role: string
    hint: string
  }> = [
    {
      id: 'triage',
      label: 'Pengkajian Awal',
      role: 'Perawat / Tenaga Klinis Lain',
      hint: 'Keluhan utama, TTV, objektif awal',
    },
    {
      id: 'review',
      label: 'Anamnesa',
      role: 'Dokter',
      hint: 'RPS, Audrey, riwayat, penunjang',
    },
    {
      id: 'assessment',
      label: 'Asesmen',
      role: 'Dokter',
      hint: 'Iskandar, differential, keputusan klinis',
    },
    {
      id: 'finalize',
      label: 'Tata Laksana',
      role: 'Dokter',
      hint: 'Terapi, edukasi, rujukan, sign-off',
    },
  ]
  const isTriageTab = workflowTab === 'triage'
  const isReviewTab = workflowTab === 'review'
  const isAssessmentTab = workflowTab === 'assessment'
  const isFinalizeTab = workflowTab === 'finalize'
  const showIntakeSection = isTriageTab || isReviewTab
  const showWorkupSection = isTriageTab || isReviewTab
  const showDecisionSection = isAssessmentTab || isFinalizeTab
  const highlightReviewHandoff = workflowTab === 'review'
  const canAutoAssistExam = Boolean(
    keluhanUtama.trim() ||
    keluhanTambahan.trim() ||
    pemeriksaanFisikUsulan.trim() ||
    clinicalChain?.pemeriksaan.fisik.length
  )
  const prognosisVitals = useMemo(
    () => ({
      sbp: Number.parseInt(vitals.td.split('/')[0]) || 0,
      dbp: Number.parseInt(vitals.td.split('/')[1]) || 0,
      hr: Number.parseFloat(vitals.nadi) || 0,
      rr: Number.parseFloat(vitals.napas) || 0,
      temp: Number.parseFloat(vitals.suhu) || 0,
      glucose: Number.parseFloat(gulaDarah.nilai) || 0,
      spo2: Number.parseFloat(vitals.spo2) || 0,
    }),
    [gulaDarah.nilai, vitals.nadi, vitals.napas, vitals.spo2, vitals.suhu, vitals.td]
  )

  return (
    <div
      className="emr-page"
      style={{
        width: '100%',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'flex-start',
      }}
    >
      <div
        className="architecture-grid"
        style={{ gridTemplateColumns: '1fr', gap: 'var(--gap-xl)', maxWidth: 1400 }}
      >
        {/* ── Assist Incoming Consult Banner ── */}
        {incomingConsult && (
          <div
            style={{
              width: '100%',
              padding: '16px 24px',
              background: 'var(--accent-tint)',
              borderLeft: '2px solid var(--accent)',
              borderRadius: '0 var(--radius-md) var(--radius-md) 0',
              display: 'flex',
              alignItems: 'center',
              gap: 16,
            }}
          >
            <div style={{ flex: 1 }}>
              <div
                style={{
                  color: 'var(--accent)',
                  fontWeight: 600,
                  fontSize: 12,
                  marginBottom: 4,
                }}
              >
                ● KONSULT MASUK DARI ASSIST
              </div>
              <div style={{ color: 'var(--text)', fontWeight: 600, fontSize: 14 }}>
                {incomingConsult.patient.name}
                {incomingConsult.patient.rm ? ` · RM ${incomingConsult.patient.rm}` : ''}
                {incomingConsult.patient.age ? ` · ${incomingConsult.patient.age} thn` : ''}
              </div>
              <div style={{ color: 'var(--text-secondary)', fontSize: 14, marginTop: 2 }}>
                {incomingConsult.keluhan_utama}
              </div>
              {incomingConsult.mira_differential && (
                <div style={{ marginTop: 10 }}>
                  <MiraDifferentialCard differential={incomingConsult.mira_differential} />
                </div>
              )}
            </div>
            <div style={{ display: 'flex', gap: 8 }}>
              <button
                onClick={async () => {
                  if (!incomingConsult) return
                  const snapshot = incomingConsult
                  setIncomingConsult(null)
                  try {
                    const res = await fetch('/api/consult/accept', {
                      method: 'POST',
                      headers: { 'Content-Type': 'application/json' },
                      body: JSON.stringify({ consultId: snapshot.consultId, consult: snapshot }),
                    })
                    const data = (await res.json()) as {
                      ok: boolean
                      visitHistory?: ConsultVisitRecord[]
                    }
                    const history = data.visitHistory ?? []
                    setAcceptedConsult({
                      consult: snapshot,
                      acceptedAt: new Date().toISOString(),
                      visitHistory: history,
                    })
                    injectAssistConsultToTriage(snapshot, history)
                  } catch {
                    setAcceptedConsult({
                      consult: snapshot,
                      acceptedAt: new Date().toISOString(),
                      visitHistory: [],
                    })
                    injectAssistConsultToTriage(snapshot, [])
                  }
                }}
                className="ui-btn ui-btn--primary ui-btn--sm"
              >
                ✓ ACCEPT
              </button>
              <button
                onClick={async () => {
                  if (!incomingConsult) return
                  await fetch('/api/consult/reject', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ consultId: incomingConsult.consultId }),
                  }).catch(() => {})
                  setIncomingConsult(null)
                }}
                className="ui-btn ui-btn--secondary ui-btn--sm"
              >
                ✕ REJECT
              </button>
            </div>
          </div>
        )}

        {/* ── Accepted Consult RME Panel ── */}
        {acceptedConsult &&
          (() => {
            const { consult: ac, acceptedAt, visitHistory } = acceptedConsult
            const news2 = ac.canonical_clinical?.news2
            const trajectory = ac.canonical_clinical?.trajectory
            const immediateActions = ac.canonical_clinical?.immediate_actions ?? []
            const antro = ac.anthropometrics ?? {}
            const news2Color = !news2
              ? 'var(--text-secondary)'
              : news2.risk_level === 'high'
                ? 'var(--critical)'
                : news2.risk_level === 'medium'
                  ? 'var(--warning)'
                  : news2.risk_level === 'low-medium'
                    ? 'var(--warning)'
                    : 'var(--success)'
            const trajColor = !trajectory?.overall_risk
              ? 'var(--text-secondary)'
              : trajectory.overall_risk === 'critical'
                ? 'var(--critical)'
                : trajectory.overall_risk === 'high'
                  ? 'var(--warning)'
                  : trajectory.overall_risk === 'moderate'
                    ? 'var(--warning)'
                    : 'var(--success)'
            const cell: React.CSSProperties = {
              padding: '6px 10px',
              borderBottom: '1px solid var(--border)',
              fontSize: 14,
            }
            const label: React.CSSProperties = {
              color: 'var(--text-secondary)',
              fontSize: 12,
              fontWeight: 500,
            }
            const value: React.CSSProperties = { color: 'var(--text)', fontWeight: 600 }

            return (
              <div
                style={{
                  width: '100%',
                  marginBottom: 24,
                  background: 'var(--surface)',
                  border: '1px solid var(--border)',
                  borderRadius: 'var(--radius-lg)',
                  overflow: 'hidden',
                }}
              >
                {/* Header */}
                <div
                  style={{
                    padding: '12px 20px',
                    background: 'var(--success-tint)',
                    borderBottom: '1px solid var(--border)',
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                  }}
                >
                  <div>
                    <div
                      style={{
                        color: 'var(--success)',
                        fontWeight: 600,
                        fontSize: 12,
                        marginBottom: 2,
                      }}
                    >
                      ✓ DATA RME PASIEN — DARI ASSIST
                    </div>
                    <div style={{ color: 'var(--text)', fontWeight: 600, fontSize: 16 }}>
                      {ac.patient.name}
                      {ac.patient.rm ? (
                        <span style={{ color: 'var(--text-secondary)', fontWeight: 400, fontSize: 14 }}>
                          {' '}
                          · RM {ac.patient.rm}
                        </span>
                      ) : null}
                      {ac.patient.age ? (
                        <span style={{ color: 'var(--text-secondary)', fontWeight: 400, fontSize: 14 }}>
                          {' '}
                          · {ac.patient.age} thn
                        </span>
                      ) : null}
                      {ac.patient.gender ? (
                        <span style={{ color: 'var(--text-secondary)', fontWeight: 400, fontSize: 14 }}>
                          {' '}
                          · {ac.patient.gender}
                        </span>
                      ) : null}
                    </div>
                    {ac.patient.bpjsStatus ? (
                      <div style={{ color: 'var(--text-secondary)', fontSize: 12, marginTop: 2 }}>
                        BPJS: {ac.patient.bpjsStatus}
                      </div>
                    ) : null}
                    {ac.clinical_context?.facility_name ? (
                      <div style={{ color: 'var(--text-secondary)', fontSize: 12 }}>
                        Faskes: {ac.clinical_context.facility_name}
                      </div>
                    ) : null}
                  </div>
                  <div style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
                    {news2 && (
                      <div
                        style={{
                          textAlign: 'center',
                          padding: '6px 12px',
                          border: `1px solid ${news2Color}`,
                          borderRadius: 6,
                        }}
                      >
                        <div style={{ color: news2Color, fontWeight: 600, fontSize: 20 }}>
                          {news2.score}
                        </div>
                        <div style={{ color: news2Color, fontSize: 12, fontWeight: 600 }}>
                          NEWS2
                        </div>
                        <div style={{ color: news2Color, fontSize: 12 }}>
                          {news2.risk_level.toUpperCase()}
                        </div>
                      </div>
                    )}
                    {ac.avpu && (
                      <div
                        style={{
                          textAlign: 'center',
                          padding: '6px 12px',
                          border: '1px solid var(--border)',
                          borderRadius: 6,
                        }}
                      >
                        <div style={{ color: 'var(--text)', fontWeight: 600, fontSize: 20 }}>
                          {ac.avpu}
                        </div>
                        <div style={{ color: 'var(--text-secondary)', fontSize: 12 }}>AVPU</div>
                      </div>
                    )}
                    <button
                      onClick={() => setAcceptedConsult(null)}
                      className="ui-btn ui-btn--ghost ui-btn--sm"
                    >
                      ✕ Dismiss
                    </button>
                  </div>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 0 }}>
                  {/* Kolom 1 — TTV */}
                  <div
                    style={{ borderRight: '1px solid var(--border)', padding: '12px 0' }}
                  >
                    <div style={{ ...label, padding: '0 12px 8px' }}>Tanda Vital</div>
                    {[
                      ['TD', ac.ttv.sbp && ac.ttv.dbp ? `${ac.ttv.sbp}/${ac.ttv.dbp} mmHg` : '—'],
                      ['HR', ac.ttv.hr ? `${ac.ttv.hr} bpm` : '—'],
                      ['RR', ac.ttv.rr ? `${ac.ttv.rr} x/mnt` : '—'],
                      ['Suhu', ac.ttv.temp ? `${ac.ttv.temp} °C` : '—'],
                      ['SpO₂', ac.ttv.spo2 ? `${ac.ttv.spo2}%` : '—'],
                      ['GDS', ac.ttv.glucose ? `${ac.ttv.glucose} mg/dL` : '—'],
                    ].map(([k, v]) => (
                      <div
                        key={k}
                        style={{
                          ...cell,
                          display: 'flex',
                          justifyContent: 'space-between',
                          padding: '5px 12px',
                        }}
                      >
                        <span style={label}>{k}</span>
                        <span style={value}>{v}</span>
                      </div>
                    ))}
                    {antro.tinggi || antro.berat ? (
                      <>
                        <div
                          style={{
                            ...label,
                            padding: '10px 12px 6px',
                            borderTop: '1px solid var(--border)',
                          }}
                        >
                          Antropometrik
                        </div>
                        {[
                          ['TB', antro.tinggi ? `${antro.tinggi} cm` : '—'],
                          ['BB', antro.berat ? `${antro.berat} kg` : '—'],
                          ['IMT', antro.imt ? `${antro.imt} (${antro.hasil_imt ?? ''})` : '—'],
                          ['L. Perut', antro.lingkar_perut ? `${antro.lingkar_perut} cm` : '—'],
                        ].map(([k, v]) => (
                          <div
                            key={k}
                            style={{
                              ...cell,
                              display: 'flex',
                              justifyContent: 'space-between',
                              padding: '5px 12px',
                            }}
                          >
                            <span style={label}>{k}</span>
                            <span style={value}>{v as string}</span>
                          </div>
                        ))}
                      </>
                    ) : null}
                  </div>

                  {/* Kolom 2 — Klinis */}
                  <div style={{ borderRight: '1px solid var(--border)', padding: '12px' }}>
                    <div style={label}>Keluhan Utama</div>
                    <div
                      style={{
                        color: 'var(--text)',
                        fontSize: 14,
                        marginTop: 4,
                        marginBottom: 10,
                        lineHeight: 1.5,
                      }}
                    >
                      {ac.keluhan_utama}
                    </div>
                    {ac.keluhan_tambahan && (
                      <>
                        <div style={label}>Keluhan Tambahan</div>
                        <div
                          style={{
                            color: 'var(--text)',
                            fontSize: 14,
                            marginTop: 4,
                            marginBottom: 10,
                            lineHeight: 1.5,
                          }}
                        >
                          {ac.keluhan_tambahan}
                        </div>
                      </>
                    )}
                    {(ac.penyakit_kronis ?? []).length > 0 && (
                      <>
                        <div style={label}>Penyakit Kronis</div>
                        <div
                          style={{
                            marginTop: 4,
                            marginBottom: 10,
                            display: 'flex',
                            flexWrap: 'wrap',
                            gap: 4,
                          }}
                        >
                          {(ac.penyakit_kronis ?? []).map((p, i) => (
                            <span
                              key={i}
                              style={{
                                background: 'var(--critical-tint)',
                                border: '1px solid transparent',
                                color: 'var(--critical)',
                                borderRadius: 'var(--radius-full)',
                                padding: '2px 8px',
                                fontSize: 12,
                              }}
                            >
                              {p}
                            </span>
                          ))}
                        </div>
                      </>
                    )}
                    {(ac.risk_factors ?? []).length > 0 && (
                      <>
                        <div style={label}>Faktor Risiko</div>
                        <div
                          style={{
                            marginTop: 4,
                            marginBottom: 10,
                            display: 'flex',
                            flexWrap: 'wrap',
                            gap: 4,
                          }}
                        >
                          {(ac.risk_factors ?? []).map((r, i) => (
                            <span
                              key={i}
                              style={{
                                background: 'var(--warning-tint)',
                                border: '1px solid transparent',
                                color: 'var(--warning)',
                                borderRadius: 'var(--radius-full)',
                                padding: '2px 8px',
                                fontSize: 12,
                              }}
                            >
                              {r}
                            </span>
                          ))}
                        </div>
                      </>
                    )}
                    {(ac.alergi ?? []).length > 0 && (
                      <>
                        <div style={label}>Alergi</div>
                        <div
                          style={{ color: 'var(--critical)', fontSize: 14, marginTop: 4, marginBottom: 10 }}
                        >
                          {(ac.alergi ?? []).join(', ')}
                        </div>
                      </>
                    )}
                    {ac.status_kehamilan === 'hamil' && (
                      <div
                        style={{
                          marginTop: 4,
                          padding: '4px 8px',
                          background: 'var(--primary-tint)',
                          border: '1px solid transparent',
                          borderRadius: 4,
                          color: 'var(--primary)',
                          fontSize: 12,
                        }}
                      >
                        Status: Hamil
                        {ac.clinical_context?.pregnancy_risk
                          ? ` — ${ac.clinical_context.pregnancy_risk}`
                          : ''}
                      </div>
                    )}
                  </div>

                  {/* Kolom 3 — Clinical Intelligence */}
                  <div style={{ padding: '12px' }}>
                    {trajectory && (
                      <>
                        <div style={label}>Trajectory</div>
                        <div
                          style={{
                            marginTop: 6,
                            marginBottom: 10,
                            padding: '8px 10px',
                            background: 'var(--surface-subtle)',
                            borderRadius: 6,
                            border: `1px solid color-mix(in srgb, ${trajColor} 19%, transparent)`,
                          }}
                        >
                          <div style={{ display: 'flex', gap: 8, marginBottom: 6 }}>
                            {trajectory.overall_risk && (
                              <span style={{ color: trajColor, fontWeight: 600, fontSize: 12 }}>
                                {trajectory.overall_risk.toUpperCase()}
                              </span>
                            )}
                            {trajectory.deterioration_state && (
                              <span style={{ color: 'var(--text-secondary)', fontSize: 12 }}>
                                · {trajectory.deterioration_state}
                              </span>
                            )}
                            {trajectory.overall_trend && (
                              <span style={{ color: 'var(--text-secondary)', fontSize: 12 }}>
                                · {trajectory.overall_trend}
                              </span>
                            )}
                          </div>
                          {trajectory.narrative && (
                            <div style={{ color: 'var(--text-secondary)', fontSize: 12, lineHeight: 1.5 }}>
                              {trajectory.narrative}
                            </div>
                          )}
                        </div>
                      </>
                    )}
                    {news2 && (news2.drivers ?? []).length > 0 && (
                      <>
                        <div style={label}>NEWS2 Drivers</div>
                        <div
                          style={{
                            marginTop: 4,
                            marginBottom: 10,
                            display: 'flex',
                            flexWrap: 'wrap',
                            gap: 4,
                          }}
                        >
                          {news2.drivers.map((d, i) => (
                            <span
                              key={i}
                              style={{
                                background: `color-mix(in srgb, ${news2Color} 8%, transparent)`,
                                border: `1px solid color-mix(in srgb, ${news2Color} 25%, transparent)`,
                                color: news2Color,
                                borderRadius: 'var(--radius-full)',
                                padding: '2px 8px',
                                fontSize: 12,
                              }}
                            >
                              {d}
                            </span>
                          ))}
                        </div>
                      </>
                    )}
                    {ac.mira_differential && (
                      <MiraDifferentialCard differential={ac.mira_differential} />
                    )}
                    {immediateActions.length > 0 && (
                      <>
                        <div style={label}>Tindakan Segera</div>
                        <ul style={{ marginTop: 4, marginBottom: 10, paddingLeft: 16 }}>
                          {immediateActions.map((a, i) => (
                            <li key={i} style={{ color: 'var(--warning)', fontSize: 12, marginBottom: 3 }}>
                              {a}
                            </li>
                          ))}
                        </ul>
                      </>
                    )}
                    {ac.clinical_context?.special_conditions &&
                      ac.clinical_context.special_conditions.length > 0 && (
                        <>
                          <div style={label}>Kondisi Khusus</div>
                          <div style={{ marginTop: 4, display: 'flex', flexWrap: 'wrap', gap: 4 }}>
                            {ac.clinical_context.special_conditions.map((s, i) => (
                              <span
                                key={i}
                                style={{
                                  background: 'var(--surface-subtle)',
                                  border: '1px solid var(--border)',
                                  color: 'var(--text-secondary)',
                                  borderRadius: 'var(--radius-full)',
                                  padding: '2px 8px',
                                  fontSize: 12,
                                }}
                              >
                                {s}
                              </span>
                            ))}
                          </div>
                        </>
                      )}
                    <div style={{ color: 'var(--text-secondary)', fontSize: 12, marginTop: 12 }}>
                      Diterima:{' '}
                      {new Date(acceptedAt).toLocaleTimeString('id-ID', {
                        hour: '2-digit',
                        minute: '2-digit',
                      })}
                    </div>
                  </div>
                </div>

                {/* Riwayat Kunjungan Sebelumnya */}
                {visitHistory.length > 0 && (
                  <div
                    style={{ borderTop: '1px solid var(--border)', padding: '12px 16px' }}
                  >
                    <div style={{ ...label, marginBottom: 8 }}>
                      Riwayat Kunjungan via Assist ({visitHistory.length} kunjungan terakhir)
                    </div>
                    <div style={{ overflowX: 'auto' }}>
                      <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12 }}>
                        <thead>
                          <tr style={{ borderBottom: '1px solid var(--border)' }}>
                            {[
                              'Tanggal',
                              'Keluhan',
                              'TD',
                              'HR',
                              'GDS',
                              'SpO₂',
                              'Suhu',
                              'Penyakit Kronis',
                            ].map((h) => (
                              <th
                                key={h}
                                style={{ ...label, padding: '4px 8px', textAlign: 'left' as const }}
                              >
                                {h}
                              </th>
                            ))}
                          </tr>
                        </thead>
                        <tbody>
                          {visitHistory.map((v, i) => (
                            <tr
                              key={v.consultId}
                              style={{
                                borderBottom: '1px solid var(--border)',
                                background: i % 2 === 0 ? 'transparent' : 'var(--surface-subtle)',
                              }}
                            >
                              <td
                                style={{ ...cell, color: 'var(--text-secondary)', whiteSpace: 'nowrap' as const }}
                              >
                                {new Date(v.sentAt).toLocaleDateString('id-ID', {
                                  day: '2-digit',
                                  month: 'short',
                                  year: 'numeric',
                                })}
                              </td>
                              <td
                                style={{
                                  ...cell,
                                  maxWidth: 180,
                                  overflow: 'hidden',
                                  textOverflow: 'ellipsis',
                                  whiteSpace: 'nowrap' as const,
                                  color: 'var(--text)',
                                }}
                              >
                                {v.keluhanUtama || '—'}
                              </td>
                              <td style={cell}>
                                <span style={value}>
                                  {v.ttv.sbp && v.ttv.dbp ? `${v.ttv.sbp}/${v.ttv.dbp}` : '—'}
                                </span>
                              </td>
                              <td style={cell}>
                                <span style={value}>{v.ttv.hr || '—'}</span>
                              </td>
                              <td style={cell}>
                                <span style={value}>{v.ttv.glucose || '—'}</span>
                              </td>
                              <td style={cell}>
                                <span style={value}>{v.ttv.spo2 ? `${v.ttv.spo2}%` : '—'}</span>
                              </td>
                              <td style={cell}>
                                <span style={value}>{v.ttv.temp ? `${v.ttv.temp}°C` : '—'}</span>
                              </td>
                              <td style={{ ...cell, color: 'var(--critical)', fontSize: 12 }}>
                                {v.penyakitKronis.join(', ') || '—'}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                )}
                {visitHistory.length === 0 && ac.patient.rm && (
                  <div
                    style={{
                      borderTop: '1px solid var(--border)',
                      padding: '10px 16px',
                      color: 'var(--text-secondary)',
                      fontSize: 12,
                    }}
                  >
                    Tidak ada riwayat kunjungan sebelumnya via Assist untuk RM {ac.patient.rm}
                  </div>
                )}
              </div>
            )
          })()}

        <div className="page-header">
          <div className="emr-page-head-row">
            <div>
              <div className="page-title">EMR Klinis</div>
              <div className="page-subtitle">
                Workflow klinis terintegrasi untuk Retrieval-Augmented Generation Based
              </div>
            </div>
          </div>
        </div>

        {triageReceived && (
          <div
            onClick={() => setTriageReceived(false)}
            style={{
              background: 'var(--primary-tint)',
              borderLeft: '2px solid var(--primary)',
              borderRadius: '0 var(--radius-md) var(--radius-md) 0',
              padding: '12px 16px',
              cursor: 'pointer',
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
            }}
          >
            <span style={{ fontSize: 14, color: 'var(--primary)', fontWeight: 600 }}>
              Data triase diterima dari perawat — keluhan & TTV sudah terisi otomatis
            </span>
            <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>klik untuk tutup</span>
          </div>
        )}

        <div className="emr-workflow-tabs" role="tablist" aria-label="Workflow EMR Klinis">
          {workflowTabs.map((tab) => {
            const isActive = workflowTab === tab.id
            const isEmergencyLocked =
              emergencyOverride.overrideActive && tab.id !== emergencyOverride.requiredWorkflowTab
            return (
              <button
                key={tab.id}
                type="button"
                role="tab"
                aria-selected={isActive}
                aria-disabled={isEmergencyLocked}
                className={`emr-workflow-tab${isActive ? ' is-active' : ''}${isEmergencyLocked ? ' is-emergency-locked' : ''}`}
                onClick={() => {
                  if (isEmergencyLocked) {
                    setActiveViewPhase('row1')
                    setWorkflowTab('triage')
                    return
                  }

                  setWorkflowTab(tab.id)
                }}
              >
                <span className="emr-workflow-tab-role">{tab.role}</span>
                <span>{tab.label}</span>
                <span className="emr-workflow-tab-hint">{tab.hint}</span>
              </button>
            )
          })}
        </div>
        <div className="emr-workflow-note">
          {isTriageTab
            ? 'Pengkajian awal oleh perawat: keluhan utama, RPS singkat, tanda-tanda vital, dan data objektif awal sebelum pasien bertemu dokter.'
            : isReviewTab
              ? 'Anamnesa dokter (Subjektif): riwayat perjalanan penyakit, riwayat penyakit dahulu, sosial, keluarga, dan pemeriksaan lanjutan.'
              : isAssessmentTab
                ? 'Asesmen klinis (Objektif + Asesmen): pemeriksaan fisik, Iskandar CDSS, differential diagnosis, dan keputusan klinis.'
                : 'Tata laksana (Plan): terapi, edukasi pasien, monitoring, dan rencana rujukan bila diperlukan.'}
        </div>

        {/* ─── Left: Clinical Stream ─── */}
        <div ref={clinicalStreamRef} className="clinical-stream" style={{ maxWidth: '100%' }}>

          <section
            ref={row1SectionRef}
            className={emergencyOverride.phaseClassNames.row1}
            style={{ display: emergencyOverride.overrideActive || showIntakeSection ? undefined : 'none' }}
          >
            {emergencyOverride.overrideActive && (
              <div
                className="emr-emergency-override-banner"
                role="alert"
                aria-live="assertive"
                aria-atomic="true"
                data-metric="emr_emergency_override"
                data-slo="ack-before-clear"
              >
                <span className="emr-emergency-override-kicker">Emergency Override</span>
                <strong>Fokus klinis dikunci ke Row 1 sampai ACK selesai.</strong>
                <span>
                  {emergencyOverride.emergencyReasonLabels.length > 0
                    ? emergencyOverride.emergencyReasonLabels.join(' | ')
                    : 'Red flag emergency aktif'}{' '}
                  - checklist keselamatan wajib dikonfirmasi dokter.
                </span>
              </div>
            )}

            {/* Patient Profile Context Bar */}
            <div className="emr-context-bar">
              <div className="emr-context-segment">
                <span className="emr-context-label">UMUR</span>
                <input
                  id="patient-age"
                  name="patient-age"
                  type="number"
                  value={patientAge}
                  onChange={(e) => setPatientAge(Number.parseInt(e.target.value) || 0)}
                  className="ui-input"
                  style={{ width: 72, height: 32, textAlign: 'center' }}
                />
                <span style={{ fontSize: 14, color: 'var(--text-secondary)' }}>thn</span>
              </div>
              <div className="emr-context-segment">
                <span className="emr-context-label">GENDER</span>
                <div style={{ display: 'flex', gap: 8 }}>
                  {(['L', 'P'] as const).map((g) => (
                    <button
                      key={g}
                      onClick={() => {
                        setPatientGender(g)
                        if (g === 'L') setIsPregnant(false)
                      }}
                      aria-pressed={patientGender === g}
                      className="ui-chip"
                    >
                      {g === 'L' ? 'Laki-laki' : 'Perempuan'}
                    </button>
                  ))}
                </div>
              </div>
              <div className="emr-context-segment">
                <span className="emr-context-label">HAMIL</span>
                <label
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 6,
                    cursor: patientGender === 'P' ? 'pointer' : 'not-allowed',
                    opacity: patientGender === 'P' ? 1 : 0.45,
                  }}
                >
                  <input
                    id="is-pregnant"
                    name="is-pregnant"
                    type="checkbox"
                    checked={patientGender === 'P' ? isPregnant : false}
                    disabled={patientGender !== 'P'}
                    onChange={(e) => setIsPregnant(e.target.checked)}
                  />
                  <span style={{ fontSize: 14, color: 'var(--text)' }}>Sedang hamil</span>
                </label>
              </div>
            </div>

            {/* 01. Anamnesa */}
            <div style={{ display: 'flex', gap: 24, alignItems: 'flex-start' }}>
              <div className="stream-section" style={{ flex: 1, minWidth: 0 }}>
                <div className="section-title">Anamnesa</div>
                <div className="blueprint-wrapper">
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <span className="data-label" style={{ flex: 1 }}>
                      Keluhan Utama
                    </span>
                    {audreySTT.isSupported && (
                      <AudreyMicButton
                        state={audreySTT.state}
                        onPress={audreySTT.state === 'listening' ? audreySTT.stop : audreySTT.start}
                      />
                    )}
                  </div>
                  <div className="patient-narrative" style={{ position: 'relative' }}>
                    <span
                      className="input-draft"
                      style={{
                        borderColor: draftBorderColor,
                        display: 'block',
                      }}
                    >
                      <input
                        id="keluhan-utama"
                        name="keluhan-utama"
                        type="text"
                        value={keluhanUtama}
                        onChange={(e) => {
                          const val = sanitizeClinicalInput(e.target.value)
                          keluhanRef.current.utama = val
                          setKeluhanUtama(val)
                          if (!val.trim()) {
                            setKeluhanAsli('')
                            setAnamnesaEntities({
                              utama: '',
                              onset: '',
                              faktor: '',
                            })
                          }
                          triggerAutocomplete(val)
                        }}
                        placeholder="contoh: demam, batuk, nyeri pinggang"
                        style={{
                          background: 'transparent',
                          border: 'none',
                          outline: 'none',
                          fontSize: 'inherit',
                          fontWeight: 400,
                          color: keluhanUtama ? 'var(--text-main)' : 'var(--text-muted)',
                          width: '100%',
                          padding: 0,
                          display: 'block',
                        }}
                      />
                    </span>
                    {/* STT interim preview */}
                    {sttInterimPreview && (
                      <div
                        style={{
                          fontSize: 12,
                          color: 'var(--text-secondary)',
                          fontStyle: 'italic',
                          marginTop: 4,
                          opacity: 0.8,
                        }}
                      >
                        {sttInterimPreview}...
                      </div>
                    )}
                    {/* Clinical Chain Panel */}
                    <div style={{ marginTop: 16 }}>
                      {clinicalChain ? (
                        <div
                          style={{
                            display: 'flex',
                            flexDirection: 'column',
                            gap: 16,
                          }}
                        >
                          {/* ── GRID 3 KOLOM (COLLAPSIBLE): SIFAT · LOKASI · PENYERTA+BAHAYA ── */}
                          {(clinicalChain.sifat.narasi.length > 0 ||
                            clinicalChain.lokasi.length > 0 ||
                            clinicalChain.logical_chain.length > 0 ||
                            clinicalChain.red_flags.length > 0) && (
                            <div
                              style={{
                                display: 'grid',
                                gridTemplateColumns: '1fr 1fr 1fr',
                                gap: 0,
                                alignItems: 'start',
                                border: '1px solid var(--border)',
                                borderRadius: 'var(--radius-md)',
                              }}
                            >
                              {/* Kolom 1 — SIFAT */}
                              <div
                                style={{
                                  borderRight: '1px solid var(--line-base)',
                                }}
                              >
                                <div
                                  onClick={() => setSifatOpen(!sifatOpen)}
                                  style={{
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: 8,
                                    padding: '10px 16px',
                                    cursor: 'pointer',
                                    userSelect: 'none',
                                  }}
                                >
                                  <span
                                    style={{
                                      fontSize: 12,
                                      color: 'var(--text-muted)',
                                    }}
                                  >
                                    {sifatOpen ? '▼' : '▶'}
                                  </span>
                                  <span
                                    style={{
                                      fontSize: 12,
                                      color: 'var(--text-muted)',
                                      flexShrink: 0,
                                    }}
                                  >
                                    Sifat
                                  </span>
                                  <div
                                    style={{
                                      display: 'flex',
                                      gap: 2,
                                      marginLeft: 'auto',
                                    }}
                                  >
                                    {(['narasi', 'formal', 'klinis'] as const).map((tab) => {
                                      const isActive = activeSifatTab === tab
                                      return (
                                        <button
                                          key={tab}
                                          onClick={(e) => {
                                            e.stopPropagation()
                                            if (!isActive) setActiveSifatTab(tab)
                                          }}
                                          style={{
                                            fontSize: 12,
                                            padding: '2px 8px',
                                            border: 'none',
                                            borderRadius: 'var(--radius-full)',
                                            cursor: isActive ? 'default' : 'pointer',
                                            background: isActive
                                              ? 'var(--primary-tint)'
                                              : 'transparent',
                                            color: isActive ? 'var(--primary)' : 'var(--text-secondary)',
                                            transition: 'background 0.2s, color 0.2s',
                                          }}
                                        >
                                          {tab}
                                        </button>
                                      )
                                    })}
                                  </div>
                                </div>
                                <div
                                  className={`clinical-reveal-panel${sifatOpen ? ' is-open' : ''}`}
                                  style={{ maxHeight: sifatOpen ? 400 : 0 }}
                                >
                                  <div
                                    key={sifatKey}
                                    style={{
                                      display: 'flex',
                                      flexDirection: 'column',
                                      gap: 9,
                                      padding: '0 16px 14px',
                                      borderTop: '1px solid var(--line-base)',
                                      paddingTop: 10,
                                    }}
                                  >
                                    {(clinicalChain.sifat[activeSifatTab] ?? []).map((s, i) => (
                                      <span
                                        key={`${activeSifatTab}-${s}`}
                                        onMouseDown={() => appendToRps(s)}
                                        style={{
                                          fontSize: 14,
                                          color: 'var(--text-main)',
                                          cursor: 'pointer',
                                          animation: `fadeSlideIn 0.4s ease both`,
                                          animationDelay: `${i * 80}ms`,
                                        }}
                                      >
                                        {s}
                                      </span>
                                    ))}
                                  </div>
                                </div>
                              </div>

                              {/* Kolom 2 — LOKASI */}
                              <div
                                style={{
                                  borderRight: '1px solid var(--line-base)',
                                }}
                              >
                                <div
                                  onClick={() => setLokasiOpen(!lokasiOpen)}
                                  style={{
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: 8,
                                    padding: '10px 16px',
                                    cursor: 'pointer',
                                    userSelect: 'none',
                                  }}
                                >
                                  <span
                                    style={{
                                      fontSize: 12,
                                      color: 'var(--text-muted)',
                                    }}
                                  >
                                    {lokasiOpen ? '▼' : '▶'}
                                  </span>
                                  <span
                                    style={{
                                      fontSize: 12,
                                      color: 'var(--text-muted)',
                                      flexShrink: 0,
                                    }}
                                  >
                                    Lokasi
                                  </span>
                                </div>
                                <div
                                  className={`clinical-reveal-panel${lokasiOpen ? ' is-open' : ''}`}
                                  style={{ maxHeight: lokasiOpen ? 400 : 0 }}
                                >
                                  <div
                                    style={{
                                      display: 'flex',
                                      flexDirection: 'column',
                                      gap: 9,
                                      padding: '0 16px 14px',
                                      borderTop: '1px solid var(--line-base)',
                                      paddingTop: 10,
                                    }}
                                  >
                                    {clinicalChain.lokasi.map((loc, i) => (
                                      <span
                                        key={loc}
                                        onMouseDown={() => appendToRps(loc)}
                                        style={{
                                          fontSize: 14,
                                          color: 'var(--text-main)',
                                          cursor: 'pointer',
                                          animation: `fadeSlideIn 0.4s ease both`,
                                          animationDelay: `${i * 80}ms`,
                                        }}
                                      >
                                        {loc}
                                      </span>
                                    ))}
                                  </div>
                                </div>
                              </div>

                              {/* Kolom 3 — PENYERTA + BAHAYA */}
                              <div>
                                <div
                                  onClick={() => setPenyertaOpen(!penyertaOpen)}
                                  style={{
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: 8,
                                    padding: '10px 16px',
                                    cursor: 'pointer',
                                    userSelect: 'none',
                                  }}
                                >
                                  <span
                                    style={{
                                      fontSize: 12,
                                      color: 'var(--text-muted)',
                                    }}
                                  >
                                    {penyertaOpen ? '▼' : '▶'}
                                  </span>
                                  <div style={{ display: 'flex', gap: 2 }}>
                                    {(['penyerta', 'bahaya'] as const).map((tab) => {
                                      const isActive = activeChainTab === tab
                                      const label = tab === 'penyerta' ? 'Penyerta' : '⚠ Bahaya'
                                      const activeColor =
                                        tab === 'bahaya' ? 'var(--c-critical)' : 'var(--c-asesmen)'
                                      return (
                                        <button
                                          key={tab}
                                          onClick={(e) => {
                                            e.stopPropagation()
                                            if (!isActive) setActiveChainTab(tab)
                                          }}
                                          style={{
                                            fontSize: 12,
                                            padding: '2px 8px',
                                            border: 'none',
                                            borderRadius: 'var(--radius-full)',
                                            background: isActive
                                              ? `color-mix(in srgb, ${activeColor} 10%, var(--surface))`
                                              : 'transparent',
                                            color: isActive ? activeColor : 'var(--text-secondary)',
                                            cursor: isActive ? 'default' : 'pointer',
                                            transition: 'background 0.2s, color 0.2s',
                                          }}
                                        >
                                          {label}
                                        </button>
                                      )
                                    })}
                                  </div>
                                </div>
                                <div
                                  className={`clinical-reveal-panel${penyertaOpen ? ' is-open' : ''}`}
                                  style={{ maxHeight: penyertaOpen ? 400 : 0 }}
                                >
                                  <div
                                    key={chainTabKey}
                                    style={{
                                      display: 'flex',
                                      flexDirection: 'column',
                                      gap: 9,
                                      padding: '0 16px 14px',
                                      borderTop: '1px solid var(--line-base)',
                                      paddingTop: 10,
                                    }}
                                  >
                                    {activeChainTab === 'penyerta'
                                      ? clinicalChain.logical_chain.map((s, i) => (
                                          <span
                                            key={s}
                                            onMouseDown={() => appendToRps(s)}
                                            style={{
                                              fontSize: 14,
                                              color: 'var(--text-main)',
                                              cursor: 'pointer',
                                              animation: `fadeSlideIn 0.4s ease both`,
                                              animationDelay: `${i * 80}ms`,
                                            }}
                                          >
                                            {s}
                                          </span>
                                        ))
                                      : clinicalChain.red_flags.map((rf, i) => (
                                          <span
                                            key={rf}
                                            style={{
                                              fontSize: 14,
                                              color: 'var(--text-main)',
                                              animation: `fadeSlideIn 0.4s ease both`,
                                              animationDelay: `${i * 80}ms`,
                                            }}
                                          >
                                            {rf}
                                          </span>
                                        ))}
                                  </div>
                                </div>
                              </div>
                            </div>
                          )}
                        </div>
                      ) : isAutocompleteLoading ? (
                        <div
                          style={{
                            fontSize: 12,
                            color: 'var(--text-secondary)',
                          }}
                        >
                          synthesizing...
                        </div>
                      ) : (
                        <div
                          style={{
                            fontSize: 12,
                            color: 'var(--text-muted)',
                            opacity: 0.35,
                          }}
                        >
                          ketik keluhan untuk saran klinis
                        </div>
                      )}
                    </div>
                    {/* AUTO SENTRA — di bawah garis, rata kanan */}
                    {keluhanUtama.trim() && !isTyping && (
                      <div
                        style={{
                          display: 'flex',
                          justifyContent: 'flex-end',
                          marginTop: 8,
                        }}
                      >
                        <div
                          onClick={handleSenAutoClick}
                          className="ui-btn ui-btn--primary ui-btn--sm"
                          onMouseEnter={(e) => {
                            e.currentTarget.style.opacity = '0.85'
                          }}
                          onMouseLeave={(e) => {
                            e.currentTarget.style.opacity = '1'
                          }}
                        >
                          ✧ AUTO SENTRA
                        </div>
                      </div>
                    )}
                  </div>
                  <span
                    style={{
                      color: 'var(--text-muted)',
                      fontStyle: 'italic',
                      fontSize: 14,
                      marginTop: 4,
                      display: 'block',
                      paddingLeft: 0,
                    }}
                  >
                    {keluhanUtama
                      ? '— isi satu frasa inti, lalu biarkan AI membantu membentuk RPS'
                      : '...'}
                  </span>

                  <div
                    ref={reviewHandoffRef}
                    style={{
                      scrollMarginTop: 108,
                      marginTop: 20,
                      paddingTop: 8,
                      borderTop: highlightReviewHandoff
                        ? '1px solid rgba(0, 33, 71, 0.22)'
                        : '1px solid transparent',
                      transition: 'border-color 0.42s ease, opacity 0.42s ease',
                      opacity: highlightReviewHandoff ? 1 : 0.92,
                    }}
                  >
                    <span
                      className="data-label"
                      style={{
                        display: 'block',
                        marginTop: 0,
                        color: highlightReviewHandoff ? 'var(--c-asesmen)' : undefined,
                      }}
                    >
                      Riwayat Penyakit Sekarang
                    </span>
                  </div>
                  <div className="patient-narrative">
                    <span className="input-draft" style={{ display: 'block' }}>
                      {words.length > 0 ? (
                        words.map((word, i) => (
                          <span
                            key={`rps-word-${i}`}
                            className="blur-word"
                            style={{ animationDelay: `${i * 80}ms` }}
                          >
                            {word}{' '}
                          </span>
                        ))
                      ) : (
                        <textarea
                          id="riwayat-rps"
                          name="riwayat-rps"
                          rows={4}
                          value={riwayat.rps}
                          onChange={(e) => {
                            updateRpsDraft(e.target.value, {
                              mode: 'edited',
                              sourceKeluhan: keluhanUtama.trim() || rpsDraftState.sourceKeluhan,
                              stale: false,
                            })
                            e.target.style.height = 'auto'
                            e.target.style.height = e.target.scrollHeight + 'px'
                          }}
                          onInput={(e) => {
                            const t = e.currentTarget
                            t.style.height = 'auto'
                            t.style.height = t.scrollHeight + 'px'
                          }}
                          ref={(el) => {
                            if (el) {
                              el.style.height = 'auto'
                              el.style.height = el.scrollHeight + 'px'
                            }
                          }}
                          placeholder="narasi keluhan sekarang, perjalanan penyakit, onset, progresivitas, faktor pencetus/peringan..."
                          style={{
                            display: 'block',
                            background: 'transparent',
                            border: 'none',
                            outline: 'none',
                            resize: 'none',
                            overflow: 'hidden',
                            font: 'inherit',
                            color: riwayat.rps ? 'var(--text-main)' : 'var(--text-muted)',
                            width: '100%',
                            padding: 0,
                          }}
                        />
                      )}
                    </span>
                  </div>
                  <div className={`emr-assist-note${rpsDraftState.stale ? ' is-warning' : ''}`}>
                    <span>
                      {rpsDraftState.stale
                        ? 'RPS belum sinkron dengan keluhan utama terbaru. Perbarui narasi atau jalankan AUTO SENTRA lagi.'
                        : rpsDraftState.mode === 'auto'
                          ? `Narasi dibentuk AI dari keluhan utama: ${rpsDraftState.sourceKeluhan || '-'}`
                          : rpsDraftState.mode === 'edited'
                            ? 'RPS sedang dalam mode edit dokter. AI assist tetap bisa dipakai tanpa mengunci isi narasi.'
                            : 'Gunakan AUTO SENTRA untuk membentuk narasi awal, lalu edit seperlunya.'}
                    </span>
                    {keluhanUtama.trim() && (
                      <button
                        type="button"
                        onClick={(e) => handleSenAutoClick(e)}
                        disabled={isTyping || !keluhanUtama.trim()}
                        className="emr-assist-note-action"
                      >
                        sinkronkan AI
                      </button>
                    )}
                  </div>

                  <span className="data-label" style={{ display: 'block', marginTop: 24 }}>
                    Keluhan Tambahan
                  </span>
                  <div className="patient-narrative">
                    <span className="input-draft" style={{ display: 'block' }}>
                      <input
                        id="keluhan-tambahan"
                        name="keluhan-tambahan"
                        type="text"
                        value={keluhanTambahan}
                        onChange={(e) => {
                          keluhanRef.current.tambahan = sanitizeClinicalInput(e.target.value)
                          setKeluhanTambahan(sanitizeClinicalInput(e.target.value))
                        }}
                        placeholder="keluhan penyerta, gejala sistemik..."
                        style={{
                          background: 'transparent',
                          border: 'none',
                          outline: 'none',
                          fontSize: 'inherit',
                          color: keluhanTambahan ? 'var(--text-main)' : 'var(--text-muted)',
                          width: '100%',
                          padding: 0,
                        }}
                      />
                    </span>
                  </div>

                  {isReviewTab && (
                    <>
                      {/* 3 Field Pemeriksaan */}
                      <div
                        style={{
                          display: 'grid',
                          gridTemplateColumns: '1fr 1fr 1fr',
                          gap: 16,
                          marginTop: 24,
                          alignItems: 'start',
                        }}
                      >
                        {/* Pemeriksaan Fisik */}
                        <div>
                          <span
                            className="data-label"
                            style={{ display: 'block', marginBottom: 8 }}
                          >
                            Pemeriksaan Fisik
                          </span>
                          <div className="patient-narrative">
                            <textarea
                              id="pemeriksaan-fisik-usulan"
                              name="pemeriksaan-fisik-usulan"
                              rows={1}
                              value={pemeriksaanFisikUsulan}
                              onChange={(e) => {
                                setPemeriksaanFisikUsulan(e.target.value)
                                e.target.style.height = 'auto'
                                e.target.style.height = e.target.scrollHeight + 'px'
                              }}
                              onInput={(e) => {
                                const t = e.target as HTMLTextAreaElement
                                t.style.height = 'auto'
                                t.style.height = t.scrollHeight + 'px'
                              }}
                              placeholder="auskultasi, palpasi..."
                              className="ui-input"
                              style={{
                                color: pemeriksaanFisikUsulan
                                  ? 'var(--text-main)'
                                  : 'var(--text-muted)',
                                width: '100%',
                                resize: 'none',
                                overflow: 'hidden',
                              }}
                            />
                          </div>
                        </div>
                        {/* Hasil Lab */}
                        <div>
                          <span
                            className="data-label"
                            style={{ display: 'block', marginBottom: 8 }}
                          >
                            Hasil Lab
                          </span>
                          <div className="patient-narrative">
                            <textarea
                              id="hasil-lab"
                              name="hasil-lab"
                              rows={1}
                              value={hasilLab}
                              onChange={(e) => {
                                setHasilLab(e.target.value)
                                e.target.style.height = 'auto'
                                e.target.style.height = e.target.scrollHeight + 'px'
                              }}
                              onInput={(e) => {
                                const t = e.target as HTMLTextAreaElement
                                t.style.height = 'auto'
                                t.style.height = t.scrollHeight + 'px'
                              }}
                              placeholder="Hb, WBC, HbA1c..."
                              className="ui-input"
                              style={{
                                color: hasilLab ? 'var(--text-main)' : 'var(--text-muted)',
                                width: '100%',
                                resize: 'none',
                                overflow: 'hidden',
                              }}
                            />
                          </div>
                        </div>
                        {/* Pemeriksaan Penunjang */}
                        <div>
                          <span
                            className="data-label"
                            style={{ display: 'block', marginBottom: 8 }}
                          >
                            Pemeriksaan Penunjang
                          </span>
                          <div className="patient-narrative">
                            <textarea
                              id="pemeriksaan-penunjang"
                              name="pemeriksaan-penunjang"
                              rows={1}
                              value={pemeriksaanPenunjang}
                              onChange={(e) => {
                                setPemeriksaanPenunjang(e.target.value)
                                e.target.style.height = 'auto'
                                e.target.style.height = e.target.scrollHeight + 'px'
                              }}
                              onInput={(e) => {
                                const t = e.target as HTMLTextAreaElement
                                t.style.height = 'auto'
                                t.style.height = t.scrollHeight + 'px'
                              }}
                              placeholder="EKG, Foto Thorax, USG..."
                              className="ui-input"
                              style={{
                                color: pemeriksaanPenunjang
                                  ? 'var(--text-main)'
                                  : 'var(--text-muted)',
                                width: '100%',
                                resize: 'none',
                                overflow: 'hidden',
                              }}
                            />
                          </div>
                        </div>
                      </div>

                      {/* Usulan Pemeriksaan — klik append ke Pemeriksaan Penunjang */}
                      {clinicalChain?.pemeriksaan &&
                        (clinicalChain.pemeriksaan.fisik.length > 0 ||
                          clinicalChain.pemeriksaan.lab.length > 0 ||
                          clinicalChain.pemeriksaan.penunjang.length > 0) && (
                          <div style={{ marginTop: 16 }}>
                            <span
                              className="data-label"
                              style={{ display: 'block', marginBottom: 14 }}
                            >
                              Usulan Pemeriksaan
                            </span>
                            <div
                              style={{
                                display: 'grid',
                                gridTemplateColumns: '1fr 1fr 1fr',
                                gap: 0,
                                alignItems: 'start',
                                border: '1px solid var(--border)',
                                borderRadius: 'var(--radius-md)',
                              }}
                            >
                              {(['fisik', 'lab', 'penunjang'] as const).map((cat, ci) => {
                                const items = (clinicalChain.pemeriksaan[cat] ?? []).slice(0, 5)
                                const appendTo =
                                  cat === 'fisik'
                                    ? (val: string) =>
                                        appendToClinicalField(setPemeriksaanFisikUsulan, val)
                                    : cat === 'lab'
                                      ? (val: string) => appendToClinicalField(setHasilLab, val)
                                      : (val: string) =>
                                          appendToClinicalField(setPemeriksaanPenunjang, val)
                                const isOpen =
                                  cat === 'fisik'
                                    ? usulanFisikOpen
                                    : cat === 'lab'
                                      ? usulanLabOpen
                                      : usulanPenunjangOpen
                                const setOpen =
                                  cat === 'fisik'
                                    ? setUsulanFisikOpen
                                    : cat === 'lab'
                                      ? setUsulanLabOpen
                                      : setUsulanPenunjangOpen
                                return (
                                  <div
                                    key={cat}
                                    style={{
                                      borderRight:
                                        ci < 2 ? '1px solid var(--line-base)' : undefined,
                                    }}
                                  >
                                    <div
                                      onClick={() => setOpen(!isOpen)}
                                      style={{
                                        display: 'flex',
                                        alignItems: 'center',
                                        gap: 8,
                                        padding: '10px 16px',
                                        cursor: 'pointer',
                                        userSelect: 'none',
                                      }}
                                    >
                                      <span
                                        style={{
                                          fontSize: 12,
                                          color: 'var(--text-muted)',
                                        }}
                                      >
                                        {isOpen ? '▼' : '▶'}
                                      </span>
                                      <span
                                        style={{
                                          fontSize: 12,
                                          color: 'var(--text-muted)',
                                        }}
                                      >
                                        {cat === 'fisik'
                                          ? 'Fisik'
                                          : cat === 'lab'
                                            ? 'Laboratorium'
                                            : 'Penunjang'}
                                      </span>
                                    </div>
                                    <div
                                      className={`clinical-reveal-panel${isOpen ? ' is-open' : ''}`}
                                      style={{ maxHeight: isOpen ? 400 : 0 }}
                                    >
                                      <div
                                        style={{
                                          display: 'flex',
                                          flexDirection: 'column',
                                          gap: 6,
                                          padding: '0 16px 14px',
                                          borderTop: '1px solid var(--line-base)',
                                          paddingTop: 10,
                                        }}
                                      >
                                        {items.length > 0 ? (
                                          items.map((item) => {
                                            const subs = getPemSubItems(item)
                                            const isExpanded = expandedPemItem === item
                                            return (
                                              <div key={item}>
                                                <span
                                                  style={{
                                                    display: 'flex',
                                                    alignItems: 'center',
                                                    gap: 4,
                                                  }}
                                                >
                                                  {subs.length > 0 && (
                                                    <span
                                                      onMouseDown={(e) => {
                                                        e.stopPropagation()
                                                        setExpandedPemItem(isExpanded ? null : item)
                                                      }}
                                                      style={{
                                                        fontSize: 12,
                                                        color: 'var(--c-asesmen)',
                                                        transition: 'transform 0.2s',
                                                        display: 'inline-block',
                                                        transform: isExpanded
                                                          ? 'rotate(90deg)'
                                                          : 'rotate(0deg)',
                                                        cursor: 'pointer',
                                                        padding: '0 2px',
                                                      }}
                                                    >
                                                      ▶
                                                    </span>
                                                  )}
                                                  <span
                                                    onMouseDown={() => {
                                                      if (subs.length > 0) {
                                                        appendTo(subs.join(', '))
                                                      } else {
                                                        appendTo(item)
                                                      }
                                                    }}
                                                    onContextMenu={(e) => handleMedContext(e, item)}
                                                    style={{
                                                      fontSize: 14,
                                                      color: 'var(--text-main)',
                                                      cursor: 'pointer',
                                                    }}
                                                  >
                                                    {item}
                                                  </span>
                                                </span>
                                                {isExpanded && (
                                                  <div
                                                    style={{
                                                      marginTop: 6,
                                                      marginLeft: 16,
                                                      display: 'flex',
                                                      flexDirection: 'column',
                                                      gap: 5,
                                                    }}
                                                  >
                                                    {subs.map((sub) => (
                                                      <span
                                                        key={sub}
                                                        onMouseDown={() => {
                                                          appendTo(sub)
                                                        }}
                                                        onContextMenu={(e) =>
                                                          handleMedContext(e, sub)
                                                        }
                                                        style={{
                                                          fontSize: 14,
                                                          color: 'var(--c-asesmen)',
                                                          cursor: 'pointer',
                                                        }}
                                                      >
                                                        + {sub}
                                                      </span>
                                                    ))}
                                                  </div>
                                                )}
                                              </div>
                                            )
                                          })
                                        ) : (
                                          <span
                                            style={{
                                              fontSize: 12,
                                              color: 'var(--text-muted)',
                                              opacity: 0.4,
                                            }}
                                          >
                                            —
                                          </span>
                                        )}
                                      </div>
                                    </div>
                                  </div>
                                )
                              })}
                            </div>
                          </div>
                        )}
                    </>
                  )}
                </div>
              </div>
            </div>

            {/* 02. Riwayat */}
            <div
              className={`stream-section${emergencyOverride.forcedActiveViewPhase === 'row2' ? ' stream-section-stagger-primary' : ''}`}
              style={{
                display: isReviewTab ? undefined : 'none',
              }}
            >
              <div className="section-title">Riwayat Dahulu, Keluarga &amp; Alergi</div>
              {showEmrLoader && <div className="emr-loader">[SYSTEM: RETRIEVING EMR DATA...]</div>}

              <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                {/* RPD — chip selector */}
                <div className="history-item">
                  <div className="history-item-title" style={{ marginBottom: 8 }}>
                    Riwayat Penyakit Dahulu (RPD)
                    {rpdSelected.size > 0 && (
                      <span
                        style={{
                          marginLeft: 8,
                          fontSize: 14,
                          color: 'var(--c-asesmen)',
                        }}
                      >
                        {rpdSelected.size} dipilih
                      </span>
                    )}
                  </div>
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
                    {RPD_OPTIONS.map((opt) => {
                      const active = rpdSelected.has(opt)
                      return (
                        <button
                          key={opt}
                          onClick={() => toggleRpd(opt)}
                          aria-pressed={active}
                          className="ui-chip"
                        >
                          {opt}
                        </button>
                      )
                    })}
                  </div>
                </div>

                {/* RPK */}
                <div className="history-item">
                  <div className="history-item-title">Riwayat Penyakit Keluarga (RPK)</div>
                  <input
                    id="riwayat-rpk"
                    name="riwayat-rpk"
                    type="text"
                    value={riwayat.rpk}
                    onChange={(e) => setRiwayat((p) => ({ ...p, rpk: e.target.value }))}
                    placeholder="DM, jantung, kanker, HT dalam keluarga..."
                    className="ui-input"
                    style={{
                      color: riwayat.rpk ? 'var(--text-main)' : 'var(--text-muted)',
                    }}
                  />
                </div>

                {/* Alergi — chip selector */}
                <div className="history-item">
                  <div className="history-item-title" style={{ marginBottom: 8 }}>
                    Alergi Tercatat
                    {alergiSelected.size > 0 && (
                      <span
                        style={{
                          marginLeft: 8,
                          fontSize: 14,
                          color: 'var(--c-critical)',
                        }}
                      >
                        ⚠ {alergiSelected.size} alergi
                      </span>
                    )}
                  </div>
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
                    {ALERGI_OPTIONS.map((opt) => {
                      const active = alergiSelected.has(opt)
                      return (
                        <button
                          key={opt}
                          onClick={() => toggleAlergi(opt)}
                          aria-pressed={active}
                          className="ui-chip"
                          style={
                            active
                              ? {
                                  background: 'var(--critical-tint)',
                                  borderColor: 'var(--critical)',
                                  color: 'var(--critical)',
                                }
                              : undefined
                          }
                        >
                          {opt}
                        </button>
                      )
                    })}
                  </div>
                </div>
              </div>

              <ClinicalTrajectoryChart
                rpdSelected={rpdSelected}
                familyHistory={riwayat.rpk}
                alergiSelected={alergiSelected}
                keluhanUtama={keluhanUtama}
                patientAge={patientAge}
                isPregnant={isPregnant}
                screeningAlerts={screeningAlerts}
                visitHistory={trajectoryVisitHistory}
                currentVitals={trajectoryCurrentVitals}
              />
            </div>
          </section>

          <section
            ref={row2SectionRef}
            className={emergencyOverride.phaseClassNames.row2}
            style={{ display: showWorkupSection ? undefined : 'none' }}
          >
            {/* 04. Pemeriksaan Fisik */}
            <div className="stream-section" style={{ display: isReviewTab ? undefined : 'none' }}>
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  flexWrap: 'wrap',
                  gap: 10,
                  width: '100%',
                  padding: 0,
                }}
              >
                <span className="section-title" style={{ margin: 0 }}>
                  Pemeriksaan Fisik Head-to-Toe
                </span>
                <span style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <button
                    type="button"
                    onClick={(event) => {
                      event.stopPropagation()
                      applyExamAutoSentra()
                    }}
                    disabled={!canAutoAssistExam}
                    className="ui-btn ui-btn--secondary ui-btn--sm"
                  >
                    AUTO SENTRA
                  </button>
                  <button
                    type="button"
                    onClick={() => setExamOpen((o) => !o)}
                    aria-expanded={examOpen}
                    aria-controls="exam-head-to-toe-panel"
                    className="ui-btn ui-btn--ghost ui-btn--sm"
                  >
                    {examOpen ? '[ TUTUP ▲ ]' : '[ BUKA ▼ ]'}
                  </button>
                </span>
              </div>
              <div
                style={{
                  marginTop: 8,
                  fontSize: 12,
                  color: 'var(--text-secondary)',
                }}
              >
                AUTO SENTRA akan mengisi template pemeriksaan 04 dengan format normal
                audit-friendly, lalu menambahkan fokus klinis yang relevan terhadap keluhan.
              </div>
              {examOpen && (
                <div id="exam-head-to-toe-panel" className="exam-list" style={{ marginTop: 16 }}>
                  {examFields.map(({ key, label }, i) => (
                    <div
                      key={key}
                      className={`exam-row${examAutofillKeys.includes(key) ? ' is-autofilled' : ''}`}
                      style={{ animationDelay: `${i * 0.03}s` }}
                    >
                      <span className="exam-organ">{label}</span>
                      <input
                        id={`exam-${key}`}
                        name={`exam-${key}`}
                        type="text"
                        value={exam[key]}
                        onChange={(e) => setExam((p) => ({ ...p, [key]: e.target.value }))}
                        placeholder="—"
                        className="ui-input exam-result"
                        style={{
                          color: exam[key] ? 'var(--text-main)' : 'var(--text-muted)',
                        }}
                      />
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* 03. Tanda Vital */}
            <div
              className={`stream-section${emergencyOverride.forcedActiveViewPhase === 'row2' ? ' stream-section-stagger-secondary' : ''}`}
            >
              <div className="section-title">Tanda Vital &amp; Objektif</div>
              <div
                style={{
                  display: 'flex',
                  gap: 8,
                  alignItems: 'center',
                  marginBottom: 16,
                }}
              >
                <span style={{ display: 'flex', flexWrap: 'wrap', gap: 8, alignItems: 'center' }}>
                  {/* Auto TTV dari keluhan */}
                  <button
                    onClick={() => inferTTV()}
                    disabled={!keluhanUtama.trim()}
                    title="Buat saran TTV awal berdasarkan konteks klinis"
                    className="ui-chip"
                    style={{
                      cursor: keluhanUtama.trim() ? 'pointer' : 'not-allowed',
                      opacity: keluhanUtama.trim() ? 1 : 0.35,
                    }}
                  >
                    ✧ AUTO TTV
                  </button>
                  {/* Skenario presets */}
                  {(['hipertensi', 'hiperglikemi', 'hipoglikemi'] as const).map((key) => (
                    <button
                      key={key}
                      onClick={() => autoFillScenario(key)}
                      aria-pressed={activeScenario === key}
                      className="ui-chip"
                    >
                      {AUTOGEN_SCENARIOS[key].label}
                    </button>
                  ))}
                </span>
              </div>
              <div className="vitals-context-strip">
                <label className="vitals-context-field">
                  <span className="vitals-context-label">BB (kg)</span>
                  <input
                    id="body-weight-kg"
                    name="body-weight-kg"
                    type="text"
                    value={bodyWeightKg}
                    onChange={(e) => setBodyWeightKg(e.target.value.replace(/[^0-9.]/g, ''))}
                    placeholder="opsional"
                    className="vitals-context-input"
                  />
                </label>
                <div className="vitals-context-field">
                  <span className="vitals-context-label">Aktivitas</span>
                  <CustomSelect
                    id="recent-activity"
                    value={recentActivity}
                    onChange={(v) => setRecentActivity(v as RecentActivity)}
                    options={[
                      { value: 'resting', label: 'Istirahat' },
                      { value: 'walking', label: 'Baru berjalan' },
                      { value: 'post_exertion', label: 'Setelah aktivitas' },
                    ]}
                  />
                </div>
                <div className="vitals-context-field">
                  <span className="vitals-context-label">Respons fisiologis</span>
                  <CustomSelect
                    id="stress-state"
                    value={stressState}
                    onChange={(v) => setStressState(v as StressState)}
                    options={[
                      { value: 'calm', label: 'Tenang' },
                      { value: 'anxious', label: 'Cemas' },
                      { value: 'pain', label: 'Nyeri' },
                      { value: 'severe_pain', label: 'Nyeri berat' },
                    ]}
                  />
                </div>
                <div className="vitals-context-field vitals-context-field-wide">
                  <span className="vitals-context-label">Obat relevan</span>
                  <div className="vitals-chip-group">
                    {MEDICATION_OPTIONS.map((option) => {
                      const isActive = medicationFlags.has(option.key)
                      return (
                        <button
                          key={option.key}
                          type="button"
                          onClick={() => toggleMedicationFlag(option.key)}
                          className={`vitals-chip${isActive ? ' is-active' : ''}`}
                        >
                          {option.label}
                        </button>
                      )
                    })}
                  </div>
                </div>
              </div>
              <div className="vitals-assist-note">
                AUTO TTV memberi estimasi awal untuk nadi, napas, suhu, serta default GCS dan SpO2
                pada poli umum dewasa. Tekanan darah dan MAP tetap wajib diukur manual. Jika keluhan
                mengarah ke sesak, SpO2 kembali wajib diukur manual.
              </div>
              <div className="vitals-matrix">
                {vitalFields.map(({ key, label, unit }) => (
                  <div
                    key={key}
                    className={`vital-item${isCritical(vitals[key], key) ? ' v-critical' : ''}`}
                    style={
                      flashingVital === key
                        ? {
                            boxShadow: '0 0 0 2px var(--success)',
                            borderRadius: 'var(--radius-sm)',
                            transition: 'box-shadow 0.1s',
                          }
                        : { transition: 'box-shadow 0.25s' }
                    }
                  >
                    <div className="v-label-row">
                      <span className="v-label">{label}</span>
                      {getVitalMetaLabel(vitalMeta[key]) && (
                        <span className={getVitalMetaClassName(vitalMeta[key])}>
                          {getVitalMetaLabel(vitalMeta[key])}
                        </span>
                      )}
                    </div>
                    <span
                      className="v-value"
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: 8,
                        animation: vitals[key]
                          ? 'vitalReveal 0.35s cubic-bezier(0.22,1,0.36,1) both'
                          : 'none',
                      }}
                    >
                      <input
                        id={`vital-${key}`}
                        name={`vital-${key}`}
                        type="text"
                        value={vitals[key]}
                        onChange={(e) => {
                          const nextValue =
                            key === 'td'
                              ? normalizeBloodPressureInput(e.target.value)
                              : e.target.value
                          setVitals((p) => ({ ...p, [key]: nextValue }))
                          setVitalMeta((prev) => ({
                            ...prev,
                            [key]: nextValue.trim()
                              ? {
                                  mode: 'measured',
                                  confidence: 'high',
                                  note: `${label} diisi manual oleh petugas.`,
                                }
                              : key === 'td' || key === 'map'
                                ? {
                                    mode: 'manual_required',
                                    note: `${label} perlu diukur manual sebelum finalisasi klinis.`,
                                  }
                                : { mode: 'empty' },
                          }))
                        }}
                        placeholder={vitalMeta[key].mode === 'manual_required' ? 'ukur' : '—'}
                        className="ui-input"
                        style={{
                          color: isCritical(vitals[key], key)
                            ? 'var(--c-critical)'
                            : vitals[key]
                              ? 'var(--text-main)'
                              : 'var(--text-muted)',
                          minWidth: 0,
                          fontVariantNumeric: 'tabular-nums',
                        }}
                      />
                      <span className="v-unit">{unit}</span>
                    </span>
                    {vitalMeta[key].note && (
                      <span
                        className={`v-meta-note${vitalMeta[key].mode === 'manual_required' ? ' is-manual' : ''}`}
                      >
                        {vitalMeta[key].note}
                      </span>
                    )}
                  </div>
                ))}

                {/* Gula Darah — field terpisah dengan tipe selector */}
                <div className="vital-item">
                  <span className="v-label">Gula Darah</span>
                  <span
                    className="v-value"
                    style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: 8 }}
                  >
                    <input
                      id="vital-gula-darah"
                      name="vital-gula-darah"
                      type="text"
                      value={gulaDarah.nilai}
                      onChange={(e) => setGulaDarah((p) => ({ ...p, nilai: e.target.value }))}
                      placeholder="—"
                      className="ui-input"
                      style={{
                        color: gulaDarah.nilai
                          ? Number.parseFloat(gulaDarah.nilai) < 70 ||
                            Number.parseFloat(gulaDarah.nilai) > 200
                            ? 'var(--c-critical)'
                            : 'var(--text-main)'
                          : 'var(--text-muted)',
                        width: 96,
                        fontVariantNumeric: 'tabular-nums',
                      }}
                    />
                    <span
                      style={{
                        display: 'flex',
                        flexWrap: 'wrap',
                        alignItems: 'center',
                        gap: 8,
                      }}
                    >
                      <span
                        style={{
                          fontSize: 12,
                          color: 'var(--text-secondary)',
                        }}
                      >
                        mg/dL
                      </span>
                      <span style={{ display: 'flex', gap: 4 }}>
                        {(['GDS', 'GDP', '2JPP'] as const).map((t) => (
                          <button
                            key={t}
                            onClick={() => setGulaDarah((p) => ({ ...p, tipe: t }))}
                            aria-pressed={gulaDarah.tipe === t}
                            className="ui-chip"
                          >
                            {t}
                          </button>
                        ))}
                      </span>
                    </span>
                  </span>
                </div>
              </div>

              <div
                ref={redFlagsRef}
                style={{
                  marginTop: 24,
                  padding: 16,
                  border: '1px solid var(--border)',
                  background: 'var(--surface)',
                  borderRadius: 'var(--radius-md)',
                  display: 'grid',
                  gap: 16,
                  opacity: redFlagsInView ? 1 : 0.35,
                  transition: 'opacity 0.4s ease',
                }}
              >
                <div
                  style={{
                    display: 'flex',
                    alignItems: 'baseline',
                    justifyContent: 'space-between',
                    gap: 12,
                    flexWrap: 'wrap',
                  }}
                >
                  <div>
                    <div
                      style={{
                        fontSize: 14,
                        fontWeight: 600,
                        color: 'var(--text)',
                      }}
                    >
                      Structured Red Flags
                    </div>
                    <div style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 4 }}>
                      Centang observasi klinis yang benar-benar terlihat, supaya alert tidak
                      bergantung pada inferensi teks saja.
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => setStructuredSignsDraft(createInitialStructuredSigns())}
                    className="ui-btn ui-btn--secondary ui-btn--sm"
                  >
                    Reset Flags
                  </button>
                </div>

                <div
                  style={{
                    display: 'grid',
                    gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
                    gap: 12,
                  }}
                >
                  {renderStructuredSection(
                    'respiratoryDistress',
                    'Distress Napas',
                    STRUCTURED_SIGN_CONFIG.respiratoryDistress
                  )}
                  {renderStructuredSection(
                    'hmod',
                    'HMOD / HTN Emergency',
                    STRUCTURED_SIGN_CONFIG.hmod
                  )}
                  {renderStructuredSection(
                    'dkaHhs',
                    'DKA / HHS Signs',
                    STRUCTURED_SIGN_CONFIG.dkaHhs
                  )}
                  {renderStructuredSection(
                    'perfusionShock',
                    'Perfusion / Shock',
                    STRUCTURED_SIGN_CONFIG.perfusionShock
                  )}
                </div>
              </div>

              {/* Gate 2/3/4 Screening Alerts — sama persis visual treatment Assist */}
              {screeningAlerts.length > 0 && (
                <div
                  style={{
                    marginTop: '16px',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '16px',
                  }}
                >
                  {screeningAlerts.map((alert) => {
                    const isCrit = alert.severity === 'critical'
                    const isHigh = alert.severity === 'high'
                    const accent = isCrit ? 'var(--critical)' : 'var(--warning)'
                    return (
                      <div
                        key={alert.id}
                        style={{
                          padding: '12px 16px',
                          borderLeft: `2px solid ${accent}`,
                          borderRadius: '0 var(--radius-sm) var(--radius-sm) 0',
                          background: isCrit ? 'var(--critical-tint)' : 'var(--warning-tint)',
                        }}
                      >
                        <div
                          style={{
                            display: 'flex',
                            alignItems: 'baseline',
                            gap: '10px',
                            flexWrap: 'wrap',
                            marginBottom: '4px',
                          }}
                        >
                          <span
                            style={{
                              fontSize: 12,
                              fontWeight: 600,
                              color: accent,
                            }}
                          >
                            {isCrit ? 'Emergency' : isHigh ? 'Tinggi' : 'Waspada'}
                          </span>
                          <span
                            style={{
                              fontSize: 14,
                              fontWeight: 600,
                              color: 'var(--text-main)',
                            }}
                          >
                            {alert.title}
                          </span>
                        </div>
                        <div
                          style={{
                            fontSize: 14,
                            color: 'var(--text-muted)',
                            marginBottom: '6px',
                          }}
                        >
                          {alert.reasoning}
                        </div>
                        <ul
                          style={{
                            listStyle: 'none',
                            display: 'flex',
                            flexDirection: 'column',
                            gap: '2px',
                          }}
                        >
                          {alert.recommendations.slice(0, 3).map((r, i) => (
                            <li
                              key={i}
                              style={{
                                fontSize: 14,
                                color: 'var(--text-main)',
                                position: 'relative',
                                paddingLeft: '14px',
                              }}
                            >
                              <span
                                aria-hidden="true"
                                style={{ position: 'absolute', left: 0, color: accent }}
                              >
                                –
                              </span>
                              {r}
                            </li>
                          ))}
                        </ul>
                      </div>
                    )
                  })}
                </div>
              )}

              {compositeDeterioration &&
                (compositeDeterioration.compositeAlerts.length > 0 ||
                  compositeDeterioration.watchers.length > 0) && (
                  <div
                    style={{
                      marginTop: '16px',
                      display: 'flex',
                      flexDirection: 'column',
                      gap: '16px',
                    }}
                  >
                    <div
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        gap: 12,
                      }}
                    >
                      <div
                        style={{
                          fontSize: 12,
                          color: 'var(--text-main)',
                        }}
                      >
                        Composite Deterioration
                      </div>
                      <div
                        style={{
                          fontSize: 12,
                          color: 'var(--text-muted)',
                        }}
                      >
                        {compositeDeterioration.compositeAlerts.length > 0
                          ? `${compositeDeterioration.compositeAlerts.length} composite alert`
                          : '0 composite alert'}
                        {compositeDeterioration.watchers.length > 0
                          ? ` · ${compositeDeterioration.watchers.length} watcher`
                          : ''}
                        {encounterMeasurements.length > 0
                          ? ` · ${encounterMeasurements.length} snapshot / ${ENCOUNTER_BASELINE_WINDOW_MINUTES}m`
                          : ''}
                      </div>
                    </div>

                    {compositeDeterioration.compositeAlerts.map((alert) => {
                      const accent = getCompositeSeverityColor(alert.severity)
                      return (
                        <div
                          key={alert.id}
                          style={{
                            padding: '12px 16px',
                            borderLeft: `2px solid ${accent}`,
                            borderRadius: '0 var(--radius-sm) var(--radius-sm) 0',
                            background: `color-mix(in srgb, ${accent} 6%, var(--surface))`,
                          }}
                        >
                          <div
                            style={{
                              display: 'flex',
                              alignItems: 'baseline',
                              justifyContent: 'space-between',
                              gap: 8,
                              marginBottom: 4,
                              flexWrap: 'wrap',
                            }}
                          >
                            <span
                              style={{
                                fontWeight: 600,
                                fontSize: 14,
                                color: 'var(--text-main)',
                              }}
                            >
                              {alert.title}
                            </span>
                            <span
                              style={{
                                color: accent,
                                fontSize: 12,
                                fontWeight: 600,
                              }}
                            >
                              {getCompositeConfidenceLabel(alert.confidence)}
                            </span>
                          </div>
                          <div
                            style={{
                              fontSize: 14,
                              color: 'var(--text-muted)',
                              marginBottom: '6px',
                            }}
                          >
                            {alert.summary}
                          </div>
                          <div
                            style={{
                              display: 'flex',
                              flexDirection: 'column',
                              gap: 2,
                              marginBottom: 6,
                            }}
                          >
                            {alert.evidence.slice(0, 3).map((evidence, index) => (
                              <div
                                key={`${alert.id}-evidence-${index}`}
                                style={{
                                  fontSize: 14,
                                  color: 'var(--text-main)',
                                }}
                              >
                                {evidence}
                              </div>
                            ))}
                          </div>
                          <div
                            style={{
                              display: 'flex',
                              flexDirection: 'column',
                              gap: 2,
                            }}
                          >
                            {alert.recommendedActions.slice(0, 2).map((action, index) => (
                              <div
                                key={`${alert.id}-action-${index}`}
                                style={{
                                  fontSize: 14,
                                  color: 'var(--text-main)',
                                  position: 'relative',
                                  paddingLeft: '14px',
                                }}
                              >
                                <span
                                  aria-hidden="true"
                                  style={{ position: 'absolute', left: 0, color: accent }}
                                >
                                  –
                                </span>
                                {action}
                              </div>
                            ))}
                          </div>
                        </div>
                      )
                    })}

                    {compositeDeterioration.watchers.length > 0 && (
                      <div
                        style={{
                          borderLeft: '2px solid var(--warning)',
                          borderRadius: '0 var(--radius-sm) var(--radius-sm) 0',
                          background: 'var(--warning-tint)',
                          padding: '12px 16px',
                        }}
                      >
                        <div
                          style={{
                            fontSize: 12,
                            fontWeight: 600,
                            color: 'var(--warning)',
                            marginBottom: 6,
                          }}
                        >
                          Watchers
                        </div>
                        <div
                          style={{
                            display: 'flex',
                            flexDirection: 'column',
                            gap: 8,
                          }}
                        >
                          {compositeDeterioration.watchers.map((alert) => (
                            <div key={alert.id}>
                              <div
                                style={{
                                  fontSize: '12px',
                                  fontWeight: 600,
                                  color: 'var(--text-main)',
                                }}
                              >
                                {alert.title}
                              </div>
                              <div
                                style={{
                                  fontSize: '12px',
                                  color: 'var(--text-muted)',
                                }}
                              >
                                {alert.summary}
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                )}

              {labOpen && (
                <div className="lab-expansion open">
                  {labItems.map((item, i) => (
                    <div
                      key={i}
                      className={`lab-item${labSelected[i] ? ' selected' : ''}`}
                      onClick={() => toggleLab(i)}
                    >
                      <div className="lab-item-left">{item.name}</div>
                      <span className="lab-status">{item.status}</span>
                    </div>
                  ))}
                </div>
              )}
              {isTriageTab && (
                <div className="emr-phase-footer">
                  {onlineDoctors.length > 0 ? (
                    <div className="emr-phase-footer-actions">
                      <select
                        value={selectedDoctor}
                        onChange={(e) => setSelectedDoctor(e.target.value)}
                        className="ui-input"
                        style={{ flex: 1, height: 40 }}
                      >
                        <option value="">Pilih Dokter Jaga...</option>
                        {onlineDoctors.map((d) => (
                          <option key={d.userId} value={d.userId}>
                            {d.name} (online)
                          </option>
                        ))}
                      </select>
                      <EmrPhaseFooterButton
                        label="Send to Doctor"
                        tone="blue"
                        onClick={() => {
                          if (!selectedDoctor || !socketRef.current) return
                          const liveAlertPayload = buildRealtimeAlertPayload()
                          const structuredSigns =
                            liveAlertPayload.structuredSigns as StructuredTriageSigns
                          socketRef.current.emit('emr:triage-send', {
                            targetUserId: selectedDoctor,
                            data: {
                              keluhanUtama,
                              keluhanTambahan,
                              vitals,
                              gulaDarah,
                              patientAge,
                              patientGender,
                              triageContext: {
                                ...triageSignalContext,
                                structuredSigns,
                              },
                              encounterBaseline: liveAlertPayload.encounterBaseline,
                              structuredSigns,
                              screeningAlerts,
                              compositeDeterioration,
                            },
                          })
                          moveToWorkflowTab('review')
                        }}
                      />
                    </div>
                  ) : (
                    <div className="emr-phase-footer-actions">
                      <span className="emr-phase-footer-note">
                        Tidak ada dokter online
                      </span>
                      <EmrPhaseFooterButton
                        label="Lanjut Lokal"
                        tone="blue"
                        onClick={() => moveToWorkflowTab('review')}
                      />
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Clinical Trajectory Panel */}
            {trajectoryOpen && trajectoryCurrentVitals && (
              <TrajectoryPanel
                vitals={trajectoryCurrentVitals}
                keluhanUtama={keluhanUtama}
                rpdSelected={rpdSelected}
                screeningAlerts={screeningAlerts}
                visitHistory={trajectoryVisitHistory}
                onClose={toggleTrajectory}
              />
            )}

            {isReviewTab && (
              <div className="emr-phase-footer">
                <EmrPhaseFooterButton
                  label="Proceed to Assessment"
                  tone="blue"
                  onClick={() => moveToWorkflowTab('assessment')}
                />
              </div>
            )}
          </section>

          <section
            ref={row3SectionRef}
            className={emergencyOverride.phaseClassNames.row3}
            style={{ display: showDecisionSection ? undefined : 'none' }}
          >
            <div className="stream-section emr-phase-body" style={{ maxWidth: '100%' }}>
              {isAssessmentTab && (
                <>
                  <div
                    ref={assessmentEntryPanelRef}
                    className={`blueprint-wrapper emr-decision-entry assessment-phase-shell emr-row3-spotlight${row3Spotlight === 'prognosis' ? ' is-shadowed' : ''}`}
                  >
                    <div className="assessment-phase-grid">
                      <div className="assessment-command-panel">
                        <div className="assessment-command-header">
                          <div style={{ minWidth: 0 }}>
                            <div className="assessment-command-kicker">Assessment Workspace</div>
                          </div>
                          <div
                            className={`assessment-command-badge${cdssLoading ? ' is-loading' : cdssResult ? ' is-ready' : assessmentConclusion.trim() ? ' is-armed' : ''}`}
                            aria-live="polite"
                            aria-atomic="true"
                          >
                            {cdssLoading ? (
                              <span className="assessment-command-badge-working">
                                <span className="assessment-command-badge-radar" aria-hidden="true">
                                  <span className="assessment-command-badge-radar-core" />
                                  <span className="assessment-command-badge-radar-sweep" />
                                  <span className="assessment-command-badge-radar-track">
                                    <span className="assessment-command-badge-radar-node" />
                                    <span className="assessment-command-badge-radar-node" />
                                    <span className="assessment-command-badge-radar-node" />
                                  </span>
                                </span>
                                <span className="assessment-command-badge-working-label">
                                  {assessmentStageBadge}
                                </span>
                              </span>
                            ) : (
                              assessmentStageBadge
                            )}
                          </div>
                        </div>

                        <input
                          ref={assessmentConclusionInputRef}
                          id="assessment-conclusion"
                          name="assessment-conclusion"
                          type="text"
                          className="omni-input assessment-omni-input"
                          placeholder="Ketik kesimpulan asesmen atau ketik '/' untuk perintah..."
                          value={assessmentConclusion}
                          onChange={(e) => {
                            setAssessmentConclusion(e.target.value)
                            setAssessmentConclusionMeta({
                              mode: 'edited',
                              signature: assessmentAutoDraftSignature,
                            })
                          }}
                          style={{ marginTop: 0, marginBottom: 0 }}
                        />

                        <div className="emr-action-bar assessment-action-bar">
                          {!cdssRetiredMessage && (
                            <button
                              onClick={() => void runCDSS()}
                              disabled={cdssLoading || !keluhanUtama.trim()}
                              className="assessment-run-button"
                              style={{
                                flex: 1,
                                cursor: cdssLoading || !keluhanUtama.trim() ? 'not-allowed' : 'pointer',
                                opacity: !keluhanUtama.trim() ? 0.4 : 1,
                              }}
                            >
                              {cdssLoading ? '⏳ MEMPROSES CDSS...' : '▶ JALANKAN CDSS ENGINE'}
                            </button>
                          )}
                          <button
                            onClick={resetEmrDraft}
                            className="assessment-reset-button"
                            style={{
                              cursor: 'pointer',
                              whiteSpace: 'nowrap',
                            }}
                          >
                            ↺ RESET
                          </button>
                        </div>
                      </div>

                      <div className="assessment-side-panel">
                        <div className="assessment-side-block">
                          <div className="assessment-side-title">Clinical Readiness</div>
                          <div className="assessment-readiness-grid">
                            <div className="assessment-readiness-item">
                              <span className="assessment-readiness-label">Ringkasan keluhan</span>
                              <strong className="assessment-readiness-title">
                                {readinessComplaintHeadline || 'Belum ada ringkasan gejala'}
                              </strong>
                              <small className="assessment-readiness-copy">
                                {readinessComplaintHeadline
                                  ? `Onset: ${readinessOnsetLabel ?? 'Perlu digali'} | Triage: `
                                  : 'Isi keluhan utama dan gejala penyerta agar ringkasan klinis terbentuk.'}
                                {readinessComplaintHeadline && (
                                  <span
                                    style={{
                                      color: readinessTriageColor,
                                      fontWeight: 600,
                                    }}
                                  >
                                    {readinessTriageLabel}
                                  </span>
                                )}
                              </small>
                            </div>
                            <div className="assessment-readiness-item">
                              <span className="assessment-readiness-label">Sintesis klinis</span>
                              <strong
                                className={`assessment-readiness-title${assessmentConclusion.trim() ? '' : ' is-accent'}`}
                              >
                                {assessmentConclusion.trim()
                                  ? assessmentConclusionMeta.mode === 'auto'
                                    ? 'Sintesis awal otomatis siap'
                                    : 'Sintesis siap diproses'
                                  : '+ Tambahkan Sintesis'}
                              </strong>
                              <small className="assessment-readiness-copy">
                                {assessmentConclusion.trim()
                                  ? assessmentConclusion.trim()
                                  : 'Diperlukan untuk optimasi reasoning engine. Ketik ringkasan klinis...'}
                              </small>
                              {!assessmentConclusion.trim() && (
                                <button
                                  type="button"
                                  className="assessment-readiness-cta"
                                  onClick={() => assessmentConclusionInputRef.current?.focus()}
                                >
                                  FOKUS KE INPUT
                                </button>
                              )}
                            </div>
                            <div className="assessment-readiness-item">
                              <span className="assessment-readiness-label">Output CDSS</span>
                              <strong className="assessment-readiness-title">
                                {readinessOutputTitle}
                              </strong>
                              <small className="assessment-readiness-copy">
                                {readinessOutputSubtitle}
                              </small>
                            </div>
                            <div className="assessment-readiness-item">
                              <span className="assessment-readiness-label">Keputusan dokter</span>
                              <strong className="assessment-readiness-title">
                                {readinessDecisionTitle}
                              </strong>
                              <small className="assessment-readiness-copy">
                                {readinessDecisionSubtitle}
                              </small>
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                </>
              )}

              {isAssessmentTab && (
                <div className="entity-sidebar emr-secondary-stack">
                  {/* CDSS Panel — Iskandar Engine V2 */}
                  {(cdssLoading || cdssResult || cdssError) && (
                    <div
                      ref={cdssPanelRef}
                      className="extraction-block cdss-primary-panel"
                      style={{ order: 1 }}
                    >
                      {/* Header */}
                      {cdssResult && (
                        <div
                          className="extraction-header"
                          style={{
                            color: 'var(--c-asesmen)',
                            marginBottom: 12,
                            justifyContent: 'flex-end',
                          }}
                        >
                          <span
                            style={{
                              fontSize: 14,
                              color: 'var(--text-muted)',
                            }}
                          >
                            {cdssResult.processing_time_ms}ms · {cdssResult.source.toUpperCase()}
                          </span>
                        </div>
                      )}

                      {cdssLoading && (
                        <div
                          style={{
                            padding: '12px 0',
                            fontSize: 14,
                            color: 'var(--text-secondary)',
                          }}
                        >
                          MENJALANKAN ISKANDAR DIAGNOSIS ENGINE V2...
                        </div>
                      )}

                      {cdssError && (
                        <div
                          style={{
                            padding: '8px 0',
                            fontSize: 14,
                            color: 'var(--c-critical)',
                          }}
                        >
                          {cdssError}
                        </div>
                      )}

                      {cdssLoading && renderCdssBranchFlow()}

                      {cdssResult && (
                        <div className="extracted-list">
                          <div className="cdss-result-layout">
                            <aside className="cdss-result-sidebar">
                              <div className="cdss-summary-grid">
                                <div className="cdss-summary-tile">
                                  <span className="cdss-summary-label">Output tervalidasi</span>
                                  <strong>
                                    {cdssResult.validation_summary.total_validated}/
                                    {cdssResult.validation_summary.total_raw}
                                  </strong>
                                </div>
                                <div className="cdss-summary-tile">
                                  <span className="cdss-summary-label">Diagnosis kerja</span>
                                  <strong>{cdssResult.validation_summary.recommended_count}</strong>
                                </div>
                                <div className="cdss-summary-tile">
                                  <span className="cdss-summary-label">Perlu review</span>
                                  <strong>{cdssResult.validation_summary.review_count}</strong>
                                </div>
                                <div className="cdss-summary-tile">
                                  <span className="cdss-summary-label">Must-not-miss</span>
                                  <strong>
                                    {cdssResult.validation_summary.must_not_miss_count}
                                  </strong>
                                </div>
                              </div>

                              {requiresEmergencyAck && (
                                <div
                                  style={{
                                    padding: '12px 16px',
                                    marginBottom: 8,
                                    borderLeft: '2px solid var(--critical)',
                                    borderRadius: '0 var(--radius-sm) var(--radius-sm) 0',
                                    background: 'var(--critical-tint)',
                                  }}
                                >
                                  <div
                                    style={{
                                      fontSize: 14,
                                      fontWeight: 600,
                                      color: 'var(--critical)',
                                      marginBottom: 8,
                                    }}
                                  >
                                    PROTOKOL EMERGENCY: ACK WAJIB
                                  </div>
                                  {Object.keys(safetyChecklist).map((item, idx) => (
                                    <label
                                      key={`${item}-${idx}`}
                                      style={{
                                        display: 'flex',
                                        gap: 6,
                                        alignItems: 'flex-start',
                                        fontSize: 14,
                                        color: 'var(--text-main)',
                                        marginBottom: 4,
                                      }}
                                    >
                                      <input
                                        id={`safety-${idx}`}
                                        name={`safety-${idx}`}
                                        type="checkbox"
                                        checked={Boolean(safetyChecklist[item])}
                                        onChange={(e) =>
                                          setSafetyChecklist((prev) => ({
                                            ...prev,
                                            [item]: e.target.checked,
                                          }))
                                        }
                                      />
                                      <span>{item}</span>
                                    </label>
                                  ))}
                                  <button
                                    type="button"
                                    onClick={() => void acknowledgeEmergencyProtocol()}
                                    disabled={!allSafetyChecklistChecked() || ackSaving}
                                    className="ui-btn ui-btn--sm"
                                    style={{
                                      marginTop: 8,
                                      color: 'var(--text-on-accent)',
                                      background: 'var(--critical)',
                                      cursor:
                                        ackSaving || !allSafetyChecklistChecked()
                                          ? 'not-allowed'
                                          : 'pointer',
                                    }}
                                  >
                                    {ackSaving ? 'MENYIMPAN ACK...' : 'ACK PROTOKOL EMERGENCY'}
                                  </button>
                                </div>
                              )}

                              {/* Red Flags */}
                              {cdssResult.red_flags.map((rf, i) => (
                                <div
                                  key={i}
                                  style={{
                                    padding: '12px 16px',
                                    marginBottom: 8,
                                    borderLeft: `2px solid ${rf.severity === 'emergency' ? 'var(--critical)' : 'var(--warning)'}`,
                                    borderRadius: '0 var(--radius-sm) var(--radius-sm) 0',
                                    background:
                                      rf.severity === 'emergency'
                                        ? 'var(--critical-tint)'
                                        : 'var(--warning-tint)',
                                  }}
                                >
                                  <div
                                    style={{
                                      fontSize: 14,
                                      color:
                                        rf.severity === 'emergency'
                                          ? 'var(--critical)'
                                          : 'var(--warning)',
                                      fontWeight: 600,
                                      marginBottom: 4,
                                    }}
                                  >
                                    ⚠ {rf.severity.toUpperCase()} — {rf.condition}
                                  </div>
                                  <div
                                    style={{
                                      fontSize: 14,
                                      color: 'var(--text-muted)',
                                    }}
                                  >
                                    {rf.action}
                                  </div>
                                </div>
                              ))}

                              {/* Traffic Light alert (dari alerts[]) */}
                              {cdssResult.alerts
                                .filter((a) => a.type === 'red_flag' || a.type === 'vital_sign')
                                .slice(0, 1)
                                .map((a) => (
                                  <div
                                    key={a.id}
                                    style={{
                                      padding: '6px 0',
                                      marginBottom: 8,
                                      fontSize: 14,
                                    }}
                                  >
                                    <span
                                      style={{
                                        color:
                                          a.severity === 'high' || a.severity === 'emergency'
                                            ? 'var(--c-critical)'
                                            : 'var(--warning)',
                                        marginRight: 6,
                                      }}
                                    >
                                      ● {a.severity.toUpperCase()}
                                    </span>
                                    <span style={{ color: 'var(--text-muted)' }}>
                                      {a.title} — {a.message}
                                    </span>
                                  </div>
                                ))}

                              {/* Validation summary */}
                              {(cdssResult.validation_summary.total_raw > 0 ||
                                cdssResult.validation_summary.warnings.length > 0) && (
                                <div className="cdss-callout-block cdss-validation-grid">
                                  <div className="cdss-validation-main">
                                    <div
                                      style={{
                                        fontSize: 14,
                                        color: 'var(--text-muted)',
                                      }}
                                    >
                                      {cdssResult.validation_summary.total_validated}/
                                      {cdssResult.validation_summary.total_raw} tervalidasi
                                      {` · ${cdssResult.validation_summary.recommended_count} recommended`}
                                      {` · ${cdssResult.validation_summary.review_count} review`}
                                      {` · ${cdssResult.validation_summary.must_not_miss_count} must-not-miss`}
                                      {cdssResult.validation_summary.unverified_codes.length > 0 &&
                                        ` · ${cdssResult.validation_summary.unverified_codes.length} kode perlu review`}
                                    </div>
                                    {cdssResult.validation_summary.requires_more_data && (
                                      <div
                                        style={{
                                          marginTop: 6,
                                          fontSize: 12,
                                          color: 'var(--warning)',
                                        }}
                                      >
                                        Engine masih butuh data tambahan sebelum diagnosis kerja
                                        dianggap cukup kuat.
                                      </div>
                                    )}
                                    {cdssResult.validation_summary.warnings.length > 0 && (
                                      <div
                                        style={{
                                          marginTop: 6,
                                          display: 'flex',
                                          flexDirection: 'column',
                                          gap: 4,
                                        }}
                                      >
                                        {cdssResult.validation_summary.warnings
                                          .slice(0, 4)
                                          .map((warning, idx) => (
                                            <div
                                              key={`validation-warning-${idx}`}
                                              style={{
                                                fontSize: 12,
                                                color: 'var(--text-muted)',
                                              }}
                                            >
                                              • {summarizeValidationWarning(warning)}
                                            </div>
                                          ))}
                                        {cdssResult.validation_summary.warnings.length > 4 && (
                                          <div
                                            style={{
                                              fontSize: 12,
                                              color: 'var(--text-muted)',
                                              opacity: 0.8,
                                            }}
                                          >
                                            +{cdssResult.validation_summary.warnings.length - 4}{' '}
                                            warning validasi lainnya
                                          </div>
                                        )}
                                      </div>
                                    )}
                                    {importantBestQuestions.length > 0 && (
                                      <div className="cdss-validation-questions">
                                        <div className="cdss-validation-questions-title">
                                          Next Best Questions
                                        </div>
                                        <div className="cdss-validation-questions-list">
                                          {importantBestQuestions.slice(0, 3).map((question) => (
                                            <div
                                              key={question.id}
                                              className="cdss-validation-question-item"
                                            >
                                              <div className="cdss-validation-question-label">
                                                {question.title}
                                              </div>
                                              <div className="cdss-validation-question-prompt">
                                                {question.prompt}
                                              </div>
                                            </div>
                                          ))}
                                        </div>
                                      </div>
                                    )}
                                  </div>
                                  <div className="cdss-validation-vitals">
                                    <div className="cdss-validation-vitals-title">
                                      Vital Sign Singkat
                                    </div>
                                    {compactVitalsSignals.length > 0 ? (
                                      compactVitalsSignals.map((item) => (
                                        <div
                                          key={item.label}
                                          className="cdss-validation-vital-item"
                                        >
                                          <span className="cdss-validation-vital-label">
                                            {item.label}
                                          </span>
                                          <span className="cdss-validation-vital-value">
                                            {item.value}
                                          </span>
                                        </div>
                                      ))
                                    ) : (
                                      <div className="cdss-validation-vitals-empty">
                                        Belum ada data TTV tersimpan.
                                      </div>
                                    )}
                                  </div>
                                </div>
                              )}
                            </aside>
                            <div className="cdss-result-main">
                              {!cdssLoading && renderCdssBranchFlow()}

                              <div className="cdss-lane-grid">
                                <div className="cdss-lane cdss-lane-recommended">
                                  <div
                                    style={{
                                      fontSize: 12,
                                      color: 'var(--c-asesmen)',
                                      marginBottom: 6,
                                    }}
                                  >
                                    RECOMMENDED
                                  </div>
                                  {recommendedSuggestions.length > 0 ? (
                                    recommendedSuggestions.map(renderSuggestionCard)
                                  ) : (
                                    <div
                                      style={{
                                        fontSize: 12,
                                        color: 'var(--text-muted)',
                                      }}
                                    >
                                      Belum ada suggestion yang cukup kuat menjadi diagnosis kerja.
                                    </div>
                                  )}
                                </div>
                                <div className="cdss-lane cdss-lane-review">
                                  <div
                                    style={{
                                      fontSize: 12,
                                      color: 'var(--warning)',
                                      marginBottom: 6,
                                    }}
                                  >
                                    REVIEW DOKTER
                                  </div>
                                  {reviewSuggestions.length > 0 ? (
                                    reviewSuggestions.map(renderSuggestionCard)
                                  ) : (
                                    <div
                                      style={{
                                        fontSize: 12,
                                        color: 'var(--text-muted)',
                                      }}
                                    >
                                      Tidak ada suggestion review aktif untuk kasus ini.
                                    </div>
                                  )}
                                </div>
                                <div className="cdss-lane cdss-lane-critical">
                                  <div
                                    style={{
                                      fontSize: 12,
                                      color: 'var(--c-critical)',
                                      marginBottom: 6,
                                    }}
                                  >
                                    MUST-NOT-MISS
                                  </div>
                                  {mustNotMissSuggestions.length > 0 ? (
                                    mustNotMissSuggestions.map(renderSuggestionCard)
                                  ) : (
                                    <div
                                      style={{
                                        fontSize: 12,
                                        color: 'var(--text-muted)',
                                      }}
                                    >
                                      Tidak ada diagnosis berisiko tinggi yang perlu dipisahkan saat
                                      ini.
                                    </div>
                                  )}
                                </div>
                              </div>
                            </div>
                          </div>

                          {selectedDiagnosisDraft && (
                            <div
                              ref={selectedDiagnosisPanelRef}
                              className={`cdss-selected-panel emr-row3-spotlight${row3Spotlight === 'prognosis' ? ' is-shadowed' : ''}`}
                            >
                              <div className="cdss-selected-panel-head">
                                <div className="cdss-selected-kicker">
                                  KONFIRMASI KLINIS PENTING
                                </div>
                                <div className="cdss-selected-diagnosis">
                                  {selectedDiagnosisDraft.diagnosis_name}
                                  <span>({selectedDiagnosisDraft.icd10_code})</span>
                                </div>
                                {reviewAcceptanceReason && (
                                  <div className="cdss-selected-review-reason">
                                    Review diterima: {reviewAcceptanceReason}
                                  </div>
                                )}
                              </div>
                              <div className="cdss-selected-form-grid">
                                <input
                                  id="feedback-final-icd"
                                  name="feedback-final-icd"
                                  type="text"
                                  value={feedbackFinalIcd}
                                  onChange={(e) => setFeedbackFinalIcd(e.target.value)}
                                  placeholder="ICD final dokter"
                                  className="ui-input"
                                />
                                <input
                                  id="feedback-override-reason"
                                  name="feedback-override-reason"
                                  type="text"
                                  value={feedbackOverrideReason}
                                  onChange={(e) => setFeedbackOverrideReason(e.target.value)}
                                  placeholder="Alasan override final (opsional)"
                                  className="ui-input"
                                />
                                <input
                                  id="feedback-followup-note"
                                  name="feedback-followup-note"
                                  type="text"
                                  value={feedbackFollowUpNote}
                                  onChange={(e) => setFeedbackFollowUpNote(e.target.value)}
                                  placeholder="Catatan follow-up (opsional)"
                                  className="ui-input"
                                  style={{ gridColumn: '1 / -1' }}
                                />
                                <div className="cdss-selected-outcome-row">
                                  <label
                                    style={{
                                      display: 'flex',
                                      alignItems: 'center',
                                      gap: 4,
                                    }}
                                  >
                                    <input
                                      id="outcome-membaik"
                                      name="feedback-outcome"
                                      type="radio"
                                      checked={feedbackOutcomeConfirmed === true}
                                      onChange={() => setFeedbackOutcomeConfirmed(true)}
                                    />
                                    Outcome membaik
                                  </label>
                                  <label
                                    style={{
                                      display: 'flex',
                                      alignItems: 'center',
                                      gap: 4,
                                    }}
                                  >
                                    <input
                                      id="outcome-tidak-membaik"
                                      name="feedback-outcome"
                                      type="radio"
                                      checked={feedbackOutcomeConfirmed === false}
                                      onChange={() => setFeedbackOutcomeConfirmed(false)}
                                    />
                                    Outcome tidak membaik
                                  </label>
                                </div>
                                <button
                                  type="button"
                                  onClick={() => void submitOutcomeFeedback()}
                                  disabled={feedbackSaving || !feedbackFinalIcd.trim()}
                                  className="cdss-selected-save-btn"
                                >
                                  {feedbackSaving
                                    ? 'MENYIMPAN FEEDBACK...'
                                    : 'SIMPAN FEEDBACK OUTCOME'}
                                </button>
                              </div>
                            </div>
                          )}

                          {selectedDiagnosisDraft && (
                            <div
                              ref={prognosisStageRef}
                              className={`cdss-prognosis-stage emr-row3-spotlight${row3Spotlight === 'entry' ? ' is-shadowed' : ''}`}
                            >
                              <div className="cdss-prognosis-stage-label">PROGNOSIS LANJUTAN</div>
                              <ClinicalPrognosisChart
                                vitals={prognosisVitals}
                                keluhanUtama={keluhanUtama}
                                patientAge={patientAge}
                                patientGender={patientGender}
                                bodyWeightKg={
                                  bodyWeightKg.trim() ? Number(bodyWeightKg) : undefined
                                }
                                chronicDiseases={Array.from(rpdSelected)}
                                isPregnant={patientGender === 'P' ? isPregnant : false}
                                selectedDiagnosis={
                                  selectedDiagnosisDraft
                                    ? {
                                        diagnosis_name: selectedDiagnosisDraft.diagnosis_name,
                                        icd10_code: selectedDiagnosisDraft.icd10_code,
                                      }
                                    : null
                                }
                              />
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  )}

                  {showInsight && isAssessmentTab && (
                    <div
                      className="extraction-block"
                      style={{
                        order: 4,
                        opacity: trajectoryActive ? 1 : 0,
                        transform: trajectoryActive ? 'translateY(0)' : 'translateY(10px)',
                        transition: 'all 0.8s ease',
                        display: 'flex',
                      }}
                    >
                      <div
                        className="extraction-header"
                        style={{
                          color: 'var(--text-muted)',
                          borderBottomColor: 'var(--line-base)',
                        }}
                      >
                        <span
                          style={{
                            display: 'flex',
                            alignItems: 'center',
                            gap: 6,
                          }}
                        >
                          <span
                            className="ai-pulse-dot"
                            style={{
                              background: 'var(--text-muted)',
                              animation: 'none',
                              opacity: 0.3,
                            }}
                          />
                          AI TRAJECTORY INSIGHT
                        </span>
                      </div>
                      <div
                        className="insight-text-sidebar"
                        style={{
                          color: 'var(--text-muted)',
                          fontStyle: 'italic',
                        }}
                      >
                        {trajectoryVisitHistory.length > 0
                          ? `${trajectoryVisitHistory.length} kunjungan historis terbaru dimuat. Trajektori aktif dengan jendela analisis terakhir.`
                          : 'Belum ada riwayat kunjungan sebelumnya. Trajektori akan tersedia setelah data terkumpul.'}
                      </div>
                    </div>
                  )}
                </div>
              )}
              {isFinalizeTab && selectedDiagnosisDraft && (
                <div ref={finalizeAnchorRef} className="blueprint-wrapper finalize-assist-panel">
                  <div className="finalize-assist-header">
                    <span className="finalize-assist-kicker">FINALISASI</span>
                    <span className="finalize-assist-title">
                      Therapy Engine &amp; Sign-Off Plan
                    </span>
                  </div>
                  <div className="finalize-assist-hero">
                    <div className="finalize-assist-hero-main">
                      <div className="finalize-assist-hero-label">Diagnosis final kerja</div>
                      <div className="finalize-diagnosis-card">
                        <div className="finalize-diagnosis-card-head">
                          <div className="finalize-diagnosis-title-block">
                            <div className="finalize-assist-hero-title">
                              {selectedDiagnosisDraft?.diagnosis_name ??
                                finalizationSuggestion?.diagnosis_name ??
                                'Belum ada diagnosis yang dipilih'}
                            </div>
                            <div className="finalize-diagnosis-chip-row">
                              {(selectedDiagnosisDraft?.icd10_code ??
                                finalizationSuggestion?.icd10_code) && (
                                <span className="finalize-diagnosis-chip">
                                  {selectedDiagnosisDraft?.icd10_code ??
                                    finalizationSuggestion?.icd10_code}
                                </span>
                              )}
                              {selectedDiagnosisDraft && (
                                <span className="finalize-diagnosis-chip">
                                  {Math.round(selectedDiagnosisDraft.confidence * 100)}% confidence
                                </span>
                              )}
                              {selectedDiagnosisDraft && (
                                <span className="finalize-diagnosis-chip finalize-diagnosis-chip-accent">
                                  {finalizationDecisionBucket}
                                </span>
                              )}
                            </div>
                          </div>
                        </div>
                        {finalizationDiagnosisSummary && (
                          <div className="finalize-diagnosis-summary-block">
                            <div className="finalize-diagnosis-summary-label">Ringkasan klinis</div>
                            <div className="finalize-diagnosis-summary">
                              {finalizationDiagnosisSummary}
                            </div>
                          </div>
                        )}
                      </div>

                      {/* ── Manual Diagnosis Override ── */}
                      <div
                        style={{
                          marginTop: 16,
                          padding: 16,
                          borderRadius: 'var(--radius-md)',
                          border: manualDiagnosis
                            ? '1px solid var(--primary)'
                            : '1px solid var(--border)',
                          background: manualDiagnosis ? 'var(--primary-tint)' : 'var(--surface-subtle)',
                        }}
                      >
                        <div
                          style={{
                            fontSize: 12,
                            color: manualDiagnosis ? 'var(--primary)' : 'var(--text-muted)',
                            fontWeight: 600,
                            marginBottom: 8,
                          }}
                        >
                          {manualDiagnosis
                            ? 'DIAGNOSIS MANUAL AKTIF'
                            : 'ATAU TULIS DIAGNOSIS MANUAL'}
                        </div>
                        <div
                          style={{
                            display: 'grid',
                            gridTemplateColumns: '1fr 140px',
                            gap: 8,
                          }}
                        >
                          <input
                            type="text"
                            placeholder="Nama diagnosis..."
                            value={manualDiagnosis}
                            onChange={(e) => setManualDiagnosis(e.target.value)}
                            className="ui-input"
                          />
                          <input
                            type="text"
                            placeholder="ICD-10 (opsional)"
                            value={manualIcd10}
                            onChange={(e) => setManualIcd10(e.target.value)}
                            className="ui-input"
                          />
                        </div>
                        {manualDiagnosis && (
                          <div
                            style={{
                              fontSize: 12,
                              color: 'var(--primary)',
                              marginTop: 6,
                            }}
                          >
                            Diagnosis manual akan digunakan pada laporan klinis, menggantikan saran
                            CDSS.
                          </div>
                        )}
                      </div>

                      <div className="finalize-assist-hero-copy">
                        {finalizationTherapyPlan.careMode.note}
                      </div>
                    </div>
                    <div
                      className={`finalize-assist-care-mode is-${finalizationTherapyPlan.careMode.tone}`}
                    >
                      <span className="finalize-assist-care-mode-label">Mode tatalaksana</span>
                      <strong>{finalizationTherapyPlan.careMode.label}</strong>
                      <small>{finalizationTherapyPlan.sourceLabel}</small>
                    </div>
                  </div>
                  <div className="finalize-assist-summary finalize-assist-summary-topline">
                    <div className="finalize-assist-summary-item finalize-assist-summary-item-assessment">
                      <span className="finalize-assist-label">Assessment conclusion</span>
                      <div className="finalize-assist-assessment-copy">
                        {assessmentConclusion.trim() ||
                          'Belum diisi. Lengkapi kesimpulan asesmen sebelum sign-off.'}
                      </div>
                    </div>
                    <div className="finalize-assist-summary-item finalize-assist-summary-item-meta">
                      <span className="finalize-assist-label">Ringkasan tatalaksana</span>
                      <div className="finalize-assist-meta-grid">
                        <div className="finalize-assist-meta-row">
                          <span className="finalize-assist-meta-key">Body system</span>
                          <strong>{finalizationTherapyPlan.bodySystem}</strong>
                        </div>
                        <div className="finalize-assist-meta-row">
                          <span className="finalize-assist-meta-key">Kompetensi</span>
                          <strong>{finalizationTherapyPlan.competence}</strong>
                        </div>
                        <div className="finalize-assist-meta-row">
                          <span className="finalize-assist-meta-key">Cakupan formularium</span>
                          <strong>{finalizationTherapyPlan.stockCoverageLabel}</strong>
                        </div>
                      </div>
                    </div>
                  </div>
                  <div className="finalize-assist-grid finalize-assist-grid-primary">
                    <div className="finalize-assist-card finalize-assist-card-urgent">
                      <div className="finalize-assist-card-head">
                        <div className="finalize-assist-card-title">Tindakan Sekarang</div>
                        <div className="finalize-assist-card-count">
                          {finalizationTherapyPlan.immediateActions.length}
                        </div>
                      </div>
                      <div className="finalize-assist-card-subtitle">
                        Langkah yang perlu diputuskan atau dikerjakan segera pada fase tata laksana.
                      </div>
                      <div role="list" aria-label="Tindakan segera finalisasi">
                        {finalizationTherapyPlan.immediateActions.map((item, index) => (
                          <div
                            key={`immediate-${index}`}
                            className="finalize-assist-bullet"
                            role="listitem"
                          >
                            • {item}
                          </div>
                        ))}
                      </div>
                    </div>
                    <div className="finalize-assist-card finalize-assist-card-referral">
                      <div className="finalize-assist-card-head">
                        <div className="finalize-assist-card-title">Disposisi &amp; Rujukan</div>
                        <div className="finalize-assist-card-count">
                          {Math.max(finalizationTherapyPlan.referralDiagnoses.length, 2)}
                        </div>
                      </div>
                      <div className="finalize-assist-card-subtitle">
                        Menentukan apakah pasien tetap dikelola di Puskesmas atau perlu eskalasi
                        layanan.
                      </div>
                      <div role="list" aria-label="Disposisi dan rujukan finalisasi">
                        {finalizationTherapyPlan.referral.length > 0 ? (
                          finalizationTherapyPlan.referral.map((item, index) => (
                            <div
                              key={`referral-${index}`}
                              className="finalize-assist-bullet"
                              role="listitem"
                            >
                              • {item}
                            </div>
                          ))
                        ) : (
                          <div className="finalize-assist-bullet" role="listitem">
                            • Lanjutkan tatalaksana di Puskesmas bila respons klinis stabil dan
                            tidak ada red flag baru.
                          </div>
                        )}
                      </div>
                      <div className="finalize-assist-referral-diagnosis">
                        <div className="finalize-assist-section-kicker">
                          Diagnosis rujukan yang perlu dipikirkan
                        </div>
                        <div role="list" aria-label="Diagnosis rujukan prioritas">
                          {finalizationTherapyPlan.referralDiagnoses.map((item, index) => (
                            <div
                              key={`referral-diagnosis-${index}`}
                              className="finalize-assist-bullet"
                              role="listitem"
                            >
                              • {item}
                            </div>
                          ))}
                        </div>
                      </div>
                    </div>
                  </div>
                  <div className="finalize-assist-grid finalize-assist-grid-single">
                    <div className="finalize-assist-card finalize-pharmacology-card">
                      <div className="finalize-pharmacology-head">
                        <div>
                          <div className="finalize-assist-card-head finalize-assist-card-head-compact">
                            <div className="finalize-assist-card-title">
                              Terapi &amp; Farmakologi
                            </div>
                            <div className="finalize-assist-card-count">
                              {finalizationMedicationSummary.selected}/
                              {finalizationMedicationSummary.total}
                            </div>
                          </div>
                          <div className="finalize-pharmacology-subtitle">
                            Formularium aktif dan susunan resep awal yang paling relevan untuk
                            diagnosis kerja saat ini: Obat Utama, Obat Adjuvant, lalu Vitamin.
                            Centang obat AI yang ingin dipakai di resep akhir.
                          </div>
                        </div>
                        {finalizationTherapyPlan.medications.length > 0 && (
                          <div
                            className="finalize-pharmacology-selection-actions"
                            role="group"
                            aria-label="Kontrol pemilihan obat AI"
                          >
                            <button
                              type="button"
                              className="finalize-pharmacology-selection-button"
                              onClick={selectAllAIMedications}
                              disabled={
                                finalizationMedicationSummary.selected ===
                                finalizationMedicationSummary.total
                              }
                            >
                              Pilih semua
                            </button>
                            <button
                              type="button"
                              className="finalize-pharmacology-selection-button is-secondary"
                              onClick={clearAllAIMedications}
                              disabled={finalizationMedicationSummary.selected === 0}
                            >
                              Kosongkan semua
                            </button>
                            <button
                              type="button"
                              className={`finalize-pharmacology-selection-button is-secondary${showSelectedAIMedicationsOnly ? ' is-active' : ''}`}
                              onClick={() => setShowSelectedAIMedicationsOnly((prev) => !prev)}
                              disabled={finalizationMedicationSummary.selected === 0}
                            >
                              {showSelectedAIMedicationsOnly
                                ? 'Tampilkan semua'
                                : 'Hanya yang dipilih dokter'}
                            </button>
                          </div>
                        )}
                      </div>
                      {finalizationTherapyPlan.medications.length > 0 ? (
                        <div
                          className="finalize-assist-medication-list finalize-pharmacology-list"
                          role="list"
                          aria-label="Daftar terapi farmakologi awal"
                        >
                          {[...visibleFinalizationMedications]
                            .sort(
                              (a, b) =>
                                (({ utama: 0, adjuvant: 1, vitamin: 2 })[a.prescriptionSlot] ?? 1) -
                                ({ utama: 0, adjuvant: 1, vitamin: 2 }[b.prescriptionSlot] ?? 1)
                            )
                            .map((item, index, sorted) => {
                              const medicationKey = getFinalizationMedicationKey(item)
                              const isFirstInSlot =
                                index === 0 ||
                                sorted[index - 1].prescriptionSlot !== item.prescriptionSlot
                              const slotLabel =
                                item.prescriptionSlot === 'utama'
                                  ? 'R/ 1. OBAT UTAMA'
                                  : item.prescriptionSlot === 'adjuvant'
                                    ? 'R/ 2. OBAT ADJUVANT'
                                    : 'R/ 3. VITAMIN'
                              const rxLabel =
                                item.prescriptionSlot === 'utama'
                                  ? 'R/1'
                                  : item.prescriptionSlot === 'adjuvant'
                                    ? 'R/2'
                                    : 'R/3'
                              const isSelected = selectedAIMedicationKeySet.has(medicationKey)
                              return (
                                <Fragment key={`medication-${index}`}>
                                  {isFirstInSlot && (
                                    <div className="finalize-pharmacology-slot-label">
                                      {slotLabel}
                                    </div>
                                  )}
                                  <div
                                    className={`finalize-assist-medication-item finalize-pharmacology-item${isSelected ? ' is-selected' : ' is-recommended-only'}`}
                                    role="listitem"
                                  >
                                    <div className="finalize-pharmacology-rx">{rxLabel}</div>
                                    <div className="finalize-pharmacology-body">
                                      <div className="finalize-assist-medication-head">
                                        <div className="finalize-pharmacology-title-stack">
                                          <strong>{item.name}</strong>
                                          <div className="finalize-pharmacology-selection-status-row">
                                            <span
                                              className={`finalize-pharmacology-selection-status${isSelected ? ' is-selected' : ' is-recommended-only'}`}
                                            >
                                              {isSelected ? 'Dipilih dokter' : 'Rekomendasi AI'}
                                            </span>
                                          </div>
                                        </div>
                                        <div
                                          style={{
                                            display: 'flex',
                                            alignItems: 'center',
                                            gap: 10,
                                            flexWrap: 'wrap',
                                          }}
                                        >
                                          <label
                                            style={{
                                              display: 'inline-flex',
                                              alignItems: 'center',
                                              gap: 6,
                                              fontSize: 12,
                                              color: 'var(--text-muted)',
                                              cursor: 'pointer',
                                            }}
                                          >
                                            <input
                                              type="checkbox"
                                              checked={isSelected}
                                              onChange={() =>
                                                toggleAIMedicationSelection(medicationKey)
                                              }
                                            />
                                            Pakai di resep
                                          </label>
                                          <DrugStatusBadge
                                            status={item.stockStatus}
                                            quantity={item.stockQuantity}
                                            unit={item.stockUnit}
                                          />
                                        </div>
                                      </div>
                                      <div
                                        className="finalize-pharmacology-prescription-grid"
                                        role="list"
                                        aria-label={`Detail resep ${item.name}`}
                                      >
                                        <div
                                          className="finalize-pharmacology-prescription-item"
                                          role="listitem"
                                        >
                                          <span className="finalize-pharmacology-prescription-label">
                                            Dosis
                                          </span>
                                          <strong>{item.dose}</strong>
                                        </div>
                                        <div
                                          className="finalize-pharmacology-prescription-item"
                                          role="listitem"
                                        >
                                          <span className="finalize-pharmacology-prescription-label">
                                            Waktu
                                          </span>
                                          <strong>{item.frequency}</strong>
                                        </div>
                                        <div
                                          className="finalize-pharmacology-prescription-item"
                                          role="listitem"
                                        >
                                          <span className="finalize-pharmacology-prescription-label">
                                            Cara
                                          </span>
                                          <strong>
                                            {(item.route || 'oral').replace(/^\w/, (c) =>
                                              c.toUpperCase()
                                            )}
                                          </strong>
                                        </div>
                                        <div
                                          className="finalize-pharmacology-prescription-item finalize-pharmacology-prescription-item-manual"
                                          role="listitem"
                                        >
                                          <label
                                            className="finalize-pharmacology-prescription-label"
                                            htmlFor={`medication-note-${index}`}
                                          >
                                            Catatan dokter
                                          </label>
                                          <input
                                            id={`medication-note-${index}`}
                                            name={`medication-note-${index}`}
                                            type="text"
                                            value={manualMedicationNotes[medicationKey] ?? ''}
                                            maxLength={120}
                                            onChange={(event) => {
                                              const nextValue = event.target.value
                                              setManualMedicationNotes((prev) => ({
                                                ...prev,
                                                [medicationKey]: nextValue,
                                              }))
                                            }}
                                            className="finalize-pharmacology-manual-input"
                                            placeholder="isi manual"
                                          />
                                        </div>
                                      </div>
                                      <div className="finalize-assist-medication-meta finalize-pharmacology-meta">
                                        {item.canonicalName && <span>{item.canonicalName}</span>}
                                        <span>
                                          Golongan Obat: {getMedicationCategoryLabel(item.category)}
                                        </span>
                                      </div>
                                      {item.contraindications.length > 0 && (
                                        <div className="finalize-pharmacology-contra">
                                          <div className="finalize-pharmacology-contra-label">
                                            Kontraindikasi / perlu review
                                          </div>
                                          <div
                                            role="list"
                                            aria-label={`Kontraindikasi ${item.name}`}
                                          >
                                            {item.contraindications.map((warning, warningIndex) => (
                                              <div
                                                key={`medication-warning-${index}-${warningIndex}`}
                                                className="finalize-pharmacology-contra-item"
                                                role="listitem"
                                              >
                                                • {warning}
                                              </div>
                                            ))}
                                          </div>
                                        </div>
                                      )}
                                    </div>
                                  </div>
                                </Fragment>
                              )
                            })}
                          {showSelectedAIMedicationsOnly &&
                            visibleFinalizationMedications.length === 0 && (
                              <div className="finalize-pharmacology-filter-empty">
                                Belum ada obat AI yang dipilih dokter untuk ditampilkan.
                              </div>
                            )}
                        </div>
                      ) : (
                        <div className="finalize-pharmacology-empty">
                          <div className="finalize-pharmacology-empty-title">
                            Belum ada obat spesifik yang terpetakan
                          </div>
                          <div className="finalize-pharmacology-empty-copy">
                            Gunakan judgement klinis, formularium aktif, dan verifikasi
                            kontraindikasi sebelum sign-off.
                          </div>
                        </div>
                      )}
                      {finalizationMedicationSummary.unmapped > 0 && (
                        <div className="finalize-pharmacology-footnote">
                          {finalizationMedicationSummary.unmapped} item belum masuk formularium
                          aktif dan tidak ditampilkan sebagai rekomendasi terapi.
                        </div>
                      )}
                      {finalizationMedicationSummary.unavailable > 0 && (
                        <div className="finalize-pharmacology-footnote">
                          {finalizationMedicationSummary.unavailable} item masih perlu verifikasi
                          manual sebelum dipakai di resep akhir.
                        </div>
                      )}

                      {/* ── Resep Dokter (Manual) ── */}
                      <div
                        className={`finalize-pharmacology-manual-card${manualMedications.length > 0 ? ' is-active' : ''}`}
                      >
                        <div className="finalize-pharmacology-manual-kicker">
                          RESEP DOKTER{' '}
                          {manualMedications.length > 0 && `(${manualMedications.length}/4)`}
                        </div>
                        <div className="finalize-pharmacology-manual-copy">
                          Ketik nama obat untuk memunculkan autocomplete formularium beserta dosis,
                          frekuensi, dan waktu minum yang paling dekat.
                        </div>

                        {manualMedications.length > 0 && (
                          <div className="finalize-pharmacology-manual-chip-list">
                            {manualMedications.map((med, idx) => (
                              <div key={med.id} className="finalize-pharmacology-manual-chip">
                                <div className="finalize-pharmacology-manual-chip-copy">
                                  <strong className="finalize-pharmacology-manual-chip-title">
                                    R/ {med.name}
                                  </strong>
                                  <span className="finalize-pharmacology-manual-chip-meta">
                                    {[med.dose, med.frequency, med.route, med.timingHint]
                                      .filter(Boolean)
                                      .join(' • ') || 'Instruksi manual'}
                                  </span>
                                </div>
                                <button
                                  type="button"
                                  onClick={() =>
                                    setManualMedications((prev) => prev.filter((_, i) => i !== idx))
                                  }
                                  className="finalize-pharmacology-manual-chip-remove"
                                >
                                  &times;
                                </button>
                              </div>
                            ))}
                          </div>
                        )}

                        <div className="finalize-pharmacology-manual-controls">
                          <input
                            type="text"
                            placeholder="Nama obat, mis. Amoks..."
                            value={medInput}
                            onChange={(e) => {
                              setMedInput(e.target.value)
                              setActiveMedicationSuggestionIndex(0)
                            }}
                            onKeyDown={(e) => {
                              if (e.key === 'ArrowDown' && manualMedicationSuggestions.length > 0) {
                                e.preventDefault()
                                setActiveMedicationSuggestionIndex((prev) =>
                                  prev >= manualMedicationSuggestions.length - 1 ? 0 : prev + 1
                                )
                                return
                              }
                              if (e.key === 'ArrowUp' && manualMedicationSuggestions.length > 0) {
                                e.preventDefault()
                                setActiveMedicationSuggestionIndex((prev) =>
                                  prev <= 0 ? manualMedicationSuggestions.length - 1 : prev - 1
                                )
                                return
                              }
                              if (e.key === 'Escape' && manualMedicationSuggestions.length > 0) {
                                e.preventDefault()
                                setMedInput('')
                                setActiveMedicationSuggestionIndex(0)
                                return
                              }
                              if (e.key === 'Enter') {
                                e.preventDefault()
                                submitManualMedication()
                              }
                            }}
                            disabled={manualMedications.length >= 4}
                            className="finalize-pharmacology-manual-entry"
                            role="combobox"
                            aria-expanded={manualMedicationSuggestions.length > 0}
                            aria-controls="manual-medication-suggestion-list"
                            aria-activedescendant={
                              manualMedicationSuggestions.length > 0
                                ? `manual-medication-suggestion-${manualMedicationSuggestions[activeMedicationSuggestionIndex]?.id ?? ''}`
                                : undefined
                            }
                          />
                          <button
                            type="button"
                            disabled={!medInput.trim() || manualMedications.length >= 4}
                            onClick={submitManualMedication}
                            className="finalize-pharmacology-manual-add"
                          >
                            +
                          </button>
                        </div>
                        {manualMedicationSuggestions.length > 0 &&
                          medInput.trim() &&
                          manualMedications.length < 4 && (
                            <div
                              id="manual-medication-suggestion-list"
                              className="finalize-pharmacology-manual-suggestions"
                              role="listbox"
                              aria-label="Autocomplete obat manual"
                            >
                              {manualMedicationSuggestions.map((suggestion, index) => (
                                <button
                                  key={suggestion.id}
                                  id={`manual-medication-suggestion-${suggestion.id}`}
                                  type="button"
                                  className={`finalize-pharmacology-manual-suggestion${index === activeMedicationSuggestionIndex ? ' is-active' : ''}`}
                                  onClick={() =>
                                    appendManualMedication(
                                      createManualMedicationEntryFromSuggestion(suggestion)
                                    )
                                  }
                                  onMouseDown={(event) => event.preventDefault()}
                                  onMouseEnter={() => setActiveMedicationSuggestionIndex(index)}
                                  role="option"
                                  aria-selected={index === activeMedicationSuggestionIndex}
                                >
                                  <span className="finalize-pharmacology-manual-suggestion-main">
                                    <strong>{suggestion.name}</strong>
                                    <span>
                                      {[suggestion.dose, suggestion.frequency, suggestion.route]
                                        .filter(Boolean)
                                        .join(' • ')}
                                    </span>
                                  </span>
                                  <span className="finalize-pharmacology-manual-suggestion-side">
                                    <span>{suggestion.timingHint}</span>
                                    <span>{suggestion.stockLabel}</span>
                                  </span>
                                </button>
                              ))}
                            </div>
                          )}

                        {manualMedications.length >= 4 && (
                          <div className="finalize-pharmacology-manual-limit">
                            Maksimal 4 obat manual tercapai.
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                  <div className="finalize-assist-card finalize-assist-card-clinical-table finalize-assist-card-stacked">
                    <div className="finalize-assist-card-head">
                      <div className="finalize-assist-card-title">
                        Monitoring, Supportive &amp; Safety
                      </div>
                      <div className="finalize-assist-card-count">
                        {finalizationTherapyPlan.monitoring.length +
                          finalizationTherapyPlan.supportive.length +
                          finalizationTherapyPlan.safetyChecks.length}
                      </div>
                    </div>
                    <div className="finalize-assist-card-subtitle">
                      Satu meja kerja untuk observasi, intervensi suportif, dan guardrail sebelum
                      sign-off dokter.
                    </div>
                    <div className="finalize-clinical-table">
                      <div className="finalize-clinical-table-section">
                        <div className="finalize-assist-section-kicker">Monitoring</div>
                        <div role="list" aria-label="Monitoring finalisasi">
                          {finalizationTherapyPlan.monitoring.map((item, index) => (
                            <div
                              key={`monitoring-${index}`}
                              className="finalize-assist-bullet"
                              role="listitem"
                            >
                              • {item}
                            </div>
                          ))}
                        </div>
                      </div>
                      <div className="finalize-clinical-table-section">
                        <div className="finalize-assist-section-kicker">Supportive Care</div>
                        <div role="list" aria-label="Supportive care finalisasi">
                          {finalizationTherapyPlan.supportive.map((item, index) => (
                            <div
                              key={`supportive-${index}`}
                              className="finalize-assist-bullet"
                              role="listitem"
                            >
                              • {item}
                            </div>
                          ))}
                        </div>
                      </div>
                      <div className="finalize-clinical-table-section">
                        <div className="finalize-assist-section-kicker">
                          Safety Check Sebelum Sign-Off
                        </div>
                        <div role="list" aria-label="Safety check finalisasi">
                          {finalizationTherapyPlan.safetyChecks.map((item, index) => (
                            <div
                              key={`safety-${index}`}
                              className="finalize-assist-bullet"
                              role="listitem"
                            >
                              • {item}
                            </div>
                          ))}
                        </div>
                      </div>
                    </div>
                  </div>
                  <div className="finalize-assist-note">{finalizationTherapyPlan.note}</div>
                </div>
              )}
              {isFinalizeTab && !selectedDiagnosisDraft && (
                <div ref={finalizeAnchorRef} className="blueprint-wrapper finalize-assist-panel">
                  <div className="finalize-assist-header">
                    <span className="finalize-assist-kicker">FINALISASI</span>
                    <span className="finalize-assist-title">
                      {hasConsideredMustNotMissOnly
                        ? 'Risiko Tinggi Sudah Ditandai'
                        : 'Menunggu Diagnosis Dipilih'}
                    </span>
                  </div>
                  <div className="finalize-assist-note">
                    {hasConsideredMustNotMissOnly
                      ? 'Suggestion must-not-miss sudah dipertimbangkan, tetapi belum ada diagnosis kerja yang dipilih. Tetapkan diagnosis kerja manual di assessment bila diperlukan, lalu lanjutkan sign-off dengan judgement klinis.'
                      : 'Pilih salah satu diagnosis pada fase assessment terlebih dahulu. Setelah diagnosis kerja dipilih, algoritme obat dan terapi akan muncul otomatis di area finalisasi.'}
                  </div>
                </div>
              )}
              {(isAssessmentTab || isFinalizeTab) && (
                <div
                  className={`emr-phase-footer emr-phase-footer-finalize${isAssessmentTab ? ' is-cta-only' : ''}`}
                >
                  {!isAssessmentTab && (
                    <div className={`emr-signoff-panel is-${finalizationReadiness.tone}`}>
                      <div className="emr-signoff-panel-head">
                        <div>
                          <div className="emr-signoff-panel-kicker">Sign-Off Readiness</div>
                          <div className="emr-signoff-panel-title">
                            {finalizationReadiness.title}
                          </div>
                        </div>
                        <div
                          className={`emr-signoff-panel-status is-${finalizationReadiness.tone}`}
                        >
                          {finalizationReadiness.tone === 'ready'
                            ? 'READY'
                            : finalizationReadiness.tone === 'review'
                              ? 'REVIEW'
                              : 'PENDING'}
                        </div>
                      </div>
                      <div className="emr-signoff-panel-copy">{finalizationReadiness.note}</div>
                      <div
                        className="emr-signoff-panel-grid"
                        role="list"
                        aria-label="Kesiapan sign-off finalisasi"
                      >
                        {finalizationReadiness.checks.map((check) => (
                          <div
                            key={check.label}
                            className={`emr-signoff-check is-${check.state}`}
                            role="listitem"
                          >
                            <span className="emr-signoff-check-label">{check.label}</span>
                            <strong>{check.value}</strong>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                  {isAssessmentTab && (
                    <EmrPhaseFooterButton
                      label="Finalize & Sign-Off"
                      tone="critical"
                      onClick={() => moveToWorkflowTab('finalize')}
                    />
                  )}
                  {/* ── Bridge + Laporan — Neumorphic action buttons ── */}
                  {isFinalizeTab && (
                    <div className="finalize-neu-actions">
                      <button
                        onClick={sendToEpuskesmas}
                        disabled={isBridgeActionLocked(bridgeStatus)}
                        className={`finalize-neu-btn${bridgeStatus === 'completed' ? ' is-done' : ''}`}
                      >
                        <span className="finalize-neu-btn-label">
                          {bridgeStatus === 'completed'
                            ? 'Terkirim'
                            : bridgeStatus === 'processing'
                              ? 'Mengisi...'
                              : 'ePuskesmas Bridge'}
                        </span>
                      </button>
                      <button
                        onClick={generateClinicalReport}
                        disabled={generatingReport}
                        className="finalize-neu-btn"
                      >
                        <span className="finalize-neu-btn-label">
                          {generatingReport ? 'Generating...' : 'Laporan Klinis'}
                        </span>
                      </button>
                    </div>
                  )}
                  {bridgeError && isFinalizeTab && (
                    <div
                      className="finalize-assist-bullet"
                      style={{ color: 'var(--critical)', fontSize: 12, marginTop: 6 }}
                    >
                      {bridgeError}
                    </div>
                  )}
                </div>
              )}
            </div>
          </section>
        </div>
      </div>

      {/* Medical term tooltip — klik kanan pada item pemeriksaan */}
      {medTooltip && (
        <div
          style={{
            position: 'fixed',
            left: medTooltip.x + 8,
            top: medTooltip.y - 8,
            background: 'var(--surface)',
            border: '1px solid var(--border)',
            borderRadius: 'var(--radius-md)',
            padding: '8px 12px',
            fontSize: 14,
            color: 'var(--text-main)',
            maxWidth: 340,
            zIndex: 9999,
            boxShadow: 'var(--shadow-dialog)',
            pointerEvents: 'none',
          }}
        >
          {medTooltip.text}
        </div>
      )}
    </div>
  )
}
