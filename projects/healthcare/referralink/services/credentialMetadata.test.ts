import assert from 'node:assert/strict'

import { normalizeCredentialMetadata } from './credentialMetadata.js'

const normalized = normalizeCredentialMetadata({
  label: ' OpenAI ',
  provider: ' Sentra ',
  username: 'doctor@example.test',
  url: 'https://api.openai.com',
  kind: 'api-token',
  notes: 'Synthetic workspace',
})

assert.equal(normalized.label, 'OpenAI')
assert.equal(normalized.provider, 'Sentra')
assert.equal(normalized.url, 'https://api.openai.com')
assert.throws(
  () => normalizeCredentialMetadata({ label: '', provider: '', username: '', url: '', kind: 'other', notes: '' }),
  /label/i
)
assert.throws(
  () => normalizeCredentialMetadata({ label: 'Unsafe', provider: '', username: '', url: 'http://example.com', kind: 'other', notes: '' }),
  /https/i
)

console.log('credential metadata contracts passed')
