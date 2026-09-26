// ============================================================
// PKM Dashboard — API Publik: Pasien Join via Token
// Route: /api/telemedicine/join/[token]
// TIDAK memerlukan autentikasi crew — akses publik via link WA
// ============================================================

import { AccessToken } from 'livekit-server-sdk'
import { NextResponse } from 'next/server'

import { prisma } from '@/lib/prisma'
import { getLiveKitConfig, isLiveKitConfigured } from '@/lib/telemedicine/token'
import type { ApiResponse } from '@/types/telemedicine.types'

// ── Simple in-memory rate limiter (per token, per menit) ─────────────────────
const rateLimitMap = new Map<string, { count: number; resetAt: number }>()
const RATE_LIMIT_MAX = 10
const RATE_LIMIT_WINDOW_MS = 60_000

function checkRateLimit(key: string): boolean {
  const now = Date.now()
  const entry = rateLimitMap.get(key)
  if (!entry || now > entry.resetAt) {
    rateLimitMap.set(key, { count: 1, resetAt: now + RATE_LIMIT_WINDOW_MS })
    return true
  }
  if (entry.count >= RATE_LIMIT_MAX) return false
  entry.count++
  return true
}

interface JoinInfo {
  appointmentId: string
  doctorId: string
  scheduledAt: string
  durationMinutes: number
  consultationType: string
  status: string
  livekitRoomName: string | null
}

// GET — ambil info appointment by joinToken (publik, tanpa auth)
export async function GET(
  request: Request,
  { params }: { params: Promise<{ token: string }> }
): Promise<NextResponse> {
  const { token } = await params

  const ip = request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ?? 'unknown'
  if (!checkRateLimit(`get:${ip}`)) {
    return NextResponse.json<ApiResponse<null>>(
      {
        success: false,
        data: null,
        message: 'Terlalu banyak permintaan. Coba lagi dalam 1 menit.',
        timestamp: new Date().toISOString(),
      },
      { status: 429 }
    )
  }

  const appointment = await prisma.telemedicineAppointment.findUnique({
    where: { patientJoinToken: token, deletedAt: null },
    select: {
      id: true,
      doctorId: true,
      scheduledAt: true,
      durationMinutes: true,
      consultationType: true,
      status: true,
      livekitRoomName: true,
    },
  })

  if (!appointment) {
    return NextResponse.json<ApiResponse<null>>(
      {
        success: false,
        data: null,
        message: 'Link tidak valid atau sudah kedaluwarsa',
        timestamp: new Date().toISOString(),
      },
      { status: 404 }
    )
  }

  return NextResponse.json<ApiResponse<JoinInfo>>({
    success: true,
    data: {
      appointmentId: appointment.id,
      doctorId: appointment.doctorId,
      scheduledAt: appointment.scheduledAt.toISOString(),
      durationMinutes: appointment.durationMinutes,
      consultationType: appointment.consultationType,
      status: appointment.status,
      livekitRoomName: appointment.livekitRoomName,
    },
    message: 'Info appointment ditemukan',
    timestamp: new Date().toISOString(),
  })
}

// POST — generate LiveKit token untuk pasien (publik, tanpa auth)
export async function POST(
  request: Request,
  { params }: { params: Promise<{ token: string }> }
): Promise<NextResponse> {
  const { token } = await params

  const ip = request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ?? 'unknown'
  if (!checkRateLimit(`post:${token}:${ip}`)) {
    return NextResponse.json<ApiResponse<null>>(
      {
        success: false,
        data: null,
        message: 'Terlalu banyak permintaan. Coba lagi dalam 1 menit.',
        timestamp: new Date().toISOString(),
      },
      { status: 429 }
    )
  }

  const body = (await request.json().catch(() => null)) as {
    displayName?: string
  } | null
  const displayName = (body?.displayName ?? 'Pasien').trim().slice(0, 50) || 'Pasien'

  const appointment = await prisma.telemedicineAppointment.findUnique({
    where: { patientJoinToken: token, deletedAt: null },
    select: { id: true, livekitRoomName: true, status: true },
  })

  if (!appointment) {
    return NextResponse.json<ApiResponse<null>>(
      {
        success: false,
        data: null,
        message: 'Link tidak valid atau sudah kedaluwarsa',
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
        message: 'Konsultasi ini telah dibatalkan',
        timestamp: new Date().toISOString(),
      },
      { status: 400 }
    )
  }

  if (!isLiveKitConfigured()) {
    return NextResponse.json<ApiResponse<null>>(
      {
        success: false,
        data: null,
        message: 'Server video tidak tersedia saat ini',
        timestamp: new Date().toISOString(),
      },
      { status: 503 }
    )
  }
  const livekitConfig = getLiveKitConfig()

  const roomName = appointment.livekitRoomName ?? `pkm-${appointment.id}`
  const participantIdentity = `patient-${token.slice(0, 8)}`

  const at = new AccessToken(livekitConfig.apiKey, livekitConfig.apiSecret, {
    identity: participantIdentity,
    name: displayName,
    ttl: 3600, // 1 jam
  })
  at.addGrant({
    roomJoin: true,
    room: roomName,
    canPublish: true,
    canSubscribe: true,
    canPublishData: true,
  })

  const livekitToken = await at.toJwt()

  return NextResponse.json<ApiResponse<{ token: string; roomName: string; serverUrl: string }>>({
    success: true,
    data: {
      token: livekitToken,
      roomName,
      serverUrl: livekitConfig.url,
    },
    message: 'Token berhasil dibuat',
    timestamp: new Date().toISOString(),
  })
}
