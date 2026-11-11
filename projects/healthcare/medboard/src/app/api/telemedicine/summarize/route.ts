import 'server-only'
import { NextResponse } from 'next/server'
import { z } from 'zod'

import { icdCodeDetail } from '@/lib/icd/dynamic-db'
import { getCrewSessionFromRequest, isCrewAuthorizedRequest } from '@/lib/server/crew-access-auth'
import { getRequestIp, writeSecurityAuditLog } from '@/lib/server/security-audit'
import { summarizeConsult } from '@/lib/telemedicine/openrouter'

export const runtime = 'nodejs'

const Body = z.object({
  lines: z
    .array(
      z.object({
        speaker: z.enum(['dokter', 'pasien']),
        text: z.string().trim().min(1).max(2000),
        at: z.string().max(40),
      })
    )
    .min(1)
    .max(400),
})

/**
 * @summary The MedLink transcript to the ePuskesmas pages (Anamnesa, Diagnosa, Resep).
 * @description Signed-in crew only. Long numbers are removed before the transcript goes to an
 * OpenRouter free model; ICD codes outside the 2010 catalogue are dropped from the answer.
 */
export async function POST(request: Request) {
  const ip = getRequestIp(request)
  const session = getCrewSessionFromRequest(request)
  const audit = (result: 'success' | 'unauthenticated' | 'failure', metadata?: Record<string, unknown>) =>
    writeSecurityAuditLog({
      endpoint: '/api/telemedicine/summarize',
      action: 'MEDLINK_SUMMARIZE',
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

  let raw: unknown
  try {
    raw = await request.json()
  } catch {
    return NextResponse.json({ ok: false, error: 'Permintaan tidak terbaca.' }, { status: 400 })
  }
  const body = Body.safeParse(raw)
  if (!body.success) {
    return NextResponse.json({ ok: false, error: 'Transkrip kosong atau tidak valid.' }, { status: 400 })
  }

  const result = await summarizeConsult(body.data.lines, code => icdCodeDetail(code) !== null)
  await audit(result.ok ? 'success' : 'failure', { lines: body.data.lines.length })
  return result.ok
    ? NextResponse.json({ ok: true, summary: result.summary })
    : NextResponse.json({ ok: false, error: result.error }, { status: 502 })
}
