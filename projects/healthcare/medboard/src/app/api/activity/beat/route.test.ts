import assert from 'node:assert/strict'
import { randomBytes } from 'node:crypto'
import { before, test } from 'node:test'

process.env.DATABASE_URL ||= 'postgresql://placeholder:placeholder@127.0.0.1:5432/placeholder?schema=public'
process.env.CREW_ACCESS_SECRET = randomBytes(32).toString('hex')
process.env.CREW_ACCESS_AUTOMATION_TOKEN = randomBytes(24).toString('hex')

// Loaded in before(): the capsule is CommonJS, so no top-level await.
let route: typeof import('./route')
before(async () => {
  route = await import('./route')
})

test('a beat without a crew session earns no time', async () => {
  const response = await route.POST(new Request('http://127.0.0.1:4345/api/activity/beat', { method: 'POST' }))
  assert.equal(response.status, 401)
})

test('the automation token carries no user, so it cannot earn hours', async () => {
  const response = await route.POST(
    new Request('http://127.0.0.1:4345/api/activity/beat', {
      method: 'POST',
      headers: { 'x-crew-access-token': process.env.CREW_ACCESS_AUTOMATION_TOKEN ?? '' },
    })
  )
  assert.equal(response.status, 401)
})
