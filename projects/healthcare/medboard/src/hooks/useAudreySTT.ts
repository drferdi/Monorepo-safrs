// Drferdi — useAudreySTT: hybrid STT hook (Web Speech preview + Groq Whisper finalize)
/**
 * useAudreySTT
 *
 * Hybrid speech-to-text hook for clinical dictation.
 *
 * Pipeline:
 *   1. start() → request mic → begin MediaRecorder + Web Speech API (if available)
 *   2. Web Speech emits interim text in real-time (onInterim preview)
 *   3. stop() → send recorded blob to /api/voice/stt (Groq Whisper) → final text
 *   4. If Web Speech unavailable → Whisper-only path (no preview)
 *
 * State machine: idle → listening → processing → idle
 */

'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import type { AudreyMicState } from '@/components/features/audrey/AudreyMicButton'

// ── Types ─────────────────────────────────────────────────────────────────────

interface UseAudreySTTOptions {
  onInterim?: (text: string) => void
  onTranscript?: (text: string) => void
  onError?: (error: string) => void
  language?: string
}

interface UseAudreySTTReturn {
  state: AudreyMicState
  start: () => void
  stop: () => void
  interimText: string
  finalText: string
  error: string | null
  isSupported: boolean
}

interface BrowserSpeechRecognitionAlternative {
  transcript: string
}

interface BrowserSpeechRecognitionResult {
  readonly isFinal: boolean
  readonly length: number
  [index: number]: BrowserSpeechRecognitionAlternative
}

interface BrowserSpeechRecognitionEvent {
  readonly resultIndex: number
  readonly results: ArrayLike<BrowserSpeechRecognitionResult>
}

interface BrowserSpeechRecognitionInstance {
  continuous: boolean
  interimResults: boolean
  lang: string
  onresult: ((event: BrowserSpeechRecognitionEvent) => void) | null
  onerror: (() => void) | null
  start(): void
  stop(): void
  abort(): void
}

type BrowserSpeechRecognitionConstructor = new () => BrowserSpeechRecognitionInstance

// ── Helpers ───────────────────────────────────────────────────────────────────

function getSpeechRecognition(): BrowserSpeechRecognitionConstructor | null {
  if (typeof window === 'undefined') return null
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const W = window as Record<string, any>
  return W.SpeechRecognition ?? W.webkitSpeechRecognition ?? null
}

function hasMicSupport(): boolean {
  return typeof navigator !== 'undefined' && Boolean(navigator.mediaDevices?.getUserMedia)
}

// ── Hook ──────────────────────────────────────────────────────────────────────

