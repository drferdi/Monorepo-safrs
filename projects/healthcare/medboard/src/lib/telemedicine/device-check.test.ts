import assert from 'node:assert/strict'
import test from 'node:test'

import { deviceErrorMessage, latencyLabel, micLevel } from './device-check'

test('silence reads 0, a full-scale wave reads close to 1', () => {
  assert.equal(micLevel(new Uint8Array([128, 128, 128, 128])), 0)
  assert.ok(micLevel(new Uint8Array([0, 255, 0, 255])) > 0.95)
  assert.equal(micLevel(new Uint8Array([])), 0)
})

test('browser errors become plain Indonesian the doctor can act on', () => {
  const named = (name: string) => Object.assign(new Error('x'), { name })
  assert.match(deviceErrorMessage(named('NotAllowedError')), /izin/i)
  assert.match(deviceErrorMessage(named('NotFoundError')), /tidak ditemukan/)
  assert.match(deviceErrorMessage(named('NotReadableError')), /aplikasi lain/)
  assert.match(deviceErrorMessage('weird'), /tidak dapat dibuka/)
})

test('connection quality reads from the round trip to MedBoard', () => {
  assert.equal(latencyLabel(null), 'Tidak terhubung')
  assert.equal(latencyLabel(42), 'Baik · 42 ms')
  assert.equal(latencyLabel(250), 'Cukup · 250 ms')
  assert.equal(latencyLabel(900), 'Lambat · 900 ms')
})
