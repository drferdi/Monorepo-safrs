import { NextResponse } from 'next/server'
import { z } from 'zod'
import { prisma } from '@/lib/prisma'
import { getCrewSessionFromRequest } from '@/lib/server/crew-access-auth'
import { AUDIT_ACTIONS, createAuditLog } from '@/lib/telemedicine/audit'

import type { ApiResponse, AppointmentWithDetails } from '@/types/telemedicine.types'

const UpdateStatusSchema = z.object({
  status: z.enum(['CONFIRMED', 'CANCELLED', 'COMPLETED', 'NO_SHOW']),
})

export async function GET(
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

  const { id } = await params

  const appointment = await prisma.telemedicineAppointment.findUnique({
    where: { id, deletedAt: null },
    include: { session: true },
  })

  if (!appointment) {
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

  return NextResponse.json<ApiResponse<AppointmentWithDetails>>({
    success: true,
    data: appointment as AppointmentWithDetails,
    message: 'OK',
    timestamp: new Date().toISOString(),
  })
}

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

  const { id } = await params

  const body = await request.json().catch(() => null)
  const parsed = UpdateStatusSchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json<ApiResponse<null>>(
      {
        success: false,
        data: null,
        message: 'Status tidak valid',
        timestamp: new Date().toISOString(),
      },
      { status: 400 }
    )
  }

  const { status } = parsed.data

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
    data: {
      status,
      ...(status === 'COMPLETED' ? { endedAt: new Date() } : {}),
    },
    include: { session: true },
  })

  const auditActionMap: Record<string, string> = {
    CONFIRMED: AUDIT_ACTIONS.APPOINTMENT_CONFIRMED,
    CANCELLED: AUDIT_ACTIONS.APPOINTMENT_CANCELLED,
    COMPLETED: AUDIT_ACTIONS.APPOINTMENT_COMPLETED,
    NO_SHOW: AUDIT_ACTIONS.APPOINTMENT_NO_SHOW,
  }

  await createAuditLog({
    appointmentId: id,
    userId: session.username,
    action: auditActionMap[status] ?? status,
  })

  // Update TelemedicineSession actualEndAt jika completed
  if (status === 'COMPLETED' && updated.session) {
    await prisma.telemedicineSession.update({
      where: { appointmentId: id },
      data: { actualEndAt: new Date() },
    })
  }

  return NextResponse.json<ApiResponse<AppointmentWithDetails>>({
    success: true,
    data: updated as AppointmentWithDetails,
    message: `Status diubah ke ${status}`,
    timestamp: new Date().toISOString(),
  })
}
