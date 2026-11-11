// POST /api/consult/accept — dokter "Ambil kasus", persist untuk audit / bridge EMR nanti.
import { type NextRequest, NextResponse } from 'next/server'

import {
  appendClinicalCaseAuditEvent,
  CLINICAL_CASE_AUDIT_EVENTS,
} from '@/lib/audit/clinical-case-audit'
import { emitEncounterUpdated } from '@/lib/intelligence/socket-bridge'
import { prisma } from '@/lib/prisma'
import { handleCorsPreflight, jsonWithCors } from '@/lib/server/api-cors'
import { getCrewSessionFromRequest } from '@/lib/server/crew-access-auth'
import { appendAcceptedConsult } from '@/lib/telemedicine/consult-accepted'
import { validateAcceptBody } from '@/lib/telemedicine/consult-api-validation'

export const runtime = 'nodejs'

const CORS_METHODS = ['POST', 'OPTIONS'] as const

function buildPatientLabel(consultId: string): string {
  return `Pasien #${consultId.slice(-6).toUpperCase()}`
}

export async function OPTIONS(request: NextRequest) {
  return handleCorsPreflight(request, CORS_METHODS)
}

export async function POST(req: NextRequest) {
  const session = getCrewSessionFromRequest(req)
  if (!session) {
    return jsonWithCors(req, CORS_METHODS, { ok: false, error: 'Unauthorized' }, { status: 401 })
  }

  try {
    const body = await req.json()
    const validation = validateAcceptBody(body)
    if (!validation.ok) {
      return jsonWithCors(
        req,
        CORS_METHODS,
        { ok: false, error: validation.error },
        { status: validation.status }
      )
    }
    const { consultId, consult } = validation.data
    const acceptedAt = new Date().toISOString()

    appendAcceptedConsult({
      consultId,
      acceptedBy: session.displayName,
      acceptedAt,
      consult,
    })

    await appendClinicalCaseAuditEvent({
      eventType: CLINICAL_CASE_AUDIT_EVENTS.CONSULT_ACCEPTED,
      actorUserId: session.username,
      actorName: session.displayName,
      consultId,
      sourceOrigin: 'assist-consult',
      payload: {
        patientName: consult.patient?.name ?? null,
        patientMrn: consult.patient?.rm ?? null,
        keluhanUtama: consult.keluhan_utama ?? null,
        targetDoctorId: consult.targetDoctorId ?? null,
        acceptedAt,
      },
    })

    // Update ConsultLog status to track acceptance
    try {
      await prisma.consultLog.update({
        where: { consultId },
        data: {
          status: 'accepted',
          acceptedBy: session.displayName,
          acceptedAt: new Date(acceptedAt),
        },
      })
    } catch {
      // Silent — consult mungkin dari flow lama sebelum migrasi ConsultLog
    }

    // Fetch last 5 previous consults for same patient (for clinical trajectory panel)
    let visitHistory: Array<{
      consultId: string
      sentAt: string
      keluhanUtama: string
      ttv: Record<string, string>
      riskFactors: string[]
      penyakitKronis: string[]
      anthropometrics: Record<string, unknown>
    }> = []

    const patientRm = consult.patient?.rm
    if (patientRm) {
      try {
        const prevRows = await prisma.consultLog.findMany({
          where: {
            patientRm,
            consultId: { not: consultId },
            status: { in: ['received', 'accepted', 'transferred', 'completed'] },
          },
          orderBy: { sentAt: 'desc' },
          take: 5,
          select: {
            consultId: true,
            sentAt: true,
            createdAt: true,
            keluhanUtama: true,
            ttv: true,
            riskFactors: true,
            penyakitKronis: true,
            anthropometrics: true,
          },
        })
        visitHistory = prevRows.map(r => ({
          consultId: r.consultId,
          sentAt: r.sentAt?.toISOString() ?? r.createdAt.toISOString(),
          keluhanUtama: r.keluhanUtama ?? '',
          ttv: (r.ttv as Record<string, string>) ?? {},
          riskFactors: (r.riskFactors as string[]) ?? [],
          penyakitKronis: (r.penyakitKronis as string[]) ?? [],
          anthropometrics: (r.anthropometrics as Record<string, unknown>) ?? {},
        }))
      } catch {
        // Silent — riwayat kunjungan tidak kritis
      }
    }

    emitEncounterUpdated({
      encounterId: consultId,
      status: 'in_consultation',
      timestamp: acceptedAt,
      data: {
        patientLabel: buildPatientLabel(consultId),
        note: consult.keluhan_utama ?? 'Consult sedang ditangani dokter.',
        source: 'assist-consult',
      },
    })

    return jsonWithCors(req, CORS_METHODS, { ok: true, consultId, visitHistory })
  } catch (err) {
    console.error('[Consult] accept error:', err)
    return jsonWithCors(req, CORS_METHODS, { ok: false, error: 'Gagal menyimpan accept.' }, { status: 500 })
  }
}
