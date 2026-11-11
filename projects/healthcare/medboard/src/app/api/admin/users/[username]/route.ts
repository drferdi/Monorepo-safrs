import { NextResponse } from 'next/server'
import { canActOnUser } from '@/lib/access-level'
import {
  getCrewSessionFromRequest,
  listCrewAccessUsersAll,
  updateCrewAccessUser,
} from '@/lib/server/crew-access-auth'
import { listAllCrewProfiles } from '@/lib/server/crew-access-profile'

export const runtime = 'nodejs'

const ALLOWED_ROLES = new Set(['CEO', 'CEO_SENTRA', 'ADMINISTRATOR', 'CHIEF_EXECUTIVE_OFFICER'])

export async function GET(request: Request, { params }: { params: Promise<{ username: string }> }) {
  const session = getCrewSessionFromRequest(request)
  if (!session || !ALLOWED_ROLES.has(session.role)) {
    return NextResponse.json({ ok: false, error: 'Akses ditolak.' }, { status: 403 })
  }

  try {
    const { username } = await params
    const users = await listCrewAccessUsersAll()
    const user = users.find(u => u.username === username)
    if (!user) {
      return NextResponse.json({ ok: false, error: 'User tidak ditemukan.' }, { status: 404 })
    }

    const profiles = listAllCrewProfiles()
    const profile = profiles.get(username) ?? null

    return NextResponse.json({ ok: true, user: { ...user, profile } })
  } catch {
    return NextResponse.json({ ok: false, error: 'Gagal memuat data user.' }, { status: 500 })
  }
}

export async function PUT(request: Request, { params }: { params: Promise<{ username: string }> }) {
  const session = getCrewSessionFromRequest(request)
  if (!session || !ALLOWED_ROLES.has(session.role)) {
    return NextResponse.json({ ok: false, error: 'Akses ditolak.' }, { status: 403 })
  }

  try {
    const { username } = await params
    const body = (await request.json()) as {
      displayName?: string
      email?: string
      institution?: string
      profession?: string
      role?: string
    }

    // Role hierarchy (Chief 2026-10-07): only the CEO changes access levels or touches CEO and
    // Administrator accounts.
    const VALID_ROLES = new Set([
      'CEO',
      'CEO_SENTRA',
      'ADMINISTRATOR',
      'DOKTER',
      'DOKTER_GIGI',
      'PERAWAT',
      'BIDAN',
      'APOTEKER',
      'TRIAGE_OFFICER',
    ])
    if (body.role && !VALID_ROLES.has(body.role)) {
      return NextResponse.json({ ok: false, error: 'Role tidak valid.' }, { status: 400 })
    }
    const users = await listCrewAccessUsersAll()
    const targetUser = users.find(u => u.username === username)
    if (!targetUser) {
      return NextResponse.json({ ok: false, error: 'User tidak ditemukan.' }, { status: 404 })
    }
    if (
      !canActOnUser({
        actorRole: session.role,
        targetRole: targetUser.role,
        action: 'edit',
        nextRole: body.role,
      })
    ) {
      return NextResponse.json(
        { ok: false, error: 'Hanya CEO yang bisa mengubah level akses atau akun CEO dan Administrator.' },
        { status: 403 }
      )
    }

    await updateCrewAccessUser(username, body)
    return NextResponse.json({ ok: true })
  } catch (error) {
    const isKnownError = error instanceof Error && error.message.includes('tidak ditemukan')
    return NextResponse.json(
      {
        ok: false,
        error: isKnownError ? (error as Error).message : 'Gagal mengubah user.',
      },
      { status: 400 }
    )
  }
}
