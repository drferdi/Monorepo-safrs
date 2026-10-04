import type { CDSSResponse, IskandarSuggestion } from '@abyss/types'

import {
  emitCdssSuggestionReady,
  emitCriticalAlert,
  emitEncounterUpdated,
} from '@/lib/intelligence/socket-bridge'

import type { MiraDifferential } from './mira-differential'

const NEXT_ACTION_LABEL = { question: 'Tanyakan', exam: 'Pemeriksaan', test: 'Penunjang' } as const

/** MIRA's differential as one dashboard suggestion, labelled as MIRA output with its time. */
export function toMiraDashboardSuggestion(mira: MiraDifferential): IskandarSuggestion {
  return {
    engineVersion: 'MIRA',
    confidence: mira.items[0].confidence,
    reasoning: `Diferensial MIRA dari Assist (dihasilkan ${mira.generated_at}).`,
    supportingEvidence: [
      ...mira.next_best_actions.map(
        action => `${NEXT_ACTION_LABEL[action.kind]}: ${action.item} — ${action.reason}`
      ),
      ...mira.missing_information.map(item => `Data yang belum ada: ${item}`),
    ],
    differentialDiagnoses: mira.items.map(item => ({
      icd10Code: item.icd10,
      description: `${item.nama}${item.cannot_miss ? ' (jangan terlewat)' : ''}${
        item.rationale ? ` — ${item.rationale}` : ''
      }`,
      confidence: item.confidence,
    })),
    suggestedAt: mira.generated_at,
  }
}

function buildPatientLabel(consultId: string): string {
  return `Pasien #${consultId.slice(-6).toUpperCase()}`
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

export function emitIntelligenceConsultEvents(input: {
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
  miraDifferential?: MiraDifferential | null
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
  const miraSuggestions = input.miraDifferential
    ? [toMiraDashboardSuggestion(input.miraDifferential)]
    : []
  const source = input.diagnosisResponse
    ? 'iskandar-engine'
    : miraSuggestions.length > 0
      ? 'mira'
      : 'assist-screening'
  const cdssResponse =
    input.diagnosisResponse ??
    (miraSuggestions.length > 0 ||
    input.screeningResult?.summary ||
    recommendedAction ||
    trajectoryNarrative ||
    riskLevel
      ? {
          requestId: `assist-${input.consultId}`,
          engineVersion: miraSuggestions.length > 0 ? 'MIRA' : 'assist-screening-v1',
          processedAt: input.receivedAt,
          latencyMs: 0,
          triageLevel: mapRiskLevelToTriageLevel(riskLevel),
          suggestions: miraSuggestions,
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
        source,
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
      recommendedAction:
        diagnosisCriticalAlert?.message || recommendedAction,
      patientLabel,
      source,
    },
  })
}
