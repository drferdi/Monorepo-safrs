// Drferdi — vision, brought to life.
'use client'

import { Activity, CircleCheck, Cross, FlaskConical, Mic, RotateCcw, ShieldCheck, Sparkles, Square, Zap } from 'lucide-react'
import { useCallback, useEffect, useRef, useState } from 'react'
import { io, type Socket } from 'socket.io-client'

import { cx } from '@/components/ui/cx'

import { audreyStage, type SessionState } from './audrey-stage'
import styles from './voice.module.css'

type Message = {
  id: number
  role: 'user' | 'assistant'
  text: string
  time: string
}

function nowTime() {
  const d = new Date()
  return `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`
}

function scheduleChunk(base64: string, ctx: AudioContext, nextStartRef: { t: number }): void {
  const raw = atob(base64)
  const bytes = new Uint8Array(raw.length)
  for (let i = 0; i < raw.length; i++) bytes[i] = raw.charCodeAt(i)
  const samples = bytes.length / 2
  const float32 = new Float32Array(samples)
  const view = new DataView(bytes.buffer)
  for (let i = 0; i < samples; i++) {
    float32[i] = view.getInt16(i * 2, true) / 32768.0
  }
  const audioBuf = ctx.createBuffer(1, float32.length, 24000)
  audioBuf.getChannelData(0).set(float32)
  const source = ctx.createBufferSource()
  source.buffer = audioBuf
  source.connect(ctx.destination)
  const startAt = Math.max(ctx.currentTime + 0.005, nextStartRef.t)
  source.start(startAt)
  nextStartRef.t = startAt + audioBuf.duration
}

