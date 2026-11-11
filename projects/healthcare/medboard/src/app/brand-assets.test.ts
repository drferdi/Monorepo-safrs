import assert from 'node:assert/strict'
import { createHash } from 'node:crypto'
import { readFileSync } from 'node:fs'
import path from 'node:path'
import test from 'node:test'
import { createElement } from 'react'
import { renderToStaticMarkup } from 'react-dom/server'

import AppFooter from '@/components/AppFooter'
import AppHeader from '@/components/AppHeader'

// Chief 2026-10-07: the dashboard wears the official MedBoard Brand Kit v1.0 (docs/brand).
// Each file is a byte copy of the kit; the hashes are the kit's own asset-manifest.json entries.
const OFFICIAL: Record<string, string> = {
  'public/brand/medboard-logo-horizontal-black.svg': 'eedf2888101aa52aac0c8f14cbfa26e010d4a484d10d69ad61eadffccd742b81',
  'public/brand/medboard-mark-white.svg': 'b01fbcc56af59805862e81bf9c25a72eda4b43ef47de6bd6ea7bf25687be8dc2',
  'src/app/favicon.ico': '64f19c6410918154996095ce34f48a401dbf5011376bab1a48e8e581751c1c35',
  'src/app/icon.png': 'b44add30f52064da03b67aefb2250d96c4597f25f484d1ce9d6143daa1a63a49',
  'src/app/apple-icon.png': '8f806e5b6b878a9457e89a1d3cf4d4edd41eda2092e2dab00d404754fa4703ad',
}

const read = (file: string) => readFileSync(path.join(process.cwd(), file))

test('brand files are unaltered copies of the official MedBoard kit', () => {
  for (const [file, sha256] of Object.entries(OFFICIAL)) {
    assert.equal(createHash('sha256').update(read(file)).digest('hex'), sha256, file)
  }
})

test('the header shows the official horizontal MedBoard logo', () => {
  const html = renderToStaticMarkup(createElement(AppHeader))
  assert.match(html, /<img[^>]*src="\/brand\/medboard-logo-horizontal-black\.svg(#svgView\([^"]*\))?"[^>]*alt="MedBoard"/)
  assert.doesNotMatch(html, /sentra-mark\.png/)
})

test('the footer MedBoard heading carries the white MedBoard mark', () => {
  const html = renderToStaticMarkup(createElement(AppFooter))
  assert.match(html, /<img[^>]*src="\/brand\/medboard-mark-white\.svg(#svgView\([^"]*\))?"[^>]*\/?><p class="app-footer__heading">MedBoard<\/p>/)
  assert.doesNotMatch(html, /sentra-mark\.png/)
})

test('the browser tab icon comes from the app icon files, not the Sentra mark', () => {
  assert.doesNotMatch(read('src/app/layout.tsx').toString(), /sentra-mark\.png/)
})
