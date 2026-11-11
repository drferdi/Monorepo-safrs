import assert from 'node:assert/strict'
import test from 'node:test'
import { renderToStaticMarkup } from 'react-dom/server'

import { Button } from './button'
import { Dialog } from './dialog'
import { StatusAlert, StatusBadge } from './status'
import { Tabs } from './tabs'

test('a critical status always says KRITIS in words, not only in colour', () => {
  assert.match(renderToStaticMarkup(<StatusBadge tone="critical" />), />KRITIS</)
  const alert = renderToStaticMarkup(
    <StatusAlert tone="critical" title="SpO2 88%">
      Periksa ulang saturasi
    </StatusAlert>
  )
  assert.match(alert, /role="alert"/)
  assert.match(alert, /KRITIS/)
  assert.match(alert, /SpO2 88%/)
})

test('warning and safe statuses carry their words too', () => {
  assert.match(renderToStaticMarkup(<StatusBadge tone="warning" label="TD 150/95" />), /WASPADA · TD 150\/95/)
  assert.match(renderToStaticMarkup(<StatusAlert tone="success" title="Data lengkap" />), /AMAN/)
})

test('a button inside a form does not submit it unless asked to', () => {
  assert.match(renderToStaticMarkup(<Button>Batal</Button>), /type="button"/)
  assert.match(renderToStaticMarkup(<Button type="submit" variant="primary">Masuk</Button>), /type="submit"/)
})

test('only the chosen tab reads as selected', () => {
  const html = renderToStaticMarkup(
    <Tabs
      aria-label="Panel klinis"
      items={[
        { id: 'ddx', label: 'MIRA DDx' },
        { id: 'summary', label: 'Ringkasan' },
      ]}
      value="summary"
      onChange={() => {}}
    />
  )
  assert.equal(html.match(/aria-selected="true"/g)?.length, 1)
  assert.match(html, /aria-selected="true"[^>]*>Ringkasan</)
})

test('a closed dialog renders nothing; an open one is a labelled modal', () => {
  assert.equal(renderToStaticMarkup(<Dialog open={false} title="Upload" onClose={() => {}}>isi</Dialog>), '')
  const html = renderToStaticMarkup(
    <Dialog open title="Upload Konteks Pasien" onClose={() => {}}>
      isi
    </Dialog>
  )
  assert.match(html, /role="dialog"/)
  assert.match(html, /aria-modal="true"/)
  assert.match(html, /Upload Konteks Pasien/)
})
