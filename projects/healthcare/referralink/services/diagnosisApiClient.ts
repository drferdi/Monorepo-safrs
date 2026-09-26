/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Thin browser client for the validated server-side diagnosis endpoint.
 */

import { DIAGNOSIS_SCHEMA_VERSION, type ICD10Result, type MedicalQuery } from '../types'

import type { AuditFailureCode } from './logbookTypes'

export type AIModelKey = 'OPENAI_GPT_56_LUNA'

interface ServerError {
  code?: string
  message?: string
}

interface ServerResponse {
  success: boolean
  data?: ICD10Result
  error?: ServerError | string
  metadata?: {
    model?: string
    latencyMs: number
    timestamp: number
    schemaVersion?: number
  }
}

function getAuditFailureCode(error: unknown, status: number): AuditFailureCode {
  const code =
    error && typeof error === 'object' && 'code' in error ? (error as ServerError).code : undefined
  if (code === 'DIAGNOSIS_TIMEOUT' || status === 504) return 'timeout'
  if (code === 'DIAGNOSIS_RATE_LIMITED' || status === 429) return 'rate-limited'
  if (code === 'INVALID_DIAGNOSIS_OUTPUT') return 'invalid-output'
  if (code === 'DIAGNOSIS_UNAVAILABLE' || status === 503 || status >= 500) {
    return 'service-unavailable'
  }
  return 'unknown'
}

const DIAGNOSIS_ENDPOINT = '/api/diagnosis'

function isCurrentResult(value: unknown): value is ICD10Result {
  return Boolean(
    value &&
    typeof value === 'object' &&
    'schema_version' in value &&
    value.schema_version === DIAGNOSIS_SCHEMA_VERSION
  )
}

async function callServerDiagnosis(query: string) {
  try {
    const response = await fetch(DIAGNOSIS_ENDPOINT, {
      method: 'POST',
      credentials: 'include',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ query }),
    })
    const payload = (await response.json().catch(() => ({}))) as ServerResponse

    if (!response.ok || !payload.success) {
      const stableState =
        response.status === 401
          ? ['[MEDLINK] Sesi sandbox berakhir', '[Tindakan] Masuk kembali untuk melanjutkan']
          : response.status === 403
            ? ['[MEDLINK] Akses sandbox ditolak', '[Tindakan] Muat ulang dari origin MEDLINK resmi']
            : response.status === 429
              ? ['[MEDLINK] Batas permintaan tercapai', '[Tindakan] Tunggu sejenak lalu coba lagi']
              : response.status === 503
                ? ['[MEDLINK] Layanan sandbox belum tersedia', '[Tindakan] Coba lagi beberapa saat']
                : ['[MEDLINK] Analisis tidak tersedia', '[Tindakan] Tinjau input lalu coba lagi']
      return {
        json: null,
        model: 'Error',
        failureCode: getAuditFailureCode(payload.error, response.status),
        logs: stableState,
      }
    }

    if (!payload.metadata || !isCurrentResult(payload.data)) {
      return {
        json: null,
        model: 'Error',
        failureCode: 'invalid-output' as const,
        logs: ['[MEDLINK] Respons diagnosis tidak valid', '[Tindakan] Coba lagi analisis'],
      }
    }

    return {
      json: payload.data,
      model: payload.metadata.model,
      logs: [
        '[CDSS] Validated analysis complete',
        `[Model] ${payload.metadata.model || 'Approved provider'}`,
        `[Latency] ${payload.metadata.latencyMs}ms`,
        `[Schema] v${payload.data.schema_version}`,
        '[Status] Ready for clinician review',
      ],
    }
  } catch {
    console.error('[DiagnosisClient] Diagnosis request failed')
    return {
      json: null,
      model: 'Error',
      failureCode: 'network' as const,
      logs: ['[MEDLINK] Koneksi layanan terputus', '[Tindakan] Periksa koneksi lalu coba lagi'],
    }
  }
}

export async function searchICD10Code(
  input: MedicalQuery,
  _modelOverride?: AIModelKey
): Promise<{
  json: ICD10Result | null
  logs: string[]
  sources?: unknown[]
  model?: string
  failureCode?: AuditFailureCode
}> {
  return callServerDiagnosis(input.query)
}

export const searchICD10CodeRace = searchICD10Code
