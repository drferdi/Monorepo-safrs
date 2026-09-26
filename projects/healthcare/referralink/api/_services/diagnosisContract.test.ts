import assert from 'node:assert/strict'

import {
  DIAGNOSIS_RESPONSE_FORMAT,
  DIAGNOSIS_SCHEMA_VERSION,
  InvalidClinicalOutputError,
  isCurrentDiagnosisResult,
  parseDiagnosisOutput,
} from './diagnosisContract.js'

const validOutput = {
  code: 'I21.9',
  description: 'Infark miokard akut, tidak spesifik',
  category: 'Kardiovaskular',
  urgency: 'emergency',
  triage_score: 10,
  clinical_notes: 'Nyeri dada akut dengan gejala otonom memerlukan evaluasi segera.',
  evidence: {
    red_flags: ['Nyeri dada menjalar', 'Keringat dingin', 'Sesak'],
    clinical_reasoning: 'Kombinasi gejala mengarah pada sindrom koroner akut.',
    differential_diagnosis: ['I20.0 Angina tidak stabil'],
  },
  proposed_referrals: [
    {
      code: 'I21.9',
      description: 'Infark miokard akut, tidak spesifik',
      kompetensi: '3B',
      destination_service: 'Instalasi Gawat Darurat dengan layanan kardiovaskular',
      facility_level: 'Rumah sakit rujukan',
      referral_reason: 'Memerlukan reperfusi dan monitoring jantung segera.',
      required_capability: 'EKG serial, biomarker jantung, ICU dan reperfusi',
      urgency: 'emergency',
      clinical_reasoning: 'Red flags sindrom koroner akut membutuhkan tata laksana definitif.',
    },
    {
      code: 'I20.0',
      description: 'Angina tidak stabil',
      kompetensi: '3B',
      destination_service: 'Instalasi Gawat Darurat',
      facility_level: 'Rumah sakit dengan dokter spesialis jantung',
      referral_reason: 'Membutuhkan stratifikasi risiko dan observasi akut.',
      required_capability: 'EKG, troponin dan monitoring jantung',
      urgency: 'urgent',
      clinical_reasoning: 'Angina tidak stabil tidak dapat disingkirkan di layanan primer.',
    },
    {
      code: 'I26.9',
      description: 'Emboli paru tanpa kor pulmonal akut',
      kompetensi: '3A',
      destination_service: 'Instalasi Gawat Darurat',
      facility_level: 'Rumah sakit dengan pencitraan dan layanan penyakit dalam',
      referral_reason: 'Sesak akut memerlukan eksklusi emboli paru.',
      required_capability: 'CT pulmonary angiography dan terapi antikoagulasi',
      urgency: 'urgent',
      clinical_reasoning: 'Diagnosis banding berisiko tinggi memerlukan pemeriksaan lanjutan.',
    },
  ],
}

function expectInvalid(value: unknown, expectedReason: string, finishReason = 'stop') {
  assert.throws(
    () => parseDiagnosisOutput(JSON.stringify(value), finishReason),
    (error: unknown) =>
      error instanceof InvalidClinicalOutputError && error.reason === expectedReason
  )
}

const parsed = parseDiagnosisOutput(JSON.stringify(validOutput), 'stop')
assert.equal(parsed.schema_version, DIAGNOSIS_SCHEMA_VERSION)
assert.equal(parsed.description, 'Acute myocardial infarction, unspecified')
assert.equal(parsed.proposed_referrals?.[0].description, 'Acute myocardial infarction, unspecified')
assert.equal(parsed.proposed_referrals?.length, 3)
assert.equal(
  parsed.proposed_referrals?.[0].destination_service,
  validOutput.proposed_referrals[0].destination_service
)
assert.equal(isCurrentDiagnosisResult(parsed), true)
assert.equal(isCurrentDiagnosisResult(validOutput), false)

const noReferral = parseDiagnosisOutput(
  JSON.stringify({
    ...validOutput,
    code: 'I10',
    urgency: 'routine',
    triage_score: 4,
    evidence: { ...validOutput.evidence, red_flags: [] },
    proposed_referrals: [],
  }),
  'stop'
)
assert.equal(noReferral.code, 'I10')
assert.deepEqual(noReferral.proposed_referrals, [])

