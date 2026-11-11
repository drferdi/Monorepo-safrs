import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'

import type { ICD10Result } from '../../types.js'

import {
  CLINICAL_REASONING_STAGES,
  buildClinicalReasoningStages,
  getClinicalReasoningStageStatus,
  getNextClinicalReasoningStage,
  getVisibleResultStageCount,
} from './clinical-reasoning-stream-state.js'

const validatedResult: ICD10Result = {
  schema_version: 2,
  code: 'I24.9',
  description: 'Acute ischemic heart disease, unspecified',
  category: 'Circulatory system disease',
  urgency: 'urgent',
  triage_score: 8,
  clinical_notes: 'Validated result is ready for clinician review.',
  evidence: {
    clinical_reasoning: 'Acute chest pain requires urgent assessment.',
    red_flags: ['Acute chest pain'],
    differential_diagnosis: ['Pulmonary embolism'],
  },
  proposed_referrals: [
    {
      code: 'I24.9',
      description: 'Acute ischemic heart disease, unspecified',
      kompetensi: '3B',
      destination_service: 'Cardiology',
      facility_level: 'Hospital',
      referral_reason: 'Urgent specialist assessment',
      required_capability: 'ECG and cardiac biomarkers',
      urgency: 'urgent',
      clinical_reasoning: 'Escalate for acute chest pain assessment.',
    },
  ],
}

assert.deepEqual(
  CLINICAL_REASONING_STAGES.map((stage) => stage.title),
  [
    'Konteks klinis diterima',
    'Temuan utama disusun',
    'Sinyal keselamatan diperiksa',
    'Pola klinis dicocokkan',
    'Kandidat diagnosis diprioritaskan',
  ]
)
assert.deepEqual(
  CLINICAL_REASONING_STAGES.map((_, index) => getClinicalReasoningStageStatus(index, 1, 'loading')),
  ['completed', 'active', 'pending', 'pending', 'pending']
)
assert.deepEqual(
  CLINICAL_REASONING_STAGES.map((_, index) => getClinicalReasoningStageStatus(index, 1, 'error')),
  ['completed', 'interrupted', 'pending', 'pending', 'pending']
)
assert.deepEqual(
  CLINICAL_REASONING_STAGES.map((_, index) => getClinicalReasoningStageStatus(index, 0, 'idle')),
  ['pending', 'pending', 'pending', 'pending', 'pending']
)
assert.deepEqual(
  CLINICAL_REASONING_STAGES.map((_, index) => getClinicalReasoningStageStatus(index, 3, 'success')),
  ['completed', 'completed', 'completed', 'completed', 'completed']
)
assert.deepEqual(
  buildClinicalReasoningStages('success', validatedResult)
    .filter((stage) => stage.kind === 'result')
    .map((stage) => stage.title),
  ['Diagnosis banding', 'Analisis rujukan', 'Pemetaan ICD-10']
)
assert.deepEqual(
  buildClinicalReasoningStages('success', validatedResult)
    .filter((stage) => stage.kind === 'summary')
    .map((stage) => stage.title),
  ['Ringkasan tinjauan klinis']
)
assert.match(JSON.stringify(buildClinicalReasoningStages('success', validatedResult)), /I24\.9/)
assert.match(JSON.stringify(buildClinicalReasoningStages('success', validatedResult)), /Cardiology/)
assert.doesNotMatch(
  JSON.stringify(buildClinicalReasoningStages('loading', null)),
  /I24\.9|Cardiology|Pulmonary embolism/
)
assert.deepEqual(
  buildClinicalReasoningStages('success', {
    schema_version: 2,
    code: 'R69',
    description: 'Illness, unspecified',
    category: 'Symptoms and signs',
    urgency: 'routine',
    triage_score: 1,
    clinical_notes: 'Validated result is ready for clinician review.',
    evidence: {
      clinical_reasoning: 'No additional reasoning was returned.',
      red_flags: [],
      differential_diagnosis: [],
    },
    proposed_referrals: [],
  })
    .filter((stage) => stage.kind === 'result')
    .map((stage) => stage.description),
  [
    'Tidak ada diagnosis banding tambahan yang dikembalikan.',
    'Tidak ada opsi rujukan tambahan yang dikembalikan.',
    'R69 · Illness, unspecified',
  ]
)
assert.equal(getNextClinicalReasoningStage(0), 1)
assert.equal(getNextClinicalReasoningStage(3), 4)
assert.equal(getNextClinicalReasoningStage(4), 4)
assert.equal(getVisibleResultStageCount(0, 4), 1)
assert.equal(getVisibleResultStageCount(3, 4), 4)
assert.equal(getVisibleResultStageCount(4, 4), 4)
assert.deepEqual(
  buildClinicalReasoningStages('idle', null).map((stage) => stage.kind),
  ['neutral', 'neutral', 'neutral', 'neutral', 'neutral']
)
assert.deepEqual(
  buildClinicalReasoningStages('loading', null).map((stage) => stage.kind),
  ['neutral', 'neutral', 'neutral', 'neutral', 'neutral']
)
assert.deepEqual(
  buildClinicalReasoningStages('error', null).map((stage) => stage.kind),
  ['neutral', 'neutral', 'neutral', 'neutral', 'neutral']
)
assert.deepEqual(
  buildClinicalReasoningStages('success', validatedResult).map((stage) => stage.kind),
  ['neutral', 'neutral', 'neutral', 'neutral', 'neutral', 'result', 'result', 'result', 'summary']
)
assert.deepEqual(
  buildClinicalReasoningStages('success', validatedResult).map((stage) => stage.id),
  ['received', 'findings', 'safety', 'patterns', 'prioritized', 'differential', 'referral', 'icd10', 'final']
)
assert.doesNotMatch(
  JSON.stringify(CLINICAL_REASONING_STAGES),
  /confirmed|probability|differential #|ICD-10 [A-Z]\d/i
)

