import { NextResponse } from 'next/server'
import { getCrewSessionFromRequest, listCrewAccessUsers } from '@/lib/server/crew-access-auth'
import {
  deleteInstitution,
  listInstitutions,
  updateInstitution,
} from '@/lib/server/crew-access-institutions'

export const runtime = 'nodejs'

const ALLOWED_ROLES = new Set(['CEO', 'CEO_SENTRA', 'ADMINISTRATOR', 'CHIEF_EXECUTIVE_OFFICER'])

export async function PUT(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = getCrewSessionFromRequest(request)
  if (!session || !ALLOWED_ROLES.has(session.role)) {
    return NextResponse.json({ ok: false, error: 'Akses ditolak.' }, { status: 403 })
  }

  try {
    const { id } = await params
    const body = (await request.json()) as { name?: string }
    if (!body.name?.trim()) {
      return NextResponse.json({ ok: false, error: 'Nama institusi wajib diisi.' }, { status: 400 })
    }

    const record = await updateInstitution(id, body.name)
    return NextResponse.json({ ok: true, institution: record })
  } catch (error) {
    const msg = error instanceof Error ? error.message : 'Gagal mengubah institusi.'
    return NextResponse.json({ ok: false, error: msg }, { status: 400 })
  }
}

export async function DELETE(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = getCrewSessionFromRequest(request)
  if (!session || !ALLOWED_ROLES.has(session.role)) {
    return NextResponse.json({ ok: false, error: 'Akses ditolak.' }, { status: 403 })
  }

  try {
    const { id } = await params
    const institutions = listInstitutions()
    const target = institutions.find(i => i.id === id)
    if (!target) {
      return NextResponse.json({ ok: false, error: 'Institusi tidak ditemukan.' }, { status: 404 })
    }

    const users = await listCrewAccessUsers()
    const crewCount = users.filter(u => u.institution === target.name).length

    await deleteInstitution(id, crewCount)
    return NextResponse.json({ ok: true })
  } catch (error) {
    const msg = error instanceof Error ? error.message : 'Gagal menghapus institusi.'
    return NextResponse.json({ ok: false, error: msg }, { status: 400 })
  }
}
