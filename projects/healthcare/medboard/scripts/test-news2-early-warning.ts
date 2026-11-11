/**
 * NEWS2 & Early Warning Pattern Tests
 *
 * Tests:
 * - NEWS2 composite scoring for all vital sign parameters
 * - Risk level stratification
 * - Disease-specific early warning pattern detection
 * - Clinical scenario validation (DHF, sepsis, ACS, respiratory, hemorrhagic, preeclampsia)
 *
 * Run: npm run test:news2  OR  tsx scripts/test-news2-early-warning.ts
 */

import assert from 'node:assert/strict'

import { installModuleMocks } from './test-helpers/module-mocks'
import { createTestRunner, writeTestReport } from './test-helpers/test-runner'

const removeMocks = installModuleMocks({ 'server-only': {} })

// eslint-disable-next-line @typescript-eslint/no-require-imports
const { calculateNEWS2, news2ToRedFlags } = require('../src/lib/cdss/news2')
// eslint-disable-next-line @typescript-eslint/no-require-imports
const { detectEarlyWarningPatterns } = require('../src/lib/cdss/early-warning-patterns')

type NEWS2Result = {
  aggregate_score: number
  risk_level: string
  parameter_scores: Array<{ parameter: string; value: number; score: number }>
  has_extreme_single: boolean
  scoreable_parameters: number
}

type EarlyWarningMatch = {
  pattern_id: string
  severity: string
  condition: string
  icd_codes: string[]
}

type CDSSInput = {
  keluhan_utama: string
  keluhan_tambahan?: string
  usia: number
  jenis_kelamin: 'L' | 'P'
  vital_signs?: Record<string, number | undefined>
  chronic_diseases?: string[]
  is_pregnant?: boolean
}

const { test, runAll } = createTestRunner()

// ═══════════════════════════════════════════════════════════════════════════════
// GROUP 1: NEWS2 Individual Parameter Scoring
// ═══════════════════════════════════════════════════════════════════════════════

test('NEWS2: normal vitals → score 0', () => {
  const result: NEWS2Result = calculateNEWS2({
    respiratory_rate: 16,
    spo2: 97,
    systolic: 120,
    heart_rate: 72,
    temperature: 37.0,
  })
  assert.equal(result.aggregate_score, 0, `Expected 0, got ${result.aggregate_score}`)
  assert.equal(result.risk_level, 'low')
})

test('NEWS2: borderline tachycardia HR 95 → score 1', () => {
  const result: NEWS2Result = calculateNEWS2({
    heart_rate: 95,
    respiratory_rate: 16,
    spo2: 97,
    systolic: 120,
    temperature: 37.0,
  })
  const hrScore = result.parameter_scores.find(
    (p: { parameter: string }) => p.parameter === 'heart_rate'
  )
  assert.equal(hrScore?.score, 1, `HR 95 should score 1, got ${hrScore?.score}`)
})

test('NEWS2: severe tachycardia HR 135 → score 3', () => {
  const result: NEWS2Result = calculateNEWS2({ heart_rate: 135 })
  const hrScore = result.parameter_scores.find(
    (p: { parameter: string }) => p.parameter === 'heart_rate'
  )
  assert.equal(hrScore?.score, 3)
  assert.ok(result.has_extreme_single, 'Should flag extreme single parameter')
})

test('NEWS2: hypothermia 34.5°C → score 3', () => {
  const result: NEWS2Result = calculateNEWS2({ temperature: 34.5 })
  const tempScore = result.parameter_scores.find(
    (p: { parameter: string }) => p.parameter === 'temperature'
  )
  assert.equal(tempScore?.score, 3)
})

test('NEWS2: mild fever 38.5°C → score 1', () => {
  const result: NEWS2Result = calculateNEWS2({ temperature: 38.5 })
  const tempScore = result.parameter_scores.find(
    (p: { parameter: string }) => p.parameter === 'temperature'
  )
  assert.equal(tempScore?.score, 1)
})

test('NEWS2: high fever 39.5°C → score 2', () => {
  const result: NEWS2Result = calculateNEWS2({ temperature: 39.5 })
  const tempScore = result.parameter_scores.find(
    (p: { parameter: string }) => p.parameter === 'temperature'
  )
  assert.equal(tempScore?.score, 2)
})

test('NEWS2: SpO2 93% → score 2', () => {
  const result: NEWS2Result = calculateNEWS2({ spo2: 93 })
  const spo2Score = result.parameter_scores.find(
    (p: { parameter: string }) => p.parameter === 'spo2'
  )
  assert.equal(spo2Score?.score, 2)
})

