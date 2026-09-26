import assert from 'node:assert/strict'
import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'
import test from 'node:test'

import {
  type AcceptedConsultRecord,
  appendAcceptedConsult,
  getAcceptedConsult,
  listAcceptedConsults,
} from './consult-accepted-impl'

const minimalConsult = {
  consultId: 'c1',
  targetDoctorId: 'dr-x',
  sentAt: new Date().toISOString(),
  patient: { name: 'Test', age: 30, gender: 'L', rm: 'RM1' },
  ttv: { sbp: '', dbp: '', hr: '', rr: '', temp: '', spo2: '', glucose: '' },
  keluhan_utama: 'Keluhan',
  risk_factors: [] as string[],
  anthropometrics: {
    tinggi: 0,
    berat: 0,
    imt: 0,
    hasil_imt: '',
    lingkar_perut: 0,
  },
  penyakit_kronis: [] as string[],
}

test('getAcceptedConsult returns null when file does not exist', () => {
  const tmp = path.join(os.tmpdir(), `consult-accepted-${Date.now()}`)
  const filePath = path.join(tmp, 'consult-accepted.jsonl')
  fs.mkdirSync(tmp, { recursive: true })
  const prev = process.env.CONSULT_ACCEPTED_FILE
  process.env.CONSULT_ACCEPTED_FILE = filePath

  try {
    const out = getAcceptedConsult('any-id')
    assert.equal(out, null)
  } finally {
    if (prev !== undefined) process.env.CONSULT_ACCEPTED_FILE = prev
    else delete process.env.CONSULT_ACCEPTED_FILE
    fs.rmSync(tmp, { recursive: true, force: true })
  }
})

test('listAcceptedConsults returns empty array when file does not exist', () => {
  const tmp = path.join(os.tmpdir(), `consult-accepted-${Date.now()}`)
  const filePath = path.join(tmp, 'consult-accepted.jsonl')
  fs.mkdirSync(tmp, { recursive: true })
  const prev = process.env.CONSULT_ACCEPTED_FILE
  process.env.CONSULT_ACCEPTED_FILE = filePath

  try {
    const out = listAcceptedConsults(10)
    assert.deepEqual(out, [])
  } finally {
    if (prev !== undefined) process.env.CONSULT_ACCEPTED_FILE = prev
    else delete process.env.CONSULT_ACCEPTED_FILE
    fs.rmSync(tmp, { recursive: true, force: true })
  }
})

test('appendAcceptedConsult and getAcceptedConsult round-trip', () => {
  const tmp = path.join(os.tmpdir(), `consult-accepted-${Date.now()}`)
  const filePath = path.join(tmp, 'consult-accepted.jsonl')
  fs.mkdirSync(tmp, { recursive: true })
  const prev = process.env.CONSULT_ACCEPTED_FILE
  process.env.CONSULT_ACCEPTED_FILE = filePath

  try {
    const record: AcceptedConsultRecord = {
      consultId: 'consult-roundtrip',
      acceptedBy: 'Dr Test',
      acceptedAt: new Date().toISOString(),
      consult: minimalConsult,
    }
    appendAcceptedConsult(record)

    const found = getAcceptedConsult('consult-roundtrip')
    assert.ok(found)
    assert.equal(found?.consultId, record.consultId)
    assert.equal(found?.acceptedBy, record.acceptedBy)
    assert.equal(found?.consult.keluhan_utama, minimalConsult.keluhan_utama)
  } finally {
    if (prev !== undefined) process.env.CONSULT_ACCEPTED_FILE = prev
    else delete process.env.CONSULT_ACCEPTED_FILE
    fs.rmSync(tmp, { recursive: true, force: true })
  }
})

test('listAcceptedConsults returns entries in reverse order (newest first)', () => {
  const tmp = path.join(os.tmpdir(), `consult-accepted-${Date.now()}`)
  const filePath = path.join(tmp, 'consult-accepted.jsonl')
  fs.mkdirSync(tmp, { recursive: true })
  const prev = process.env.CONSULT_ACCEPTED_FILE
  process.env.CONSULT_ACCEPTED_FILE = filePath

  try {
    appendAcceptedConsult({
      consultId: 'first',
      acceptedBy: 'A',
      acceptedAt: new Date().toISOString(),
      consult: { ...minimalConsult, consultId: 'first' },
    })
    appendAcceptedConsult({
      consultId: 'second',
      acceptedBy: 'B',
      acceptedAt: new Date().toISOString(),
      consult: { ...minimalConsult, consultId: 'second' },
    })

    const list = listAcceptedConsults(10)
    assert.equal(list.length, 2)
    assert.equal(list[0]?.consultId, 'second')
    assert.equal(list[1]?.consultId, 'first')

    const listLimit1 = listAcceptedConsults(1)
    assert.equal(listLimit1.length, 1)
    assert.equal(listLimit1[0]?.consultId, 'second')
  } finally {
    if (prev !== undefined) process.env.CONSULT_ACCEPTED_FILE = prev
    else delete process.env.CONSULT_ACCEPTED_FILE
    fs.rmSync(tmp, { recursive: true, force: true })
  }
})
