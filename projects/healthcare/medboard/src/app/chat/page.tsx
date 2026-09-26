'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import { io, type Socket } from 'socket.io-client'

/* ── Types ── */

type SessionUser = {
  username: string
  displayName: string
  fullName: string
  role: string
  profession: string
  institution: string
}

type OnlineUser = {
  userId: string
  name: string
  role: string
  profession: string
  institution: string
  socketId: string
  joinedAt?: number
}

type ChatMessage = {
  id: string
  roomId: string
  senderId: string
  senderName: string
  text: string
  time: string
}

type Channel = {
  type: 'broadcast' | 'dm'
  roomId: string
  label: string
  role?: string
  userId?: string
}

/* ── Helpers ── */

function now(): string {
  return new Date().toLocaleTimeString('id-ID', {
    hour: '2-digit',
    minute: '2-digit',
  })
}

function formatISOTime(iso: string): string {
  try {
    return new Date(iso).toLocaleTimeString('id-ID', {
      hour: '2-digit',
      minute: '2-digit',
    })
  } catch {
    return iso
  }
}

function dmRoomId(me: string, other: string): string {
  const [a, b] = [me, other].sort()
  return `dm:${a}:${b}`
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

function getInitials(name: string): string {
  const parts = name.split(/\s+/).filter(Boolean)
  if (parts.length === 0) return '?'
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase()
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase()
}

const BROADCAST_CHANNEL: Channel = {
  type: 'broadcast',
  roomId: 'broadcast',
  label: 'Broadcast',
  role: 'ALL CREW',
}

/* ── Component ── */

export default function ChatPage() {
  const [currentUser, setCurrentUser] = useState<SessionUser | null>(null)
  const [onlineUsers, setOnlineUsers] = useState<OnlineUser[]>([])
  const [activeChannel, setActiveChannel] = useState<Channel>(BROADCAST_CHANNEL)
  const [messagesByRoom, setMessagesByRoom] = useState<Record<string, ChatMessage[]>>({})
  const [unreadByRoom, setUnreadByRoom] = useState<Record<string, number>>({})
  const [input, setInput] = useState('')
  const [connected, setConnected] = useState(false)
  const [typingUser, setTypingUser] = useState<string | null>(null)

  const socketRef = useRef<Socket | null>(null)
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const typingTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null)

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
          if (msg.senderId === session.username) return
          setMessagesByRoom(prev => ({
            ...prev,
            [msg.roomId]: [...(prev[msg.roomId] || []), msg],
          }))
          // Track unread for non-active rooms
          setUnreadByRoom(prev => {
            // We check against the ref-stable activeChannel via closure
            // This is fine since setUnreadByRoom uses functional update
            return prev
          })
          // Unread tracking is handled in a separate effect
          setUnreadByRoom(prev => ({
            ...prev,
            [msg.roomId]: (prev[msg.roomId] || 0) + 1,
          }))
        })

        socket.on('typing:start', (data: { senderName: string; roomId: string }) => {
          setTypingUser(data.senderName)
          if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current)
          typingTimeoutRef.current = setTimeout(() => setTypingUser(null), 3000)
        })

        socket.on('typing:stop', () => {
          setTypingUser(null)
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

  // Scroll to bottom on new messages in active room
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messagesByRoom, activeChannel.roomId])

  // Clear unread when switching to a channel
  useEffect(() => {
    setUnreadByRoom(prev => {
      if (!prev[activeChannel.roomId]) return prev
      const next = { ...prev }
      delete next[activeChannel.roomId]
      return next
    })
  }, [activeChannel.roomId])

  // Join DM room when switching to DM channel
  const switchChannel = useCallback((channel: Channel) => {
    setActiveChannel(channel)
    if (channel.type === 'dm' && socketRef.current) {
      socketRef.current.emit('room:join', channel.roomId)
    }
  }, [])

  const sendMessage = useCallback(() => {
    const text = input.trim()
    if (!text || !socketRef.current || !currentUser) return

    const msg: ChatMessage = {
      id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
      roomId: activeChannel.roomId,
      senderId: currentUser.username,
      senderName: currentUser.fullName,
      text,
      time: new Date().toISOString(),
    }

    socketRef.current.emit('message:send', msg)
    setMessagesByRoom(prev => ({
      ...prev,
      [activeChannel.roomId]: [...(prev[activeChannel.roomId] || []), msg],
    }))
    setInput('')
  }, [input, currentUser, activeChannel.roomId])

  function handleKeyDown(e: React.KeyboardEvent) {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      sendMessage()
    }
  }

  function handleInputChange(e: React.ChangeEvent<HTMLTextAreaElement>) {
    setInput(e.target.value)
    if (socketRef.current && e.target.value.trim()) {
      socketRef.current.emit('typing:start', { roomId: activeChannel.roomId })
    } else if (socketRef.current) {
      socketRef.current.emit('typing:stop', { roomId: activeChannel.roomId })
    }
  }

  // Build DM channels from online users (exclude self)
  const dmChannels: Channel[] = onlineUsers
    .filter(u => u.userId !== currentUser?.username)
    .map(u => ({
      type: 'dm' as const,
      roomId: currentUser ? dmRoomId(currentUser.username, u.userId) : '',
      label: u.name,
      role: u.role,
      userId: u.userId,
    }))

  const allChannels: Channel[] = [BROADCAST_CHANNEL, ...dmChannels]
  const currentMessages = messagesByRoom[activeChannel.roomId] || []
  const otherOnlineCount = onlineUsers.filter(u => u.userId !== currentUser?.username).length

  return (
    <div
      style={{
        width: '100%',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'flex-start',
      }}
    >
      <div className="page-header" style={{ maxWidth: 1400, width: '100%' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <div className="page-title">Chatbox</div>
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 6,
              fontSize: 12,
              fontFamily: 'var(--font-mono)',
              color: connected ? 'var(--c-ok, #4ade80)' : 'var(--text-muted)',
              letterSpacing: '0.08em',
            }}
          >
            <div
              style={{
                width: 6,
                height: 6,
                borderRadius: '50%',
                background: connected ? '#4ade80' : 'var(--text-muted)',
                boxShadow: connected ? '0 0 8px #4ade80' : 'none',
              }}
            />
            {connected ? 'CONNECTED' : 'DISCONNECTED'}
          </div>
        </div>
        <div className="page-subtitle">Komunikasi Internal Antar Tenaga Kesehatan</div>
      </div>

      <div className="chat-layout">
        {/* ── Sidebar: Channels ── */}
        <div className="chat-sidebar">
          <div className="chat-sidebar-header">
            <span>Channel</span>
            <span
              style={{
                fontSize: 11,
                color: 'var(--text-muted)',
                opacity: 0.6,
              }}
            >
              {otherOnlineCount} online
            </span>
          </div>

          {/* Broadcast Channel */}
          <div
            className={`chat-contact${activeChannel.roomId === 'broadcast' ? ' active' : ''}`}
            onClick={() => switchChannel(BROADCAST_CHANNEL)}
          >
            <div
              className="chat-contact-avatar"
              style={{
                background:
                  activeChannel.roomId === 'broadcast' ? 'rgba(212, 122, 87, 0.1)' : 'transparent',
                fontSize: 12,
              }}
            >
              #
            </div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div className="chat-contact-name">Broadcast</div>
              <div className="chat-contact-role">ALL CREW</div>
            </div>
            {(unreadByRoom['broadcast'] || 0) > 0 && (
              <UnreadBadge count={unreadByRoom['broadcast']} />
            )}
          </div>

          {/* DM Separator */}
          {dmChannels.length > 0 && (
            <div
              style={{
                padding: '12px 24px 8px',
                fontSize: 10,
                fontFamily: 'var(--font-mono)',
                letterSpacing: '0.2em',
                color: 'var(--text-muted)',
                textTransform: 'uppercase',
                opacity: 0.5,
              }}
            >
              Direct Message
            </div>
          )}

          {/* DM Channels — online users */}
          {dmChannels.map(ch => {
            const unread = unreadByRoom[ch.roomId] || 0
            return (
              <div
                key={ch.roomId}
                className={`chat-contact${activeChannel.roomId === ch.roomId ? ' active' : ''}`}
                onClick={() => switchChannel(ch)}
              >
                <div
                  className="chat-contact-avatar"
                  style={{
                    color: getUserColor(ch.role || ''),
                    borderColor:
                      activeChannel.roomId === ch.roomId ? getUserColor(ch.role || '') : undefined,
                  }}
                >
                  {getInitials(ch.label)}
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div
                    className="chat-contact-name"
                    style={{
                      whiteSpace: 'nowrap',
                      overflow: 'hidden',
                      textOverflow: 'ellipsis',
                    }}
                  >
                    {ch.label}
                  </div>
                  <div className="chat-contact-role">{ch.role}</div>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  {unread > 0 && <UnreadBadge count={unread} />}
                  <div className="online-dot" />
                </div>
              </div>
            )
          })}

          {/* Empty state — no one online */}
          {dmChannels.length === 0 && (
            <div
              style={{
                padding: '32px 24px',
                textAlign: 'center',
                fontSize: 13,
                color: 'var(--text-muted)',
                opacity: 0.5,
                fontStyle: 'italic',
              }}
            >
              {connected ? 'Belum ada crew lain yang online' : 'Menghubungkan...'}
            </div>
          )}
        </div>

        {/* ── Main Chat Area ── */}
        <div className="chat-main">
          {/* Header */}
          <div className="chat-header">
            <div>
              <div className="chat-header-name">
                {activeChannel.type === 'broadcast' ? '# Broadcast' : activeChannel.label}
              </div>
              <div className="chat-header-meta">
                {activeChannel.type === 'broadcast'
                  ? `${onlineUsers.length} CREW ONLINE`
                  : activeChannel.role}
                {typingUser && activeChannel.roomId && (
                  <span style={{ color: 'var(--c-asesmen)', marginLeft: 12 }}>
                    {typingUser} sedang mengetik...
                  </span>
                )}
              </div>
            </div>
            <div
              style={{
                fontSize: 12,
                fontFamily: 'var(--font-mono)',
                color: 'var(--text-muted)',
                letterSpacing: '0.1em',
                opacity: 0.5,
              }}
            >
              SENTRA INTERNAL
            </div>
          </div>

          {/* Messages */}
          <div className="chat-messages">
            {currentMessages.length === 0 && (
              <div
                style={{
                  flex: 1,
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: 8,
                  color: 'var(--text-muted)',
                  opacity: 0.4,
                }}
              >
                <div
                  style={{
                    fontSize: 32,
                    fontFamily: 'var(--font-mono)',
                    opacity: 0.3,
                  }}
                >
                  {activeChannel.type === 'broadcast' ? '#' : '→'}
                </div>
                <div style={{ fontSize: 14 }}>
                  {activeChannel.type === 'broadcast'
                    ? 'Broadcast channel — pesan ke seluruh crew'
                    : `Mulai percakapan dengan ${activeChannel.label}`}
                </div>
                <div
                  style={{
                    fontSize: 12,
                    fontFamily: 'var(--font-mono)',
                    letterSpacing: '0.05em',
                  }}
                >
                  Pesan tidak disimpan di server
                </div>
              </div>
            )}

            {currentMessages.map(msg => {
              const isMe = msg.senderId === currentUser?.username
              return (
                <div key={msg.id} className={`chat-msg ${isMe ? 'outgoing' : 'incoming'}`}>
                  <div className="chat-msg-meta">
                    {isMe ? 'Saya' : msg.senderName} · {formatISOTime(msg.time)}
                  </div>
                  <div className="chat-bubble">{msg.text}</div>
                </div>
              )
            })}
            <div ref={messagesEndRef} />
          </div>

          {/* Input */}
          <div className="chat-input-wrap">
            <textarea
              className="chat-input"
              placeholder={
                connected
                  ? `Pesan ke ${activeChannel.type === 'broadcast' ? 'broadcast' : activeChannel.label}...`
                  : 'Menunggu koneksi...'
              }
              value={input}
              onChange={handleInputChange}
              onKeyDown={handleKeyDown}
              rows={1}
              disabled={!connected}
            />
            <button
              className="chat-send-btn"
              onClick={sendMessage}
              disabled={!connected || !input.trim()}
              style={{
                opacity: !connected || !input.trim() ? 0.4 : 1,
                cursor: !connected || !input.trim() ? 'not-allowed' : 'pointer',
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

/* ── Unread Badge ── */
function UnreadBadge({ count }: { count: number }) {
  return (
    <div
      style={{
        minWidth: 18,
        height: 18,
        borderRadius: 9,
        background: 'var(--c-asesmen)',
        color: '#fff',
        fontSize: 10,
        fontFamily: 'var(--font-mono)',
        fontWeight: 600,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '0 5px',
        flexShrink: 0,
      }}
    >
      {count > 99 ? '99+' : count}
    </div>
  )
}
