import assert from 'node:assert/strict'
import test from 'node:test'
import {
  buildImmediateScreeningInputFromEmrPayload,
  evaluateImmediateScreeningAlerts,
  evaluateScreeningAlertsFromEmrPayload,
} from './instant-red-alerts'

test('detects hypertensive emergency with inferred HMOD from complaint text', () => {
  const alerts = evaluateImmediateScreeningAlerts({
    vitals: {
      sbp: 190,
      dbp: 124,
      hr: 118,
      rr: 24,
      temp: 36.9,
      spo2: 95,
      gcsTotal: 14,
    },
    patientAgeYears: 58,
    patientGender: 'P',
    chiefComplaint: 'Nyeri dada hebat dan pandangan kabur sejak pagi',
    additionalComplaint: 'bingung, sakit kepala hebat',
    medicalHistory: ['Hipertensi'],
  })

  assert.ok(
    alerts.some(alert => alert.type === 'hypertensive_emergency' && alert.gate === 'GATE_2_HTN'),
    'expected hypertensive emergency alert'
  )
})

test('flags low SpO2 despite supplemental oxygen as critical', () => {
  const alerts = evaluateImmediateScreeningAlerts({
    vitals: {
      sbp: 128,
      dbp: 78,
      hr: 110,
      rr: 28,
      temp: 37.2,
      spo2: 92,
      supplementalO2: true,
    },
    patientAgeYears: 45,
    patientGender: 'L',
    chiefComplaint: 'Sesak berat dengan penggunaan otot bantu napas',
  })

  const alert = alerts.find(item => item.id === 'spo2-low')
  assert.ok(alert, 'expected low SpO2 alert')
  assert.equal(alert?.severity, 'critical')
})

test('detects glucose crisis and qSOFA together', () => {
  const alerts = evaluateImmediateScreeningAlerts({
    vitals: {
      sbp: 96,
      dbp: 60,
      hr: 128,
      rr: 30,
      temp: 38.7,
      spo2: 95,
      glucose: 640,
      gcsTotal: 13,
    },
    patientAgeYears: 63,
    patientGender: 'L',
    chiefComplaint: 'Demam, napas Kussmaul, muntah, lemas',
    additionalComplaint: 'bingung sejak tadi pagi',
    medicalHistory: ['Diabetes Mellitus Tipe 2'],
  })

  assert.ok(alerts.some(alert => alert.id === 'glucose-hhs'), 'expected HHS alert')
  assert.ok(alerts.some(alert => alert.id === 'sepsis-qsofa'), 'expected qSOFA alert')
})

test('detects pediatric red-alert thresholds using age in months', () => {
  const alerts = evaluateImmediateScreeningAlerts({
    vitals: {
      sbp: 62,
      dbp: 40,
      hr: 170,
      rr: 66,
      temp: 37,
      spo2: 97,
    },
    patientAgeMonths: 2,
    patientGender: 'L',
    chiefComplaint: 'Bayi tampak lemas dan napas cepat',
  })

  assert.ok(alerts.some(alert => alert.id === 'peds-sbp-low'), 'expected pediatric low SBP alert')
  assert.ok(alerts.some(alert => alert.id === 'peds-hr'), 'expected pediatric HR alert')
  assert.ok(alerts.some(alert => alert.id === 'peds-rr'), 'expected pediatric RR alert')
})

test('detects pregnancy-specific severe hypertension and tachycardia', () => {
  const alerts = evaluateImmediateScreeningAlerts({
    vitals: {
      sbp: 168,
      dbp: 112,
      hr: 126,
      rr: 24,
      temp: 37.1,
      spo2: 97,
    },
    patientAgeYears: 29,
    patientGender: 'P',
    isPregnant: true,
    gestationalWeek: 33,
    chiefComplaint: 'Ibu hamil dengan sakit kepala hebat dan pandangan kabur',
  })

  assert.ok(
    alerts.some(alert => alert.id === 'pregnancy-severe-htn' && alert.gate === 'GATE_8_OBSTETRIC'),
    'expected severe preeclampsia risk alert'
  )
  assert.ok(alerts.some(alert => alert.id === 'pregnancy-tachycardia'), 'expected pregnancy tachycardia alert')
})

test('detects occult shock from longitudinal hypertension history', () => {
  const alerts = evaluateImmediateScreeningAlerts({
    vitals: {
      sbp: 104,
      dbp: 68,
      hr: 120,
      rr: 24,
      temp: 36.7,
      spo2: 96,
      glucose: 110,
    },
    patientAgeYears: 57,
    patientGender: 'L',
    chiefComplaint: 'Pusing dan lemas',
    medicalHistory: ['Hipertensi'],
    visitHistory: [
      { visit_date: '2026-03-01T00:00:00.000Z', sbp: 160, dbp: 100, location: 'clinic' },
      { visit_date: '2026-03-05T00:00:00.000Z', sbp: 158, dbp: 98, location: 'clinic' },
      { visit_date: '2026-03-10T00:00:00.000Z', sbp: 162, dbp: 102, location: 'clinic' },
    ],
  })

  assert.ok(alerts.some(alert => alert.id === 'occult-shock'), 'expected occult shock alert')
})

