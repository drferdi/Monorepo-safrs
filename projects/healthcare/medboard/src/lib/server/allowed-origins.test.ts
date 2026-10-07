import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import path from 'node:path'
import test from 'node:test'

// Every place that lists the origins allowed to call MedBoard: API CORS, the differential
// route's own CORS, the Socket.IO server and the CSP connect-src.
const ALLOWLISTS = [
  'src/lib/server/api-cors.ts',
  'src/app/api/clinical/differential/evaluate/route.ts',
  'server.ts',
  'next.config.ts',
]

// Chief 2026-10-07: the Railway domain is no longer used; a released *.up.railway.app name can be
// claimed by another Railway project, so no allowlist may keep it.
for (const file of ALLOWLISTS) {
  test(`${file} allows the MedBoard VPS origin and no Railway host`, () => {
    const source = readFileSync(path.join(process.cwd(), file), 'utf8')
    assert.match(source, /'https:\/\/medboard\.sentrahai\.com'/)
    assert.doesNotMatch(source, /railway\.app/)
  })
}
