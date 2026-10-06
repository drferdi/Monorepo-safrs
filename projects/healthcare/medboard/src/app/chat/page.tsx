'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import { io, type Socket } from 'socket.io-client'
import type { OnlineSource } from '@/lib/crew-online'
import styles from './chat.module.css'

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
  joinedAt?: number
  source?: OnlineSource
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
      return '#002147'
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
    <div className={styles.page}>
      <div className="ui-page-header" style={{ marginBottom: 0 }}>
        <div>
          <div className={styles.titleRow}>
            <h1 className={styles.title}>Sentra Social</h1>
            <div className={`${styles.status}${connected ? ` ${styles.statusOn}` : ''}`}>
              <div className={styles.statusDot} />
              {connected ? 'Connected' : 'Disconnected'}
            </div>
          </div>
          <p className="ui-page-header__description">
            Komunikasi Internal Antar Tenaga Kesehatan
          </p>
        </div>
      </div>

      <div className={styles.layout}>
        {/* ── Sidebar: Channels ── */}
        <div className={`${styles.pane} ${styles.sidebar}`}>
          <div className={styles.sidebarHeader}>
            <span>Channel</span>
            <span className={styles.sidebarCount}>{otherOnlineCount} online</span>
          </div>

          {/* Broadcast Channel */}
          <div
            className={`${styles.contact}${activeChannel.roomId === 'broadcast' ? ` ${styles.contactActive}` : ''}`}
            onClick={() => switchChannel(BROADCAST_CHANNEL)}
          >
            <div
              className={`${styles.avatar}${activeChannel.roomId === 'broadcast' ? ` ${styles.avatarActive}` : ''}`}
            >
              #
            </div>
            <div className={styles.contactText}>
              <div className={styles.contactName}>Broadcast</div>
              <div className={styles.contactRole}>All crew</div>
            </div>
            {(unreadByRoom['broadcast'] || 0) > 0 && (
              <UnreadBadge count={unreadByRoom['broadcast']} />
            )}
          </div>

          {/* DM Separator */}
          {dmChannels.length > 0 && <div className={styles.sectionLabel}>Direct Message</div>}

          {/* DM Channels — online users */}
          {dmChannels.map(ch => {
            const unread = unreadByRoom[ch.roomId] || 0
            return (
              <div
                key={ch.roomId}
                className={`${styles.contact}${activeChannel.roomId === ch.roomId ? ` ${styles.contactActive}` : ''}`}
                onClick={() => switchChannel(ch)}
              >
                <div
                  className={styles.avatar}
                  style={{
                    color: getUserColor(ch.role || ''),
                    borderColor:
                      activeChannel.roomId === ch.roomId ? getUserColor(ch.role || '') : undefined,
                  }}
                >
                  {getInitials(ch.label)}
                </div>
                <div className={styles.contactText}>
                  <div className={styles.contactName}>{ch.label}</div>
                  <div className={styles.contactRole}>{ch.role}</div>
                </div>
                <div className={styles.contactEnd}>
                  {unread > 0 && <UnreadBadge count={unread} />}
                  <div className={styles.onlineDot} />
                </div>
              </div>
            )
          })}

          {/* Empty state — no one online */}
          {dmChannels.length === 0 && (
            <div className={styles.sidebarEmpty}>
              {connected ? 'Belum ada crew lain yang online' : 'Menghubungkan...'}
            </div>
          )}
        </div>

        {/* ── Main Chat Area ── */}
        <div className={styles.pane}>
          {/* Header */}
          <div className={styles.header}>
            <div>
              <div className={styles.headerName}>
                {activeChannel.type === 'broadcast' ? '# Broadcast' : activeChannel.label}
              </div>
              <div className={styles.headerMeta}>
                {activeChannel.type === 'broadcast'
                  ? `${onlineUsers.length} crew online`
                  : activeChannel.role}
                {typingUser && activeChannel.roomId && (
                  <span className={styles.typing}>{typingUser} sedang mengetik...</span>
                )}
              </div>
            </div>
            <div className={styles.headerTag}>Sentra internal</div>
          </div>

          {/* Messages */}
          <div className={styles.messages}>
            {currentMessages.length === 0 && (
              <div className={styles.empty}>
                <div>
                  {activeChannel.type === 'broadcast'
                    ? 'Broadcast channel — pesan ke seluruh crew'
                    : `Mulai percakapan dengan ${activeChannel.label}`}
                </div>
                <div className={styles.emptyNote}>Pesan tidak disimpan di server</div>
              </div>
            )}

            {currentMessages.map(msg => {
              const isMe = msg.senderId === currentUser?.username
              return (
                <div
                  key={msg.id}
                  className={`${styles.msg} ${isMe ? styles.msgOut : styles.msgIn}`}
                >
                  <div className={styles.msgMeta}>
                    {isMe ? 'Saya' : msg.senderName} · {formatISOTime(msg.time)}
                  </div>
                  <div className={styles.bubble}>{msg.text}</div>
                </div>
              )
            })}
            <div ref={messagesEndRef} />
          </div>

          {/* Input */}
          <div className={styles.composer}>
            <textarea
              className={`chat-input ${styles.input}`}
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
              className="ui-btn ui-btn--primary"
              onClick={sendMessage}
              disabled={!connected || !input.trim()}
            >
              Kirim
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

/* ── Unread Badge ── */
function UnreadBadge({ count }: { count: number }) {
  return <div className={styles.badge}>{count > 99 ? '99+' : count}</div>
}
