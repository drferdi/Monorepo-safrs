import assert from 'node:assert/strict'
import test from 'node:test'
import { createElement } from 'react'
import { renderToStaticMarkup } from 'react-dom/server'

import { LEGAL_TABS } from '@/lib/legal-tabs'
import AppFooter from './AppFooter'

const html = renderToStaticMarkup(createElement(AppFooter))

test('the footer links every legal tab as a plain anchor, so a click on /legal still switches the tab', () => {
  for (const tab of LEGAL_TABS) {
    assert.match(html, new RegExp(`<a[^>]*href="/legal#${tab.key}"[^>]*>(?:(?!</a>).)*${tab.label}</a>`))
  }
})

test('the footer states that clinical decisions stay with the treating health worker', () => {
  assert.match(html, /AI di MedBoard memberi saran\. Keputusan klinis tetap menjadi tanggung jawab tenaga kesehatan yang merawat pasien\./)
})

// Chief 2026-10-07 ("decide better"): the tagline names the work MedBoard carries, not a category.
test('the tagline names the clinical flow from history taking to referral', () => {
  assert.match(html, /<p class="app-footer__tagline">Dari anamnesis sampai rujukan, di satu meja kerja<\/p>/)
  assert.doesNotMatch(html, /[Ss]istem informasi klinis/)
})

test('the footer links Sentra Hub inside the app and sentrahai.com in a new tab', () => {
  assert.match(html, /<a[^>]*href="\/hub"[^>]*>Sentra Hub<\/a>/)
  assert.match(html, /<a[^>]*href="https:\/\/sentrahai\.com\/"[^>]*target="_blank"[^>]*rel="noopener noreferrer"[^>]*>sentrahai\.com<\/a>/)
  assert.match(html, new RegExp(`© ${new Date().getFullYear()} Sentra Healthcare Solutions`))
})

// Chief 2026-10-07: the footer follows the Wine Diplomacy layout: a fine grid band, the tagline
// with a round back-to-top link, three ruled columns, a light bar, then the base line.
test('the footer runs band, tagline, back-to-top, three columns, bar and base line, in that order', () => {
  const order = ['app-footer__band', 'app-footer__tagline', 'app-footer__top', 'app-footer__columns', 'app-footer__bar', 'app-footer__base']
  const at = order.map((name) => html.indexOf(name))
  assert.ok(at.every((index) => index > -1), `missing: ${order.filter((_, i) => at[i] < 0).join(', ')}`)
  assert.deepEqual([...at].sort((a, b) => a - b), at)
  assert.match(html, /<a[^>]*href="#"[^>]*aria-label="Kembali ke atas"/)
  const headings = [...html.matchAll(/<p class="app-footer__heading">([^<]+)<\/p>/g)].map((m) => m[1])
  assert.deepEqual(headings, ['MedBoard', 'Tanggung jawab klinis', 'Legal'])
})
