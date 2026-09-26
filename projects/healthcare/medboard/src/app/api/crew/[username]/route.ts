import { NextResponse } from 'next/server'
import { getCrewSessionFromRequest, listCrewAccessUsersAll } from '@/lib/server/crew-access-auth'
import { listAllCrewProfiles } from '@/lib/server/crew-access-profile'

export const runtime = 'nodejs'

/**
 * @summary Ambil Profil Crew (ACARS)
 * @description Mengambil profil anggota crew melalui Crew Access Portal untuk keperluan roster atau pesan instan (ACARS).
 * Memerlukan sesi crew yang valid.
 */
export async function GET(request: Request, { params }: { params: Promise<{ username: string }> }) {
  const session = getCrewSessionFromRequest(request)
  if (!session) {
    return NextResponse.json({ ok: false, error: 'Unauthorized' }, { status: 401 })
  }

  try {
    const { username } = await params
    const normalized = username?.trim().toLowerCase()
    if (!normalized) {
      return NextResponse.json({ ok: false, error: 'Username tidak valid.' }, { status: 400 })
    }

    const users = await listCrewAccessUsersAll()
    const user = users.find(u => u.username.toLowerCase() === normalized)
    if (!user || (user as { status?: string }).status === 'INACTIVE') {
      return NextResponse.json({ ok: false, error: 'Crew tidak ditemukan.' }, { status: 404 })
    }

    const profiles = listAllCrewProfiles()
    const profile = profiles.get(user.username)

    return NextResponse.json({
      ok: true,
      crew: {
        username: user.username,
        displayName: user.displayName,
        fullName: profile?.fullName || user.displayName,
        profession: user.profession,
        role: user.role,
        institution: user.institution,
      },
    })
  } catch {
    return NextResponse.json({ ok: false, error: 'Gagal memuat data crew.' }, { status: 500 })
  }
}
