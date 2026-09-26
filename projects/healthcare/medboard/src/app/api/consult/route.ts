// Sentra Assist — Ghost Protocols Bridge
// POST /api/consult — receive clinical consult from Assist, route to target doctor
// Called by Assist (Chrome Extension) after perawat selects a doctor

import { type NextRequest } from 'next/server'
import type { CDSSResponse, ClinicalAlert } from '@abyss/types'

import {
  appendClinicalCaseAuditEvent,
  CLINICAL_CASE_AUDIT_EVENTS,
} from '@/lib/audit/clinical-case-audit'
import { ghostToDashboardSuggestions } from '@/lib/cdss/format-adapter'
import { parseDiagnoseRequestBody } from '@/lib/cdss/diagnose-parser'
import { runDiagnosisEngine } from '@/lib/cdss/engine'
import type { CDSSEngineResult, CDSSAlert, VitalSigns } from '@/lib/cdss/types'
import {
  emitCdssSuggestionReady,
  emitCriticalAlert,
  emitEncounterUpdated,
} from '@/lib/intelligence/socket-bridge'
import { createScreeningAuditLog } from '@/lib/audit/screening-audit-service'
import { prisma } from '@/lib/prisma'
import { handleCorsPreflight, jsonWithCors } from '@/lib/server/api-cors'
import { getCrewSessionFromRequest, isCrewAuthorizedRequest } from '@/lib/server/crew-access-auth'
import { emitAssistConsult } from '@/lib/telemedicine/socket-bridge'

export const runtime = 'nodejs'

const CORS_METHODS = ['POST', 'OPTIONS'] as const

function buildPatientLabel(consultId: string): string {
  return `Pasien #${consultId.slice(-6).toUpperCase()}`
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === 'object' && Array.isArray(value) === false
}

function parseNumber(value: unknown): number | undefined {
  if (typeof value === 'number' && Number.isFinite(value)) {
    return value
  }

  if (typeof value !== 'string') {
    return undefined
  }

  const normalized = value.trim().replace(',', '.')
  if (!normalized) {
    return undefined
  }

  const parsed = Number(normalized)
  return Number.isFinite(parsed) ? parsed : undefined
}

function pickNumber(record: Record<string, unknown> | null, keys: string[]): number | undefined {
  if (!record) {
    return undefined
  }

  for (const key of keys) {
    const parsed = parseNumber(record[key])
    if (parsed !== undefined) {
      return parsed
    }
  }

  return undefined
}

function pickString(record: Record<string, unknown> | null, keys: string[]): string | undefined {
  if (!record) {
    return undefined
  }

  for (const key of keys) {
    const value = record[key]
    if (typeof value === 'string' && value.trim()) {
      return value.trim()
    }
  }

  return undefined
}

function pickStringFromRecords(
  records: Array<Record<string, unknown> | null>,
  keys: string[]
): string | undefined {
  for (const record of records) {
    const value = pickString(record, keys)
    if (value) {
      return value
    }
  }

  return undefined
}

function pickStringArray(
  records: Array<Record<string, unknown> | null>,
  keys: string[]
): string[] | undefined {
  for (const record of records) {
    if (!record) {
      continue
    }

    for (const key of keys) {
      const value = record[key]
      if (!Array.isArray(value)) {
        continue
      }

      const items = value
        .filter((item): item is string => typeof item === 'string' && item.trim().length > 0)
        .map(item => item.trim())
      if (items.length > 0) {
        return items
      }
    }
  }

  return undefined
}

function normalizeGender(value: unknown): 'L' | 'P' | undefined {
  if (typeof value !== 'string') {
    return undefined
  }

  const normalized = value.trim().toLowerCase()
  if (
    normalized === 'l' ||
    normalized === 'male' ||
    normalized === 'm' ||
    normalized === 'pria' ||
    normalized === 'laki-laki' ||
    normalized === 'lakilaki'
  ) {
    return 'L'
  }

  if (
    normalized === 'p' ||
    normalized === 'female' ||
    normalized === 'f' ||
    normalized === 'wanita' ||
    normalized === 'perempuan'
  ) {
    return 'P'
  }

  return undefined
}

