import assert from 'node:assert/strict'
import test from 'node:test'

import { analyzeTrajectory, type VisitRecord } from './trajectory-analyzer'

function createVisit(
  encounter_id: string,
  timestamp: string,
  vitals: VisitRecord['vitals'],
  keluhan_utama = 'Kontrol'
): VisitRecord {
  return {
    patient_id: 'patient-1',
    encounter_id,
    timestamp,
    vitals,
    keluhan_utama,
    source: 'scrape',
  }
}

test('trajectory reads hypotension that moves toward normal as improving', () => {
  const analysis = analyzeTrajectory([
    createVisit('enc-1', '2026-03-10T08:00:00.000Z', {
      sbp: 82,
      dbp: 48,
      hr: 110,
      rr: 20,
      temp: 36.5,
      glucose: 120,
      spo2: 94,
    }),
    createVisit('enc-2', '2026-03-11T08:00:00.000Z', {
      sbp: 94,
      dbp: 58,
      hr: 98,
      rr: 19,
      temp: 36.6,
      glucose: 118,
      spo2: 96,
    }),
    createVisit('enc-3', '2026-03-12T08:00:00.000Z', {
      sbp: 108,
      dbp: 68,
      hr: 86,
      rr: 18,
      temp: 36.7,
      glucose: 116,
      spo2: 98,
    }),
  ])

  const systolicTrend = analysis.vitalTrends.find(trend => trend.parameter === 'sbp')
  const diastolicTrend = analysis.vitalTrends.find(trend => trend.parameter === 'dbp')

  assert.equal(systolicTrend?.trend, 'improving')
  assert.equal(diastolicTrend?.trend, 'improving')
  assert.equal(analysis.overallTrend, 'improving')
})

test('trajectory weights severe worsening vitals above mild improvements', () => {
  const analysis = analyzeTrajectory([
    createVisit(
      'enc-1',
      '2026-03-10T08:00:00.000Z',
      {
        sbp: 168,
        dbp: 100,
        hr: 108,
        rr: 18,
        temp: 37.4,
        glucose: 210,
        spo2: 97,
      },
      'Haus ringan'
    ),
    createVisit(
      'enc-2',
      '2026-03-11T08:00:00.000Z',
      {
        sbp: 158,
        dbp: 96,
        hr: 100,
        rr: 18,
        temp: 37.0,
        glucose: 295,
        spo2: 97,
      },
      'Lemas'
    ),
    createVisit(
      'enc-3',
      '2026-03-12T08:00:00.000Z',
      {
        sbp: 150,
        dbp: 92,
        hr: 94,
        rr: 18,
        temp: 36.8,
        glucose: 362,
        spo2: 96,
      },
      'Lemas dan poliuria'
    ),
  ])

  const glucoseTrend = analysis.vitalTrends.find(trend => trend.parameter === 'glucose')

  assert.equal(glucoseTrend?.trend, 'declining')
  assert.equal(analysis.overallTrend, 'declining')
  assert.ok(
    analysis.clinical_safe_output.drivers.some(driver => driver.includes('Gula Darah Sewaktu'))
  )
  assert.ok(analysis.acute_attack_risk_24h.glycemic_crisis_risk >= 75)
})
