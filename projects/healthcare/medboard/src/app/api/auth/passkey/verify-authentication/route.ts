// Drferdi — vision, brought to life.
import {
  verifyAuthenticationResponse,
  type AuthenticationResponseJSON,
  type AuthenticatorTransportFuture,
} from '@simplewebauthn/server'
import { NextResponse } from 'next/server'

import {
  consumePasskeyAuthenticationChallenge,
  createCrewSession,
  findPasskeyCredentialById,
  getCrewUserById,
  getSessionCookieOptions,
  getWebAuthnAllowedOrigins,
  getWebAuthnRpID,
  updatePasskeyCounter,
} from '@/lib/server/crew-access-auth'
import { getClientIp, loginRateLimiter } from '@/lib/server/rate-limit'

export const runtime = 'nodejs'

interface VerifyAuthenticationPayload {
  response: AuthenticationResponseJSON
}

/**
 * Verify a passkey authentication (login) ceremony and issue a crew session
 * cookie — same session shape and cookie as POST /api/auth/login.
 * @summary Verifikasi login passkey
 * @description Memverifikasi respons WebAuthn login dan menerbitkan sesi cookie yang sama seperti login username/password.
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

  let payload: VerifyAuthenticationPayload
  try {
    payload = (await request.json()) as VerifyAuthenticationPayload
  } catch {
    return NextResponse.json({ ok: false, error: 'Payload tidak valid.' }, { status: 400 })
  }

  const credentialId = payload.response?.id
  if (!credentialId) {
    return NextResponse.json({ ok: false, error: 'Kredensial tidak valid.' }, { status: 400 })
  }

  const storedCredential = await findPasskeyCredentialById(credentialId)
  if (!storedCredential) {
    return NextResponse.json(
      { ok: false, error: 'Passkey tidak terdaftar di sistem ini.' },
      { status: 401 }
    )
  }

  try {
    const verification = await verifyAuthenticationResponse({
      response: payload.response,
      expectedChallenge: (challenge) => consumePasskeyAuthenticationChallenge(challenge),
      expectedOrigin: getWebAuthnAllowedOrigins(),
      expectedRPID: getWebAuthnRpID(),
      credential: {
        id: storedCredential.credentialId,
        publicKey: new Uint8Array(storedCredential.publicKey),
        counter: storedCredential.counter,
        transports: storedCredential.transports
          ? (storedCredential.transports.split(',') as AuthenticatorTransportFuture[])
          : undefined,
      },
      requireUserVerification: false,
    })

    if (!verification.verified) {
      return NextResponse.json({ ok: false, error: 'Verifikasi passkey gagal.' }, { status: 401 })
    }

    await updatePasskeyCounter(credentialId, verification.authenticationInfo.newCounter)

    const user = await getCrewUserById(storedCredential.userId)
    if (!user) {
      return NextResponse.json({ ok: false, error: 'User tidak ditemukan.' }, { status: 404 })
    }

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
    return NextResponse.json(
      { ok: false, error: error instanceof Error ? error.message : 'Verifikasi passkey gagal.' },
      { status: 401 }
    )
  }
}
