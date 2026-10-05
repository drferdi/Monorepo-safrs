import assert from 'node:assert/strict'
import test from 'node:test'
import { renderToStaticMarkup } from 'react-dom/server'

import { MiraDifferentialCard } from './MiraDifferentialCard'

const DIFFERENTIAL = {
  engine: 'MIRA' as const,
  generated_at: '2026-10-04T01:30:00.000Z',
  items: [
    { rank: 1, icd10: 'J18.9', nama: 'Pneumonia', confidence: 0.7, cannot_miss: false, rationale: 'Demam; ronki' },
    { rank: 2, icd10: 'I26.9', nama: 'Emboli paru', confidence: 0.2, cannot_miss: true, rationale: 'Takikardia' },
  ],
  next_best_actions: [{ kind: 'exam' as const, item: 'Auskultasi paru', reason: 'Cari ronki fokal' }],
  missing_information: ['Riwayat perjalanan'],
}

test('MIRA card names MIRA as the source and shows when it was generated', () => {
  const html = renderToStaticMarkup(<MiraDifferentialCard differential={DIFFERENTIAL} />)
  assert.match(html, /Diferensial MIRA/)
  assert.match(html, /04\/10\/26.*08\.30|08\.30.*04\/10\/26/)
  assert.match(html, /keputusan klinis tetap pada dokter/)
})

test('MIRA card lists every diagnosis with ICD-10, confidence and the cannot-miss flag', () => {
  const html = renderToStaticMarkup(<MiraDifferentialCard differential={DIFFERENTIAL} />)
  assert.match(html, /Pneumonia/)
  assert.match(html, /J18\.9/)
  assert.match(html, /70%/)
  assert.match(html, /Emboli paru/)
  assert.match(html, /Jangan terlewat/)
  assert.match(html, /Demam; ronki/)
})

test('MIRA card shows the next best actions and the missing information', () => {
  const html = renderToStaticMarkup(<MiraDifferentialCard differential={DIFFERENTIAL} />)
  assert.match(html, /Pemeriksaan: Auskultasi paru/)
  assert.match(html, /Riwayat perjalanan/)
})
