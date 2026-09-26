import { type NextRequest, NextResponse } from 'next/server'

import { calculateNEWS2 } from '@/lib/cdss/news2'
import type { VitalSigns } from '@/lib/cdss/types'
import { analyzeTrajectory, type TrajectoryAnalysis, type VisitRecord } from '@/lib/clinical/trajectory-analyzer'
import { type HistoricalBP } from '@/lib/occult-shock-detector'
import { handleCorsPreflight, jsonWithCors } from '@/lib/server/api-cors'
import { isCrewAuthorizedRequest } from '@/lib/server/crew-access-auth'
import {
  evaluateImmediateScreeningAlerts,
  type ImmediateScreeningInput,
} from '@/lib/vitals/instant-red-alerts'
import type { AVPULevel } from '@/lib/vitals/unified-vitals'

export const runtime = 'nodejs'

const CORS_METHODS = ['POST', 'OPTIONS'] as const

type CanonicalPregnancyStatus = 'hamil' | 'tidak_hamil' | 'tidak_relevan' | 'tidak_diisi'

type CanonicalTriageRequest = {
  request_id?: string
  request_time?: string
  patient?: {
    patient_id?: string
    rm?: string
    name?: string
    gender?: 'L' | 'P'
    age?: number
    dob?: string
    payer_label?: string
    bpjs_status?: 'aktif' | 'nonaktif' | 'mandiri' | null
    kelurahan?: string
    facility_name?: string
  }
  vitals?: {
    sbp?: number
    dbp?: number
    hr?: number
    rr?: number
    temp?: number
    spo2?: number
    glucose?: {
      value?: number
      type?: string
    }
    avpu?: AVPULevel
    supplemental_o2?: boolean
    pain_score?: number
    has_copd?: boolean
    weight_kg?: number
    height_cm?: number
    measurement_time?: string
  }
  narrative?: {
    symptom_text_raw?: string
    keluhan_utama?: string
    keluhan_tambahan?: string
    autocomplete_summary?: string
    autosen_preset?: string
  }
  context?: {
    chronic_diseases?: string[]
    allergies?: string[]
    pregnancy_status?: CanonicalPregnancyStatus
    pregnancy_risk?: string
    special_conditions?: string[]
    disability_type?: string
    obesity_confirmation?: 'confirmed' | 'not_confirmed'
  }
  bedside_signs?: {
    structured_signs_text?: string
    deterioration_summary_text?: string
  }
  history?: {
    visits_used?: number
    prefetched_visits?: Array<{
      encounter_id?: string
      timestamp?: string
      keluhan_utama?: string
      source?: 'scrape'
      vitals?: {
        sbp?: number
        dbp?: number
        hr?: number
        rr?: number
        temp?: number
        glucose?: number
        spo2?: number
      }
      diagnosa?: {
        icd_x?: string
        nama?: string
      }
    }>
  }
}

