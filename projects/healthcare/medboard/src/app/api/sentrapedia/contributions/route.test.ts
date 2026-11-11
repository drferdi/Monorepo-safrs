import assert from 'node:assert/strict'
import { randomBytes } from 'node:crypto'
import { rmSync } from 'node:fs'
import os from 'node:os'
import path from 'node:path'
import { before, beforeEach, test } from 'node:test'

import { CREW_ACCESS_COOKIE_NAME } from '@/lib/crew-access'

process.env.DATABASE_URL ||= 'postgresql://placeholder:placeholder@127.0.0.1:5432/placeholder?schema=public'
process.env.CREW_ACCESS_SECRET = randomBytes(32).toString('hex')
process.env.CREW_ACCESS_PROFILE_FILE = path.join(os.tmpdir(), `medboard-contrib-profile-${process.pid}.json`)
const file = path.join(os.tmpdir(), `medboard-contrib-route-${process.pid}.jsonl`)
process.env.SENTRAPEDIA_CONTRIBUTIONS_FILE = file
delete process.env.DEEPSEEK_API_KEY

// Loaded in before(): the capsule is CommonJS, so no top-level await.
let route: typeof import('./route')
let item: typeof import('./[id]/route')
let auth: typeof import('@/lib/server/crew-access-auth')
let store: typeof import('@/lib/server/sentrapedia-contributions')
before(async () => {
  route = await import('./route')
  item = await import('./[id]/route')
  auth = await import('@/lib/server/crew-access-auth')
  store = await import('@/lib/server/sentrapedia-contributions')
})
beforeEach(() => rmSync(file, { force: true }))

function cookie(username: string, role: string): string {
  const { token } = auth.createCrewSession({
    username,
    displayName: username,
    email: `${username}@example.test`,
    institution: 'Puskesmas Uji',
    profession: 'Dokter',
    role,
  })
  return `${CREW_ACCESS_COOKIE_NAME}=${token}`
}

const doctor = () => cookie('dokter.uji', 'DOKTER')
const otherDoctor = () => cookie('dokter.lain', 'DOKTER')
const chief = () => cookie('chief.uji', 'CEO')

const body = {
  diseaseId: 1,
  field: 'terapi',
  proposedText: 'Terapi simtomatik: parasetamol 500 mg 3x sehari bila demam, istirahat, dan hidrasi cukup.',
  reference: 'PNPK Kemenkes 2020',
  note: '',
}

function post(headers: Record<string, string>, payload: unknown = body) {
  return route.POST(
    new Request('http://127.0.0.1:4345/api/sentrapedia/contributions', {
      method: 'POST',
      headers: { 'content-type': 'application/json', ...headers },
      body: JSON.stringify(payload),
    })
  )
}

function list(headers: Record<string, string>, query = '') {
  return route.GET(new Request(`http://127.0.0.1:4345/api/sentrapedia/contributions${query}`, { headers }))
}

function decide(id: string, headers: Record<string, string>, action: string) {
  return item.PATCH(
    new Request(`http://127.0.0.1:4345/api/sentrapedia/contributions/${id}`, {
      method: 'PATCH',
      headers: { 'content-type': 'application/json', ...headers },
      body: JSON.stringify({ action, note: '' }),
    }),
    { params: Promise.resolve({ id }) }
  )
}

test('without a crew session nobody can send or read contributions', async () => {
  assert.equal((await post({})).status, 401)
  assert.equal((await list({})).status, 401)
  assert.deepEqual(store.listContributions(), [])
})

test('a signed-in doctor sends a contribution; it is stored under their name and waits for the AI review', async () => {
  const response = await post({ cookie: doctor() })
  assert.equal(response.status, 201)
  const json = (await response.json()) as { contribution: { status: string; contributor: { username: string }; aiReview: { available: boolean } } }
  assert.equal(json.contribution.contributor.username, 'dokter.uji')
  assert.equal(json.contribution.status, 'ai_review')
  assert.equal(json.contribution.aiReview.available, false)
  assert.equal(store.listContributions().length, 1)
})

test('an invalid contribution is refused and nothing is stored', async () => {
  const response = await post({ cookie: doctor() }, { ...body, reference: '' })
  assert.equal(response.status, 400)
  assert.deepEqual(store.listContributions(), [])
})

test('a doctor sees only their own contributions; Chief sees all of them', async () => {
  await post({ cookie: doctor() })
  await post({ cookie: otherDoctor() })
  const mine = (await (await list({ cookie: doctor() })).json()) as { contributions: Array<{ contributor: { username: string } }> }
  assert.deepEqual(mine.contributions.map((c) => c.contributor.username), ['dokter.uji'])
  const all = (await (await list({ cookie: chief() })).json()) as { contributions: unknown[] }
  assert.equal(all.contributions.length, 2)
})

test('only Chief decides, and only after the AI review; approved text is then readable by the crew', async () => {
  await post({ cookie: doctor() })
  const [record] = store.listContributions()

  assert.equal((await decide(record.id, { cookie: doctor() }, 'approve')).status, 403)
  assert.equal((await decide(record.id, { cookie: chief() }, 'approve')).status, 409)

  store.recordAiReview(record.id, { available: true, verdict: 'layak', summary: 'Sesuai pedoman.', concerns: [], reviewedAt: new Date().toISOString() })
  assert.equal((await decide(record.id, { cookie: chief() }, 'approve')).status, 200)

  const approved = (await (await list({ cookie: otherDoctor() }, '?status=approved')).json()) as { contributions: Array<{ id: string }> }
  assert.deepEqual(approved.contributions.map((c) => c.id), [record.id])
})

test('deciding an unknown contribution or an unknown action is refused', async () => {
  assert.equal((await decide('tidak-ada', { cookie: chief() }, 'approve')).status, 404)
  await post({ cookie: doctor() })
  const [record] = store.listContributions()
  assert.equal((await decide(record.id, { cookie: chief() }, 'hapus')).status, 400)
})
