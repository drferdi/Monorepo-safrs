import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import test from 'node:test'

const page = readFileSync('src/app/page.tsx', 'utf-8')

test('the identity card names title and profession once, under the name (Chief 2026-10-07)', () => {
  assert.match(page, /\{sentraTitle\} · \{professionLabel\}/)
  assert.doesNotMatch(page, /profileHeroStats/)
})

test('rank and awards sit above the clinical activity heatmap (Chief 2026-10-07)', () => {
  const rank = page.indexOf('<SectionLabel>Rank & award</SectionLabel>')
  const activity = page.indexOf('<SectionLabel>Aktivitas klinis</SectionLabel>')
  assert.ok(rank > 0 && activity > 0)
  assert.ok(rank < activity)
})
