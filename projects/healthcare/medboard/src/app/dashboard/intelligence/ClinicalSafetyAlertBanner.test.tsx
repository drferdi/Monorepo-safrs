import assert from 'node:assert/strict'
import test from 'node:test'
import { renderToStaticMarkup } from 'react-dom/server'

import { ClinicalSafetyAlertBannerView } from './ClinicalSafetyAlertBanner'

const noop = (): void => undefined

const makeAlert = (
  message?: unknown,
  status:
    | 'in_consultation'
    | 'cdss_pending'
    | 'documentation_incomplete'
    | 'waiting'
    | 'completed' = 'in_consultation'
) => ({
  encounterId: 'enc-critical-001',
  status,
  timestamp: '2026-03-13T10:00:00.000Z',
  data: { message },
})

// ── AC-005: Quiescent state ────────────────────────────────────────────────────

test('renders quiescent banner when no active alert', () => {
  const html = renderToStaticMarkup(
    <ClinicalSafetyAlertBannerView
      activeAlert={null}
      isAcknowledged={false}
      acknowledgedAt={null}
      onAcknowledge={noop}
    />
  )

  assert.match(html, /Belum ada alert kritis aktif/)
  assert.match(html, /Cross-panel visibility aktif/)
  assert.doesNotMatch(html, /role="alert"/)
})

// ── AC-005: Active alert — ARIA + visibility ───────────────────────────────────

test('renders active alert with assertive ARIA attributes', () => {
  const html = renderToStaticMarkup(
    <ClinicalSafetyAlertBannerView
      activeAlert={makeAlert('Tekanan darah kritis terdeteksi')}
      isAcknowledged={false}
      acknowledgedAt={null}
      onAcknowledge={noop}
    />
  )

  assert.match(html, /role="alert"/)
  assert.match(html, /aria-live="assertive"/)
  assert.match(html, /aria-atomic="true"/)
  assert.match(html, /aria-hidden="true"/)
  assert.match(html, /enc-critical-001/)
  assert.match(html, /Tekanan darah kritis terdeteksi/)
  assert.match(html, /Acknowledge/)
  assert.match(html, /Clinical Safety Alert — Kritis/)
})

// ── Fallback message ──────────────────────────────────────────────────────────

test('uses fallback message when data.message is not a string', () => {
  const html = renderToStaticMarkup(
    <ClinicalSafetyAlertBannerView
      activeAlert={makeAlert(42)}
      isAcknowledged={false}
      acknowledgedAt={null}
      onAcknowledge={noop}
    />
  )

  assert.match(html, /Alert kritis diterima\. Tindak lanjut segera\./)
})

// ── AC-005: Acknowledged state ─────────────────────────────────────────────────

test('renders acknowledged banner with polite ARIA after acknowledgment', () => {
  const html = renderToStaticMarkup(
    <ClinicalSafetyAlertBannerView
      activeAlert={makeAlert('Alert')}
      isAcknowledged={true}
      acknowledgedAt="2026-03-13T10:05:00.000Z"
      onAcknowledge={noop}
    />
  )

  assert.match(html, /role="status"/)
  assert.match(html, /aria-live="polite"/)
  assert.match(html, /di-acknowledge/)
  assert.doesNotMatch(html, /role="alert"/)
  assert.doesNotMatch(html, /Acknowledge/)
})
