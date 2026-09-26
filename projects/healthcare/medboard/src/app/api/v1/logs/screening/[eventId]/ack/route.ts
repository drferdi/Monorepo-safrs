import { type NextRequest } from 'next/server'

import { ackScreeningAuditLog } from '@/lib/audit/screening-audit-service'
import { handleCorsPreflight, jsonWithCors } from '@/lib/server/api-cors'
import { isCrewAuthorizedRequest } from '@/lib/server/crew-access-auth'

export const runtime = 'nodejs'

const CORS_METHODS = ['POST', 'OPTIONS'] as const

export async function OPTIONS(request: NextRequest) {
  return handleCorsPreflight(request, CORS_METHODS)
}

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ eventId: string }> }
) {
  if (!isCrewAuthorizedRequest(req)) {
    return jsonWithCors(req, CORS_METHODS, { ok: false, error: 'Unauthorized' }, { status: 401 })
  }

  const { eventId } = await params

  try {
    const body = (await req.json()) as {
      acknowledged_by?: string
      ack_timestamp?: string
      note?: string
    }

    const ackTimestamp = body.ack_timestamp ? new Date(body.ack_timestamp) : new Date()
    const ackedBy = body.acknowledged_by ?? 'unknown'

    const result = await ackScreeningAuditLog(eventId, ackedBy, ackTimestamp)

    return jsonWithCors(req, CORS_METHODS, { ok: true, ...result })
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Server error'

    if (message === `ScreeningAuditLog not found: ${eventId}`) {
      return jsonWithCors(req, CORS_METHODS, { ok: false, error: 'not_found' }, { status: 404 })
    }
    if (message.startsWith('ALREADY_ACKED:')) {
      return jsonWithCors(req, CORS_METHODS, { ok: false, error: 'already_acknowledged' }, { status: 409 })
    }

    console.error('[POST ack] Error:', err)
    return jsonWithCors(req, CORS_METHODS, { ok: false, error: 'Server error' }, { status: 500 })
  }
}