test('NEWS2: systolic 95 mmHg → score 2', () => {
  const result: NEWS2Result = calculateNEWS2({ systolic: 95 })
  const bpScore = result.parameter_scores.find(
    (p: { parameter: string }) => p.parameter === 'systolic'
  )
  assert.equal(bpScore?.score, 2)
})

test('NEWS2: systolic 225 mmHg → score 3', () => {
  const result: NEWS2Result = calculateNEWS2({ systolic: 225 })
  const bpScore = result.parameter_scores.find(
    (p: { parameter: string }) => p.parameter === 'systolic'
  )
  assert.equal(bpScore?.score, 3)
})

test('NEWS2: RR 8 → score 3 (bradypnea)', () => {
  const result: NEWS2Result = calculateNEWS2({ respiratory_rate: 8 })
  const rrScore = result.parameter_scores.find(
    (p: { parameter: string }) => p.parameter === 'respiratory_rate'
  )
  assert.equal(rrScore?.score, 3)
})

test('NEWS2: RR 22 → score 2 (tachypnea)', () => {
  const result: NEWS2Result = calculateNEWS2({ respiratory_rate: 22 })
  const rrScore = result.parameter_scores.find(
    (p: { parameter: string }) => p.parameter === 'respiratory_rate'
  )
  assert.equal(rrScore?.score, 2)
})

// ═══════════════════════════════════════════════════════════════════════════════
// GROUP 2: NEWS2 Risk Stratification
// ═══════════════════════════════════════════════════════════════════════════════

test('NEWS2: aggregate 5 → medium risk', () => {
  // HR 100(1) + RR 22(2) + temp 38.5(1) + systolic 105(1) = 5
  const result: NEWS2Result = calculateNEWS2({
    heart_rate: 100,
    respiratory_rate: 22,
    temperature: 38.5,
    systolic: 105,
    spo2: 97,
  })
  assert.equal(result.aggregate_score, 5, `Expected 5, got ${result.aggregate_score}`)
  assert.equal(result.risk_level, 'medium')
})

test('NEWS2: aggregate 7+ → high risk', () => {
  // HR 135(3) + RR 26(3) + temp 39.5(2) = 8
  const result: NEWS2Result = calculateNEWS2({
    heart_rate: 135,
    respiratory_rate: 26,
    temperature: 39.5,
  })
  assert.ok(result.aggregate_score >= 7, `Expected >= 7, got ${result.aggregate_score}`)
  assert.equal(result.risk_level, 'high')
})

test('NEWS2: single param score 3 → low_medium risk', () => {
  // Only systolic 85(3), rest normal
  const result: NEWS2Result = calculateNEWS2({
    systolic: 85,
    heart_rate: 72,
    respiratory_rate: 16,
    temperature: 37.0,
    spo2: 97,
  })
  assert.ok(result.has_extreme_single)
  assert.equal(result.risk_level, 'low_medium')
})

test('NEWS2: no vitals → score 0, 0 scoreable', () => {
  const result: NEWS2Result = calculateNEWS2(undefined)
  assert.equal(result.aggregate_score, 0)
  assert.equal(result.scoreable_parameters, 0)
})

test('NEWS2: medium+ risk generates red flags', () => {
  const result: NEWS2Result = calculateNEWS2({
    heart_rate: 100,
    respiratory_rate: 22,
    temperature: 38.5,
    systolic: 105,
    spo2: 97,
  })
  const flags = news2ToRedFlags(result)
  assert.ok(flags.length > 0, 'Medium risk should generate red flags')
  assert.ok(flags[0].condition.includes('NEWS2'), 'Should mention NEWS2')
})

test('NEWS2: low risk does NOT generate red flags', () => {
  const result: NEWS2Result = calculateNEWS2({
    heart_rate: 72,
    respiratory_rate: 16,
    temperature: 37.0,
    systolic: 120,
    spo2: 97,
  })
  const flags = news2ToRedFlags(result)
  assert.equal(flags.length, 0, 'Low risk should not generate flags')
})

// ═══════════════════════════════════════════════════════════════════════════════
// GROUP 3: Disease-Specific Early Warning Patterns
// ═══════════════════════════════════════════════════════════════════════════════

test('DHF: temp dropping + tachycardia → dengue shock warning', () => {
  const input: CDSSInput = {
    keluhan_utama: 'demam berdarah hari ke-4, demam mulai turun',
    usia: 25,
    jenis_kelamin: 'L',
    vital_signs: { temperature: 37.0, heart_rate: 110, systolic: 95, diastolic: 80 },
  }
  const news2: NEWS2Result = calculateNEWS2(input.vital_signs)
  const matches: EarlyWarningMatch[] = detectEarlyWarningPatterns(input, news2)
  const dhf = matches.find((m: EarlyWarningMatch) => m.pattern_id.startsWith('DHF'))
  assert.ok(dhf, 'Should detect DHF pattern')
  assert.ok(dhf!.icd_codes.includes('A91'), 'Should reference A91 (DHF)')
})

