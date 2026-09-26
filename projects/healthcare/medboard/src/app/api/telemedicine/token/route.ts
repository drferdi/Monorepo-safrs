// Drferdi — vision, brought to life.
import { NextResponse } from 'next/server'
import { z } from 'zod'
import { prisma } from '@/lib/prisma'
import { getCrewSessionFromRequest } from '@/lib/server/crew-access-auth'
import { AUDIT_ACTIONS, createAuditLog } from '@/lib/telemedicine/audit'
import { hasTelemedicineAccess } from '@/lib/telemedicine/rbac'
import {
  ensureLiveKitRoom,
  generateLiveKitToken,
  isLiveKitConfigured,
} from '@/lib/telemedicine/token'

import type { ApiResponse, LiveKitTokenResponse } from '@/types/telemedicine.types'

const TokenRequestSchema = z.object({
  appointmentId: z.string().min(1),
  participantRole: z.enum(['DOCTOR', 'NURSE', 'PATIENT', 'OBSERVER']),
})

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

  if (!isLiveKitConfigured()) {
    return NextResponse.json<ApiResponse<null>>(
      {
        success: false,
        data: null,
        message:
          'LiveKit belum dikonfigurasi. Isi LIVEKIT_URL, LIVEKIT_API_KEY, dan LIVEKIT_API_SECRET.',
        timestamp: new Date().toISOString(),
      },
      { status: 503 }
    )
  }

  const body = await request.json().catch(() => null)
  const parsed = TokenRequestSchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json<ApiResponse<null>>(
      {
        success: false,
        data: null,
        message: 'Parameter tidak valid',
        timestamp: new Date().toISOString(),
      },
      { status: 400 }
    )
  }

  const { appointmentId, participantRole } = parsed.data

  const appointment = await prisma.telemedicineAppointment.findUnique({
    where: { id: appointmentId, deletedAt: null },
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

  if (appointment.status === 'CANCELLED' || appointment.status === 'NO_SHOW') {
    return NextResponse.json<ApiResponse<null>>(
      {
        success: false,
        data: null,
        message: 'Appointment sudah dibatalkan',
        timestamp: new Date().toISOString(),
      },
      { status: 400 }
    )
  }

  const hasAccess = hasTelemedicineAccess({
    userId: session.username,
    userRole: session.role,
    appointment,
    participantRole,
  })

  if (!hasAccess) {
    await createAuditLog({
      appointmentId,
      userId: session.username,
      action: AUDIT_ACTIONS.TOKEN_REQUEST_DENIED,
      metadata: {
        role: session.role,
        requestedParticipantRole: participantRole,
      },
    })
    return NextResponse.json<ApiResponse<null>>(
      {
        success: false,
        data: null,
        message: 'Akses ditolak',
        timestamp: new Date().toISOString(),
      },
      { status: 403 }
    )
  }

  // Buat/pastikan room LiveKit tersedia
  const roomName = appointment.livekitRoomName ?? `pkm-tele-${appointmentId}`

  await ensureLiveKitRoom(roomName)

  // Update livekitRoomName jika belum ada
  if (!appointment.livekitRoomName) {
    await prisma.telemedicineAppointment.update({
      where: { id: appointmentId },
      data: { livekitRoomName: roomName },
    })
  }

  // Buat atau update session DB
  const dbSession = await prisma.telemedicineSession.upsert({
    where: { appointmentId },
    create: {
      appointmentId,
      roomName,
      actualStartAt: new Date(),
    },
    update: {},
  })

  // Upsert participant
  const participantIdentity = `${session.username}-${participantRole.toLowerCase()}`
  await prisma.telemedicineParticipant.upsert({
    where: {
      sessionId_userId: { sessionId: dbSession.id, userId: session.username },
    },
    create: {
      sessionId: dbSession.id,
      userId: session.username,
      role: participantRole,
      livekitIdentity: participantIdentity,
      joinedAt: new Date(),
    },
    update: {
      joinedAt: new Date(),
      leftAt: null,
    },
  })

  // Update appointment status ke IN_PROGRESS jika baru mulai
  if (appointment.status === 'CONFIRMED' || appointment.status === 'PENDING') {
    await prisma.telemedicineAppointment.update({
      where: { id: appointmentId },
      data: {
        status: 'IN_PROGRESS',
        startedAt: appointment.startedAt ?? new Date(),
      },
    })
  }

  // Generate JWT token LiveKit
  const token = await generateLiveKitToken({
    roomName,
    participantIdentity,
    participantName: session.displayName,
    participantRole,
    metadata: JSON.stringify({
      role: participantRole,
      userId: session.username,
    }),
  })

  await createAuditLog({
    appointmentId,
    userId: session.username,
    action: AUDIT_ACTIONS.JOIN_ROOM,
    metadata: { participantRole, roomName },
  })

  const expiresAt = new Date(Date.now() + 4 * 60 * 60 * 1000).toISOString()

  return NextResponse.json<ApiResponse<LiveKitTokenResponse>>({
    success: true,
    data: {
      token,
      roomName,
      serverUrl: process.env.LIVEKIT_URL ?? '',
      participantIdentity,
      expiresAt,
    },
    message: 'Token berhasil dibuat',
    timestamp: new Date().toISOString(),
  })
}