test('builds immediate screening input from EMR payload and preserves triage context', () => {
  const input = buildImmediateScreeningInputFromEmrPayload({
    keluhanUtama: 'Sesak dan demam',
    vitals: {
      td: '88/54',
      nadi: '124',
      napas: '30',
      suhu: '38.6',
      spo2: '91',
      gcs: '13',
    },
    gulaDarah: { nilai: '72', tipe: 'GDS' },
    patientAge: 40,
    patientGender: 'P',
    medicalHistory: ['Hipertensi'],
    triageContext: {
      avpu: 'V',
      supplementalO2: true,
      isPregnant: true,
      gestationalWeek: 34,
      patientAgeMonths: 480,
    },
  })

  assert.equal(input.vitals.avpu, 'V')
  assert.equal(input.vitals.supplementalO2, true)
  assert.equal(input.isPregnant, true)
  assert.equal(input.gestationalWeek, 34)
})

test('evaluates screening alerts directly from EMR payload', () => {
  const alerts = evaluateScreeningAlertsFromEmrPayload({
    keluhanUtama: 'Demam tinggi, batuk, bingung',
    keluhanTambahan: 'sesak berat',
    vitals: {
      td: '92/58',
      nadi: '122',
      napas: '32',
      suhu: '39.1',
      spo2: '89',
      gcs: '13',
    },
    gulaDarah: { nilai: '118', tipe: 'GDS' },
    patientAge: 66,
    patientGender: 'L',
    medicalHistory: ['Hipertensi'],
    triageContext: {
      avpu: 'V',
      supplementalO2: false,
    },
  })

  assert.ok(alerts.some(alert => alert.id === 'spo2-critical'), 'expected severe hypoxemia alert')
  assert.ok(alerts.some(alert => alert.id === 'sepsis-qsofa'), 'expected qSOFA alert from payload')
})

test('structured respiratory and HMOD signs trigger alerts without relying on keyword text', () => {
  const alerts = evaluateScreeningAlertsFromEmrPayload({
    keluhanUtama: 'Keluhan umum',
    vitals: {
      td: '186/122',
      nadi: '118',
      napas: '26',
      suhu: '36.9',
      spo2: '93',
      gcs: '15',
    },
    gulaDarah: { nilai: '140', tipe: 'GDS' },
    patientAge: 52,
    patientGender: 'L',
    triageContext: {
      structuredSigns: {
        respiratoryDistress: {
          accessoryMuscleUse: true,
        },
        hmod: {
          chest_pain: true,
        },
      },
    },
  })

  assert.ok(alerts.some(alert => alert.id === 'respiratory-distress-signs'))
  assert.ok(alerts.some(alert => alert.type === 'hypertensive_emergency'))
})

test('structured DKA/HHS and perfusion signs trigger crisis paths from clean text', () => {
  const alerts = evaluateImmediateScreeningAlerts({
    vitals: {
      sbp: 102,
      dbp: 64,
      hr: 124,
      rr: 28,
      temp: 37.1,
      spo2: 95,
      glucose: 320,
      gcsTotal: 15,
    },
    patientAgeYears: 41,
    patientGender: 'L',
    chiefComplaint: 'Kontrol ulang',
    structuredSigns: {
      dkaHhs: {
        kussmaul_breathing: true,
        severe_dehydration: true,
      },
      perfusionShock: {
        presyncope: true,
        coldExtremities: true,
        capillaryRefillSec: 4,
      },
    },
  })

  assert.ok(alerts.some(alert => alert.id === 'glucose-dka-hhs'))
  assert.ok(alerts.some(alert => alert.id === 'circulatory-shock-suspected'))
})

test('root-level structured signs from upstream patient-sync trigger dashboard screening alerts', () => {
  const alerts = evaluateScreeningAlertsFromEmrPayload({
    keluhanUtama: 'Triage intake upstream',
    vitals: {
      td: '104/66',
      nadi: '126',
      napas: '32',
      suhu: '37.0',
      spo2: '95',
      gcs: '15',
    },
    gulaDarah: { nilai: '334', tipe: 'GDS' },
    patientAge: 44,
    patientGender: 'L',
    structuredSigns: {
      respiratoryDistress: {
        accessoryMuscleUse: true,
      },
      dkaHhs: {
        severe_dehydration: true,
      },
      perfusionShock: {
        coldExtremities: true,
        presyncope: true,
      },
    },
  })

  assert.ok(alerts.some(alert => alert.id === 'respiratory-distress-signs'))
  assert.ok(alerts.some(alert => alert.id === 'glucose-dka-hhs'))
  assert.ok(alerts.some(alert => alert.id === 'circulatory-shock-suspected'))
})
