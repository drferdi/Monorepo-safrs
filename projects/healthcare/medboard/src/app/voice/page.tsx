// Drferdi — vision, brought to life.
'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import { io, type Socket } from 'socket.io-client'

import styles from './voice.module.css'

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
    sessionState === 'recording' || sessionState === 'error'
      ? 'var(--critical)'
      : sessionState === 'speaking'
        ? 'var(--primary)'
        : 'var(--text-secondary)'

  const dotColor =
    sessionState === 'recording' || sessionState === 'error'
      ? 'var(--critical)'
      : sessionState === 'speaking'
        ? 'var(--primary)'
        : sessionState === 'ready'
          ? 'var(--success)'
          : 'var(--text-secondary)'

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
    <div className={styles.page}>
      <div className={styles.header}>
        <div>
          <h1 className={styles.title}>Consult Audrey</h1>
          <p className={styles.subtitle}>
            Clinical AI · voice consultation · Sentra healthcare solutions
          </p>
        </div>
        <div className={styles.actions}>
          {isConnected && (
            <button
              onClick={() => void disconnect()}
              className={`ui-btn ui-btn--secondary ${styles.disconnect}`}
            >
              PUTUS SESI
            </button>
          )}
          <button onClick={() => setMessages([])} className="ui-btn ui-btn--secondary">
            RESET
          </button>
        </div>
      </div>

      {/* Error banner */}
      {error && (
        <div className="ui-alert ui-alert--critical" role="alert">
          {error}
        </div>
      )}

      <section className={styles.card}>
        {/* ── IDLE / ERROR — Connect zone ── */}
        {(sessionState === 'idle' || sessionState === 'error') && (
          <div className={styles.intro}>
            <h2 className={styles.cardTitle}>Audrey siap mendampingi</h2>
            <p className={styles.text}>
              Clinical AI real-time untuk konsultasi dokter — diferensial diagnosis, dosis, tata
              laksana, dan kriteria rujukan dalam konteks Puskesmas PONED Balowerti.
            </p>

            <button onClick={() => void connect()} className="ui-btn ui-btn--primary ui-btn--lg">
              ▶ MULAI SESI AUDREY
            </button>

            <ul className={styles.steps}>
              <li>Klik tombol untuk memulai sesi</li>
              <li>
                <span className={styles.strong}>Tahan</span> tombol mikrofon atau [SPACE] saat ingin
                bicara
              </li>
              <li>
                <span className={styles.strong}>Lepas</span> saat selesai — Audrey akan merespons
                secara otomatis
              </li>
            </ul>
          </div>
        )}

        {/* ── CONNECTING ── */}
        {sessionState === 'connecting' && (
          <div className={styles.connecting}>
            <div className={styles.spinner} />
            Mempersiapkan sesi klinis dengan Audrey...
          </div>
        )}

        {/* ── ACTIVE SESSION ── */}
        {isConnected && (
          <div className={styles.session}>
            {/* Status indicator */}
            <div className={styles.status} style={{ color: statusColor }}>
              <span className={styles.dot} style={{ background: dotColor }} />
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
              className={`ui-btn ${sessionState === 'recording' ? 'ui-btn--secondary' : 'ui-btn--primary'} ${styles.ptt} ${sessionState === 'recording' ? styles.pttRecording : ''}`}
            >
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
                className="ui-btn ui-btn--secondary ui-btn--sm"
              >
                INTERUPSI
              </button>
            )}

            {/* Live transcript */}
            {liveText && <p className={styles.live}>{liveText}</p>}
          </div>
        )}

        <hr className={styles.divider} />

        {/* ── CHAT TRANSCRIPT ── */}
        <div className={styles.transcript}>
          {messages.length === 0 ? (
            <div className={styles.empty}>
              <div className={styles.emptyText}>
                — BELUM ADA PERCAKAPAN —
                <div className={styles.emptyHint}>
                  Hubungkan sesi, lalu bicara langsung dengan Audrey
                </div>
              </div>

              {/* TENTANG AUDREY — muncul saat chat kosong */}
              <div className={styles.about}>
                <span className="ui-badge ui-badge--neutral">TENTANG AUDREY</span>
                <div className={styles.aboutName}>
                  Augmented Universal Diagnostic Reasoning Engine for You
                </div>
                <p className={styles.text}>
                  Clinical AI oleh <span className={styles.strong}>dr. Ferdi Iskandar</span> —
                  bagian dari ekosistem <span className={styles.strong}>AADI</span> Sentra
                  Healthcare Solutions. Mendampingi dokter secara real-time selama encounter
                  klinis.
                </p>
                <p className={styles.quote}>&ldquo;Technology enables, but humans decide.&rdquo;</p>
              </div>
            </div>
          ) : (
            messages.map((msg, i) => {
              const isUser = msg.role === 'user'
              const prevSame = i > 0 && messages[i - 1].role === msg.role
              return (
                <div
                  key={msg.id}
                  className={`${styles.msg} ${isUser ? styles.msgUser : ''}`}
                  style={{ paddingTop: prevSame ? 4 : 20 }}
                >
                  <div
                    className={`${styles.avatar} ${isUser ? styles.avatarUser : ''}`}
                    style={{ visibility: prevSame ? 'hidden' : 'visible' }}
                  >
                    {isUser ? 'DR' : 'AI'}
                  </div>
                  <div className={`${styles.msgBody} ${isUser ? styles.msgBodyUser : ''}`}>
                    <div className={`${styles.bubble} ${isUser ? styles.bubbleUser : ''}`}>
                      {msg.text}
                    </div>
                    {(i === messages.length - 1 || messages[i + 1]?.role !== msg.role) && (
                      <div className={styles.time}>
                        {isUser ? 'Dokter' : 'Audrey'} · {msg.time}
                      </div>
                    )}
                  </div>
                </div>
              )
            })
          )}
        </div>
      </section>

      {/* Fine-tuning pipeline */}
      <section className={styles.card}>
        <h2 className={styles.cardTitle}>FINE-TUNING PIPELINE</h2>
        <ol className={styles.pipeline}>
          {PIPELINE_STEPS.map((step, i) => (
            <li key={i} className={styles.step} style={{ opacity: i < visiblePipeline ? 1 : 0 }}>
              <div
                className={`${styles.stepName} ${'highlight' in step ? styles.stepHighlight : ''}`}
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
              {step.sub && <div className={styles.stepSub}>{step.sub}</div>}
            </li>
          ))}
        </ol>
      </section>

      {/* Disclaimer + alpha notice */}
      <section className={styles.card}>
        <div className={styles.notes}>
          <div className={styles.note}>
            <div className={styles.text}>
              <span className={styles.strong}>Audrey bukan pengganti keputusan klinis dokter.</span>{' '}
              Seluruh keputusan klinis tetap menjadi tanggung jawab penuh dokter yang bertugas.
            </div>
            <div className={styles.noteMeta}>SENTRA HEALTHCARE SOLUTIONS</div>
          </div>
          <div className={styles.noteRow}>
            <span className="ui-badge ui-badge--accent">◈ ALPHA</span>
            <span className={styles.text}>
              Fitur ini masih dalam tahap pengembangan aktif. Performa, akurasi, dan stabilitas
              dapat berubah sewaktu-waktu.
            </span>
          </div>
        </div>
      </section>
    </div>
  )
}
