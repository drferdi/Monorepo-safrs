import 'server-only'
import { NextResponse } from 'next/server'

import { getCrewSessionFromRequest, isCrewAuthorizedRequest } from '@/lib/server/crew-access-auth'
import { getRequestIp, writeSecurityAuditLog } from '@/lib/server/security-audit'
import { transcribeSpeech } from '@/lib/telemedicine/openrouter'

export const runtime = 'nodejs'

// 15 s of 16 kHz mono 16-bit WAV is about 480 KB, about 640 KB as base64.
const MAX_AUDIO_BASE64 = 1_000_000
const BASE64 = /^[A-Za-z0-9+/]+={0,2}$/

/**
 * @summary One MedLink utterance (base64 WAV) to text.
 * @description Signed-in crew only. The audio goes to an OpenRouter free model; the audit log keeps
 * sizes only, never the words.
 */
export async function POST(request: Request) {
  const ip = getRequestIp(request)
  const session = getCrewSessionFromRequest(request)
  const audit = (result: 'success' | 'unauthenticated' | 'failure', metadata?: Record<string, unknown>) =>
    writeSecurityAuditLog({
      endpoint: '/api/telemedicine/transcribe',
      action: 'MEDLINK_TRANSCRIBE',
      result,
      userId: session?.username ?? null,
      role: session?.role ?? null,
      ip,
      metadata,
    })

  if (!isCrewAuthorizedRequest(request)) {
    await audit('unauthenticated')
    return NextResponse.json({ ok: false, error: 'Unauthorized' }, { status: 401 })
  }

  let body: unknown
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ ok: false, error: 'Permintaan tidak terbaca.' }, { status: 400 })
  }
  const audio = body && typeof body === 'object' && 'audio' in body && typeof body.audio === 'string' ? body.audio : ''
  if (!audio || audio.length > MAX_AUDIO_BASE64 || !BASE64.test(audio)) {
    return NextResponse.json({ ok: false, error: 'Rekaman tidak valid atau terlalu panjang.' }, { status: 400 })
  }

  const result = await transcribeSpeech(audio)
  await audit(result.ok ? 'success' : 'failure', {
    audioChars: audio.length,
    textLength: result.ok ? result.text.length : 0,
  })
  return result.ok
    ? NextResponse.json({ ok: true, text: result.text })
    : NextResponse.json({ ok: false, error: result.error }, { status: 502 })
}
