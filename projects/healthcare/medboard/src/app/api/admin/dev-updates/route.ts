import { NextResponse } from 'next/server'
import { ADMIN_CONSOLE_ROLES } from '@/lib/server/admin-console-roles'
import { getCrewSessionFromRequest } from '@/lib/server/crew-access-auth'
import { createDevUpdate, listAllDevUpdates } from '@/lib/server/dev-updates'

export const runtime = 'nodejs'

export async function GET(request: Request) {
  const session = getCrewSessionFromRequest(request)
  if (!session || !ADMIN_CONSOLE_ROLES.has(session.role)) {
    return NextResponse.json({ ok: false, error: 'Akses ditolak.' }, { status: 403 })
  }

  try {
    const updates = listAllDevUpdates()
    return NextResponse.json({ ok: true, updates })
  } catch (error) {
    console.error('[DEV-UPDATES] List all error:', error)
    return NextResponse.json({ ok: false, error: 'Gagal memuat data update dev.' }, { status: 500 })
  }
}

export async function POST(request: Request) {
  const session = getCrewSessionFromRequest(request)
  if (!session || !ADMIN_CONSOLE_ROLES.has(session.role)) {
    return NextResponse.json({ ok: false, error: 'Akses ditolak.' }, { status: 403 })
  }

  try {
    const body: unknown = await request.json()
    const update = await createDevUpdate(body, {
      username: session.username,
      displayName: session.displayName,
    })

    return NextResponse.json({
      ok: true,
      update,
      message: 'Update dev berhasil dibuat.',
    })
  } catch (error) {
    console.error('[DEV-UPDATES] Create error:', error)
    const message = error instanceof Error ? error.message : 'Gagal membuat update dev.'
    const isValidationError =
      error instanceof Error &&
      ['tidak valid', 'harus', 'masa mendatang'].some(fragment => error.message.includes(fragment))

    return NextResponse.json(
      { ok: false, error: message },
      { status: isValidationError ? 400 : 500 }
    )
  }
}
