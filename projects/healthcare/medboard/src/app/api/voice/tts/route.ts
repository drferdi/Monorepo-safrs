import { NextResponse } from 'next/server'
import { getCrewSessionFromRequest, isCrewAuthorizedRequest } from '@/lib/server/crew-access-auth'
import { getRequestIp, writeSecurityAuditLog } from '@/lib/server/security-audit'

export const runtime = 'nodejs'

export async function POST(request: Request) {
  const ip = getRequestIp(request)
  const session = getCrewSessionFromRequest(request)

  if (!isCrewAuthorizedRequest(request)) {
    await writeSecurityAuditLog({
      endpoint: '/api/voice/tts',
      action: 'VOICE_TTS',
      result: 'unauthenticated',
      userId: session?.username ?? null,
      role: session?.role ?? null,
      ip,
    })
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }
  // TODO(security): selaraskan role minimum endpoint ini dengan matriks RBAC produksi.
  await writeSecurityAuditLog({
    endpoint: '/api/voice/tts',
    action: 'VOICE_TTS',
    result: 'forbidden',
    userId: session?.username ?? null,
    role: session?.role ?? null,
    ip,
    metadata: { reason: 'voice_tts_disabled_google_exit' },
  })
  return NextResponse.json(
    { error: 'Voice TTS sementara dinonaktifkan selama exit Google total.' },
    { status: 503 }
  )
}
