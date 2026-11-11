import assert from 'node:assert/strict'
import { existsSync } from 'node:fs'
import { join } from 'node:path'
import test from 'node:test'

import { CREW_RANKS, awardsFor, rankFor, summarizeRank } from './crew-rank'

test('a level needs both its cases and its hours', () => {
  assert.equal(rankFor(24, 1000).name, 'Intern')
  assert.equal(rankFor(1000, 49).name, 'Intern')
  assert.equal(rankFor(25, 50).name, 'Residen Yunior')
  assert.equal(rankFor(150, 300).name, 'Residen Kepala')
  assert.equal(rankFor(4999, 10000).name, 'Konsulen Utama')
  assert.equal(rankFor(5000, 10000).name, 'Legendary')
})

test('every level boundary from the brief', () => {
  const expected: Array<[number, number, number]> = [
    [1, 0, 0], [2, 25, 50], [3, 75, 150], [4, 150, 300], [5, 300, 600],
    [6, 500, 1000], [7, 1000, 2000], [8, 2000, 4000], [9, 5000, 10000],
  ]
  for (const [level, cases, hours] of expected) {
    assert.equal(rankFor(cases, hours).level, level)
    if (level > 1) assert.equal(rankFor(cases - 1, hours).level, level - 1)
  }
})

test('the summary shows progress to the next level, and none at Legendary', () => {
  const intern = summarizeRank(18, 31 * 3600 + 3599)
  assert.deepEqual(
    { cases: intern.cases, hours: intern.hours, next: intern.next },
    { cases: 18, hours: 31, next: { level: 2, name: 'Residen Yunior', minCases: 25, minHours: 50 } }
  )
  assert.equal(summarizeRank(5000, 10000 * 3600).next, null)
})

test('an award is dated by the report that reached it', () => {
  const dates = Array.from({ length: 80 }, (_, i) => new Date(Date.UTC(2026, 0, 1 + i)))
  const awards = awardsFor([...dates].reverse())
  assert.deepEqual(awards.map((a) => a.cases), [25, 75, 150, 300, 500, 1000, 2000, 5000])
  assert.equal(awards[0].achievedAt, '2026-01-25T00:00:00.000Z')
  assert.equal(awards[1].achievedAt, '2026-03-16T00:00:00.000Z')
  assert.equal(awards[2].achievedAt, null)
})

test('every badge file exists, Legendary borrows Konsulen Utama', () => {
  for (const rank of CREW_RANKS) {
    assert.ok(existsSync(join(process.cwd(), 'public', rank.badgeSrc)), rank.badgeSrc)
  }
  assert.equal(CREW_RANKS[8].badgeSrc, '/ranks/konsulen_utama.png')
})
