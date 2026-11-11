import { type NextRequest, NextResponse } from 'next/server'
import { isDoctorProfession } from '@/lib/crew-access'
import { prisma } from '@/lib/prisma'
import {
  getCrewSessionFromRequest,
  isClinicalCrewRole,
} from '@/lib/server/crew-access-auth'

export const runtime = 'nodejs'

// Public — website fetch ini untuk tampil badge dokter online
export async function GET() {
  try {
    const doctors = await prisma.doctorStatus.findMany({
      where: { isOnline: true },
      select: { doctorName: true, updatedAt: true },
      orderBy: { updatedAt: 'desc' },
    })
    return NextResponse.json({ ok: true, doctors })
  } catch (err) {
    console.error('[Telemedicine] GET /doctor-status error:', err)
    return NextResponse.json({ ok: false, error: 'Server error' }, { status: 500 })
  }
}

// Toggle online/offline — hanya dokter (nama mengandung dr. atau drg.)
export async function POST(req: NextRequest) {
  try {
    const session = getCrewSessionFromRequest(req)
    if (!session) {
      return NextResponse.json({ ok: false, error: 'Unauthorized' }, { status: 401 })
    }

    const isDoctor = isDoctorProfession(session.profession)
    if (!isDoctor) {
      return NextResponse.json(
        { ok: false, error: 'Hanya dokter yang dapat mengubah status' },
        { status: 403 }
      )
    }

    const { isOnline } = await req.json()

    const status = await prisma.doctorStatus.upsert({
      where: { doctorName: session.displayName },
      update: { isOnline: Boolean(isOnline) },
      create: { doctorName: session.displayName, isOnline: Boolean(isOnline) },
    })

    return NextResponse.json({
      ok: true,
      doctorName: status.doctorName,
      isOnline: status.isOnline,
    })
  } catch (err) {
    console.error('[Telemedicine] POST /doctor-status error:', err)
    return NextResponse.json({ ok: false, error: 'Server error' }, { status: 500 })
  }
}

// DELETE — Admin: remove a stale/duplicate doctorStatus entry by name
// Usage: DELETE /api/telemedicine/doctor-status?name=NicknameToRemove
export async function DELETE(req: NextRequest) {
  try {
    const session = getCrewSessionFromRequest(req)
    if (!session || !isClinicalCrewRole(session.role)) {
      return NextResponse.json({ ok: false, error: 'Unauthorized' }, { status: 401 })
    }

    const nameToDelete = req.nextUrl.searchParams.get('name')?.trim()
    if (!nameToDelete) {
      return NextResponse.json(
        { ok: false, error: 'Query parameter "name" wajib diisi' },
        { status: 400 }
      )
    }

    const existing = await prisma.doctorStatus.findUnique({
      where: { doctorName: nameToDelete },
    })
    if (!existing) {
      return NextResponse.json({ ok: false, error: `Entry "${nameToDelete}" tidak ditemukan` }, { status: 404 })
    }

    await prisma.doctorStatus.delete({
      where: { doctorName: nameToDelete },
    })

    console.log(`[Telemedicine] doctorStatus "${nameToDelete}" deleted by ${session.username}`)
    return NextResponse.json({ ok: true, deleted: nameToDelete })
  } catch (err) {
    console.error('[Telemedicine] DELETE /doctor-status error:', err)
    return NextResponse.json({ ok: false, error: 'Server error' }, { status: 500 })
  }
}
