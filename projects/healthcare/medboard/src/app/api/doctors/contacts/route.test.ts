import assert from 'node:assert/strict'
import test from 'node:test'

async function loadContactsRouteModule() {
  process.env.DATABASE_URL ||=
    'postgresql://placeholder:placeholder@127.0.0.1:5432/placeholder?schema=public'
  return await import('./route')
}

test('route doctors contacts tersedia di path yang benar', async () => {
  const fs = await import('node:fs')
  const path = await import('node:path')
  const routePath = path.join(process.cwd(), 'src/app/api/doctors/contacts/route.ts')

  assert.ok(fs.existsSync(routePath), 'route.ts harus tersedia')
})

test('route doctors contacts mengekspor GET, OPTIONS, dan runtime nodejs, memakai auth crew', async () => {
  const fs = await import('node:fs')
  const path = await import('node:path')
  const routePath = path.join(process.cwd(), 'src/app/api/doctors/contacts/route.ts')
  const content = fs.readFileSync(routePath, 'utf-8')

  assert.ok(content.includes('export async function GET'), 'harus mengekspor GET handler')
  assert.ok(content.includes('export async function OPTIONS'), 'harus mengekspor OPTIONS handler')
  assert.ok(content.includes("runtime = 'nodejs'"), 'harus set nodejs runtime')
  assert.ok(content.includes('isCrewAuthorizedRequest'), 'harus memakai auth crew')
})

test('route doctors contacts checks crew auth before any data read', async () => {
  const fs = await import('node:fs')
  const path = await import('node:path')
  const routePath = path.join(process.cwd(), 'src/app/api/doctors/contacts/route.ts')
  const content = fs.readFileSync(routePath, 'utf-8')

  const authCheckIndex = content.indexOf('isCrewAuthorizedRequest(request)')
  const dataReadIndex = content.indexOf('buildDoctorContacts(')

  assert.notEqual(authCheckIndex, -1, 'harus memanggil isCrewAuthorizedRequest')
  assert.notEqual(dataReadIndex, -1, 'harus memanggil buildDoctorContacts')
  assert.ok(authCheckIndex < dataReadIndex, 'auth check harus berjalan sebelum pembacaan data')
})

test('GET returns 401 with { ok: false, error: Unauthorized } for an unauthenticated request', async () => {
  const { GET } = await loadContactsRouteModule()

  const response = await GET(new Request('http://localhost/api/doctors/contacts'))
  const body = await response.json()

  assert.equal(response.status, 401)
  assert.deepEqual(body, { ok: false, error: 'Unauthorized' })
})
