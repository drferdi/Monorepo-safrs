'use client'

import dynamic from 'next/dynamic'
import Link from 'next/link'
import { useCallback, useEffect, useRef, useState } from 'react'
import { io, type Socket } from 'socket.io-client'
import { type OnlineSource, onlineSourceLabel } from '@/lib/crew-online'
import styles from './acars.module.css'

const DEFAULT_CENTER: [number, number] = [-7.8166, 112.0116] // Puskesmas Balowerti
const KEDIRI_CENTER: [number, number] = [-7.8111, 112.0047] // Kota Kediri; zoom 13 shows the whole city

const StaffMap = dynamic(() => import('@/components/map/StaffMap'), {
  ssr: false,
  loading: () => <div className={styles.mapLoading}>Memuat peta...</div>,
})

// ─── Types ────────────────────────────────────────────────────────────────────
type OnlineUser = {
  userId: string
  name: string
  role: string
  profession: string
  institution: string
  joinedAt?: number
  source?: OnlineSource
}

type SessionUser = {
  username: string
  displayName: string
  fullName: string
  role: string
  profession: string
  institution: string
  email: string
}

type ChatMessage = {
  id: string
  roomId: string
  senderId: string
  senderName: string
  text: string
  time: string
}

// ─── Utils ────────────────────────────────────────────────────────────────────
function now(): string {
  return new Date().toLocaleTimeString('id-ID', {
    hour: '2-digit',
    minute: '2-digit',
  })
}

function formatJoinedAt(joinedAt?: number): string {
  if (!joinedAt) return now()
  return new Date(joinedAt).toLocaleTimeString('id-ID', {
    hour: '2-digit',
    minute: '2-digit',
  })
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
      return '#002147'
    default:
      return '#888'
  }
}

