import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import path from 'node:path'
import test from 'node:test'

const read = (relative: string): string => readFileSync(path.join(process.cwd(), relative), 'utf8')
const page = read('src/app/telemedicine/page.tsx')

test('MedLink opens on a studio green room, then the work in tabs, in order (Chief 2026-10-07: "ala Meet", "studio")', () => {
  assert.match(page, /<MedLinkStudio\b/)
  assert.ok(page.indexOf('<MedLinkStudio') < page.indexOf('role="tablist"'))
  const tabs = page.slice(page.indexOf('const TABS'), page.indexOf('] as const'))
  assert.deepEqual([...tabs.matchAll(/label: '([^']+)'/g)].map((m) => m[1]), ['Permintaan', 'Jadwal', 'Konsultasi', 'Riwayat'])
  assert.match(page, /aria-selected=\{tab === item\.id\}/)
})

test('the repeated counters, the command desk, the developer pathway and the credit line are gone', () => {
  for (const gone of ['OverviewMetric', 'PatientFlowDiagram', 'Clinical Command Desk', 'Pathway Pasien', 'Command desk', 'Video SDK', 'RFC 4566', 'onMouseEnter']) {
    assert.ok(!page.includes(gone), gone)
  }
})

test('every working part stays: online switch, requests, booking, video room, Assist consult and EMR transfer', () => {
  for (const kept of [
    "'/api/telemedicine/doctor-status'",
    '/api/telemedicine/request/${id}/handled',
    "method: 'DELETE'",
    '<AppointmentBooking',
    'router.push(`/telemedicine/${',
    'Ambil kasus',
    "'/api/consult/transfer-to-emr'",
    "socket.on('telemedicine:new-request'",
    "socket.on('assist:consult'",
  ]) {
    assert.ok(page.includes(kept), kept)
  }
})

test('the studio: camera preview, device pickers, mic meter, speaker tone, connection, joined by a connector', () => {
  const studio = read('src/app/telemedicine/MedLinkStudio.tsx')
  assert.match(studio, /<video\b/)
  assert.match(studio, /enumerateDevices\(\)/)
  assert.match(studio, /deviceId: \{ exact: /)
  for (const label of ['Kamera', 'Mikrofon', 'Speaker', 'Koneksi']) assert.ok(studio.includes(`>${label}<`), label)
  // Mic and camera can be muted from the preview, and are released when the page is left.
  assert.match(studio, /track\.enabled = /)
  assert.match(studio, /getTracks\(\)\.forEach\(track => track\.stop\(\)\)/)
  // The online switch lives in the studio.
  assert.match(studio, /onToggleOnline/)
  const css = read('src/app/telemedicine/telemedicine.module.css')
  assert.match(css, /\.studio \{[^}]*border: 1px solid var\(--border\)/)
  assert.match(css, /\.check::before \{[^}]*width: 1px/)
  assert.doesNotMatch(studio, /type:\s*'spring'|bounce:/)
})
