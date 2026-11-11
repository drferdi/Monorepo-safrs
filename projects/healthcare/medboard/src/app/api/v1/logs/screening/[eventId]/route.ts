import { type NextRequest } from 'next/server'

import { getScreeningAuditLogByEventId } from '@/lib/audit/screening-audit-service'
import { handleCorsPreflight, jsonWithCors } from '@/lib/server/api-cors'
import { isCrewAuthorizedRequest } from '@/lib/server/crew-access-auth'

export const runtime = 'nodejs'

const CORS_METHODS = ['GET', 'OPTIONS'] as const

export async function OPTIONS(request: NextRequest) {
  return handleCorsPreflight(request, CORS_METHODS)
}

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ eventId: string }> }
) {
  if (!isCrewAuthorizedRequest(req)) {
    return jsonWithCors(req, CORS_METHODS, { ok: false, error: 'Unauthorized' }, { status: 401 })
  }

  try {
    const { eventId } = await params
    const record = await getScreeningAuditLogByEventId(eventId)

    if (!record) {
      return jsonWithCors(
        req, CORS_METHODS,
        { ok: false, error: 'Event tidak ditemukan' },
        { status: 404 }
      )
    }

    return jsonWithCors(req, CORS_METHODS, { ok: true, data: record })
  } catch (err) {
    console.error('[GET /api/v1/logs/screening/[eventId]] Error:', err)
    return jsonWithCors(req, CORS_METHODS, { ok: false, error: 'Server error' }, { status: 500 })
  }
}