function mapCdssAlertType(type: CDSSAlert['type']): ClinicalAlert['type'] {
  return type === 'red_flag' || type === 'vital_sign' ? 'critical_value' : 'guideline'
}

function mapCdssAlertSeverity(severity: CDSSAlert['severity']): ClinicalAlert['severity'] {
  if (severity === 'emergency') {
    return 'critical'
  }

  if (severity === 'high' || severity === 'medium' || severity === 'low') {
    return 'warning'
  }

  return 'info'
}

function formatClinicalAlertMessage(alert: CDSSAlert): string {
  const title = alert.title.trim()
  const message = alert.message.trim()
  const action = alert.action?.trim()

  if (action) {
    return `${title}: ${message}. Tindak lanjut: ${action}`
  }

  return `${title}: ${message}`
}

function deriveTriageLevel(result: CDSSEngineResult): 1 | 2 | 3 | 4 | 5 | undefined {
  if (result.red_flags.some(flag => flag.severity === 'emergency')) {
    return 1
  }

  if (result.red_flags.some(flag => flag.severity === 'urgent')) {
    return 2
  }

  if (result.red_flags.some(flag => flag.severity === 'warning')) {
    return 3
  }

  if (result.alerts.some(alert => alert.severity === 'medium' || alert.severity === 'low')) {
    return 4
  }

  return undefined
}

function mapDiagnosisResultToDashboardResponse(
  result: CDSSEngineResult,
  consultId: string,
  receivedAt: string
): CDSSResponse {
  const suggestions = ghostToDashboardSuggestions(
    result.suggestions.map(suggestion => ({
      rank: suggestion.rank,
      icd_x: suggestion.icd10_code,
      nama: suggestion.diagnosis_name,
      diagnosis_name: suggestion.diagnosis_name,
      icd10_code: suggestion.icd10_code,
      confidence: suggestion.confidence,
      rationale: suggestion.reasoning,
      red_flags: suggestion.red_flags,
    })),
    result.model_version
  )

  const alerts = result.alerts.map(alert => ({
    id: alert.id,
    type: mapCdssAlertType(alert.type),
    severity: mapCdssAlertSeverity(alert.severity),
    message: formatClinicalAlertMessage(alert),
    source: 'iskandar',
    actionRequired: alert.severity !== 'info',
  }))

  return {
    requestId: `assist-${consultId}`,
    engineVersion: result.model_version,
    processedAt: receivedAt,
    latencyMs: result.processing_time_ms,
    triageLevel: deriveTriageLevel(result),
    suggestions,
    alerts,
  }
}

type ConsultDiagnosisResponseInput = {
  consultId: string
  patient: Record<string, unknown>
  ttv: unknown
  anthropometrics: unknown
  keluhanUtama: string
  keluhanTambahan: string | undefined
  chronicDiseases: string[]
  allergies: string[]
  statusKehamilan: 'hamil' | 'tidak_hamil' | 'tidak_diisi' | undefined
  screeningSummary: string | undefined
  clinicalContext: Record<string, unknown> | null
  canonicalClinical: Record<string, unknown> | null
}

