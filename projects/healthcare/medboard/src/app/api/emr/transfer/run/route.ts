import 'server-only'

import { type NextRequest, NextResponse } from 'next/server'
import { getEMRCredentials, getEmrTransferConfig } from '@/lib/emr/config'
import { runEMRTransfer } from '@/lib/emr/engine'
import type { RMETransferPayload } from '@/lib/emr/types'
import { handleCorsPreflight, jsonWithCors } from '@/lib/server/api-cors'
import { isCrewAuthorizedRequest } from '@/lib/server/crew-access-auth'

// In-memory transfer status (reset on server restart)
const activeTransfers = new Map<string, { status: 'running' | 'done' | 'error'; message: string }>()
export function getTransferStatus(id: string) {
  return activeTransfers.get(id)
}

const CORS_METHODS = ['POST', 'OPTIONS'] as const

export async function OPTIONS(request: NextRequest) {
  return handleCorsPreflight(request, CORS_METHODS)
}

/**
 * EMR Data Lifecycle (Bridge to ePuskesmas)
 * @summary Execute EMR data transfer
 * @description Initiates the automation bridge to transfer patient clinical records to the external ePuskesmas system.
 * 
 * @bodyParam {object} payload - The complete RME data object including anamnesa and vitals.
 * @bodyParam {string} pelayananId - Internal ID for the clinical service record.
 * 
 * @example {
 *   "pelayananId": "srv-12345",
 *   "payload": {
 *     "anamnesa": {
 *       "keluhanUtama": "Batuk berdahak 1 minggu",
 *       "riwayatPenyakit": "Tidak ada"
 *     },
 *     "pemeriksaanFisik": {
 *       "tensi": "120/80",
 *       "nadi": "80"
 *     }
 *   }
 * }
 * 
 * @responseBody {object} - Returns 'transferId' and initial 'status'.
 */
export async function POST(req: NextRequest) {
  if (!isCrewAuthorizedRequest(req)) {
    return jsonWithCors(req, CORS_METHODS, { error: 'Unauthorized' }, { status: 401 })
  }

  let body: { payload?: RMETransferPayload; pelayananId?: string }
  try {
    body = await req.json()
  } catch {
    return jsonWithCors(req, CORS_METHODS, { error: 'Invalid JSON' }, { status: 400 })
  }

  const { payload, pelayananId } = body
  if (!payload || !payload.anamnesa) {
    return jsonWithCors(req, CORS_METHODS, { error: 'payload.anamnesa wajib diisi' }, { status: 400 })
  }

  const config = getEmrTransferConfig()
  const credentials = getEMRCredentials()

  if (!credentials.username || !credentials.password) {
    return jsonWithCors(
      req,
      CORS_METHODS,
      { error: 'EMR_USERNAME dan EMR_PASSWORD belum dikonfigurasi' },
      { status: 503 }
    )
  }

  const transferId = `emr-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`
  payload.options = { ...payload.options, requestId: transferId }

  // Run in background — return transferId immediately
  activeTransfers.set(transferId, {
    status: 'running',
    message: 'Transfer dimulai',
  })

  runEMRTransfer(payload, config, { pelayananId, headless: config.headless })
    .then(result => {
      activeTransfers.set(transferId, {
        status: result.state === 'failed' ? 'error' : 'done',
        message: `Transfer selesai: ${result.state}`,
      })
    })
    .catch((err: unknown) => {
      activeTransfers.set(transferId, {
        status: 'error',
        message: `Transfer error: ${err instanceof Error ? err.message : String(err)}`,
      })
    })

  return jsonWithCors(req, CORS_METHODS, { transferId, status: 'running' })
}
