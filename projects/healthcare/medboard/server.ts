// Architected and built by the one and only Drferdi.

// Suppress known Node.js deprecation warnings (url.parse required by Next.js handle())
process.removeAllListeners('warning')
process.on('warning', (warning: Error & { code?: string }) => {
  if (warning.name === 'DeprecationWarning' && warning.code === 'DEP0169') return
  if (warning.message?.includes('SSL modes')) return
  process.stderr.write(`${warning.name}: ${warning.message}\n`)
})

import { createServer } from 'http'
import { dirname } from 'node:path'
import { fileURLToPath, parse } from 'node:url'

import next from 'next'
import { Server as SocketIOServer } from 'socket.io'

import type { CrewAccessSession } from './src/lib/crew-access'
import { setSocketIO } from './src/lib/emr/socket-bridge'
import { initializeDashboardObservability } from './src/lib/intelligence/runtime-observability'
import { setIntelligenceNamespace } from './src/lib/intelligence/socket-bridge'
import { setNotamSocketIO } from './src/lib/notam/socket-bridge'
import {
  assertCrewAccessConfigOnStartup,
  getCrewAccessConfigStatus,
  getCrewSessionFromCookieHeader,
} from './src/lib/server/crew-access-auth'
import { listAllCrewProfiles } from './src/lib/server/crew-access-profile'
import { trackUserLoginToday } from './src/lib/server/online-today-tracker'
import { setTeleSocketIO } from './src/lib/telemedicine/socket-bridge'
import { evaluateScreeningAlertsFromEmrPayload } from './src/lib/vitals/instant-red-alerts'

const __dirname = dirname(fileURLToPath(import.meta.url))
const dev = process.env.NODE_ENV !== 'production'
const initialPort = Number.parseInt(process.env.PORT || '3000')
const host = process.env.HOST || '0.0.0.0'
const httpServer = createServer()
const app = next({
  dev,
  turbopack: false,
  dir: __dirname,
  hostname: host,
  port: initialPort,
  httpServer,
} as Parameters<typeof next>[0])
const handle = app.getRequestHandler()

const MAX_MESSAGE_TEXT_LENGTH = 5000
const MAX_ROOM_ID_LENGTH = 200

function parseEnvList(name: string): string[] {
  return (process.env[name] ?? '')
    .split(',')
    .map((value) => value.trim())
    .filter(Boolean)
}

function getAllowedSocketOrigins(): Array<string | RegExp> {
  const baseOrigins = [
    'https://puskesmasbalowerti.com',
    'https://www.puskesmasbalowerti.com',
    'https://crew.puskesmasbalowerti.com',
    'https://primary-healthcare-production.up.railway.app',
    ...parseEnvList('CORS_ALLOWED_ORIGINS'),
    ...parseEnvList('CORS_ALLOWED_EXTENSION_IDS').map(
      (extensionId) => `chrome-extension://${extensionId}`
    ),
  ]

  const uniqueOrigins = [...new Set(baseOrigins)]
  if (process.env.NODE_ENV === 'production') {
    return uniqueOrigins
  }

  return [
    ...uniqueOrigins,
    'http://localhost:3000',
    'http://localhost:3001',
    /^http:\/\/192\.168\.\d+\.\d+:\d+$/,
  ]
}

type UserPresence = {
  userId: string
  name: string
  role: string
  profession: string
  institution: string
  socketId: string
  joinedAt: number
}

const onlineUsers = new Map<string, UserPresence>()

