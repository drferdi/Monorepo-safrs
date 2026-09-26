// ============================================================
// PKM Dashboard — DELETE Telemedicine Request
// Route: /api/telemedicine/request/[id]
// ============================================================

import { type NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getCrewSessionFromRequest } from '@/lib/server/crew-access-auth'

export const runtime = 'nodejs'

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
): Promise<NextResponse> {
  const session = getCrewSessionFromRequest(_req)
  if (!session) {
    return NextResponse.json({ ok: false, error: 'Unauthorized' }, { status: 401 })
  }

  try {
    const { id } = await params
    await prisma.telemedicineRequest.delete({
      where: { id },
    })
    return NextResponse.json({ ok: true }, { status: 200 })
  } catch (err) {
    console.error('[Telemedicine] DELETE /request/[id] error:', err)
    return NextResponse.json({ ok: false, error: 'Server error' }, { status: 500 })
  }
}