const componentSource = readFileSync(
  new URL('./clinical-reasoning-stream.tsx', import.meta.url),
  'utf8'
)
assert.match(componentSource, /role="status"/)
assert.match(componentSource, /aria-live="polite"/)
assert.match(
  componentSource,
  /className="cds--visually-hidden"\s+role="status"\s+aria-live="polite"/
)
assert.match(
  componentSource,
  /className="medlink-reasoning-stream__stages"\s+aria-label="Tahapan analisis klinis"\s+tabIndex={0}/
)
assert.doesNotMatch(componentSource, /className={`medlink-reasoning-stream[^`]+`}\s+role="status"/)
assert.match(componentSource, /clearTimeout/)
assert.match(componentSource, /phase: ClinicalReasoningPhase/)
assert.match(componentSource, /result: ICD10Result \| null/)
assert.match(componentSource, /buildClinicalReasoningStages\(phase, result\)/)
assert.match(componentSource, /setVisibleResultStages\(0\)/)
assert.match(componentSource, /RESULT_STAGE_INTERVAL_MS/)
assert.match(componentSource, /medlink-reasoning-stage--\$\{stage\.kind\}/)
assert.match(componentSource, /const summaryStage = stages\.find\(\(stage\) => stage\.kind === 'summary'\)/)
assert.match(componentSource, /className="medlink-reasoning-summary"/)
assert.match(componentSource, /aria-labelledby="medlink-reasoning-summary-title"/)
assert.match(componentSource, /id="medlink-reasoning-summary-title"/)
assert.match(componentSource, /<h3[^>]*>\{summaryStage\.title\}<\/h3>/)
assert.match(componentSource, /<p>\{summaryStage\.description\}<\/p>/)
const closingStagesIndex = componentSource.indexOf('</ol>')
const summaryIndex = componentSource.indexOf('medlink-reasoning-summary')
assert.ok(closingStagesIndex >= 0)
assert.ok(summaryIndex > closingStagesIndex)
assert.match(componentSource, /phase === 'success'/)
assert.match(componentSource, /phase === 'error'/)

console.log('clinical reasoning stream state tests passed')
