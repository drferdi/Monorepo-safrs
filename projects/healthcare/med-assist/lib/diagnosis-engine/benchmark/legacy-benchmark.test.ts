// @vitest-environment node
/**
 * Gate 1 benchmark export. The regular suite runs it on the synthetic fixture only.
 * `scripts/benchmark/run-legacy-engine.mjs` (test name "benchmark-run") sets BENCHMARK_CASES_DIR and BENCHMARK_OUT_DIR to
 * run it on a real (de-identified, never committed) case folder instead.
 */

import { existsSync, mkdtempSync, readFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';

import { afterAll, beforeAll, describe, expect, it, vi } from 'vitest';

import { createLegacyEngine } from '../legacy-engine';
import { installLegacyRuntime } from '../testing/legacy-runtime';

import { CAPSULE_ROOT, runLegacyBenchmark, type BenchmarkRecord } from './legacy-benchmark';
import { isMiraCase, miraCaseToCaseState } from './mira-case';

vi.mock('@/lib/rag/icd10-db', () => import('../testing/memory-icd10-db'));

const FIXTURES_DIR = resolve(__dirname, '__fixtures__');
const fixture: unknown = JSON.parse(
  readFileSync(join(FIXTURES_DIR, 'synthetic_appendicitis_001.json'), 'utf-8')
);

describe('miraCaseToCaseState', () => {
  it('recognises the MIRA case format', () => {
    expect(isMiraCase(fixture)).toBe(true);
    expect(isMiraCase({ case_id: 'x' })).toBe(false);
  });

  it('converts the synthetic case without inventing anything', () => {
    if (!isMiraCase(fixture)) throw new Error('fixture is not a MIRA case');
    const state = miraCaseToCaseState(fixture);

    expect(state.demographics).toEqual({ ageYears: 22, sex: 'M' });
    expect(state.chiefComplaint).toBe('Abdominal pain');
    expect(state.anamnesis.freeText).toBe(fixture.hpi);
    expect(state.vitals).toEqual({
      systolic: 128,
      diastolic: 78,
      heartRate: 104,
      respiratoryRate: 18,
      temperature: 38.1, // 100.6 °F
      spo2: 99,
    });
    expect(state.results).toHaveLength(
      (fixture.labs_blood?.length ?? 0) +
        (fixture.labs_urine?.length ?? 0) +
        (fixture.radiology?.length ?? 0) +
        (fixture.microbiology?.length ?? 0)
    );
    expect(state.results).toContainEqual({
      name: 'White Blood Cells',
      value: 15.8,
      unit: 'K/uL',
      flag: 'abnormal',
    });
    expect(state.results).toContainEqual({ name: 'Leukocytes', value: 'NEG' });
    expect(state.currentMedications).toEqual([]);
    expect(state.physicalExam[0]).toMatch(/^Vitals:/);
    expect(state.knownConditions).toEqual([]);
    expect(state.allergies).toEqual([]);
  });
});

describe('runLegacyBenchmark', () => {
  let outDir: string;

  beforeAll(async () => {
    await installLegacyRuntime();
    outDir = mkdtempSync(join(tmpdir(), 'med-assist-benchmark-'));
  });

  afterAll(() => {
    rmSync(outDir, { recursive: true, force: true });
  });

  it('writes one legacy EngineResult per case', async () => {
    const records = await runLegacyBenchmark({
      casesDir: FIXTURES_DIR,
      outDir,
      engine: createLegacyEngine(),
    });

    expect(records).toHaveLength(1);
    const written = JSON.parse(
      readFileSync(join(outDir, 'synthetic_appendicitis_001.legacy.json'), 'utf-8')
    ) as BenchmarkRecord;
    expect(written).toMatchObject({
      caseId: 'synthetic_appendicitis_001',
      expectedDiagnosis: 'Acute appendicitis (uncomplicated)',
      engine: 'legacy',
    });
    expect(written.result.meta.engineId).toBe('legacy');
    expect(['ok', 'unavailable']).toContain(written.result.status);
    expect(written.input).toEqual(JSON.parse(JSON.stringify(records[0].input)));
  });

  it('refuses to write output inside the capsule', async () => {
    await expect(
      runLegacyBenchmark({
        casesDir: FIXTURES_DIR,
        outDir: join(CAPSULE_ROOT, 'benchmark-output'),
        engine: createLegacyEngine(),
      })
    ).rejects.toThrow(/inside the capsule/);
    expect(existsSync(join(CAPSULE_ROOT, 'benchmark-output'))).toBe(false);
  });
});

describe.runIf(process.env.BENCHMARK_CASES_DIR && process.env.BENCHMARK_OUT_DIR)(
  'benchmark-run',
  () => {
    beforeAll(async () => {
      await installLegacyRuntime();
    });

    it('exports legacy results for every case in BENCHMARK_CASES_DIR', async () => {
      const records = await runLegacyBenchmark({
        casesDir: process.env.BENCHMARK_CASES_DIR as string,
        outDir: process.env.BENCHMARK_OUT_DIR as string,
        engine: createLegacyEngine(),
      });
      console.warn(
        `[benchmark] ${records.length} case(s) written to ${process.env.BENCHMARK_OUT_DIR}`
      );
      expect(records.length).toBeGreaterThan(0);
    });
  }
);
