import assert from 'node:assert/strict'
import test from 'node:test'

import type { IntelligenceEventPayload } from '@/lib/intelligence/types'

import { buildAIInsightsSnapshot } from './ai-insights'

function createSuggestionEvent(
  overrides: Partial<IntelligenceEventPayload['data']> = {}
): IntelligenceEventPayload {
  return {
    encounterId: 'enc-001',
    status: 'in_consultation',
    timestamp: '2026-03-13T10:00:00.000Z',
    data: {
      requestId: 'req-001',
      engineVersion: 'iskandar-v2',
      processedAt: '2026-03-13T10:00:00.000Z',
      latencyMs: 280,
      suggestions: [
        {
          engineVersion: 'iskandar-v2',
          confidence: 0.08,
          reasoning: 'Confidence terlalu rendah untuk ditampilkan.',
          supportingEvidence: ['Demam ringan'],
          differentialDiagnoses: [
            {
              icd10Code: 'A09',
              description: 'Infectious gastroenteritis',
              confidence: 0.08,
            },
          ],
          suggestedAt: '2026-03-13T10:00:00.000Z',
        },
        {
          engineVersion: 'iskandar-v2',
          confidence: 0.82,
          reasoning: 'Gejala dominan konsisten dengan influenza.',
          supportingEvidence: ['Demam', 'Batuk', 'Mialgia'],
          differentialDiagnoses: [
            {
              icd10Code: 'J10.1',
              description: 'Influenza with respiratory manifestations',
              confidence: 0.82,
            },
            {
              icd10Code: 'J11.1',
              description: 'Influenza, virus not identified',
              confidence: 0.41,
            },
          ],
          suggestedAt: '2026-03-13T10:00:00.000Z',
        },
      ],
      alerts: [
        {
          id: 'alert-001',
          type: 'guideline',
          severity: 'warning',
          message: 'Verifikasi saturasi oksigen bila batuk memberat.',
          source: 'iskandar',
          actionRequired: true,
        },
      ],
      ...overrides,
    },
  }
}

test('buildAIInsightsSnapshot filters blocked confidence suggestions and keeps disclosure label', () => {
  const snapshot = buildAIInsightsSnapshot(createSuggestionEvent())

  assert.equal(snapshot.isIdle, false)
  assert.equal(snapshot.isDegraded, false)
  assert.equal(snapshot.suggestions.length, 1)
  assert.equal(snapshot.suggestions[0]?.primaryDiagnosis.icd10Code, 'J10.1')
  assert.equal(snapshot.suggestions[0]?.disclosureLabel, 'Saran AI')
  assert.equal(snapshot.validation.violations[0]?.code, 'GR-OUTPUT-002')
})

test('buildAIInsightsSnapshot returns idle state when no CDSS event has arrived yet', () => {
  const snapshot = buildAIInsightsSnapshot(null)

  assert.equal(snapshot.isIdle, true)
  assert.equal(snapshot.isDegraded, false)
  assert.equal(snapshot.suggestions.length, 0)
  assert.equal(snapshot.degradedMessage, '')
})

test('buildAIInsightsSnapshot returns degraded state when CDSS is unavailable', () => {
  const snapshot = buildAIInsightsSnapshot(
    createSuggestionEvent({
      unavailable: true,
      unavailableReason: 'engine_timeout',
      suggestions: [],
      alerts: [],
    })
  )

  assert.equal(snapshot.isIdle, false)
  assert.equal(snapshot.isDegraded, true)
  assert.match(snapshot.degradedMessage, /cdss.*tidak tersedia/i)
  assert.equal(snapshot.suggestions.length, 0)
})

test('buildAIInsightsSnapshot degrades when all suggestions are blocked by guardrails', () => {
  const snapshot = buildAIInsightsSnapshot(
    createSuggestionEvent({
      suggestions: [
        {
          engineVersion: 'iskandar-v2',
          confidence: 0.09,
          reasoning: 'Semua opsi masih terlalu lemah.',
          supportingEvidence: ['Keluhan belum lengkap'],
          differentialDiagnoses: [
            {
              icd10Code: 'R69',
              description: 'Illness, unspecified',
              confidence: 0.09,
            },
          ],
          suggestedAt: '2026-03-13T10:00:00.000Z',
        },
      ],
    })
  )

  assert.equal(snapshot.isIdle, false)
  assert.equal(snapshot.isDegraded, true)
  assert.match(snapshot.degradedMessage, /guardrail/i)
  assert.equal(snapshot.validation.violations[0]?.code, 'GR-OUTPUT-002')
})

