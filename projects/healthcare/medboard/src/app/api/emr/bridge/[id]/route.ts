import { NextResponse } from 'next/server'
import { claimBridgeEntry, getBridgeEntry, updateBridgeEntryStatus } from '@/lib/emr/bridge-queue'
import { emitEMRProgress } from '@/lib/emr/socket-bridge'
import type { RMETransferResult } from '@/lib/emr/types'
import { handleCorsPreflight, jsonWithCors } from '@/lib/server/api-cors'
import { isCrewAuthorizedRequest } from '@/lib/server/crew-access-auth'

export const runtime = 'nodejs'

const CORS_METHODS = ['GET', 'PATCH', 'OPTIONS'] as const

export async function OPTIONS(request: Request) {
  return handleCorsPreflight(request, CORS_METHODS)
}

/**
 * GET /api/emr/bridge/[id] — Get full entry detail (including payload)
 * Used by Assist after claiming an entry to get the full transfer payload.
 */
export async function GET(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const correlationId = request.headers.get('x-correlation-id') || 'no-correlation'

  if (!isCrewAuthorizedRequest(request)) {
    console.warn(JSON.stringify({ event: 'bridge-get-id-401', correlationId }))
    return jsonWithCors(request, CORS_METHODS, { ok: false, error: 'Unauthorized' }, { status: 401 })
  }

  const { id } = await params
  const entry = getBridgeEntry(id)
  if (!entry) {
    return jsonWithCors(request, CORS_METHODS, { ok: false, error: 'Entry tidak ditemukan.' }, { status: 404 })
  }

  return jsonWithCors(request, CORS_METHODS, { ok: true, entry })
}

/**
 * PATCH /api/emr/bridge/[id] — Update entry status
 * Used by Assist to:
 *   1. Claim an entry: { action: "claim", claimedBy: "assist-v1" }
 *   2. Mark processing: { action: "processing" }
 *   3. Report completion: { action: "complete", result: RMETransferResult }
 *   4. Report failure: { action: "fail", error: "reason" }
 */
export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const correlationId = request.headers.get('x-correlation-id') || 'no-correlation'

  if (!isCrewAuthorizedRequest(request)) {
    console.warn(JSON.stringify({ event: 'bridge-patch-401', correlationId }))
    return jsonWithCors(request, CORS_METHODS, { ok: false, error: 'Unauthorized' }, { status: 401 })
  }

  const { id } = await params

  try {
    const body = (await request.json()) as {
      action: 'claim' | 'processing' | 'complete' | 'fail'
      claimedBy?: string
      result?: RMETransferResult
      error?: string
    }

    console.log(
      JSON.stringify({
        event: 'bridge-patch',
        id,
        action: body.action,
        correlationId,
      })
    )

    if (!body.action) {
      return NextResponse.json({ ok: false, error: 'action wajib diisi.' }, { status: 400 })
    }

    let entry

    switch (body.action) {
      case 'claim': {
        entry = claimBridgeEntry(id, body.claimedBy || 'assist')
        if (!entry) {
          return jsonWithCors(
            request,
            CORS_METHODS,
            { ok: false, error: 'Entry tidak tersedia untuk diklaim.' },
            { status: 409 }
          )
        }
        emitEMRProgress({
          transferId: id,
          step: 'init',
          status: 'running',
          message: 'Diklaim oleh Assist — menunggu auto-fill',
          timestamp: entry.claimedAt!,
        })
        break
      }

      case 'processing': {
        entry = updateBridgeEntryStatus(id, 'processing')
        if (!entry) {
          return jsonWithCors(request, CORS_METHODS, { ok: false, error: 'Entry tidak ditemukan.' }, { status: 404 })
        }
        emitEMRProgress({
          transferId: id,
          step: 'anamnesa',
          status: 'running',
          message: 'Assist sedang mengisi ePuskesmas',
          timestamp: new Date().toISOString(),
        })
        break
      }

      case 'complete': {
        entry = updateBridgeEntryStatus(id, 'completed', body.result)
        if (!entry) {
          return jsonWithCors(request, CORS_METHODS, { ok: false, error: 'Entry tidak ditemukan.' }, { status: 404 })
        }
        emitEMRProgress({
          transferId: id,
          step: 'done',
          status: 'success',
          message: `Transfer selesai — ${body.result?.state || 'completed'}`,
          timestamp: entry.completedAt!,
        })
        break
      }

      case 'fail': {
        entry = updateBridgeEntryStatus(id, 'failed', body.result, body.error)
        if (!entry) {
          return jsonWithCors(request, CORS_METHODS, { ok: false, error: 'Entry tidak ditemukan.' }, { status: 404 })
        }
        emitEMRProgress({
          transferId: id,
          step: 'done',
          status: 'failed',
          message: `Transfer gagal: ${body.error || 'unknown'}`,
          timestamp: entry.completedAt!,
        })
        break
      }

      default:
        return jsonWithCors(
          request,
          CORS_METHODS,
          { ok: false, error: `Action tidak dikenal: ${body.action}` },
          { status: 400 }
        )
    }

    return jsonWithCors(request, CORS_METHODS, {
      ok: true,
      entry: {
        id: entry.id,
        status: entry.status,
        claimedAt: entry.claimedAt,
        completedAt: entry.completedAt,
      },
    })
  } catch (error) {
    console.error('[Bridge] PATCH error:', error)
    return jsonWithCors(
      request,
      CORS_METHODS,
      { ok: false, error: 'Gagal memperbarui entry.' },
      { status: 500 }
    )
  }
}
