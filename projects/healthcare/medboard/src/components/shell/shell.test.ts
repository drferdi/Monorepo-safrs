import assert from 'node:assert/strict'
import { existsSync } from 'node:fs'
import path from 'node:path'
import test from 'node:test'

import { initials } from './initials'
import { isNavActive, NAV_GROUPS, readNavCollapsed } from './nav-items'

const hrefs = NAV_GROUPS.flatMap((group) => group.items.map((item) => item.href))

test('every rail item opens a page that exists', () => {
  const missing = hrefs.filter(
    (href) => !existsSync(path.join(process.cwd(), 'src/app', href, 'page.tsx'))
  )
  assert.deepEqual(missing, [])
})

test('pages that were only in the old footer stay reachable from the rail', () => {
  const formerFooterAndNav = [
    '/emr', '/hub', '/voice', '/acars', '/icdx', '/calculator', '/critical-mind', '/report',
    '/chat', '/telemedicine', '/dashboard/intelligence', '/audit/logbook', '/admin',
  ]
  assert.deepEqual(formerFooterAndNav.filter((href) => !hrefs.includes(href)), [])
})

test('a nested page lights up its parent menu item, a look-alike path does not', () => {
  assert.equal(isNavActive('/hub', '/hub'), true)
  assert.equal(isNavActive('/hub/dr-ani', '/hub'), true)
  assert.equal(isNavActive('/report/clinical', '/report'), true)
  assert.equal(isNavActive('/hubx', '/hub'), false)
  assert.equal(isNavActive('/', '/hub'), false)
})

test('a new user starts with the narrow rail; a returning user keeps their choice', () => {
  assert.equal(readNavCollapsed(null), true)
  assert.equal(readNavCollapsed('true'), true)
  assert.equal(readNavCollapsed('false'), false)
})

test('the avatar shows name initials without titles or degrees', () => {
  assert.equal(initials('dr. Budi Santoso, Sp.PD'), 'BS')
  assert.equal(initials('Ani'), 'A')
  assert.equal(initials('  '), '?')
})
