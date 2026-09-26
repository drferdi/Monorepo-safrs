// Sentra Assist — Ghost Protocols Bridge
// GET /api/consult/pending — DB fallback for consult delivery
// Returns recent unaccepted consults for the logged-in doctor.
// Used by dashboard telemedicine page as fallback when Socket.IO misses events.

import { prisma } from '@/lib/prisma'
import { getCrewSessionFromRequest } from '@/lib/server/crew-access-auth'
import { NextResponse } from 'next/server'

export const runtime = 'nodejs'

export async function GET(request: Request) {
  const session = getCrewSessionFromRequest(request)
  if (!session) {
    return NextResponse.json({ ok: false, error: 'Unauthorized' }, { status: 401 })
  }

  try {
    // Fetch consults targeted at this doctor that are still pending (status = 'received')
    // Only look at last 24 hours to keep query fast
    const since = new Date(Date.now() - 24 * 60 * 60 * 1000)

    const rows = await prisma.consultLog.findMany({
      where: {
        targetDoctorId: session.displayName,
        status: 'received',
        createdAt: { gte: since },
      },
      orderBy: { createdAt: 'desc' },
      take: 20,
    })

    const consults = rows.map(row => ({
      consultId: row.consultId,
      targetDoctorId: row.targetDoctorId ?? '',
      sentAt: row.sentAt?.toISOString() ?? row.createdAt.toISOString(),
      patient: {
        name: row.patientName ?? '',
        age: row.patientAge ?? 0,
        gender: row.patientGender ?? '',
        rm: row.patientRm ?? '',
      },
      ttv: (row.ttv as Record<string, string>) ?? {},
      keluhan_utama: row.keluhanUtama ?? '',
      risk_factors: (row.riskFactors as string[]) ?? [],
      anthropometrics: (row.anthropometrics as Record<string, unknown>) ?? {},
      penyakit_kronis: (row.penyakitKronis as string[]) ?? [],
      visit_history: (row.visitHistory as unknown[]) ?? [],
    }))

    return NextResponse.json({ ok: true, consults })
  } catch (err) {
    console.error('[Consult/Pending] Query error:', err)
    return NextResponse.json({ ok: false, error: 'Server error' }, { status: 500 })
  }
}
