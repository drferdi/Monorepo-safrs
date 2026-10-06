// Drferdi — vision, brought to life.
'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import { io, type Socket } from 'socket.io-client'

type Message = {
  id: number
  role: 'user' | 'assistant'
  text: string
  time: string
}

type SessionState =
  | 'idle'
  | 'connecting'
  | 'ready'
  | 'recording'
  | 'processing'
  | 'speaking'
  | 'error'

const PIPELINE_STEPS = [
  { n: 'Real Clinical Data', sub: 'IGD · Poli · Puskesmas', connector: true },
  {
    n: 'DATA CURATION',
    sub: 'dr. Ferdi review & annotation\nPHI scrubbing · Quality gate',
    connector: true,
  },
  {
    n: 'DOMAIN CORPUS',
    sub: 'SOAP notes · Discharge summaries\nClinical Q&A · Protocol texts',
    connector: true,
  },
  {
    n: 'MEDGEMMA GROUNDING',
    sub: 'Local medical grounding\nMedical concept alignment\nICD-10 · SNOMED · BPJS coding',
    connector: true,
  },
  {
    n: 'LOCAL SFT',
    sub: 'Local training pipeline\nPEFT / LoRA · Indonesian medical',
    connector: true,
  },
  {
    n: 'RLHF ALIGNMENT',
    sub: 'Human: dr. Ferdi (clinical steward)\nReward model on clinical accuracy',
    connector: true,
  },
  {
    n: 'EVALUATION & SAFETY',
    sub: 'Clinical accuracy benchmarking\nPHI leak detection · Hallucination rate',
    connector: true,
  },
  { n: 'Audrey PRODUCTION MODEL', sub: '', connector: false, highlight: true },
] as const

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
  const accentTone = '#101012'
  const accentToneSoft = 'rgba(16,16,18,0.08)'
  const accentToneBorder = 'rgba(16,16,18,0.22)'
  const accentNeumorph = '3px 3px 10px rgba(0,0,0,0.24), inset 1px 1px 0 rgba(255,255,255,0.04)'
  const [messages, setMessages] = useState<Message[]>([])
  const [sessionState, setSession] = useState<SessionState>('idle')
  const [error, setError] = useState('')
  const [liveText, setLiveText] = useState('')
  const [visiblePipeline, setVisiblePipeline] = useState(0)
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

  // Pipeline reveal — tiru pola PatientFlowDiagram di telemedicine
  useEffect(() => {
    setVisiblePipeline(0)
    const timer = setInterval(() => {
      setVisiblePipeline((prev) => (prev >= PIPELINE_STEPS.length ? prev : prev + 1))
    }, 180)
    return () => clearInterval(timer)
  }, [])

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

  /* ─────────── STATUS HELPERS ─────────── */
  const statusColor =
    sessionState === 'recording'
      ? 'rgba(220,38,38,0.9)'
      : sessionState === 'speaking'
        ? accentTone
        : sessionState === 'error'
          ? 'var(--c-critical)'
          : 'var(--text-muted)'

  const dotColor =
    sessionState === 'recording'
      ? 'rgba(220,38,38,0.9)'
      : sessionState === 'speaking'
        ? accentTone
        : sessionState === 'ready'
          ? 'rgba(74,222,128,0.85)'
          : sessionState === 'error'
            ? 'var(--c-critical)'
            : 'var(--text-muted)'

  const statusLabel =
    sessionState === 'ready'
      ? 'Siap — tahan tombol atau [SPACE] untuk bicara'
      : sessionState === 'recording'
        ? 'Merekam — lepas untuk kirim ke Audrey'
        : sessionState === 'processing'
          ? 'Mengirim ke Audrey...'
          : sessionState === 'speaking'
            ? 'Audrey sedang berbicara'
            : ''

  return (
    <div style={{ width: '100%', maxWidth: 1240 }}>
      {/* ── Animations ── */}
      <style>{`
        @keyframes v-spin    { to { transform: rotate(360deg); } }
        @keyframes v-dot     { 0%,100% { opacity: 1; } 50% { opacity: 0.25; } }
        @keyframes v-rec-btn { 0%,100% { box-shadow: 0 0 0 0 rgba(220,38,38,0.35); }
                               50%  { box-shadow: 0 0 0 18px rgba(220,38,38,0); } }
        @keyframes v-speak   { 0%,100% { box-shadow: 0 0 0 0 rgba(16,16,18,0.28); }
                               50%  { box-shadow: 0 0 0 14px rgba(16,16,18,0); } }
        @keyframes v-msg-in  { from { opacity: 0; transform: translateY(5px); }
                               to   { opacity: 1; transform: translateY(0); } }
        .v-msg-in { animation: v-msg-in 0.22s ease forwards; }
      `}</style>

      <div style={{ display: 'flex', gap: 32, alignItems: 'flex-start' }}>
        {/* ════════════ LEFT COLUMN ════════════ */}
        <div
          style={{
            flex: '1 1 0',
            minWidth: 0,
            display: 'flex',
            flexDirection: 'column',
          }}
        >
          <div
            className="page-header"
            style={{ maxWidth: '100%', width: '100%', marginBottom: 28 }}
          >
            <div className="page-title">Consult Audrey</div>
            <div className="page-subtitle">
              Clinical AI · voice consultation · Sentra healthcare solutions
            </div>
            <div className="page-header-divider" />
            <div
              className="page-header-badges"
              style={{ justifyContent: 'flex-end', marginTop: 14 }}
            >
              {isConnected && (
                <button
                  onClick={() => void disconnect()}
                  style={{
                    fontSize: 11,
                    padding: '6px 14px',
                    background: 'none',
                    border: '1px solid var(--c-critical)',
                    color: 'var(--c-critical)',
                    cursor: 'pointer',
                  }}
                >
                  PUTUS SESI
                </button>
              )}
              <button
                onClick={() => setMessages([])}
                style={{
                  fontSize: 11,
                  padding: '6px 14px',
                  background: 'none',
                  border: '1px solid var(--line-base)',
                  color: 'var(--text-muted)',
                  cursor: 'pointer',
                }}
              >
                RESET
              </button>
            </div>
          </div>

          {/* Error banner */}
          {error && (
            <div
              style={{
                marginBottom: 20,
                padding: '10px 14px',
                border: '1px solid var(--c-critical)',
                fontSize: 13,
                color: 'var(--c-critical)',
                display: 'flex',
                alignItems: 'center',
                gap: 8,
              }}
            >
              <span>⚠</span> {error}
            </div>
          )}

          {/* ── IDLE / ERROR — Connect zone ── */}
          {(sessionState === 'idle' || sessionState === 'error') && (
            <div
              style={{
                display: 'flex',
                alignItems: 'flex-start',
                gap: 32,
                marginBottom: 32,
              }}
            >
              {/* Podcast avatar */}
              <div style={{ flexShrink: 0 }}>
                <img
                  src="/avatar/podcast.png"
                  alt="Audrey"
                  style={{
                    display: 'block',
                    width: 150,
                    height: 'auto',
                    mixBlendMode: 'screen',
                    opacity: 0.88,
                  }}
                />
              </div>

              {/* Right: text + CTA + instructions */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                <div>
                  <div
                    style={{
                      fontSize: 20,
                      fontWeight: 600,
                      color: 'var(--text-main)',
                      marginBottom: 6,
                      lineHeight: 1.3,
                    }}
                  >
                    Audrey siap mendampingi
                  </div>
                  <div
                    style={{
                      fontSize: 13,
                      color: 'var(--text-muted)',
                      lineHeight: 1.7,
                      maxWidth: 420,
                    }}
                  >
                    Clinical AI real-time untuk konsultasi dokter — diferensial diagnosis, dosis,
                    tata laksana, dan kriteria rujukan dalam konteks Puskesmas PONED Balowerti.
                  </div>
                </div>

                <button
                  onClick={() => void connect()}
                  style={{
                    alignSelf: 'flex-start',
                    padding: '13px 32px',
                    background: accentTone,
                    border: '1px solid rgba(255,255,255,0.06)',
                    color: '#fff',
                    fontSize: 13,
                    fontWeight: 600,
                    cursor: 'pointer',
                    boxShadow: accentNeumorph,
                    transition: 'opacity 0.15s',
                  }}
                  onMouseEnter={(e) => (e.currentTarget.style.opacity = '0.85')}
                  onMouseLeave={(e) => (e.currentTarget.style.opacity = '1')}
                >
                  ▶ MULAI SESI AUDREY
                </button>

                <div
                  style={{
                    display: 'flex',
                    flexDirection: 'column',
                    gap: 5,
                    fontSize: 13,
                    color: 'var(--text-muted)',
                    lineHeight: 1.7,
                  }}
                >
                  <div>Klik tombol untuk memulai sesi</div>
                  <div>
                    <strong style={{ color: 'var(--text-main)' }}>Tahan</strong> tombol mikrofon
                    atau [SPACE] saat ingin bicara
                  </div>
                  <div>
                    <strong style={{ color: 'var(--text-main)' }}>Lepas</strong> saat selesai —
                    Audrey akan merespons secara otomatis
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* ── CONNECTING ── */}
          {sessionState === 'connecting' && (
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 12,
                marginBottom: 32,
                color: 'var(--text-muted)',
                fontSize: 13,
              }}
            >
              <div
                style={{
                  width: 18,
                  height: 18,
                  flexShrink: 0,
                  border: `2px solid ${accentToneBorder}`,
                  borderTop: `2px solid ${accentTone}`,
                  borderRadius: '50%',
                  animation: 'v-spin 0.85s linear infinite',
                }}
              />
              Mempersiapkan sesi klinis dengan Audrey...
            </div>
          )}

          {/* ── ACTIVE SESSION ── */}
          {isConnected && (
            <div
              style={{
                display: 'flex',
                flexDirection: 'column',
                gap: 16,
                marginBottom: 28,
              }}
            >
              {/* Status indicator */}
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 10,
                  fontSize: 13,
                  color: statusColor,
                }}
              >
                <span
                  style={{
                    width: 8,
                    height: 8,
                    borderRadius: '50%',
                    flexShrink: 0,
                    background: dotColor,
                    animation: ['recording', 'speaking'].includes(sessionState)
                      ? 'v-dot 0.9s ease-in-out infinite'
                      : 'none',
                  }}
                />
                {statusLabel}
              </div>

              {/* PTT Button */}
              <button
                onMouseDown={pttStart}
                onMouseUp={pttEnd}
                onMouseLeave={pttEnd}
                onTouchStart={(e) => {
                  e.preventDefault()
                  pttStart()
                }}
                onTouchEnd={pttEnd}
                disabled={sessionState === 'processing'}
                style={{
                  maxWidth: 500,
                  padding: '20px 28px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: 16,
                  background: sessionState === 'recording' ? 'rgba(220,38,38,0.09)' : 'transparent',
                  border: `2px solid ${sessionState === 'recording' ? 'rgba(220,38,38,0.75)' : accentTone}`,
                  color: sessionState === 'recording' ? 'rgba(220,38,38,0.9)' : accentTone,
                  cursor: sessionState === 'processing' ? 'wait' : 'pointer',
                  fontSize: 13,
                  fontWeight: 600,
                  userSelect: 'none',
                  WebkitUserSelect: 'none',
                  transition: 'all 0.12s ease',
                  opacity: sessionState === 'processing' ? 0.4 : 1,
                  animation:
                    sessionState === 'recording'
                      ? 'v-rec-btn 0.85s ease-in-out infinite'
                      : sessionState === 'speaking'
                        ? 'v-speak 1.4s ease-in-out infinite'
                        : 'none',
                }}
              >
                <span style={{ fontSize: 20, lineHeight: 1 }}>
                  {sessionState === 'recording' ? '🔴' : '🎙'}
                </span>
                {sessionState === 'recording'
                  ? 'MEREKAM — Lepas untuk kirim'
                  : sessionState === 'processing'
                    ? 'MEMPROSES...'
                    : 'TAHAN UNTUK BICARA'}
              </button>

              {/* Interrupt */}
              {sessionState === 'speaking' && (
                <button
                  onClick={() => socketRef.current?.emit('voice:interrupt')}
                  style={{
                    alignSelf: 'flex-start',
                    fontSize: 11,
                    padding: '5px 12px',
                    background: 'none',
                    cursor: 'pointer',
                    border: '1px solid var(--text-muted)',
                    color: 'var(--text-muted)',
                  }}
                >
                  INTERUPSI
                </button>
              )}

              {/* Live transcript */}
              {liveText && (
                <div
                  style={{
                    maxWidth: 500,
                    padding: '10px 14px',
                    border: `1px solid ${accentTone}`,
                    fontSize: 13,
                    color: 'var(--text-main)',
                    fontStyle: 'italic',
                    opacity: 0.88,
                    lineHeight: 1.7,
                  }}
                >
                  {liveText}
                </div>
              )}
            </div>
          )}

          {/* ── CHAT TRANSCRIPT ── */}
          <div
            style={{
              borderTop: '1px solid var(--line-base)',
              paddingTop: 16,
              marginBottom: 20,
              maxHeight: 420,
              overflowY: 'auto',
              display: 'flex',
              flexDirection: 'column',
            }}
          >
            {messages.length === 0 ? (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
                <div
                  style={{
                    padding: '40px 0',
                    textAlign: 'center',
                    fontSize: 13,
                    color: 'var(--text-muted)',
                    opacity: 0.38,
                  }}
                >
                  — BELUM ADA PERCAKAPAN —
                  <div style={{ marginTop: 6, fontSize: 13, opacity: 0.85 }}>
                    Hubungkan sesi, lalu bicara langsung dengan Audrey
                  </div>
                </div>

                {/* TENTANG AUDREY — muncul saat chat kosong */}
                <div
                  style={{
                    padding: '16px 20px',
                    border: '1px solid var(--line-base)',
                    borderLeft: `2px solid ${accentTone}`,
                    display: 'flex',
                    flexDirection: 'column',
                    gap: 10,
                  }}
                >
                  <div>
                    <span
                      style={{
                        display: 'inline-flex',
                        alignItems: 'center',
                        padding: '5px 10px',
                        fontSize: 11,
                        color: '#f1ece3',
                        background: accentTone,
                        border: '1px solid rgba(255,255,255,0.06)',
                        boxShadow: accentNeumorph,
                        borderRadius: 999,
                      }}
                    >
                      TENTANG AUDREY
                    </span>
                  </div>
                  <div
                    style={{
                      fontSize: 13,
                      fontWeight: 600,
                      color: 'var(--text-main)',
                      lineHeight: 1.4,
                    }}
                  >
                    Augmented Universal Diagnostic Reasoning Engine for You
                  </div>
                  <div
                    style={{
                      fontSize: 13,
                      color: 'var(--text-muted)',
                      lineHeight: 1.7,
                    }}
                  >
                    Clinical AI oleh{' '}
                    <strong style={{ color: 'var(--text-main)' }}>dr. Ferdi Iskandar</strong> —
                    bagian dari ekosistem <strong>AADI</strong> Sentra Healthcare Solutions.
                    Mendampingi dokter secara real-time selama encounter klinis.
                  </div>
                  <div
                    style={{
                      padding: '7px 12px',
                      background: accentToneSoft,
                      borderLeft: `2px solid ${accentTone}`,
                      fontSize: 13,
                      color: '#ffffff',
                      lineHeight: 1.5,
                      fontStyle: 'italic',
                    }}
                  >
                    &ldquo;Technology enables, but humans decide.&rdquo;
                  </div>
                </div>
              </div>
            ) : (
              messages.map((msg, i) => {
                const isUser = msg.role === 'user'
                const prevSame = i > 0 && messages[i - 1].role === msg.role
                return (
                  <div
                    key={msg.id}
                    className="v-msg-in"
                    style={{
                      display: 'flex',
                      flexDirection: isUser ? 'row-reverse' : 'row',
                      alignItems: 'flex-end',
                      gap: 10,
                      paddingTop: prevSame ? 4 : 20,
                      paddingBottom: 4,
                    }}
                  >
                    <div
                      style={{
                        width: 26,
                        flexShrink: 0,
                        display: 'flex',
                        justifyContent: 'center',
                        visibility: prevSame ? 'hidden' : 'visible',
                      }}
                    >
                      <div
                        style={{
                          width: 26,
                          height: 26,
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          background: isUser ? accentTone : 'var(--line-base)',
                          fontSize: 11,
                          letterSpacing: '0.04em',
                          color: isUser ? '#fff' : 'var(--text-muted)',
                        }}
                      >
                        {isUser ? 'DR' : 'AI'}
                      </div>
                    </div>
                    <div
                      style={{
                        maxWidth: '72%',
                        display: 'flex',
                        flexDirection: 'column',
                        gap: 3,
                        alignItems: isUser ? 'flex-end' : 'flex-start',
                      }}
                    >
                      <div
                        style={{
                          padding: '10px 14px',
                          background: isUser ? accentTone : 'var(--bg-nav)',
                          border: isUser ? 'none' : '1px solid var(--line-base)',
                          color: isUser ? '#fff' : 'var(--text-main)',
                          fontSize: 13,
                          lineHeight: 1.7,
                          whiteSpace: 'pre-wrap',
                          borderRadius: isUser ? '12px 12px 2px 12px' : '12px 12px 12px 2px',
                        }}
                      >
                        {msg.text}
                      </div>
                      {(i === messages.length - 1 || messages[i + 1]?.role !== msg.role) && (
                        <div
                          style={{
                            fontSize: 11,
                            color: 'var(--text-muted)',
                            letterSpacing: '0.04em',
                            opacity: 0.55,
                            paddingLeft: isUser ? 0 : 2,
                            paddingRight: isUser ? 2 : 0,
                          }}
                        >
                          {isUser ? 'Dokter' : 'Audrey'} · {msg.time}
                        </div>
                      )}
                    </div>
                  </div>
                )
              })
            )}
          </div>

          {/* Disclaimer */}
          <div
            style={{
              marginBottom: 10,
              padding: '10px 16px',
              border: '1px solid var(--line-base)',
              borderLeft: `3px solid ${accentTone}`,
              fontSize: 13,
              color: 'var(--text-muted)',
              lineHeight: 1.6,
            }}
          >
            <span style={{ color: 'var(--text-main)', fontWeight: 500 }}>
              Audrey bukan pengganti keputusan klinis dokter.
            </span>{' '}
            Seluruh keputusan klinis tetap menjadi tanggung jawab penuh dokter yang bertugas.
            <span
              style={{
                display: 'block',
                marginTop: 4,
                fontSize: 11,
                color: '#ffffff',
              }}
            >
              SENTRA HEALTHCARE SOLUTIONS
            </span>
          </div>

          {/* Alpha badge */}
          <div
            style={{
              padding: '8px 14px',
              background: accentToneSoft,
              border: `1px solid ${accentToneBorder}`,
              display: 'flex',
              alignItems: 'center',
              gap: 10,
            }}
          >
            <span
              style={{
                fontSize: 11,
                color: '#f1ece3',
                flexShrink: 0,
                padding: '5px 10px',
                background: accentTone,
                border: '1px solid rgba(255,255,255,0.06)',
                boxShadow: accentNeumorph,
                borderRadius: 999,
              }}
            >
              ◈ ALPHA
            </span>
            <span
              style={{
                fontSize: 13,
                color: 'var(--text-muted)',
                lineHeight: 1.6,
              }}
            >
              Fitur ini masih dalam tahap pengembangan aktif. Performa, akurasi, dan stabilitas
              dapat berubah sewaktu-waktu.
            </span>
          </div>
        </div>
        {/* end left column */}

        {/* ════════════ RIGHT COLUMN ════════════ */}
        <div
          style={{
            width: 256,
            flexShrink: 0,
            borderLeft: '1px solid var(--line-base)',
            paddingLeft: 20,
            display: 'flex',
            flexDirection: 'column',
          }}
        >
          {/* Fine-tuning pipeline */}
          <div style={{ textAlign: 'center' }}>
            <div style={{ marginBottom: 12, textAlign: 'center' }}>
              <span
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  padding: '6px 12px',
                  fontSize: 13,
                  color: '#f1ece3',
                  background: accentTone,
                  border: '1px solid rgba(255,255,255,0.06)',
                  boxShadow: accentNeumorph,
                  borderRadius: 999,
                }}
              >
                FINE-TUNING PIPELINE
              </span>
            </div>

            {PIPELINE_STEPS.map((step, i) => (
              <div
                key={i}
                style={{
                  opacity: i < visiblePipeline ? 1 : 0,
                  transform: i < visiblePipeline ? 'translateY(0)' : 'translateY(8px)',
                  transition: 'all 0.4s cubic-bezier(0.16, 1, 0.3, 1)',
                }}
              >
                <div
                  style={{
                    padding: '7px 10px',
                    border: '1px dashed var(--line-base)',
                    background: 'transparent',
                    textAlign: 'center',
                  }}
                >
                  <div
                    style={{
                      fontSize: 13,
                      color: 'var(--text-main)',
                      fontWeight: 400,
                      marginBottom: step.sub ? 3 : 0,
                    }}
                  >
                    {'link' in step ? (
                      <a
                        href={typeof step.link === 'string' ? step.link : undefined}
                        target="_blank"
                        rel="noopener noreferrer"
                        style={{
                          color: 'inherit',
                          textDecoration: 'underline',
                          textUnderlineOffset: 3,
                        }}
                      >
                        {step.n}
                      </a>
                    ) : (
                      step.n
                    )}
                  </div>
                  {step.sub && (
                    <div
                      style={{
                        fontSize: 13,
                        color: 'var(--text-muted)',
                        whiteSpace: 'pre-line',
                        lineHeight: 1.5,
                        opacity: 0.8,
                        textAlign: 'center',
                      }}
                    >
                      {step.sub}
                    </div>
                  )}
                </div>

                {step.connector && (
                  <div
                    style={{
                      display: 'flex',
                      flexDirection: 'column',
                      alignItems: 'center',
                      height: 14,
                      justifyContent: 'center',
                    }}
                  >
                    <div
                      style={{
                        width: 1,
                        height: 8,
                        background: 'var(--line-base)',
                      }}
                    />
                    <div
                      style={{
                        width: 0,
                        height: 0,
                        borderLeft: '3px solid transparent',
                        borderRight: '3px solid transparent',
                        borderTop: '4px solid var(--line-base)',
                      }}
                    />
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
        {/* end right column */}
      </div>
    </div>
  )
}
