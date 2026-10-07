import assert from 'node:assert/strict'
import test from 'node:test'
import { createElement } from 'react'
import { renderToStaticMarkup } from 'react-dom/server'

import { LEGAL_TABS } from '@/lib/legal-tabs'
import AppFooter from './AppFooter'

const html = renderToStaticMarkup(createElement(AppFooter))

test('the footer links every legal tab as a plain anchor, so a click on /legal still switches the tab', () => {
  for (const tab of LEGAL_TABS) {
    assert.match(html, new RegExp(`<a[^>]*href="/legal#${tab.key}"[^>]*>${tab.label}</a>`))
  }
})

test('the footer states that clinical decisions stay with the treating health worker', () => {
  assert.match(html, /Keputusan klinis tetap menjadi tanggung jawab tenaga kesehatan yang merawat pasien\./)
})

test('the footer links Sentra Hub inside the app and sentrahai.com in a new tab', () => {
  assert.match(html, /href="\/hub"/)
  assert.match(html, /<a[^>]*href="https:\/\/sentrahai\.com\/"[^>]*target="_blank"[^>]*rel="noopener noreferrer"/)
  assert.match(html, new RegExp(`© ${new Date().getFullYear()} Sentra Healthcare Solutions`))
})