async function buildConsultDiagnosisResponse(
  input: ConsultDiagnosisResponseInput
): Promise<CDSSResponse | null> {
  const age = parseNumber(input.patient.age)
  const gender = normalizeGender(input.patient.gender)

  if (age === undefined || !gender) {
    console.warn(
      `[Consult] Diagnosis engine skipped for ${input.consultId}: usia atau jenis_kelamin tidak valid.`
    )
    return null
  }

  const vitalsRecord = isRecord(input.ttv) ? input.ttv : null
  const anthropometricsRecord = isRecord(input.anthropometrics) ? input.anthropometrics : null
  const contextCandidates = [input.canonicalClinical, input.clinicalContext]
  const trajectoryObject = contextCandidates
    .map(context => {
      if (!context) {
        return undefined
      }

      const directTrajectory = context.trajectory_context
      if (directTrajectory) {
        return directTrajectory
      }

      if (isRecord(context.trajectory)) {
        return context.trajectory.raw_context ?? context.trajectory
      }

      return undefined
    })
    .find(Boolean)
  const assessmentConclusion =
    pickStringFromRecords(contextCandidates, ['assessment_conclusion', 'assessmentSummary']) ||
    input.screeningSummary ||
    input.keluhanTambahan
  const currentDrugs = pickStringArray(contextCandidates, ['current_drugs', 'medications'])

  const diagnoseRequest = parseDiagnoseRequestBody({
    keluhan_utama: input.keluhanUtama,
    keluhan_tambahan: input.keluhanTambahan,
    assessment_conclusion: assessmentConclusion,
    usia: age,
    jenis_kelamin: gender,
    vital_signs: {
      systolic: pickNumber(vitalsRecord, ['sistolik', 'systolic', 'sbp']),
      diastolic: pickNumber(vitalsRecord, ['diastolik', 'diastolic', 'dbp']),
      heart_rate: pickNumber(vitalsRecord, ['nadi', 'heart_rate', 'hr', 'pulse']),
      spo2: pickNumber(vitalsRecord, ['spo2', 'oxygen_saturation']),
      temperature: pickNumber(vitalsRecord, ['suhu', 'temperature', 'temp']),
      respiratory_rate: pickNumber(vitalsRecord, ['rr', 'respiratory_rate', 'frekuensi_napas']),
      weight_kg: pickNumber(anthropometricsRecord, ['weight_kg', 'weight', 'berat_badan']),
      height_cm: pickNumber(anthropometricsRecord, ['height_cm', 'height', 'tinggi_badan']),
      pain_score: pickNumber(vitalsRecord, ['pain_score', 'skala_nyeri']),
      avpu: pickString(vitalsRecord, ['avpu']) as VitalSigns['avpu'] | undefined,
      supplemental_o2:
        typeof vitalsRecord?.supplemental_o2 === 'boolean' ? vitalsRecord.supplemental_o2 : undefined,
      has_copd: typeof vitalsRecord?.has_copd === 'boolean' ? vitalsRecord.has_copd : undefined,
    },
    allergies: input.allergies,
    chronic_diseases: input.chronicDiseases,
    is_pregnant: input.statusKehamilan === 'hamil',
    current_drugs: currentDrugs,
    session_id: input.consultId,
    trajectory_context: trajectoryObject,
    structured_signs:
      input.canonicalClinical?.structured_signs ?? input.clinicalContext?.structured_signs,
    composite_deterioration:
      input.canonicalClinical?.composite_deterioration ??
      input.clinicalContext?.composite_deterioration,
  })

  if (!diagnoseRequest.ok) {
    console.warn(
      `[Consult] Diagnosis engine skipped for ${input.consultId}: ${diagnoseRequest.error}`
    )
    return null
  }

  try {
    const result = await runDiagnosisEngine(diagnoseRequest.input)
    return mapDiagnosisResultToDashboardResponse(result, input.consultId, new Date().toISOString())
  } catch (error) {
    console.error('[Consult] Diagnosis engine failed for consultId:', input.consultId, error)
    return null
  }
}

function mapRiskLevelToTriageLevel(
  riskLevel: 'low' | 'medium' | 'high' | 'critical' | undefined
): 1 | 2 | 3 | 4 | 5 | undefined {
  switch (riskLevel) {
    case 'critical':
      return 1
    case 'high':
      return 2
    case 'medium':
      return 3
    case 'low':
      return 4
    default:
      return undefined
  }
}

