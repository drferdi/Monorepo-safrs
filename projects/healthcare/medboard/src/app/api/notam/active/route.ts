import { NextResponse } from 'next/server'
import { getCrewSessionFromRequest } from '@/lib/server/crew-access-auth'
import { getActiveNotams } from '@/lib/server/notam'

export const runtime = 'nodejs'

export async function GET(request: Request) {
  const session = getCrewSessionFromRequest(request)
  if (!session) {
    return NextResponse.json({ ok: false, error: 'Akses ditolak.' }, { status: 403 })
  }

  try {
    const notams = getActiveNotams()
    return NextResponse.json({ ok: true, notams })
  } catch (error) {
    console.error('[NOTAM] Get active error:', error)
    return NextResponse.json({ ok: false, error: 'Gagal memuat NOTAM aktif.' }, { status: 500 })
  }
}
