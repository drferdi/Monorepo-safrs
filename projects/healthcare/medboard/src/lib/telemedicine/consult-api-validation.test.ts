import assert from 'node:assert/strict'
import test from 'node:test'

import { validateAcceptBody, validateTransferBody } from './consult-api-validation'
import type { AssistConsultPayload } from './socket-bridge'

const minimalConsult: AssistConsultPayload = {
  consultId: 'c1',
  targetDoctorId: 'dr-x',
  sentAt: new Date().toISOString(),
  patient: { name: 'Pasien', age: 30, gender: 'L', rm: 'RM1' },
  ttv: { sbp: '', dbp: '', hr: '', rr: '', temp: '', spo2: '', glucose: '' },
  keluhan_utama: 'Keluhan',
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

test('validateAcceptBody returns error when consultId missing', () => {
  const res = validateAcceptBody({ consult: minimalConsult })
  assert.equal(res.ok, false)
  if (!res.ok) {
    assert.equal(res.error, 'consultId wajib diisi.')
    assert.equal(res.status, 400)
  }
})

test('validateAcceptBody returns error when consultId not string', () => {
  const res = validateAcceptBody({ consultId: 123, consult: minimalConsult })
  assert.equal(res.ok, false)
  if (!res.ok) assert.equal(res.error, 'consultId wajib diisi.')
})

test('validateAcceptBody returns error when consultId too long', () => {
  const res = validateAcceptBody({
    consultId: 'x'.repeat(200),
    consult: minimalConsult,
  })
  assert.equal(res.ok, false)
  if (!res.ok) assert.match(res.error, /maksimal 128/)
})

test('validateAcceptBody returns error when consult or patient.name or keluhan_utama missing', () => {
  assert.equal(validateAcceptBody({ consultId: 'c1' }).ok, false)
  assert.equal(validateAcceptBody({ consultId: 'c1', consult: {} }).ok, false)
  assert.equal(
    validateAcceptBody({
      consultId: 'c1',
      consult: {
        ...minimalConsult,
        patient: { ...minimalConsult.patient, name: '' },
      },
    }).ok,
    false
  )
  assert.equal(
    validateAcceptBody({
      consultId: 'c1',
      consult: { ...minimalConsult, keluhan_utama: '' },
    }).ok,
    false
  )
})

test('validateAcceptBody returns data when valid', () => {
  const res = validateAcceptBody({ consultId: 'c1', consult: minimalConsult })
  assert.equal(res.ok, true)
  if (res.ok) {
    assert.equal(res.data.consultId, 'c1')
    assert.equal(res.data.consult.keluhan_utama, 'Keluhan')
  }
})

test('validateTransferBody returns error when consultId missing', () => {
  const res = validateTransferBody({ pelayananId: 'P-001' })
  assert.equal(res.ok, false)
  if (!res.ok) assert.equal(res.error, 'consultId wajib diisi.')
})

test('validateTransferBody returns error when pelayananId missing', () => {
  const res = validateTransferBody({ consultId: 'c1' })
  assert.equal(res.ok, false)
  if (!res.ok) assert.match(res.error, /pelayananId/)
})

test('validateTransferBody returns error when pelayananId too long', () => {
  const res = validateTransferBody({
    consultId: 'c1',
    pelayananId: 'x'.repeat(100),
  })
  assert.equal(res.ok, false)
  if (!res.ok) assert.match(res.error, /maksimal 64/)
})

test('validateTransferBody returns error when consultId too long', () => {
  const res = validateTransferBody({
    consultId: 'x'.repeat(200),
    pelayananId: 'P-001',
  })
  assert.equal(res.ok, false)
  if (!res.ok) assert.match(res.error, /consultId/)
})

test('validateTransferBody returns error when pelayananId empty after trim', () => {
  const res = validateTransferBody({
    consultId: 'c1',
    pelayananId: '   ',
  })
  assert.equal(res.ok, false)
  if (!res.ok) assert.match(res.error, /pelayananId/)
})

test('validateTransferBody returns trimmed pelayananId when valid', () => {
  const res = validateTransferBody({
    consultId: 'c1',
    pelayananId: '  P-001  ',
  })
  assert.equal(res.ok, true)
  if (res.ok) {
    assert.equal(res.data.consultId, 'c1')
    assert.equal(res.data.pelayananId, 'P-001')
  }
})