function emitIntelligenceConsultEvents(input: {
  consultId: string
  keluhanUtama: string
  receivedAt: string
  screeningResult?:
    | {
        status?: 'positive' | 'negative' | 'inconclusive'
        score?: number
        risk_level?: 'low' | 'medium' | 'high' | 'critical'
        summary?: string
      }
    | undefined
  diagnosisResponse?: CDSSResponse | null
  canonicalClinical?: Record<string, unknown> | null
}): void {
  const note =
    input.screeningResult?.summary?.trim() ||
    input.keluhanUtama.trim() ||
    'Consult baru dari Assist menunggu tindak lanjut.'
  const patientLabel = buildPatientLabel(input.consultId)

  emitEncounterUpdated({
    encounterId: input.consultId,
    status: 'waiting',
    timestamp: input.receivedAt,
    data: {
      patientLabel,
      note,
      source: 'assist-consult',
    },
  })

  const news2 = input.canonicalClinical?.news2
  const trajectory = input.canonicalClinical?.trajectory
  const news2Risk =
    news2 && typeof news2 === 'object' && !Array.isArray(news2)
      ? String((news2 as Record<string, unknown>).risk_level ?? '')
      : ''
  const diagnosisCriticalAlert = input.diagnosisResponse?.alerts.find(
    alert => alert.severity === 'critical'
  )
  const shouldEmitCriticalAlert =
    input.screeningResult?.risk_level === 'critical' ||
    news2Risk === 'high' ||
    Boolean(diagnosisCriticalAlert)

  const momentumLevel =
    trajectory && typeof trajectory === 'object' && !Array.isArray(trajectory)
      ? String((trajectory as Record<string, unknown>).overall_risk ?? '')
      : undefined
  const convergencePattern =
    trajectory && typeof trajectory === 'object' && !Array.isArray(trajectory)
      ? String((trajectory as Record<string, unknown>).deterioration_state ?? '')
      : undefined
  const immediateActions = Array.isArray(input.canonicalClinical?.immediate_actions)
    ? input.canonicalClinical.immediate_actions
    : []
  const recommendedAction =
    typeof immediateActions[0] === 'string' ? String(immediateActions[0]) : undefined
  const riskLevel = input.screeningResult?.risk_level ?? (
    news2Risk === 'high' ? 'high' : undefined
  )
  const trajectoryNarrative =
    trajectory && typeof trajectory === 'object' && !Array.isArray(trajectory)
      ? String((trajectory as Record<string, unknown>).narrative ?? '')
      : ''
  const cdssResponse =
    input.diagnosisResponse ??
    (input.screeningResult?.summary || recommendedAction || trajectoryNarrative || riskLevel
      ? {
          requestId: `assist-${input.consultId}`,
          engineVersion: 'assist-screening-v1',
          processedAt: input.receivedAt,
          latencyMs: 0,
          triageLevel: mapRiskLevelToTriageLevel(riskLevel),
          suggestions: [],
          alerts: [
            {
              id: `assist-screening-${input.consultId}`,
              type: 'guideline' as const,
              severity: shouldEmitCriticalAlert ? 'critical' as const : 'warning' as const,
              message: note,
              source: 'assist-screening',
              actionRequired: shouldEmitCriticalAlert,
            },
            ...(recommendedAction
              ? [
                  {
                    id: `assist-action-${input.consultId}`,
                    type: 'guideline' as const,
                    severity: shouldEmitCriticalAlert ? 'critical' as const : 'warning' as const,
                    message: recommendedAction,
                    source: 'assist-screening',
                    actionRequired: shouldEmitCriticalAlert,
                  },
                ]
              : []),
            ...(trajectoryNarrative
              ? [
                  {
                    id: `assist-trajectory-${input.consultId}`,
                    type: 'guideline' as const,
                    severity: 'warning' as const,
                    message: trajectoryNarrative,
                    source: 'assist-screening',
                    actionRequired: false,
                  },
                ]
              : []),
          ],
        }
      : null)

  if (cdssResponse) {
    emitCdssSuggestionReady({
      encounterId: input.consultId,
      status: 'cdss_pending',
      timestamp: input.receivedAt,
      data: {
        patientLabel,
        note,
        source: input.diagnosisResponse ? 'iskandar-engine' : 'assist-screening',
        response: cdssResponse,
      },
    })
  }

  if (!shouldEmitCriticalAlert) {
    return
  }

  emitCriticalAlert({
    encounterId: input.consultId,
    status: 'waiting',
    timestamp: input.receivedAt,
    data: {
      message:
        diagnosisCriticalAlert?.message ||
        input.screeningResult?.summary?.trim() ||
        `Assist menandai risiko kritis untuk keluhan ${input.keluhanUtama.trim()}.`,
      momentumLevel,
      convergencePattern,
      recommendedAction:
        diagnosisCriticalAlert?.message || recommendedAction,
      patientLabel,
      source: input.diagnosisResponse ? 'iskandar-engine' : 'assist-screening',
    },
  })
}

export async function OPTIONS(request: NextRequest) {
  return handleCorsPreflight(request, CORS_METHODS)
}

