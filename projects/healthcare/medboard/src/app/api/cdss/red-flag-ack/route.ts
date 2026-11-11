import { NextResponse } from 'next/server'
import { writeCDSSAuditEntry } from '@/lib/cdss/workflow'
import { getCrewSessionFromRequest, isCrewAuthorizedRequest } from '@/lib/server/crew-access-auth'
import { getRequestIp, writeSecurityAuditLog } from '@/lib/server/security-audit'

export const runtime = 'nodejs'

type Body = {
  session_id?: string
  red_flags?: string[]
}

export async function POST(request: Request) {
  const ip = getRequestIp(request)
  const session = getCrewSessionFromRequest(request)

  if (!isCrewAuthorizedRequest(request)) {
    await writeSecurityAuditLog({
      endpoint: '/api/cdss/red-flag-ack',
      action: 'CDSS_RED_FLAG_ACK',
      result: 'unauthenticated',
      userId: session?.username ?? null,
      role: session?.role ?? null,
      ip,
    })
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  let body: Body
  try {
    body = (await request.json()) as Body
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 })
  }

  const redFlags = Array.isArray(body.red_flags)
    ? body.red_flags.map(flag => flag.trim()).filter(Boolean)
    : []

  if (redFlags.length === 0) {
    return NextResponse.json({ error: 'red_flags is required' }, { status: 400 })
  }

  await writeCDSSAuditEntry({
    sessionId: body.session_id,
    action: 'RED_FLAG_ACK',
    validationStatus: 'acknowledged',
    outputSummary: {
      redFlagCount: redFlags.length,
    },
    metadata: {
      redFlags,
      userId: session?.username ?? null,
      role: session?.role ?? null,
      ip,
    },
  })

  await writeSecurityAuditLog({
    endpoint: '/api/cdss/red-flag-ack',
    action: 'CDSS_RED_FLAG_ACK',
    result: 'success',
    userId: session?.username ?? null,
    role: session?.role ?? null,
    ip,
    metadata: {
      redFlags,
    },
  })

  return NextResponse.json({ ok: true, acknowledged: redFlags.length })
}