type CanonicalTrajectoryResponse = {
  request_id: string
  processed_at: string
  source: {
    engine: 'dashboard-clinical-engine'
    engine_version: string
    mode: 'canonical'
  }
  scoring: {
    news2?: {
      score: number
      risk_level: 'low' | 'low-medium' | 'medium' | 'high'
      drivers: string[]
    }
    map?: {
      value: number
      interpretation: string
    }
    occult_shock?: {
      risk_level: 'low' | 'moderate' | 'high' | 'critical'
      suspected: boolean
      reasoning: string[]
    }
  }
  alerts: Array<{
    id: string
    family: 'red_flag' | 'news2' | 'early_warning' | 'trajectory' | 'governance'
    severity: 'emergency' | 'urgent' | 'warning' | 'info'
    title: string
    message: string
    action?: string
    criteria_met?: string[]
  }>
  early_warning_patterns: Array<{
    id: string
    label: string
    severity: 'high' | 'medium' | 'low'
    reasoning: string[]
    recommendations: string[]
  }>
  trajectory: {
    available: boolean
    visit_count: number
    overall_trend?: 'improving' | 'declining' | 'stable' | 'insufficient_data'
    overall_risk?: 'low' | 'moderate' | 'high' | 'critical'
    momentum_level?: string
    deterioration_state?: 'improving' | 'stable' | 'deteriorating' | 'critical'
    narrative?: string
    recommendations?: Array<{
      category: 'improvement' | 'concern' | 'action' | 'monitoring'
      priority: 'high' | 'medium' | 'low'
      text: string
    }>
    raw_context?: {
      trajectory_context?: {
        momentumLevel: string
        convergencePattern: string
        convergenceScore: number
        worseningParams: string[]
        isAccelerating: boolean
        timeToCriticalDays: number | null
        treatmentResponseNote: string
        narrative: string
        visitCount?: number
      }
      deterioration_summary_text?: string
    }
  }
  recommendations: {
    immediate_actions: string[]
    monitoring_actions: string[]
    referral_actions: string[]
    next_best_questions: string[]
  }
  governance: {
    disclaimer: string
    review_required: boolean
    authoritative_engine: 'dashboard'
  }
}

function toArray(value: unknown): string[] {
  if (!Array.isArray(value)) return []
  return value
    .map(item => (typeof item === 'string' ? item.trim() : ''))
    .filter(Boolean)
}

function toMapInterpretation(value?: number): string | undefined {
  if (typeof value !== 'number' || !Number.isFinite(value)) return undefined
  if (value < 65) return 'Perfusi rendah'
  if (value < 70) return 'Borderline perfusi'
  return 'Perfusi adekuat'
}

function toPregnancyBoolean(value?: CanonicalPregnancyStatus): boolean | undefined {
  if (value === 'hamil') return true
  if (value === 'tidak_hamil') return false
  return undefined
}

function toNews2Risk(level: 'low' | 'low_medium' | 'medium' | 'high'): 'low' | 'low-medium' | 'medium' | 'high' {
  return level === 'low_medium' ? 'low-medium' : level
}

function buildVitalSigns(payload: CanonicalTriageRequest): VitalSigns {
  return {
    systolic: payload.vitals?.sbp,
    diastolic: payload.vitals?.dbp,
    heart_rate: payload.vitals?.hr,
    respiratory_rate: payload.vitals?.rr,
    temperature: payload.vitals?.temp,
    spo2: payload.vitals?.spo2,
    weight_kg: payload.vitals?.weight_kg,
    height_cm: payload.vitals?.height_cm,
    avpu: payload.vitals?.avpu,
    supplemental_o2: payload.vitals?.supplemental_o2,
    pain_score: payload.vitals?.pain_score,
    has_copd: payload.vitals?.has_copd,
  }
}

function toHistoricalBP(visits: CanonicalTriageRequest['history']): HistoricalBP[] {
  return (visits?.prefetched_visits ?? [])
    .map(visit => ({
      visit_date: typeof visit.timestamp === 'string' ? visit.timestamp : new Date().toISOString(),
      sbp: typeof visit.vitals?.sbp === 'number' ? visit.vitals.sbp : 0,
      dbp: typeof visit.vitals?.dbp === 'number' ? visit.vitals.dbp : 0,
      location: 'clinic' as const,
    }))
    .filter(visit => visit.sbp > 0 && visit.dbp > 0)
    .slice(-3)
}

