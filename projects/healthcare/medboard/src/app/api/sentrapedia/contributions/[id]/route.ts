import { NextResponse } from 'next/server'

import { ADMIN_CONSOLE_ROLES } from '@/lib/server/admin-console-roles'
import { getCrewSessionFromRequest } from '@/lib/server/crew-access-auth'
import { reviewContribution } from '@/lib/server/sentrapedia-ai-review'
import { decideContribution, getContribution, recordAiReview } from '@/lib/server/sentrapedia-contributions'
import { currentSectionText, findDisease, NOTE_MAX } from '@/lib/sentrapedia/contribution'

export const runtime = 'nodejs'

// Chief only: approve, reject, or run the AI review again.
export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = getCrewSessionFromRequest(request)
  if (!session) return NextResponse.json({ ok: false, error: 'Unauthorized' }, { status: 401 })
  if (!ADMIN_CONSOLE_ROLES.has(session.role)) {
    return NextResponse.json({ ok: false, error: 'Akses ditolak.' }, { status: 403 })
  }

  const { id } = await params
  let payload: { action?: unknown; note?: unknown }
  try {
    payload = (await request.json()) as { action?: unknown; note?: unknown }
  } catch {
    return NextResponse.json({ ok: false, error: 'Permintaan tidak terbaca.' }, { status: 400 })
  }
  const note = typeof payload.note === 'string' ? payload.note.trim().slice(0, NOTE_MAX) : ''

  if (payload.action === 'review') {
    const record = getContribution(id)
    if (!record) return NextResponse.json({ ok: false, error: 'Kontribusi tidak ditemukan.' }, { status: 404 })
    if (record.status !== 'ai_review' && record.status !== 'awaiting_approval') {
      return NextResponse.json({ ok: false, error: 'Kontribusi ini sudah diputuskan.' }, { status: 409 })
    }
    const disease = findDisease(record.diseaseId)
    const review = await reviewContribution(record, disease ? currentSectionText(disease, record.field) : '')
    return NextResponse.json({ ok: true, contribution: recordAiReview(id, review) })
  }

  if (payload.action !== 'approve' && payload.action !== 'reject') {
    return NextResponse.json({ ok: false, error: 'Aksi tidak dikenal.' }, { status: 400 })
  }
  const result = decideContribution(id, payload.action === 'approve' ? 'approved' : 'rejected', session.username, note)
  if (!result.ok) return NextResponse.json({ ok: false, error: result.error }, { status: result.status })
  return NextResponse.json({ ok: true, contribution: result.record })
}