export async function POST(req: NextRequest) {
  if (!isCrewAuthorizedRequest(req)) {
    return jsonWithCors(req, CORS_METHODS, { ok: false, error: 'Unauthorized' }, { status: 401 })
  }

  const session = getCrewSessionFromRequest(req)

  try {
    const body = await req.json()
    const {
      patient,
      ttv,
      keluhan_utama,
      keluhan_tambahan,
      risk_factors,
      anthropometrics,
      penyakit_kronis,
      alergi,
      status_kehamilan,
      disability_type,
      obesity_confirmation,
      clinical_context,
      canonical_clinical,
      visit_history,
      target_doctor_id,
      sent_at,
    } = body

    const {
      event_id,
      screening_result,
      patient_id_token,
      screening_id,
      facility_id: assist_facility_id,
      app_version,
      assist_id,
    } = body as {
      event_id?: string
      screening_result?: {
        status?: 'positive' | 'negative' | 'inconclusive'
        score?: number
        risk_level?: 'low' | 'medium' | 'high' | 'critical'
        summary?: string
      }
      patient_id_token?: string
      screening_id?: string
      facility_id?: string
      app_version?: string
      assist_id?: string
    }

    const clinicalCtx =
      clinical_context && typeof clinical_context === 'object' && !Array.isArray(clinical_context)
        ? (clinical_context as Record<string, unknown>)
        : null
    const canonicalClinicalCtx =
      canonical_clinical &&
      typeof canonical_clinical === 'object' &&
      !Array.isArray(canonical_clinical)
        ? (canonical_clinical as Record<string, unknown>)
        : null
    const intelligenceClinicalCtx = canonicalClinicalCtx ?? clinicalCtx
    const facilityFromContext =
      typeof clinicalCtx?.facility_name === 'string' ? clinicalCtx.facility_name : undefined

    if (!patient?.name || !keluhan_utama || !target_doctor_id) {
      return jsonWithCors(
        req,
        CORS_METHODS,
        {
          ok: false,
          error: 'Field wajib tidak lengkap: patient.name, keluhan_utama, target_doctor_id',
        },
        { status: 400 }
      )
    }

    const consultId = `consult-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`
    const receivedAt = new Date().toISOString()

    const socketDelivered = emitAssistConsult({
      consultId,
      targetDoctorId: String(target_doctor_id),
      sentAt: sent_at || receivedAt,
      patient,
      ttv: ttv || {},
      keluhan_utama: String(keluhan_utama),
      keluhan_tambahan: typeof keluhan_tambahan === 'string' ? keluhan_tambahan : undefined,
      risk_factors: Array.isArray(risk_factors) ? risk_factors : [],
      anthropometrics: anthropometrics || {},
      penyakit_kronis: Array.isArray(penyakit_kronis) ? penyakit_kronis : [],
      alergi: Array.isArray(alergi) ? alergi : [],
      status_kehamilan:
        status_kehamilan === 'hamil' ||
        status_kehamilan === 'tidak_hamil' ||
        status_kehamilan === 'tidak_diisi'
          ? status_kehamilan
          : undefined,
      disability_type: typeof disability_type === 'string' ? disability_type : undefined,
      obesity_confirmation:
        obesity_confirmation === 'confirmed' || obesity_confirmation === 'not_confirmed'
          ? obesity_confirmation
          : undefined,
      clinical_context:
        clinical_context && typeof clinical_context === 'object' ? clinical_context : undefined,
      canonical_clinical:
        canonical_clinical && typeof canonical_clinical === 'object'
          ? canonical_clinical
          : undefined,
      visit_history: Array.isArray(visit_history) ? visit_history : undefined,
    })

    if (!socketDelivered) {
      console.warn(
        `[Consult] Socket delivery failed for ${consultId} → ${target_doctor_id}. Data will be available via DB fallback polling.`
      )
    }

    // Persist consult data to database — primary delivery path when socket is unavailable
    try {
      await prisma.consultLog.create({
        data: {
          consultId,
          status: 'received',
          patientName: patient.name,
          patientRm: patient.rm ?? null,
          patientAge: typeof patient.age === 'number' ? patient.age : null,
          patientGender: patient.gender ?? null,
          keluhanUtama: String(keluhan_utama),
          ttv: ttv || {},
          riskFactors: Array.isArray(risk_factors) ? risk_factors : [],
          penyakitKronis: Array.isArray(penyakit_kronis) ? penyakit_kronis : [],
          anthropometrics: anthropometrics || {},
          visitHistory: Array.isArray(visit_history) ? visit_history : undefined,
          senderUserId: session?.username ?? null,
          senderName: session?.displayName ?? null,
          targetDoctorId: String(target_doctor_id),
          sentAt: sent_at ? new Date(sent_at) : new Date(),
        },
      })
    } catch (dbErr) {
      console.error('[Consult] ConsultLog write failed:', dbErr)
    }

    if (event_id && screening_result?.status) {
      try {
        await createScreeningAuditLog({
          eventId: event_id,
          assistId: assist_id ?? consultId,
          consultId,
          patientId:
            patient_id_token ?? `pid-${patient.rm != null ? String(patient.rm) : 'unknown'}`,
          screeningId: screening_id ?? `screen-${consultId}`,
          doctorId: String(target_doctor_id),
          facilityId: assist_facility_id ?? facilityFromContext ?? 'unknown',
          screeningStatus: screening_result.status,
          riskLevel: screening_result.risk_level,
          score: typeof screening_result.score === 'number' ? screening_result.score : null,
          resultSummary: screening_result.summary,
          deliveryStatus: 'sent',
          deliveryTimestamp: sent_at ? new Date(sent_at) : new Date(),
          appVersion: app_version,
          senderUserId: session?.username ?? undefined,
          metaJson: {
            patientName: patient.name,
            patientRm: patient.rm ?? null,
            keluhanUtama: keluhan_utama,
          },
        })
      } catch (auditErr) {
        console.error('[Consult] ScreeningAuditLog write failed:', auditErr)
      }
    }

    // Write audit event for traceability
    await appendClinicalCaseAuditEvent({
      eventType: CLINICAL_CASE_AUDIT_EVENTS.CONSULT_RECEIVED,
      actorUserId: session?.username ?? null,
      actorName: session?.displayName ?? null,
      consultId,
      sourceOrigin: 'ghost-protocols',
      payload: {
        patientName: patient.name,
        patientRm: patient.rm ?? null,
        keluhanUtama: keluhan_utama,
        targetDoctorId: target_doctor_id,
        hasTtv: Boolean(ttv && Object.keys(ttv).length > 0),
        riskFactorCount: Array.isArray(risk_factors) ? risk_factors.length : 0,
        penyakitKronisCount: Array.isArray(penyakit_kronis) ? penyakit_kronis.length : 0,
        hasCanonicalClinical: Boolean(canonical_clinical && typeof canonical_clinical === 'object'),
        sentAt: sent_at,
        receivedAt,
      },
    })

    const diagnosisResponse = await buildConsultDiagnosisResponse({
      consultId,
      patient: isRecord(patient) ? patient : {},
      ttv,
      anthropometrics,
      keluhanUtama: String(keluhan_utama),
      keluhanTambahan: typeof keluhan_tambahan === 'string' ? keluhan_tambahan : undefined,
      chronicDiseases: Array.isArray(penyakit_kronis) ? penyakit_kronis : [],
      allergies: Array.isArray(alergi) ? alergi : [],
      statusKehamilan:
        status_kehamilan === 'hamil' ||
        status_kehamilan === 'tidak_hamil' ||
        status_kehamilan === 'tidak_diisi'
          ? status_kehamilan
          : undefined,
      screeningSummary: screening_result?.summary,
      clinicalContext: clinicalCtx,
      canonicalClinical: canonicalClinicalCtx,
    })

    emitIntelligenceConsultEvents({
      consultId,
      keluhanUtama: String(keluhan_utama),
      receivedAt,
      screeningResult: screening_result,
      diagnosisResponse,
      canonicalClinical: intelligenceClinicalCtx,
    })

    return jsonWithCors(req, CORS_METHODS, {
      ok: true,
      consultId,
      event_id: event_id ?? null,
    })
  } catch (err) {
    console.error('[Consult] POST error:', err)
    return jsonWithCors(req, CORS_METHODS, { ok: false, error: 'Server error' }, { status: 500 })
  }
}
