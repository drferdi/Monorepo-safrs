// Drferdi — vision, brought to life.
import { NextResponse } from 'next/server'
import {
  createCrewSession,
  getSessionCookieOptions,
  validateCrewAccess,
} from '@/lib/server/crew-access-auth'
import { getClientIp, loginRateLimiter } from '@/lib/server/rate-limit'

export const runtime = 'nodejs'

interface LoginPayload {
  username: string
  password: string
}

function parseLoginPayload(raw: unknown): LoginPayload {
  if (!raw || typeof raw !== 'object') throw new Error('Payload login tidak valid.')
  const body = raw as Record<string, unknown>
  const username = String(body.username ?? '').trim()
  const password = String(body.password ?? '')
  if (!username || !password) throw new Error('Username/email dan password wajib diisi.')
  return { username, password }
}

/**
 * Autentikasi anggota kru (Crew)
 * @summary Masuk sebagai anggota kru
 * @description Autentikasi dengan username/email dan password untuk membuat cookie sesi yang aman.
 * 
 * @bodyParam {string} username - Nama pengguna atau alamat email terdaftar.
 * @bodyParam {string} password - Kata sandi anggota yang aman.
 * 
 * @example {
 *   "username": "dr.budi",
 *   "password": "securepassword123"
 * }
 */
export async function POST(request: Request) {
  const ip = getClientIp(request)
  const rateCheck = loginRateLimiter.check(ip)
  if (!rateCheck.allowed) {
    return NextResponse.json(
      { ok: false, error: 'Terlalu banyak percobaan login. Coba lagi nanti.' },
      {
        status: 429,
        headers: {
          'Retry-After': String(Math.ceil(rateCheck.retryAfterMs / 1000)),
        },
      }
    )
  }

  try {
    const payload = parseLoginPayload(await request.json())
    const user = await validateCrewAccess(payload.username, payload.password)
    if (!user) {
      return NextResponse.json(
        { ok: false, error: 'Username/email atau password salah.' },
        { status: 401 }
      )
    }

    // Reset rate limit on successful login
    loginRateLimiter.reset(ip)

    const { token, session } = createCrewSession(user)
    const response = NextResponse.json({
      ok: true,
      user: {
        username: session.username,
        displayName: session.displayName,
        email: session.email,
        institution: session.institution,
        profession: session.profession,
        role: session.role,
      },
      expiresAt: session.expiresAt,
    })
    response.cookies.set({
      ...getSessionCookieOptions(),
      value: token,
    })
    return response
  } catch (error) {
    const isValidationError =
      error instanceof Error &&
      (error.message.includes('wajib diisi') || error.message.includes('tidak valid'))
    return NextResponse.json(
      {
        ok: false,
        error: isValidationError ? error.message : 'Gagal memproses login.',
      },
      { status: 400 }
    )
  }
}