function buildImmediateInput(payload: CanonicalTriageRequest): ImmediateScreeningInput {
  const chiefComplaint = payload.narrative?.keluhan_utama?.trim() || payload.narrative?.symptom_text_raw?.trim()
  const additionalComplaint = payload.narrative?.keluhan_tambahan?.trim() || undefined

  return {
    vitals: {
      sbp: payload.vitals?.sbp,
      dbp: payload.vitals?.dbp,
      hr: payload.vitals?.hr,
      rr: payload.vitals?.rr,
      temp: payload.vitals?.temp,
      spo2: payload.vitals?.spo2,
      avpu: payload.vitals?.avpu,
      supplementalO2: payload.vitals?.supplemental_o2,
      glucose: payload.vitals?.glucose?.value,
      hasCOPD: payload.vitals?.has_copd,
    },
    patientAgeYears: payload.patient?.age,
    patientGender: payload.patient?.gender,
    isPregnant: toPregnancyBoolean(payload.context?.pregnancy_status),
    chiefComplaint,
    additionalComplaint,
    medicalHistory: toArray(payload.context?.chronic_diseases),
    visitHistory: toHistoricalBP(payload.history),
  }
}

function buildCurrentVisit(payload: CanonicalTriageRequest): VisitRecord {
  return {
    patient_id: payload.patient?.patient_id || payload.patient?.rm || 'unknown-patient',
    encounter_id: `assist-current-${payload.request_id ?? Date.now()}`,
    timestamp: payload.request_time || new Date().toISOString(),
    vitals: {
      sbp: payload.vitals?.sbp ?? 0,
      dbp: payload.vitals?.dbp ?? 0,
      hr: payload.vitals?.hr ?? 0,
      rr: payload.vitals?.rr ?? 0,
      temp: payload.vitals?.temp ?? 0,
      glucose: payload.vitals?.glucose?.value ?? 0,
      spo2: payload.vitals?.spo2 ?? 0,
      avpu: payload.vitals?.avpu,
    },
    keluhan_utama: payload.narrative?.keluhan_utama?.trim() || payload.narrative?.symptom_text_raw?.trim() || '',
    diagnosa: undefined,
    source: 'uplink' as const,
  }
}

function buildHistoricalVisits(payload: CanonicalTriageRequest): VisitRecord[] {
  return (payload.history?.prefetched_visits ?? [])
    .map(visit => ({
      patient_id: payload.patient?.patient_id || payload.patient?.rm || 'unknown-patient',
      encounter_id: visit.encounter_id || `history-${visit.timestamp || Date.now()}`,
      timestamp: visit.timestamp || new Date().toISOString(),
      vitals: {
        sbp: visit.vitals?.sbp ?? 0,
        dbp: visit.vitals?.dbp ?? 0,
        hr: visit.vitals?.hr ?? 0,
        rr: visit.vitals?.rr ?? 0,
        temp: visit.vitals?.temp ?? 0,
        glucose: visit.vitals?.glucose ?? 0,
        spo2: visit.vitals?.spo2 ?? 0,
        avpu: undefined,
      },
      keluhan_utama: visit.keluhan_utama?.trim() || '',
      diagnosa:
        visit.diagnosa?.icd_x && visit.diagnosa?.nama
          ? {
              icd_x: visit.diagnosa.icd_x,
              nama: visit.diagnosa.nama,
            }
          : undefined,
      source: 'scrape' as const,
    }))
    .filter(visit => visit.encounter_id && visit.timestamp)
}

function dedupeVisits(visits: VisitRecord[]): VisitRecord[] {
  const map = new Map<string, VisitRecord>()
  for (const visit of visits) {
    const key = `${visit.encounter_id}:${visit.timestamp}`
    map.set(key, visit)
  }
  return Array.from(map.values()).sort(
    (left, right) => new Date(left.timestamp).getTime() - new Date(right.timestamp).getTime()
  )
}

function toAlertFamily(type: string): 'red_flag' | 'news2' | 'early_warning' | 'trajectory' | 'governance' {
  if (type === 'occult_shock' || type === 'sepsis' || type === 'preeclampsia') return 'early_warning'
  if (type === 'news2') return 'news2'
  if (type.includes('shock') || type.includes('pattern') || type.includes('sepsis')) return 'early_warning'
  return 'red_flag'
}