export default function VoicePage() {
  const [messages, setMessages] = useState<Message[]>([])
  const [sessionState, setSession] = useState<SessionState>('idle')
  const [error, setError] = useState('')
  const [liveText, setLiveText] = useState('')
  const [reducedMotion, setReducedMotion] = useState(false)
  const socketRef = useRef<Socket | null>(null)
  const recordCtxRef = useRef<AudioContext | null>(null)
  const playbackCtxRef = useRef<AudioContext | null>(null)
  const mediaStreamRef = useRef<MediaStream | null>(null)
  const workletRef = useRef<AudioWorkletNode | null>(null)
  const accTextRef = useRef('')
  const accUserTextRef = useRef('')
  const nextStartRef = useRef<{ t: number }>({ t: 0 })
  const isPttRef = useRef(false)

  type SessionUser = {
    username?: string
    displayName?: string
    profession?: string
  }

  useEffect(() => {
    return () => {
      void disconnect()
    }
    // Mount/unmount only — disconnect is stable for the lifetime of this view.
  }, [])

  const disconnect = useCallback(async () => {
    workletRef.current?.disconnect()
    workletRef.current = null
    mediaStreamRef.current?.getTracks().forEach((t) => t.stop())
    mediaStreamRef.current = null
    socketRef.current?.emit('voice:stop')
    socketRef.current?.disconnect()
    socketRef.current = null
    if (recordCtxRef.current && recordCtxRef.current.state !== 'closed') {
      await recordCtxRef.current.close()
    }
    recordCtxRef.current = null
    if (playbackCtxRef.current && playbackCtxRef.current.state !== 'closed') {
      await playbackCtxRef.current.close()
    }
    playbackCtxRef.current = null
    nextStartRef.current = { t: 0 }
    accTextRef.current = ''
    accUserTextRef.current = ''
    isPttRef.current = false
    setSession('idle')
    setLiveText('')
  }, [])

  async function setupMic(socket: Socket) {
    const ctx = recordCtxRef.current
    if (!ctx) throw new Error('setupMic called before the recording AudioContext was created')
    const stream = await navigator.mediaDevices.getUserMedia({
      audio: {
        channelCount: 1,
        echoCancellation: false,
        noiseSuppression: false,
        autoGainControl: false,
      },
      video: false,
    })
    mediaStreamRef.current = stream

    await ctx.audioWorklet.addModule('/pcm-processor.js')
    const worklet = new AudioWorkletNode(ctx, 'pcm-processor')
    workletRef.current = worklet

    const actualRate = ctx.sampleRate
    const mimeType = `audio/pcm;rate=${actualRate}`

    worklet.port.onmessage = (e: MessageEvent<ArrayBuffer>) => {
      if (!isPttRef.current) return
      const bytes = new Uint8Array(e.data)
      let binary = ''
      const CHUNK = 8192
      for (let i = 0; i < bytes.length; i += CHUNK) {
        binary += String.fromCharCode(...bytes.subarray(i, i + CHUNK))
      }
      socket.emit('voice:audio_chunk', { data: btoa(binary), mimeType })
    }

    const source = ctx.createMediaStreamSource(stream)
    source.connect(worklet)
  }

  const connect = useCallback(async () => {
    setError('')
    setSession('connecting')

    let sessionUser: SessionUser = {
      username: '',
      displayName: 'Dokter',
      profession: '',
    }
    try {
      const res = await fetch('/api/auth/session')
      const data = (await res.json()) as { user?: SessionUser } | null
      sessionUser = {
        username: data?.user?.username ?? '',
        displayName: data?.user?.displayName ?? 'Dokter',
        profession: data?.user?.profession ?? '',
      }
    } catch {
      /* pakai default */
    }

    recordCtxRef.current = new AudioContext({ sampleRate: 16000 })
    playbackCtxRef.current = new AudioContext({ sampleRate: 24000 })
    const socket = io({ path: '/socket.io', transports: ['websocket'] })
    socketRef.current = socket

    socket.on('connect', () => {
      socket.emit('voice:start', sessionUser)
    })

    socket.on('voice:ready', () => {
      setSession('ready')
      void setupMic(socket)
    })

    socket.on('voice:audio', (base64: string) => {
      setSession('speaking')
      if (playbackCtxRef.current) {
        scheduleChunk(base64, playbackCtxRef.current, nextStartRef.current)
      }
    })

    socket.on('voice:user_text', (text: string) => {
      accUserTextRef.current += text
    })

    socket.on('voice:text', (text: string) => {
      accTextRef.current += text
      setLiveText(accTextRef.current)
    })

    socket.on('voice:turn_complete', () => {
      const userText = accUserTextRef.current.trim()
      const assistantText = accTextRef.current.trim()
      if (!userText && !assistantText) {
        setSession('ready')
        return
      }
      accUserTextRef.current = ''
      accTextRef.current = ''
      nextStartRef.current = { t: 0 }
      setLiveText('')
      const time = nowTime()
      setMessages((prev) => {
        const next = [...prev]
        if (userText) next.push({ id: Date.now(), role: 'user', text: userText, time })
        if (assistantText)
          next.push({
            id: Date.now() + 1,
            role: 'assistant',
            text: assistantText,
            time,
          })
        return next
      })
      setSession('ready')
    })

    socket.on('voice:interrupted', () => {
      nextStartRef.current = { t: 0 }
      accTextRef.current = ''
      accUserTextRef.current = ''
      isPttRef.current = false
      setLiveText('')
      setSession('ready')
    })

    socket.on('voice:error', (msg: string) => {
      setError(`Connection error: ${msg}`)
      setSession('error')
    })

    socket.on('voice:closed', () => {
      setSession('idle')
    })

    socket.on('connect_error', (e) => {
      setError(`Socket error: ${e.message}`)
      setSession('error')
    })
    // Intentionally stable: this callback must not be re-created per render.
  }, [])

  const pttStart = useCallback(() => {
    if (!socketRef.current || isPttRef.current) return
    nextStartRef.current = { t: 0 }
    accTextRef.current = ''
    accUserTextRef.current = ''
    isPttRef.current = true
    socketRef.current.emit('voice:ptt_start')
    setSession('recording')
  }, [])

  const pttEnd = useCallback(() => {
    if (!isPttRef.current) return
    isPttRef.current = false
    if (socketRef.current) {
      socketRef.current.emit('voice:end_turn')
    }
    setSession('processing')
  }, [])

  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.code !== 'Space' || e.repeat) return
      if (
        (e.target as HTMLElement).tagName === 'INPUT' ||
        (e.target as HTMLElement).tagName === 'TEXTAREA'
      )
        return
      e.preventDefault()
      pttStart()
    }
    const onKeyUp = (e: KeyboardEvent) => {
      if (e.code !== 'Space') return
      pttEnd()
    }
    window.addEventListener('keydown', onKeyDown)
    window.addEventListener('keyup', onKeyUp)
    return () => {
      window.removeEventListener('keydown', onKeyDown)
      window.removeEventListener('keyup', onKeyUp)
    }
  }, [pttStart, pttEnd])

  const isConnected = !['idle', 'error', 'connecting'].includes(sessionState)
  const stage = audreyStage(sessionState)
  const toneDot = cx(styles.dot, stage.tone !== 'neutral' && styles[`tone-${stage.tone}`])

  return (
    <div className={styles.page}>
      <header className={styles.header}>
        <div className={styles.brand}>
          <div className={styles.emblem}>
            <Cross size={20} />
          </div>
          <div>
            <div className={styles.titleRow}>
              <h1 className={styles.title}>Audrey</h1>
              <span className="ui-badge ui-badge--neutral">AI companion</span>
            </div>
            <p className={styles.tagline}>Intelligence for brighter care</p>
          </div>
        </div>

        <div className={styles.actions}>
          <button
            type="button"
            className="ui-btn ui-btn--secondary ui-btn--sm"
            aria-pressed={reducedMotion}
            onClick={() => setReducedMotion((value) => !value)}
          >
            <Zap size={14} /> {reducedMotion ? 'Gerak: dijeda' : 'Gerak: aktif'}
          </button>
          {isConnected && (
            <button type="button" onClick={() => void disconnect()} className="ui-btn ui-btn--secondary ui-btn--sm">
              Putus sesi
            </button>
          )}
          <span className={styles.separator} aria-hidden="true" />
          <span className={styles.statusBadge} role="status">
            <span className={toneDot} />
            {stage.badgeLabel}
          </span>
        </div>
      </header>

      {error && (
        <div className="ui-alert ui-alert--critical" role="alert">
          {error}
        </div>
      )}

      <div className={styles.layout}>
        {/* Audrey on her stage */}
        <section className={cx(styles.card, styles.stage)}>
          <div className={styles.stageTop}>
            <span className={styles.stageState}>
              <span className={toneDot} />
              {stage.stageLabel}
            </span>
            <span className="ui-badge ui-badge--accent">
              <FlaskConical size={12} /> Alpha
            </span>
          </div>

          <div className={cx(styles.motionStage, styles[`motion-${stage.motion}`], reducedMotion && styles.still)}>
            <div className={styles.glow} />
            <div className={styles.floatBadge}>
              <Sparkles size={16} /> Pendamping klinis AI Anda
            </div>
            <div className={styles.figure}>
              <img src="/audrey.png" alt="Audrey, pendamping klinis AI" className={styles.audrey} draggable={false} />
            </div>
            <div className={styles.ring} />
            <div className={styles.ringInner} />
            <div className={styles.bubble}>
              <Activity size={14} /> {stage.bubbleLabel}
            </div>
          </div>
        </section>

        {/* Consultation stream */}
        <section className={cx(styles.card, styles.consult)}>
          <div className={styles.consultHead}>
            <div>
              <h2 className={styles.consultTitle}>Konsultasi klinis</h2>
              <p className={styles.consultSub}>
                Diferensial diagnosis, dosis, tata laksana, dan kriteria rujukan secara real-time
              </p>
            </div>
            <button
              type="button"
              onClick={() => setMessages([])}
              className={cx('ui-btn ui-btn--ghost ui-btn--sm', styles.iconBtn)}
              aria-label="Bersihkan percakapan"
              title="Bersihkan percakapan"
            >
              <RotateCcw size={16} />
            </button>
          </div>

          <div className={styles.history}>
            <div className={styles.msg}>
              <div className={styles.avatar}>A</div>
              <div className={styles.audreyBubble}>
                <div className={styles.bubbleHead}>
                  <span className={styles.bubbleName}>Audrey</span>
                </div>
                <p className={styles.bubbleText}>
                  Halo, Dokter. Saya Audrey, pendamping klinis Anda. Mulai sesi, lalu tahan tombol bicara atau
                  [Spasi] selama Anda berbicara.
                </p>
                <div className={styles.bubbleFoot}>
                  <ShieldCheck size={14} /> Keputusan klinis tetap di tangan dokter
                </div>
              </div>
            </div>

            {messages.map((msg) =>
              msg.role === 'user' ? (
                <div key={msg.id} className={cx(styles.msg, styles.msgUser)}>
                  <div className={styles.userBubble}>
                    {msg.text}
                    <span className={styles.userMeta}>Dokter · {msg.time}</span>
                  </div>
                </div>
              ) : (
                <div key={msg.id} className={styles.msg}>
                  <div className={styles.avatar}>A</div>
                  <div className={styles.audreyBubble}>
                    <div className={styles.bubbleHead}>
                      <span className={styles.bubbleName}>Audrey</span>
                      <span className={styles.bubbleTime}>{msg.time}</span>
                    </div>
                    <p className={styles.bubbleText}>{msg.text}</p>
                  </div>
                </div>
              )
            )}

            {(sessionState === 'processing' || liveText) && (
              <div className={styles.msg}>
                <div className={styles.avatar}>A</div>
                <div className={styles.audreyBubble}>
                  {liveText ? (
                    <p className={styles.bubbleText}>{liveText}</p>
                  ) : (
                    <span className={styles.pending}>
                      <span className={cx(styles.dot, styles['tone-primary'])} />
                      Audrey sedang meninjau pedoman dan rekam medis...
                    </span>
                  )}
                </div>
              </div>
            )}
          </div>

          <div className={styles.talk}>
            {isConnected ? (
              <>
                <button
                  type="button"
                  onMouseDown={pttStart}
                  onMouseUp={pttEnd}
                  onMouseLeave={pttEnd}
                  onTouchStart={(e) => {
                    e.preventDefault()
                    pttStart()
                  }}
                  onTouchEnd={pttEnd}
                  disabled={sessionState === 'processing'}
                  className={cx(
                    'ui-btn ui-btn--primary ui-btn--lg',
                    styles.talkMain,
                    sessionState === 'recording' && styles.recording
                  )}
                >
                  <Mic size={16} />
                  {sessionState === 'recording'
                    ? 'Merekam — lepas untuk kirim'
                    : sessionState === 'processing'
                      ? 'Memproses...'
                      : 'Tahan untuk bicara'}
                </button>
                {sessionState === 'speaking' && (
                  <button
                    type="button"
                    onClick={() => socketRef.current?.emit('voice:interrupt')}
                    className="ui-btn ui-btn--secondary ui-btn--lg"
                  >
                    <Square size={14} /> Interupsi
                  </button>
                )}
              </>
            ) : (
              <button
                type="button"
                onClick={() => void connect()}
                disabled={sessionState === 'connecting'}
                className={cx('ui-btn ui-btn--primary ui-btn--lg', styles.talkMain)}
              >
                <Mic size={16} />
                {sessionState === 'connecting' ? 'Menghubungkan...' : 'Mulai sesi Audrey'}
              </button>
            )}
          </div>

          <div className={styles.trust}>
            <span className={styles.trustItem}>
              <CircleCheck size={12} /> Audrey bukan pengganti keputusan klinis dokter
            </span>
          </div>
        </section>
      </div>
    </div>
  )
}
