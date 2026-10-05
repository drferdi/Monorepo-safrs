// Sentra Assist — Asisten Medis Bridge
// POST   /api/presence — heartbeat: the signed-in Asisten Medis user is online (every 30 s)
// DELETE /api/presence — the user logged out of Asisten Medis
// Identity comes from the crew session cookie only; the shared automation token names no user.

import { handleCorsPreflight, jsonWithCors } from '@/lib/server/api-cors'
import { getCrewSessionFromRequest } from '@/lib/server/crew-access-auth'
import { listAllCrewProfiles } from '@/lib/server/crew-access-profile'
import {
  clearAssistPresence,
  listOnlineUsers,
  markAssistPresence,
} from '@/lib/server/crew-presence'
import { emitCrewOnlineUsers } from '@/lib/telemedicine/socket-bridge'

export const runtime = 'nodejs'

const CORS_METHODS = ['POST', 'DELETE', 'OPTIONS'] as const
const SESSION_REQUIRED = 'Status online butuh sesi login crew.'

export async function OPTIONS(request: Request) {
  return handleCorsPreflight(request, CORS_METHODS)
}

export async function POST(request: Request) {
  const session = getCrewSessionFromRequest(request)
  if (!session) {
    return jsonWithCors(request, CORS_METHODS, { ok: false, error: SESSION_REQUIRED }, { status: 401 })
  }

  const profile = listAllCrewProfiles().get(session.username)
  const cameOnline = markAssistPresence({
    userId: session.username,
    name: profile?.fullName || session.displayName,
    role: session.role,
    profession: session.profession,
    institution: session.institution,
  })
  if (cameOnline) emitCrewOnlineUsers(listOnlineUsers())

  return jsonWithCors(request, CORS_METHODS, { ok: true })
}

export async function DELETE(request: Request) {
  const session = getCrewSessionFromRequest(request)
  if (!session) {
    return jsonWithCors(request, CORS_METHODS, { ok: false, error: SESSION_REQUIRED }, { status: 401 })
  }

  if (clearAssistPresence(session.username)) emitCrewOnlineUsers(listOnlineUsers())

  return jsonWithCors(request, CORS_METHODS, { ok: true })
}