function toAlertSeverity(value: 'critical' | 'high' | 'warning'): 'emergency' | 'urgent' | 'warning' {
  if (value === 'critical') return 'emergency'
  if (value === 'high') return 'urgent'
  return 'warning'
}

function buildTrajectorySummary(
  analysis: TrajectoryAnalysis | null,
  visitCount: number,
  deteriorationSummaryText?: string
): CanonicalTrajectoryResponse['trajectory'] {
  if (!analysis) {
    return {
      available: false,
      visit_count: visitCount,
      raw_context: {
        deterioration_summary_text: deteriorationSummaryText,
      },
    }
  }

  const etaHours = Object.values(analysis.time_to_critical_estimate).filter(
    (value): value is number => typeof value === 'number' && Number.isFinite(value)
  )
  const nearestEtaHours = etaHours.length > 0 ? Math.min(...etaHours) : null
  const worseningParams = analysis.momentum.convergence.worseningParams.map(param => String(param))
  const isAccelerating = analysis.momentum.params.some(
    parameter => parameter.direction === 'worsening' && parameter.isAccelerating
  )

  return {
    available: true,
    visit_count: visitCount,
    overall_trend: analysis.overallTrend,
    overall_risk: analysis.overallRisk,
    momentum_level: analysis.momentum.level,
    deterioration_state: analysis.global_deterioration.state,
    narrative: analysis.summary,
    recommendations: analysis.recommendations,
    raw_context: {
      trajectory_context: {
        momentumLevel: analysis.momentum.level,
        convergencePattern: analysis.momentum.convergence.pattern,
        convergenceScore: analysis.momentum.convergence.convergenceScore,
        worseningParams,
        isAccelerating,
        timeToCriticalDays:
          nearestEtaHours !== null ? Math.round((nearestEtaHours / 24) * 10) / 10 : null,
        treatmentResponseNote: analysis.summary,
        narrative: analysis.momentum.narrative,
        visitCount: analysis.visitCount,
      },
      deterioration_summary_text: deteriorationSummaryText,
    },
  }
}

export async function OPTIONS(request: NextRequest) {
  return handleCorsPreflight(request, CORS_METHODS)
}

