'use client'

import { ArrowLeft } from 'lucide-react'
import Link from 'next/link'
import { useParams, useRouter } from 'next/navigation'
import { useCallback, useEffect, useRef, useState } from 'react'
import { io, type Socket } from 'socket.io-client'

const ACARS_PAGE_WIDTH = 1200
const ACARS_PANEL_STYLE = {
  background: 'transparent',
  border: '1px solid var(--line-base)',
  borderRadius: 12,
  boxShadow: 'none',
} as const

type CrewInfo = {
  username: string
  displayName: string
  fullName: string
  profession: string
  role: string
  institution: string
}

type SessionUser = {
  username: string
  displayName: string
  fullName: string
  role: string
  profession: string
}

type ChatMessage = {
  id: string
  roomId: string
  senderId: string
  senderName: string
  text: string
  time: string
}

function getAvatarUrl(profession: string, role: string): string {
  const p = profession.toLowerCase()
  if (p.includes('dokter') || role === 'DOKTER') return '/avatar/doctor-m.png'
  if (p.includes('perawat') || role === 'PERAWAT') return '/avatar/nurse-m.png'
  if (p.includes('bidan') || role === 'BIDAN') return '/avatar/nurse-w.png'
  if (p.includes('apoteker') || role === 'APOTEKER') return '/avatar/pharmacy-m.png'
  return '/avatar/adm-m.png'
}

function getUserColor(role: string): string {
  switch (role) {
    case 'DOKTER':
      return '#D47A57'
    case 'PERAWAT':
      return '#5B8DB8'
    case 'BIDAN':
      return '#A87BBE'
    case 'APOTEKER':
      return '#5B9E8F'
    case 'ADMINISTRATOR':
      return '#E67E22'
    default:
      return '#888'
  }
}

function dmRoomId(me: string, other: string): string {
  const [a, b] = [me, other].sort()
  return `dm:${a}:${b}`
}

