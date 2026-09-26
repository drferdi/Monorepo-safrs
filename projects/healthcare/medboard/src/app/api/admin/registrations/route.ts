import { NextResponse } from 'next/server'
import { getCrewSessionFromRequest } from '@/lib/server/crew-access-auth'
import { listPendingRegistrations } from '@/lib/server/crew-access-registration'

export const runtime = 'nodejs'

const ALLOWED_ROLES = new Set(['CEO', 'CEO_SENTRA', 'ADMINISTRATOR', 'CHIEF_EXECUTIVE_OFFICER'])

export async function GET(request: Request) {
  const session = getCrewSessionFromRequest(request)
  if (!session || !ALLOWED_ROLES.has(session.role)) {
    return NextResponse.json({ ok: false, error: 'Akses ditolak.' }, { status: 403 })
  }

  try {
    const pending = listPendingRegistrations()
    return NextResponse.json({ ok: true, pending })
  } catch {
    return NextResponse.json(
      { ok: false, error: 'Gagal memuat data pendaftaran.' },
      { status: 500 }
    )
  }
}
