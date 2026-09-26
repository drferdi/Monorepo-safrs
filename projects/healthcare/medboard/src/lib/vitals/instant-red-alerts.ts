import { calculateNEWS2 } from '@/lib/cdss/news2'
import { detectEarlyWarningPatterns } from '@/lib/cdss/early-warning-patterns'
import type { CDSSEngineInput } from '@/lib/cdss/types'
import {
  BP_THRESHOLDS,
  classifyHypertension,
  getHTNRecommendations,
  triageHypertensiveCrisis,
  type HMODRedFlags,
} from '@/lib/htn-classifier'
import {
  GLUCOSE_THRESHOLDS,
  classifyBloodGlucose,
  triageHyperglycemia,
  type DKAHHSRedFlags,
  type GlucoseData,
  type GlucoseMeasurementType,
} from '@/lib/glucose-classifier'
import { calculateMAP, type AVPULevel } from './unified-vitals'
import { detectOccultShock, type HistoricalBP } from '@/lib/occult-shock-detector'

import type { CompositeAlertSeverity } from '@/types/abyss/clinical'
export type ScreeningAlertSeverity = CompositeAlertSeverity

export type ScreeningAlertGate =
  | 'GATE_1_VITALS'
  | 'GATE_2_HTN'
  | 'GATE_3_GLUCOSE'
  | 'GATE_4_OCCULT_SHOCK'
  | 'GATE_5_SEPSIS'
  | 'GATE_6_RESPIRATORY'
  | 'GATE_7_PEDIATRIC'
  | 'GATE_8_OBSTETRIC'

export interface ScreeningAlert {
  id: string
  gate: ScreeningAlertGate
  type: string
  severity: ScreeningAlertSeverity
  title: string
  reasoning: string
  recommendations: string[]
}

export interface ImmediateScreeningInput {
  vitals: {
    sbp?: number
    dbp?: number
    hr?: number
    rr?: number
    temp?: number
    spo2?: number
    avpu?: AVPULevel
    gcsTotal?: number
    supplementalO2?: boolean
    glucose?: number
    glucoseType?: GlucoseMeasurementType | '2JPP'
    hasCOPD?: boolean
    capillaryRefillSec?: number
  }
  patientAgeYears?: number
  patientAgeMonths?: number
  patientGender?: 'L' | 'P'
  isPregnant?: boolean
  gestationalWeek?: number
  chiefComplaint?: string
  additionalComplaint?: string
  medicalHistory?: string[]
  visitHistory?: HistoricalBP[]
  structuredSigns?: StructuredTriageSigns
}

export interface TriageSignalContext {
  avpu?: AVPULevel
  supplementalO2?: boolean
  hasCOPD?: boolean
  isPregnant?: boolean
  gestationalWeek?: number
  patientAgeMonths?: number
  structuredSigns?: StructuredTriageSigns
}

export interface RespiratoryDistressSigns {
  accessoryMuscleUse?: boolean
  retractions?: boolean
  unableToSpeakFullSentences?: boolean
  cyanosis?: boolean
  distressObserved?: boolean
}

export interface PerfusionShockSigns {
  dizziness?: boolean
  presyncope?: boolean
  syncope?: boolean
  weakness?: boolean
  clammySkin?: boolean
  coldExtremities?: boolean
  oliguria?: boolean
  capillaryRefillSec?: number
}

export interface StructuredTriageSigns {
  respiratoryDistress?: RespiratoryDistressSigns
  hmod?: Partial<HMODRedFlags>
  dkaHhs?: Partial<DKAHHSRedFlags>
  perfusionShock?: PerfusionShockSigns
}

type PediatricBand = {
  label: string
  minMonths: number
  maxMonths: number
  sbpLow: number
  hrLow: number
  hrHigh: number
  rrHigh: number
}

const PEDIATRIC_BANDS: PediatricBand[] = [
  { label: '0-3 bulan', minMonths: 0, maxMonths: 2, sbpLow: 65, hrLow: 110, hrHigh: 160, rrHigh: 60 },
  { label: '3-6 bulan', minMonths: 3, maxMonths: 5, sbpLow: 70, hrLow: 100, hrHigh: 150, rrHigh: 45 },
  { label: '1-3 tahun', minMonths: 12, maxMonths: 47, sbpLow: 90, hrLow: 80, hrHigh: 125, rrHigh: 30 },
  { label: '6-12 tahun', minMonths: 72, maxMonths: 143, sbpLow: 100, hrLow: 60, hrHigh: 100, rrHigh: 22 },
  { label: '12-18 tahun', minMonths: 144, maxMonths: 215, sbpLow: 100, hrLow: 60, hrHigh: 100, rrHigh: 18 },
]

const SEVERITY_ORDER: Record<ScreeningAlertSeverity, number> = {
  critical: 0,
  high: 1,
  warning: 2,
}

function toFiniteNumber(value: unknown): number | undefined {
  if (typeof value === 'number' && Number.isFinite(value)) return value
  if (typeof value === 'string') {
    const normalized = value.trim().replace(',', '.')
    if (!normalized) return undefined
    const parsed = Number.parseFloat(normalized)
    if (Number.isFinite(parsed)) return parsed
  }
  return undefined
}

function toOptionalString(value: unknown): string | undefined {
  return typeof value === 'string' && value.trim() ? value.trim() : undefined
}

function toOptionalBoolean(value: unknown): boolean | undefined {
  if (typeof value === 'boolean') return value
  if (typeof value === 'string') {
    const normalized = value.trim().toLowerCase()
    if (['true', '1', 'yes', 'ya'].includes(normalized)) return true
    if (['false', '0', 'no', 'tidak'].includes(normalized)) return false
  }
  return undefined
}

function toMedicalHistoryList(value: unknown): string[] {
  if (!Array.isArray(value)) return []
  return value
    .map(item => {
      if (typeof item === 'string') return item.trim()
      if (item && typeof item === 'object') {
        const record = item as Record<string, unknown>
        return (
          toOptionalString(record.name) ??
          toOptionalString(record.label) ??
          toOptionalString(record.condition) ??
          ''
        )
      }
      return ''
    })
    .filter(Boolean)
}

