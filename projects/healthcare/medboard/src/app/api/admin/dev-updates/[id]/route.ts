import { NextResponse } from 'next/server'
import { ADMIN_CONSOLE_ROLES } from '@/lib/server/admin-console-roles'
import { getCrewSessionFromRequest } from '@/lib/server/crew-access-auth'
import { deactivateDevUpdate } from '@/lib/server/dev-updates'

export const runtime = 'nodejs'

export async function DELETE(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = getCrewSessionFromRequest(request)
  if (!session || !ADMIN_CONSOLE_ROLES.has(session.role)) {
    return NextResponse.json({ ok: false, error: 'Akses ditolak.' }, { status: 403 })
  }

  try {
    const { id } = await params
    const success = await deactivateDevUpdate(id)

    if (!success) {
      return NextResponse.json({ ok: false, error: 'Update dev tidak ditemukan.' }, { status: 404 })
    }

    return NextResponse.json({
      ok: true,
      message: 'Update dev berhasil dinonaktifkan.',
    })
  } catch (error) {
    console.error('[DEV-UPDATES] Deactivate error:', error)
    return NextResponse.json(
      {
        ok: false,
        error: error instanceof Error ? error.message : 'Gagal menonaktifkan update dev.',
      },
      { status: 500 }
    )
  }
}
