'use client'

import { ArrowLeft } from 'lucide-react'
import Link from 'next/link'
import { useParams, useRouter } from 'next/navigation'
import { useCallback, useEffect, useRef, useState } from 'react'
import { io, type Socket } from 'socket.io-client'
import styles from '../acars.module.css'

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
      return '#002147'
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
    return <div className={styles.loading}>Memuat roster...</div>
  }

  if (error || !targetCrew) {
    return (
      <div className={styles.page}>
        <Link href="/acars" className={styles.back}>
          <ArrowLeft size={18} />
          Kembali ke Sentra Network
        </Link>
        <div className={`${styles.card} ${styles.errorCard}`}>
          {error || 'Crew tidak ditemukan.'}
        </div>
      </div>
    )
  }

  const targetColor = getUserColor(targetCrew.role)
  const targetAvatar = getAvatarUrl(targetCrew.profession, targetCrew.role)

  return (
    <div className={styles.page}>
      {/* Header */}
      <div className={styles.topbar}>
        <Link href="/acars" className={styles.back}>
          <ArrowLeft size={18} />
          Kembali ke Sentra Network
        </Link>
        <span className={`ui-badge ${connected ? 'ui-badge--success' : 'ui-badge--neutral'}`}>
          {connected ? 'LIVE' : 'OFFLINE'}
        </span>
      </div>

      {/* Roster Detail Card */}
      <div className={`${styles.card} ${styles.detail}`}>
        <div className={styles.detailHead}>
          <div className={styles.detailAvatar} style={{ boxShadow: `0 0 0 3px ${targetColor}` }}>
            <img src={targetAvatar} alt="" width={80} height={80} />
          </div>
          <div>
            <div className={styles.detailName}>{targetCrew.fullName}</div>
            <div className={styles.detailLine}>@{targetCrew.username}</div>
            <div className={styles.detailLine} style={{ color: targetColor }}>
              {targetCrew.profession || targetCrew.role}
            </div>
            {targetCrew.institution && (
              <div className={styles.cellMuted}>{targetCrew.institution}</div>
            )}
          </div>
        </div>

        {/* DM Chat */}
        <div className={styles.dm}>
          <div className={styles.dmTitle}>PESAN LANGSUNG</div>
          <div ref={messagesListRef} className={styles.messages}>
            {messages.length === 0 && (
              <div className={styles.empty}>
                Belum ada pesan. Mulai percakapan dengan {targetCrew.fullName}.
              </div>
            )}
            {messages.map(msg => {
              const isMe = currentUser && msg.senderId === currentUser.username
              return (
                <div key={msg.id} className={`${styles.msg}${isMe ? ` ${styles.msgMine}` : ''}`}>
                  <div className={styles.msgMeta}>
                    {isMe ? 'Anda' : msg.senderName} ·{' '}
                    {new Date(msg.time).toLocaleTimeString('id-ID', {
                      hour: '2-digit',
                      minute: '2-digit',
                    })}
                  </div>
                  <div className={styles.msgText}>{msg.text}</div>
                </div>
              )
            })}
          </div>

          <div className={styles.composer}>
            <input
              type="text"
              className="ui-input"
              value={input}
              onChange={e => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder={`Kirim pesan ke ${targetCrew.fullName}...`}
              disabled={!connected}
            />
            <button
              className="ui-btn ui-btn--primary"
              onClick={sendMessage}
              disabled={!input.trim() || !connected}
            >
              Kirim
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
