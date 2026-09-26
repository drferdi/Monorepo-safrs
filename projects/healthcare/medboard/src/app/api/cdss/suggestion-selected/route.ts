import { NextResponse } from 'next/server'
import { writeCDSSAuditEntry } from '@/lib/cdss/workflow'
import { getCrewSessionFromRequest, isCrewAuthorizedRequest } from '@/lib/server/crew-access-auth'
import { getRequestIp, writeSecurityAuditLog } from '@/lib/server/security-audit'

export const runtime = 'nodejs'

type Body = {
  session_id?: string
  selected_icd?: string
  selected_confidence?: number
  diagnosis_name?: string
  rank?: number
  decision_status?: 'recommended' | 'review' | 'must_not_miss' | 'deferred'
  decision_reason?: string
  selection_intent?: 'working_diagnosis' | 'review_selection' | 'must_not_miss_considered'
  review_reason?: string
}

export async function POST(request: Request) {
  const ip = getRequestIp(request)
  const session = getCrewSessionFromRequest(request)

  if (!isCrewAuthorizedRequest(request)) {
    await writeSecurityAuditLog({
      endpoint: '/api/cdss/suggestion-selected',
      action: 'CDSS_SUGGESTION_SELECTED',
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

  if (!body.selected_icd?.trim() || !body.diagnosis_name?.trim()) {
    return NextResponse.json(
      { error: 'selected_icd and diagnosis_name are required' },
      { status: 400 }
    )
  }

  if (body.selection_intent === 'review_selection' && !body.review_reason?.trim()) {
    return NextResponse.json(
      { error: 'review_reason is required for review selections' },
      { status: 400 }
    )
  }

  await writeCDSSAuditEntry({
    sessionId: body.session_id,
    action: 'SUGGESTION_SELECTED',
    validationStatus: body.decision_status ?? 'selected',
    outputSummary: {
      selectedIcd: body.selected_icd.trim().toUpperCase(),
      decisionStatus: body.decision_status ?? 'review',
      selectionIntent: body.selection_intent ?? 'working_diagnosis',
    },
    metadata: {
      diagnosisName: body.diagnosis_name.trim(),
      selectedConfidence:
        typeof body.selected_confidence === 'number' ? body.selected_confidence : null,
      rank: typeof body.rank === 'number' ? body.rank : null,
      decisionReason: body.decision_reason ?? null,
      reviewReason: body.review_reason ?? null,
      userId: session?.username ?? null,
      role: session?.role ?? null,
      ip,
    },
  })

  await writeSecurityAuditLog({
    endpoint: '/api/cdss/suggestion-selected',
    action: 'CDSS_SUGGESTION_SELECTED',
    result: 'success',
    userId: session?.username ?? null,
    role: session?.role ?? null,
    ip,
    metadata: {
      selectedIcd: body.selected_icd.trim().toUpperCase(),
      decisionStatus: body.decision_status ?? 'review',
      selectionIntent: body.selection_intent ?? 'working_diagnosis',
    },
  })

  return NextResponse.json({ ok: true })
}
