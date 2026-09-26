// Drferdi — vision, brought to life.
import { generateAuthenticationOptions } from '@simplewebauthn/server'
import { NextResponse } from 'next/server'

import { getWebAuthnRpID, startPasskeyAuthenticationChallenge } from '@/lib/server/crew-access-auth'
import { getClientIp, loginRateLimiter } from '@/lib/server/rate-limit'

export const runtime = 'nodejs'

/**
 * Generate WebAuthn authentication options for passkey login. No session or
 * username is required — passkeys registered with `residentKey: 'required'`
 * are discoverable, so the browser resolves which credential to use and the
 * server identifies the account from the credential ID on verification.
 * @summary Buat opsi login passkey
 * @description Menghasilkan challenge WebAuthn untuk login dengan passkey tanpa perlu username terlebih dahulu.
 */
export async function POST(request: Request) {
  const ip = getClientIp(request)
  const rateCheck = loginRateLimiter.check(ip)
  if (!rateCheck.allowed) {
    return NextResponse.json(
      { ok: false, error: 'Terlalu banyak percobaan. Coba lagi nanti.' },
      { status: 429, headers: { 'Retry-After': String(Math.ceil(rateCheck.retryAfterMs / 1000)) } }
    )
  }

  const options = await generateAuthenticationOptions({
    rpID: getWebAuthnRpID(),
    userVerification: 'preferred',
  })

  startPasskeyAuthenticationChallenge(options.challenge)

  return NextResponse.json({ ok: true, options })
}
