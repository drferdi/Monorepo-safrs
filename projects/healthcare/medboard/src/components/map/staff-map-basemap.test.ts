import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import path from 'node:path'
import test from 'node:test'

import nextConfig from '../../../next.config'

// Chief 2026-10-07: Sentra Network draws the open source grey OpenFreeMap Positron basemap.
// Keyless CARTO tiles now show only an "API key required" watermark.
test('the staff map draws OpenFreeMap Positron, not CARTO', () => {
  const source = readFileSync(path.join(process.cwd(), 'src/components/map/StaffMap.tsx'), 'utf8')
  assert.match(source, /'https:\/\/tiles\.openfreemap\.org\/styles\/positron'/)
  assert.doesNotMatch(source, /cartocdn/)
})

test('the CSP lets the browser fetch OpenFreeMap tiles and start the MapLibre worker', async () => {
  const rules = await nextConfig.headers?.()
  const csp = rules?.flatMap((rule) => rule.headers).find((header) => header.key === 'Content-Security-Policy')?.value ?? ''
  const directive = (name: string) => csp.split(';').map((part) => part.trim().split(/\s+/)).find(([key]) => key === name) ?? []
  assert.ok(directive('connect-src').includes('https://tiles.openfreemap.org'), csp)
  assert.ok(directive('worker-src').includes('blob:'), csp)
})
