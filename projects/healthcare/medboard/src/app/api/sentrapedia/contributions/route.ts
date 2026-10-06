import { NextResponse } from 'next/server'

import { ADMIN_CONSOLE_ROLES } from '@/lib/server/admin-console-roles'
import { getCrewSessionFromRequest } from '@/lib/server/crew-access-auth'
import { reviewContribution } from '@/lib/server/sentrapedia-ai-review'
import {
  listApprovedContributions,
  listContributions,
  recordAiReview,
  saveNewContribution,
} from '@/lib/server/sentrapedia-contributions'
import { currentSectionText, findDisease, validateContributionDraft } from '@/lib/sentrapedia/contribution'

export const runtime = 'nodejs'

// Crew: their own contributions. Chief (admin console roles): all. ?status=approved: approved text for everyone.
export async function GET(request: Request) {
  const session = getCrewSessionFromRequest(request)
  if (!session) return NextResponse.json({ ok: false, error: 'Unauthorized' }, { status: 401 })

  if (new URL(request.url).searchParams.get('status') === 'approved') {
    return NextResponse.json({ ok: true, contributions: listApprovedContributions() })
  }
  const all = listContributions()
  const contributions = ADMIN_CONSOLE_ROLES.has(session.role)
    ? all
    : all.filter((record) => record.contributor.username === session.username)
  return NextResponse.json({ ok: true, contributions })
}

export async function POST(request: Request) {
  const session = getCrewSessionFromRequest(request)
  if (!session) return NextResponse.json({ ok: false, error: 'Unauthorized' }, { status: 401 })

  let payload: unknown
  try {
    payload = await request.json()
  } catch {
    return NextResponse.json({ ok: false, error: 'Isian kontribusi tidak terbaca.' }, { status: 400 })
  }
  const result = validateContributionDraft(payload)
  if (!result.ok) return NextResponse.json({ ok: false, error: result.error }, { status: 400 })

  const saved = saveNewContribution(result.draft, {
    username: session.username,
    displayName: session.displayName,
    profession: session.profession,
  })
  const disease = findDisease(saved.diseaseId)
  const review = await reviewContribution(saved, disease ? currentSectionText(disease, saved.field) : '')
  const contribution = recordAiReview(saved.id, review) ?? saved
  return NextResponse.json({ ok: true, contribution }, { status: 201 })
}
