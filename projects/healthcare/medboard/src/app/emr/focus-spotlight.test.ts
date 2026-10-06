import assert from 'node:assert/strict'
import test from 'node:test'

import { sectionsToDim } from './focus-spotlight'

const sections = ['keluhan', 'ttv', 'pemeriksaan-fisik', 'diagnosis'] as const

test('while a section is being filled, every section below it fades back', () => {
  assert.deepEqual(sectionsToDim(sections, 'keluhan'), ['ttv', 'pemeriksaan-fisik', 'diagnosis'])
})

test('moving on to the next section moves the spotlight; sections already filled stay clear', () => {
  assert.deepEqual(sectionsToDim(sections, 'ttv'), ['pemeriksaan-fisik', 'diagnosis'])
  assert.deepEqual(sectionsToDim(sections, 'diagnosis'), [])
})

test('when nothing is being filled, nothing is dimmed', () => {
  assert.deepEqual(sectionsToDim(sections, null), [])
  assert.deepEqual(sectionsToDim(sections, 'not-a-section'), [])
})
