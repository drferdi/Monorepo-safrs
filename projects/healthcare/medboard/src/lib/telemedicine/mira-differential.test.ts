import assert from 'node:assert/strict'
import test from 'node:test'

import { parseMiraDifferential } from './mira-differential'

const VALID = {
  engine: 'MIRA',
  generated_at: '2026-10-04T08:00:00.000Z',
  items: [
    {
      rank: 1,
      icd10: 'J18.9',
      nama: 'Pneumonia',
      confidence: 0.7,
      cannot_miss: false,
      rationale: 'Demam; ronki',
    },
    {
      rank: 2,
      icd10: 'I26.9',
      nama: 'Emboli paru',
      confidence: 0.2,
      cannot_miss: true,
      rationale: 'Takikardia',
    },
  ],
  next_best_actions: [{ kind: 'exam', item: 'Auskultasi paru', reason: 'Cari ronki fokal' }],
  missing_information: ['Riwayat perjalanan'],
}

test('accepts the MIRA differential Assist sends with a consult', () => {
  assert.deepEqual(parseMiraDifferential(VALID), VALID)
})

test('a missing differential is null, not an error', () => {
  assert.equal(parseMiraDifferential(undefined), null)
})

test('a malformed differential is dropped instead of failing the consult', () => {
  assert.equal(parseMiraDifferential({ ...VALID, engine: 'legacy' }), null)
  assert.equal(parseMiraDifferential({ ...VALID, items: [{ rank: 1 }] }), null)
  assert.equal(parseMiraDifferential({ ...VALID, items: [] }), null)
})

test('confidence outside 0..1 is rejected', () => {
  const items = [{ ...VALID.items[0], confidence: 7 }]
  assert.equal(parseMiraDifferential({ ...VALID, items }), null)
})
