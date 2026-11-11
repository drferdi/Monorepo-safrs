import assert from 'node:assert/strict'
import { randomBytes } from 'node:crypto'
import os from 'node:os'
import path from 'node:path'
import { before, beforeEach, test } from 'node:test'

import { CREW_ACCESS_COOKIE_NAME } from '@/lib/crew-access'

process.env.DATABASE_URL ||=
  'postgresql://placeholder:placeholder@127.0.0.1:5432/placeholder?schema=public'
process.env.CREW_ACCESS_SECRET = randomBytes(32).toString('hex')
process.env.CREW_ACCESS_AUTOMATION_TOKEN = randomBytes(24).toString('hex')
process.env.CREW_ACCESS_PROFILE_FILE = path.join(os.tmpdir(), `medboard-presence-${Date.now()}.json`)

// Loaded in before(): the capsule is CommonJS, so no top-level await.
let route: typeof import('./route')
let auth: typeof import('@/lib/server/crew-access-auth')
let presence: typeof import('@/lib/server/crew-presence')
before(async () => {
  route = await import('./route')
  auth = await import('@/lib/server/crew-access-auth')
  presence = await import('@/lib/server/crew-presence')
})

beforeEach(() => presence.resetCrewPresence())

function sessionCookie(): string {
  const { token } = auth.createCrewSession({
    username: 'perawat.uji',
    displayName: 'Perawat Uji',
    email: 'perawat.uji@example.test',
    institution: 'Puskesmas Uji',
    profession: 'Perawat',
    role: 'PERAWAT',
  })
  return `${CREW_ACCESS_COOKIE_NAME}=${token}`
}

function presenceRequest(method: 'POST' | 'DELETE', headers: Record<string, string> = {}) {
  return new Request('http://127.0.0.1:4345/api/presence', { method, headers })
}

test('a heartbeat without a crew session is refused and lists no one', async () => {
  const response = await route.POST(presenceRequest('POST'))

  assert.equal(response.status, 401)
  assert.deepEqual(presence.listOnlineUsers(), [])
})

test('the automation token alone carries no user, so it cannot mark anyone online', async () => {
  const response = await route.POST(
    presenceRequest('POST', {
      'X-Crew-Access-Token': process.env.CREW_ACCESS_AUTOMATION_TOKEN ?? '',
    })
  )

  assert.equal(response.status, 401)
  assert.deepEqual(presence.listOnlineUsers(), [])
})

test('a heartbeat with a crew session lists that user as online from Asisten Medis', async () => {
  const response = await route.POST(presenceRequest('POST', { cookie: sessionCookie() }))

  assert.equal(response.status, 200)
  assert.deepEqual(
    presence.listOnlineUsers().map(user => [user.userId, user.name, user.source]),
    [['perawat.uji', 'Perawat Uji', 'assist']]
  )
})

test('going offline removes the user from the online list', async () => {
  await route.POST(presenceRequest('POST', { cookie: sessionCookie() }))

  const response = await route.DELETE(presenceRequest('DELETE', { cookie: sessionCookie() }))

  assert.equal(response.status, 200)
  assert.deepEqual(presence.listOnlineUsers(), [])
})
