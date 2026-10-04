import assert from 'node:assert/strict'
import test from 'node:test'

import type { IntelligenceEventPayload } from '@/lib/intelligence/types'

import { emitIntelligenceConsultEvents } from './consult-intelligence-events'

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
