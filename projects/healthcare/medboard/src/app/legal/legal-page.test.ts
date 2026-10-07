import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import path from 'node:path'
import test from 'node:test'
import { createElement } from 'react'
import { renderToStaticMarkup } from 'react-dom/server'

import LegalPage from './page'

const source = readFileSync(path.join(process.cwd(), 'src/app/legal/page.tsx'), 'utf8')
const infrastructure = source.slice(source.indexOf('<SectionHeading>Infrastruktur</SectionHeading>'))

test('legal infrastructure names the Biznet Gio VPS, not the retired Railway host', () => {
  assert.doesNotMatch(infrastructure, /Railway/)
  assert.match(infrastructure, /Biznet Gio/)
})

test('legal infrastructure states the Node.js major the capsule requires', () => {
  const engines = JSON.parse(readFileSync(path.join(process.cwd(), 'package.json'), 'utf8')).engines.node as string
  const major = /\d+/.exec(engines)?.[0]
  assert.match(infrastructure, new RegExp(`Node\\.js ${major}\\b`))
})

test('legal tabs are black neumorphic chips and only the open one is pressed', () => {
  const html = renderToStaticMarkup(createElement(LegalPage))
  const tabs = html.match(/<button[^>]*>(Disclaimer AI|Privasi data|Ketentuan|Keamanan)<\/button>/g) ?? []
  assert.equal(tabs.length, 4)
  for (const tab of tabs) {
    assert.match(tab, /class="ui-chip"/)
    assert.doesNotMatch(tab, /style=/)
  }
  assert.deepEqual(tabs.filter((tab) => /aria-pressed="true"/.test(tab)).map((tab) => />([^<]+)</.exec(tab)?.[1]), ['Disclaimer AI'])
})
