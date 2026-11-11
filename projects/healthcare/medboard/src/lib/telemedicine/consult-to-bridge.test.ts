import assert from 'node:assert/strict'
import test from 'node:test'

import { consultToAnamnesaPayload, consultToBridgePayload } from './consult-to-bridge-mapper'
import type { AssistConsultPayload } from './socket-bridge'

const minimalConsult: AssistConsultPayload = {
  consultId: 'consult-1',
  targetDoctorId: 'dr-a',
  sentAt: new Date().toISOString(),
  patient: { name: 'Pasien A', age: 35, gender: 'L', rm: 'RM001' },
  ttv: { sbp: '', dbp: '', hr: '', rr: '', temp: '', spo2: '', glucose: '' },
  keluhan_utama: 'Demam',
  risk_factors: [],
  anthropometrics: {
    tinggi: 0,
    berat: 0,
    imt: 0,
    hasil_imt: '',
    lingkar_perut: 0,
  },
  penyakit_kronis: [],
}

test('consultToAnamnesaPayload returns required fields with minimal consult', () => {
  const payload = consultToAnamnesaPayload(minimalConsult)

  assert.equal(payload.keluhan_utama, 'Demam')
  assert.equal(payload.keluhan_tambahan, '')
  assert.deepEqual(payload.lama_sakit, { thn: 0, bln: 0, hr: 0 })
  assert.deepEqual(payload.alergi, {
    obat: [],
    makanan: [],
    udara: [],
    lainnya: [],
  })
  assert.equal(payload.vital_signs?.tekanan_darah_sistolik, 0)
  assert.equal(payload.vital_signs?.nadi, 0)
  // anthropometrics with 0,0,0,0 still satisfies != null so periksa_fisik is set
  assert.ok(payload.periksa_fisik)
  assert.equal(payload.periksa_fisik?.tinggi, 0)
})

test('consultToAnamnesaPayload maps TTV and risk_factors', () => {
  const consult: AssistConsultPayload = {
    ...minimalConsult,
    ttv: {
      sbp: '120',
      dbp: '80',
      hr: '72',
      rr: '18',
      temp: '36.5',
      spo2: '98',
      glucose: '90',
    },
    risk_factors: ['Hipertensi', 'DM'],
  }

  const payload = consultToAnamnesaPayload(consult)

  assert.equal(payload.vital_signs?.tekanan_darah_sistolik, 120)
  assert.equal(payload.vital_signs?.tekanan_darah_diastolik, 80)
  assert.equal(payload.vital_signs?.nadi, 72)
  assert.equal(payload.vital_signs?.suhu, 36.5)
  assert.equal(payload.vital_signs?.gula_darah, 90)
  assert.equal(payload.keluhan_tambahan, 'Hipertensi; DM')
})

test('consultToAnamnesaPayload maps anthropometrics and adds periksa_fisik when present', () => {
  const consult: AssistConsultPayload = {
    ...minimalConsult,
    anthropometrics: {
      tinggi: 170,
      berat: 70,
      imt: 24.2,
      hasil_imt: 'Normal',
      lingkar_perut: 85,
    },
    ttv: {
      sbp: '',
      dbp: '',
      hr: '',
      rr: '',
      temp: '',
      spo2: '99',
      glucose: '',
    },
  }

  const payload = consultToAnamnesaPayload(consult)

  assert.ok(payload.periksa_fisik)
  assert.equal(payload.periksa_fisik.tinggi, 170)
  assert.equal(payload.periksa_fisik.berat, 70)
  assert.equal(payload.periksa_fisik.imt, 24.2)
  assert.equal(payload.periksa_fisik.hasil_imt, 'Normal')
  assert.equal(payload.periksa_fisik.saturasi, 99)
})

test('consultToAnamnesaPayload maps hasil_imt to union (Obesitas I/II, Kurus, BB Lebih)', () => {
  const base = {
    ...minimalConsult,
    anthropometrics: {
      tinggi: 170,
      berat: 90,
      imt: 31,
      hasil_imt: '',
      lingkar_perut: 100,
    },
    ttv: { sbp: '', dbp: '', hr: '', rr: '', temp: '', spo2: '', glucose: '' },
  }

  assert.equal(
    consultToAnamnesaPayload({
      ...base,
      anthropometrics: { ...base.anthropometrics, hasil_imt: 'Obesitas II' },
    }).periksa_fisik?.hasil_imt,
    'Obesitas II'
  )
  assert.equal(
    consultToAnamnesaPayload({
      ...base,
      anthropometrics: { ...base.anthropometrics, hasil_imt: 'Kurus' },
    }).periksa_fisik?.hasil_imt,
    'Kurus'
  )
  assert.equal(
    consultToAnamnesaPayload({
      ...base,
      anthropometrics: { ...base.anthropometrics, hasil_imt: 'Unknown' },
    }).periksa_fisik?.hasil_imt,
    'Normal'
  )
})

test('consultToBridgePayload returns object with anamnesa only', () => {
  const payload = consultToBridgePayload(minimalConsult)

  assert.ok(payload.anamnesa)
  assert.equal(payload.anamnesa.keluhan_utama, 'Demam')
  assert.equal(payload.diagnosa, undefined)
  assert.equal(payload.resep, undefined)
})

test('consultToAnamnesaPayload handles empty and comma decimal TTV', () => {
  const consult: AssistConsultPayload = {
    ...minimalConsult,
    ttv: {
      sbp: '136,5',
      dbp: '85',
      hr: '',
      rr: '16',
      temp: '36,8',
      spo2: '',
      glucose: '',
    },
  }

  const payload = consultToAnamnesaPayload(consult)

  assert.equal(payload.vital_signs?.tekanan_darah_sistolik, 136.5)
  assert.equal(payload.vital_signs?.suhu, 36.8)
  assert.equal(payload.vital_signs?.nadi, 0)
})
