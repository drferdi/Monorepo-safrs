import assert from 'node:assert/strict'
import { randomBytes } from 'node:crypto'
import { before, test } from 'node:test'

import { CREW_ACCESS_COOKIE_NAME } from '@/lib/crew-access'

delete process.env.DATABASE_URL
process.env.CREW_ACCESS_SECRET = randomBytes(32).toString('hex')

// Loaded in before(): the capsule is CommonJS, so no top-level await.
let route: typeof import('./crew/[username]/rank/route')
let auth: typeof import('@/lib/server/crew-access-auth')
before(async () => {
  route = await import('./crew/[username]/rank/route')
  auth = await import('@/lib/server/crew-access-auth')
})

const params = (username: string) => ({ params: Promise.resolve({ username }) })

test('a rank is only for signed-in crew', async () => {
  const response = await route.GET(new Request('http://127.0.0.1:4345/api/crew/a/rank'), params('a'))
  assert.equal(response.status, 401)
})

test('without a database everyone is an Intern with no awards yet', async () => {
  const { token } = auth.createCrewSession({
    username: 'perawat.uji',
    displayName: 'Perawat Uji',
    email: 'perawat.uji@example.test',
    institution: 'Puskesmas Uji',
    profession: 'Perawat',
    role: 'PERAWAT',
  })
  const response = await route.GET(
    new Request('http://127.0.0.1:4345/api/crew/perawat.uji/rank', {
      headers: { cookie: `${CREW_ACCESS_COOKIE_NAME}=${token}` },
    }),
    params('perawat.uji')
  )
  const body = (await response.json()) as {
    rank: { name: string; next: { name: string } }
    awards: Array<{ achievedAt: string | null }>
  }
  assert.equal(body.rank.name, 'Intern')
  assert.equal(body.rank.next.name, 'Residen Yunior')
  assert.equal(body.awards.length, 8)
  assert.ok(body.awards.every((award) => award.achievedAt === null))
})
