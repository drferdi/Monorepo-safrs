import { NextResponse } from 'next/server'
import { getCDSSQualityMetrics } from '@/lib/cdss/workflow'
import { getCrewSessionFromRequest, isCrewAuthorizedRequest } from '@/lib/server/crew-access-auth'
import { getRequestIp, writeSecurityAuditLog } from '@/lib/server/security-audit'

export const runtime = 'nodejs'

export async function GET(request: Request) {
  const ip = getRequestIp(request)
  const session = getCrewSessionFromRequest(request)

  if (!isCrewAuthorizedRequest(request)) {
    await writeSecurityAuditLog({
      endpoint: '/api/cdss/quality-dashboard',
      action: 'CDSS_QUALITY_DASHBOARD',
      result: 'unauthenticated',
      userId: session?.username ?? null,
      role: session?.role ?? null,
      ip,
    })
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const url = new URL(request.url)
  const days = Number(url.searchParams.get('days') ?? '14')
  const safeDays = Number.isFinite(days) && days > 0 ? Math.min(days, 90) : 14

  const metrics = await getCDSSQualityMetrics(safeDays)

  await writeSecurityAuditLog({
    endpoint: '/api/cdss/quality-dashboard',
    action: 'CDSS_QUALITY_DASHBOARD',
    result: 'success',
    userId: session?.username ?? null,
    role: session?.role ?? null,
    ip,
    metadata: {
      days: safeDays,
    },
  })

  return NextResponse.json({ metrics })
}
