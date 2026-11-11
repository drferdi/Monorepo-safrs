import assert from 'node:assert/strict'
import { beforeEach, test } from 'node:test'

import {
  ASSIST_PRESENCE_TTL_MS,
  clearAssistPresence,
  joinWebPresence,
  leaveWebPresence,
  listOnlineUsers,
  markAssistPresence,
  pruneAssistPresence,
  resetCrewPresence,
  webSocketIds,
} from './crew-presence'

const T0 = Date.parse('2026-10-05T08:00:00.000Z')

const nurse = {
  userId: 'perawat.uji',
  name: 'Perawat Uji',
  role: 'PERAWAT',
  profession: 'Perawat',
  institution: 'Puskesmas Uji',
}

const doctor = {
  userId: 'dokter.uji',
  name: 'dr. Uji',
  role: 'DOKTER',
  profession: 'Dokter',
  institution: 'Puskesmas Uji',
}

beforeEach(() => resetCrewPresence())

test('an Asisten Medis heartbeat puts the user on the online list with source assist', () => {
  markAssistPresence(nurse, T0)

  assert.deepEqual(listOnlineUsers(T0 + 1_000), [
    { ...nurse, joinedAt: T0, source: 'assist' },
  ])
})

test('an Asisten Medis user drops off once heartbeats stop for longer than the TTL', () => {
  markAssistPresence(nurse, T0)

  assert.equal(listOnlineUsers(T0 + ASSIST_PRESENCE_TTL_MS).length, 1)
  assert.deepEqual(listOnlineUsers(T0 + ASSIST_PRESENCE_TTL_MS + 1), [])
})

test('a later heartbeat keeps the user online and keeps the first time they came online', () => {
  markAssistPresence(nurse, T0)
  markAssistPresence(nurse, T0 + 60_000)

  assert.deepEqual(listOnlineUsers(T0 + 60_000 + ASSIST_PRESENCE_TTL_MS), [
    { ...nurse, joinedAt: T0, source: 'assist' },
  ])
})

test('logging out of Asisten Medis removes the user at once', () => {
  markAssistPresence(nurse, T0)

  assert.equal(clearAssistPresence(nurse.userId), true)
  assert.deepEqual(listOnlineUsers(T0 + 1_000), [])
})

test('pruning reports a change only when an expired heartbeat was removed', () => {
  markAssistPresence(nurse, T0)

  assert.equal(pruneAssistPresence(T0 + 1_000), false)
  assert.equal(pruneAssistPresence(T0 + ASSIST_PRESENCE_TTL_MS + 1), true)
  assert.equal(pruneAssistPresence(T0 + ASSIST_PRESENCE_TTL_MS + 2), false)
})

test('a user on the web dashboard and in Asisten Medis is listed once with source both', () => {
  joinWebPresence(doctor, 'socket-a', T0)
  markAssistPresence(doctor, T0 + 5_000)

  assert.deepEqual(listOnlineUsers(T0 + 6_000), [
    { ...doctor, joinedAt: T0, source: 'both' },
  ])
})

test('closing one of two web tabs keeps the user online', () => {
  joinWebPresence(doctor, 'socket-a', T0)
  joinWebPresence(doctor, 'socket-b', T0 + 1_000)

  assert.equal(leaveWebPresence(doctor.userId, 'socket-a'), false)
  assert.deepEqual(listOnlineUsers(T0 + 2_000), [{ ...doctor, joinedAt: T0, source: 'web' }])
  assert.equal(leaveWebPresence(doctor.userId, 'socket-b'), true)
  assert.deepEqual(listOnlineUsers(T0 + 3_000), [])
})

test('web and Asisten Medis users are listed together, earliest first', () => {
  markAssistPresence(nurse, T0 + 2_000)
  joinWebPresence(doctor, 'socket-a', T0)

  assert.deepEqual(
    listOnlineUsers(T0 + 3_000).map(user => [user.userId, user.source]),
    [
      ['dokter.uji', 'web'],
      ['perawat.uji', 'assist'],
    ]
  )
})

test('an EMR triage relay reaches every open web tab of the target, and none of an Assist-only user', () => {
  joinWebPresence(doctor, 'socket-a', T0)
  joinWebPresence(doctor, 'socket-b', T0 + 1_000)
  markAssistPresence(nurse, T0)

  assert.deepEqual(webSocketIds(doctor.userId), ['socket-a', 'socket-b'])
  assert.deepEqual(webSocketIds(nurse.userId), [])
})
