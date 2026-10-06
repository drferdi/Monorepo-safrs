import assert from 'node:assert/strict'
import test from 'node:test'

import { tidyModeFor, type TidyField } from './tidy-field'

const field = (overrides: Partial<TidyField>): TidyField => ({
  tag: 'input',
  type: 'text',
  name: '',
  id: '',
  autocomplete: '',
  inputMode: '',
  tidy: '',
  readOnly: false,
  disabled: false,
  ...overrides,
})

test('free text fields and text areas are tidied as sentences', () => {
  assert.equal(tidyModeFor(field({})), 'sentence')
  assert.equal(tidyModeFor(field({ tag: 'textarea', type: '' })), 'sentence')
})

test('name fields are tidied as names', () => {
  assert.equal(tidyModeFor(field({ name: 'fullName' })), 'name')
  assert.equal(tidyModeFor(field({ id: 'nama-pasien' })), 'name')
  assert.equal(tidyModeFor(field({ autocomplete: 'family-name' })), 'name')
  assert.equal(tidyModeFor(field({ tidy: 'name' })), 'name')
})

test('codes, identifiers, accounts, links and searches are never touched', () => {
  for (const name of ['email', 'username', 'password', 'githubUrl', 'nik', 'noRM', 'strNumber', 'icdCode', 'search']) {
    assert.equal(tidyModeFor(field({ name })), null, name)
  }
  assert.equal(tidyModeFor(field({ type: 'email' })), null)
  assert.equal(tidyModeFor(field({ type: 'search' })), null)
  assert.equal(tidyModeFor(field({ inputMode: 'numeric' })), null)
  assert.equal(tidyModeFor(field({ autocomplete: 'username' })), null)
})

test('read-only, disabled and opted-out fields are left alone', () => {
  assert.equal(tidyModeFor(field({ readOnly: true })), null)
  assert.equal(tidyModeFor(field({ disabled: true })), null)
  assert.equal(tidyModeFor(field({ tidy: 'off' })), null)
})
