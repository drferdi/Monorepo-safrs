import assert from 'node:assert/strict'
import test from 'node:test'

import { activitySince, buildActivityDays } from './clinical-activity'

const TODAY = new Date('2026-10-07T05:00:00Z') // Wednesday 7 October, 12.00 WIB

test('a report written at 00.30 WIB counts on that WIB day, not the UTC day before', () => {
  const days = buildActivityDays([new Date('2026-10-06T17:30:00Z')], TODAY)
  assert.deepEqual(days.at(-1), { date: '2026-10-07', count: 1 })
  assert.equal(days.find((day) => day.date === '2026-10-06')?.count, 0)
})

test('the year runs oldest to newest from a Sunday to today, one entry per day', () => {
  const days = buildActivityDays([], TODAY)
  assert.equal(days[0].date, '2025-10-05')
  assert.equal(new Date(`${days[0].date}T00:00:00Z`).getUTCDay(), 0)
  assert.equal(days.at(-1)?.date, '2026-10-07')
  assert.equal(days.length, 368)
})

test('reports on the same day add up and reports before the year are left out', () => {
  const days = buildActivityDays(
    [new Date('2026-03-02T01:00:00Z'), new Date('2026-03-02T09:00:00Z'), new Date('2025-01-01T01:00:00Z')],
    TODAY
  )
  assert.equal(days.find((day) => day.date === '2026-03-02')?.count, 2)
  assert.equal(days.reduce((sum, day) => sum + day.count, 0), 2)
})

test('the query starts at 00.00 WIB on the first Sunday of the grid', () => {
  assert.equal(activitySince(TODAY).toISOString(), '2025-10-04T17:00:00.000Z')
})
