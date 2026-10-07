// Drferdi — vision, brought to life.
import { NextResponse } from 'next/server'

import { isCrewAuthorizedRequest } from '@/lib/server/crew-access-auth'
import { loadCrewAwards, loadCrewRankSummaries } from '@/lib/server/crew-rank-store'

export const runtime = 'nodejs'

export async function GET(request: Request, { params }: { params: Promise<{ username: string }> }) {
  if (!isCrewAuthorizedRequest(request)) {
    return NextResponse.json({ ok: false, error: 'Unauthorized' }, { status: 401 })
  }
  const { username } = await params
  const key = username.trim().toLowerCase()
  const [summaries, awards] = await Promise.all([loadCrewRankSummaries([key]), loadCrewAwards(key)])
  return NextResponse.json({ ok: true, rank: summaries.get(key), awards })
}
