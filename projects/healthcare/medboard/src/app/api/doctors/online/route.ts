// Sentra Assist — Ghost Protocols Bridge
// GET /api/doctors/online — returns list of doctors currently online
// Called by Assist (Chrome Extension) to populate "Send to Doctor" selector

import { NextResponse } from 'next/server'
import { isDoctorProfession } from '@/lib/crew-access'
import { prisma } from '@/lib/prisma'
import { handleCorsPreflight, jsonWithCors } from '@/lib/server/api-cors'
import { isCrewAuthorizedRequest } from '@/lib/server/crew-access-auth'

export const runtime = 'nodejs'

const CORS_METHODS = ['GET', 'OPTIONS'] as const

export async function OPTIONS(request: Request) {
  return handleCorsPreflight(request, CORS_METHODS)
}

export async function GET(request: Request) {
  if (!isCrewAuthorizedRequest(request)) {
    return jsonWithCors(request, CORS_METHODS, { ok: false, error: 'Unauthorized' }, { status: 401 })
  }

  try {
    const [online, activeUsers] = await Promise.all([
      prisma.doctorStatus.findMany({
        where: { isOnline: true },
        select: { doctorName: true, updatedAt: true },
        orderBy: { updatedAt: 'desc' },
      }),
      // Cross-reference dengan User table — hanya tampilkan nama terdaftar resmi
      // Jika doctorName tidak cocok dengan User.displayName manapun, entry diabaikan (stale/nickname)
      prisma.user.findMany({
        where: { status: 'ACTIVE', NOT: { deletedAt: { not: null } } },
        select: { displayName: true, profession: true },
      }),
    ])

    const validDisplayNames = new Map(
      activeUsers
        .filter(u => isDoctorProfession(u.profession))
        .map(u => [u.displayName.trim().toLowerCase(), u.displayName])
    )

    const doctors = online
      .filter(d => validDisplayNames.has(d.doctorName.trim().toLowerCase()))
      .map(d => ({
        id: validDisplayNames.get(d.doctorName.trim().toLowerCase()) ?? d.doctorName,
        name: validDisplayNames.get(d.doctorName.trim().toLowerCase()) ?? d.doctorName,
        role: 'dokter',
      }))

    return jsonWithCors(request, CORS_METHODS, { ok: true, doctors })
  } catch {
    return jsonWithCors(request, CORS_METHODS, { ok: false, error: 'Server error' }, { status: 500 })
  }
}
