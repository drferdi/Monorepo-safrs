// POST /api/consult/transfer-to-emr — buat bridge entry dari accepted consult (Assist bisa claim & isi ePuskesmas).
import { type NextRequest, NextResponse } from 'next/server'

import {
  appendClinicalCaseAuditEvent,
  CLINICAL_CASE_AUDIT_EVENTS,
} from '@/lib/audit/clinical-case-audit'
import { createBridgeEntry } from '@/lib/emr/bridge-queue'
import { emitEncounterUpdated } from '@/lib/intelligence/socket-bridge'
import { prisma } from '@/lib/prisma'
import { handleCorsPreflight, jsonWithCors } from '@/lib/server/api-cors'
import { getCrewSessionFromRequest } from '@/lib/server/crew-access-auth'
import { getAcceptedConsult } from '@/lib/telemedicine/consult-accepted'
import { validateTransferBody } from '@/lib/telemedicine/consult-api-validation'
import { consultToBridgePayload } from '@/lib/telemedicine/consult-to-bridge'

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
    const validation = validateTransferBody(body)
    if (!validation.ok) {
      return jsonWithCors(
        req,
        CORS_METHODS,
        { ok: false, error: validation.error },
        { status: validation.status }
      )
    }
    const { consultId, pelayananId } = validation.data

    const record = getAcceptedConsult(consultId)
    if (!record) {
      return jsonWithCors(
        req,
        CORS_METHODS,
        { ok: false, error: 'Consult tidak ditemukan atau belum di-ambil.' },
        { status: 404 }
      )
    }

    const payload = consultToBridgePayload(record.consult)
    const patientName = record.consult.patient?.name
    const entry = createBridgeEntry(
      session.displayName || session.username,
      pelayananId,
      payload,
      patientName
    )

    await appendClinicalCaseAuditEvent({
      eventType: CLINICAL_CASE_AUDIT_EVENTS.CONSULT_TRANSFERRED_TO_EMR,
      actorUserId: session.username,
      actorName: session.displayName,
      consultId,
      reportId: null,
      sourceOrigin: 'assist-consult',
      payload: {
        bridgeEntryId: entry.id,
        pelayananId,
        patientName: patientName ?? null,
        transferStatus: entry.status,
        createdAt: entry.createdAt,
      },
    })

    // Update ConsultLog status to track EMR transfer
    try {
      await prisma.consultLog.update({
        where: { consultId },
        data: {
          status: 'transferred',
          bridgeEntryId: entry.id,
          transferredAt: new Date(),
        },
      })
    } catch {
      // Silent — consult mungkin dari flow lama sebelum migrasi ConsultLog
    }

    emitEncounterUpdated({
      encounterId: consultId,
      status: 'completed',
      timestamp: new Date().toISOString(),
      data: {
        patientLabel: buildPatientLabel(consultId),
        note: 'Consult berhasil ditransfer ke EMR.',
        source: 'assist-consult',
      },
    })

    return jsonWithCors(req, CORS_METHODS, {
      ok: true,
      entry: {
        id: entry.id,
        status: entry.status,
        createdAt: entry.createdAt,
        pelayananId: entry.pelayananId,
        patientName: entry.patientName,
      },
    })
  } catch (err) {
    console.error('[Consult] transfer-to-emr error:', err)
    return jsonWithCors(
      req,
      CORS_METHODS,
      { ok: false, error: 'Gagal membuat transfer ke EMR.' },
      { status: 500 }
    )
  }
}
