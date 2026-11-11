// ============================================================
// PKM Dashboard — LiveKit Token Generation Helper
// ============================================================

import { AccessToken, RoomServiceClient } from 'livekit-server-sdk'
import type { SessionParticipantRole } from '@/types/telemedicine.types'

const LIVEKIT_URL = process.env.LIVEKIT_URL ?? ''
const LIVEKIT_API_KEY = process.env.LIVEKIT_API_KEY ?? ''
const LIVEKIT_API_SECRET = process.env.LIVEKIT_API_SECRET ?? ''

export function getLiveKitConfig(): {
  url: string
  apiKey: string
  apiSecret: string
} {
  return {
    url: LIVEKIT_URL,
    apiKey: LIVEKIT_API_KEY,
    apiSecret: LIVEKIT_API_SECRET,
  }
}

export function isLiveKitConfigured(): boolean {
  return !!(LIVEKIT_URL && LIVEKIT_API_KEY && LIVEKIT_API_SECRET)
}

interface GenerateTokenParams {
  roomName: string
  participantIdentity: string
  participantName: string
  participantRole: SessionParticipantRole
  metadata?: string
}

/**
 * Tentukan grants (izin) berdasarkan role peserta.
 * DOCTOR/NURSE bisa publish (mic+camera), PATIENT bisa publish, OBSERVER hanya subscribe.
 */
function getGrantsForRole(role: SessionParticipantRole): {
  canPublish: boolean
  canSubscribe: boolean
  canPublishData: boolean
} {
  switch (role) {
    case 'DOCTOR':
    case 'NURSE':
      return { canPublish: true, canSubscribe: true, canPublishData: true }
    case 'PATIENT':
      return { canPublish: true, canSubscribe: true, canPublishData: true }
    case 'OBSERVER':
      return { canPublish: false, canSubscribe: true, canPublishData: false }
    default:
      return { canPublish: false, canSubscribe: true, canPublishData: false }
  }
}

export async function generateLiveKitToken({
  roomName,
  participantIdentity,
  participantName,
  participantRole,
  metadata,
}: GenerateTokenParams): Promise<string> {
  const grants = getGrantsForRole(participantRole)

  const at = new AccessToken(LIVEKIT_API_KEY, LIVEKIT_API_SECRET, {
    identity: participantIdentity,
    name: participantName,
    metadata: metadata ?? JSON.stringify({ role: participantRole }),
    ttl: '4h',
  })

  at.addGrant({
    roomJoin: true,
    room: roomName,
    canPublish: grants.canPublish,
    canSubscribe: grants.canSubscribe,
    canPublishData: grants.canPublishData,
  })

  return await at.toJwt()
}

/**
 * Buat room LiveKit jika belum ada.
 * RoomServiceClient digunakan untuk provisi room di server LiveKit.
 */
export async function ensureLiveKitRoom(roomName: string): Promise<void> {
  const svc = new RoomServiceClient(LIVEKIT_URL, LIVEKIT_API_KEY, LIVEKIT_API_SECRET)
  try {
    await svc.createRoom({
      name: roomName,
      emptyTimeout: 300,
      maxParticipants: 10,
    })
  } catch {
    // Room mungkin sudah ada — tidak masalah
  }
}
