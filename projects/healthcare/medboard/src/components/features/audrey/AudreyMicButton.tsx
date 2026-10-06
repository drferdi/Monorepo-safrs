// Drferdi — AudreyMicButton: compact mic toggle for STT dictation
'use client'

import { Loader2, Mic, MicOff } from 'lucide-react'

// ── Types ─────────────────────────────────────────────────────────────────────

export type AudreyMicState = 'idle' | 'listening' | 'processing' | 'error'

interface AudreyMicButtonProps {
  state: AudreyMicState
  onPress: () => void
  disabled?: boolean
  className?: string
}

// ── Pulse keyframes (injected once) ──────────────────────────────────────────

const PULSE_ID = 'audrey-mic-pulse'

function ensurePulseKeyframes() {
  if (typeof document === 'undefined') return
  if (document.getElementById(PULSE_ID)) return
  const style = document.createElement('style')
  style.id = PULSE_ID
  style.textContent = `
    @keyframes audrey-pulse {
      0%   { box-shadow: 0 0 0 0 rgba(196,149,106,0.55); }
      70%  { box-shadow: 0 0 0 10px rgba(196,149,106,0); }
      100% { box-shadow: 0 0 0 0 rgba(196,149,106,0); }
    }
  `
  document.head.appendChild(style)
}

// ── Component ────────────────────────────────────────────────────────────────

const ARIA_LABELS: Record<AudreyMicState, string> = {
  idle: 'Mulai dikte',
  listening: 'Sedang mendengarkan — klik untuk berhenti',
  processing: 'Memproses transkripsi...',
  error: 'Gagal — klik untuk coba lagi',
}

export function AudreyMicButton({ state, onPress, disabled, className }: AudreyMicButtonProps) {
  ensurePulseKeyframes()

  const isListening = state === 'listening'
  const isProcessing = state === 'processing'
  const isError = state === 'error'
  const isDisabled = disabled || isProcessing

  // Black neumorphism like every other button (Chief 2026-10-06); recording shows pressed with an amber ring.
  const bgColor = isError ? '#ef4444' : 'var(--neu-surface)'

  const borderColor = isListening
    ? 'var(--audrey-amber, #C4956A)'
    : isError
      ? '#ef4444'
      : 'transparent'

  const iconColor = isError ? '#fff' : 'var(--neu-text)'

  return (
    <button
      type="button"
      onClick={onPress}
      disabled={isDisabled}
      aria-label={ARIA_LABELS[state]}
      className={className}
      style={{
        width: 36,
        height: 36,
        borderRadius: '50%',
        border: `2px solid ${borderColor}`,
        background: bgColor,
        boxShadow: isError ? 'none' : isListening ? 'var(--neu-pressed)' : 'var(--neu-raised)',
        display: 'inline-flex',
        alignItems: 'center',
        justifyContent: 'center',
        cursor: isDisabled ? 'not-allowed' : 'pointer',
        opacity: isDisabled ? 0.5 : 1,
        transition: 'all 0.2s ease',
        animation: isListening ? 'audrey-pulse 1.4s ease-in-out infinite' : 'none',
        flexShrink: 0,
      }}
    >
      {isProcessing ? (
        <Loader2 size={16} color={iconColor} style={{ animation: 'spin 1s linear infinite' }} />
      ) : isListening ? (
        <MicOff size={16} color={iconColor} />
      ) : (
        <Mic size={16} color={iconColor} />
      )}
    </button>
  )
}
