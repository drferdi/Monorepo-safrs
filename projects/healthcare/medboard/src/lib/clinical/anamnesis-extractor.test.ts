import assert from 'node:assert/strict'
import test from 'node:test'

import {
  extractClinicalAnamnesisHeuristic,
  extractClinicalAnamnesisRich,
} from './anamnesis-extractor'

test('heuristic extractor menangkap rich field dari input klinis singkat', () => {
  const extraction = extractClinicalAnamnesisHeuristic(
    'Pasien mengeluh nyeri perut kanan bawah sejak 2 hari, disertai mual dan muntah, tidak diare, skala nyeri 7/10, memberat saat berjalan, membaik saat istirahat, aktivitas terganggu.'
  )
  const clinicianQuestions = extraction.clinician_questions ?? []

  assert.equal(extraction.keluhan_utama, 'Nyeri perut kanan bawah')
  assert.equal(extraction.onset, 'sejak 2 hari')
  assert.equal(extraction.lokasi, 'perut kanan bawah')
  assert.equal(extraction.keparahan, 7)
  assert.equal(extraction.chronology_summary, 'sejak 2 hari, memberat saat berjalan')
  assert.ok(extraction.associated_symptoms?.includes('mual'))
  assert.ok(extraction.associated_symptoms?.includes('muntah'))
  assert.ok(!extraction.associated_symptoms?.includes('skala nyeri 7'))
  assert.ok(!extraction.associated_symptoms?.includes('10'))
  assert.ok(!extraction.associated_symptoms?.includes('memberat saat berjalan'))
  assert.ok(!extraction.associated_symptoms?.includes('membaik saat istirahat'))
  assert.ok(!extraction.associated_symptoms?.includes('aktivitas terganggu'))
  assert.ok(extraction.pertinent_negatives?.includes('diare'))
  assert.ok(extraction.faktor_pemicu.includes('berjalan'))
  assert.ok(extraction.faktor_peredam.includes('istirahat'))
  assert.equal(extraction.functional_impact, 'aktivitas terganggu')
  assert.ok(extraction.data_belum_lengkap.includes('kualitas'))
  assert.ok(clinicianQuestions.some((question) => question.includes('karakter keluhan')))
})

test('heuristic extractor mendeteksi red flag dan membatasi follow-up questions', () => {
  const extraction = extractClinicalAnamnesisHeuristic(
    'Pasien nyeri dada sejak kemarin, sesak berat, menjalar ke lengan kiri, tidak ada demam.'
  )
  const clinicianQuestions = extraction.clinician_questions ?? []

  assert.ok(extraction.red_flag_signs?.includes('nyeri dada'))
  assert.ok(extraction.red_flag_signs?.includes('sesak berat'))
  assert.ok(clinicianQuestions.length <= 3)
})

test('rich extractor memakai heuristic lokal', async () => {
  const extraction = await extractClinicalAnamnesisRich(
    'Pasien pusing berdenyut sejak tadi pagi, disertai mual, tanpa muntah.'
  )

  assert.equal(extraction.source, 'heuristic')
  assert.equal(extraction.data.kualitas, 'berdenyut')
  assert.ok(extraction.data.associated_symptoms?.includes('mual'))
  assert.ok(extraction.data.pertinent_negatives?.includes('muntah'))
})