export default function AcarsRosterPage() {
  const params = useParams()
  const router = useRouter()
  const username = typeof params.username === 'string' ? params.username : ''

  const [currentUser, setCurrentUser] = useState<SessionUser | null>(null)
  const [targetCrew, setTargetCrew] = useState<CrewInfo | null>(null)
  const [messages, setMessages] = useState<ChatMessage[]>([])
  const [input, setInput] = useState('')
  const [connected, setConnected] = useState(false)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const socketRef = useRef<Socket | null>(null)
  const messagesListRef = useRef<HTMLDivElement>(null)

  // Fetch session + target crew
  useEffect(() => {
    if (!username) return

    async function init() {
      try {
        const [profileRes, crewRes] = await Promise.all([
          fetch('/api/auth/profile', { cache: 'no-store' }),
          fetch(`/api/crew/${encodeURIComponent(username)}`, {
            cache: 'no-store',
          }),
        ])

        const profileData = await profileRes.json()
        const crewData = await crewRes.json()

        if (!profileData.ok || !profileData.user) {
          setError('Sesi tidak valid. Silakan login kembali.')
          setLoading(false)
          return
        }

        const src = profileData.user
        setCurrentUser({
          username: src.username,
          displayName: src.displayName,
          fullName: profileData.profile?.fullName || src.displayName,
          role: src.role,
          profession: src.profession || '',
        })

        if (!crewData.ok || !crewData.crew) {
          setError(crewData.error || 'Crew tidak ditemukan.')
          setLoading(false)
          return
        }

        setTargetCrew(crewData.crew)

        // Redirect if viewing self
        if (src.username.toLowerCase() === username.toLowerCase()) {
          router.replace('/acars')
          return
        }
      } catch {
        setError('Gagal memuat data.')
      } finally {
        setLoading(false)
      }
    }

    init()
  }, [username, router])

  // Connect socket + join DM room
  useEffect(() => {
    if (!currentUser || !targetCrew || currentUser.username === targetCrew.username) return

    const roomId = dmRoomId(currentUser.username, targetCrew.username)
    const socket = io()
    socketRef.current = socket

    socket.on('connect', () => {
      setConnected(true)
      socket.emit('room:join', roomId)
    })

    socket.on('disconnect', () => setConnected(false))

    socket.on('message:receive', (msg: ChatMessage) => {
      if (msg.roomId !== roomId) return
      if (msg.senderId === currentUser.username) return
      setMessages(prev => [...prev, msg])
    })

    return () => {
      socket.disconnect()
      socketRef.current = null
    }
  }, [currentUser, targetCrew])

  // Scroll to bottom on new messages
  useEffect(() => {
    const container = messagesListRef.current
    if (!container) return
    container.scrollTop = container.scrollHeight
  }, [messages])

  const sendMessage = useCallback(() => {
    const text = input.trim()
    if (!text || !socketRef.current || !currentUser || !targetCrew) return

    const roomId = dmRoomId(currentUser.username, targetCrew.username)
    const msg: ChatMessage = {
      id: `${Date.now()}-${Math.random()}`,
      roomId,
      senderId: currentUser.username,
      senderName: currentUser.fullName,
      text,
      time: new Date().toISOString(),
    }

    socketRef.current.emit('message:send', {
      roomId,
      text,
    })
    setMessages(prev => [...prev, msg])
    setInput('')
  }, [input, currentUser, targetCrew])

  function handleKeyDown(e: React.KeyboardEvent) {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      sendMessage()
    }
  }

  if (loading) {
    return (
      <div
        style={{
          width: '100%',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          minHeight: 300,
          color: 'var(--text-muted)',
          fontSize: 14,
        }}
      >
        Memuat roster...
      </div>
    )
  }

  if (error || !targetCrew) {
    return (
      <div
        style={{
          maxWidth: ACARS_PAGE_WIDTH,
          width: '100%',
          margin: '0 auto',
          padding: 24,
        }}
      >
        <Link
          href="/acars"
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: 8,
            color: 'var(--c-asesmen)',
            fontSize: 14,
            textDecoration: 'none',
            marginBottom: 16,
          }}
        >
          <ArrowLeft size={18} />
          Kembali ke Sentra Network
        </Link>
        <div
          style={{
            padding: 24,
            background: 'var(--bg-card)',
            border: '1px solid var(--line-base)',
            borderRadius: 12,
            color: 'var(--text-muted)',
          }}
        >
          {error || 'Crew tidak ditemukan.'}
        </div>
      </div>
    )
  }

  const myColor = currentUser ? getUserColor(currentUser.role) : '#E67E22'
  const targetColor = getUserColor(targetCrew.role)
  const targetAvatar = getAvatarUrl(targetCrew.profession, targetCrew.role)

  return (
    <div
      style={{
        width: '100%',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        gap: 20,
      }}
    >
      {/* Header */}
      <div
        style={{
          maxWidth: ACARS_PAGE_WIDTH,
          width: '100%',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
        }}
      >
        <Link
          href="/acars"
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: 8,
            color: 'var(--c-asesmen)',
            fontSize: 13,
            textDecoration: 'none',
          }}
        >
          <ArrowLeft size={18} />
          Kembali ke Sentra Network
        </Link>
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 8,
            padding: '6px 12px',
            background: 'rgba(255,255,255,0.02)',
            borderRadius: 6,
            border: '1px solid var(--line-base)',
          }}
        >
          <div
            style={{
              width: 8,
              height: 8,
              borderRadius: '50%',
              background: connected ? 'var(--c-ok)' : 'var(--text-muted)',
            }}
          />
          <span
            style={{
              fontSize: 11,
              letterSpacing: '0.1em',
              color: connected ? 'var(--c-ok)' : 'var(--text-muted)',
            }}
          >
            {connected ? 'LIVE' : 'OFFLINE'}
          </span>
        </div>
      </div>

      {/* Roster Detail Card */}
      <div
        style={{
          maxWidth: ACARS_PAGE_WIDTH,
          width: '100%',
          ...ACARS_PANEL_STYLE,
          padding: 24,
        }}
      >
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 20,
            paddingBottom: 20,
            borderBottom: '1px solid var(--line-base)',
          }}
        >
          <div
            style={{
              width: 80,
              height: 80,
              borderRadius: '50%',
              overflow: 'hidden',
              border: `3px solid ${targetColor}`,
              flexShrink: 0,
            }}
          >
            <img
              src={targetAvatar}
              alt=""
              width={80}
              height={80}
              style={{ width: '100%', height: '100%', objectFit: 'cover' }}
            />
          </div>
          <div>
            <div
              style={{
                fontSize: 22,
                fontWeight: 600,
                color: 'var(--text-main)',
                letterSpacing: '0.02em',
              }}
            >
              {targetCrew.fullName}
            </div>
            <div
              style={{
                fontSize: 13,
                color: 'var(--text-muted)',
                marginTop: 4,
              }}
            >
              @{targetCrew.username}
            </div>
            <div
              style={{
                fontSize: 13,
                color: targetColor,
                marginTop: 4,
                letterSpacing: '0.05em',
              }}
            >
              {targetCrew.profession || targetCrew.role}
            </div>
            {targetCrew.institution && (
              <div
                style={{
                  fontSize: 12,
                  color: 'var(--text-muted)',
                  marginTop: 2,
                }}
              >
                {targetCrew.institution}
              </div>
            )}
          </div>
        </div>

        {/* DM Chat */}
        <div
          style={{
            marginTop: 20,
            display: 'flex',
            flexDirection: 'column',
            minHeight: 320,
          }}
        >
          <div
            style={{
              fontSize: 12,
              fontWeight: 600,
              letterSpacing: '0.1em',
              color: 'var(--text-muted)',
              marginBottom: 12,
            }}
          >
            PESAN LANGSUNG
          </div>
          <div
            ref={messagesListRef}
            style={{
              flex: 1,
              overflowY: 'auto',
              display: 'flex',
              flexDirection: 'column',
              gap: 8,
              marginBottom: 12,
              paddingRight: 4,
              minHeight: 180,
            }}
          >
            {messages.length === 0 && (
              <div
                style={{
                  textAlign: 'center',
                  color: 'var(--text-muted)',
                  fontSize: 14,
                  padding: '40px 0',
                }}
              >
                Belum ada pesan. Mulai percakapan dengan {targetCrew.fullName}.
              </div>
            )}
            {messages.map(msg => {
              const isMe = currentUser && msg.senderId === currentUser.username
              return (
                <div
                  key={msg.id}
                  style={{
                    padding: '10px 14px',
                    background: isMe ? 'rgba(255,255,255,0.02)' : 'rgba(255,255,255,0.01)',
                    borderRadius: 8,
                    borderLeft: isMe ? `2px solid ${myColor}` : '2px solid transparent',
                    border: '1px solid var(--line-base)',
                  }}
                >
                  <div
                    style={{
                      fontSize: 11,
                      color: isMe ? myColor : 'var(--text-muted)',
                      marginBottom: 4,
                    }}
                  >
                    {isMe ? 'Anda' : msg.senderName} ·{' '}
                    {new Date(msg.time).toLocaleTimeString('id-ID', {
                      hour: '2-digit',
                      minute: '2-digit',
                    })}
                  </div>
                  <div style={{ fontSize: 13, color: 'var(--text-main)' }}>{msg.text}</div>
                </div>
              )
            })}
          </div>

          <div style={{ display: 'flex', gap: 8 }}>
            <input
              type="text"
              value={input}
              onChange={e => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder={`Kirim pesan ke ${targetCrew.fullName}...`}
              disabled={!connected}
              style={{
                flex: 1,
                padding: '12px 16px',
                background: 'rgba(255,255,255,0.02)',
                border: '1px solid var(--line-base)',
                borderRadius: 8,
                color: 'var(--text-main)',
                fontSize: 15,
                outline: 'none',
              }}
            />
            <button
              onClick={sendMessage}
              disabled={!input.trim() || !connected}
              style={{
                padding: '12px 24px',
                background: input.trim() ? 'rgba(255,255,255,0.02)' : 'rgba(255,255,255,0.01)',
                border: `1px solid ${input.trim() ? myColor : 'var(--line-base)'}`,
                borderRadius: 8,
                color: input.trim() ? myColor : 'var(--text-muted)',
                fontSize: 12,
                letterSpacing: '0.08em',
                cursor: input.trim() ? 'pointer' : 'not-allowed',
                opacity: input.trim() ? 1 : 0.5,
              }}
            >
              KIRIM
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
