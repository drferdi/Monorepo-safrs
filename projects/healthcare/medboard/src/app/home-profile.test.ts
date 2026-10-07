import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import test from 'node:test'

const page = readFileSync('src/app/page.tsx', 'utf-8')

test('the identity card names title and profession once, under the name (Chief 2026-10-07)', () => {
  assert.match(page, /\{sentraTitle\} · \{professionLabel\}/)
  assert.doesNotMatch(page, /profileHeroStats/)
})
