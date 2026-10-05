import assert from 'node:assert/strict'
import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'
import { before, beforeEach, test } from 'node:test'

import { CREW_ACCESS_INSTITUTIONS } from '@/lib/crew-access'
import { CREW_PROFILE_POSITIONS } from '@/lib/crew-profile'

const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'medboard-registration-'))
process.env.CREW_ACCESS_REGISTRATION_REQUESTS_FILE = path.join(tempDir, 'requests.json')

// Loaded in before(): the capsule is CommonJS, so no top-level await.
let registration_: typeof import('./crew-access-registration')
before(async () => {
  registration_ = await import('./crew-access-registration')
})

type CreatedUser = { username: string; email: string }

function fakeDeps(options: { failProfileWrites?: number } = {}) {
  const users: CreatedUser[] = []
  let profileFailuresLeft = options.failProfileWrites ?? 0
  let createCalls = 0
  return {
    users,
    createCalls: () => createCalls,
    deps: {
      listUsers: async () => users.map(user => ({ ...user })),
      createUser: async (user: CreatedUser) => {
        createCalls += 1
        if (users.some(existing => existing.username === user.username)) {
          throw new Error('Unique constraint failed on the fields: (`username`)')
        }
        users.push({ username: user.username, email: user.email })
      },
      writeProfile: async () => {
        if (profileFailuresLeft > 0) {
          profileFailuresLeft -= 1
          throw new Error('profile store unavailable')
        }
      },
    },
  }
}

function registration(username: string) {
  return {
    email: `${username}@example.test`,
    username,
    password: 'synthetic-password-0001',
    institution: CREW_ACCESS_INSTITUTIONS[0],
    profession: 'Perawat',
    fullName: 'Perawat Uji',
    birthPlace: 'Kediri',
    birthDate: '1990-01-01',
    gender: 'Perempuan',
    domicile: 'Kota Kediri',
    degrees: [],
    jobTitles: [CREW_PROFILE_POSITIONS[0]],
    serviceAreas: ['IGD'],
  }
}

beforeEach(() => {
  fs.rmSync(process.env.CREW_ACCESS_REGISTRATION_REQUESTS_FILE ?? '', { force: true })
})

test('a rejected applicant can register again with the same username', async () => {
  const { deps } = fakeDeps()
  const first = await registration_.createCrewAccessRegistration(registration('perawat.uji'), deps)
  await registration_.rejectRegistration(first.request.id, 'admin.uji')

  const second = await registration_.createCrewAccessRegistration(registration('perawat.uji'), deps)

  assert.equal(second.request.status, 'PENDING_REVIEW')
  assert.notEqual(second.request.id, first.request.id)
})

test('a second request is still refused while the first one waits for review', async () => {
  const { deps } = fakeDeps()
  await registration_.createCrewAccessRegistration(registration('perawat.dua'), deps)

  await assert.rejects(
    registration_.createCrewAccessRegistration(registration('perawat.dua'), deps),
    /sudah menunggu review/
  )
})

test('an approval that failed after the user was created succeeds on retry with one user', async () => {
  const { deps, users, createCalls } = fakeDeps({ failProfileWrites: 1 })
  const created = await registration_.createCrewAccessRegistration(registration('perawat.tiga'), deps)

  await assert.rejects(registration_.approveRegistration(created.request.id, 'admin.uji', deps), /profile store/)
  const retried = await registration_.approveRegistration(created.request.id, 'admin.uji', deps)

  assert.equal(retried.username, 'perawat.tiga')
  assert.deepEqual(
    users.map(user => user.username),
    ['perawat.tiga']
  )
  assert.equal(createCalls(), 1)
  assert.deepEqual(registration_.listPendingRegistrations(), [])
})
