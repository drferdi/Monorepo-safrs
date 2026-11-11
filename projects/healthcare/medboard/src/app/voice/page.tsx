// Drferdi — vision, brought to life.
'use client'

import { Mic, RotateCcw, SendHorizontal, ShieldCheck, Square, Zap } from 'lucide-react'
import { useCallback, useEffect, useRef, useState } from 'react'
import { io, type Socket } from 'socket.io-client'

import { cx } from '@/components/ui/cx'

import { AUDREY_NAME, AUDREY_PILLARS, audreyExpansion } from './audrey-identity'
import { audreyStage, type SessionState } from './audrey-stage'
import { AudreyOrb } from './AudreyOrb'
import { AUDREY_TEMPLATES, firstSlot } from './audrey-templates'
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
  const [chat, setChat] = useState<Message[]>([])
  const [chatInput, setChatInput] = useState('')
  const [chatLoading, setChatLoading] = useState(false)
  const [chatError, setChatError] = useState('')
  const chatInputRef = useRef<HTMLTextAreaElement>(null)
  const [pendingSelection, setPendingSelection] = useState<{ start: number; end: number } | null>(null)
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
      // Space types in the chat and presses a focused button; it is push-to-talk everywhere else.
      if (
        e.target instanceof HTMLInputElement ||
        e.target instanceof HTMLTextAreaElement ||
        e.target instanceof HTMLButtonElement
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

  async function sendChat() {
    const text = chatInput.trim()
    if (!text || chatLoading) return
    const userMsg: Message = { id: Date.now(), role: 'user', text, time: nowTime() }
    const next = [...chat, userMsg]
    setChat(next)
    setChatInput('')
    setChatError('')
    setChatLoading(true)
    try {
      const res = await fetch('/api/perplexity', {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ messages: next.map((msg) => ({ role: msg.role, content: msg.text })) }),
      })
      const data = (await res.json()) as { ok: boolean; reply?: string; error?: string }
      if (!data.ok) setChatError(data.error ?? 'Gagal mendapat respons.')
      else setChat([...next, { id: Date.now() + 1, role: 'assistant', text: data.reply ?? '', time: nowTime() }])
    } catch {
      setChatError('Tidak dapat terhubung ke server.')
    } finally {
      setChatLoading(false)
    }
  }

  function applyTemplate(text: string) {
    setChatInput(text)
    setPendingSelection(firstSlot(text) ?? { start: text.length, end: text.length })
  }

  // Once the template is in the field, select its first slot so the doctor types over it.
  useEffect(() => {
    if (!pendingSelection) return
    const input = chatInputRef.current
    input?.focus()
    input?.setSelectionRange(pendingSelection.start, pendingSelection.end)
    setPendingSelection(null)
  }, [pendingSelection])

  const isConnected = !['idle', 'error', 'connecting'].includes(sessionState)
  const stage = audreyStage(sessionState)
  const toneDot = cx(styles.dot, stage.tone !== 'neutral' && styles[`tone-${stage.tone}`])

  return (
    <div className={styles.page}>
      <header className={styles.header}>
        <div className={styles.identity}>
          <img src="/audrey.png" alt="" className={styles.avatarImg} draggable={false} />
          <div>
            <h1 className={styles.title}>Audrey</h1>
            <span className={styles.status} role="status">
              <span className={toneDot} />
              {stage.badgeLabel}
            </span>
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
        </div>
      </header>

      {/* Who Audrey is, in Swiss style: one rule, an asymmetric grid, type only */}
      <section className={styles.intro} aria-label="Tentang Audrey">
        <div className={styles.introName}>
          <p className={styles.wordmark}>AUDREY</p>
          <p className={styles.acronym} role="img" aria-label={audreyExpansion()}>
            {AUDREY_NAME.map((part) => (
              <span key={part.word} className={styles.part}>
                {part.before ? `${part.before} ` : null}
                <span className={styles.initial}>{part.word[0]}</span>
                {part.word.slice(1)}
              </span>
            ))}
          </p>
        </div>
        <div className={styles.introBody}>
          <p className={styles.about}>
            AUDREY adalah entitas kecerdasan augmented tingkat klinis yang di design dan di kembangkan oleh{' '}
            <a className={styles.aboutLink} href="https://ferdiiskandar.com" target="_blank" rel="noopener noreferrer">
              dr Ferdi Iskandar
            </a>
            ,
            memadukan penalaran medis berbasis bukti (evidence-based) dengan dukungan diagnostik real-time, menghadirkan
            wawasan setara dokter, terskala secara universal, dan terkalibrasi secara budaya untuk Indonesia.
          </p>
        </div>
        <ol className={styles.pillars}>
          {AUDREY_PILLARS.map((pillar, i) => (
            <li key={pillar}>
              <span className={styles.pillarIndex}>{String(i + 1).padStart(2, '0')}</span>
              {pillar}
            </li>
          ))}
        </ol>
      </section>

      <div className={styles.layout}>
        {/* Chat: typed questions, with templates for the common ones */}
        <section className={cx(styles.card, styles.chat)}>
          <div className={styles.cardHead}>
            <h2 className={styles.cardTitle}>Chat</h2>
            <button
              type="button"
              onClick={() => {
                setChat([])
                setChatError('')
              }}
              className={cx('ui-btn ui-btn--ghost ui-btn--sm', styles.iconBtn)}
              aria-label="Bersihkan chat"
              title="Bersihkan chat"
            >
              <RotateCcw size={16} />
            </button>
          </div>

          <div className={styles.history}>
            {chat.length === 0 && !chatLoading ? (
              <p className={styles.empty}>
                Tanyakan dosis obat, penyakit, diagnosis banding, atau kriteria rujukan. Pilih template di bawah untuk
                mulai lebih cepat.
              </p>
            ) : null}
            {chat.map((msg) => (
              <MessageRow key={msg.id} msg={msg} />
            ))}
            {chatLoading ? (
              <div className={styles.msg}>
                <span className={styles.pending}>
                  <span className={cx(styles.dot, styles['tone-primary'])} />
                  Audrey sedang menyusun jawaban...
                </span>
              </div>
            ) : null}
          </div>

          {chatError ? (
            <div className="ui-alert ui-alert--critical" role="alert">
              {chatError}
            </div>
          ) : null}

          <div className={styles.templates} aria-label="Template pertanyaan">
            {AUDREY_TEMPLATES.map((template) => (
              <button
                key={template.label}
                type="button"
                className="ui-chip"
                onClick={() => applyTemplate(template.text)}
              >
                {template.label}
              </button>
            ))}
          </div>

          <form
            className={styles.composer}
            onSubmit={(event) => {
              event.preventDefault()
              void sendChat()
            }}
          >
            <textarea
              ref={chatInputRef}
              className="ui-input"
              rows={2}
              value={chatInput}
              onChange={(event) => setChatInput(event.target.value)}
              onKeyDown={(event) => {
                if (event.key === 'Enter' && !event.shiftKey) {
                  event.preventDefault()
                  void sendChat()
                }
              }}
              placeholder="Tulis pertanyaan klinis, Enter untuk kirim"
              aria-label="Pertanyaan untuk Audrey"
            />
            <button type="submit" className="ui-btn ui-btn--primary ui-btn--sm" disabled={!chatInput.trim() || chatLoading}>
              <SendHorizontal size={14} /> Kirim
            </button>
          </form>
        </section>

        {/* Voice: Audrey listens while the doctor holds the talk button or Space */}
        <section className={cx(styles.card, styles.voice)}>
          <div className={styles.cardHead}>
            <h2 className={styles.cardTitle}>Voice</h2>
          </div>

          <AudreyOrb motion={stage.motion} still={reducedMotion} label={stage.stageLabel} />

          {error && (
            <div className="ui-alert ui-alert--critical" role="alert">
              {error}
            </div>
          )}

          <div className={styles.history}>
            {messages.length === 0 && !liveText && sessionState !== 'processing' ? (
              <p className={styles.empty}>{stage.bubbleLabel}. Percakapan suara tampil di sini.</p>
            ) : null}
            {messages.map((msg) => (
              <MessageRow key={msg.id} msg={msg} />
            ))}
            {(sessionState === 'processing' || liveText) && (
              <div className={styles.msg}>
                {liveText ? (
                  <p className={styles.audreyText}>{liveText}</p>
                ) : (
                  <span className={styles.pending}>
                    <span className={cx(styles.dot, styles['tone-primary'])} />
                    Audrey sedang meninjau pedoman dan rekam medis...
                  </span>
                )}
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
                  className={cx('ui-btn ui-btn--primary ui-btn--lg', styles.talkMain, sessionState === 'recording' && styles.recording)}
                >
                  <Mic size={16} />
                  {sessionState === 'recording'
                    ? 'Merekam, lepas untuk kirim'
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
                {sessionState === 'connecting' ? 'Menghubungkan...' : 'Mulai sesi suara'}
              </button>
            )}
          </div>
          <p className={styles.hint}>Tahan tombol atau Spasi selama berbicara.</p>
        </section>
      </div>

      <p className={styles.trust}>
        <ShieldCheck size={14} /> Audrey bukan pengganti keputusan klinis dokter.
      </p>
    </div>
  )
}

function MessageRow({ msg }: { msg: Message }) {
  return msg.role === 'user' ? (
    <div className={cx(styles.msg, styles.msgUser)}>
      <div className={styles.userText}>
        {msg.text}
        <span className={styles.meta}>Dokter · {msg.time}</span>
      </div>
    </div>
  ) : (
    <div className={styles.msg}>
      <div className={styles.audreyText}>
        {msg.text}
        <span className={styles.meta}>Audrey · {msg.time}</span>
      </div>
    </div>
  )
}
