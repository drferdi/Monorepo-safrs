import { NextResponse } from 'next/server'
import { broadcastNotam } from '@/lib/notam/socket-bridge'
import { getCrewSessionFromRequest, listCrewAccessUsers } from '@/lib/server/crew-access-auth'
import { sendNotamEmail } from '@/lib/server/email'
import { createNotam, listAllNotams } from '@/lib/server/notam'

export const runtime = 'nodejs'

const ALLOWED_ROLES = new Set(['CEO', 'CEO_SENTRA', 'ADMINISTRATOR', 'CHIEF_EXECUTIVE_OFFICER'])

export async function GET(request: Request) {
  const session = getCrewSessionFromRequest(request)
  if (!session || !ALLOWED_ROLES.has(session.role)) {
    return NextResponse.json({ ok: false, error: 'Akses ditolak.' }, { status: 403 })
  }

  try {
    const notams = listAllNotams()
    return NextResponse.json({ ok: true, notams })
  } catch (error) {
    console.error('[NOTAM] List all error:', error)
    return NextResponse.json({ ok: false, error: 'Gagal memuat data NOTAM.' }, { status: 500 })
  }
}

export async function POST(request: Request) {
  const session = getCrewSessionFromRequest(request)
  if (!session || !ALLOWED_ROLES.has(session.role)) {
    return NextResponse.json({ ok: false, error: 'Akses ditolak.' }, { status: 403 })
  }

  try {
    const body: unknown = await request.json()
    const notam = await createNotam(body, {
      username: session.username,
      displayName: session.displayName,
    })

    broadcastNotam(notam)

    // Fire-and-forget: email all active crew
    const crewEmails = (await listCrewAccessUsers())
      .map(u => u.email ?? '')
      .filter(e => e.includes('@'))

    if (crewEmails.length > 0) {
      const nb = notam as { title?: string; body?: string; priority?: string }
      void sendNotamEmail(
        crewEmails,
        String(nb.title || 'NOTAM Baru'),
        String(nb.body || ''),
        String(nb.priority || 'info')
      )
    }

    return NextResponse.json({
      ok: true,
      notam,
      message: 'NOTAM berhasil dibuat.',
    })
  } catch (error) {
    console.error('[NOTAM] Create error:', error)
    return NextResponse.json(
      {
        ok: false,
        error: error instanceof Error ? error.message : 'Gagal membuat NOTAM.',
      },
      { status: 400 }
    )
  }
}
