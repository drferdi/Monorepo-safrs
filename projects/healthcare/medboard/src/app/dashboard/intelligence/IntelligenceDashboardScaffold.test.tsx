import assert from 'node:assert/strict'
import test from 'node:test'
import { renderToStaticMarkup } from 'react-dom/server'

import type { IntelligenceDashboardAccess } from '@/lib/intelligence/server'

import IntelligenceDashboardScaffold from './IntelligenceDashboardScaffold'

const clinicalAccess: IntelligenceDashboardAccess = {
  canViewAlerts: true,
  canViewEncounters: true,
  canViewInsights: true,
  canViewMetrics: false,
  canSubmitOverride: true,
  hasAnyAccess: true,
}

const managementAccess: IntelligenceDashboardAccess = {
  canViewAlerts: true,
  canViewEncounters: true,
  canViewInsights: false,
  canViewMetrics: true,
  canSubmitOverride: false,
  hasAnyAccess: true,
}

const deniedAccess: IntelligenceDashboardAccess = {
  canViewAlerts: false,
  canViewEncounters: false,
  canViewInsights: false,
  canViewMetrics: false,
  canSubmitOverride: false,
  hasAnyAccess: false,
}

test('renders only clinical surfaces for clinical roles', () => {
  const html = renderToStaticMarkup(
    <IntelligenceDashboardScaffold
      access={clinicalAccess}
      statusContent={<div>Live status slot</div>}
    />
  )

  assert.match(html, /Intelligence Monitor/)
  assert.match(html, /Patient Queue/)
  assert.match(html, /AI Insights/)
  assert.doesNotMatch(html, /<h2[^>]*>Operational Summary<\/h2>/)
  assert.match(html, /bg-card/)
  assert.match(html, /Live status slot/)
  assert.match(html, /Clinical Safety Alert/)
  assert.match(html, /Operational Summary hanya tersedia untuk role manajemen/i)
})

test('renders only management surfaces for management roles', () => {
  const html = renderToStaticMarkup(
    <IntelligenceDashboardScaffold
      access={managementAccess}
      statusContent={<div>Live status slot</div>}
    />
  )

  assert.match(html, /Patient Queue/)
  assert.doesNotMatch(html, /<h2[^>]*>Insights Workspace<\/h2>/)
  assert.match(html, /<h2[^>]*>Operational Summary<\/h2>/)
  assert.match(html, /AI Insights hanya tersedia untuk role klinis/i)
})

test('renders access denied state when the role has no intelligence access', () => {
  const html = renderToStaticMarkup(
    <IntelligenceDashboardScaffold
      access={deniedAccess}
      statusContent={<div>Live status slot</div>}
    />
  )

  assert.match(html, /Akses dashboard dibatasi/)
  assert.doesNotMatch(html, /Patient Queue/)
  assert.doesNotMatch(html, /<h2[^>]*>Insights Workspace<\/h2>/)
  assert.doesNotMatch(html, /<h2[^>]*>Operational Summary<\/h2>/)
})