export async function POST(request: NextRequest) {
  if (!isCrewAuthorizedRequest(request)) {
    return jsonWithCors(request, CORS_METHODS, { ok: false, error: 'Unauthorized' }, { status: 401 })
  }

  let body: CanonicalTriageRequest
  try {
    body = (await request.json()) as CanonicalTriageRequest
  } catch {
    return jsonWithCors(request, CORS_METHODS, { ok: false, error: 'Invalid JSON body' }, { status: 400 })
  }

  if (!body.patient?.gender || !body.patient?.age || !body.patient?.rm) {
    return jsonWithCors(
      request,
      CORS_METHODS,
      { ok: false, error: 'Field wajib patient.gender, patient.age, dan patient.rm harus terisi' },
      { status: 400 }
    )
  }

  if (!body.narrative?.keluhan_utama?.trim()) {
    return jsonWithCors(
      request,
      CORS_METHODS,
      { ok: false, error: 'Field wajib narrative.keluhan_utama harus terisi' },
      { status: 400 }
    )
  }

  const requestId =
    body.request_id?.trim() ||
    request.headers.get('X-Correlation-Id')?.trim() ||
    `assist-${Date.now()}`

  const vitalSigns = buildVitalSigns(body)
  const immediateInput = buildImmediateInput(body)
  const currentVisit = buildCurrentVisit(body)
  const historicalVisits = buildHistoricalVisits(body)
  const allVisits = dedupeVisits([...historicalVisits, currentVisit])

  const news2 = calculateNEWS2({
    vitals: vitalSigns,
    avpu: body.vitals?.avpu,
    supplementalO2: body.vitals?.supplemental_o2,
    hasCOPD: body.vitals?.has_copd,
  })

  const screeningAlerts = evaluateImmediateScreeningAlerts(immediateInput)
  let trajectoryAnalysis: TrajectoryAnalysis | null = null

  try {
    trajectoryAnalysis = allVisits.length > 0 ? analyzeTrajectory(allVisits) : null
  } catch (error) {
    console.error('[ClinicalEngineEvaluate] trajectory failed', {
      requestId,
      error: error instanceof Error ? error.message : String(error),
    })
  }

  const mapValue =
    typeof body.vitals?.sbp === 'number' && typeof body.vitals?.dbp === 'number'
      ? Math.round((body.vitals.sbp + 2 * body.vitals.dbp) / 3)
      : undefined

  const output: CanonicalTrajectoryResponse = {
    request_id: requestId,
    processed_at: new Date().toISOString(),
    source: {
      engine: 'dashboard-clinical-engine',
      engine_version: '2026.04.06-phase1',
      mode: 'canonical',
    },
    scoring: {
      news2: {
        score: news2.aggregate_score,
        risk_level: toNews2Risk(news2.risk_level),
        drivers: news2.parameter_scores.filter(item => item.score > 0).map(item => item.parameter),
      },
      ...(typeof mapValue === 'number' && toMapInterpretation(mapValue)
        ? {
            map: {
              value: mapValue,
              interpretation: toMapInterpretation(mapValue) ?? 'Perfusi tidak terklasifikasi',
            },
          }
        : {}),
      occult_shock: screeningAlerts.some(alert => alert.type === 'occult_shock')
        ? {
            risk_level:
              screeningAlerts.some(alert => alert.type === 'occult_shock' && alert.severity === 'critical')
                ? 'critical'
                : screeningAlerts.some(alert => alert.type === 'occult_shock' && alert.severity === 'high')
                  ? 'high'
                  : 'moderate',
            suspected: true,
            reasoning: screeningAlerts
              .filter(alert => alert.type === 'occult_shock')
              .flatMap(alert => [alert.reasoning, ...alert.recommendations])
              .filter(Boolean),
          }
        : undefined,
    },
    alerts: screeningAlerts.map(alert => ({
      id: alert.id,
      family: toAlertFamily(alert.type),
      severity: toAlertSeverity(alert.severity),
      title: alert.title,
      message: alert.reasoning,
      action: alert.recommendations[0],
      criteria_met: alert.recommendations,
    })),
    early_warning_patterns: screeningAlerts
      .filter(alert => toAlertFamily(alert.type) === 'early_warning')
      .map(alert => ({
        id: alert.id,
        label: alert.title,
        severity: alert.severity === 'critical' ? 'high' : alert.severity === 'high' ? 'medium' : 'low',
        reasoning: [alert.reasoning],
        recommendations: alert.recommendations,
      })),
    trajectory: buildTrajectorySummary(
      trajectoryAnalysis,
      allVisits.length,
      body.bedside_signs?.deterioration_summary_text
    ),
    recommendations: {
      immediate_actions: screeningAlerts
        .filter(alert => alert.severity === 'critical' || alert.severity === 'high')
        .flatMap(alert => alert.recommendations)
        .filter(Boolean)
        .slice(0, 5),
      monitoring_actions: [news2.monitoring_recommendation].filter(Boolean),
      referral_actions: screeningAlerts
        .filter(alert => alert.severity === 'critical')
        .flatMap(alert => alert.recommendations)
        .filter(Boolean)
        .slice(0, 3),
      next_best_questions: trajectoryAnalysis?.clinical_safe_output.missing_data ?? [],
    },
    governance: {
      disclaimer: 'Output canonical tetap wajib ditinjau klinisi sebelum keputusan klinis final.',
      review_required: true,
      authoritative_engine: 'dashboard',
    },
  }

  return jsonWithCors(request, CORS_METHODS, { ok: true, data: output }, { status: 200 })
}
