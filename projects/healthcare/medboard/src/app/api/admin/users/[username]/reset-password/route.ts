// Drferdi — vision, brought to life.
import { NextResponse } from 'next/server'
import { canActOnUser } from '@/lib/access-level'
import {
  adminResetPassword,
  getCrewSessionFromRequest,
  listCrewAccessUsersAll,
} from '@/lib/server/crew-access-auth'

export const runtime = 'nodejs'

const ALLOWED_ROLES = new Set(['CEO', 'CEO_SENTRA', 'ADMINISTRATOR', 'CHIEF_EXECUTIVE_OFFICER'])

export async function POST(
  request: Request,
  { params }: { params: Promise<{ username: string }> }
) {
  const session = getCrewSessionFromRequest(request)
  if (!session || !ALLOWED_ROLES.has(session.role)) {
    return NextResponse.json({ ok: false, error: 'Akses ditolak.' }, { status: 403 })
  }

  try {
    const { username } = await params

    // Only the CEO touches CEO or Administrator accounts (Chief 2026-10-07)
    const users = await listCrewAccessUsersAll()
    const target = users.find(u => u.username === username)
    if (!canActOnUser({ actorRole: session.role, targetRole: target?.role ?? '', action: 'reset-password' })) {
      return NextResponse.json(
        { ok: false, error: 'Hanya CEO yang bisa reset password CEO dan Administrator.' },
        { status: 403 }
      )
    }

    const body = (await request.json()) as { newPassword?: string }

    if (!body.newPassword || body.newPassword.length < 8) {
      return NextResponse.json(
        { ok: false, error: 'Password baru minimal 8 karakter.' },
        { status: 400 }
      )
    }

    await adminResetPassword(username, body.newPassword)
    return NextResponse.json({ ok: true })
  } catch (error) {
    const isKnownError =
      error instanceof Error &&
      (error.message.includes('tidak ditemukan') || error.message.includes('minimal'))
    return NextResponse.json(
      {
        ok: false,
        error: isKnownError ? (error as Error).message : 'Gagal mereset password.',
      },
      { status: 400 }
    )
  }
}