// ─── Main Page ────────────────────────────────────────────────────────────────
export default function AcarsPage() {
  const [currentUser, setCurrentUser] = useState<SessionUser | null>(null)
  const [onlineUsers, setOnlineUsers] = useState<OnlineUser[]>([])
  const [messages, setMessages] = useState<ChatMessage[]>([])
  const [input, setInput] = useState('')
  const [connected, setConnected] = useState(false)
  const [unreadCount, setUnreadCount] = useState(0)

  const socketRef = useRef<Socket | null>(null)
  const messagesListRef = useRef<HTMLDivElement>(null)

  // Fetch session + connect socket
  useEffect(() => {
    let socket: Socket | null = null

    async function init() {
      try {
        const res = await fetch('/api/auth/profile', { cache: 'no-store' })
        const data = await res.json()
        const src = data.user
        if (!data.ok || !src) return

        const profileFullName = data.profile?.fullName || ''
        const session: SessionUser = {
          username: src.username,
          displayName: src.displayName,
          fullName: profileFullName || src.displayName,
          role: src.role,
          profession: src.profession || '',
          institution: src.institution || '',
          email: src.email || '',
        }
        setCurrentUser(session)

        socket = io()
        socketRef.current = socket

        socket.on('connect', () => {
          setConnected(true)
          socket!.emit('room:join', 'broadcast')
          socket!.emit('user:join')
        })

        socket.on('disconnect', () => setConnected(false))

        socket.on('users:online', (users: OnlineUser[]) => {
          setOnlineUsers(users)
        })

        socket.on('message:receive', (msg: ChatMessage) => {
          // Skip own messages (already added locally in sendMessage)
          if (msg.senderId === session.username) return
          setMessages(prev => [...prev, msg])
          setUnreadCount(c => c + 1)
        })
      } catch {
        // session fetch failed — page still renders
      }
    }

    init()

    return () => {
      if (socket) {
        socket.disconnect()
        socketRef.current = null
      }
    }
  }, [])

  // Scroll chat to bottom on new messages
  useEffect(() => {
    if (messages.length === 0) return
    const container = messagesListRef.current
    if (!container) return
    container.scrollTop = container.scrollHeight
  }, [messages])

  // Reset unread count when user focuses on tab
  useEffect(() => {
    function onVisibilityChange() {
      if (document.visibilityState === 'visible') {
        setUnreadCount(0)
      }
    }
    document.addEventListener('visibilitychange', onVisibilityChange)
    return () => document.removeEventListener('visibilitychange', onVisibilityChange)
  }, [])

  const sendMessage = useCallback(() => {
    const text = input.trim()
    if (!text || !socketRef.current || !currentUser) return

    const msg: ChatMessage = {
      id: `${Date.now()}-${Math.random()}`,
      roomId: 'broadcast',
      senderId: currentUser.username,
      senderName: currentUser.fullName,
      text,
      time: now(),
    }

    socketRef.current.emit('message:send', msg)
    setMessages(prev => [...prev, msg])
    setInput('')
  }, [input, currentUser])

  function handleKeyDown(e: React.KeyboardEvent) {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      sendMessage()
    }
  }

  // Map online users to staff locations — use Puskesmas coordinates with small offsets
  const staffLocations = onlineUsers.map((user, idx) => {
    const angle = (idx / Math.max(onlineUsers.length, 1)) * 2 * Math.PI
    const radius = 0.00015 + idx * 0.00005
    return {
      id: user.userId,
      name: user.name,
      role: user.role,
      institution: user.institution || 'Puskesmas Balowerti',
      isOnline: true,
      gender: 'male' as const,
      avatarUrl: getAvatarUrl(user.profession, user.role),
      location: {
        lat: DEFAULT_CENTER[0] + Math.sin(angle) * radius,
        lng: DEFAULT_CENTER[1] + Math.cos(angle) * radius,
        label: user.institution || 'Puskesmas Balowerti',
      },
      color: getUserColor(user.role),
    }
  })

  const myAvatar = currentUser
    ? getAvatarUrl(currentUser.profession, currentUser.role)
    : '/avatar/adm-m.png'

  return (
    <div className={styles.page}>
      {/* Header */}
      <div className="ui-page-header" style={{ marginBottom: 0 }}>
        <div>
          <h1 className={styles.title}>Sentra Network</h1>
          <p className="ui-page-header__description">
            ACARS — Active communication and coordination radar system untuk kolaborasi klinis
            internal.
          </p>
        </div>

        <div className={styles.actions}>
          {/* Connection Status */}
          <span className={`ui-badge ${connected ? 'ui-badge--success' : 'ui-badge--neutral'}`}>
            {connected ? 'Live' : 'Offline'}
          </span>

          {/* User Info */}
          {currentUser && (
            <div className={styles.me}>
              <div className={styles.meAvatar}>
                <img src={myAvatar} alt="" width={36} height={36} />
              </div>
              <div className={styles.meText}>
                <div className={styles.meName}>{currentUser.fullName}</div>
                <div className={styles.meRole}>{currentUser.profession || currentUser.role}</div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Map Section — no fake markers until GPS data available */}
      <div className={`${styles.card} ${styles.map}`}>
        <StaffMap staff={staffLocations} center={KEDIRI_CENTER} zoom={13} />
        {staffLocations.length === 0 && (
          <div className={styles.mapEmpty}>Tidak ada crew online saat ini.</div>
        )}
      </div>

      {/* User List / SCARS Directory */}
      <div className={styles.card}>
        <div className={styles.cardHead}>
          <div className={styles.cardTitle}>SCARS directory // {onlineUsers.length} Online</div>
          <div className={styles.cardMeta}>
            {new Date()
              .toLocaleDateString('id-ID', {
                day: '2-digit',
                month: 'short',
                year: 'numeric',
              })}
          </div>
        </div>

        {/* Table Header */}
        <div className={`${styles.row} ${styles.rowHead}`}>
          {['Name', 'Profesi', 'Institusi', 'Status', 'Jam Online'].map((h, i) => (
            <span key={h} className={i === 4 ? styles.right : undefined}>
              {h}
            </span>
          ))}
        </div>

        {/* User Rows */}
        {onlineUsers.length === 0 && <div className={styles.empty}>Belum ada crew online</div>}
        {onlineUsers.map(user => {
          const color = getUserColor(user.role)
          const avatar = getAvatarUrl(user.profession, user.role)
          const isMe = currentUser?.username === user.userId
          const rowClass = `${styles.row} ${isMe ? styles.rowMe : styles.rowLink}`
          const rowContent = (
            <>
              {/* Name */}
              <div className={styles.person}>
                <div className={styles.personAvatar} style={{ boxShadow: `0 0 0 2px ${color}` }}>
                  <img src={avatar} width={40} height={40} alt="" />
                </div>
                <div>
                  <div className={styles.personName}>
                    {user.name} {isMe && <span className={styles.cellMuted}>(you)</span>}
                  </div>
                  <div className={styles.personHandle}>@{user.userId}</div>
                </div>
              </div>

              {/* Profesi */}
              <div className={styles.cell}>{user.profession || user.role}</div>

              {/* Institusi */}
              <div className={styles.cellMuted}>{user.institution || '—'}</div>

              {/* Status */}
              <div className={styles.statusCell}>
                <span className="ui-badge ui-badge--success">Online</span>
                <span className={styles.cellMuted}>{onlineSourceLabel(user.source)}</span>
              </div>

              {/* Jam Online */}
              <div className={`${styles.joined} ${styles.right}`}>
                {formatJoinedAt(user.joinedAt)}
              </div>
            </>
          )
          return isMe ? (
            <div key={user.userId} className={rowClass}>
              {rowContent}
            </div>
          ) : (
            <Link key={user.userId} href={`/acars/${user.userId}`} className={rowClass}>
              {rowContent}
            </Link>
          )
        })}
      </div>

      {/* Broadcast Chat Section */}
      <div className={`${styles.card} ${styles.chat}`}>
        <div className={styles.cardHead}>
          <span className={styles.cardTitle}>Broadcast</span>
          {unreadCount > 0 && <span className="ui-badge ui-badge--accent">{unreadCount}</span>}
        </div>

        <div className={styles.chatBody}>
          {/* Messages */}
          <div ref={messagesListRef} className={styles.messages}>
            {messages.length === 0 && <div className={styles.empty}>Belum ada pesan broadcast</div>}
            {messages.map(msg => {
              const isMe = currentUser && msg.senderId === currentUser.username
              return (
                <div key={msg.id} className={`${styles.msg}${isMe ? ` ${styles.msgMine}` : ''}`}>
                  <div className={styles.msgMeta}>
                    {isMe ? 'You' : msg.senderName} · {msg.time}
                  </div>
                  <div className={styles.msgText}>{msg.text}</div>
                </div>
              )
            })}
          </div>

          {/* Input */}
          <div className={styles.composer}>
            <input
              type="text"
              className="ui-input"
              value={input}
              onChange={e => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder={currentUser ? 'Kirim broadcast...' : 'Login dulu...'}
              disabled={!currentUser}
            />
            <button
              className="ui-btn ui-btn--primary"
              onClick={sendMessage}
              disabled={!input.trim() || !currentUser}
            >
              Kirim
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
