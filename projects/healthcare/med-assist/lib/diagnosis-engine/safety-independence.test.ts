// @vitest-environment node
/**
 * The safety layer (red flags, emergency gates, triage/referral) must produce its full output
 * whatever the diagnosis engine does: answer, throw, hang, or be absent.
 */

import { existsSync, readFileSync } from 'node:fs';
import { dirname, resolve, sep } from 'node:path';

import { beforeAll, describe, expect, it, vi } from 'vitest';

import { GOLDEN_CASES } from './__golden__/cases';
import { createLegacyEngine } from './legacy-engine';
import { miraNoticeFor } from './mira-notice';
import { getLegacyEngine } from './registry';
import { runDiagnosisSuggestions } from './run-diagnosis';
import { readGoldenRecording, stripVolatileFields } from './testing/golden';
import { installLegacyRuntime } from './testing/legacy-runtime';
import type { DiagnosisEngine } from './types';

import { CLINICAL_PATTERNS } from '@/lib/emergency-detector/clinical-patterns';
import { buildClinicalSnapshot } from '@/lib/emergency-detector/clinical-snapshot';
import { evaluatePatterns, patternMatchesToAlerts } from '@/lib/emergency-detector/pattern-engine';
import { computeTriageVerdict } from '@/lib/emergency-detector/triage-verdict';
import { runRedFlagChecks } from '@/lib/iskandar-diagnosis-engine/red-flags';
import { evaluateTriageReferralTree } from '@/lib/iskandar-diagnosis-engine/triage-referral-decision-tree';
import type { PenyakitRawData } from '@/lib/rag/types';
import type { APIResponse, CDSSResponse } from '@/types/api';

vi.mock('@/lib/rag/icd10-db', () => import('./testing/memory-icd10-db'));

const ROOT = resolve(__dirname, '../..');
const SEPSIS_CASE = GOLDEN_CASES.find((goldenCase) => goldenCase.id === 'sepsis-like-with-history');

const throwingEngine: DiagnosisEngine = {
  id: 'mira',
  version: 'fake-throwing',
  step: async () => {
    throw new Error('candidate engine crashed');
  },
};

const hangingEngine: DiagnosisEngine = {
  id: 'mira',
  version: 'fake-hanging',
  step: () => new Promise(() => undefined),
};

// ---------------------------------------------------------------------------
// Structural: the safety modules do not depend on the diagnosis pipeline.
// ---------------------------------------------------------------------------

const SAFETY_MODULES = [
  'lib/iskandar-diagnosis-engine/red-flags.ts',
  'lib/iskandar-diagnosis-engine/triage-referral-decision-tree.ts',
  'lib/emergency-detector/index.ts',
  'lib/emergency-detector/pattern-engine.ts',
  'lib/emergency-detector/clinical-snapshot.ts',
  'lib/emergency-detector/triage-verdict.ts',
  'lib/emergency-detector/htn-classifier.ts',
  'lib/emergency-detector/glucose-classifier.ts',
  'lib/emergency-detector/occult-shock-detector.ts',
];

const DIAGNOSIS_PIPELINE = [
  /^lib\/diagnosis-engine\//,
  /^lib\/iskandar-diagnosis-engine\/(engine|get-suggestions-flow|llm-reasoner|symptom-matcher|epidemiology-weights|diagnosis-banding-penalty|openai-key-store)\.ts$/,
];

function resolveImport(fromFile: string, specifier: string): string | null {
  let base: string;
  if (specifier.startsWith('.')) base = resolve(dirname(fromFile), specifier);
  else if (specifier.startsWith('@/') || specifier.startsWith('~/'))
    base = resolve(ROOT, specifier.slice(2));
  else return null;
  const candidates = [base, `${base}.ts`, `${base}.tsx`, resolve(base, 'index.ts')];
  return (
    candidates.find((candidate) => existsSync(candidate) && candidate.match(/\.tsx?$/)) ?? null
  );
}

