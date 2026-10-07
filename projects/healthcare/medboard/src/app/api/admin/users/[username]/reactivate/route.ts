import { NextResponse } from 'next/server'
import { canActOnUser } from '@/lib/access-level'
import {
  getCrewSessionFromRequest,
  listCrewAccessUsersAll,
  reactivateCrewAccessUser,
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
    if (!canActOnUser({ actorRole: session.role, targetRole: target?.role ?? '', action: 'reactivate' })) {
      return NextResponse.json(
        { ok: false, error: 'Hanya CEO yang bisa mengaktifkan kembali akun CEO dan Administrator.' },
        { status: 403 }
      )
    }

    await reactivateCrewAccessUser(username)
    return NextResponse.json({ ok: true })
  } catch (error) {
    const isKnownError = error instanceof Error && error.message.includes('tidak ditemukan')
    return NextResponse.json(
      {
        ok: false,
        error: isKnownError ? (error as Error).message : 'Gagal mengaktifkan user.',
      },
      { status: 400 }
    )
  }
}