const lowRiskNoReferral = parseDiagnosisOutput(
  JSON.stringify({
    ...validOutput,
    code: 'N30.0',
    urgency: 'routine',
    triage_score: 3,
    evidence: { ...validOutput.evidence, red_flags: [] },
    proposed_referrals: [],
  }),
  'stop'
)
assert.equal(lowRiskNoReferral.code, 'N30.0')
assert.deepEqual(lowRiskNoReferral.proposed_referrals, [])
assert.equal(DIAGNOSIS_RESPONSE_FORMAT.json_schema.schema.properties.proposed_referrals.minItems, 0)
expectInvalid({ ...validOutput, proposed_referrals: [] }, 'referral_count')
expectInvalid(
  {
    ...validOutput,
    code: 'I10',
    urgency: 'emergency',
    proposed_referrals: [],
  },
  'referral_count'
)

const allowlisted = parseDiagnosisOutput(
  JSON.stringify({ ...validOutput, injected: 'drop me' }),
  'stop'
)
assert.equal('injected' in allowlisted, false)

assert.throws(
  () => parseDiagnosisOutput('{"code":', 'stop'),
  (error: unknown) => error instanceof InvalidClinicalOutputError && error.reason === 'invalid_json'
)
assert.throws(
  () => parseDiagnosisOutput(JSON.stringify(validOutput), 'length'),
  (error: unknown) => error instanceof InvalidClinicalOutputError && error.reason === 'truncated'
)

const twoReferrals = parseDiagnosisOutput(
  JSON.stringify({
    ...validOutput,
    proposed_referrals: validOutput.proposed_referrals.slice(0, 2),
  }),
  'stop'
)
assert.equal(twoReferrals.proposed_referrals?.length, 2)

const deduplicatedReferrals = parseDiagnosisOutput(
  JSON.stringify({
    ...validOutput,
    proposed_referrals: [
      validOutput.proposed_referrals[0],
      { ...validOutput.proposed_referrals[1], code: validOutput.proposed_referrals[0].code },
      validOutput.proposed_referrals[2],
    ],
  }),
  'stop'
)
assert.deepEqual(
  deduplicatedReferrals.proposed_referrals?.map((item) => item.code),
  ['I21.9', 'I26.9']
)
expectInvalid(
  {
    ...validOutput,
    proposed_referrals: [
      { ...validOutput.proposed_referrals[0], code: 'I10' },
      validOutput.proposed_referrals[1],
      validOutput.proposed_referrals[2],
    ],
  },
  'blacklisted_code'
)
for (const code of ['L20.9', 'M79.10', 'M79.19', 'A09.9']) {
  expectInvalid(
    {
      ...validOutput,
      proposed_referrals: [
        { ...validOutput.proposed_referrals[0], code },
        validOutput.proposed_referrals[1],
        validOutput.proposed_referrals[2],
      ],
    },
    'blacklisted_code'
  )
}
expectInvalid({ ...validOutput, code: 'Z99.999' }, 'invalid_icd_code')
expectInvalid({ ...validOutput, code: 'I21.ZZ' }, 'invalid_icd_code')
expectInvalid(
  {
    ...validOutput,
    code: 'I21.9',
    urgency: 'routine',
    triage_score: 1,
    evidence: { ...validOutput.evidence, red_flags: [] },
    proposed_referrals: [],
  },
  'referral_count'
)
const normalizedPrimary = parseDiagnosisOutput(
  JSON.stringify({ ...validOutput, code: 'I16.0' }),
  'stop'
)
assert.equal(normalizedPrimary.code, 'I10')

const normalizedReferral = parseDiagnosisOutput(
  JSON.stringify({
    ...validOutput,
    proposed_referrals: [
      { ...validOutput.proposed_referrals[0], code: 'I77.7' },
      validOutput.proposed_referrals[1],
      validOutput.proposed_referrals[2],
    ],
  }),
  'stop'
)
assert.equal(normalizedReferral.proposed_referrals?.[0].code, 'I77')
assert.throws(
  () =>
    parseDiagnosisOutput(
      JSON.stringify({ ...validOutput, code: 'INVALID-CODE-WITH-UNTRUSTED-TEXT' }),
      'stop'
    ),
  (error: unknown) =>
    error instanceof InvalidClinicalOutputError &&
    error.reason === 'invalid_icd_code' &&
    error.rejectedCode === undefined
)
expectInvalid({ ...validOutput, urgency: 'critical' }, 'invalid_primary')
expectInvalid({ ...validOutput, triage_score: 11 }, 'invalid_triage')
expectInvalid(
  {
    ...validOutput,
    proposed_referrals: [
      { ...validOutput.proposed_referrals[0], destination_service: '' },
      validOutput.proposed_referrals[1],
      validOutput.proposed_referrals[2],
    ],
  },
  'invalid_referral'
)

console.log('diagnosis structured-output contract tests passed')
