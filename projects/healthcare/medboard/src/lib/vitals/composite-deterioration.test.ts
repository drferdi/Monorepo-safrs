import assert from 'node:assert/strict'
import test from 'node:test'
import {
  evaluateCompositeDeterioration,
  evaluateCompositeDeteriorationFromEmrPayload,
} from './composite-deterioration'

test('detects composite sepsis shock pathway from current bedside signals', () => {
  const result = evaluateCompositeDeterioration({
    patientAgeYears: 62,
    patientGender: 'L',
    chiefComplaint: 'Demam dan lemas',
    current: {
      sbp: 96,
      dbp: 58,
      hr: 118,
      rr: 28,
      temp: 39,
      spo2: 95,
      avpu: 'A',
      capillaryRefillSec: 4,
    },
    structuredSigns: {
      perfusionShock: {
        coldExtremities: true,
      },
    },
  })

  const alert = result.compositeAlerts.find(item => item.syndrome === 'sepsis_shock_pathway')
  assert.ok(alert, 'expected sepsis/shock composite alert')
  assert.equal(alert?.severity, 'critical')
  assert.equal(alert?.confidence, 'high')
})

test('detects respiratory deterioration when SpO2 drops from encounter baseline', () => {
  const result = evaluateCompositeDeteriorationFromEmrPayload({
    keluhanUtama: 'Sesak makin berat',
    vitals: {
      td: '124/76',
      nadi: '112',
      napas: '30',
      suhu: '37.2',
      spo2: '91',
      gcs: '15',
    },
    patientAge: 45,
    patientGender: 'P',
    triageContext: {
      avpu: 'A',
      supplementalO2: true,
      structuredSigns: {
        respiratoryDistress: {
          accessoryMuscleUse: true,
        },
      },
    },
    encounterBaseline: {
      computedAt: '2026-03-20T08:00:00.000Z',
      windowMinutes: 120,
      measurements: [
        { spo2: 96, rr: 22, hr: 98, sbp: 126, dbp: 78 },
        { spo2: 95, rr: 23, hr: 104, sbp: 128, dbp: 80 },
      ],
    },
  })

  const alert = result.compositeAlerts.find(
    item => item.syndrome === 'respiratory_deterioration'
  )
  assert.ok(alert, 'expected respiratory deterioration composite alert')
  assert.equal(alert?.severity, 'critical')
})

test('downgrades respiratory deterioration to watcher when baseline window is missing', () => {
  const result = evaluateCompositeDeterioration({
    patientAgeYears: 51,
    patientGender: 'L',
    current: {
      sbp: 132,
      dbp: 82,
      hr: 108,
      rr: 27,
      temp: 37,
      spo2: 92,
      avpu: 'A',
    },
    structuredSigns: {
      respiratoryDistress: {
        retractions: true,
      },
    },
  })

  assert.equal(
    result.compositeAlerts.some(item => item.syndrome === 'respiratory_deterioration'),
    false
  )
  assert.ok(
    result.watchers.some(item => item.syndrome === 'respiratory_deterioration'),
    'expected respiratory watcher'
  )
})

test('detects neuro intracranial composite pathway from cushing style pattern', () => {
  const result = evaluateCompositeDeterioration({
    patientAgeYears: 58,
    patientGender: 'L',
    current: {
      sbp: 196,
      dbp: 118,
      hr: 44,
      rr: 18,
      temp: 36.8,
      spo2: 97,
      avpu: 'V',
    },
    structuredSigns: {
      hmod: {
        severe_headache: true,
        neurological_deficit: true,
      },
    },
  })

  const alert = result.compositeAlerts.find(
    item => item.syndrome === 'neuro_intracranial_pathway'
  )
  assert.ok(alert, 'expected neuro/intracranial composite alert')
  assert.equal(alert?.severity, 'critical')
})

test('detects silent bleed occult shock using personal baseline history', () => {
  const result = evaluateCompositeDeteriorationFromEmrPayload({
    keluhanUtama: 'Pusing dan lemas',
    vitals: {
      td: '108/84',
      nadi: '112',
      napas: '22',
      suhu: '36.8',
      spo2: '97',
      gcs: '15',
    },
    patientAge: 47,
    patientGender: 'P',
    structuredSigns: {
      perfusionShock: {
        coldExtremities: true,
        presyncope: true,
        capillaryRefillSec: 4,
      },
    },
    visitHistory: [
      {
        encounter_id: 'v1',
        date: '2026-03-10T08:00:00.000Z',
        vitals: { sbp: 122, dbp: 76, hr: 82, rr: 18, temp: 36.7, glucose: 104, spo2: 98 },
        keluhan_utama: 'Kontrol',
        diagnosa: null,
      },
      {
        encounter_id: 'v2',
        date: '2026-03-12T08:00:00.000Z',
        vitals: { sbp: 124, dbp: 78, hr: 84, rr: 18, temp: 36.8, glucose: 102, spo2: 98 },
        keluhan_utama: 'Kontrol',
        diagnosa: null,
      },
      {
        encounter_id: 'v3',
        date: '2026-03-15T08:00:00.000Z',
        vitals: { sbp: 120, dbp: 74, hr: 80, rr: 18, temp: 36.6, glucose: 106, spo2: 99 },
        keluhan_utama: 'Kontrol',
        diagnosa: null,
      },
    ],
  })

  const alert = result.compositeAlerts.find(
    item => item.syndrome === 'silent_bleed_occult_shock'
  )
  assert.ok(alert, 'expected silent bleed/occult shock composite alert')
  assert.equal(alert?.confidence, 'high')
})
