import { NextResponse } from 'next/server'
import { getCrewSessionFromRequest } from '@/lib/server/crew-access-auth'
import { getActiveDevUpdates } from '@/lib/server/dev-updates'

export const runtime = 'nodejs'

export async function GET(request: Request) {
  const session = getCrewSessionFromRequest(request)
  if (!session) {
    return NextResponse.json({ ok: false, error: 'Akses ditolak.' }, { status: 403 })
  }

  try {
    const updates = getActiveDevUpdates()
    return NextResponse.json({ ok: true, updates })
  } catch (error) {
    console.error('[DEV-UPDATES] Get active error:', error)
    return NextResponse.json(
      { ok: false, error: 'Gagal memuat update dev aktif.' },
      { status: 500 }
    )
  }
}
