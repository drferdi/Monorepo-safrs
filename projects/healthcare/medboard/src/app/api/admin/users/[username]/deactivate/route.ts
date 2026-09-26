import { NextResponse } from 'next/server'
import {
  deactivateCrewAccessUser,
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

    if (username === session.username) {
      return NextResponse.json(
        { ok: false, error: 'Tidak dapat menonaktifkan akun sendiri.' },
        { status: 400 }
      )
    }

    // Only CEO can deactivate CEO accounts
    const isCeoRole = (r: string | null | undefined) => r === 'CEO' || r === 'CEO_SENTRA'
    const users = await listCrewAccessUsersAll()
    const target = users.find(u => u.username === username)
    if (isCeoRole(target?.role) && !isCeoRole(session.role)) {
      return NextResponse.json(
        { ok: false, error: 'Tidak bisa menonaktifkan akun CEO.' },
        { status: 403 }
      )
    }

    await deactivateCrewAccessUser(username, session.username)
    return NextResponse.json({ ok: true })
  } catch (error) {
    const isKnownError = error instanceof Error && error.message.includes('tidak ditemukan')
    return NextResponse.json(
      {
        ok: false,
        error: isKnownError ? (error as Error).message : 'Gagal menonaktifkan user.',
      },
      { status: 400 }
    )
  }
}
