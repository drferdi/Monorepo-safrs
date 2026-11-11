import { NextResponse } from 'next/server'
import { getCrewSessionFromRequest, isCrewAuthorizedRequest } from '@/lib/server/crew-access-auth'
import { getRequestIp, writeSecurityAuditLog } from '@/lib/server/security-audit'

export const runtime = 'nodejs'

export async function POST(request: Request) {
  const ip = getRequestIp(request)
  const session = getCrewSessionFromRequest(request)

  if (!isCrewAuthorizedRequest(request)) {
    await writeSecurityAuditLog({
      endpoint: '/api/voice/token',
      action: 'VOICE_TOKEN_REQUEST',
      result: 'unauthenticated',
      userId: session?.username ?? null,
      role: session?.role ?? null,
      ip,
    })
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  await writeSecurityAuditLog({
    endpoint: '/api/voice/token',
    action: 'VOICE_TOKEN_REQUEST',
    result: 'failure',
    userId: session?.username ?? null,
    role: session?.role ?? null,
    ip,
    metadata: { reason: 'voice_disabled_google_exit' },
  })

  return NextResponse.json(
    { error: 'Voice token sementara dinonaktifkan selama exit Google total.' },
    { status: 503 },
  )
}
