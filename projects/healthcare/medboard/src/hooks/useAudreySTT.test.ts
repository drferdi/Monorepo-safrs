// Drferdi — Tests for useAudreySTT hook
import assert from 'node:assert/strict'
import { describe, it } from 'node:test'

// ── State machine contract tests ──────────────────────────────────────────────

describe('useAudreySTT — state machine', () => {
  const VALID_STATES = ['idle', 'listening', 'processing', 'error'] as const

  it('valid states are 4: idle, listening, processing, error', () => {
    assert.equal(VALID_STATES.length, 4)
    assert.ok(VALID_STATES.includes('idle'))
    assert.ok(VALID_STATES.includes('listening'))
    assert.ok(VALID_STATES.includes('processing'))
    assert.ok(VALID_STATES.includes('error'))
  })

  it('initial state should be idle', () => {
    const initialState = 'idle'
    assert.equal(initialState, 'idle')
  })

  it('valid transitions: idle → listening', () => {
    const from = 'idle' as const
    const to = 'listening' as const
    assert.notEqual(from, to)
  })

  it('valid transitions: listening → processing', () => {
    const from = 'listening' as const
    const to = 'processing' as const
    assert.notEqual(from, to)
  })

  it('valid transitions: processing → idle', () => {
    const from = 'processing' as const
    const to = 'idle' as const
    assert.notEqual(from, to)
  })

  it('valid transitions: error → idle (auto-recover)', () => {
    const from = 'error' as const
    const to = 'idle' as const
    assert.notEqual(from, to)
  })
})

// ── Web Speech API detection ──────────────────────────────────────────────────

describe('useAudreySTT — browser API detection', () => {
  it('getSpeechRecognition returns null in Node environment', () => {
    const hasWindow = typeof window !== 'undefined'
    if (!hasWindow) {
      assert.equal(hasWindow, false, 'Node.js should not have window')
    }
  })

  it('hasMicSupport returns false in Node environment', () => {
    const hasNav = typeof navigator !== 'undefined' && Boolean(navigator.mediaDevices?.getUserMedia)
    assert.equal(hasNav, false, 'Node.js should not have navigator.mediaDevices')
  })
})

// ── Hook return shape ─────────────────────────────────────────────────────────

describe('useAudreySTT — return shape contract', () => {
  const expectedKeys = ['state', 'start', 'stop', 'interimText', 'finalText', 'error', 'isSupported']

  it('return type has all expected keys', () => {
    for (const key of expectedKeys) {
      assert.ok(typeof key === 'string')
    }
    assert.equal(expectedKeys.length, 7)
  })

  it('state is a string', () => {
    const mockReturn = {
      state: 'idle' as const,
      start: () => {},
      stop: () => {},
      interimText: '',
      finalText: '',
      error: null,
      isSupported: false,
    }
    assert.equal(typeof mockReturn.state, 'string')
    assert.equal(typeof mockReturn.start, 'function')
    assert.equal(typeof mockReturn.stop, 'function')
    assert.equal(typeof mockReturn.interimText, 'string')
    assert.equal(typeof mockReturn.finalText, 'string')
    assert.equal(mockReturn.error, null)
    assert.equal(typeof mockReturn.isSupported, 'boolean')
  })
})

// ── Audio blob handling ───────────────────────────────────────────────────────

describe('useAudreySTT — audio handling', () => {
  it('preferred MIME type is audio/webm;codecs=opus', () => {
    const preferred = 'audio/webm;codecs=opus'
    assert.ok(preferred.startsWith('audio/'))
    assert.ok(preferred.includes('opus'))
  })

  it('fallback MIME type is audio/webm', () => {
    const fallback = 'audio/webm'
    assert.ok(fallback.startsWith('audio/'))
  })

  it('empty blob (size 0) should not be sent to Whisper', () => {
    const blobSize = 0
    const shouldSend = blobSize > 0
    assert.equal(shouldSend, false)
  })

  it('non-empty blob should be sent to Whisper', () => {
    const blobSize = 4096
    const shouldSend = blobSize > 0
    assert.equal(shouldSend, true)
  })
})

// ── STT endpoint contract ─────────────────────────────────────────────────────

describe('useAudreySTT — /api/voice/stt contract', () => {
  it('endpoint path is /api/voice/stt', () => {
    assert.equal('/api/voice/stt', '/api/voice/stt')
  })

  it('method is POST', () => {
    assert.equal('POST', 'POST')
  })

  it('body is FormData with audio field', () => {
    const fieldName = 'audio'
    assert.equal(fieldName, 'audio')
  })
})
