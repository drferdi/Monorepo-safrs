// Drferdi — vision, brought to life.
import { NextResponse } from 'next/server'

import { getCrewSessionFromRequest } from '@/lib/server/crew-access-auth'

export const runtime = 'nodejs'

// One active minute for the clinical rank's hours. The user comes from the session cookie only:
// the automation token carries no user, so it cannot earn hours.
export async function POST(request: Request) {
  const session = getCrewSessionFromRequest(request)
  if (!session) {
    return NextResponse.json({ ok: false, error: 'Unauthorized' }, { status: 401 })
  }
  if (!process.env.DATABASE_URL?.trim()) return new NextResponse(null, { status: 204 })

  const { recordActivityBeat } = await import('@/lib/server/crew-activity-store')
  await recordActivityBeat(session.username, new Date())
  return new NextResponse(null, { status: 204 })
}
