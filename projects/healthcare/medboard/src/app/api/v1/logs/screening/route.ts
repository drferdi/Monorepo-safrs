import { type NextRequest } from 'next/server'

import { queryScreeningAuditLogs } from '@/lib/audit/screening-audit-service'
import { handleCorsPreflight, jsonWithCors } from '@/lib/server/api-cors'
import { isCrewAuthorizedRequest } from '@/lib/server/crew-access-auth'

export const runtime = 'nodejs'

const CORS_METHODS = ['GET', 'OPTIONS'] as const

export async function OPTIONS(request: NextRequest) {
  return handleCorsPreflight(request, CORS_METHODS)
}

export async function GET(req: NextRequest) {
  if (!isCrewAuthorizedRequest(req)) {
    return jsonWithCors(req, CORS_METHODS, { ok: false, error: 'Unauthorized' }, { status: 401 })
  }

  try {
    const { searchParams } = new URL(req.url)

    const page = parseInt(searchParams.get('page') ?? '1', 10)
    const perPage = parseInt(searchParams.get('per_page') ?? '50', 10)
    const fromParam = searchParams.get('from')
    const toParam = searchParams.get('to')
    const from = fromParam ? new Date(fromParam) : undefined
    const to = toParam ? new Date(toParam) : undefined
    const doctorId = searchParams.get('doctor_id') ?? undefined
    const facilityId = searchParams.get('facility_id') ?? undefined
    const screeningStatus = searchParams.get('screening_status') ?? undefined
    const deliveryStatus = searchParams.get('delivery_status') ?? undefined
    const acknowledgedParam = searchParams.get('acknowledged')
    const acknowledged =
      acknowledgedParam === 'true' ? true : acknowledgedParam === 'false' ? false : undefined

    const result = await queryScreeningAuditLogs({
      page,
      perPage,
      from,
      to,
      doctorId,
      facilityId,
      screeningStatus,
      deliveryStatus,
      acknowledged,
    })

    return jsonWithCors(req, CORS_METHODS, { ok: true, ...result })
  } catch (err) {
    console.error('[GET /api/v1/logs/screening] Error:', err)
    return jsonWithCors(req, CORS_METHODS, { ok: false, error: 'Server error' }, { status: 500 })
  }
}
