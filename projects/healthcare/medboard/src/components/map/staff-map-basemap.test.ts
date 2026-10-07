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

// Chief 2026-10-07: the map opens on Kota Kediri (Wikipedia: 7.81111 S, 112.00472 E) at a zoom that
// shows the whole city, not street level around one puskesmas.
test('Sentra Network opens the map centred on Kota Kediri at city zoom', () => {
  const source = readFileSync(path.join(process.cwd(), 'src/app/acars/page.tsx'), 'utf8')
  assert.match(source, /const KEDIRI_CENTER: \[number, number\] = \[-7\.8111, 112\.0047\]/)
  assert.match(source, /<StaffMap[^>]*center=\{KEDIRI_CENTER\}[^>]*zoom=\{13\}/)
})

// Chief 2026-10-07: "Cara mendekatkan dan menjauhkan map?" The map has zoom buttons, and the
// mouse wheel over the map zooms it instead of Lenis scrolling the page.
test('the staff map zooms with its own buttons and with the mouse wheel', () => {
  const source = readFileSync(path.join(process.cwd(), 'src/components/map/StaffMap.tsx'), 'utf8')
  assert.match(source, /aria-label="Perbesar peta"[^>]*onClick=\{\(\) => map\?\.zoomIn\(\)\}/)
  assert.match(source, /aria-label="Perkecil peta"[^>]*onClick=\{\(\) => map\?\.zoomOut\(\)\}/)
  assert.match(source, /<div[^>]*data-lenis-prevent[^>]*>\s*<style>/)
  // The "no crew online" notice covers the whole map; wheel and drag must pass through it.
  const css = readFileSync(path.join(process.cwd(), 'src/app/acars/acars.module.css'), 'utf8')
  assert.match(css, /\.mapEmpty \{[^}]*pointer-events: none;/)
})

test('Sentra Network describes ACARS in Chief\'s words', () => {
  const source = readFileSync(path.join(process.cwd(), 'src/app/acars/page.tsx'), 'utf8').replace(/\s+/g, ' ')
  assert.match(source, /ACARS — Active Communication and Coordination Radar System, sebuah sistem yang dirancang untuk memfasilitasi kolaborasi klinis internal secara aktif\./)
})

test('the CSP lets the browser fetch OpenFreeMap tiles and start the MapLibre worker', async () => {
  const rules = await nextConfig.headers?.()
  const csp = rules?.flatMap((rule) => rule.headers).find((header) => header.key === 'Content-Security-Policy')?.value ?? ''
  const directive = (name: string) => csp.split(';').map((part) => part.trim().split(/\s+/)).find(([key]) => key === name) ?? []
  assert.ok(directive('connect-src').includes('https://tiles.openfreemap.org'), csp)
  assert.ok(directive('worker-src').includes('blob:'), csp)
})
