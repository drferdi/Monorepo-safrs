import assert from 'node:assert/strict'
import { randomBytes } from 'node:crypto'
import { mkdtempSync, writeFileSync } from 'node:fs'
import os from 'node:os'
import path from 'node:path'
import { before, test } from 'node:test'

import { CREW_ACCESS_COOKIE_NAME } from '@/lib/crew-access'
import { OFFICIAL_DOCUMENTS } from '@/lib/hub/organisation'

process.env.CREW_ACCESS_SECRET = randomBytes(32).toString('hex')
process.env.CREW_ACCESS_AUTOMATION_TOKEN = randomBytes(24).toString('hex')

// Loaded in before(): the capsule is CommonJS, so no top-level await.
let documents: typeof import('./official-documents')
let auth: typeof import('@/lib/server/crew-access-auth')
before(async () => {
  documents = await import('./official-documents')
  auth = await import('@/lib/server/crew-access-auth')
})

const charter = OFFICIAL_DOCUMENTS[0]
const pdfBytes = Buffer.from('%PDF-1.7 test charter')

function folderWithCharter(): string {
  const dir = mkdtempSync(path.join(os.tmpdir(), 'medboard-documents-'))
  writeFileSync(path.join(dir, charter.file), pdfBytes)
  return dir
}

function request(headers: Record<string, string> = {}): Request {
  return new Request(`http://127.0.0.1:4345/api/hub/documents/${charter.id}`, { headers })
}

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

test('a document is refused without a signed-in crew session', async () => {
  const response = await documents.serveOfficialDocument(request(), charter.id, folderWithCharter())
  assert.equal(response.status, 401)
})

test('the automation token alone does not open a document; only signed-in people may download', async () => {
  const response = await documents.serveOfficialDocument(
    request({ 'x-crew-access-token': process.env.CREW_ACCESS_AUTOMATION_TOKEN ?? '' }),
    charter.id,
    folderWithCharter()
  )
  assert.equal(response.status, 401)
})

test('a signed-in crew member downloads the PDF as an attachment that is never cached', async () => {
  const response = await documents.serveOfficialDocument(request({ cookie: sessionCookie() }), charter.id, folderWithCharter())
  assert.equal(response.status, 200)
  assert.equal(response.headers.get('content-type'), 'application/pdf')
  assert.equal(response.headers.get('content-disposition'), `attachment; filename="${charter.file}"`)
  assert.equal(response.headers.get('cache-control'), 'private, no-store')
  assert.deepEqual(Buffer.from(await response.arrayBuffer()), pdfBytes)
})

test('an unknown document id, or one whose file is not on this server, answers 404', async () => {
  const unknown = await documents.serveOfficialDocument(request({ cookie: sessionCookie() }), '../.env', folderWithCharter())
  assert.equal(unknown.status, 404)
  const empty = mkdtempSync(path.join(os.tmpdir(), 'medboard-documents-'))
  const missing = await documents.serveOfficialDocument(request({ cookie: sessionCookie() }), charter.id, empty)
  assert.equal(missing.status, 404)
})
