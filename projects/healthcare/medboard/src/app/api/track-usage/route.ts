import { NextResponse } from 'next/server'
import { getCrewSessionFromRequest } from '@/lib/server/crew-access-auth'
import { trackDashboardUsage, trackEMRClinicalUsage } from '@/lib/server/usage-tracker'

export const runtime = 'nodejs'

export async function POST(request: Request) {
  const session = getCrewSessionFromRequest(request)
  if (!session) {
    return NextResponse.json({ ok: false, error: 'Unauthorized' }, { status: 401 })
  }

  try {
    const body = (await request.json()) as { type: 'dashboard' | 'emr-clinical' }

    if (body.type === 'dashboard') {
      trackDashboardUsage(session.username)
    } else if (body.type === 'emr-clinical') {
      trackEMRClinicalUsage(session.username)
    }

    return NextResponse.json({ ok: true })
  } catch {
    return NextResponse.json({ ok: false, error: 'Invalid request' }, { status: 400 })
  }
}
