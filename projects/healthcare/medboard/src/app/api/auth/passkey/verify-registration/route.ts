// Drferdi — vision, brought to life.
import { verifyRegistrationResponse, type RegistrationResponseJSON } from '@simplewebauthn/server'
import { NextResponse } from 'next/server'

import {
  consumePasskeyRegistrationChallenge,
  getCrewSessionFromRequest,
  getCrewUserIdByUsername,
  getWebAuthnAllowedOrigins,
  getWebAuthnRpID,
  savePasskeyCredential,
} from '@/lib/server/crew-access-auth'

export const runtime = 'nodejs'

interface VerifyRegistrationPayload {
  response: RegistrationResponseJSON
  name?: string
}

/**
 * Verify a passkey registration ceremony and store the new credential.
 * @summary Verifikasi pendaftaran passkey
 * @description Memverifikasi respons WebAuthn registrasi dan menyimpan kredensial baru untuk akun yang sedang login.
 */
export async function POST(request: Request) {
  const session = getCrewSessionFromRequest(request)
  if (!session) {
    return NextResponse.json({ ok: false, error: 'Unauthorized' }, { status: 401 })
  }

  const expectedChallenge = consumePasskeyRegistrationChallenge(session.username)
  if (!expectedChallenge) {
    return NextResponse.json(
      { ok: false, error: 'Sesi pendaftaran passkey kedaluwarsa. Coba lagi.' },
      { status: 400 }
    )
  }

  const userId = await getCrewUserIdByUsername(session.username)
  if (!userId) {
    return NextResponse.json({ ok: false, error: 'User tidak ditemukan.' }, { status: 404 })
  }

  let payload: VerifyRegistrationPayload
  try {
    payload = (await request.json()) as VerifyRegistrationPayload
  } catch {
    return NextResponse.json({ ok: false, error: 'Payload tidak valid.' }, { status: 400 })
  }

  try {
    const verification = await verifyRegistrationResponse({
      response: payload.response,
      expectedChallenge,
      expectedOrigin: getWebAuthnAllowedOrigins(),
      expectedRPID: getWebAuthnRpID(),
      requireUserVerification: false,
    })

    if (!verification.verified || !verification.registrationInfo) {
      return NextResponse.json({ ok: false, error: 'Verifikasi passkey gagal.' }, { status: 400 })
    }

    const { credential, credentialDeviceType, credentialBackedUp } = verification.registrationInfo

    await savePasskeyCredential({
      userId,
      credentialId: credential.id,
      publicKey: credential.publicKey,
      counter: credential.counter,
      transports: credential.transports?.join(','),
      deviceType: credentialDeviceType,
      backedUp: credentialBackedUp,
      name: payload.name,
    })

    return NextResponse.json({ ok: true })
  } catch (error) {
    return NextResponse.json(
      { ok: false, error: error instanceof Error ? error.message : 'Verifikasi passkey gagal.' },
      { status: 400 }
    )
  }
}
