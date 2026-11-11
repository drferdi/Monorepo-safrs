import { NextResponse } from 'next/server'
import { getCrewSessionFromRequest, listCrewAccessUsers } from '@/lib/server/crew-access-auth'
import { addInstitution, listInstitutions } from '@/lib/server/crew-access-institutions'

export const runtime = 'nodejs'

const ALLOWED_ROLES = new Set(['CEO', 'CEO_SENTRA', 'ADMINISTRATOR', 'CHIEF_EXECUTIVE_OFFICER'])

export async function GET(request: Request) {
  const session = getCrewSessionFromRequest(request)
  if (!session || !ALLOWED_ROLES.has(session.role)) {
    return NextResponse.json({ ok: false, error: 'Akses ditolak.' }, { status: 403 })
  }

  try {
    const institutions = listInstitutions()
    const users = await listCrewAccessUsers()

    const result = institutions.map(inst => ({
      ...inst,
      crewCount: users.filter(u => u.institution === inst.name).length,
    }))

    return NextResponse.json({ ok: true, institutions: result })
  } catch (error) {
    console.error('[Admin] Failed to list institutions:', error)
    return NextResponse.json({ ok: false, error: 'Gagal memuat data institusi.' }, { status: 500 })
  }
}

export async function POST(request: Request) {
  const session = getCrewSessionFromRequest(request)
  if (!session || !ALLOWED_ROLES.has(session.role)) {
    return NextResponse.json({ ok: false, error: 'Akses ditolak.' }, { status: 403 })
  }

  try {
    const body = (await request.json()) as { name?: string }
    if (!body.name?.trim()) {
      return NextResponse.json({ ok: false, error: 'Nama institusi wajib diisi.' }, { status: 400 })
    }

    const record = await addInstitution(body.name)
    return NextResponse.json({ ok: true, institution: record }, { status: 201 })
  } catch (error) {
    const msg = error instanceof Error ? error.message : 'Gagal menambah institusi.'
    return NextResponse.json({ ok: false, error: msg }, { status: 400 })
  }
}
