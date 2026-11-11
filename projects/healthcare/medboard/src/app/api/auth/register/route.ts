import { NextResponse } from 'next/server'
import { createCrewAccessRegistration } from '@/lib/server/crew-access-registration'
import { getClientIp, registerRateLimiter } from '@/lib/server/rate-limit'

export const runtime = 'nodejs'

export async function POST(request: Request) {
  const ip = getClientIp(request)
  const rateCheck = registerRateLimiter.check(ip)
  if (!rateCheck.allowed) {
    return NextResponse.json(
      {
        ok: false,
        error: 'Terlalu banyak permintaan pendaftaran. Coba lagi nanti.',
      },
      {
        status: 429,
        headers: {
          'Retry-After': String(Math.ceil(rateCheck.retryAfterMs / 1000)),
        },
      }
    )
  }

  try {
    const payload = await request.json()
    const result = await createCrewAccessRegistration(payload)

    return NextResponse.json(
      {
        ok: true,
        status: 'pending_review',
        message:
          'Pendaftaran diterima. Tim admin akan memverifikasi email, institusi, dan profesi sebelum akses diaktifkan.',
        request: result.request,
      },
      { status: 202 }
    )
  } catch (error) {
    const isValidationError =
      error instanceof Error &&
      (error.message.includes('wajib') ||
        error.message.includes('tidak valid') ||
        error.message.includes('sudah terdaftar') ||
        error.message.includes('tidak dikenali'))
    return NextResponse.json(
      {
        ok: false,
        error: isValidationError ? (error as Error).message : 'Pendaftaran gagal diproses.',
        debug: (error as Error).message,
      },
      { status: 400 }
    )
  }
}
