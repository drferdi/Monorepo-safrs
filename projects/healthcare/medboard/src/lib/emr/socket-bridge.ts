/**
 * Sentra EMR Auto-Fill Engine — Socket.IO Bridge
 * Uses globalThis to share io instance between server.ts and API routes.
 * setSocketIO() dipanggil dari server.ts setelah io dibuat.
 * emitEMRProgress() dipanggil dari engine.ts untuk kirim progress ke client.
 */

import type { Server as SocketIOServer } from 'socket.io'
import type { EMRProgressEvent } from './types'

const GLOBAL_KEY = '__sentra_socketio__' as const

function getIO(): SocketIOServer | null {
  return (globalThis as Record<string, unknown>)[GLOBAL_KEY] as SocketIOServer | null
}

export function setSocketIO(io: SocketIOServer): void {
  ;(globalThis as Record<string, unknown>)[GLOBAL_KEY] = io
}

export function emitEMRProgress(event: EMRProgressEvent): void {
  const io = getIO()
  if (!io) return
  io.to('crew').emit('emr:progress', event)
}

/** Relay patient data from Assist (nurse) to EMR page (doctor) */
export function emitTriageData(data: Record<string, unknown>): void {
  const io = getIO()
  if (!io) {
    console.error('[SocketBridge] emitTriageData: io is NULL')
    return
  }
  const socketsInRoom = io.sockets.adapter.rooms.get('crew')
  console.log(`[SocketBridge] emitTriageData → crew room has ${socketsInRoom?.size ?? 0} sockets`)
  io.to('crew').emit('emr:triage-receive', data)
}
