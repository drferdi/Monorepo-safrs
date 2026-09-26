import type {
  CompositeAlert,
  CompositeAlertConfidence,
  CompositeAlertSeverity,
  CompositeDerivedMetrics,
  CompositeDeteriorationInput,
  CompositeDeteriorationResult as SharedCompositeDeteriorationResult,
  CompositeHardStopAlert,
  CompositeSyndromeId,
  CompositeVitalSnapshot,
  EncounterDelta,
  WeightedComponentScore,
} from '@abyss/types'
import type { HistoricalBP } from '@/lib/occult-shock-detector'
import {
  normalizeScrapedVisitHistory,
} from '@/lib/emr/visit-history'
import {
  buildImmediateScreeningInputFromEmrPayload,
  evaluateImmediateScreeningAlerts,
  type ImmediateScreeningInput,
  type ScreeningAlert,
  type StructuredTriageSigns,
} from './instant-red-alerts'
import {
  calculateMAP,
  calculatePulsePressure,
  type AVPULevel,
} from './unified-vitals'

type BaselineParamKey = 'hr' | 'sbp' | 'dbp' | 'rr' | 'temp' | 'spo2' | 'glucose'

export interface CompositeDeteriorationResult
  extends SharedCompositeDeteriorationResult {
  screeningAlerts: ScreeningAlert[]
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

function normalizeAVPU(value: unknown): AVPULevel | undefined {
  const normalized = toOptionalString(value)?.toUpperCase()
  return normalized && ['A', 'C', 'V', 'P', 'U'].includes(normalized)
    ? (normalized as AVPULevel)
    : undefined
}

function readRecord(value: unknown): Record<string, unknown> {
  return value && typeof value === 'object' ? (value as Record<string, unknown>) : {}
}

function round(value: number, digits = 1): number {
  const factor = 10 ** digits
  return Math.round(value * factor) / factor
}

function average(values: number[]): number | undefined {
  if (values.length === 0) return undefined
  return values.reduce((sum, value) => sum + value, 0) / values.length
}

function median(values: number[]): number | undefined {
  if (values.length === 0) return undefined
  const sorted = [...values].sort((left, right) => left - right)
  const midpoint = Math.floor(sorted.length / 2)
  if (sorted.length % 2 === 0) {
    return (sorted[midpoint - 1] + sorted[midpoint]) / 2
  }
  return sorted[midpoint]
}

function buildPersonalBaselineFromVisits(
  visitHistory: unknown
): CompositeDeteriorationInput['personalBaseline'] | undefined {
  const visits = normalizeScrapedVisitHistory(visitHistory)
  if (visits.length < 2) return undefined

  const params: Record<string, { mean?: number; median?: number; currentZScore?: number }> = ([
    'hr',
    'sbp',
    'dbp',
    'rr',
    'temp',
    'spo2',
    'glucose',
  ] as const).reduce<Record<string, { mean?: number; median?: number; currentZScore?: number }>>(
    (acc, key) => {
      const values = visits
        .map(visit => visit.vitals[key])
        .filter((value): value is number => Number.isFinite(value) && value > 0)
      if (values.length < 2) return acc
      acc[key] = {
        mean: round(average(values) ?? 0, 2),
        median: round(median(values) ?? 0, 2),
      }
      return acc
    },
    {}
  )

  if (Object.keys(params).length === 0) return undefined

  return {
    computedAt: new Date().toISOString(),
    visitCount: visits.length,
    params,
  }
}

function normalizeCompositeSnapshot(value: unknown): CompositeVitalSnapshot | null {
  if (!value || typeof value !== 'object') return null
  const record = value as Record<string, unknown>
  const snapshot: CompositeVitalSnapshot = {
    hr: toFiniteNumber(record.hr),
    sbp: toFiniteNumber(record.sbp),
    dbp: toFiniteNumber(record.dbp),
    rr: toFiniteNumber(record.rr),
    temp: toFiniteNumber(record.temp),
    spo2: toFiniteNumber(record.spo2),
    avpu: normalizeAVPU(record.avpu),
    supplementalO2: record.supplementalO2 === true,
    glucose: toFiniteNumber(record.glucose),
    capillaryRefillSec: toFiniteNumber(record.capillaryRefillSec),
    measuredAt: toOptionalString(record.measuredAt),
  }

  const hasAnyValue = Object.values(snapshot).some(
    value => typeof value === 'number' || typeof value === 'string' || value === true
  )
  return hasAnyValue ? snapshot : null
}

function normalizeEncounterBaseline(
  data: Record<string, unknown>
): CompositeDeteriorationInput['encounterBaseline'] | undefined {
  const root =
    readRecord(data.encounterBaseline).measurements !== undefined
      ? readRecord(data.encounterBaseline)
      : data

  const measurementsRaw = Array.isArray(root.measurements)
    ? root.measurements
    : Array.isArray(data.encounterMeasurements)
      ? data.encounterMeasurements
      : Array.isArray(data.recentVitalsWindow)
        ? data.recentVitalsWindow
        : null

  if (!measurementsRaw) return undefined

  const measurements = measurementsRaw
    .map(item => normalizeCompositeSnapshot(item))
    .filter((item): item is CompositeVitalSnapshot => item !== null)

  if (measurements.length === 0) return undefined

  return {
    computedAt: toOptionalString(root.computedAt) ?? new Date().toISOString(),
    windowMinutes: toFiniteNumber(root.windowMinutes) ?? 120,
    measurements,
  }
}

function getEncounterBaselineValue(
  encounterBaseline: CompositeDeteriorationInput['encounterBaseline'],
  key: BaselineParamKey
): number | undefined {
  if (!encounterBaseline) return undefined
  const values = encounterBaseline.measurements
    .map(measurement => measurement[key])
    .filter(
      (value): value is number =>
        typeof value === 'number' && Number.isFinite(value) && value > 0
    )
  const baseline = average(values)
  return baseline !== undefined ? round(baseline, 2) : undefined
}

function getEncounterPulsePressureBaseline(
  encounterBaseline: CompositeDeteriorationInput['encounterBaseline']
): number | undefined {
  if (!encounterBaseline) return undefined
  const values = encounterBaseline.measurements
    .map(measurement => {
      if (
        measurement.sbp === undefined ||
        measurement.dbp === undefined ||
        measurement.sbp <= 0 ||
        measurement.dbp <= 0
      ) {
        return undefined
      }
      return calculatePulsePressure(measurement.sbp, measurement.dbp)
    })
    .filter(
      (value): value is number =>
        typeof value === 'number' && Number.isFinite(value) && value > 0
    )
  const baseline = average(values)
  return baseline !== undefined ? round(baseline, 2) : undefined
}

function buildDelta(
  currentValue: number | undefined,
  baselineValue: number | undefined,
  source: EncounterDelta['source'],
  baselineWindowMinutes?: number,
  sampleCount?: number
): EncounterDelta | undefined {
  if (
    currentValue === undefined ||
    baselineValue === undefined ||
    !Number.isFinite(currentValue) ||
    !Number.isFinite(baselineValue) ||
    baselineValue <= 0
  ) {
    return undefined
  }

  const valueDelta = round(currentValue - baselineValue, 2)
  const percentDelta = round((valueDelta / baselineValue) * 100, 1)

  return {
    valueDelta,
    percentDelta,
    baselineValue: round(baselineValue, 2),
    baselineWindowMinutes,
    sampleCount,
    source,
  }
}

function buildDerivedMetrics(
  input: CompositeDeteriorationInput
): CompositeDerivedMetrics {
  const { current, encounterBaseline, personalBaseline } = input
  const { sbp, dbp, hr, spo2 } = current

  const map =
    sbp !== undefined && dbp !== undefined && sbp > 0 && dbp > 0
      ? calculateMAP(sbp, dbp)
      : undefined
  const pulsePressure =
    sbp !== undefined && dbp !== undefined && sbp > 0 && dbp > 0
      ? calculatePulsePressure(sbp, dbp)
      : undefined
  const shockIndex =
    sbp !== undefined && hr !== undefined && sbp > 0 ? round(hr / sbp, 2) : undefined
  const modifiedShockIndex =
    map !== undefined && hr !== undefined && map > 0 ? round(hr / map, 2) : undefined

  const encounterSampleCount = encounterBaseline?.measurements.length
  const encounterHrBaseline = getEncounterBaselineValue(encounterBaseline, 'hr')
  const encounterSpo2Baseline = getEncounterBaselineValue(encounterBaseline, 'spo2')
  const encounterSbpBaseline = getEncounterBaselineValue(encounterBaseline, 'sbp')
  const encounterPulsePressureBaseline = getEncounterPulsePressureBaseline(encounterBaseline)
  const personalParams = personalBaseline?.params ?? {}
  const personalHrBaseline = personalParams.hr?.mean ?? personalParams.hr?.median
  const personalSbpBaseline = personalParams.sbp?.mean ?? personalParams.sbp?.median

  return {
    map,
    pulsePressure,
    shockIndex,
    modifiedShockIndex,
    deltas: {
      hr:
        buildDelta(
          hr,
          encounterHrBaseline ?? personalHrBaseline,
          encounterHrBaseline !== undefined ? 'encounter_window' : personalHrBaseline !== undefined ? 'personal_baseline' : 'none',
          encounterBaseline?.windowMinutes,
          encounterSampleCount
        ) ?? { source: 'none' },
      spo2:
        buildDelta(
          spo2,
          encounterSpo2Baseline,
          encounterSpo2Baseline !== undefined ? 'encounter_window' : 'none',
          encounterBaseline?.windowMinutes,
          encounterSampleCount
        ) ?? { source: 'none' },
      sbp:
        buildDelta(
          sbp,
          encounterSbpBaseline ?? personalSbpBaseline,
          encounterSbpBaseline !== undefined ? 'encounter_window' : personalSbpBaseline !== undefined ? 'personal_baseline' : 'none',
          encounterBaseline?.windowMinutes,
          encounterSampleCount
        ) ?? { source: 'none' },
      pulsePressure:
        buildDelta(
          pulsePressure,
          encounterPulsePressureBaseline,
          encounterPulsePressureBaseline !== undefined ? 'encounter_window' : 'none',
          encounterBaseline?.windowMinutes,
          encounterSampleCount
        ) ?? { source: 'none' },
    },
  }
}

function scoreRR(rr: number | undefined): WeightedComponentScore | null {
  if (rr === undefined) return null
  if (rr < 8) return { parameter: 'rr', score: 3, reason: `RR ${rr}/menit <8` }
  if (rr <= 11) return { parameter: 'rr', score: 2, reason: `RR ${rr}/menit 9-11` }
  if (rr <= 20) return { parameter: 'rr', score: 0, reason: `RR ${rr}/menit dalam target` }
  if (rr <= 24) return { parameter: 'rr', score: 2, reason: `RR ${rr}/menit 21-24` }
  return { parameter: 'rr', score: 3, reason: `RR ${rr}/menit >24` }
}

function scoreSpo2(spo2: number | undefined, hasCOPD: boolean | undefined): WeightedComponentScore | null {
  if (spo2 === undefined) return null
  if (hasCOPD && spo2 >= 88 && spo2 <= 92) {
    return { parameter: 'spo2', score: 0, reason: `SpO2 ${spo2}% dalam target COPD` }
  }
  if (spo2 < 91) return { parameter: 'spo2', score: 3, reason: `SpO2 ${spo2}% <91` }
  if (spo2 <= 93) return { parameter: 'spo2', score: 2, reason: `SpO2 ${spo2}% 92-93` }
  if (spo2 <= 95) return { parameter: 'spo2', score: 2, reason: `SpO2 ${spo2}% 94-95` }
  return { parameter: 'spo2', score: 0, reason: `SpO2 ${spo2}% memadai` }
}

function scoreHR(hr: number | undefined): WeightedComponentScore | null {
  if (hr === undefined) return null
  if (hr < 40) return { parameter: 'hr', score: 3, reason: `HR ${hr} bpm <40` }
  if (hr <= 50) return { parameter: 'hr', score: 2, reason: `HR ${hr} bpm 41-50` }
  if (hr <= 90) return { parameter: 'hr', score: 0, reason: `HR ${hr} bpm dalam target` }
  if (hr <= 110) return { parameter: 'hr', score: 2, reason: `HR ${hr} bpm 91-110` }
  if (hr <= 130) return { parameter: 'hr', score: 2, reason: `HR ${hr} bpm 111-130` }
  return { parameter: 'hr', score: 3, reason: `HR ${hr} bpm >130` }
}

function scoreSBP(sbp: number | undefined): WeightedComponentScore | null {
  if (sbp === undefined) return null
  if (sbp < 90) return { parameter: 'sbp', score: 3, reason: `SBP ${sbp} mmHg <90` }
  if (sbp <= 100) return { parameter: 'sbp', score: 2, reason: `SBP ${sbp} mmHg 91-100` }
  if (sbp <= 110) return { parameter: 'sbp', score: 2, reason: `SBP ${sbp} mmHg 101-110` }
  if (sbp <= 219) return { parameter: 'sbp', score: 0, reason: `SBP ${sbp} mmHg dalam target` }
  return { parameter: 'sbp', score: 3, reason: `SBP ${sbp} mmHg >220` }
}

function scoreTemp(temp: number | undefined): WeightedComponentScore | null {
  if (temp === undefined) return null
  if (temp < 35.0) return { parameter: 'temp', score: 3, reason: `Suhu ${temp}°C <35.0` }
  if (temp <= 36.0) return { parameter: 'temp', score: 2, reason: `Suhu ${temp}°C 35.1-36.0` }
  if (temp <= 38.0) return { parameter: 'temp', score: 0, reason: `Suhu ${temp}°C dalam target` }
  if (temp <= 39.0) return { parameter: 'temp', score: 2, reason: `Suhu ${temp}°C 38.1-39.0` }
  return { parameter: 'temp', score: 3, reason: `Suhu ${temp}°C >39.1` }
}

function scoreAVPU(avpu: AVPULevel | undefined): WeightedComponentScore | null {
  if (avpu === undefined) return null
  if (avpu === 'A') return { parameter: 'avpu', score: 0, reason: 'AVPU Alert' }
  if (avpu === 'U') return { parameter: 'avpu', score: 3, reason: 'AVPU Unresponsive' }
  return { parameter: 'avpu', score: 2, reason: `AVPU ${avpu}` }
}

function scoreShockIndex(shockIndex: number | undefined): WeightedComponentScore | null {
  if (shockIndex === undefined) return null
  if (shockIndex < 0.7) {
    return { parameter: 'shock_index', score: 0, reason: `Shock Index ${shockIndex} <0.7` }
  }
  if (shockIndex <= 0.9) {
    return { parameter: 'shock_index', score: 2, reason: `Shock Index ${shockIndex} 0.7-0.9` }
  }
  return { parameter: 'shock_index', score: 3, reason: `Shock Index ${shockIndex} >0.9` }
}

function buildWeightedScores(
  current: CompositeVitalSnapshot,
  derived: CompositeDerivedMetrics,
  hasCOPD: boolean | undefined
): WeightedComponentScore[] {
  return [
    scoreRR(current.rr),
    scoreSpo2(current.spo2, hasCOPD),
    scoreHR(current.hr),
    scoreSBP(current.sbp),
    scoreTemp(current.temp),
    scoreAVPU(current.avpu),
    scoreShockIndex(derived.shockIndex),
  ].filter((score): score is WeightedComponentScore => score !== null)
}

function mapSeverity(severity: ScreeningAlert['severity']): CompositeAlertSeverity {
  return severity === 'warning' ? 'warning' : severity
}

function mapHardStopAlerts(screeningAlerts: ScreeningAlert[]): CompositeHardStopAlert[] {
  return screeningAlerts.map(alert => ({
    id: alert.id,
    bucket: 'hard_stop_alert',
    severity: mapSeverity(alert.severity),
    title: alert.title,
    rationale: alert.reasoning,
    recommendations: alert.recommendations,
  }))
}

function createCompositeAlert(params: {
  id: string
  syndrome: CompositeSyndromeId
  severity: CompositeAlertSeverity
  confidence: CompositeAlertConfidence
  title: string
  summary: string
  rationale: string
  evidence: string[]
  recommendedActions: string[]
  bucket?: 'composite_alert' | 'watcher'
  measuredAt?: string
}): CompositeAlert {
  const bucket = params.bucket ?? 'composite_alert'
  return {
    id: params.id,
    syndrome: params.syndrome,
    bucket,
    severity: params.severity,
    confidence: params.confidence,
    title: params.title,
    summary: params.summary,
    rationale: params.rationale,
    evidence: params.evidence,
    recommendedActions: params.recommendedActions,
    triggeredAt: params.measuredAt ?? new Date().toISOString(),
    suppressionKey: `${params.syndrome}:${params.severity}:${params.confidence}`,
  }
}

function hasRespiratoryStructuredSigns(structuredSigns: StructuredTriageSigns | undefined): boolean {
  return Boolean(
    structuredSigns?.respiratoryDistress?.accessoryMuscleUse ||
      structuredSigns?.respiratoryDistress?.retractions ||
      structuredSigns?.respiratoryDistress?.unableToSpeakFullSentences ||
      structuredSigns?.respiratoryDistress?.cyanosis ||
      structuredSigns?.respiratoryDistress?.distressObserved
  )
}

function hasPerfusionStructuredSigns(structuredSigns: StructuredTriageSigns | undefined): boolean {
  return Boolean(
    structuredSigns?.perfusionShock?.dizziness ||
      structuredSigns?.perfusionShock?.presyncope ||
      structuredSigns?.perfusionShock?.syncope ||
      structuredSigns?.perfusionShock?.weakness ||
      structuredSigns?.perfusionShock?.clammySkin ||
      structuredSigns?.perfusionShock?.coldExtremities ||
      structuredSigns?.perfusionShock?.oliguria ||
      (structuredSigns?.perfusionShock?.capillaryRefillSec ?? 0) > 3
  )
}

function hasNeuroStructuredSigns(structuredSigns: StructuredTriageSigns | undefined): boolean {
  return Boolean(
    structuredSigns?.hmod?.neurological_deficit ||
      structuredSigns?.hmod?.vision_changes ||
      structuredSigns?.hmod?.severe_headache ||
      structuredSigns?.hmod?.altered_mental_status
  )
}

function getStructuredSigns(value: unknown): StructuredTriageSigns | undefined {
  return value && typeof value === 'object' ? (value as StructuredTriageSigns) : undefined
}

function buildDataCompleteness(
  input: CompositeDeteriorationInput
): SharedCompositeDeteriorationResult['dataCompleteness'] {
  const requiredSignalsPresent: string[] = []
  const missingSignals: string[] = []

  ;(['hr', 'sbp', 'dbp', 'rr', 'temp', 'spo2', 'avpu'] as const).forEach(key => {
    const value = input.current[key]
    if (value !== undefined && value !== null) {
      requiredSignalsPresent.push(key)
      return
    }
    missingSignals.push(key)
  })

  return {
    requiredSignalsPresent,
    missingSignals,
    encounterTrendAvailable: Boolean(input.encounterBaseline?.measurements.length),
    personalBaselineAvailable: Boolean(input.personalBaseline?.params && Object.keys(input.personalBaseline.params).length),
  }
}

function buildImmediateInputFromComposite(
  input: CompositeDeteriorationInput,
  visitHistory?: HistoricalBP[]
): ImmediateScreeningInput {
  return {
    vitals: {
      sbp: input.current.sbp,
      dbp: input.current.dbp,
      hr: input.current.hr,
      rr: input.current.rr,
      temp: input.current.temp,
      spo2: input.current.spo2,
      avpu: input.current.avpu,
      supplementalO2: input.current.supplementalO2,
      glucose: input.current.glucose,
      hasCOPD: input.hasCOPD,
      capillaryRefillSec: input.current.capillaryRefillSec,
    },
    patientAgeYears: input.patientAgeYears,
    patientAgeMonths: input.patientAgeMonths,
    patientGender: input.patientGender,
    isPregnant: input.isPregnant,
    chiefComplaint: input.chiefComplaint,
    additionalComplaint: input.additionalComplaint,
    medicalHistory: input.medicalHistory,
    visitHistory,
    structuredSigns: getStructuredSigns(input.structuredSigns),
  }
}

function buildCompositeInputFromEmrPayload(
  data: Record<string, unknown>,
  immediateInput: ImmediateScreeningInput
): CompositeDeteriorationInput {
  const vitals = immediateInput.vitals
  const current: CompositeVitalSnapshot = {
    hr: vitals.hr,
    sbp: vitals.sbp,
    dbp: vitals.dbp,
    rr: vitals.rr,
    temp: vitals.temp,
    spo2: vitals.spo2,
    avpu: vitals.avpu,
    supplementalO2: vitals.supplementalO2,
    glucose: vitals.glucose,
    capillaryRefillSec: vitals.capillaryRefillSec,
    measuredAt: new Date().toISOString(),
  }

  return {
    patientIdHash: toOptionalString(data.patientIdentifier),
    patientAgeYears: immediateInput.patientAgeYears,
    patientAgeMonths: immediateInput.patientAgeMonths,
    patientGender: immediateInput.patientGender,
    isPregnant: immediateInput.isPregnant,
    hasCOPD: immediateInput.vitals.hasCOPD,
    medicalHistory: immediateInput.medicalHistory,
    chiefComplaint: immediateInput.chiefComplaint,
    additionalComplaint: immediateInput.additionalComplaint,
    structuredSigns: immediateInput.structuredSigns,
    current,
    encounterBaseline: normalizeEncounterBaseline(data),
    personalBaseline:
      buildPersonalBaselineFromVisits(data.visitHistory) ??
      (readRecord(data.personalBaseline).params ? (data.personalBaseline as CompositeDeteriorationInput['personalBaseline']) : undefined),
  }
}

function appendIfUnique(alerts: CompositeAlert[], alert: CompositeAlert): void {
  if (alerts.some(existing => existing.id === alert.id)) return
  alerts.push(alert)
}

export function evaluateCompositeDeterioration(
  input: CompositeDeteriorationInput,
  immediateInput?: ImmediateScreeningInput
): CompositeDeteriorationResult {
  const structuredSigns = getStructuredSigns(input.structuredSigns)
  const screeningInput = immediateInput ?? buildImmediateInputFromComposite(input)
  const screeningAlerts = evaluateImmediateScreeningAlerts(screeningInput)
  const hardStopAlerts = mapHardStopAlerts(screeningAlerts)
  const derived = buildDerivedMetrics(input)
  const weightedScores = buildWeightedScores(input.current, derived, input.hasCOPD)
  const compositeAlerts: CompositeAlert[] = []
  const watchers: CompositeAlert[] = []
  const measuredAt = input.current.measuredAt

  const { hr, sbp, rr, temp, spo2, avpu, supplementalO2, capillaryRefillSec } = input.current
  const map = derived.map
  const pulsePressure = derived.pulsePressure
  const shockIndex = derived.shockIndex
  const hrDelta = derived.deltas?.hr
  const spo2Delta = derived.deltas?.spo2

  if (
    shockIndex !== undefined &&
    shockIndex > 0.9 &&
    temp !== undefined &&
    temp > 38.1 &&
    rr !== undefined &&
    rr > 20
  ) {
    const perfusionEvidence = hasPerfusionStructuredSigns(structuredSigns)
    appendIfUnique(
      compositeAlerts,
      createCompositeAlert({
        id: 'composite-sepsis-shock-pathway',
        syndrome: 'sepsis_shock_pathway',
        severity:
          (avpu !== undefined && avpu !== 'A') ||
          (map !== undefined && map < 65) ||
          (capillaryRefillSec ?? 0) > 3 ||
          perfusionEvidence
            ? 'critical'
            : 'high',
        confidence:
          map !== undefined || (capillaryRefillSec ?? 0) > 0 || perfusionEvidence
            ? 'high'
            : 'medium',
        title: 'SUSPECTED SEPSIS / SHOCK',
        summary: 'Kombinasi SI tinggi, demam, dan takipnea mengarah ke deteriorasi sepsis/shock.',
        rationale:
          'Pattern recognition lebih presisi daripada penjumlahan skor tunggal untuk mendeteksi perburukan sepsis/shock dini.',
        evidence: [
          `Shock Index ${shockIndex} >0.9`,
          `Suhu ${temp}°C >38.1`,
          `RR ${rr}/menit >20`,
          ...(map !== undefined && map < 65 ? [`MAP ${map} mmHg <65`] : []),
          ...((capillaryRefillSec ?? 0) > 3 ? [`CRT ${capillaryRefillSec} detik >3`] : []),
        ],
        recommendedActions: [
          'Notifikasi suspek sepsis/shock dan evaluasi perfusi segera',
          'Cek laktat dan profil cairan bila tersedia',
          'Pantau serial MAP, HR, RR, dan status mental',
        ],
        measuredAt,
      })
    )
  }

  if (
    spo2Delta?.source === 'encounter_window' &&
    spo2Delta.valueDelta !== undefined &&
    spo2Delta.valueDelta <= -3 &&
    rr !== undefined &&
    rr > 24
  ) {
    const respiratoryDistress = hasRespiratoryStructuredSigns(structuredSigns)
    appendIfUnique(
      compositeAlerts,
      createCompositeAlert({
        id: 'composite-respiratory-deterioration',
        syndrome: 'respiratory_deterioration',
        severity:
          supplementalO2 === true || respiratoryDistress || (avpu !== undefined && avpu !== 'A')
            ? 'critical'
            : 'high',
        confidence: spo2Delta.sampleCount && spo2Delta.sampleCount >= 2 ? 'high' : 'medium',
        title: 'IMPENDING RESPIRATORY FAILURE',
        summary: 'Delta SpO2 2 jam dan takipnea menunjukkan deteriorasi respirasi.',
        rationale:
          'Penurunan saturasi dari baseline encounter lebih bermakna daripada snapshot tunggal untuk mengenali gagal napas yang sedang berkembang.',
        evidence: [
          `Delta SpO2 ${spo2Delta.valueDelta}% dari baseline ${spo2Delta.baselineValue}%`,
          `RR ${rr}/menit >24`,
          ...(supplementalO2 === true ? ['Pasien sudah mendapat oksigen tambahan'] : []),
        ],
        recommendedActions: [
          'Siapkan oksigenasi lanjut dan monitoring lebih rapat',
          'Nilai work of breathing dan kebutuhan eskalasi airway',
          'Rujuk emergensi bila saturasi terus turun atau mental status memburuk',
        ],
        measuredAt,
      })
    )
  } else if (
    rr !== undefined &&
    rr > 24 &&
    ((spo2 !== undefined && spo2 < 94) || hasRespiratoryStructuredSigns(structuredSigns))
  ) {
    appendIfUnique(
      watchers,
      createCompositeAlert({
        id: 'watcher-respiratory-deterioration',
        syndrome: 'respiratory_deterioration',
        bucket: 'watcher',
        severity: 'warning',
        confidence: 'low',
        title: 'RESPIRATORY DETERIORATION WATCH',
        summary: 'Ada sinyal respirasi memburuk, tetapi baseline 2 jam belum tersedia.',
        rationale:
          'Pattern respirasi membutuhkan delta SpO2 terhadap baseline encounter agar presisi tinggi.',
        evidence: [
          `RR ${rr}/menit >24`,
          ...(spo2 !== undefined ? [`SpO2 ${spo2}%`] : []),
          ...(hasRespiratoryStructuredSigns(structuredSigns) ? ['Ada distress pernapasan terstruktur'] : []),
        ],
        recommendedActions: [
          'Kumpulkan ulang SpO2 serial dalam 2 jam untuk konfirmasi delta',
          'Pantau tanda distress napas dan kebutuhan oksigen',
        ],
        measuredAt,
      })
    )
  }

  if (
    sbp !== undefined &&
    sbp > 180 &&
    hr !== undefined &&
    hr < 50 &&
    pulsePressure !== undefined &&
    pulsePressure > 60
  ) {
    const neuroEvidence = hasNeuroStructuredSigns(structuredSigns)
    appendIfUnique(
      compositeAlerts,
      createCompositeAlert({
        id: 'composite-neuro-intracranial',
        syndrome: 'neuro_intracranial_pathway',
        severity:
          neuroEvidence || (avpu !== undefined && avpu !== 'A') ? 'critical' : 'high',
        confidence: neuroEvidence ? 'high' : 'medium',
        title: "CUSHING'S TRIAD WARNING",
        summary: 'Hipertensi, bradikardia, dan pulse pressure lebar mengarah ke risiko neuro/intrakranial.',
        rationale:
          'Kombinasi ini lebih mengkhawatirkan daripada hipertensi terisolasi karena menunjukkan kemungkinan tekanan intrakranial meningkat.',
        evidence: [
          `SBP ${sbp} mmHg >180`,
          `HR ${hr} bpm <50`,
          `Pulse Pressure ${pulsePressure} mmHg >60`,
          ...(neuroEvidence ? ['Ada gejala neuro/HMOD terstruktur'] : []),
        ],
        recommendedActions: [
          'Trigger notifikasi keras risiko neuro/intrakranial',
          'Nilai headache hebat, defisit fokal, dan perubahan kesadaran',
          'Siapkan rujukan emergensi neurologi bila klinis mendukung',
        ],
        measuredAt,
      })
    )
  }

  if (
    hrDelta?.percentDelta !== undefined &&
    hrDelta.percentDelta >= 20 &&
    pulsePressure !== undefined &&
    pulsePressure < 30 &&
    sbp !== undefined &&
    sbp > 100
  ) {
    const perfusionEvidence = hasPerfusionStructuredSigns(structuredSigns)
    appendIfUnique(
      compositeAlerts,
      createCompositeAlert({
        id: 'composite-silent-bleed-occult-shock',
        syndrome: 'silent_bleed_occult_shock',
        severity:
          perfusionEvidence || (capillaryRefillSec ?? 0) > 3 ? 'critical' : 'high',
        confidence:
          hrDelta.source === 'encounter_window' || perfusionEvidence ? 'high' : 'medium',
        title: 'SUSPECTED VOLUME DEPLETION / INTERNAL BLEEDING',
        summary: 'Takikardia relatif dengan pulse pressure menyempit mengarah ke occult shock.',
        rationale:
          'Kenaikan HR relatif dari baseline sering muncul lebih awal sebelum sistolik benar-benar turun.',
        evidence: [
          `HR naik ${hrDelta.percentDelta}% dari baseline ${hrDelta.baselineValue}`,
          `Pulse Pressure ${pulsePressure} mmHg <30`,
          `SBP ${sbp} mmHg masih >100`,
          ...(capillaryRefillSec !== undefined && capillaryRefillSec > 3 ? [`CRT ${capillaryRefillSec} detik >3`] : []),
        ],
        recommendedActions: [
          'Evaluasi deplesi volume atau perdarahan internal',
          'Pantau HR, BP, PP, dan perfusi perifer secara serial',
          'Naikkan level kewaspadaan meski sistolik belum turun',
        ],
        measuredAt,
      })
    )
  } else if (
    pulsePressure !== undefined &&
    pulsePressure < 30 &&
    sbp !== undefined &&
    sbp > 100 &&
    hasPerfusionStructuredSigns(structuredSigns)
  ) {
    appendIfUnique(
      watchers,
      createCompositeAlert({
        id: 'watcher-silent-bleed-occult-shock',
        syndrome: 'silent_bleed_occult_shock',
        bucket: 'watcher',
        severity: 'warning',
        confidence: 'low',
        title: 'OCCULT SHOCK WATCH',
        summary: 'Perfusi tampak memburuk, tetapi baseline HR belum cukup untuk konfirmasi pola silent bleed.',
        rationale:
          'Pola ini memerlukan delta HR terhadap baseline agar sensitivitas meningkat tanpa terlalu banyak false positive.',
        evidence: [
          `Pulse Pressure ${pulsePressure} mmHg <30`,
          `SBP ${sbp} mmHg masih >100`,
          'Ada tanda perfusi buruk terstruktur',
        ],
        recommendedActions: [
          'Ulangi HR serial dan kumpulkan baseline encounter',
          'Pantau CRT, akral, oliguria, dan gejala presinkop',
        ],
        measuredAt,
      })
    )
  }

  return {
    derived,
    weightedScores,
    hardStopAlerts,
    compositeAlerts,
    watchers,
    dataCompleteness: buildDataCompleteness(input),
    screeningAlerts,
  }
}

export function evaluateCompositeDeteriorationFromEmrPayload(
  data: Record<string, unknown>
): CompositeDeteriorationResult {
  const immediateInput = buildImmediateScreeningInputFromEmrPayload(data)
  const compositeInput = buildCompositeInputFromEmrPayload(data, immediateInput)
  return evaluateCompositeDeterioration(compositeInput, immediateInput)
}
