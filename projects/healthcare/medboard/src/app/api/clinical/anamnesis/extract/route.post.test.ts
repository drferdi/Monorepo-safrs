import assert from 'node:assert/strict'
import test from 'node:test'

import { NextRequest } from 'next/server'

async function postAnamnesisExtract(text: string): Promise<Response> {
  process.env.DATABASE_URL ||=
    'postgresql://placeholder:placeholder@127.0.0.1:5432/placeholder?schema=public'
  process.env.CREW_ACCESS_AUTOMATION_TOKEN = 'anamnesis-route-test-token'
  const { POST } = await import('./route')
  return await POST(
    new NextRequest('http://localhost/api/clinical/anamnesis/extract', {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
        'x-crew-access-token': 'anamnesis-route-test-token',
      },
      body: JSON.stringify({ text }),
    })
  )
}

test('anamnesis extract accepts the full symptom text Assist sends, beyond 2000 characters', async () => {
  const text = 'demam tiga hari, batuk berdahak, nyeri tenggorokan, '.repeat(50)
  assert.ok(text.length > 2000)

  const response = await postAnamnesisExtract(text)
  const body = await response.json()

  assert.equal(response.status, 200)
  assert.equal(body.ok, true)
})

test('anamnesis extract still rejects text above 10000 characters with 400', async () => {
  const response = await postAnamnesisExtract('a'.repeat(10001))

  assert.equal(response.status, 400)
})
