import { NextResponse } from 'next/server'
import { canActOnUser, findAdminTarget } from '@/lib/access-level'
import {
  deleteCrewAccessUser,
  getCrewSessionFromRequest,
  listCrewAccessUsersAll,
} from '@/lib/server/crew-access-auth'

export const runtime = 'nodejs'

const ALLOWED_ROLES = new Set(['CEO', 'CEO_SENTRA', 'ADMINISTRATOR', 'CHIEF_EXECUTIVE_OFFICER'])

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ username: string }> }
) {
  const session = getCrewSessionFromRequest(request)
  if (!session || !ALLOWED_ROLES.has(session.role)) {
    return NextResponse.json({ ok: false, error: 'Akses ditolak.' }, { status: 403 })
  }

  try {
    const { username } = await params

    // Only the CEO deletes accounts (Chief 2026-10-07)
    const users = await listCrewAccessUsersAll()
    const target = findAdminTarget(users, username)
    if (!target) {
      return NextResponse.json({ ok: false, error: 'User tidak ditemukan.' }, { status: 404 })
    }
    if (target.username === session.username) {
      return NextResponse.json(
        { ok: false, error: 'Tidak dapat menghapus akun sendiri.' },
        { status: 400 }
      )
    }
    if (!canActOnUser({ actorRole: session.role, targetRole: target.role, action: 'delete' })) {
      return NextResponse.json(
        { ok: false, error: 'Hanya CEO yang bisa menghapus akun.' },
        { status: 403 }
      )
    }

    await deleteCrewAccessUser(target.username)
    return NextResponse.json({ ok: true })
  } catch (error) {
    const isKnownError = error instanceof Error && error.message.includes('tidak ditemukan')
    return NextResponse.json(
      {
        ok: false,
        error: isKnownError ? (error as Error).message : 'Gagal menghapus user.',
      },
      { status: 400 }
    )
  }
}
