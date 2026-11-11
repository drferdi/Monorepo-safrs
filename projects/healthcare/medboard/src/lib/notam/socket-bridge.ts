/**
 * Sentra NOTAM Board — Socket.IO Bridge
 * Singleton yang decouples lib/ dari server.ts.
 * setNotamSocketIO() dipanggil dari server.ts setelah io dibuat.
 * broadcastNotam() dipanggil setelah NOTAM baru dibuat.
 * broadcastNotamDeactivated() dipanggil setelah NOTAM dinonaktifkan.
 */

import type { Server as SocketIOServer } from 'socket.io'
import type { NOTAMRecord } from '@/lib/server/notam'

let _io: SocketIOServer | null = null

export function setNotamSocketIO(io: SocketIOServer): void {
  _io = io
}

export function broadcastNotam(notam: NOTAMRecord): void {
  if (!_io) return
  _io.to('crew').emit('notam:new', {
    id: notam.id,
    title: notam.title,
    body: notam.body,
    priority: notam.priority,
    createdByName: notam.createdByName,
    createdAt: notam.createdAt,
    expiresAt: notam.expiresAt,
    active: notam.active,
  })
}

export function broadcastNotamDeactivated(id: string): void {
  if (!_io) return
  _io.to('crew').emit('notam:deactivated', { id })
}
