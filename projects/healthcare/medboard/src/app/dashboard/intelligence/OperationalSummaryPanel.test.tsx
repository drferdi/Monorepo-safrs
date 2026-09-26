import assert from 'node:assert/strict'
import test from 'node:test'
import type { DashboardOperationalMetrics } from '@abyss/types'
import { renderToStaticMarkup } from 'react-dom/server'

import { OperationalSummaryPanelContent } from './OperationalSummaryPanel'

const metrics: DashboardOperationalMetrics = {
  shiftLabel: 'Shift Operasional',
  totalEncounters: 8,
  encountersByStatus: {
    waiting: 1,
    in_consultation: 2,
    cdss_pending: 1,
    documentation_incomplete: 1,
    completed: 3,
  },
  cdssUtilizationRate: 0.5,
  eklaimReadinessRate: 0.625,
  averageConfidenceScore: 0.81,
  overrideCount: 2,
  overrideRate: 0.25,
  generatedAt: '2026-03-13T10:00:00.000Z',
}

test('OperationalSummaryPanelContent renders API-backed metrics cards', () => {
  const markup = renderToStaticMarkup(<OperationalSummaryPanelContent metrics={metrics} />)

  assert.match(markup, /Encounter Aktif/)
  assert.match(markup, />8</)
  assert.match(markup, /50%/)
  assert.match(markup, /63%/)
  assert.match(markup, /0\.81/)
  assert.match(markup, /Override rate 25%/)
})
