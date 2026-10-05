/**
 * Telemedicine — Socket.IO Bridge
 * Shares the main io instance between server.ts and API routes.
 */

import type { Server as SocketIOServer } from 'socket.io'

const GLOBAL_KEY = '__sentra_tele_socketio__' as const

export interface AssistConsultPayload {
  consultId: string
  targetDoctorId: string
  sentAt: string
  patient: {
    name: string
    age?: number
    gender?: string
    rm?: string
    [key: string]: unknown
  }
  ttv: Record<string, string | undefined>
  keluhan_utama: string
  keluhan_tambahan?: string
  risk_factors: string[]
  anthropometrics: {
    tinggi: number
    berat: number
    imt: number
    hasil_imt: string
    lingkar_perut: number
  }
  penyakit_kronis: string[]
  alergi?: string[]
  status_kehamilan?: string
  disability_type?: string
  obesity_confirmation?: string
  clinical_context?: Record<string, unknown>
  canonical_clinical?: Record<string, unknown>
  visit_history?: unknown[]
  [key: string]: unknown
}

function getIO(): SocketIOServer | null {
  return (globalThis as Record<string, unknown>)[GLOBAL_KEY] as SocketIOServer | null
}

export function setTeleSocketIO(io: SocketIOServer): void {
  ;(globalThis as Record<string, unknown>)[GLOBAL_KEY] = io
}

export function emitTeleRequest(request: unknown): void {
  const io = getIO()
  if (!io) return
  io.to('crew').emit('telemedicine:new-request', request)
}

/** Broadcasts the merged web + Asisten Medis online list to the crew room. */
export function emitCrewOnlineUsers(users: unknown[]): boolean {
  const io = getIO()
  if (!io) return false
  io.to('crew').emit('users:online', users)
  return true
}

export function emitAssistConsult(payload: AssistConsultPayload): boolean {
  const io = getIO()
  if (!io) return false
  io.to('crew').emit('assist:consult', payload)
  return true
}