function transitiveImports(entry: string): string[] {
  const seen = new Set<string>();
  const queue = [resolve(ROOT, entry)];
  const importPattern = /(?:from\s+|import\s*\(\s*|import\s+)['"]([^'"]+)['"]/g;
  while (queue.length > 0) {
    const file = queue.shift() as string;
    if (seen.has(file)) continue;
    seen.add(file);
    for (const match of readFileSync(file, 'utf-8').matchAll(importPattern)) {
      const target = resolveImport(file, match[1]);
      if (target && !seen.has(target)) queue.push(target);
    }
  }
  return [...seen].map((file) =>
    file
      .slice(ROOT.length + 1)
      .split(sep)
      .join('/')
  );
}

describe('safety layer is structurally independent of the diagnosis engine', () => {
  it('the import walker does find the pipeline when it is imported (positive control)', () => {
    expect(transitiveImports('entrypoints/background.ts')).toEqual(
      expect.arrayContaining([
        'lib/diagnosis-engine/run-diagnosis.ts',
        'lib/iskandar-diagnosis-engine/engine.ts',
        'lib/iskandar-diagnosis-engine/symptom-matcher.ts',
      ])
    );
  });

  it.each(SAFETY_MODULES)('%s imports nothing from the diagnosis pipeline', (entry) => {
    const offending = transitiveImports(entry).filter((file) =>
      DIAGNOSIS_PIPELINE.some((pattern) => pattern.test(file))
    );
    expect(offending).toEqual([]);
  });
});

// ---------------------------------------------------------------------------
// Runtime: failing or hanging engines.
// ---------------------------------------------------------------------------

describe('safety output survives engine failure', () => {
  beforeAll(async () => {
    await installLegacyRuntime();
  });

  it('the recorded legacy output carries the red-flag alerts for the sepsis-like case', () => {
    const recorded = readGoldenRecording()['sepsis-like-with-history'] as APIResponse<CDSSResponse>;
    expect(recorded.data?.alerts.some((alert) => alert.type === 'red_flag')).toBe(true);
  });

  it.each(GOLDEN_CASES)(
    'a throwing candidate engine in shadow mode leaves the physician output identical: $id',
    async (goldenCase) => {
      const response = await runDiagnosisSuggestions(
        structuredClone(goldenCase.encounter),
        goldenCase.context,
        { engines: { legacy: getLegacyEngine(), active: throwingEngine }, mode: 'shadow' }
      );
      expect(stripVolatileFields(response)).toEqual(readGoldenRecording()[goldenCase.id]);
    }
  );

  it.each(GOLDEN_CASES)(
    'a throwing candidate engine in mira mode gives the legacy output plus the notice: $id',
    async (goldenCase) => {
      const response = await runDiagnosisSuggestions(
        structuredClone(goldenCase.encounter),
        goldenCase.context,
        { engines: { legacy: getLegacyEngine(), active: throwingEngine }, mode: 'mira' }
      );
      const recorded = readGoldenRecording()[goldenCase.id] as APIResponse<CDSSResponse>;
      expect(stripVolatileFields(response)).toEqual({
        ...recorded,
        data: { ...recorded.data, engine_notice: miraNoticeFor('ENGINE_ERROR') },
      });
    }
  );

  it('a hanging candidate engine in mira mode is cut off by the timeout; only the notice is added', async () => {
    if (!SEPSIS_CASE) throw new Error('sepsis golden case missing');
    const startedAt = Date.now();
    const response = await runDiagnosisSuggestions(
      structuredClone(SEPSIS_CASE.encounter),
      SEPSIS_CASE.context,
      {
        engines: { legacy: getLegacyEngine(), active: hangingEngine },
        mode: 'mira',
        candidateTimeoutMs: 50,
      }
    );
    expect(Date.now() - startedAt).toBeLessThan(5_000);
    const recorded = readGoldenRecording()['sepsis-like-with-history'] as APIResponse<CDSSResponse>;
    expect(stripVolatileFields(response)).toEqual({
      ...recorded,
      data: { ...recorded.data, engine_notice: miraNoticeFor('TIMEOUT') },
    });
  });

  it('red flags, emergency gates and triage/referral run in full while the engine is broken', async () => {
    const brokenLegacy = createLegacyEngine(async () => {
      throw new Error('diagnosis engine unavailable');
    });
    await expect(
      runDiagnosisSuggestions(
        structuredClone(SEPSIS_CASE?.encounter ?? GOLDEN_CASES[0].encounter),
        SEPSIS_CASE?.context ?? GOLDEN_CASES[0].context,
        { engines: { legacy: brokenLegacy, active: brokenLegacy } }
      )
    ).rejects.toThrow('diagnosis engine unavailable');

    // Red flags: qSOFA sepsis from the same vitals.
    const redFlags = runRedFlagChecks({
      keluhan: 'Demam tinggi, menggigil, sesak. Lemas dan napas cepat',
      vitals: {
        systolic: 85,
        diastolic: 52,
        heart_rate: 128,
        respiratory_rate: 30,
        temperature: 39.2,
      },
      age: 47,
      gender: 'L',
    });
    expect(redFlags.map((flag) => flag.id)).toContain('RF-SEPSIS');

    // Emergency gates (Pattern-Engine v2) and the triage verdict shown in the side panel.
    const snapshot = buildClinicalSnapshot(
      {
        sbp: '85',
        dbp: '52',
        hr: '128',
        rr: '30',
        temp: '39.2',
        spo2: '92',
        glucose: '',
        symptomText: 'demam tinggi menggigil sesak',
        allergies: [],
        pregnancyStatus: null,
        avpu: 'A',
        supplemental_o2: false,
        pain_score: '',
      },
      { patientAge: 47 }
    );
    const alerts = patternMatchesToAlerts(
      evaluatePatterns(snapshot, CLINICAL_PATTERNS, [], { tierFilter: ['A', 'B'] })
    );
    expect(alerts.map((alert) => alert.id)).toContain('pattern-CP-001');
    expect(computeTriageVerdict(alerts, true).zone).toBe('merah');

    // Triage/referral tree for a knowledge-base diagnosis, with the same vitals.
    const kb = JSON.parse(readFileSync(resolve(ROOT, 'public/data/penyakit.json'), 'utf-8')) as {
      penyakit: PenyakitRawData[];
    };
    const pneumonia = kb.penyakit.find((entry) => entry.icd10.startsWith('J18'));
    if (!pneumonia) throw new Error('J18 missing from the knowledge base');
    const decision = evaluateTriageReferralTree({
      complaintSignals: ['demam', 'menggigil', 'sesak'],
      complaintText: 'demam tinggi menggigil sesak',
      vitals: { sbp: 85, dbp: 52, hr: 128, rr: 30, temp: 39.2, glucose: 0 },
      disease: pneumonia,
      confidenceBand: 'moderate',
    });
    expect(decision.outcome).toBe('emergency');
  });
});
