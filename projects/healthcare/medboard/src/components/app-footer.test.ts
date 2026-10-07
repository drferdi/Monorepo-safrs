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
  assert.match(html, /<a[^>]*href="\/hub"[^>]*>Buka Sentra Hub/)
  assert.match(html, /<a[^>]*href="https:\/\/sentrahai\.com\/"[^>]*target="_blank"[^>]*rel="noopener noreferrer"[^>]*>Dikembangkan oleh Sentra/)
  assert.match(html, new RegExp(`© ${new Date().getFullYear()} Sentra Healthcare Solutions`))
})

// Chief 2026-10-07: the footer follows the Inversa layout: three framed columns, then the
// MedBoard wordmark across the full width, then one line with copyright, privacy and credit.
test('the footer has three framed columns, the full-width wordmark and the base line, in that order', () => {
  const headings = [...html.matchAll(/<p class="app-footer__heading">([^<]+)<\/p>/g)].map((m) => m[1])
  assert.deepEqual(headings, ['Tentang', 'Legal', 'Sentra'])
  const grid = html.indexOf('app-footer__grid')
  const mark = html.indexOf('app-footer__mark')
  const base = html.indexOf('app-footer__base')
  assert.ok(grid > -1 && grid < mark && mark < base)
  assert.match(html, /<p class="app-footer__mark" aria-hidden="true">MedBoard<\/p>/)
})