function parseTd(value: unknown): { sbp?: number; dbp?: number } {
  if (typeof value !== 'string') return {}
  const [sbpRaw, dbpRaw] = value.split('/')
  return {
    sbp: toFiniteNumber(sbpRaw),
    dbp: toFiniteNumber(dbpRaw),
  }
}

function coalesceBoolean(...values: Array<boolean | undefined>): boolean {
  return values.some(value => value === true)
}

function readRecord(value: unknown): Record<string, unknown> {
  return value && typeof value === 'object' ? (value as Record<string, unknown>) : {}
}

function normalizeStructuredSigns(value: unknown): StructuredTriageSigns | undefined {
  const root = readRecord(value)
  if (Object.keys(root).length === 0) return undefined

  const respiratory = readRecord(root.respiratoryDistress)
  const hmod = readRecord(root.hmod)
  const dkaHhs = readRecord(root.dkaHhs)
  const perfusionShock = readRecord(root.perfusionShock)

  const structured: StructuredTriageSigns = {
    respiratoryDistress: {
      accessoryMuscleUse: toOptionalBoolean(respiratory.accessoryMuscleUse),
      retractions: toOptionalBoolean(respiratory.retractions),
      unableToSpeakFullSentences: toOptionalBoolean(respiratory.unableToSpeakFullSentences),
      cyanosis: toOptionalBoolean(respiratory.cyanosis),
      distressObserved: toOptionalBoolean(respiratory.distressObserved),
    },
    hmod: {
      chest_pain: toOptionalBoolean(hmod.chest_pain ?? hmod.chestPain),
      pulmonary_edema: toOptionalBoolean(hmod.pulmonary_edema ?? hmod.pulmonaryEdema),
      neurological_deficit: toOptionalBoolean(
        hmod.neurological_deficit ?? hmod.neurologicalDeficit
      ),
      vision_changes: toOptionalBoolean(hmod.vision_changes ?? hmod.visionChanges),
      severe_headache: toOptionalBoolean(hmod.severe_headache ?? hmod.severeHeadache),
      oliguria: toOptionalBoolean(hmod.oliguria),
      altered_mental_status: toOptionalBoolean(
        hmod.altered_mental_status ?? hmod.alteredMentalStatus
      ),
    },
    dkaHhs: {
      kussmaul_breathing: toOptionalBoolean(dkaHhs.kussmaul_breathing ?? dkaHhs.kussmaulBreathing),
      acetone_breath: toOptionalBoolean(dkaHhs.acetone_breath ?? dkaHhs.acetoneBreath),
      nausea_vomiting: toOptionalBoolean(dkaHhs.nausea_vomiting ?? dkaHhs.nauseaVomiting),
      abdominal_pain: toOptionalBoolean(dkaHhs.abdominal_pain ?? dkaHhs.abdominalPain),
      altered_mental_status: toOptionalBoolean(
        dkaHhs.altered_mental_status ?? dkaHhs.alteredMentalStatus
      ),
      severe_dehydration: toOptionalBoolean(
        dkaHhs.severe_dehydration ?? dkaHhs.severeDehydration
      ),
      extreme_hyperglycemia: toOptionalBoolean(
        dkaHhs.extreme_hyperglycemia ?? dkaHhs.extremeHyperglycemia
      ),
      seizures: toOptionalBoolean(dkaHhs.seizures),
    },
    perfusionShock: {
      dizziness: toOptionalBoolean(perfusionShock.dizziness),
      presyncope: toOptionalBoolean(perfusionShock.presyncope),
      syncope: toOptionalBoolean(perfusionShock.syncope),
      weakness: toOptionalBoolean(perfusionShock.weakness),
      clammySkin: toOptionalBoolean(perfusionShock.clammySkin),
      coldExtremities: toOptionalBoolean(perfusionShock.coldExtremities),
      oliguria: toOptionalBoolean(perfusionShock.oliguria),
      capillaryRefillSec: toFiniteNumber(perfusionShock.capillaryRefillSec),
    },
  }

  return structured
}

function inferAVPUFromGCS(gcsTotal?: number): AVPULevel | undefined {
  if (gcsTotal === undefined) return undefined
  if (gcsTotal <= 3) return 'U'
  if (gcsTotal <= 8) return 'P'
  if (gcsTotal <= 13) return 'V'
  if (gcsTotal === 14) return 'C'
  return 'A'
}

function joinClinicalText(input: ImmediateScreeningInput): string {
  return [input.chiefComplaint, input.additionalComplaint, ...(input.medicalHistory ?? [])]
    .filter(Boolean)
    .join(' ')
    .toLowerCase()
}

function inferHMODFlags(
  text: string,
  avpu?: AVPULevel,
  gcsTotal?: number,
  structured?: StructuredTriageSigns
): HMODRedFlags {
  const alteredMentalStatus = avpu !== undefined && avpu !== 'A'
  const lowGcs = gcsTotal !== undefined && gcsTotal < 15
  return {
    chest_pain: coalesceBoolean(
      structured?.hmod?.chest_pain,
      /(nyeri dada|chest pain|angina|dada terasa berat)/i.test(text)
    ),
    pulmonary_edema: coalesceBoolean(
      structured?.hmod?.pulmonary_edema,
      /(edema paru|paru basah|orthopnea|sesak berat|pink frothy)/i.test(text)
    ),
    neurological_deficit: coalesceBoolean(
      structured?.hmod?.neurological_deficit,
      /(defisit neurologis|hemiparesis|pelo|mulut mencong|stroke|kejang)/i.test(text)
    ),
    vision_changes: coalesceBoolean(
      structured?.hmod?.vision_changes,
      /(pandangan kabur|penglihatan kabur|visus|amaurosis|mata berkunang)/i.test(text)
    ),
    severe_headache: coalesceBoolean(
      structured?.hmod?.severe_headache,
      /(sakit kepala hebat|nyeri kepala hebat|thunderclap|headache berat)/i.test(text)
    ),
    oliguria: coalesceBoolean(
      structured?.hmod?.oliguria,
      structured?.perfusionShock?.oliguria,
      /(oliguri|urin sedikit|kencing sedikit|anuria)/i.test(text)
    ),
    altered_mental_status: coalesceBoolean(
      structured?.hmod?.altered_mental_status,
      structured?.dkaHhs?.altered_mental_status,
      /(gangguan kesadaran|bingung|confus|somnolen|penurunan kesadaran)/i.test(text),
      alteredMentalStatus,
      lowGcs
    ),
  }
}