app.prepare().then(async () => {
  assertCrewAccessConfigOnStartup()

  const crewAccessStatus = await getCrewAccessConfigStatus()
  if (!crewAccessStatus.ok) {
    const message = `[crew-access] ${crewAccessStatus.message}`
    if (process.env.NODE_ENV === 'production') {
      throw new Error(message)
    }
    process.stderr.write(`${message}\n`)
  }

  try {
    await initializeDashboardObservability()
  } catch {
    // Observability optional — silent skip
  }
  httpServer.on('request', (req, res) => {
    handle(req, res, parse(req.url ?? '/', true))
  })

  const io = new SocketIOServer(httpServer, {
    cors: {
      origin: getAllowedSocketOrigins(),
      methods: ['GET', 'POST'],
    },
  })

  // EMR Auto-Fill Engine: inject io instance untuk progress events
  setSocketIO(io)
  // Telemedicine: inject io untuk real-time request dari website
  setTeleSocketIO(io)
  // NOTAM: inject io untuk broadcast notifications
  setNotamSocketIO(io)
  // Intelligence Dashboard: namespace /intelligence untuk encounter, alert, eklaim, cdss events
  const intelligenceNS = io.of('/intelligence')
  intelligenceNS.use((socket, next) => {
    const cookieHeader = socket.handshake.headers.cookie ?? ''
    const session = getCrewSessionFromCookieHeader(cookieHeader)
    if (!session) {
      return next(new Error('Sesi tidak valid. Silakan login kembali.'))
    }
    socket.data.session = session
    next()
  })
  intelligenceNS.on('connection', () => {
    // Connection handled by namespace middleware
  })
  setIntelligenceNamespace(intelligenceNS)

  // ── Auth middleware: verify crew session cookie ──
  io.use((socket, next) => {
    const cookieHeader = socket.handshake.headers.cookie ?? ''
    const session = getCrewSessionFromCookieHeader(cookieHeader)
    if (!session) {
      return next(new Error('Sesi tidak valid. Silakan login kembali.'))
    }
    socket.data.session = session
    next()
  })

  io.on('connection', (socket) => {
    const session = socket.data.session as CrewAccessSession
    const profiles = listAllCrewProfiles()
    const profile = profiles.get(session.username)
    const displayName = profile?.fullName || session.displayName

    void socket.join('crew')
    void socket.join(`doctor:${displayName}`)

    // User join: register to online list using server-verified identity + fullName from profile
    socket.on('user:join', () => {
      // Track unique user login for today
      trackUserLoginToday(session.username)

      onlineUsers.set(session.username, {
        userId: session.username,
        name: displayName,
        role: session.role,
        profession: session.profession,
        institution: session.institution,
        socketId: socket.id,
        joinedAt: Date.now(),
      })
      io.to('crew').emit('users:online', Array.from(onlineUsers.values()))
    })

    // EMR triage → doctor relay (validate payload + stamp sender identity)
    socket.on('emr:triage-send', (payload: unknown) => {
      if (!payload || typeof payload !== 'object') return
      const raw = payload as Record<string, unknown>
      const targetUserId = typeof raw.targetUserId === 'string' ? raw.targetUserId.trim() : ''
      if (!targetUserId || !raw.data || typeof raw.data !== 'object') return
      const target = onlineUsers.get(targetUserId)
      if (target) {
        const triageData = raw.data as Record<string, unknown>
        const screeningAlerts = Array.isArray(triageData.screeningAlerts)
          ? triageData.screeningAlerts
          : evaluateScreeningAlertsFromEmrPayload(triageData)
        io.to(target.socketId).emit('emr:triage-receive', {
          ...triageData,
          screeningAlerts,
          _senderId: session.username,
          _senderName: session.displayName,
        })
      }
    })

    // Join room — validate input + audit log
    socket.on('room:join', (roomId: unknown) => {
      if (typeof roomId !== 'string') return
      const trimmed = roomId.trim()
      if (!trimmed || trimmed.length > MAX_ROOM_ID_LENGTH) return
      socket.join(trimmed)
    })

    // Send message — validate payload, enforce server-verified identity, check room membership
    socket.on('message:send', (msg: unknown) => {
      if (!msg || typeof msg !== 'object') return
      const raw = msg as Record<string, unknown>

      const roomId = typeof raw.roomId === 'string' ? raw.roomId.trim() : ''
      const text = typeof raw.text === 'string' ? raw.text.trim() : ''
      // Server-generate id & time — never trust client values
      const id = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`
      const time = new Date().toISOString()

      if (!roomId || !text) return
      if (text.length > MAX_MESSAGE_TEXT_LENGTH) return
      if (!socket.rooms.has(roomId)) return

      const senderName = displayName

      io.to(roomId).emit('message:receive', {
        id,
        roomId,
        senderId: session.username,
        senderName,
        text,
        time,
      })
    })

    // Typing indicator — use server-verified identity, throttled to 1 per 2s
    let lastTypingEmit = 0
    socket.on('typing:start', (payload: unknown) => {
      if (!payload || typeof payload !== 'object') return
      const raw = payload as Record<string, unknown>
      const roomId = typeof raw.roomId === 'string' ? raw.roomId.trim() : ''
      if (!roomId || !socket.rooms.has(roomId)) return
      const now = Date.now()
      if (now - lastTypingEmit < 2000) return
      lastTypingEmit = now
      socket.to(roomId).emit('typing:start', { senderName: session.displayName, roomId })
    })
    socket.on('typing:stop', (payload: unknown) => {
      if (!payload || typeof payload !== 'object') return
      const raw = payload as Record<string, unknown>
      const roomId = typeof raw.roomId === 'string' ? raw.roomId.trim() : ''
      if (!roomId || !socket.rooms.has(roomId)) return
      socket.to(roomId).emit('typing:stop', { roomId })
    })

    // ── Voice runtime disabled while Google surfaces are being removed ──────
    socket.on('voice:start', async () => {
      socket.emit('voice:error', 'Voice sementara dinonaktifkan selama exit Google total.')
    })

    socket.on('voice:audio_chunk', async (payload: { data: string; mimeType: string } | string) => {
      void payload
      socket.emit('voice:error', 'Voice sementara tidak tersedia.')
    })

    socket.on('voice:ptt_start', () => {
      socket.emit('voice:error', 'Voice sementara tidak tersedia.')
    })

    socket.on('voice:end_turn', () => {
      socket.emit('voice:error', 'Voice sementara tidak tersedia.')
    })

    socket.on('voice:interrupt', () => {
      socket.emit('voice:error', 'Voice sementara tidak tersedia.')
    })

    socket.on('voice:stop', async () => {
      socket.emit('voice:closed')
    })

    // Disconnect — use server-verified session, scope broadcast to crew room
    socket.on('disconnect', () => {
      onlineUsers.delete(session.username)
      io.to('crew').emit('users:online', Array.from(onlineUsers.values()))
    })
  })

  function startListening(port: number) {
    httpServer.listen(port, host, () => {
      const displayHost = host === '0.0.0.0' ? 'localhost' : host
      console.log(`▲ ACARS WebSocket Server ready on http://${displayHost}:${port}`)
    })
  }

  httpServer.on('error', (err: NodeJS.ErrnoException) => {
    if (err.code === 'EADDRINUSE') {
      const PORT = Number.parseInt(process.env.PORT || String(initialPort))
      const fallback = PORT + 1
      console.log(`⚠ Port ${PORT} sibuk, mencoba ${fallback}...`)
      process.env.PORT = String(fallback)
      httpServer.removeAllListeners('error')
      startListening(fallback)
    } else {
      throw err
    }
  })

  startListening(Number.parseInt(process.env.PORT || '3000'))
})
