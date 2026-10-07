import assert from 'node:assert/strict'
import test from 'node:test'

import { acarsAvatarFor } from './crew-profile'

test('ACARS shows the stored avatar, so a woman is not drawn as a man', () => {
  assert.equal(acarsAvatarFor('/avatar/nurse-w.png', 'Perawat'), '/avatar/nurse-w.png')
})

test('without a stored avatar ACARS falls back to the profession default', () => {
  assert.equal(acarsAvatarFor(undefined, 'Apoteker'), '/avatar/pharmacy-m.png')
  assert.equal(acarsAvatarFor('', 'Dokter'), '/avatar/doctor-m.png')
})
