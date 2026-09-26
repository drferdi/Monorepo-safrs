import { NextResponse } from 'next/server'
import { getCrewSessionFromRequest, isCrewAuthorizedRequest } from '@/lib/server/crew-access-auth'
import { getRequestIp, writeSecurityAuditLog } from '@/lib/server/security-audit'

export const runtime = 'nodejs'

const MAX_AUDIO_BYTES = 25 * 1024 * 1024 // 25 MB — Groq limit

interface GroqTranscriptionResponse {
  text: string
  x_groq?: { id?: string }
}

export async function POST(request: Request) {
  const ip = getRequestIp(request)
  const session = getCrewSessionFromRequest(request)

  // ── Auth ────────────────────────────────────────────────────────────────────
  if (!isCrewAuthorizedRequest(request)) {
    await writeSecurityAuditLog({
      endpoint: '/api/voice/stt',
      action: 'VOICE_STT',
      result: 'unauthenticated',
      userId: session?.username ?? null,
      role: session?.role ?? null,
      ip,
    })
    return NextResponse.json({ ok: false, error: 'Unauthorized' }, { status: 401 })
  }

  // ── API key ─────────────────────────────────────────────────────────────────
  const apiKey = process.env.GROQ_API_KEY
  if (!apiKey) {
    await writeSecurityAuditLog({
      endpoint: '/api/voice/stt',
      action: 'VOICE_STT',
      result: 'failure',
      userId: session?.username ?? null,
      role: session?.role ?? null,
      ip,
      metadata: { reason: 'missing_groq_api_key' },
    })
    return NextResponse.json(
      { ok: false, error: 'GROQ_API_KEY belum dikonfigurasi' },
      { status: 500 },
    )
  }

  // ── Parse multipart form ────────────────────────────────────────────────────
  let audioBlob: Blob
  try {
    const formData = await request.formData()
    const file = formData.get('audio')
    if (!file || !(file instanceof Blob)) {
      return NextResponse.json(
        { ok: false, error: 'Field "audio" wajib berupa file audio' },
        { status: 400 },
      )
    }
    if (file.size > MAX_AUDIO_BYTES) {
      return NextResponse.json(
        { ok: false, error: `Ukuran audio melebihi batas ${MAX_AUDIO_BYTES / 1024 / 1024}MB` },
        { status: 400 },
      )
    }
    if (file.size === 0) {
      return NextResponse.json(
        { ok: false, error: 'File audio kosong' },
        { status: 400 },
      )
    }
    audioBlob = file
  } catch {
    return NextResponse.json(
      { ok: false, error: 'Request harus multipart/form-data dengan field "audio"' },
      { status: 400 },
    )
  }

  // ── Send to Groq Whisper ────────────────────────────────────────────────────
  try {
    const groqForm = new FormData()
    groqForm.append('file', audioBlob, 'recording.webm')
    groqForm.append('model', 'whisper-large-v3-turbo')
    groqForm.append('language', 'id')
    groqForm.append('response_format', 'json')

    const groqRes = await fetch('https://api.groq.com/openai/v1/audio/transcriptions', {
      method: 'POST',
      headers: { Authorization: `Bearer ${apiKey}` },
      body: groqForm,
    })

    if (!groqRes.ok) {
      const errBody = await groqRes.text().catch(() => 'Unknown Groq error')
      console.error('[STT] Groq API error:', groqRes.status, errBody.slice(0, 200))
      await writeSecurityAuditLog({
        endpoint: '/api/voice/stt',
        action: 'VOICE_STT',
        result: 'failure',
        userId: session?.username ?? null,
        role: session?.role ?? null,
        ip,
        metadata: { groqStatus: groqRes.status },
      })
      return NextResponse.json(
        { ok: false, error: 'Transkripsi gagal — coba lagi' },
        { status: 502 },
      )
    }

    const result = (await groqRes.json()) as GroqTranscriptionResponse

    await writeSecurityAuditLog({
      endpoint: '/api/voice/stt',
      action: 'VOICE_STT',
      result: 'success',
      userId: session?.username ?? null,
      role: session?.role ?? null,
      ip,
      metadata: {
        audioBytes: audioBlob.size,
        textLength: result.text?.length ?? 0,
      },
    })

    return NextResponse.json({
      ok: true,
      text: result.text ?? '',
    })
  } catch (error) {
    const msg = error instanceof Error ? error.message : 'Unknown error'
    console.error('[STT] Unexpected error:', msg)
    await writeSecurityAuditLog({
      endpoint: '/api/voice/stt',
      action: 'VOICE_STT',
      result: 'failure',
      userId: session?.username ?? null,
      role: session?.role ?? null,
      ip,
      metadata: { error: msg },
    })
    return NextResponse.json(
      { ok: false, error: 'Transkripsi gagal — coba lagi' },
      { status: 500 },
    )
  }
}
