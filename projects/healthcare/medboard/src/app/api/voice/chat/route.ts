import { NextResponse } from 'next/server'
import { isCrewAuthorizedRequest } from '@/lib/server/crew-access-auth'

export const runtime = 'nodejs'

export async function POST(request: Request) {
  if (!isCrewAuthorizedRequest(request)) {
    return NextResponse.json({ ok: false, error: 'Unauthorized' }, { status: 401 })
  }

  return NextResponse.json(
    {
      ok: false,
      error: 'Voice chat sementara dinonaktifkan selama exit Google total.',
    },
    { status: 503 },
  )
}
