import assert from 'node:assert/strict'

import { browserCredentialVault } from './credentialVault.js'

assert.equal(await browserCredentialVault.availability(), 'unavailable')
await assert.rejects(
  () => browserCredentialVault.saveSecret('id', 'secret'),
  /desktop secure vault/i
)
await assert.rejects(
  () => browserCredentialVault.deleteSecret('id'),
  /desktop secure vault/i
)

console.log('browser credential vault contracts passed')
