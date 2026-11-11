import assert from 'node:assert/strict'
import test from 'node:test'
import { renderToStaticMarkup } from 'react-dom/server'

import IntelligenceDashboardError from './error'

test('renders a safe retry error state', () => {
  const html = renderToStaticMarkup(
    <IntelligenceDashboardError
      error={Object.assign(new Error('boom'), { digest: 'digest-123' })}
      reset={() => {}}
    />
  )

  assert.match(html, /Error/)
  assert.match(html, /Panel belum bisa dimuat/)
  assert.match(html, /Coba lagi/)
  assert.match(html, /digest-123/)
})
