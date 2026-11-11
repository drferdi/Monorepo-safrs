import assert from 'node:assert/strict'
import test from 'node:test'
import { renderToStaticMarkup } from 'react-dom/server'

import type { AIInsightsSnapshot } from '@/lib/intelligence/ai-insights'

import { AIInsightsPanelContent } from './AIInsightsPanel'

const baseSnapshot: AIInsightsSnapshot = {
  encounterId: 'enc-001',
  requestId: 'req-001',
  engineVersion: 'iskandar-v2',
  processedAt: '2026-03-13T10:00:00.000Z',
  latencyMs: 280,
  alerts: [],
  suggestions: [
    {
      id: 'J10.1-1',
      engineVersion: 'iskandar-v2',
      confidence: 0.82,
      reasoning: 'Pola gejala konsisten dengan influenza.',
      supportingEvidence: ['Demam', 'Batuk', 'Mialgia'],
      suggestedAt: '2026-03-13T10:00:00.000Z',
      disclosureLabel: 'Saran AI',
      primaryDiagnosis: {
        icd10Code: 'J10.1',
        description: 'Influenza with respiratory manifestations',
        confidence: 0.82,
      },
      differentials: [],
    },
  ],
  validation: {
    valid: true,
    violations: [],
    warnings: [],
    auditTrail: [],
  },
  isIdle: false,
  isDegraded: false,
  degradedMessage: '',
}

test('AIInsightsPanelContent renders disclosure badge and ICD-10 suggestion', () => {
  const markup = renderToStaticMarkup(
    <AIInsightsPanelContent
      snapshot={baseSnapshot}
      onSubmitOverride={async () => undefined}
      overrideState={{}}
    />
  )

  assert.match(markup, /Saran AI/i)
  assert.match(markup, /J10\.1/)
  assert.match(markup, /Terima/i)
})

test('AIInsightsPanelContent renders idle state copy before CDSS events arrive', () => {
  const markup = renderToStaticMarkup(
    <AIInsightsPanelContent
      snapshot={{
        ...baseSnapshot,
        suggestions: [],
        isIdle: true,
        isDegraded: false,
        degradedMessage: '',
      }}
      onSubmitOverride={async () => undefined}
      overrideState={{}}
    />
  )

  assert.match(markup, /Menunggu event CDSS pertama/i)
  assert.match(markup, /Menunggu event CDSS pertama/i)
})

test('AIInsightsPanelContent renders degraded state copy when CDSS is unavailable', () => {
  const markup = renderToStaticMarkup(
    <AIInsightsPanelContent
      snapshot={{
        ...baseSnapshot,
        suggestions: [],
        isIdle: false,
        isDegraded: true,
        degradedMessage: 'CDSS tidak tersedia saat ini. Lanjutkan review klinis manual.',
      }}
      onSubmitOverride={async () => undefined}
      overrideState={{}}
    />
  )

  assert.match(markup, /CDSS tidak tersedia saat ini/i)
  assert.match(markup, /review klinis manual/i)
})
