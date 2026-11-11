import { NextResponse } from 'next/server'
import { getCrewSessionFromRequest, listCrewAccessUsersAll } from '@/lib/server/crew-access-auth'
import { adminUpdateCrewProfile, getCrewProfileErrorStatus } from '@/lib/server/crew-access-profile'

export const runtime = 'nodejs'

const ALLOWED_ROLES = new Set(['CEO', 'CEO_SENTRA', 'ADMINISTRATOR', 'CHIEF_EXECUTIVE_OFFICER'])

export async function PUT(request: Request, { params }: { params: Promise<{ username: string }> }) {
  const session = getCrewSessionFromRequest(request)
  if (!session || !ALLOWED_ROLES.has(session.role)) {
    return NextResponse.json({ ok: false, error: 'Akses ditolak.' }, { status: 403 })
  }

  try {
    const { username } = await params
    const users = await listCrewAccessUsersAll()
    const targetUser = users.find(u => u.username === username)
    if (!targetUser) {
      return NextResponse.json({ ok: false, error: 'User tidak ditemukan.' }, { status: 404 })
    }

    const body = await request.json()
    const profile = await adminUpdateCrewProfile(username, targetUser.profession ?? '', body)
    return NextResponse.json({ ok: true, profile })
  } catch (error) {
    const status = getCrewProfileErrorStatus(error)
    const msg = error instanceof Error ? error.message : 'Gagal mengubah profil.'
    return NextResponse.json({ ok: false, error: msg }, { status })
  }
}
