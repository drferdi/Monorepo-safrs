import { NextResponse } from 'next/server'
import { getCrewSessionFromRequest } from '@/lib/server/crew-access-auth'
import {
  getCrewProfile,
  getCrewProfileErrorStatus,
  updateCrewProfile,
} from '@/lib/server/crew-access-profile'

export const runtime = 'nodejs'

export async function GET(request: Request) {
  const session = getCrewSessionFromRequest(request)
  if (!session) {
    return NextResponse.json({ ok: false, error: 'Unauthorized' }, { status: 401 })
  }

  try {
    const profile = await getCrewProfile(session)
    return NextResponse.json({
      ok: true,
      profile,
      user: {
        username: session.username,
        displayName: session.displayName,
        email: session.email,
        institution: session.institution,
        profession: session.profession,
        role: session.role,
      },
    })
  } catch (error) {
    const status = getCrewProfileErrorStatus(error)
    return NextResponse.json(
      {
        ok: false,
        error: error instanceof Error ? error.message : 'Profil user gagal dimuat.',
      },
      { status }
    )
  }
}

export async function PUT(request: Request) {
  const session = getCrewSessionFromRequest(request)
  if (!session) {
    return NextResponse.json({ ok: false, error: 'Unauthorized' }, { status: 401 })
  }

  try {
    const payload = await request.json()
    const profile = await updateCrewProfile(session, payload)
    return NextResponse.json({ ok: true, profile })
  } catch (error) {
    const status = getCrewProfileErrorStatus(error)
    return NextResponse.json(
      {
        ok: false,
        error: error instanceof Error ? error.message : 'Profil gagal diperbarui.',
      },
      { status }
    )
  }
}
