import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import path from 'node:path'
import test from 'node:test'

import { CREW_ACCESS_PROFESSIONS, getCrewProfessionLogo } from './crew-access'

const PNG_SIGNATURE = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a])

test('every profession logo the registration form shows is a real PNG shipped in public/', () => {
  for (const profession of CREW_ACCESS_PROFESSIONS) {
    const logo = getCrewProfessionLogo(profession)
    if (logo === null) continue
    const file = path.join(process.cwd(), 'public', logo)
    assert.deepEqual(readFileSync(file).subarray(0, 8), PNG_SIGNATURE, `${profession}: ${logo}`)
  }
})
