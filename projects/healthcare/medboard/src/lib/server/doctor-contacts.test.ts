import assert from 'node:assert/strict'
import test from 'node:test'

import { buildDoctorContacts, toWhatsappDigits } from './doctor-contacts'

test('toWhatsappDigits keeps digits and turns a leading 0 into 62', () => {
  assert.equal(toWhatsappDigits('0800-0000-0001'), '6280000000001')
  assert.equal(toWhatsappDigits('+62 800 0000 0002'), '6280000000002')
  assert.equal(toWhatsappDigits('  '), '')
})

test('buildDoctorContacts lists active doctors with a number, sorted by username', () => {
  const users = [
    { username: 'b', displayName: 'dr. Budi', profession: 'Dokter', status: 'ACTIVE' },
    { username: 'a', displayName: 'drg. Ani', profession: 'Dokter Gigi', status: 'ACTIVE' },
    { username: 'c', displayName: 'Citra', profession: 'Perawat', status: 'ACTIVE' },
    { username: 'd', displayName: 'dr. Dodi', profession: 'Dokter', status: 'INACTIVE' },
    { username: 'e', displayName: 'dr. Eko', profession: 'Dokter', status: 'ACTIVE' },
  ]
  const profiles = new Map([
    ['a', { whatsappNumber: '0800-0000-0001' }],
    ['b', { whatsappNumber: '6280000000002' }],
    ['c', { whatsappNumber: '0800-0000-0003' }],
    ['d', { whatsappNumber: '0800-0000-0004' }],
    ['e', { whatsappNumber: '' }],
  ])
  assert.deepEqual(buildDoctorContacts(users, profiles), [
    { id: 'a', name: 'drg. Ani', whatsappNumber: '6280000000001' },
    { id: 'b', name: 'dr. Budi', whatsappNumber: '6280000000002' },
  ])
})
