import assert from 'node:assert/strict'

import { InvalidClinicalOutputError } from './diagnosisContract.js'
import {
  DiagnosisDeadlineExceededError,
  generateValidatedDiagnosis,
} from './diagnosisGeneration.js'

const validJson = JSON.stringify({
  code: 'I21.9',
  description: 'Infark miokard akut',
  category: 'Kardiovaskular',
  urgency: 'emergency',
  triage_score: 10,
  clinical_notes: 'Memerlukan evaluasi segera.',
  evidence: {
    red_flags: ['Nyeri dada', 'Sesak'],
    clinical_reasoning: 'Sindrom koroner akut perlu disingkirkan.',
    differential_diagnosis: ['I20.0 Angina tidak stabil'],
  },
  proposed_referrals: [
    {
      code: 'I21.9',
      description: 'Infark miokard akut',
      kompetensi: '3B',
      destination_service: 'Instalasi Gawat Darurat',
      facility_level: 'Rumah sakit rujukan',
      referral_reason: 'Memerlukan reperfusi segera.',
      required_capability: 'EKG, biomarker jantung dan reperfusi',
      urgency: 'emergency',
      clinical_reasoning: 'Red flags memerlukan tata laksana definitif.',
    },
    {
      code: 'I20.0',
      description: 'Angina tidak stabil',
      kompetensi: '3B',
      destination_service: 'Instalasi Gawat Darurat',
      facility_level: 'Rumah sakit dengan spesialis jantung',
      referral_reason: 'Memerlukan stratifikasi risiko.',
      required_capability: 'EKG serial dan troponin',
      urgency: 'urgent',
      clinical_reasoning: 'Risiko koroner akut belum tersingkirkan.',
    },
    {
      code: 'I26.9',
      description: 'Emboli paru',
      kompetensi: '3A',
      destination_service: 'Instalasi Gawat Darurat',
      facility_level: 'Rumah sakit dengan pencitraan',
      referral_reason: 'Sesak akut memerlukan pemeriksaan lanjutan.',
      required_capability: 'CT pulmonary angiography',
      urgency: 'urgent',
      clinical_reasoning: 'Diagnosis banding berisiko tinggi.',
    },
  ],
})

let attempts = 0
const firstAttempt = await generateValidatedDiagnosis('kasus sintetis', async (request) => {
  attempts += 1
  assert.equal(request.attempt, 1)
  assert.equal(request.isRetry, false)
  return { content: validJson, finishReason: 'stop' }
})
assert.equal(firstAttempt.code, 'I21.9')
assert.equal(attempts, 1)

attempts = 0
const recovered = await generateValidatedDiagnosis('kasus sintetis', async (request) => {
  attempts += 1
  if (request.attempt === 1) return { content: '{"code":', finishReason: 'stop' }
  assert.equal(request.isRetry, true)
  return { content: validJson, finishReason: 'stop' }
})
assert.equal(recovered.proposed_referrals?.length, 3)
assert.equal(attempts, 2)

attempts = 0
const normalizedClinicalOutput = await generateValidatedDiagnosis(
  'kasus sintetis',
  async (request) => {
    attempts += 1
    assert.equal(request.attempt, 1)
    return {
      content: JSON.stringify({ ...JSON.parse(validJson), code: 'I16.0' }),
      finishReason: 'stop',
    }
  }
)
assert.equal(normalizedClinicalOutput.code, 'I10')
assert.equal(attempts, 1)

attempts = 0
await assert.rejects(
  () =>
    generateValidatedDiagnosis('kasus sintetis', async () => {
      attempts += 1
      return { content: '{"code":', finishReason: 'stop' }
    }),
  (error: unknown) => error instanceof InvalidClinicalOutputError
)
assert.equal(attempts, 2)

attempts = 0
const providerError = new Error('provider unavailable')
await assert.rejects(
  () =>
    generateValidatedDiagnosis('kasus sintetis', async () => {
      attempts += 1
      throw providerError
    }),
  providerError
)
assert.equal(attempts, 1)

let now = 1_000
const timedResult = await generateValidatedDiagnosis(
  'kasus sintetis',
  async (request) => {
    if (request.attempt === 1) {
      assert.equal(request.timeoutMs, 6_000)
      now = 5_000
      return { content: '{"code":', finishReason: 'stop' }
    }
    assert.equal(request.timeoutMs, 2_000)
    return { content: validJson, finishReason: 'stop' }
  },
  undefined,
  { deadlineMs: 6_000, now: () => now }
)
assert.equal(timedResult.code, 'I21.9')

now = 1_000
let deadlineAttempts = 0
await assert.rejects(
  () =>
    generateValidatedDiagnosis(
      'kasus sintetis',
      async () => {
        deadlineAttempts += 1
        now = 7_001
        return { content: '{"code":', finishReason: 'stop' }
      },
      undefined,
      { deadlineMs: 6_000, now: () => now }
    ),
  (error: unknown) => error instanceof DiagnosisDeadlineExceededError
)
assert.equal(deadlineAttempts, 1)

const slowCompletionStartedAt = Date.now()
await assert.rejects(
  () =>
    generateValidatedDiagnosis(
      'kasus sintetis',
      async () => {
        await new Promise((resolve) => setTimeout(resolve, 25))
        return { content: validJson, finishReason: 'stop' }
      },
      undefined,
      { deadlineMs: 5 }
    ),
  (error: unknown) => error instanceof DiagnosisDeadlineExceededError
)
assert.ok(Date.now() - slowCompletionStartedAt < 100)

const sdkTimeout = new Error('request timed out')
sdkTimeout.name = 'APIConnectionTimeoutError'
await assert.rejects(
  () =>
    generateValidatedDiagnosis('kasus sintetis', async () => {
      throw sdkTimeout
    }),
  (error: unknown) => error instanceof DiagnosisDeadlineExceededError
)

console.log('diagnosis bounded-generation tests passed')
