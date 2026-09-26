import { NextResponse } from 'next/server'
import {
  type BridgeEntryStatus,
  createBridgeEntry,
  getBridgeStats,
  listBridgeEntries,
} from '@/lib/emr/bridge-queue'
import { emitEMRProgress } from '@/lib/emr/socket-bridge'
import type { RMETransferPayload } from '@/lib/emr/types'
import { handleCorsPreflight, jsonWithCors } from '@/lib/server/api-cors'
import { getCrewSessionFromRequest, isCrewAuthorizedRequest } from '@/lib/server/crew-access-auth'

export const runtime = 'nodejs'

const CORS_METHODS = ['GET', 'POST', 'OPTIONS'] as const

export async function OPTIONS(request: Request) {
  return handleCorsPreflight(request, CORS_METHODS)
}

/**
 * POST /api/emr/bridge — Create a new transfer request
 * Body: { pelayananId, patientName?, payload: RMETransferPayload }
 *
 * Auth: Session cookie only (NOT automation token).
 * Design decision: Only logged-in Dashboard users create transfers.
 * Ghost Protocols extension uses GET/PATCH with token auth to poll & process.
 */
export async function POST(request: Request) {
  const session = getCrewSessionFromRequest(request)
  if (!session) {
    return jsonWithCors(request, CORS_METHODS, { ok: false, error: 'Unauthorized' }, { status: 401 })
  }

  try {
    const body = (await request.json()) as {
      pelayananId?: string
      patientName?: string
      payload?: RMETransferPayload
    }

    if (!body.pelayananId || !body.payload) {
      return jsonWithCors(
        request,
        CORS_METHODS,
        { ok: false, error: 'pelayananId dan payload wajib diisi.' },
        { status: 400 }
      )
    }

    if (!body.payload.anamnesa) {
      return jsonWithCors(
        request,
        CORS_METHODS,
        { ok: false, error: 'payload.anamnesa wajib diisi.' },
        { status: 400 }
      )
    }

    const entry = createBridgeEntry(
      session.username,
      body.pelayananId,
      body.payload,
      body.patientName
    )

    // Notify connected clients via Socket.IO
    emitEMRProgress({
      transferId: entry.id,
      step: 'init',
      status: 'running',
      message: `Transfer baru: ${body.patientName || body.pelayananId}`,
      timestamp: entry.createdAt,
    })

    return jsonWithCors(request, CORS_METHODS, {
      ok: true,
      entry: {
        id: entry.id,
        status: entry.status,
        createdAt: entry.createdAt,
        pelayananId: entry.pelayananId,
      },
    })
  } catch {
    return jsonWithCors(
      request,
      CORS_METHODS,
      { ok: false, error: 'Gagal membuat transfer request.' },
      { status: 500 }
    )
  }
}

/**
 * GET /api/emr/bridge — List queue entries (for Assist polling)
 * Query params:
 *   status=pending (default) | claimed | processing | completed | failed
 *   limit=10 (default)
 *   stats=true (include queue stats)
 */
export async function GET(request: Request) {
  const correlationId = request.headers.get('x-correlation-id') || 'no-correlation'

  if (!isCrewAuthorizedRequest(request)) {
    console.warn(JSON.stringify({ event: 'bridge-get-401', correlationId }))
    return jsonWithCors(request, CORS_METHODS, { ok: false, error: 'Unauthorized' }, { status: 401 })
  }

  try {
    const { searchParams } = new URL(request.url)
    const statusParam = searchParams.get('status') || 'pending'
    const limit = Math.min(Number(searchParams.get('limit')) || 10, 50)
    const includeStats = searchParams.get('stats') === 'true'

    const statuses = statusParam.split(',') as BridgeEntryStatus[]
    const entries = listBridgeEntries({ status: statuses, limit })

    // Strip full payload from list view — Assist claims first, then fetches detail
    const items = entries.map(e => ({
      id: e.id,
      status: e.status,
      createdAt: e.createdAt,
      createdBy: e.createdBy,
      pelayananId: e.pelayananId,
      patientName: e.patientName,
      hasAnamnesa: !!e.payload.anamnesa,
      hasDiagnosa: !!e.payload.diagnosa,
      hasResep: !!e.payload.resep,
    }))

    const response: Record<string, unknown> = {
      ok: true,
      items,
      count: items.length,
    }
    if (includeStats) {
      response.stats = getBridgeStats()
    }

    return jsonWithCors(request, CORS_METHODS, response)
  } catch {
    return jsonWithCors(
      request,
      CORS_METHODS,
      { ok: false, error: 'Gagal memuat antrian bridge.' },
      { status: 500 }
    )
  }
}
