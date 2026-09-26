import { NextResponse } from 'next/server'
import { z } from 'zod'
import { prisma } from '@/lib/prisma'
import { getCrewSessionFromRequest } from '@/lib/server/crew-access-auth'
import { AUDIT_ACTIONS, createAuditLog } from '@/lib/telemedicine/audit'
import { sendWhatsAppNotification } from '@/lib/telemedicine/notifications'

import type { ApiResponse, AppointmentWithDetails } from '@/types/telemedicine.types'

const CreateAppointmentSchema = z.object({
  patientId: z.string().min(1),
  doctorId: z.string().min(1),
  scheduledAt: z.string().datetime({ offset: true }),
  durationMinutes: z.number().int().min(15).max(60).optional().default(15),
  consultationType: z.enum(['VIDEO', 'AUDIO', 'CHAT']).optional().default('VIDEO'),
  keluhanUtama: z.string().optional(),
  riwayatPenyakit: z.string().optional(),
  bpjsNomorSEP: z.string().optional(),
  patientName: z.string().optional(),
  patientPhone: z.string().optional(),
  doctorName: z.string().optional(),
})

/**
 * @summary List telemedicine appointments.
 * @description
 * Retrieves scheduled consultations with filtering by status and doctor ID.
 * Includes session metadata (join tokens, etc.) for coordinators.
 * 
 * @pathParam {string} [status] - Filter by 'SCHEDULED', 'COMPLETED', or 'CANCELLED'.
 * @pathParam {string} [doctorId] - Filter by specific doctor's username.
 * @pathParam {number} [limit=50] - Number of records to return.
 * 
 * @example {
 *   "success": true,
 *   "data": [{ "id": "apt-1", "status": "SCHEDULED", "scheduledAt": "2023-11-01T14:00:00Z" }]
 * }
 */
export async function GET(request: Request): Promise<NextResponse> {
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

  const { searchParams } = new URL(request.url)
  const status = searchParams.get('status')
  const doctorId = searchParams.get('doctorId')
  const limit = Math.min(Number.parseInt(searchParams.get('limit') ?? '50'), 100)

  const appointments = await prisma.telemedicineAppointment.findMany({
    where: {
      deletedAt: null,
      ...(status ? { status: status as never } : {}),
      ...(doctorId ? { doctorId } : {}),
    },
    include: { session: true },
    orderBy: { scheduledAt: 'desc' },
    take: limit,
  })

  return NextResponse.json<ApiResponse<AppointmentWithDetails[]>>({
    success: true,
    data: appointments as AppointmentWithDetails[],
    message: `${appointments.length} appointment ditemukan`,
    timestamp: new Date().toISOString(),
  })
}

/**
 * @summary Create telemedicine appointment.
 * @description
 * Schedules a new consultation and generates a secure WhatsApp invitation.
 * 
 * @bodyParam {string} patientId - Internal patient record ID.
 * @bodyParam {string} doctorId - Target doctor's username.
 * @bodyParam {string} scheduledAt - ISO datetime for the consultation.
 * 
 * @example {
 *   "patientId": "p-123",
 *   "doctorId": "dr.siti",
 *   "scheduledAt": "2023-11-05T09:00:00Z"
 * }
 */
export async function POST(request: Request): Promise<NextResponse> {
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

  const body = await request.json().catch(() => null)
  const parsed = CreateAppointmentSchema.safeParse(body)
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

  const { patientName, patientPhone, doctorName, ...appointmentData } = parsed.data

  // Generate token unik untuk pasien join tanpa login
  const patientJoinToken = crypto.randomUUID()

  const appointment = await prisma.telemedicineAppointment.create({
    data: {
      ...appointmentData,
      patientPhone: patientPhone ?? null,
      patientJoinToken,
      createdByStaffId: session.username,
      scheduledAt: new Date(appointmentData.scheduledAt),
    },
    include: { session: true },
  })

  await createAuditLog({
    appointmentId: appointment.id,
    userId: session.username,
    action: AUDIT_ACTIONS.APPOINTMENT_CREATED,
    metadata: {
      doctorId: appointment.doctorId,
      scheduledAt: appointment.scheduledAt,
    },
  })

  // Kirim notifikasi WhatsApp dengan link join (non-blocking)
  if (patientPhone && patientName && doctorName) {
    const baseUrl = process.env.NEXT_PUBLIC_BASE_URL
    // Jika baseUrl tidak di-set, WhatsApp notification dilewati
    if (baseUrl) {
      const joinUrl = `${baseUrl}/join/${patientJoinToken}`
      void sendWhatsAppNotification({
        appointmentId: appointment.id,
        patientName,
        patientPhone,
        doctorName,
        scheduledAt: appointment.scheduledAt,
        consultationType: appointment.consultationType,
        joinUrl,
      }).catch(() => {
        /* fire-and-forget */
      })
    }
  }

  return NextResponse.json<ApiResponse<AppointmentWithDetails>>(
    {
      success: true,
      data: appointment as AppointmentWithDetails,
      message: 'Appointment berhasil dibuat',
      timestamp: new Date().toISOString(),
    },
    { status: 201 }
  )
}