function inferDkaHhsFlags(
  text: string,
  avpu?: AVPULevel,
  gcsTotal?: number,
  glucose?: number,
  structured?: StructuredTriageSigns
): DKAHHSRedFlags {
  const alteredMentalStatus = avpu !== undefined && avpu !== 'A'
  const lowGcs = gcsTotal !== undefined && gcsTotal < 15
  return {
    kussmaul_breathing: coalesceBoolean(
      structured?.dkaHhs?.kussmaul_breathing,
      /(kussmaul|napas dalam cepat|napas cepat dalam)/i.test(text)
    ),
    acetone_breath: coalesceBoolean(
      structured?.dkaHhs?.acetone_breath,
      /(aseton|acetone|bau buah|fruity breath)/i.test(text)
    ),
    nausea_vomiting: coalesceBoolean(
      structured?.dkaHhs?.nausea_vomiting,
      /(mual|muntah)/i.test(text)
    ),
    abdominal_pain: coalesceBoolean(
      structured?.dkaHhs?.abdominal_pain,
      /(nyeri perut|perut sakit|abdominal pain)/i.test(text)
    ),
    altered_mental_status: coalesceBoolean(
      structured?.dkaHhs?.altered_mental_status,
      structured?.hmod?.altered_mental_status,
      /(gangguan kesadaran|bingung|confus|somnolen|penurunan kesadaran)/i.test(text),
      alteredMentalStatus,
      lowGcs
    ),
    severe_dehydration: coalesceBoolean(
      structured?.dkaHhs?.severe_dehydration,
      /(dehidrasi berat|mulut kering|sangat haus|turgor jelek)/i.test(text)
    ),
    extreme_hyperglycemia: coalesceBoolean(
      structured?.dkaHhs?.extreme_hyperglycemia,
      (glucose ?? 0) > GLUCOSE_THRESHOLDS.EXTREME_HYPERGLYCEMIA
    ),
    seizures: coalesceBoolean(structured?.dkaHhs?.seizures, /(kejang|seizure)/i.test(text)),
  }
}

function hasRespiratoryDistress(text: string, structured?: StructuredTriageSigns): boolean {
  return coalesceBoolean(
    structured?.respiratoryDistress?.accessoryMuscleUse,
    structured?.respiratoryDistress?.retractions,
    structured?.respiratoryDistress?.unableToSpeakFullSentences,
    structured?.respiratoryDistress?.cyanosis,
    structured?.respiratoryDistress?.distressObserved,
    /(retraksi|otot bantu napas|aksesori|sesak berat|tripod|distres napas|wheezing berat)/i.test(text)
  )
}

function isKnownHypertension(medicalHistory: string[] | undefined, text: string): boolean {
  const history = (medicalHistory ?? []).join(' ')
  return /hipertensi|ht\b|darah tinggi/i.test(`${history} ${text}`)
}

function getPediatricBand(ageYears?: number, ageMonths?: number): PediatricBand | null {
  const months =
    ageMonths !== undefined ? ageMonths : ageYears !== undefined ? Math.round(ageYears * 12) : undefined
  if (months === undefined) return null
  return PEDIATRIC_BANDS.find(band => months >= band.minMonths && months <= band.maxMonths) ?? null
}

function gateFromPattern(patternId: string): ScreeningAlertGate {
  if (patternId.includes('SEPSIS')) return 'GATE_5_SEPSIS'
  if (patternId.includes('RESP')) return 'GATE_6_RESPIRATORY'
  if (patternId.includes('PREECLAMPSIA') || patternId.includes('ECLAMPSIA')) return 'GATE_8_OBSTETRIC'
  return 'GATE_1_VITALS'
}

function pushAlert(alerts: ScreeningAlert[], alert: ScreeningAlert): void {
  const existingIndex = alerts.findIndex(existing => existing.id === alert.id)
  if (existingIndex === -1) {
    alerts.push(alert)
    return
  }

  if (SEVERITY_ORDER[alert.severity] < SEVERITY_ORDER[alerts[existingIndex].severity]) {
    alerts[existingIndex] = alert
  }
}

export function extractOccultShockHistory(value: unknown): HistoricalBP[] {
  if (!Array.isArray(value)) return []
  return value
    .map(item => {
      if (!item || typeof item !== 'object') return null
      const record = item as Record<string, unknown>
      const vitals = record.vitals as Record<string, unknown> | undefined
      const sbp =
        toFiniteNumber(vitals?.sbp) ??
        toFiniteNumber(record.sbp) ??
        toFiniteNumber((vitals?.td as string | undefined)?.split('/')[0])
      const dbp =
        toFiniteNumber(vitals?.dbp) ??
        toFiniteNumber(record.dbp) ??
        toFiniteNumber((vitals?.td as string | undefined)?.split('/')[1])
      if (sbp === undefined || dbp === undefined) return null
      return {
        visit_date:
          toOptionalString(record.date) ??
          toOptionalString(record.visit_date) ??
          toOptionalString(record.timestamp) ??
          new Date().toISOString(),
        sbp,
        dbp,
        location: 'clinic' as const,
      }
    })
    .filter(Boolean) as HistoricalBP[]
}

export function extractTriageSignalContext(data: Record<string, unknown>): TriageSignalContext {
  const rawContext =
    data.triageContext && typeof data.triageContext === 'object'
      ? (data.triageContext as Record<string, unknown>)
      : {}
  const rawVitals =
    data.vitals && typeof data.vitals === 'object' ? (data.vitals as Record<string, unknown>) : {}

  const gcsTotal =
    toFiniteNumber(rawContext.gcsTotal) ??
    toFiniteNumber(rawContext.gcs) ??
    toFiniteNumber(rawVitals.gcs)

  const avpuRaw = toOptionalString(rawContext.avpu) ?? toOptionalString(data.avpu)
  const avpu = avpuRaw && ['A', 'C', 'V', 'P', 'U'].includes(avpuRaw) ? (avpuRaw as AVPULevel) : inferAVPUFromGCS(gcsTotal)

  return {
    avpu,
    supplementalO2: Boolean(rawContext.supplementalO2 ?? data.supplementalO2),
    hasCOPD: Boolean(rawContext.hasCOPD ?? data.hasCOPD),
    isPregnant: Boolean(rawContext.isPregnant ?? data.isPregnant),
    gestationalWeek: toFiniteNumber(rawContext.gestationalWeek ?? data.gestationalWeek),
    patientAgeMonths: toFiniteNumber(rawContext.patientAgeMonths ?? data.patientAgeMonths),
    structuredSigns:
      normalizeStructuredSigns(rawContext.structuredSigns) ??
      normalizeStructuredSigns(data.structuredSigns),
  }
}

