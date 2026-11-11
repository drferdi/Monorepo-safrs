// Designed and constructed by Drferdi.
import assert from 'node:assert/strict'
import fs from 'node:fs'
import Module from 'node:module'
import os from 'node:os'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

// ─── Test-only constants ──────────────────────────────────────────────────────
// All values below are intentionally fake. They are canary/sentinel values or
// test credentials used exclusively by this security test harness.
// MUST NOT appear in production code or real API calls.

/** Canary value injected as DEEPSEEK_API_KEY — asserts it never surfaces in API responses. */
const CANARY_SENTINEL = 'should-never-leak'
/** Fake crew access secret for the isolated test environment. */
const TEST_CREW_SECRET = 'test-crew-access-secret'
/** Fake automation token for the isolated test environment. */
const TEST_AUTO_TOKEN = 'test-automation-token'
/** Primary test account password — used only with the ephemeral `security.test` DB user. */
const TEST_PASSWORD = 'TestPassword#20260'
/** Secondary test registration password — used only in registration flow tests. */
const TEST_PASSWORD_ALT = 'TestPasswordAlt#20260'

/** Load `.env.local` from the dashboard package root so `tsx scripts/...` picks up DATABASE_URL. */
function loadEnvLocalFromDashboardRoot(): void {
  const root = path.join(path.dirname(fileURLToPath(import.meta.url)), '..')
  const envPath = path.join(root, '.env.local')
  if (!fs.existsSync(envPath)) return
  const raw = fs.readFileSync(envPath, 'utf8')
  for (const line of raw.split(/\r?\n/)) {
    const trimmed = line.trim()
    if (!trimmed || trimmed.startsWith('#')) continue
    const eq = trimmed.indexOf('=')
    if (eq <= 0) continue
    const key = trimmed.slice(0, eq).trim()
    let val = trimmed.slice(eq + 1).trim()
    if ((val.startsWith('"') && val.endsWith('"')) || (val.startsWith("'") && val.endsWith("'"))) {
      val = val.slice(1, -1)
    }
    if (process.env[key] === undefined) process.env[key] = val
  }
}

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
  loadEnvLocalFromDashboardRoot()
  process.env.NODE_ENV = 'test'
  const skip = process.env.SKIP_AUTH_HARDENING === '1' || process.env.SKIP_AUTH_HARDENING === 'true'
  if (skip) {
    console.warn(
      'SKIP_AUTH_HARDENING is set — skipping auth-hardening suite (no security assertions run). Use only when Postgres is unavailable (e.g. agent sandbox).'
    )
    process.exit(0)
  }
  if (!process.env.DATABASE_URL?.trim()) {
    console.error(
      'DATABASE_URL is required for auth-hardening tests. Set it in the environment or in .env.local at the dashboard package root (Postgres with migrations applied).'
    )
    process.exit(1)
  }
  process.env.CREW_ACCESS_SECRET = TEST_CREW_SECRET
  process.env.CREW_ACCESS_AUTOMATION_TOKEN = TEST_AUTO_TOKEN
  process.env.DEEPSEEK_API_KEY = CANARY_SENTINEL
  process.env.CREW_ACCESS_USERS_JSON = ''

  const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'crew-access-test-'))
  const requestsFile = path.join(tempDir, 'crew-access-registration-requests.json')
  const profileFile = path.join(tempDir, 'crew-access-user-profiles.json')
  process.env.CREW_ACCESS_REGISTRATION_REQUESTS_FILE = requestsFile
  process.env.CREW_ACCESS_PROFILE_FILE = profileFile

  const debugRoutePath = new URL('../src/app/api/auth/debug-env/route.ts', import.meta.url)
  assert.equal(fs.existsSync(debugRoutePath), false, 'Debug auth route file must be removed')

  const authModule = await import('../src/lib/server/crew-access-auth')
  const passwordHash = await authModule.hashCrewAccessPassword(TEST_PASSWORD)
  process.env.CREW_ACCESS_USERS_JSON = JSON.stringify([
    {
      username: 'security.test',
      displayName: 'Security Test',
      email: 'security.test@example.com',
      institution: 'Puskesmas Balowerti Kota Kediri',
      profession: 'Dokter',
      role: 'DOKTER',
      passwordHash,
    },
  ])

  const prismaModule = await import('../src/lib/prisma')
  const { prisma } = prismaModule
  try {
    await prisma.user.upsert({
      where: { username: 'security.test' },
      create: {
        username: 'security.test',
        passwordHash,
        displayName: 'Security Test',
        email: 'security.test@example.com',
        institution: 'Puskesmas Balowerti Kota Kediri',
        profession: 'Dokter',
        role: 'DOKTER',
        status: 'ACTIVE',
      },
      update: {
        passwordHash,
        displayName: 'Security Test',
        email: 'security.test@example.com',
        institution: 'Puskesmas Balowerti Kota Kediri',
        profession: 'Dokter',
        role: 'DOKTER',
        status: 'ACTIVE',
      },
    })
  } catch (error: unknown) {
    const code =
      error && typeof error === 'object' && 'code' in error
        ? String((error as { code?: unknown }).code)
        : ''
    if (code === 'P1000' || code === 'P1001') {
      console.error(
        'Auth hardening could not connect to Postgres. Check DATABASE_URL and that the server is reachable (migrations applied).',
        error
      )
      process.exit(1)
    }
    throw error
  }

  const loginRoute = await import('../src/app/api/auth/login/route')
  const profileRoute = await import('../src/app/api/auth/profile/route')
  const registerRoute = await import('../src/app/api/auth/register/route')
  const diagnoseRoute = await import('../src/app/api/cdss/diagnose/route')
  const voiceTokenRoute = await import('../src/app/api/voice/token/route')
  const voiceTtsRoute = await import('../src/app/api/voice/tts/route')

  const originalFetch = globalThis.fetch
  globalThis.fetch = async (input: string | URL | Request, init?: RequestInit) => {
    return originalFetch(input as RequestInfo | URL, init)
  }

  try {
    const { createCrewSession, getSessionCookieOptions } = authModule

    const loginResponse = await loginRoute.POST(
      new Request('http://localhost/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          username: 'security.test@example.com',
          password: TEST_PASSWORD,
        }),
      })
    )
    assert.equal(loginResponse.status, 200, 'Hashed password login must return 200')
    const loginPayload = (await loginResponse.json()) as { ok?: boolean }
    assert.equal(loginPayload.ok, true, 'Hashed password login must succeed')

    const registerPayload = {
      email: 'new.staff@example.com',
      username: 'new.staff',
      password: TEST_PASSWORD_ALT,
      institution: 'Puskesmas Balowerti Kota Kediri',
      profession: 'Apoteker',
      fullName: 'apt. New Staff',
      birthPlace: 'Kediri',
      birthDate: '1990-05-21',
      gender: 'Perempuan',
      domicile: 'Kota Kediri',
      jobTitles: ['Apoteker'],
      serviceAreas: ['JIWA'],
    }

    const registerResponse = await registerRoute.POST(
      new Request('http://localhost/api/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(registerPayload),
      })
    )

    console.log('[DEBUG] Register status:', registerResponse.status)
    const responseBody = await registerResponse.clone().json()
    console.log('[DEBUG] Register response:', responseBody)

    assert.equal(registerResponse.status, 202, 'Registration request must return 202')

    const invalidDateRegisterResponse = await registerRoute.POST(
      new Request('http://localhost/api/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: 'invalid.date@example.com',
          username: 'invalid.date',
          password: TEST_PASSWORD_ALT,
          institution: 'RSIA Melinda DHAI',
          profession: 'Administrator',
          fullName: 'Invalid Date',
          birthPlace: 'Kediri',
          birthDate: '2024-02-31',
          gender: 'Perempuan',
          domicile: 'Kota Kediri',
          jobTitles: ['Pengelola Data dan Informasi'],
          serviceAreas: [],
        }),
      })
    )
    assert.equal(invalidDateRegisterResponse.status, 400, 'Impossible birth date must be rejected')

    const tooManyPositionsResponse = await registerRoute.POST(
      new Request('http://localhost/api/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: 'too.many.positions@example.com',
          username: 'too.many.positions',
          password: TEST_PASSWORD_ALT,
          institution: 'Puskesmas Balowerti Kota Kediri',
          profession: 'Administrator',
          fullName: 'Too Many Positions',
          birthPlace: 'Kediri',
          birthDate: '1990-05-21',
          gender: 'Laki-laki',
          domicile: 'Kota Kediri',
          jobTitles: [
            'Kepala Puskesmas',
            'Perencana',
            'Kepegawaian',
            'Pengelola Data dan Informasi',
          ],
          serviceAreas: [],
        }),
      })
    )
    assert.equal(
      tooManyPositionsResponse.status,
      400,
      'Registration with more than three positions must be rejected'
    )

    const { token } = createCrewSession({
      username: 'security.test',
      displayName: 'Security Test',
      email: 'security.test@example.com',
      institution: 'Puskesmas Balowerti Kota Kediri',
      profession: 'Dokter',
      role: 'DOKTER',
    })
    const cookieName = getSessionCookieOptions().name

    const anonymousProfileResponse = await profileRoute.GET(
      new Request('http://localhost/api/auth/profile')
    )
    assert.equal(anonymousProfileResponse.status, 401, 'Anonymous profile request must return 401')

    const anonymousDiagnoseResponse = await diagnoseRoute.POST(
      new Request('http://localhost/api/cdss/diagnose', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          keluhan_utama: 'demam',
          usia: 34,
          jenis_kelamin: 'L',
        }),
      })
    )
    assert.equal(
      anonymousDiagnoseResponse.status,
      401,
      'Anonymous diagnose request must return 401'
    )

    const anonymousTtsResponse = await voiceTtsRoute.POST(
      new Request('http://localhost/api/voice/tts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text: 'Halo Audrey' }),
      })
    )
    assert.equal(anonymousTtsResponse.status, 401, 'Anonymous TTS request must return 401')

    const anonymousVoiceTokenResponse = await voiceTokenRoute.POST(
      new Request('http://localhost/api/voice/token', {
        method: 'POST',
      })
    )
    assert.equal(
      anonymousVoiceTokenResponse.status,
      401,
      'Anonymous voice token request must return 401'
    )
    const anonymousVoicePayload = await anonymousVoiceTokenResponse.text()
    assert.equal(
      anonymousVoicePayload.includes('apiKey'),
      false,
      'Anonymous voice token response must not mention apiKey'
    )

    const authenticatedVoiceTokenResponse = await voiceTokenRoute.POST(
      new Request('http://localhost/api/voice/token', {
        method: 'POST',
        headers: {
          cookie: `${cookieName}=${token}`,
        },
      })
    )
    assert.equal(
      authenticatedVoiceTokenResponse.status,
      503,
      'Authenticated voice token request must return 503 while voice is disabled'
    )

    const payload = (await authenticatedVoiceTokenResponse.json()) as Record<string, unknown>
    const responseText = JSON.stringify(payload)

    assert.equal(
      payload.error,
      'Voice token sementara dinonaktifkan selama exit Google total.',
      'Voice token response must explain disabled state'
    )
    assert.equal('apiKey' in payload, false, 'Voice token response must not include apiKey field')
    assert.equal(
      responseText.includes(CANARY_SENTINEL),
      false,
      'Voice token response must not leak DEEPSEEK_API_KEY'
    )

    const authenticatedProfileBeforeUpdate = await profileRoute.GET(
      new Request('http://localhost/api/auth/profile', {
        headers: {
          cookie: `${cookieName}=${token}`,
        },
      })
    )
    assert.equal(
      authenticatedProfileBeforeUpdate.status,
      200,
      'Authenticated profile GET must return 200'
    )
    const profileBeforePayload = (await authenticatedProfileBeforeUpdate.json()) as {
      profile?: { fullName?: string; avatarUrl?: string }
    }
    assert.equal(
      profileBeforePayload.profile?.fullName,
      'Security Test',
      'Default profile should bootstrap from session display name'
    )
    assert.equal(
      profileBeforePayload.profile?.avatarUrl,
      '/avatar/doctor-m.png',
      'Default profile should use profession-based avatar'
    )

    const authenticatedProfileUpdate = await profileRoute.PUT(
      new Request('http://localhost/api/auth/profile', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          cookie: `${cookieName}=${token}`,
        },
        body: JSON.stringify({
          fullName: 'Security Test Updated',
          birthPlace: 'Kediri',
          birthDate: '1991-01-02',
          gender: 'Laki-laki',
          domicile: 'Kota Kediri',
          bloodType: 'O',
          degrees: ['dr.', 'M.Kes.'],
          jobTitles: ['Dokter Penanggung Jawab', 'Dokter/Dokter Gigi'],
          employeeId: 'EMP-01',
          strNumber: 'STR-01',
          sipNumber: 'SIP-01',
          serviceAreas: ['IGD'],
          serviceAreaOther: '',
          institutionAdditional: '',
          avatarUrl: '/avatar/admin.png',
        }),
      })
    )
    assert.equal(
      authenticatedProfileUpdate.status,
      200,
      'Authenticated profile PUT must return 200'
    )
    const profileUpdatePayload = (await authenticatedProfileUpdate.json()) as {
      profile?: {
        fullName?: string
        serviceAreas?: string[]
        jobTitles?: string[]
        degrees?: string[]
        avatarUrl?: string
      }
    }
    assert.equal(
      profileUpdatePayload.profile?.fullName,
      'Security Test Updated',
      'Profile update must persist new full name'
    )
    assert.deepEqual(
      profileUpdatePayload.profile?.serviceAreas,
      ['IGD'],
      'Profile update must preserve selected service areas'
    )
    assert.deepEqual(
      profileUpdatePayload.profile?.jobTitles,
      ['Dokter Penanggung Jawab', 'Dokter/Dokter Gigi'],
      'Profile update must persist selected positions'
    )
    assert.deepEqual(
      profileUpdatePayload.profile?.degrees,
      ['dr.', 'M.Kes.'],
      'Profile update must persist selected degrees'
    )
    assert.equal(
      profileUpdatePayload.profile?.avatarUrl,
      '/avatar/doctor-m.png',
      'Profile update must keep avatar auto-selected by profession and gender'
    )
    const savedProfiles = JSON.parse(fs.readFileSync(profileFile, 'utf-8')) as Array<{
      username?: string
      fullName?: string
    }>
    assert.equal(savedProfiles[0]?.username, 'security.test', 'Profile file must persist username')
    assert.equal(
      savedProfiles[0]?.fullName,
      'Security Test Updated',
      'Profile file must persist updated full name'
    )

    globalThis.fetch = async () =>
      new Response(
        JSON.stringify({
          audioContent: Buffer.from('mock-audio').toString('base64'),
        }),
        {
          status: 200,
          headers: { 'Content-Type': 'application/json' },
        }
      )

    const authenticatedTtsResponse = await voiceTtsRoute.POST(
      new Request('http://localhost/api/voice/tts', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          cookie: `${cookieName}=${token}`,
        },
        body: JSON.stringify({ text: 'Halo Audrey' }),
      })
    )
    assert.equal(
      authenticatedTtsResponse.status,
      503,
      'Authenticated TTS request must return 503 while voice is disabled'
    )
    const authenticatedTtsPayload = (await authenticatedTtsResponse.json()) as Record<string, unknown>
    assert.equal(
      authenticatedTtsPayload.error,
      'Voice TTS sementara dinonaktifkan selama exit Google total.',
      'Authenticated TTS response must explain disabled state'
    )
  } finally {
    globalThis.fetch = originalFetch
    nodeModule._load = originalLoad
    fs.rmSync(tempDir, { recursive: true, force: true })
    try {
      await prisma.user.deleteMany({ where: { username: 'security.test' } })
      await prisma.$disconnect()
    } catch {
      // ignore cleanup failures (e.g. DB already torn down)
    }
  }

  console.log('Auth hardening checks passed.')
}

void main()
