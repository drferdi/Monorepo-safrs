import assert from 'node:assert/strict'
import test from 'node:test'

import { referralAdvice, type ReferralData } from './referral'

const data: ReferralData = {
  fktp: [
    { code: 'I10', name: 'Hipertensi Esensial', system: 'Kardiovaskular' },
    { code: 'A09', name: 'Gastroenteritis', system: 'Gastrointestinal' },
    { code: 'G43.9', name: 'Migren', system: 'Sistem Saraf' },
  ],
  skdi: [
    { code: 'I21', name: 'Infark Miokard Akut', competence: '3B', system: 'SISTEM KARDIOVASKULAR' },
    { code: 'I50', name: 'Gagal Jantung Kongestif', competence: '3B', system: 'SISTEM KARDIOVASKULAR' },
    { code: 'I50', name: 'Gagal Jantung Kongestif (CHF)', competence: '3B', system: 'SISTEM KARDIOVASKULAR' },
    { code: 'I10', name: 'Hipertensi esensial', competence: '4A', system: 'SISTEM KARDIOVASKULAR' },
    { code: 'K35', name: 'Apendisitis Akut', competence: '3B', system: 'SISTEM DIGESTIF' },
    { code: 'I64', name: 'Stroke', competence: '3B', system: 'SISTEM SARAF' },
  ],
  known: (code) => ['I10', 'I21', 'I50', 'K35', 'I64', 'A09', 'A09.0', 'G43.9', 'J06.0'].includes(code),
  categories: [],
}

test('a code in the 144 FKTP list is FKTP authority: referral needs TACC', () => {
  const advice = referralAdvice('I10', data)
  assert.equal(advice.authority, 'fktp')
  assert.equal(advice.fktpMatch?.name, 'Hipertensi Esensial')
})

test('a 144 entry makes its whole category FKTP work: A09 covers A09.0, G43.9 covers G43 and G43.0', () => {
  assert.equal(referralAdvice('A09.0', data).authority, 'fktp')
  // Chief 2026-10-07: Asma J45 showed "Tidak termasuk 144" although J45.9 is on the list.
  assert.equal(referralAdvice('G43', data).fktpMatch?.code, 'G43.9')
  assert.equal(referralAdvice('G43.0', data).authority, 'fktp')
})

test('related diagnoses within hospital authority come from the same organ system, once each, never 4A', () => {
  const related = referralAdvice('I10', data).related
  assert.deepEqual(related.map((item) => item.code), ['I21', 'I50'])
  assert.ok(related.every((item) => item.competence !== '4A'))
})

test('systems are matched through the table, so "SISTEM DIGESTIF" meets "Gastrointestinal"', () => {
  assert.deepEqual(referralAdvice('A09', data).related.map((item) => item.code), ['K35'])
  assert.deepEqual(referralAdvice('G43.9', data).related.map((item) => item.code), ['I64'])
})

test('a code with SKDI competence 2/3A/3B is hospital authority and may be referred', () => {
  const advice = referralAdvice('I21', data)
  assert.equal(advice.authority, 'rs')
  assert.equal(advice.competence, '3B')
  assert.ok(!advice.related.some((item) => item.code === 'I21'))
})

test('a code outside the 144 list is not called hospital authority without SKDI data (J06.0 stays neutral)', () => {
  const advice = referralAdvice('J06.0', data)
  assert.equal(advice.authority, 'other')
  assert.deepEqual(advice.related, [])
})

test('suggestions missing from the 2010 catalogue are left out', () => {
  const advice = referralAdvice('I10', { ...data, known: (code) => code !== 'I50' })
  assert.deepEqual(advice.related.map((item) => item.code), ['I21'])
})

// Chief 2026-10-07 (Asma): "Rujuk?" lists codes of the same WHO block that are outside the 144
// list, so BPJS takes the referral without TACC.
const asthma: ReferralData = {
  fktp: [
    { code: 'J45.9', name: 'Asma Bronkiale', system: 'Respirasi' },
    { code: 'J18.9', name: 'Pneumonia', system: 'Respirasi' },
  ],
  skdi: [{ code: 'J44', name: 'Penyakit Paru Obstruktif Kronik', competence: '3A', system: 'SISTEM RESPIRASI' }],
  known: () => true,
  categories: ['J18', 'J43', 'J44', 'J45', 'J46', 'J47', 'R50', 'R51'].map((code) => ({ code, name: `name ${code}` })),
}

test('Asma: codes of its WHO block outside the 144 list are offered, nearest first, Indonesian name when known', () => {
  const related = referralAdvice('J45.9', asthma).related
  assert.deepEqual(related.map((item) => item.code), ['J44', 'J46', 'J43', 'J47'])
  assert.deepEqual(related[0], { code: 'J44', name: 'Penyakit Paru Obstruktif Kronik', competence: '3A' })
  assert.deepEqual(related[1], { code: 'J46', name: 'name J46', competence: null })
})

test('a category holding a 144 diagnosis is FKTP work and is not offered as a referral', () => {
  const related = referralAdvice('J44', { ...asthma, fktp: [...asthma.fktp, { code: 'J46', name: 'x', system: 'Respirasi' }] }).related
  assert.ok(!related.some((item) => item.code === 'J45' || item.code === 'J46'))
})

test('symptom codes get no block neighbours: R50 does not offer R51', () => {
  assert.deepEqual(referralAdvice('R50', asthma).related, [])
})
