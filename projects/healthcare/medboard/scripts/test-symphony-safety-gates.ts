/**
 * Integration tests for the Dashboard → SYMPHONY safety-gate adapter.
 *
 * Exercises `detectSymphonySafetyGateRedFlags()` against the Dashboard's
 * `CDSSEngineInput` shape. Does not require a database or LLM key — the
 * adapter is purely deterministic and runs in-process.
 *
 * Run:
 *   pnpm run test:symphony:safety-gates
 */

import assert from 'node:assert/strict'

import { installModuleMocks } from './test-helpers/module-mocks'
import { createTestRunner, writeTestReport } from './test-helpers/test-runner'

const removeMocks = installModuleMocks({
  'server-only': {},
})

/* eslint-disable @typescript-eslint/no-require-imports */
const { detectSymphonySafetyGateRedFlags } = require(
  '../src/lib/cdss/symphony-safety-gates'
) as typeof import('../src/lib/cdss/symphony-safety-gates')
/* eslint-enable @typescript-eslint/no-require-imports */

type CDSSEngineInput = Parameters<typeof detectSymphonySafetyGateRedFlags>[0]

const { test, runAll } = createTestRunner()

// ── PE Suspect ────────────────────────────────────────────────────────────────

test('PE: classic triad (tachycardia + hypoxia + dyspnea) surfaces PE red flag', () => {
  const input: CDSSEngineInput = {
    keluhan_utama: 'sesak napas mendadak, nyeri dada pleuritik',
    usia: 45,
    jenis_kelamin: 'L',
    vital_signs: {
      systolic: 110,
      diastolic: 70,
      heart_rate: 118,
      spo2: 90,
      respiratory_rate: 24,
      temperature: 37.2,
    },
  }
  const flags = detectSymphonySafetyGateRedFlags(input)
  const pe = flags.find((f) => f.condition === 'Suspek Emboli Paru (PE)')
  assert.ok(pe, 'expected PE red flag to be present')
  assert.equal(pe?.severity, 'emergency')
  assert.ok(pe?.criteria_met && pe.criteria_met.length > 0)
  assert.ok(
    pe?.icd_codes?.includes('I26.9'),
    'expected PE ICD code I26.9 in icd_codes'
  )
})

test('PE: no flag when only isolated tachycardia present', () => {
  const input: CDSSEngineInput = {
    keluhan_utama: 'demam tinggi',
    usia: 40,
    jenis_kelamin: 'P',
    vital_signs: {
      heart_rate: 110,
      systolic: 120,
      diastolic: 80,
      temperature: 39,
    },
  }
  const flags = detectSymphonySafetyGateRedFlags(input)
  const pe = flags.find((f) => f.condition === 'Suspek Emboli Paru (PE)')
  assert.equal(pe, undefined, 'PE should NOT fire with one criterion')
})

// ── Anaphylaxis ───────────────────────────────────────────────────────────────

test('Anaphylaxis: Trigger 1 (skin + respiratory) surfaces red flag', () => {
  const input: CDSSEngineInput = {
    keluhan_utama: 'bentol seluruh tubuh, bengkak bibir, sesak napas',
    usia: 28,
    jenis_kelamin: 'P',
    vital_signs: {
      heart_rate: 115,
      spo2: 93,
      respiratory_rate: 26,
      systolic: 100,
      diastolic: 70,
    },
    allergies: ['seafood'],
  }
  const flags = detectSymphonySafetyGateRedFlags(input)
  const anaph = flags.find((f) => f.condition === 'Suspek Anafilaksis')
  assert.ok(anaph, 'expected anaphylaxis red flag')
  assert.equal(anaph?.severity, 'emergency')
  assert.ok(
    anaph?.icd_codes?.includes('T78.2'),
    'expected anaphylaxis ICD code T78.2'
  )
})

test('Anaphylaxis: Trigger 3 (exposure + hypotension) surfaces red flag', () => {
  const input: CDSSEngineInput = {
    keluhan_utama: 'setelah minum amoksisilin pasien terasa lemas',
    usia: 50,
    jenis_kelamin: 'L',
    vital_signs: {
      systolic: 80,
      diastolic: 50,
      heart_rate: 105,
    },
    allergies: ['amoksisilin'],
  }
  const flags = detectSymphonySafetyGateRedFlags(input)
  const anaph = flags.find((f) => f.condition === 'Suspek Anafilaksis')
  assert.ok(anaph, 'expected anaphylaxis via Trigger 3')
  assert.equal(anaph?.severity, 'emergency')
})

test('Anaphylaxis: no flag on isolated urticaria with no respiratory/CV/GI', () => {
  const input: CDSSEngineInput = {
    keluhan_utama: 'bentol gatal di lengan',
    usia: 30,
    jenis_kelamin: 'P',
    vital_signs: {
      heart_rate: 80,
      spo2: 99,
      respiratory_rate: 16,
      systolic: 120,
      diastolic: 80,
    },
  }
  const flags = detectSymphonySafetyGateRedFlags(input)
  const anaph = flags.find((f) => f.condition === 'Suspek Anafilaksis')
  assert.equal(anaph, undefined, 'isolated urticaria should NOT trigger')
})

// ── Combined / Non-regression ─────────────────────────────────────────────────

test('Neither gate fires on a benign headache complaint', () => {
  const input: CDSSEngineInput = {
    keluhan_utama: 'sakit kepala ringan',
    usia: 35,
    jenis_kelamin: 'L',
    vital_signs: {
      systolic: 120,
      diastolic: 80,
      heart_rate: 85,
      spo2: 98,
      respiratory_rate: 16,
      temperature: 36.8,
    },
  }
  const flags = detectSymphonySafetyGateRedFlags(input)
  assert.equal(flags.length, 0, 'expected empty flags array')
})

// ── Runner ────────────────────────────────────────────────────────────────────

;(async () => {
  const results = await runAll()
  await writeTestReport(
    'symphony-safety-gates.md',
    'Symphony Safety Gate Integration Tests',
    results
  )
  removeMocks()

  const failed = results.filter((r) => r.status === 'FAIL')
  const total = results.length
  const passed = total - failed.length
  console.log(`\nSymphony Safety Gates: ${passed}/${total} passed`)
  for (const r of results) {
    const icon = r.status === 'PASS' ? '✓' : '✗'
    console.log(`  ${icon} ${r.name}`)
    if (r.status === 'FAIL' && r.error) {
      console.log(`    ${r.error.split('\n')[0]}`)
    }
  }
  if (failed.length > 0) process.exit(1)
})()
