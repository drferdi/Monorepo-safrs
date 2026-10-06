import assert from 'node:assert/strict'
import { existsSync, readFileSync } from 'node:fs'
import path from 'node:path'
import test from 'node:test'

import sharp from 'sharp'

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
    '/emr', '/hub', '/voice', '/acars', '/icdx', '/calculator', '/critical-mind',
    '/chat', '/telemedicine', '/dashboard/intelligence', '/audit/logbook', '/admin',
  ]
  assert.deepEqual(formerFooterAndNav.filter((href) => !hrefs.includes(href)), [])
})

test('the Report list page is gone (Chief 2026-10-06): no page and no rail item', () => {
  assert.equal(hrefs.includes('/report'), false)
  assert.equal(existsSync(path.join(process.cwd(), 'src/app/report/page.tsx')), false)
})

test('Laporan klinis stays reachable without the Report page: from the EMR and the home logbook', () => {
  assert.equal(existsSync(path.join(process.cwd(), 'src/app/report/clinical/page.tsx')), true)
  const emr = readFileSync(path.join(process.cwd(), 'src/app/emr/page.tsx'), 'utf-8')
  const home = readFileSync(path.join(process.cwd(), 'src/app/page.tsx'), 'utf-8')
  assert.match(emr, /router\.push\(`\/report\/clinical\?id=/)
  assert.match(home, /href=\{`\/report\/clinical\?id=/)
})

test('a nested page lights up its parent menu item, a look-alike path does not', () => {
  assert.equal(isNavActive('/hub', '/hub'), true)
  assert.equal(isNavActive('/hub/dr-ani', '/hub'), true)
  assert.equal(isNavActive('/audit/logbook/evt-1', '/audit/logbook'), true)
  assert.equal(isNavActive('/hubx', '/hub'), false)
  assert.equal(isNavActive('/', '/hub'), false)
})

test('a new user starts with the narrow rail; a returning user keeps their choice', () => {
  assert.equal(readNavCollapsed(null), true)
  assert.equal(readNavCollapsed('true'), true)
  assert.equal(readNavCollapsed('false'), false)
})

test('every Sentra logo is the dark mark on a transparent background', async () => {
  const screens = [
    'src/components/AppHeader.tsx',
    'src/components/CrewAccessGate.tsx',
    'src/app/hub/lab/[username]/page.tsx',
    'src/app/layout.tsx',
  ]
  const offBrand = screens.filter((file) => {
    const source = readFileSync(path.join(process.cwd(), file), 'utf-8')
    return !source.includes('/sentra-mark.png') || /sentradash\.png|sentralogo\.png|favicon\.svg/.test(source)
  })
  assert.deepEqual(offBrand, [])

  const { data, info } = await sharp(path.join(process.cwd(), 'public/sentra-mark.png'))
    .ensureAlpha()
    .raw()
    .toBuffer({ resolveWithObject: true })
  assert.equal(data[3], 0, 'top-left corner is transparent')
  let brightestInk = 0
  for (let i = 0; i < info.width * info.height * 4; i += 4) {
    if (data[i + 3] > 200) brightestInk = Math.max(brightestInk, data[i], data[i + 1], data[i + 2])
  }
  assert.ok(brightestInk < 80, `ink is dark (brightest channel ${brightestInk})`)
})

test('the avatar shows name initials without titles or degrees', () => {
  assert.equal(initials('dr. Budi Santoso, Sp.PD'), 'BS')
  assert.equal(initials('Ani'), 'A')
  assert.equal(initials('  '), '?')
})
