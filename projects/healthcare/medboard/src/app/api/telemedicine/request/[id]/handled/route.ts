import { type NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getCrewSessionFromRequest } from '@/lib/server/crew-access-auth'

export const runtime = 'nodejs'

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = getCrewSessionFromRequest(req)
  if (!session) {
    return NextResponse.json({ ok: false, error: 'Unauthorized' }, { status: 401 })
  }
  try {
    const { id } = await params
    await prisma.telemedicineRequest.update({
      where: { id },
      data: { status: 'HANDLED' },
    })
    return NextResponse.json({ ok: true })
  } catch (err) {
    console.error('[Telemedicine] mark-handled error:', err)
    return NextResponse.json({ ok: false, error: 'Server error' }, { status: 500 })
  }
}
