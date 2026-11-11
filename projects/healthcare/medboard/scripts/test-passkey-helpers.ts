// Architected and built by Drferdi.
import assert from 'node:assert/strict'
import Module from 'node:module'
import test from 'node:test'

// crew-access-auth.ts imports 'server-only', which throws unconditionally
// outside a Next.js Server Component bundling context. Stub it the same way
// scripts/test-auth-hardening.ts does so this pure-logic suite can run
// without a live database — none of the assertions below touch Prisma.
const nodeModule = Module as typeof Module & {
  _load: (request: string, parent: NodeModule | null, isMain: boolean) => unknown
}
const originalLoad = nodeModule._load
nodeModule._load = function patchedLoad(
  request: string,
  parent: NodeModule | null,
  isMain: boolean
) {
  if (request === 'server-only') return {}
  return originalLoad.call(this, request, parent, isMain)
}

async function main(): Promise<void> {
  const authModule = await import('../src/lib/server/crew-access-auth')

  test('getWebAuthnRpID falls back to NEXT_PUBLIC_BASE_URL hostname', () => {
    const previous = process.env.NEXT_PUBLIC_BASE_URL
    const previousOverride = process.env.CREW_ACCESS_WEBAUTHN_RP_ID
    delete process.env.CREW_ACCESS_WEBAUTHN_RP_ID
    process.env.NEXT_PUBLIC_BASE_URL = 'https://medboard.sentrahai.com'

    assert.equal(authModule.getWebAuthnRpID(), 'medboard.sentrahai.com')

    if (previous === undefined) delete process.env.NEXT_PUBLIC_BASE_URL
    else process.env.NEXT_PUBLIC_BASE_URL = previous
    if (previousOverride !== undefined) process.env.CREW_ACCESS_WEBAUTHN_RP_ID = previousOverride
  })

  test('getWebAuthnRpID defaults to the MedBoard host when no base URL is set', () => {
    const previous = process.env.NEXT_PUBLIC_BASE_URL
    const previousOverride = process.env.CREW_ACCESS_WEBAUTHN_RP_ID
    delete process.env.NEXT_PUBLIC_BASE_URL
    delete process.env.CREW_ACCESS_WEBAUTHN_RP_ID

    assert.equal(authModule.getWebAuthnRpID(), 'medboard.sentrahai.com')

    if (previous !== undefined) process.env.NEXT_PUBLIC_BASE_URL = previous
    if (previousOverride !== undefined) process.env.CREW_ACCESS_WEBAUTHN_RP_ID = previousOverride
  })

  test('getWebAuthnRpID honors an explicit override', () => {
    const previous = process.env.CREW_ACCESS_WEBAUTHN_RP_ID
    process.env.CREW_ACCESS_WEBAUTHN_RP_ID = 'localhost'

    assert.equal(authModule.getWebAuthnRpID(), 'localhost')

    if (previous === undefined) delete process.env.CREW_ACCESS_WEBAUTHN_RP_ID
    else process.env.CREW_ACCESS_WEBAUTHN_RP_ID = previous
  })

  test('getWebAuthnAllowedOrigins splits a comma-separated override (needed for the chrome-extension:// origin)', () => {
    const previous = process.env.CREW_ACCESS_WEBAUTHN_ORIGINS
    process.env.CREW_ACCESS_WEBAUTHN_ORIGINS =
      'https://medboard.sentrahai.com, chrome-extension://abcdefg'

    assert.deepEqual(authModule.getWebAuthnAllowedOrigins(), [
      'https://medboard.sentrahai.com',
      'chrome-extension://abcdefg',
    ])

    if (previous === undefined) delete process.env.CREW_ACCESS_WEBAUTHN_ORIGINS
    else process.env.CREW_ACCESS_WEBAUTHN_ORIGINS = previous
  })

  test('registration challenge is single-use per username', () => {
    authModule.startPasskeyRegistrationChallenge('dr.ferdi', 'challenge-1')

    assert.equal(authModule.consumePasskeyRegistrationChallenge('dr.ferdi'), 'challenge-1')
    assert.equal(
      authModule.consumePasskeyRegistrationChallenge('dr.ferdi'),
      null,
      'a consumed registration challenge must not be usable twice'
    )
  })

  test('registration challenge lookup is case/whitespace-normalized like login username matching', () => {
    authModule.startPasskeyRegistrationChallenge('  Dr.Ferdi  ', 'challenge-2')

    assert.equal(authModule.consumePasskeyRegistrationChallenge('dr.ferdi'), 'challenge-2')
  })

  test('authentication challenge is single-use and keyed by the challenge value itself', () => {
    authModule.startPasskeyAuthenticationChallenge('auth-challenge-1')

    assert.equal(authModule.consumePasskeyAuthenticationChallenge('auth-challenge-1'), true)
    assert.equal(
      authModule.consumePasskeyAuthenticationChallenge('auth-challenge-1'),
      false,
      'a consumed authentication challenge must not be usable twice (replay protection)'
    )
  })

  test('an authentication challenge that was never issued is rejected', () => {
    assert.equal(authModule.consumePasskeyAuthenticationChallenge('never-issued'), false)
  })
}

void main()
