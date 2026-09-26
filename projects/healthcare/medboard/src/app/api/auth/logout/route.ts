import { getSessionCookieOptions } from '@/lib/server/crew-access-auth'
import { NextResponse } from 'next/server'

export const runtime = 'nodejs'

/**
 * Hapus cookie sesi crew. Wajib pakai atribut sama seperti saat set cookie login
 * (SameSite/Secure di produksi = None + Secure), kalau tidak browser tidak
 * meng-expire cookie `none` yang dibuat di /api/auth/login — user terasa "stuck" setelah logout.
 */
export async function POST() {
  const response = NextResponse.json({ ok: true })
  const sessionOpts = getSessionCookieOptions()
  response.cookies.set({
    ...sessionOpts,
    value: '',
    maxAge: 0,
  })
  return response
}
