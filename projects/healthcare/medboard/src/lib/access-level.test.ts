import assert from 'node:assert/strict'
import test from 'node:test'

import { accessLevelFor, assignableRoles, canActOnUser } from './access-level'

test('ten roles fold into three access levels', () => {
  for (const role of ['CEO', 'CEO_SENTRA', 'CHIEF_EXECUTIVE_OFFICER']) assert.equal(accessLevelFor(role), 'CEO')
  assert.equal(accessLevelFor('ADMINISTRATOR'), 'ADMINISTRATOR')
  for (const role of ['DOKTER', 'DOKTER_GIGI', 'PERAWAT', 'BIDAN', 'APOTEKER', 'TRIAGE_OFFICER', '', undefined]) {
    assert.equal(accessLevelFor(role), 'USER')
  }
})

test('an administrator manages users but never levels, other admins, or deletion', () => {
  const admin = 'ADMINISTRATOR'
  assert.equal(canActOnUser({ actorRole: admin, targetRole: 'PERAWAT', action: 'reset-password' }), true)
  assert.equal(canActOnUser({ actorRole: admin, targetRole: 'PERAWAT', action: 'edit', nextRole: 'BIDAN' }), true)
  assert.equal(canActOnUser({ actorRole: admin, targetRole: 'PERAWAT', action: 'edit', nextRole: 'ADMINISTRATOR' }), false)
  assert.equal(canActOnUser({ actorRole: admin, targetRole: 'ADMINISTRATOR', action: 'deactivate' }), false)
  assert.equal(canActOnUser({ actorRole: admin, targetRole: 'CEO', action: 'edit' }), false)
  assert.equal(canActOnUser({ actorRole: admin, targetRole: 'PERAWAT', action: 'delete' }), false)
})

test('the chief executive officer role is a CEO in the hierarchy too', () => {
  assert.equal(canActOnUser({ actorRole: 'CHIEF_EXECUTIVE_OFFICER', targetRole: 'ADMINISTRATOR', action: 'delete' }), true)
  assert.equal(canActOnUser({ actorRole: 'ADMINISTRATOR', targetRole: 'CHIEF_EXECUTIVE_OFFICER', action: 'edit' }), false)
})

test('a user acts on no one', () => {
  assert.equal(canActOnUser({ actorRole: 'DOKTER', targetRole: 'PERAWAT', action: 'edit' }), false)
})

test('only a CEO is offered the level roles in the role list', () => {
  assert.deepEqual(assignableRoles('ADMINISTRATOR'), ['DOKTER', 'DOKTER_GIGI', 'PERAWAT', 'BIDAN', 'APOTEKER', 'TRIAGE_OFFICER'])
  assert.deepEqual(assignableRoles('CEO').slice(0, 3), ['CEO', 'CEO_SENTRA', 'ADMINISTRATOR'])
})
