import assert from 'node:assert/strict'
import test from 'node:test'

import { LEGAL_TABS, tabFromHash } from './legal-tabs'

test('the legal page has four tabs in reading order', () => {
  assert.deepEqual(
    LEGAL_TABS.map((tab) => tab.label),
    ['Disclaimer AI', 'Privasi data', 'Ketentuan', 'Keamanan']
  )
})

test('a hash names a tab only when it matches one exactly', () => {
  assert.equal(tabFromHash('#privacy'), 'privacy')
  assert.equal(tabFromHash('#security'), 'security')
  assert.equal(tabFromHash('#unknown'), null)
  assert.equal(tabFromHash(''), null)
})
