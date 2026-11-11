import { NextResponse } from 'next/server'
import { broadcastNotamDeactivated } from '@/lib/notam/socket-bridge'
import { getCrewSessionFromRequest } from '@/lib/server/crew-access-auth'
import { deactivateNotam } from '@/lib/server/notam'

export const runtime = 'nodejs'

const ALLOWED_ROLES = new Set(['CEO', 'CEO_SENTRA', 'ADMINISTRATOR', 'CHIEF_EXECUTIVE_OFFICER'])

export async function DELETE(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = getCrewSessionFromRequest(request)
  if (!session || !ALLOWED_ROLES.has(session.role)) {
    return NextResponse.json({ ok: false, error: 'Akses ditolak.' }, { status: 403 })
  }

  try {
    const { id } = await params
    const success = await deactivateNotam(id)

    if (!success) {
      return NextResponse.json({ ok: false, error: 'NOTAM tidak ditemukan.' }, { status: 404 })
    }

    broadcastNotamDeactivated(id)

    return NextResponse.json({
      ok: true,
      message: 'NOTAM berhasil dinonaktifkan.',
    })
  } catch (error) {
    console.error('[NOTAM] Deactivate error:', error)
    return NextResponse.json(
      {
        ok: false,
        error: error instanceof Error ? error.message : 'Gagal menonaktifkan NOTAM.',
      },
      { status: 500 }
    )
  }
}
