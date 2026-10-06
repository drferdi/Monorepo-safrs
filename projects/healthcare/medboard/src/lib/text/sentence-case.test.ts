import assert from 'node:assert/strict'
import test from 'node:test'

import { sentenceCase } from './sentence-case'

test('a status word is shown with only its first letter capitalised', () => {
  assert.equal(sentenceCase('high'), 'High')
  assert.equal(sentenceCase('CRITICAL'), 'Critical')
  assert.equal(sentenceCase('needs_review'), 'Needs review')
  assert.equal(sentenceCase(''), '')
})
