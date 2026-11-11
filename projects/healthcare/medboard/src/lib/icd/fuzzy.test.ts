import assert from 'node:assert/strict'
import test from 'node:test'

import { buildFuzzyIndex, editDistance, fuzzySearch } from './fuzzy'

const catalog = [
  { code: 'A09', title: 'Diarrhoea and gastroenteritis of presumed infectious origin' },
  { code: 'B01.2', title: 'Varicella pneumonia' },
  { code: 'E11.9', title: 'Non-insulin-dependent diabetes mellitus without complications' },
  { code: 'I10', title: 'Essential (primary) hypertension' },
  { code: 'J18', title: 'Pneumonia, organism unspecified' },
  { code: 'J18.9', title: 'Pneumonia, unspecified' },
  { code: 'J12', title: 'Viral pneumonia, not elsewhere classified' },
]
const index = buildFuzzyIndex(catalog, [{ code: 'I10', name: 'Hipertensi esensial' }])

test('a swapped or missing letter still counts as one mistake', () => {
  assert.equal(editDistance('pnemonia', 'pneumonia', 2), 1)
  assert.equal(editDistance('hipretensi', 'hipertensi', 2), 1)
  assert.ok(editDistance('typhoid', 'cholera', 2) > 2)
})

test('a misspelt diagnosis is redirected to the diagnosis it resembles, and the page can say so', () => {
  const found = fuzzySearch(index, 'pnemonia', 10)
  assert.equal(found.matches[0]?.code, 'J18.9')
  assert.equal(found.corrected, 'pneumonia')
})

test('the plainest matching diagnosis comes first: "Pneumonia, unspecified" before narrower kinds', () => {
  const codes = fuzzySearch(index, 'pneumonia', 10).matches.map((m) => m.code)
  assert.deepEqual(codes.slice(0, 2), ['J18.9', 'J18'])
  assert.ok(codes.includes('B01.2') && codes.includes('J12'))
  assert.equal(fuzzySearch(index, 'pneumonia', 10).corrected, null)
})

test('Indonesian names lead to their code, typos included', () => {
  assert.equal(fuzzySearch(index, 'hipertnsi', 5).matches[0]?.code, 'I10')
})

test('every word must match, so two-word queries narrow the list', () => {
  const codes = fuzzySearch(index, 'viral pnemonia', 10).matches.map((m) => m.code)
  assert.deepEqual(codes, ['J12'])
})

test('words too far from any diagnosis find nothing instead of noise', () => {
  assert.deepEqual(fuzzySearch(index, 'xqzvw', 10).matches, [])
})
