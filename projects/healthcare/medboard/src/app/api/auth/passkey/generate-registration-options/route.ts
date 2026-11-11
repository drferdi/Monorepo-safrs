// Drferdi — vision, brought to life.
import {
  generateRegistrationOptions,
  type AuthenticatorTransportFuture,
} from '@simplewebauthn/server'
import { NextResponse } from 'next/server'

import {
  getCrewSessionFromRequest,
  getCrewUserIdByUsername,
  getWebAuthnRpID,
  listPasskeyCredentialsForUser,
  startPasskeyRegistrationChallenge,
} from '@/lib/server/crew-access-auth'

export const runtime = 'nodejs'

/**
 * Generate WebAuthn registration options for the currently signed-in crew
 * member to enroll a new passkey. Requires an existing valid session —
 * passkeys are added to an account after a normal username/password login,
 * not used to create an account.
 * @summary Buat opsi pendaftaran passkey
 * @description Menghasilkan challenge WebAuthn untuk mendaftarkan passkey baru pada akun yang sedang login.
 */
export async function POST(request: Request) {
  const session = getCrewSessionFromRequest(request)
  if (!session) {
    return NextResponse.json({ ok: false, error: 'Unauthorized' }, { status: 401 })
  }

  const userId = await getCrewUserIdByUsername(session.username)
  if (!userId) {
    return NextResponse.json({ ok: false, error: 'User tidak ditemukan.' }, { status: 404 })
  }

  const existingCredentials = await listPasskeyCredentialsForUser(userId)

  const options = await generateRegistrationOptions({
    rpName: 'Sentra Crew',
    rpID: getWebAuthnRpID(),
    userName: session.username,
    userDisplayName: session.displayName,
    attestationType: 'none',
    excludeCredentials: existingCredentials.map((cred) => ({
      id: cred.credentialId,
      transports: cred.transports
        ? (cred.transports.split(',') as AuthenticatorTransportFuture[])
        : undefined,
    })),
    authenticatorSelection: {
      residentKey: 'required',
      userVerification: 'preferred',
    },
  })

  startPasskeyRegistrationChallenge(session.username, options.challenge)

  return NextResponse.json({ ok: true, options })
}
