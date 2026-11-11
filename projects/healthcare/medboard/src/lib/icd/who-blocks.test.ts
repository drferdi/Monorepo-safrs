import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import path from 'node:path'
import test from 'node:test'

import { WHO_BLOCKS, whoBlockOf } from './who-blocks'

test('the WHO blocks are in order and never overlap', () => {
  for (let i = 1; i < WHO_BLOCKS.length; i++) {
    const [, previousEnd] = WHO_BLOCKS[i - 1]
    const [start, end] = WHO_BLOCKS[i]
    assert.ok(start <= end, `${start}-${end}`)
    assert.ok(previousEnd < start, `${previousEnd} then ${start}`)
  }
})

test('every category of the 2010 catalogue falls in one WHO block (J45 in J40-J47)', () => {
  assert.deepEqual(whoBlockOf('J45.9'), ['J40', 'J47'])
  const raw = JSON.parse(readFileSync(path.join(process.cwd(), 'database/icd10.json'), 'utf8')) as { icd10: Array<{ kode: string }> }
  const categories = [...new Set(raw.icd10.map((entry) => entry.kode.trim().toUpperCase().slice(0, 3)))]
  const orphans = categories.filter((code) => !whoBlockOf(code))
  assert.deepEqual(orphans, [])
})
