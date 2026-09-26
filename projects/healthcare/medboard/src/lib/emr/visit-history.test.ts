import assert from 'node:assert/strict'
import test from 'node:test'

import {
  getOccultShockHistoryWindow,
  getTrajectoryHistoryWindow,
  normalizeScrapedVisitHistory,
} from './visit-history'

const rawVisitHistory = [
  {
    encounter_id: 'enc-5',
    date: '2026-03-05T09:00:00+07:00',
    vitals: { sbp: 150, dbp: 95, hr: 90, rr: 20, temp: 37.2, glucose: 210 },
    keluhan_utama: 'Kontrol tekanan darah',
    diagnosa: { icd_x: 'I10', nama: 'Hipertensi' },
  },
  {
    encounter_id: 'enc-2',
    date: '2026-03-02',
    vitals: {
      sbp: '148',
      dbp: '92',
      hr: '84',
      rr: '18',
      temp: '36.9',
      glucose: '185',
    },
    keluhan_utama: 'Pusing',
    diagnosa: { icd_x: 'I10', nama: 'Hipertensi' },
  },
  {
    encounter_id: 'enc-4',
    date: '2026-03-04T08:30:00+07:00',
    vitals: { sbp: 152, dbp: 96, hr: 88, rr: 19, temp: 37, glucose: 198 },
    keluhan_utama: 'Kontrol rutin',
    diagnosa: { icd_x: 'I10', nama: 'Hipertensi' },
  },
  {
    encounter_id: 'enc-1',
    date: '2026-03-01',
    vitals: { sbp: 145, dbp: 90, hr: 82, rr: 18, temp: 36.8, glucose: 176 },
    keluhan_utama: 'Cek tekanan darah',
    diagnosa: { icd_x: 'I10', nama: 'Hipertensi' },
  },
  {
    encounter_id: 'enc-6',
    date: '2026-03-06T09:15:00+07:00',
    vitals: { sbp: 154, dbp: 98, hr: 92, rr: 20, temp: 37.1, glucose: 214 },
    keluhan_utama: 'Masih pusing',
    diagnosa: { icd_x: 'I10', nama: 'Hipertensi' },
  },
  {
    encounter_id: 'enc-3',
    date: '2026-03-03T10:00:00+07:00',
    vitals: { sbp: 149, dbp: 94, hr: 86, rr: 18, temp: 36.7, glucose: 190 },
    keluhan_utama: 'Kontrol ulang',
    diagnosa: { icd_x: 'I10', nama: 'Hipertensi' },
  },
  {
    encounter_id: 'enc-6',
    date: '2026-03-06T09:15:00+07:00',
    vitals: { sbp: 154, dbp: 98, hr: 92, rr: 20, temp: 37.1, glucose: 214 },
    keluhan_utama: 'Duplikat',
    diagnosa: { icd_x: 'I10', nama: 'Hipertensi' },
  },
  {
    encounter_id: 'enc-invalid',
    date: 'not-a-date',
    vitals: { sbp: 0, dbp: 0, hr: 0, rr: 0, temp: 0, glucose: 0 },
    keluhan_utama: '',
    diagnosa: null,
  },
]

test('normalizeScrapedVisitHistory sorts ascending, trims to the latest five, and deduplicates visits', () => {
  const normalized = normalizeScrapedVisitHistory(rawVisitHistory)

  assert.equal(normalized.length, 5)
  assert.deepEqual(
    normalized.map(visit => visit.encounter_id),
    ['enc-2', 'enc-3', 'enc-4', 'enc-5', 'enc-6']
  )
  assert.equal(normalized[0]?.vitals.sbp, 148)
})

test('getTrajectoryHistoryWindow keeps only the four latest historical visits when current visit is present', () => {
  const window = getTrajectoryHistoryWindow(rawVisitHistory, true)

  assert.deepEqual(
    window.map(visit => visit.encounter_id),
    ['enc-3', 'enc-4', 'enc-5', 'enc-6']
  )
})

test('getOccultShockHistoryWindow picks the three most recent visits for baseline comparison', () => {
  const baseline = getOccultShockHistoryWindow(rawVisitHistory)

  assert.equal(baseline.length, 3)
  assert.deepEqual(
    baseline.map(visit => visit.sbp),
    [152, 150, 154]
  )
})