test('buildAIInsightsSnapshot keeps alerts visible when assist only emits degraded CDSS payload', () => {
  const snapshot = buildAIInsightsSnapshot(
    createSuggestionEvent({
      engineVersion: 'assist-screening-v1',
      suggestions: [],
      alerts: [
        {
          id: 'assist-alert-001',
          type: 'guideline',
          severity: 'critical',
          message: 'Risiko tinggi terdeteksi dari screening Assist. Review klinis segera.',
          source: 'assist-screening',
          actionRequired: true,
        },
      ],
    })
  )

  assert.equal(snapshot.isIdle, false)
  assert.equal(snapshot.isDegraded, true)
  assert.equal(snapshot.alerts.length, 1)
  assert.match(snapshot.alerts[0]?.message ?? '', /screening Assist/i)
  assert.match(snapshot.degradedMessage, /belum menghasilkan suggestion/i)
})

test('buildAIInsightsSnapshot renders real diagnosis payload from consult CDSS bridge', () => {
  const snapshot = buildAIInsightsSnapshot(
    createSuggestionEvent({
      engineVersion: 'IDE-V2 (deterministic local fallback)',
      suggestions: [
        {
          engineVersion: 'IDE-V2 (deterministic local fallback)',
          confidence: 0.76,
          reasoning: 'Gejala demam, batuk, dan nyeri tenggorok paling konsisten dengan ISPA atas.',
          supportingEvidence: ['Demam', 'Batuk', 'Nyeri tenggorok'],
          differentialDiagnoses: [
            {
              icd10Code: 'J06.9',
              description: 'Infeksi saluran napas atas akut, tidak spesifik',
              confidence: 0.76,
            },
            {
              icd10Code: 'J02.9',
              description: 'Faringitis akut, tidak spesifik',
              confidence: 0.41,
            },
          ],
          suggestedAt: '2026-03-13T10:00:00.000Z',
        },
      ],
      alerts: [
        {
          id: 'iskandar-alert-001',
          type: 'critical_value',
          severity: 'warning',
          message: 'Takipnea Berat: RR 32 x/mnt > 30. Tindak lanjut: evaluasi distress napas.',
          source: 'iskandar',
          actionRequired: true,
        },
      ],
    })
  )

  assert.equal(snapshot.isIdle, false)
  assert.equal(snapshot.isDegraded, false)
  assert.equal(snapshot.suggestions.length, 1)
  assert.equal(snapshot.suggestions[0]?.primaryDiagnosis.icd10Code, 'J06.9')
  assert.equal(snapshot.alerts[0]?.type, 'critical_value')
  assert.match(snapshot.suggestions[0]?.reasoning ?? '', /ISPA atas/i)
})

test('buildAIInsightsSnapshot renders raw engine payload nested in consult response wrapper', () => {
  const snapshot = buildAIInsightsSnapshot(
    createSuggestionEvent({
      response: {
        data: {
          requestId: 'req-raw-engine',
          engineVersion: 'IDE-V2 (deterministic local fallback)',
          processedAt: '2026-03-13T10:01:00.000Z',
          latencyMs: 198,
          diagnosis_suggestions: [
            {
              rank: 1,
              icd10_code: 'J06.9',
              diagnosis_name: 'Infeksi saluran napas atas akut, tidak spesifik',
              confidence: 0.78,
              rationale: 'Demam, batuk, dan nyeri tenggorok paling konsisten dengan ISPA atas.',
              red_flags: ['Waspadai sesak napas bila memburuk'],
            },
          ],
          alerts: [],
        },
      },
    })
  )

  assert.equal(snapshot.isIdle, false)
  assert.equal(snapshot.isDegraded, false)
  assert.equal(snapshot.suggestions.length, 1)
  assert.equal(snapshot.suggestions[0]?.primaryDiagnosis.icd10Code, 'J06.9')
  assert.match(
    snapshot.suggestions[0]?.primaryDiagnosis.description ?? '',
    /saluran napas atas/i
  )
  assert.match(snapshot.suggestions[0]?.reasoning ?? '', /konsisten dengan ISPA atas/i)
})