test('DHF: no dengue context → no DHF warning', () => {
  const input: CDSSInput = {
    keluhan_utama: 'sakit kepala biasa',
    usia: 25,
    jenis_kelamin: 'L',
    vital_signs: { temperature: 37.0, heart_rate: 110 },
  }
  const news2: NEWS2Result = calculateNEWS2(input.vital_signs)
  const matches: EarlyWarningMatch[] = detectEarlyWarningPatterns(input, news2)
  const dhf = matches.find((m: EarlyWarningMatch) => m.pattern_id.startsWith('DHF'))
  assert.ok(!dhf, 'Should NOT detect DHF without dengue context')
})

test('Sepsis: SIRS ≥2 + infection context → sepsis warning', () => {
  const input: CDSSInput = {
    keluhan_utama: 'demam tinggi, menggigil, infeksi saluran kemih',
    usia: 60,
    jenis_kelamin: 'P',
    vital_signs: { temperature: 38.8, heart_rate: 95, respiratory_rate: 22, systolic: 110 },
  }
  const news2: NEWS2Result = calculateNEWS2(input.vital_signs)
  const matches: EarlyWarningMatch[] = detectEarlyWarningPatterns(input, news2)
  const sepsis = matches.find((m: EarlyWarningMatch) => m.pattern_id.startsWith('SEPSIS'))
  assert.ok(sepsis, 'Should detect sepsis pattern with SIRS + infection')
})

test('Sepsis: qSOFA ≥2 → emergency sepsis', () => {
  const input: CDSSInput = {
    keluhan_utama: 'demam, sesak napas, lemas berat',
    usia: 55,
    jenis_kelamin: 'L',
    vital_signs: { respiratory_rate: 24, systolic: 95, temperature: 39.0, heart_rate: 110 },
  }
  const news2: NEWS2Result = calculateNEWS2(input.vital_signs)
  const matches: EarlyWarningMatch[] = detectEarlyWarningPatterns(input, news2)
  const sepsis = matches.find((m: EarlyWarningMatch) => m.pattern_id === 'SEPSIS_QSOFA')
  assert.ok(sepsis, 'Should detect qSOFA sepsis')
  assert.equal(sepsis!.severity, 'emergency')
})

test('Respiratory: tachypnea + low SpO2 + tachycardia → respiratory failure', () => {
  const input: CDSSInput = {
    keluhan_utama: 'sesak napas berat, asma kambuh',
    usia: 35,
    jenis_kelamin: 'L',
    vital_signs: { respiratory_rate: 30, spo2: 89, heart_rate: 120 },
  }
  const news2: NEWS2Result = calculateNEWS2(input.vital_signs)
  const matches: EarlyWarningMatch[] = detectEarlyWarningPatterns(input, news2)
  const resp = matches.find((m: EarlyWarningMatch) => m.pattern_id.startsWith('RESP'))
  assert.ok(resp, 'Should detect respiratory failure pattern')
  assert.equal(resp!.severity, 'emergency')
})

test('ACS: chest pain + tachycardia + hypotension → ACS shock', () => {
  const input: CDSSInput = {
    keluhan_utama: 'nyeri dada seperti ditindih, keringat dingin',
    usia: 55,
    jenis_kelamin: 'L',
    vital_signs: { heart_rate: 115, systolic: 85, diastolic: 60 },
  }
  const news2: NEWS2Result = calculateNEWS2(input.vital_signs)
  const matches: EarlyWarningMatch[] = detectEarlyWarningPatterns(input, news2)
  const acs = matches.find((m: EarlyWarningMatch) => m.pattern_id.startsWith('ACS'))
  assert.ok(acs, 'Should detect ACS pattern')
  assert.ok(acs!.icd_codes.includes('I21'), 'Should reference AMI code')
})

test('Hemorrhagic: tachycardia + bleeding context → compensated shock', () => {
  const input: CDSSInput = {
    keluhan_utama: 'muntah darah, bab hitam',
    usia: 45,
    jenis_kelamin: 'L',
    vital_signs: { heart_rate: 108, systolic: 110 },
  }
  const news2: NEWS2Result = calculateNEWS2(input.vital_signs)
  const matches: EarlyWarningMatch[] = detectEarlyWarningPatterns(input, news2)
  const hem = matches.find((m: EarlyWarningMatch) => m.pattern_id.startsWith('HEMORRHAGIC'))
  assert.ok(hem, 'Should detect compensated hemorrhagic shock')
  assert.equal(hem!.pattern_id, 'HEMORRHAGIC_COMPENSATED')
})