export function useAudreySTT(options: UseAudreySTTOptions = {}): UseAudreySTTReturn {
  const { onInterim, onTranscript, onError, language = 'id-ID' } = options

  const [state, setState] = useState<AudreyMicState>('idle')
  const [interimText, setInterimText] = useState('')
  const [finalText, setFinalText] = useState('')
  const [error, setError] = useState<string | null>(null)

  const mediaRecorderRef = useRef<MediaRecorder | null>(null)
  const chunksRef = useRef<Blob[]>([])
  const recognitionRef = useRef<BrowserSpeechRecognitionInstance | null>(null)
  const streamRef = useRef<MediaStream | null>(null)
  const abortRef = useRef<AbortController | null>(null)

  const isSupported = hasMicSupport()

  // ── Cleanup ─────────────────────────────────────────────────────────────────

  const cleanup = useCallback(() => {
    // Stop Web Speech
    if (recognitionRef.current) {
      try { recognitionRef.current.abort() } catch { /* noop */ }
      recognitionRef.current = null
    }
    // Stop MediaRecorder
    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
      try { mediaRecorderRef.current.stop() } catch { /* noop */ }
    }
    mediaRecorderRef.current = null
    // Release mic stream
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(t => t.stop())
      streamRef.current = null
    }
    // Abort pending fetch
    if (abortRef.current) {
      abortRef.current.abort()
      abortRef.current = null
    }
    chunksRef.current = []
  }, [])

  // Cleanup on unmount
  useEffect(() => cleanup, [cleanup])

  // ── Send to Whisper ─────────────────────────────────────────────────────────

  const sendToWhisper = useCallback(async (blob: Blob) => {
    setState('processing')
    abortRef.current = new AbortController()

    try {
      const form = new FormData()
      form.append('audio', blob, 'recording.webm')

      const res = await fetch('/api/voice/stt', {
        method: 'POST',
        body: form,
        signal: abortRef.current.signal,
      })

      if (!res.ok) {
        const data = await res.json().catch(() => ({ error: 'Transkripsi gagal' })) as { error?: string }
        throw new Error(data.error ?? `HTTP ${res.status}`)
      }

      const data = await res.json() as { ok: boolean; text: string }
      const text = data.text?.trim() ?? ''

      setFinalText(text)
      setInterimText('')
      onTranscript?.(text)
      setState('idle')
    } catch (err) {
      if (err instanceof DOMException && err.name === 'AbortError') {
        setState('idle')
        return
      }
      const msg = err instanceof Error ? err.message : 'Transkripsi gagal'
      setError(msg)
      onError?.(msg)
      setState('error')
      // Auto-recover to idle after 2s
      setTimeout(() => setState('idle'), 2000)
    } finally {
      abortRef.current = null
    }
  }, [onTranscript, onError])

  // ── Start ───────────────────────────────────────────────────────────────────

  const start = useCallback(async () => {
    if (state !== 'idle' && state !== 'error') return
    setError(null)
    setInterimText('')
    setFinalText('')
    chunksRef.current = []

    // Request mic
    let stream: MediaStream
    try {
      stream = await navigator.mediaDevices.getUserMedia({ audio: true })
      streamRef.current = stream
    } catch {
      const msg = 'Izin mikrofon ditolak'
      setError(msg)
      onError?.(msg)
      setState('error')
      setTimeout(() => setState('idle'), 2000)
      return
    }

    setState('listening')

    // Start MediaRecorder for blob capture
    try {
      const mimeType = MediaRecorder.isTypeSupported('audio/webm;codecs=opus')
        ? 'audio/webm;codecs=opus'
        : 'audio/webm'

      const recorder = new MediaRecorder(stream, { mimeType })
      mediaRecorderRef.current = recorder

      recorder.ondataavailable = (e) => {
        if (e.data.size > 0) chunksRef.current.push(e.data)
      }

      recorder.start(250) // chunk every 250ms
    } catch {
      // MediaRecorder not supported — can't proceed
      cleanup()
      const msg = 'Browser tidak mendukung perekaman audio'
      setError(msg)
      onError?.(msg)
      setState('error')
      setTimeout(() => setState('idle'), 2000)
      return
    }

    // Start Web Speech API (real-time preview — optional)
    const SpeechRecClass = getSpeechRecognition()
    if (SpeechRecClass) {
      try {
        const recognition = new SpeechRecClass()
        recognition.continuous = true
        recognition.interimResults = true
        recognition.lang = language

        recognition.onresult = (event: BrowserSpeechRecognitionEvent) => {
          let interim = ''
          for (let i = event.resultIndex; i < event.results.length; i++) {
            const transcript = event.results[i][0].transcript
            if (event.results[i].isFinal) {
              interim = transcript
            } else {
              interim += transcript
            }
          }
          setInterimText(interim)
          onInterim?.(interim)
        }

        recognition.onerror = () => {
          // Web Speech error is non-fatal — Whisper will still work
          recognitionRef.current = null
        }

        recognition.start()
        recognitionRef.current = recognition
      } catch {
        // Web Speech failed to start — non-fatal
      }
    }
  }, [state, language, onInterim, onError, cleanup])

  // ── Stop ────────────────────────────────────────────────────────────────────

  const stop = useCallback(() => {
    if (state !== 'listening') return

    // Stop Web Speech
    if (recognitionRef.current) {
      try { recognitionRef.current.stop() } catch { /* noop */ }
      recognitionRef.current = null
    }

    // Stop MediaRecorder and collect blob
    const recorder = mediaRecorderRef.current
    if (recorder && recorder.state !== 'inactive') {
      recorder.onstop = () => {
        const blob = new Blob(chunksRef.current, { type: recorder.mimeType })
        chunksRef.current = []

        // Release mic
        if (streamRef.current) {
          streamRef.current.getTracks().forEach(t => t.stop())
          streamRef.current = null
        }

        if (blob.size > 0) {
          sendToWhisper(blob)
        } else {
          setState('idle')
        }
      }
      recorder.stop()
    } else {
      // No recorder — just reset
      cleanup()
      setState('idle')
    }
  }, [state, sendToWhisper, cleanup])

  return { state, start, stop, interimText, finalText, error, isSupported }
}
