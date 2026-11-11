import { NextResponse } from 'next/server'
import { readRunHistory } from '@/lib/lb1/history'
import { isCrewAuthorizedRequest } from '@/lib/server/crew-access-auth'

export const runtime = 'nodejs'

function parseLimit(url: URL) {
  const raw = Number(url.searchParams.get('limit') || '30')
  if (!Number.isInteger(raw) || raw <= 0) return 30
  return Math.min(raw, 200)
}

export async function GET(request: Request) {
  if (!isCrewAuthorizedRequest(request)) {
    return NextResponse.json({ ok: false, error: 'Unauthorized' }, { status: 401 })
  }

  try {
    const url = new URL(request.url)
    const limit = parseLimit(url)
    const history = await readRunHistory(limit)
    return NextResponse.json({
      ok: true,
      count: history.length,
      history,
    })
  } catch (error) {
    return NextResponse.json(
      {
        ok: false,
        error: error instanceof Error ? error.message : 'Failed to read history',
        history: [],
      },
      { status: 500 }
    )
  }
}
