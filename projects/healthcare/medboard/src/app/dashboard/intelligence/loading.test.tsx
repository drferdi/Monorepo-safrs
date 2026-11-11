import assert from 'node:assert/strict'
import test from 'node:test'
import { renderToStaticMarkup } from 'react-dom/server'

import IntelligenceDashboardLoading from './loading'

test('renders the route loading skeleton blocks', () => {
  const html = renderToStaticMarkup(<IntelligenceDashboardLoading />)

  assert.match(html, /pulse/)
  assert.match(html, /max-width:1400px/)
  assert.match(html, /grid-template-columns/)
})
