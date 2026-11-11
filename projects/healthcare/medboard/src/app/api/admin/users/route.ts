import { NextResponse } from 'next/server'
import { getCrewSessionFromRequest, listCrewAccessUsersAll } from '@/lib/server/crew-access-auth'
import { listAllCrewProfiles } from '@/lib/server/crew-access-profile'

export const runtime = 'nodejs'

const ALLOWED_ROLES = new Set(['CEO', 'CEO_SENTRA', 'ADMINISTRATOR', 'CHIEF_EXECUTIVE_OFFICER'])

export async function GET(request: Request) {
  const session = getCrewSessionFromRequest(request)
  if (!session || !ALLOWED_ROLES.has(session.role)) {
    return NextResponse.json({ ok: false, error: 'Akses ditolak.' }, { status: 403 })
  }

  try {
    const users = await listCrewAccessUsersAll()
    const profiles = listAllCrewProfiles()

    const merged = users.map(u => {
      const profile = profiles.get(u.username)
      return {
        ...u,
        profile: profile ?? null,
      }
    })

    return NextResponse.json({ ok: true, users: merged })
  } catch {
    return NextResponse.json({ ok: false, error: 'Gagal memuat data user.' }, { status: 500 })
  }
}
