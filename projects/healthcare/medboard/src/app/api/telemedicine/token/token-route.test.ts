import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import path from 'node:path'
import test from 'node:test'

const route = readFileSync(path.join(process.cwd(), 'src/app/api/telemedicine/token/route.ts'), 'utf8')

test('without LiveKit keys the doctor sees plain words; the variable names go to the server log only (Chief 2026-10-07)', () => {
  assert.match(route, /message: 'Video belum bisa dimulai\. Hubungi admin MedBoard\.'/)
  assert.doesNotMatch(route, /message:\s*\n?\s*'[^']*LIVEKIT_/)
  assert.match(route, /console\.error\('\[MedLink\] LIVEKIT_URL, LIVEKIT_API_KEY or LIVEKIT_API_SECRET is not set'\)/)
})