export function buildImmediateScreeningInputFromEmrPayload(
  data: Record<string, unknown>
): ImmediateScreeningInput {
  const vitalsPayload =
    data.vitals && typeof data.vitals === 'object' ? (data.vitals as Record<string, unknown>) : {}
  const glucosePayload =
    data.gulaDarah && typeof data.gulaDarah === 'object'
      ? (data.gulaDarah as Record<string, unknown>)
      : {}
  const td = parseTd(vitalsPayload.td)
  const triageContext = extractTriageSignalContext(data)
  const gcsTotal =
    toFiniteNumber((data.triageContext as Record<string, unknown> | undefined)?.gcsTotal) ??
    toFiniteNumber(vitalsPayload.gcs)

  return {
    vitals: {
      sbp: td.sbp,
      dbp: td.dbp,
      hr: toFiniteNumber(vitalsPayload.nadi),
      rr: toFiniteNumber(vitalsPayload.napas),
      temp: toFiniteNumber(vitalsPayload.suhu),
      spo2: toFiniteNumber(vitalsPayload.spo2),
      avpu: triageContext.avpu,
      gcsTotal,
      supplementalO2: triageContext.supplementalO2,
      glucose: toFiniteNumber(glucosePayload.nilai),
      glucoseType:
        (toOptionalString(glucosePayload.tipe) as GlucoseMeasurementType | undefined) ?? 'GDS',
      hasCOPD: triageContext.hasCOPD,
    },
    patientAgeYears: toFiniteNumber(data.patientAge),
    patientAgeMonths: triageContext.patientAgeMonths,
    patientGender: data.patientGender === 'P' ? 'P' : 'L',
    isPregnant: triageContext.isPregnant,
    gestationalWeek: triageContext.gestationalWeek,
    chiefComplaint: toOptionalString(data.keluhanUtama),
    additionalComplaint: toOptionalString(data.keluhanTambahan),
    medicalHistory: toMedicalHistoryList(data.medicalHistory),
    visitHistory: extractOccultShockHistory(data.visitHistory),
    structuredSigns:
      triageContext.structuredSigns ?? normalizeStructuredSigns(data.structuredSigns),
  }
}

export function evaluateScreeningAlertsFromEmrPayload(data: Record<string, unknown>): ScreeningAlert[] {
  return evaluateImmediateScreeningAlerts(buildImmediateScreeningInputFromEmrPayload(data))
}

