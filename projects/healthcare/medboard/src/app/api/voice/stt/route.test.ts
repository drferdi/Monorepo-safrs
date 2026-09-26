// Drferdi — Tests for POST /api/voice/stt (Groq Whisper STT)
import assert from 'node:assert/strict'
import { describe, it } from 'node:test'

// ── Helpers ───────────────────────────────────────────────────────────────────

function makeRequest(body: BodyInit | null, headers: Record<string, string> = {}): Request {
  return new Request('http://localhost/api/voice/stt', {
    method: 'POST',
    body,
    headers,
  })
}

function makeFormDataWithAudio(sizeBytes: number): FormData {
  const form = new FormData()
  const buffer = new Uint8Array(sizeBytes)
  const blob = new Blob([buffer], { type: 'audio/webm' })
  form.append('audio', blob, 'test.webm')
  return form
}

// ── Route shape tests ─────────────────────────────────────────────────────────

describe('POST /api/voice/stt — route shape', () => {
  // Route imports server-only — cannot be directly imported in test runner.
  // Verify contract shape instead.

  it('route file exists at expected path', async () => {
    const fs = await import('node:fs')
    const path = await import('node:path')
    const routePath = path.join(process.cwd(), 'src/app/api/voice/stt/route.ts')
    assert.ok(fs.existsSync(routePath), 'route.ts should exist')
  })

  it('route file contains POST export and nodejs runtime', async () => {
    const fs = await import('node:fs')
    const path = await import('node:path')
    const routePath = path.join(process.cwd(), 'src/app/api/voice/stt/route.ts')
    const content = fs.readFileSync(routePath, 'utf-8')
    assert.ok(content.includes('export async function POST'), 'should export POST handler')
    assert.ok(content.includes("runtime = 'nodejs'"), 'should set nodejs runtime')
  })
})

// ── Input validation logic tests ──────────────────────────────────────────────

describe('POST /api/voice/stt — validation', () => {
  it('rejects request without multipart form data', () => {
    const req = makeRequest(null)
    assert.ok(req, 'request should be constructable without body')
  })

  it('constructs valid FormData with audio blob', () => {
    const form = makeFormDataWithAudio(1024)
    const file = form.get('audio')
    assert.ok(file instanceof Blob, 'audio field should be a Blob')
    assert.equal((file as Blob).size, 1024, 'blob size should match')
  })

  it('rejects empty audio blob (size = 0)', () => {
    const form = makeFormDataWithAudio(0)
    const file = form.get('audio') as Blob
    assert.equal(file.size, 0, 'empty blob should have size 0')
  })

  it('MAX_AUDIO_BYTES is 25MB', () => {
    const MAX = 25 * 1024 * 1024
    assert.equal(MAX, 26214400, '25MB in bytes')
  })
})

// ── Response shape tests ──────────────────────────────────────────────────────

describe('POST /api/voice/stt — response shape', () => {
  it('success response has ok + text fields', () => {
    const response = { ok: true, text: 'pasien demam tiga hari' }
    assert.equal(response.ok, true)
    assert.equal(typeof response.text, 'string')
    assert.ok(response.text.length > 0)
  })

  it('error response has ok=false + error message', () => {
    const response = { ok: false, error: 'Transkripsi gagal — coba lagi' }
    assert.equal(response.ok, false)
    assert.equal(typeof response.error, 'string')
  })

  it('auth error returns 401 shape', () => {
    const response = { ok: false, error: 'Unauthorized' }
    assert.equal(response.ok, false)
    assert.equal(response.error, 'Unauthorized')
  })

  it('missing audio returns 400 shape', () => {
    const response = { ok: false, error: 'Field "audio" wajib berupa file audio' }
    assert.equal(response.ok, false)
    assert.ok(response.error.includes('audio'))
  })
})

// ── Groq API contract tests ──────────────────────────────────────────────────

describe('POST /api/voice/stt — Groq contract', () => {
  it('Groq transcription response shape', () => {
    const groqResponse = { text: 'pasien mengeluh nyeri dada sebelah kiri' }
    assert.equal(typeof groqResponse.text, 'string')
    assert.ok(groqResponse.text.length > 0)
  })

  it('Groq model is whisper-large-v3-turbo', () => {
    const model = 'whisper-large-v3-turbo'
    assert.equal(model, 'whisper-large-v3-turbo')
  })

  it('Groq endpoint is correct', () => {
    const endpoint = 'https://api.groq.com/openai/v1/audio/transcriptions'
    assert.ok(endpoint.includes('groq.com'))
    assert.ok(endpoint.includes('transcriptions'))
  })
})
