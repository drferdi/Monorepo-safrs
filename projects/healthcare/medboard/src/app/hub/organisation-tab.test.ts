import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import path from 'node:path'
import test from 'node:test'

import { CORE_ROLES } from '../../lib/hub/organisation'

const read = (file: string) => readFileSync(path.join(process.cwd(), file), 'utf8')
const SOURCES = ['src/app/hub/page.tsx', 'src/app/hub/OrganisationTab.tsx', 'src/lib/hub/organisation.ts']

// The tab imports a CSS module, so like icdx-page.test.ts this reads its source instead of rendering it.
test('the organisation map shows the founder and the five charter roles, each as a neumorphic chip', () => {
  const tab = read('src/app/hub/OrganisationTab.tsx')
  assert.deepEqual(
    CORE_ROLES.map((role) => role.shortName),
    ['dr. Ferdi Iskandar', 'Asyraf Hadi', 'Josep Arianto', 'dr. Novia Anggraini', 'Karel Sinatra', 'Farhan Nugroho']
  )
  assert.match(tab, /className="ui-chip"\s+aria-pressed=\{selected === role\.id\}[\s\S]*?\{role\.shortName\}/)
  assert.match(tab, /\{chip\(founder\)\}/)
  assert.match(tab, /\{team\.map\(\(role\) => \([\s\S]*?\{chip\(role\)\}/)
  assert.match(tab, /useState\(CORE_ROLES\[0\]\.id\)/, 'the founder is selected first')
  assert.match(tab, /className="ui-chip"\s+aria-pressed=\{section === item\.key\}/)
})

test('people the charter no longer lists are gone from the hub (Chief 2026-10-07)', () => {
  const removed = ['Auliya', 'Armando', 'Umul Farida', 'Nurmayatul', 'Oriza', 'Michael Subrata', 'Sentra Healthcare Solutions']
  for (const file of SOURCES) {
    const text = read(file)
    assert.deepEqual(removed.filter((name) => text.includes(name)), [], file)
  }
})

test('no personal data from the founding statement reaches the page or its data', () => {
  for (const file of SOURCES) {
    const text = read(file)
    assert.doesNotMatch(text, /\d{16}/, `${file}: a 16-digit NIK or NPWP`)
    assert.doesNotMatch(text, /26\/2\/1982|1982/, `${file}: date of birth`)
    assert.doesNotMatch(text, /Tanah Lot|Gunung Anyar|Balowerti II/, `${file}: street address`)
  }
})

test('the organisation tab has no participation section and keeps no profit-share data (Chief 2026-10-07)', () => {
  for (const file of SOURCES) {
    const text = read(file)
    assert.doesNotMatch(text, /Partisipasi|PARTICIPATION|FOUNDING_POOL|PHANTOM|Phantom stock|Founder participation/, file)
  }
})
