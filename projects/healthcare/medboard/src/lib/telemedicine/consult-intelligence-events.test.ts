import assert from 'node:assert/strict'
import test from 'node:test'

import type { IntelligenceEventPayload } from '@/lib/intelligence/types'

import { emitIntelligenceConsultEvents, toMiraDashboardSuggestion } from './consult-intelligence-events'

type EmittedEvent = { event: string; payload: IntelligenceEventPayload }

// socket-bridge reads the namespace from this global key; a stub with `emit` captures events.
function captureIntelligenceEvents(): EmittedEvent[] {
  const emitted: EmittedEvent[] = []
  Reflect.set(globalThis, '__sentra_intelligence_ns__', {
    emit: (event: string, payload: IntelligenceEventPayload) => {
      emitted.push({ event, payload })
    },
  })
  return emitted
}

// Shape Med-Assist sends in canonical_clinical.trajectory (bridge-client.ts ConsultPayload).
const assistTrajectory = {
  overall_trend: 'declining',
  overall_risk: 'high',
  deterioration_state: 'deteriorating',
  narrative: 'Tekanan darah turun pada tiga kunjungan terakhir.',
}

test('a critical Assist consult does not show the trajectory risk as momentum or the deterioration state as convergence', () => {
  const emitted = captureIntelligenceEvents()

  emitIntelligenceConsultEvents({
    consultId: 'consult-test-0001',
    keluhanUtama: 'Lemas',
    receivedAt: '2026-10-04T00:00:00.000Z',
    screeningResult: { risk_level: 'critical', summary: 'Risiko kritis' },
    diagnosisResponse: null,
    canonicalClinical: { trajectory: assistTrajectory },
  })

  const alert = emitted.find(({ event }) => event === 'alert:critical')
  assert.ok(alert, 'a critical consult must emit alert:critical')
  assert.equal(alert.payload.data.momentumLevel, undefined)
  assert.equal(alert.payload.data.convergencePattern, undefined)
})

test('the Assist trajectory narrative still reaches the dashboard as a CDSS alert', () => {
  const emitted = captureIntelligenceEvents()

  emitIntelligenceConsultEvents({
    consultId: 'consult-test-0002',
    keluhanUtama: 'Lemas',
    receivedAt: '2026-10-04T00:00:00.000Z',
    screeningResult: { risk_level: 'high', summary: 'Risiko tinggi' },
    diagnosisResponse: null,
    canonicalClinical: { trajectory: assistTrajectory },
  })

  const suggestion = emitted.find(({ event }) => event === 'cdss:suggestion-ready')
  assert.ok(suggestion, 'an Assist consult with a trajectory must emit cdss:suggestion-ready')
  assert.match(JSON.stringify(suggestion.payload.data), /Tekanan darah turun pada tiga kunjungan terakhir/)
})

const MIRA = {
  engine: 'MIRA' as const,
  generated_at: '2026-10-04T00:00:00.000Z',
  items: [
    { rank: 1, icd10: 'J18.9', nama: 'Pneumonia', confidence: 0.7, cannot_miss: false, rationale: 'Demam; ronki' },
    { rank: 2, icd10: 'I26.9', nama: 'Emboli paru', confidence: 0.2, cannot_miss: true, rationale: 'Takikardia' },
  ],
  next_best_actions: [{ kind: 'exam' as const, item: 'Auskultasi paru', reason: 'Cari ronki fokal' }],
  missing_information: ['Riwayat perjalanan'],
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

test('the MIRA differential maps to one dashboard suggestion with every item and its flags', () => {
  assert.deepEqual(toMiraDashboardSuggestion(MIRA), {
    engineVersion: 'MIRA',
    confidence: 0.7,
    reasoning: 'Diferensial MIRA dari Assist (dihasilkan 2026-10-04T00:00:00.000Z).',
    supportingEvidence: [
      'Pemeriksaan: Auskultasi paru — Cari ronki fokal',
      'Data yang belum ada: Riwayat perjalanan',
    ],
    differentialDiagnoses: [
      { icd10Code: 'J18.9', description: 'Pneumonia — Demam; ronki', confidence: 0.7 },
      { icd10Code: 'I26.9', description: 'Emboli paru (jangan terlewat) — Takikardia', confidence: 0.2 },
    ],
    suggestedAt: '2026-10-04T00:00:00.000Z',
  })
})

test('with the engine retired, the MIRA differential reaches the dashboard as MIRA output', () => {
  const emitted = captureIntelligenceEvents()

  emitIntelligenceConsultEvents({
    consultId: 'consult-test-0003',
    keluhanUtama: 'Demam dan batuk',
    receivedAt: '2026-10-04T00:00:00.000Z',
    diagnosisResponse: null,
    miraDifferential: MIRA,
  })

  const ready = emitted.find(({ event }) => event === 'cdss:suggestion-ready')
  assert.ok(ready, 'a consult with a MIRA differential must emit cdss:suggestion-ready')
  assert.equal(ready.payload.data.source, 'mira')
  const response = ready.payload.data.response
  assert.ok(isRecord(response))
  assert.equal(response.engineVersion, 'MIRA')
  assert.deepEqual(response.suggestions, [toMiraDashboardSuggestion(MIRA)])
})
