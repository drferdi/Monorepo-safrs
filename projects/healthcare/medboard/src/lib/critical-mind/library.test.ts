import assert from 'node:assert/strict'
import test from 'node:test'

import { CRITICAL_MIND_LIBRARY, MY_MIND_MEMORY_URL } from './library'

test('Critical Mind lists every publication in MyMindMemory, newest first', () => {
  assert.deepEqual(
    CRITICAL_MIND_LIBRARY.map((entry) => entry.doi),
    ['10.5281/zenodo.20677057', '10.5281/zenodo.20646120', '10.5281/zenodo.20604965', '10.5281/zenodo.20589509']
  )
  assert.equal(MY_MIND_MEMORY_URL, 'https://github.com/drferdi/MyMindMemory')
})

test('every library entry carries a light Indonesian description and topics', () => {
  for (const entry of CRITICAL_MIND_LIBRARY) {
    assert.ok(entry.description.length > 60, entry.title)
    assert.ok(entry.topics.length > 0, entry.title)
  }
})
