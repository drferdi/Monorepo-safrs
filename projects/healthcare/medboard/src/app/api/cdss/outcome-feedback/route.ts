import { NextResponse } from 'next/server'
import { writeCDSSAuditEntry, writeCDSSOutcomeFeedbackEntry } from '@/lib/cdss/workflow'
import { getCrewSessionFromRequest, isCrewAuthorizedRequest } from '@/lib/server/crew-access-auth'
import { getRequestIp, writeSecurityAuditLog } from '@/lib/server/security-audit'

export const runtime = 'nodejs'

type Body = {
  session_id?: string
  selected_icd?: string
  selected_confidence?: number
  final_icd?: string
  outcome_confirmed?: boolean | null
  follow_up_note?: string
  review_accept_reason?: string
  override_reason?: string
}

export async function POST(request: Request) {
  const ip = getRequestIp(request)
  const session = getCrewSessionFromRequest(request)

  if (!isCrewAuthorizedRequest(request)) {
    await writeSecurityAuditLog({
      endpoint: '/api/cdss/outcome-feedback',
      action: 'CDSS_OUTCOME_FEEDBACK',
      result: 'unauthenticated',
      userId: session?.username ?? null,
      role: session?.role ?? null,
      ip,
    })
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  let body: Body
  try {
    body = (await request.json()) as Body
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 })
  }

  if (!body.selected_icd?.trim() || !body.final_icd?.trim()) {
    return NextResponse.json({ error: 'selected_icd and final_icd are required' }, { status: 400 })
  }

  const selectedIcd = body.selected_icd.trim().toUpperCase()
  const finalIcd = body.final_icd.trim().toUpperCase()
  const hasOverride = Boolean(body.override_reason?.trim()) || selectedIcd !== finalIcd

  await writeCDSSOutcomeFeedbackEntry({
    sessionId: body.session_id,
    selectedIcd,
    selectedConfidence: typeof body.selected_confidence === 'number' ? body.selected_confidence : 0,
    finalIcd,
    outcomeConfirmed: body.outcome_confirmed ?? null,
    followUpNote: body.follow_up_note?.trim() || undefined,
    doctorUserId: session?.username ?? null,
    overrideReason: body.override_reason?.trim() || undefined,
    metadata: {
      reviewAcceptReason: body.review_accept_reason?.trim() || null,
      userRole: session?.role ?? null,
      ip,
    },
  })

  await writeCDSSAuditEntry({
    sessionId: body.session_id,
    action: 'OUTCOME_FEEDBACK',
    validationStatus: hasOverride ? 'override' : 'concordant',
    outputSummary: {
      selectedIcd,
      finalIcd,
      hasOverride,
    },
    metadata: {
      outcomeConfirmed: body.outcome_confirmed ?? null,
      followUpNote: body.follow_up_note?.trim() || null,
      reviewAcceptReason: body.review_accept_reason?.trim() || null,
      overrideReason: body.override_reason?.trim() || null,
      userId: session?.username ?? null,
      role: session?.role ?? null,
      ip,
    },
  })

  await writeSecurityAuditLog({
    endpoint: '/api/cdss/outcome-feedback',
    action: 'CDSS_OUTCOME_FEEDBACK',
    result: 'success',
    userId: session?.username ?? null,
    role: session?.role ?? null,
    ip,
    metadata: {
      selectedIcd,
      finalIcd,
      hasOverride,
    },
  })

  return NextResponse.json({ ok: true })
}
