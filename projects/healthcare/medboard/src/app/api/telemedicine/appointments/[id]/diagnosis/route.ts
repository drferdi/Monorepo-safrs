import { NextResponse } from 'next/server'
import { z } from 'zod'

import {
  appendClinicalCaseAuditEvent,
  CLINICAL_CASE_AUDIT_EVENTS,
} from '@/lib/audit/clinical-case-audit'
import { prisma } from '@/lib/prisma'
import { getCrewSessionFromRequest } from '@/lib/server/crew-access-auth'
import { AUDIT_ACTIONS, createAuditLog } from '@/lib/telemedicine/audit'

import type { ApiResponse } from '@/types/telemedicine.types'

const DiagnosisSchema = z.object({
  anamnesis: z.string().optional(),
  pemeriksaan: z.string().optional(),
  diagnosis: z.string().min(1, 'Diagnosis wajib diisi'),
  diagnosaICD10: z.string().optional(),
  tatalaksana: z.string().optional(),
  rujukan: z.boolean().optional().default(false),
  rujukanTujuan: z.string().optional(),
})

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
): Promise<NextResponse> {
  const session = getCrewSessionFromRequest(request)
  if (!session) {
    return NextResponse.json<ApiResponse<null>>(
      {
        success: false,
        data: null,
        message: 'Unauthorized',
        timestamp: new Date().toISOString(),
      },
      { status: 401 }
    )
  }

  if (session.role !== 'DOKTER') {
    return NextResponse.json<ApiResponse<null>>(
      {
        success: false,
        data: null,
        message: 'Hanya dokter yang dapat mengisi diagnosis',
        timestamp: new Date().toISOString(),
      },
      { status: 403 }
    )
  }

  const { id } = await params

  const body = await request.json().catch(() => null)
  const parsed = DiagnosisSchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json<ApiResponse<null>>(
      {
        success: false,
        data: null,
        message: parsed.error.issues.map(e => e.message).join(', '),
        timestamp: new Date().toISOString(),
      },
      { status: 400 }
    )
  }

  const existing = await prisma.telemedicineAppointment.findUnique({
    where: { id, deletedAt: null },
  })
  if (!existing) {
    return NextResponse.json<ApiResponse<null>>(
      {
        success: false,
        data: null,
        message: 'Appointment tidak ditemukan',
        timestamp: new Date().toISOString(),
      },
      { status: 404 }
    )
  }

  const updated = await prisma.telemedicineAppointment.update({
    where: { id },
    data: parsed.data,
  })

  await createAuditLog({
    appointmentId: id,
    userId: session.username,
    action: AUDIT_ACTIONS.DIAGNOSIS_WRITTEN,
    metadata: {
      diagnosaICD10: parsed.data.diagnosaICD10,
      diagnosis: parsed.data.diagnosis,
    },
  })

  await appendClinicalCaseAuditEvent({
    eventType: CLINICAL_CASE_AUDIT_EVENTS.TELEMEDICINE_DIAGNOSIS_SAVED,
    actorUserId: session.username,
    actorName: session.displayName,
    appointmentId: id,
    sourceOrigin: 'telemedicine-appointment',
    payload: {
      diagnosis: parsed.data.diagnosis,
      diagnosaICD10: parsed.data.diagnosaICD10 ?? null,
      anamnesis: parsed.data.anamnesis ?? null,
      pemeriksaan: parsed.data.pemeriksaan ?? null,
      tatalaksana: parsed.data.tatalaksana ?? null,
      rujukan: parsed.data.rujukan,
      rujukanTujuan: parsed.data.rujukanTujuan ?? null,
    },
  })

  return NextResponse.json<ApiResponse<typeof updated>>({
    success: true,
    data: updated,
    message: 'Diagnosis berhasil disimpan',
    timestamp: new Date().toISOString(),
  })
}
