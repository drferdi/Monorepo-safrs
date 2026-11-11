import { NextResponse } from 'next/server'
import { getCrewSessionFromRequest } from '@/lib/server/crew-access-auth'

export const runtime = 'nodejs'

export async function GET(request: Request) {
  const session = getCrewSessionFromRequest(request)
  if (!session) {
    return NextResponse.json({ ok: false, error: 'Unauthorized' }, { status: 401 })
  }

  return NextResponse.json({
    ok: true,
    user: {
      username: session.username,
      displayName: session.displayName,
      email: session.email,
      institution: session.institution,
      profession: session.profession,
      role: session.role,
    },
    expiresAt: session.expiresAt,
  })
}
