import { NextResponse } from 'next/server'
import { getCrewSessionFromRequest } from '@/lib/server/crew-access-auth'
import {
  approveRegistration,
  listPendingRegistrations,
} from '@/lib/server/crew-access-registration'
import { sendApprovalEmail } from '@/lib/server/email'

export const runtime = 'nodejs'

const ALLOWED_ROLES = new Set(['CEO', 'CEO_SENTRA', 'ADMINISTRATOR', 'CHIEF_EXECUTIVE_OFFICER'])

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = getCrewSessionFromRequest(request)
  if (!session || !ALLOWED_ROLES.has(session.role)) {
    return NextResponse.json({ ok: false, error: 'Akses ditolak.' }, { status: 403 })
  }

  try {
    const { id } = await params

    // Grab registration data before approval (for email)
    const pending = listPendingRegistrations()
    const registration = pending.find(r => r.id === id)

    const result = await approveRegistration(id, session.username)

    // Fire-and-forget: send approval email
    if (registration?.email) {
      void sendApprovalEmail(
        registration.email,
        registration.profile?.fullName || registration.displayName,
        result.username
      )
    }

    return NextResponse.json({
      ok: true,
      username: result.username,
      message: 'Pendaftaran disetujui.',
    })
  } catch (error) {
    const isKnownError =
      error instanceof Error &&
      (error.message.includes('tidak ditemukan') || error.message.includes('sudah'))
    return NextResponse.json(
      {
        ok: false,
        error: isKnownError ? (error as Error).message : 'Gagal menyetujui pendaftaran.',
      },
      { status: 400 }
    )
  }
}
