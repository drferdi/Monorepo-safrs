import assert from 'node:assert/strict'
import test from 'node:test'

import { tidyCase } from './tidy-case'

// Chief 2026-10-07: text typed or received in all caps or all lower case is tidied to
// standard Indonesian capitalisation; acronyms stay; text already in mixed case is the writer's.

test('an all-caps sentence becomes sentence case and keeps its acronyms', () => {
  assert.equal(tidyCase('DEMAM 3 HARI, TD 120/80, GCS 15'), 'Demam 3 hari, TD 120/80, GCS 15')
})

test('an all-lowercase sentence gets the same result', () => {
  assert.equal(tidyCase('demam 3 hari, td 120/80, gcs 15'), 'Demam 3 hari, TD 120/80, GCS 15')
})

test('text already in mixed case is left as written', () => {
  assert.equal(tidyCase('Demam sejak SENIN, td normal'), 'Demam sejak SENIN, td normal')
})

test('every sentence and every new line starts with a capital', () => {
  assert.equal(tidyCase('BATUK PILEK. DEMAM SORE HARI! NYERI?\nMUAL'), 'Batuk pilek. Demam sore hari! Nyeri?\nMual')
})

test('short codes and single acronyms stay as they are', () => {
  assert.equal(tidyCase('PCT'), 'PCT')
  assert.equal(tidyCase('J06.9'), 'J06.9')
  assert.equal(tidyCase('DEMAM'), 'Demam')
})

test('SpO2 and units keep their own spelling', () => {
  assert.equal(tidyCase('SPO2 98%, PARACETAMOL 500 MG'), 'SpO2 98%, paracetamol 500 mg')
})

test('a name capitalises every word and keeps titles and degrees in their form', () => {
  assert.equal(tidyCase('BUDI SANTOSO', 'name'), 'Budi Santoso')
  assert.equal(tidyCase('dr. budi santoso, sp.pd', 'name'), 'dr. Budi Santoso, Sp.PD')
  assert.equal(tidyCase('DRG. ANI, S.KED', 'name'), 'drg. Ani, S.Ked')
  assert.equal(tidyCase('Budi santoso', 'name'), 'Budi santoso')
})

test('empty and number-only text pass through', () => {
  assert.equal(tidyCase(''), '')
  assert.equal(tidyCase('120/80'), '120/80')
})
