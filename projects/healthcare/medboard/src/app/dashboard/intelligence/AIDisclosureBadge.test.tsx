import assert from 'node:assert/strict'
import test from 'node:test'
import { renderToStaticMarkup } from 'react-dom/server'

import { AIDisclosureBadge } from './AIDisclosureBadge'

test('AIDisclosureBadge renders the required disclosure copy', () => {
  const markup = renderToStaticMarkup(<AIDisclosureBadge />)

  assert.match(markup, /Saran AI/i)
  assert.match(markup, /verifikasi klinisi/i)
})