test('Preeclampsia: hypertension + pregnant + headache → preeclampsia warning', () => {
  const input: CDSSInput = {
    keluhan_utama: 'sakit kepala hebat, pandangan kabur',
    usia: 28,
    jenis_kelamin: 'P',
    is_pregnant: true,
    vital_signs: { systolic: 165, diastolic: 112 },
  }
  const news2: NEWS2Result = calculateNEWS2(input.vital_signs)
  const matches: EarlyWarningMatch[] = detectEarlyWarningPatterns(input, news2)
  const pe = matches.find((m: EarlyWarningMatch) => m.pattern_id.startsWith('ECLAMPSIA'))
  assert.ok(pe, 'Should detect preeclampsia/eclampsia pattern')
  assert.equal(pe!.severity, 'emergency')
})

test('Preeclampsia: male patient → no preeclampsia warning', () => {
  const input: CDSSInput = {
    keluhan_utama: 'sakit kepala hebat',
    usia: 28,
    jenis_kelamin: 'L',
    vital_signs: { systolic: 165, diastolic: 112 },
  }
  const news2: NEWS2Result = calculateNEWS2(input.vital_signs)
  const matches: EarlyWarningMatch[] = detectEarlyWarningPatterns(input, news2)
  const pe = matches.find(
    (m: EarlyWarningMatch) =>
      m.pattern_id.startsWith('ECLAMPSIA') || m.pattern_id.startsWith('PREECLAMPSIA')
  )
  assert.ok(!pe, 'Male patient should NOT trigger preeclampsia')
})

test('Malaria: high fever + tachycardia + malaria context → malaria worsening', () => {
  const input: CDSSInput = {
    keluhan_utama: 'demam menggigil periodik, baru dari daerah endemis malaria',
    usia: 30,
    jenis_kelamin: 'L',
    vital_signs: { temperature: 39.5, heart_rate: 115 },
  }
  const news2: NEWS2Result = calculateNEWS2(input.vital_signs)
  const matches: EarlyWarningMatch[] = detectEarlyWarningPatterns(input, news2)
  const mal = matches.find((m: EarlyWarningMatch) => m.pattern_id.startsWith('MALARIA'))
  assert.ok(mal, 'Should detect malaria worsening pattern')
  assert.ok(mal!.icd_codes.includes('B54'))
})

// ═══════════════════════════════════════════════════════════════════════════════
// GROUP 4: The Critical Gap Case (from brainstorming)
// ═══════════════════════════════════════════════════════════════════════════════

test('CRITICAL GAP: subtle multi-param deviation caught by NEWS2 (HR 100, RR 22, temp 38.5, sys 105)', () => {
  // This is the case Chief identified: each value slightly off normal,
  // old system = ZERO alerts. NEWS2 aggregate = 5 = MEDIUM risk.
  const result: NEWS2Result = calculateNEWS2({
    heart_rate: 100,
    respiratory_rate: 22,
    temperature: 38.5,
    systolic: 105,
    spo2: 97,
  })
  assert.ok(
    result.aggregate_score >= 5,
    `Subtle deviation aggregate should be >= 5 (medium), got ${result.aggregate_score}`
  )
  assert.equal(result.risk_level, 'medium', 'Should be medium risk')

  const flags = news2ToRedFlags(result)
  assert.ok(flags.length > 0, 'Should generate red flag for medium risk')
  assert.equal(flags[0].severity, 'urgent', 'Medium risk = urgent severity')
})

// ═══════════════════════════════════════════════════════════════════════════════
// RUN
// ═══════════════════════════════════════════════════════════════════════════════

async function main() {
  const testResults = await runAll()
  removeMocks()

  await writeTestReport(
    'test-news2-early-warning.txt',
    '═══ NEWS2 & Early Warning Pattern Tests ═══',
    testResults
  )

  const passCount = testResults.filter((r: { status: string }) => r.status === 'PASS').length
  const failCount = testResults.length - passCount

  console.log(
    `\n═══ NEWS2 & Early Warning Tests: ${passCount}/${testResults.length} passed, ${failCount} failed ═══\n`
  )

  for (const r of testResults) {
    const icon = r.status === 'PASS' ? '✓' : '✗'
    console.log(`  ${icon} ${r.name}`)
    if (r.error) console.log(`    ${r.error.split('\n')[0]}`)
  }

  if (failCount > 0) {
    console.log(`\n⚠ ${failCount} test(s) failed. See runtime/test-news2-early-warning.txt`)
    process.exit(1)
  }

  console.log('\n✓ All NEWS2 & early warning tests passed.')
}

main()
