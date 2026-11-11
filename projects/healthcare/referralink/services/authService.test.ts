import assert from 'node:assert/strict'
import fs from 'node:fs'
import path from 'node:path'
import { afterEach, test } from 'node:test'
import { fileURLToPath } from 'node:url'

import { deleteSandboxSession, getSandboxSession } from './authService.js'

const currentDir = path.dirname(fileURLToPath(import.meta.url))
const originalFetch = globalThis.fetch

afterEach(() => {
  globalThis.fetch = originalFetch
})

test('session hydration bypasses browser caches', async () => {
  let requestInit: RequestInit | undefined
  globalThis.fetch = async (_input, init) => {
    requestInit = init
    return new Response(
      JSON.stringify({ authenticated: false, accessMode: null, expiresAt: null }),
      { status: 401, headers: { 'Content-Type': 'application/json' } }
    )
  }

  await getSandboxSession()

  assert.equal(requestInit?.cache, 'no-store')
  assert.equal(requestInit?.credentials, 'include')
})

test('logout rejects when the server did not revoke the session', async () => {
  globalThis.fetch = async () =>
    new Response(JSON.stringify({ authenticated: true, accessMode: 'sandbox', expiresAt: null }), {
      status: 503,
      headers: { 'Content-Type': 'application/json' },
    })

  await assert.rejects(deleteSandboxSession(), /Gagal mengakhiri sesi sandbox/)
})

test('App preserves authenticated state on logout failure and exposes a retry-safe error', () => {
  const appSource = fs.readFileSync(path.join(currentDir, '..', 'App.tsx'), 'utf8')

  assert.doesNotMatch(appSource, /deleteSandboxSession\(\)\.finally/)
  assert.match(appSource, /logoutError/)
  assert.match(appSource, /Gagal keluar.*coba lagi/i)
})