export function evaluateImmediateScreeningAlerts(input: ImmediateScreeningInput): ScreeningAlert[] {
  const alerts: ScreeningAlert[] = []
  const { sbp, dbp, hr, rr, temp, spo2, glucose, supplementalO2, hasCOPD } = input.vitals
  const gcsTotal = input.vitals.gcsTotal
  const avpu = input.vitals.avpu ?? inferAVPUFromGCS(gcsTotal)
  const text = joinClinicalText(input)
  const medicalHistory = input.medicalHistory ?? []
  const structuredSigns = input.structuredSigns
  const ageBand = getPediatricBand(input.patientAgeYears, input.patientAgeMonths)
  const isPediatric = ageBand !== null
  const isAdultOrUnknown = !isPediatric
  const capillaryRefillSec = input.vitals.capillaryRefillSec ?? structuredSigns?.perfusionShock?.capillaryRefillSec
  const map = sbp !== undefined && dbp !== undefined ? calculateMAP(sbp, dbp) : undefined
  const shockIndex = sbp !== undefined && hr !== undefined && sbp > 0 ? hr / sbp : undefined
  const modifiedShockIndex = map !== undefined && hr !== undefined && map > 0 ? hr / map : undefined
  const hmodFlags = inferHMODFlags(text, avpu, gcsTotal, structuredSigns)

  if (sbp !== undefined && dbp !== undefined) {
    const bpSession = {
      readings: [{ sbp, dbp }],
      measurement_quality: 'acceptable' as const,
      final_bp: { sbp, dbp },
    }
    const htnType =
      sbp >= BP_THRESHOLDS.CRISIS.sbp || dbp >= 120
        ? triageHypertensiveCrisis({ sbp, dbp }, hmodFlags)
        : undefined
    const htnClassification = classifyHypertension(bpSession, htnType ? hmodFlags : undefined)

    if (sbp < 90) {
      pushAlert(alerts, {
        id: 'vitals-hypotension-sbp',
        gate: isPediatric ? 'GATE_7_PEDIATRIC' : 'GATE_1_VITALS',
        type: 'hypotension',
        severity: 'critical',
        title: `HIPOTENSI ABSOLUT — SBP ${sbp} mmHg`,
        reasoning: `Sistolik ${sbp} mmHg <90, curiga syok, perdarahan, dehidrasi, atau sepsis.`,
        recommendations: [
          'Evaluasi perfusi segera: kesadaran, CRT, diuresis, ekstremitas',
          'Pasang akses IV dan siapkan resusitasi cairan bila tidak kontraindikasi',
          'Cari penyebab: perdarahan, dehidrasi, sepsis, obat',
        ],
      })
    }

    if (dbp < 60) {
      pushAlert(alerts, {
        id: 'vitals-low-dbp',
        gate: 'GATE_1_VITALS',
        type: 'low_diastolic_pressure',
        severity: sbp < 90 ? 'critical' : 'high',
        title: `DIASTOLIK RENDAH — DBP ${dbp} mmHg`,
        reasoning: `Diastolik ${dbp} mmHg <60 dapat menandakan perfusi organ kurang adekuat.`,
        recommendations: [
          'Periksa MAP dan tanda hipoperfusi',
          'Pantau serial blood pressure',
          'Korelasikan dengan gejala pusing, sinkop, oliguria, dan perubahan mental',
        ],
      })
    }

    if (sbp >= 180 || dbp >= 120) {
      const emergency = htnType === 'HTN_EMERGENCY'
      pushAlert(alerts, {
        id: 'htn-crisis',
        gate: 'GATE_2_HTN',
        type: emergency ? 'hypertensive_emergency' : 'hypertensive_crisis',
        severity: 'critical',
        title: emergency
          ? `HTN EMERGENCY — ${sbp}/${dbp} mmHg`
          : `HIPERTENSI KRISIS — ${sbp}/${dbp} mmHg`,
        reasoning: emergency
          ? `${htnClassification.reasoning} Disertai red flag HMOD/neurologis/perfusi.`
          : `${htnClassification.reasoning} Perlu evaluasi target organ damage sebelum menurunkan tekanan darah.`,
        recommendations: getHTNRecommendations(emergency ? 'HTN_EMERGENCY' : 'HTN_URGENCY', {
          sbp,
          dbp,
        }),
      })
    }
  }

  if (map !== undefined && map < 65) {
    pushAlert(alerts, {
      id: 'shock-map-low',
      gate: 'GATE_4_OCCULT_SHOCK',
      type: 'map_low',
      severity: 'critical',
      title: `HIPOPERFUSI — MAP ${map} mmHg`,
      reasoning: `MAP ${map} mmHg <65 menandakan perfusi organ berisiko terganggu.`,
      recommendations: [
        'Resusitasi sesuai klinis dan pantau respons',
        'Evaluasi sumber syok: sepsis, perdarahan, dehidrasi, kardiogenik',
        'Monitor urine output dan status mental',
      ],
    })
  }

  if (shockIndex !== undefined && shockIndex > 1) {
    pushAlert(alerts, {
      id: 'shock-index',
      gate: 'GATE_4_OCCULT_SHOCK',
      type: 'shock_index',
      severity: shockIndex > 1.2 ? 'critical' : 'high',
      title:
        shockIndex > 1.2
          ? `SHOCK INDEX KRITIS — ${shockIndex.toFixed(2)}`
          : `SHOCK INDEX TINGGI — ${shockIndex.toFixed(2)}`,
      reasoning: `Shock Index = HR/SBP. Nilai ${shockIndex.toFixed(2)} melebihi batas modern >1,0.`,
      recommendations: [
        'Evaluasi perdarahan, sepsis, dehidrasi, dan kebutuhan rujukan',
        'Pantau serial HR, BP, MAP, dan mental status',
        'Korelasikan dengan keluhan lemah, sinkop, dan kulit dingin',
      ],
    })
  }

  if (modifiedShockIndex !== undefined && modifiedShockIndex > 1.3) {
    pushAlert(alerts, {
      id: 'modified-shock-index',
      gate: 'GATE_4_OCCULT_SHOCK',
      type: 'modified_shock_index',
      severity: modifiedShockIndex > 1.4 ? 'critical' : 'high',
      title:
        modifiedShockIndex > 1.4
          ? `MSI KRITIS — ${modifiedShockIndex.toFixed(2)}`
          : `MSI TINGGI — ${modifiedShockIndex.toFixed(2)}`,
      reasoning: `Modified Shock Index = HR/MAP. Nilai ${modifiedShockIndex.toFixed(2)} menandakan risiko syok/transfusi tinggi.`,
      recommendations: [
        'Segera evaluasi kebutuhan resusitasi dan rujukan',
        'Ulangi vital signs serial',
        'Cari bukti perdarahan, dehidrasi, atau sepsis',
      ],
    })
  }

  if (isAdultOrUnknown && hr !== undefined) {
    if (hr < 50) {
      pushAlert(alerts, {
        id: 'hr-bradycardia',
        gate: 'GATE_1_VITALS',
        type: 'bradycardia',
        severity: hr < 45 ? 'critical' : 'high',
        title: `BRADIKARDIA — HR ${hr} bpm`,
        reasoning: `Denyut jantung ${hr} bpm <50 pada dewasa perlu evaluasi pre-arrest, blok AV, hipotermia, atau efek obat.`,
        recommendations: [
          'Nilai perfusi, gejala pusing/sinkop, dan EKG bila tersedia',
          'Review obat dan faktor reversibel',
          'Siapkan rujukan bila disertai hipotensi atau gangguan kesadaran',
        ],
      })
    }

    if (hr > 110) {
      pushAlert(alerts, {
        id: 'hr-tachycardia',
        gate: 'GATE_1_VITALS',
        type: 'tachycardia',
        severity: hr >= 130 ? 'critical' : 'high',
        title: `TAKIKARDIA — HR ${hr} bpm`,
        reasoning: `Denyut jantung ${hr} bpm >110 pada dewasa mengarah ke syok, hipoksia, demam, dehidrasi, atau perdarahan.`,
        recommendations: [
          'Cari penyebab primer: perdarahan, infeksi, hipoksia, nyeri, dehidrasi',
          'Ulangi vital signs setelah intervensi awal',
          'Nilai perfusi dan irama jantung',
        ],
      })
    }
  }

  if (spo2 !== undefined) {
    if (spo2 < 90) {
      pushAlert(alerts, {
        id: 'spo2-critical',
        gate: 'GATE_6_RESPIRATORY',
        type: 'severe_hypoxemia',
        severity: 'critical',
        title: `HIPOXEMIA BERAT — SpO2 ${spo2}%`,
        reasoning: `SpO2 ${spo2}% <90 membutuhkan oksigenasi segera dan evaluasi kegagalan napas.`,
        recommendations: [
          'Berikan oksigen segera dan targetkan saturasi sesuai konteks klinis',
          'Posisikan pasien untuk optimalkan ventilasi',
          'Rujuk emergensi bila tidak membaik',
        ],
      })
    } else if (spo2 < 94) {
      pushAlert(alerts, {
        id: 'spo2-low',
        gate: 'GATE_6_RESPIRATORY',
        type: 'hypoxemia',
        severity: supplementalO2 ? 'critical' : 'high',
        title: supplementalO2
          ? `SpO2 TETAP RENDAH MESKI O2 — ${spo2}%`
          : `HIPOXEMIA — SpO2 ${spo2}%`,
        reasoning: supplementalO2
          ? `SpO2 ${spo2}% tetap <94 walau sudah mendapat oksigen tambahan, curiga gagal napas progresif.`
          : `SpO2 ${spo2}% <94 di udara ruang perlu evaluasi penyebab hipoksemia.`,
        recommendations: [
          supplementalO2 ? 'Escalate segera karena saturasi tetap rendah meski O2 tambahan' : 'Pantau respon setelah oksigen awal',
          hasCOPD ? 'Sesuaikan target saturasi pada pasien COPD (umumnya 88-92%)' : 'Targetkan SpO2 minimal 94% bila tidak ada COPD',
          'Evaluasi pneumonia, asma, edema paru, emboli, atau gagal napas',
        ],
      })
    }
  }

  if (rr !== undefined) {
    if (rr > 22) {
      pushAlert(alerts, {
        id: 'rr-tachypnea',
        gate: 'GATE_6_RESPIRATORY',
        type: 'tachypnea',
        severity: rr > 30 ? 'critical' : 'high',
        title: `TAKIPNEA — RR ${rr}/menit`,
        reasoning: `Frekuensi napas ${rr}/menit >22 mengarah ke sepsis, gagal napas, asidosis, atau distress.`,
        recommendations: [
          'Nilai work of breathing, wheeze, dan retraksi',
          'Pantau SpO2 dan status mental',
          'Cari penyebab: sepsis, asma, pneumonia, edema paru, DKA',
        ],
      })
    }

    if (rr < 8) {
      pushAlert(alerts, {
        id: 'rr-depressed',
        gate: 'GATE_6_RESPIRATORY',
        type: 'respiratory_depression',
        severity: 'critical',
        title: `DEPRESI NAPAS — RR ${rr}/menit`,
        reasoning: `Frekuensi napas ${rr}/menit <8 mengarah ke gagal napas atau depresi SSP.`,
        recommendations: [
          'Siapkan airway support segera',
          'Review obat sedatif/opioid dan penyebab neurologis',
          'Rujuk emergensi',
        ],
      })
    }
  }

  if (hasRespiratoryDistress(text, structuredSigns)) {
    pushAlert(alerts, {
      id: 'respiratory-distress-signs',
      gate: 'GATE_6_RESPIRATORY',
      type: 'respiratory_distress',
      severity: 'critical',
      title: 'DISTRES NAPAS KLINIS',
      reasoning: 'Keluhan atau narasi menunjukkan retraksi / penggunaan otot bantu / sesak berat.',
      recommendations: [
        'Lakukan oksigenasi dan posisi optimal segera',
        'Nilai kebutuhan nebulisasi/bronkodilator bila indikasi',
        'Siapkan rujukan bila distress menetap',
      ],
    })
  }

  if (temp !== undefined) {
    if (temp < 35) {
      pushAlert(alerts, {
        id: 'temp-hypothermia',
        gate: 'GATE_1_VITALS',
        type: 'hypothermia',
        severity: 'critical',
        title: `HIPOTERMIA — ${temp}°C`,
        reasoning: `Suhu ${temp}°C <35 dapat terkait sepsis, paparan dingin, atau gangguan metabolik berat.`,
        recommendations: [
          'Lakukan warming sesuai klinis',
          'Screen sepsis dan hipoglikemia',
          'Pantau kesadaran dan perfusi',
        ],
      })
    } else if (temp < 36) {
      pushAlert(alerts, {
        id: 'temp-subnormal',
        gate: 'GATE_1_VITALS',
        type: 'subnormal_temperature',
        severity: 'high',
        title: `SUHU SUBNORMAL — ${temp}°C`,
        reasoning: `Suhu ${temp}°C <36 adalah red flag terutama untuk sepsis pada lansia.`,
        recommendations: [
          'Evaluasi sepsis dan perfusi',
          'Pantau serial temperatur',
          'Korelasikan dengan RR, HR, dan tekanan darah',
        ],
      })
    } else if (temp >= 38.3) {
      pushAlert(alerts, {
        id: 'temp-fever',
        gate: 'GATE_1_VITALS',
        type: 'fever',
        severity: temp >= 40 ? 'critical' : 'high',
        title: `DEMAM TINGGI — ${temp}°C`,
        reasoning: `Suhu ${temp}°C ≥38.3 adalah immediate notification threshold untuk infeksi/inflamasi.`,
        recommendations: [
          'Cari fokus infeksi dan tanda sepsis',
          'Pastikan hidrasi adekuat',
          'Pantau RR, HR, dan tekanan darah serial',
        ],
      })
    }
  }

  if (glucose !== undefined) {
    const glucoseData: GlucoseData = {
      gds: glucose,
      sample_type: 'capillary',
      has_classic_symptoms: /(poliuria|polidipsia|polyuria|polydipsia|polyphagia|haus terus|sering kencing)/i.test(text),
    }
    const glucoseResult = classifyBloodGlucose(glucoseData)
    const dkaHhsFlags = inferDkaHhsFlags(text, avpu, gcsTotal, glucose, structuredSigns)
    const hyperglycemiaTriage = triageHyperglycemia(glucose, dkaHhsFlags)

    if (glucose < 70) {
      pushAlert(alerts, {
        id: 'glucose-hypoglycemia',
        gate: 'GATE_3_GLUCOSE',
        type: 'hypoglycemia',
        severity: glucose < 54 ? 'critical' : 'high',
        title:
          glucose < 54
            ? `HIPOGLIKEMIA BERAT — ${glucose} mg/dL`
            : `HIPOGLIKEMIA — ${glucose} mg/dL`,
        reasoning: glucoseResult.reasoning,
        recommendations:
          glucose < 54
            ? ['Aktifkan protokol emergensi hipoglikemia', ...glucoseResult.recommendations]
            : glucoseResult.recommendations,
      })
    }

    if (glucose >= GLUCOSE_THRESHOLDS.EXTREME_HYPERGLYCEMIA) {
      pushAlert(alerts, {
        id: 'glucose-hhs',
        gate: 'GATE_3_GLUCOSE',
        type: 'hhs',
        severity: 'critical',
        title: `HHS SUSPECTED — ${glucose} mg/dL`,
        reasoning: `Glukosa ${glucose} mg/dL >600 sangat mengarah ke krisis hiperosmolar/dehidrasi berat.`,
        recommendations: [
          'Rujuk emergensi untuk tata laksana cairan dan insulin',
          'Nilai dehidrasi berat dan status mental',
          'Cari pemicu infeksi atau penghentian obat',
        ],
      })
    } else if (hyperglycemiaTriage === 'HYPERGLYCEMIC_CRISIS') {
      pushAlert(alerts, {
        id: 'glucose-dka-hhs',
        gate: 'GATE_3_GLUCOSE',
        type: 'hyperglycemic_crisis',
        severity: 'critical',
        title: `KRISIS HIPERGLIKEMIA — ${glucose} mg/dL`,
        reasoning:
          'Glukosa tinggi disertai red flag DKA/HHS seperti Kussmaul, dehidrasi, muntah, nyeri perut, atau gangguan kesadaran.',
        recommendations: [
          'Rujuk emergensi untuk evaluasi DKA/HHS',
          'Pasang akses IV dan mulai koreksi cairan sesuai kondisi',
          'Pantau kesadaran, napas, dan hemodinamika',
        ],
      })
    } else if (glucose >= 200) {
      pushAlert(alerts, {
        id: 'glucose-hyperglycemia',
        gate: 'GATE_3_GLUCOSE',
        type: 'hyperglycemia',
        severity: 'high',
        title: `HIPERGLIKEMIA — ${glucose} mg/dL`,
        reasoning: glucoseResult.reasoning,
        recommendations: glucoseResult.recommendations,
      })
    }
  }

  const qsofaCriteria: string[] = []
  if (rr !== undefined && rr >= 22) qsofaCriteria.push(`RR ${rr}/menit ≥22`)
  if (sbp !== undefined && sbp <= 100) qsofaCriteria.push(`SBP ${sbp} mmHg ≤100`)
  if ((gcsTotal !== undefined && gcsTotal < 15) || (avpu !== undefined && avpu !== 'A')) {
    qsofaCriteria.push(
      gcsTotal !== undefined ? `GCS ${gcsTotal} <15` : `AVPU ${avpu} menunjukkan perubahan kesadaran`
    )
  }
  if (qsofaCriteria.length >= 2) {
    pushAlert(alerts, {
      id: 'sepsis-qsofa',
      gate: 'GATE_5_SEPSIS',
      type: 'qsofa_positive',
      severity: 'critical',
      title: `qSOFA POSITIF — ${qsofaCriteria.length}/3`,
      reasoning: `Kriteria terpenuhi: ${qsofaCriteria.join('; ')}.`,
      recommendations: [
        'Screen sepsis segera dan evaluasi sumber infeksi',
        'Pantau tekanan darah, perfusi, dan urine output',
        'Pertimbangkan rujukan cepat sesuai stabilitas pasien',
      ],
    })
  }

  const sirsCriteria: string[] = []
  if (temp !== undefined && (temp < 36 || temp > 38)) sirsCriteria.push(`Suhu ${temp}°C`)
  if (hr !== undefined && hr > 90) sirsCriteria.push(`HR ${hr} bpm`)
  if (rr !== undefined && rr > 20) sirsCriteria.push(`RR ${rr}/menit`)
  if (sirsCriteria.length >= 2) {
    pushAlert(alerts, {
      id: 'sepsis-sirs',
      gate: 'GATE_5_SEPSIS',
      type: 'sirs_positive',
      severity: /infeksi|demam|batuk|luka|abses|pneumoni|isk|sepsis/i.test(text) ? 'high' : 'warning',
      title: `SIRS POSITIF — ${sirsCriteria.length} KRITERIA`,
      reasoning: `Kriteria terpenuhi: ${sirsCriteria.join('; ')}.`,
      recommendations: [
        'Korelasikan dengan fokus infeksi dan status hemodinamik',
        'Pantau serial vital signs',
        'Naikkan level kewaspadaan bila qSOFA juga positif',
      ],
    })
  }

  if (
    (sbp !== undefined && sbp < 90) ||
    (map !== undefined && map < 65) ||
    (shockIndex !== undefined && shockIndex > 1) ||
    (capillaryRefillSec !== undefined && capillaryRefillSec > 3)
  ) {
    pushAlert(alerts, {
      id: 'circulatory-shock-suspected',
      gate: 'GATE_4_OCCULT_SHOCK',
      type: 'circulatory_shock',
      severity: 'critical',
      title: 'SYOK / HIPOPERFUSI SUSPECTED',
      reasoning:
        'Kombinasi hipotensi, MAP rendah, Shock Index tinggi, atau perfusi perifer buruk mengarah ke syok sirkulasi.',
      recommendations: [
        'Lakukan evaluasi ABC dan perfusi organ sekarang juga',
        'Pantau serial BP, HR, RR, status mental, diuresis',
        'Cari penyebab dan eskalasi ke fasilitas resusitasi bila perlu',
      ],
    })
  }

  if (ageBand) {
    if (sbp !== undefined && sbp < ageBand.sbpLow) {
      pushAlert(alerts, {
        id: 'peds-sbp-low',
        gate: 'GATE_7_PEDIATRIC',
        type: 'pediatric_hypotension',
        severity: 'critical',
        title: `PEDIATRIK: SBP RENDAH — ${sbp} mmHg`,
        reasoning: `Untuk usia ${ageBand.label}, SBP <${ageBand.sbpLow} adalah red alert pediatrik.`,
        recommendations: [
          'Gunakan pendekatan PEWS bila tersedia',
          'Pantau perfusi dan status mental anak',
          'Eskalasi cepat bila ada tanda distres atau perfusi buruk',
        ],
      })
    }

    if (hr !== undefined && (hr < ageBand.hrLow || hr > ageBand.hrHigh)) {
      pushAlert(alerts, {
        id: 'peds-hr',
        gate: 'GATE_7_PEDIATRIC',
        type: 'pediatric_heart_rate',
        severity: hr > ageBand.hrHigh + 20 || hr < ageBand.hrLow - 10 ? 'critical' : 'high',
        title: `PEDIATRIK: HR ABNORMAL — ${hr} bpm`,
        reasoning: `Untuk usia ${ageBand.label}, rentang HR red alert adalah <${ageBand.hrLow} atau >${ageBand.hrHigh}.`,
        recommendations: [
          'Pertimbangkan demam, dehidrasi, nyeri, atau syok',
          'Pantau serial HR dan perfusi',
          'Gunakan PEWS/triage pediatrik setempat',
        ],
      })
    }

    if (rr !== undefined && rr > ageBand.rrHigh) {
      pushAlert(alerts, {
        id: 'peds-rr',
        gate: 'GATE_7_PEDIATRIC',
        type: 'pediatric_tachypnea',
        severity: rr >= ageBand.rrHigh + 10 ? 'critical' : 'high',
        title: `PEDIATRIK: RR TINGGI — ${rr}/menit`,
        reasoning: `Untuk usia ${ageBand.label}, RR >${ageBand.rrHigh} adalah red alert pediatrik.`,
        recommendations: [
          'Nilai distres napas dan work of breathing',
          'Pantau SpO2 dan perfusi',
          'Eskalasi cepat bila ada retraksi atau hipoksia',
        ],
      })
    }
  }

  if (input.patientGender === 'P' && input.isPregnant) {
    if ((sbp !== undefined && sbp >= 160) || (dbp !== undefined && dbp >= 110)) {
      pushAlert(alerts, {
        id: 'pregnancy-severe-htn',
        gate: 'GATE_8_OBSTETRIC',
        type: 'severe_preeclampsia_risk',
        severity: 'critical',
        title: 'KEHAMILAN: PRE-EKLAMPSIA BERAT / EKLAMPSIA IMMINEN',
        reasoning: `Kehamilan dengan TD ${sbp ?? '?'} / ${dbp ?? '?'} mmHg memenuhi ambang hipertensi berat obstetri.`,
        recommendations: [
          'Evaluasi sakit kepala hebat, visus, nyeri ulu hati, dan kejang',
          'Siapkan rujukan emergensi obstetri',
          'Monitor tekanan darah dan status neurologis ketat',
        ],
      })
    }

    if (sbp !== undefined && sbp < 90) {
      pushAlert(alerts, {
        id: 'pregnancy-hypotension',
        gate: 'GATE_8_OBSTETRIC',
        type: 'pregnancy_hypotension',
        severity: 'critical',
        title: 'KEHAMILAN: HIPOTENSI',
        reasoning: `Kehamilan dengan SBP ${sbp} mmHg <90 mengarah ke syok, perdarahan, atau sepsis.`,
        recommendations: [
          'Cari perdarahan obstetri dan tanda sepsis',
          'Pantau perfusi ibu dan kesadaran',
          'Rujuk emergensi bila tidak stabil',
        ],
      })
    }

    if (hr !== undefined && hr > 120) {
      pushAlert(alerts, {
        id: 'pregnancy-tachycardia',
        gate: 'GATE_8_OBSTETRIC',
        type: 'pregnancy_tachycardia',
        severity: 'high',
        title: 'KEHAMILAN: TAKIKARDIA',
        reasoning: `HR ${hr} bpm >120 pada kehamilan perlu menyingkirkan perdarahan, sepsis, atau dehidrasi.`,
        recommendations: [
          'Evaluasi perdarahan dan infeksi',
          'Pantau perfusi dan ulangi vital signs',
          'Naikkan kewaspadaan bila disertai hipotensi',
        ],
      })
    }
  }

  if (sbp !== undefined && dbp !== undefined && (isKnownHypertension(medicalHistory, text) || input.visitHistory?.length)) {
    const occultShock = detectOccultShock({
      vitals: {
        current_sbp: sbp,
        current_dbp: dbp,
        glucose,
      },
      last_3_visits: input.visitHistory ?? [],
      symptoms: {
        dizziness: coalesceBoolean(
          structuredSigns?.perfusionShock?.dizziness,
          /pusing|dizziness|melayang/i.test(text)
        ),
        presyncope: coalesceBoolean(
          structuredSigns?.perfusionShock?.presyncope,
          /presinkop|mau pingsan/i.test(text)
        ),
        syncope: coalesceBoolean(
          structuredSigns?.perfusionShock?.syncope,
          /sinkop|pingsan/i.test(text)
        ),
        weakness: coalesceBoolean(
          structuredSigns?.perfusionShock?.weakness,
          /lemas|weakness|malaise/i.test(text)
        ),
      },
      known_htn: isKnownHypertension(medicalHistory, text),
    })

    if (occultShock.risk_level === 'CRITICAL' || occultShock.risk_level === 'HIGH') {
      pushAlert(alerts, {
        id: 'occult-shock',
        gate: 'GATE_4_OCCULT_SHOCK',
        type: 'occult_shock',
        severity: occultShock.risk_level === 'CRITICAL' ? 'critical' : 'high',
        title: `OCCULT SHOCK — ${occultShock.risk_level}`,
        reasoning: occultShock.triggers.join('; '),
        recommendations: occultShock.recommendations,
      })
    }
  }

  const cdssInput: CDSSEngineInput = {
    keluhan_utama: input.chiefComplaint ?? '',
    keluhan_tambahan: input.additionalComplaint,
    usia: input.patientAgeYears ?? 0,
    jenis_kelamin: input.patientGender ?? 'L',
    vital_signs: {
      systolic: sbp,
      diastolic: dbp,
      heart_rate: hr,
      respiratory_rate: rr,
      temperature: temp,
      spo2,
      avpu,
      supplemental_o2: supplementalO2,
      has_copd: hasCOPD,
    },
    chronic_diseases: medicalHistory.length > 0 ? medicalHistory : undefined,
    is_pregnant: input.isPregnant,
  }

  const news2 = calculateNEWS2({
    vitals: cdssInput.vital_signs,
    avpu,
    supplementalO2,
    hasCOPD,
  })
  const earlyPatterns = detectEarlyWarningPatterns(cdssInput, news2)
  for (const pattern of earlyPatterns) {
    pushAlert(alerts, {
      id: `pattern-${pattern.pattern_id}`,
      gate: gateFromPattern(pattern.pattern_id),
      type: pattern.pattern_id.toLowerCase(),
      severity:
        pattern.severity === 'emergency'
          ? 'critical'
          : pattern.severity === 'urgent'
            ? 'high'
            : 'warning',
      title: pattern.pattern_name.toUpperCase(),
      reasoning: pattern.criteria_met.join('; '),
      recommendations: [pattern.action, `Lead time: ${pattern.lead_time}`],
    })
  }

  return alerts.sort((a, b) => {
    const severityDelta = SEVERITY_ORDER[a.severity] - SEVERITY_ORDER[b.severity]
    if (severityDelta !== 0) return severityDelta
    return a.title.localeCompare(b.title)
  })
}
