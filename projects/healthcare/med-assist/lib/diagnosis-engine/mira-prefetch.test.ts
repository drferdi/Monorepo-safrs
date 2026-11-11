// @vitest-environment node
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { GOLDEN_CASES } from './__golden__/cases';
import { encounterToCaseState } from './case-state';
import { createUnavailableResult } from './engine-result';
import { MIRA_PREFETCH_READY_KEY, peekPrefetch, resetPrefetchMemory, runMiraPrefetch } from './mira-prefetch';
import { hashCanonical } from './request-context';
import { runDiagnosisSuggestions } from './run-diagnosis';
import { installLegacyRuntime } from './testing/legacy-runtime';
import type { DiagnosisEngine, EngineResult } from './types';

vi.mock('@/lib/rag/icd10-db', () => import('./testing/memory-icd10-db'));
// The audit log writes storage.local too; only the ready key is under test here.
vi.mock('@/lib/iskandar-diagnosis-engine/audit-logger', async (importOriginal) => ({
  ...(await importOriginal<typeof import('@/lib/iskandar-diagnosis-engine/audit-logger')>()),
  logShadowComparison: vi.fn(async () => undefined),
}));

const CASE = GOLDEN_CASES.find((c) => c.id === 'appendicitis-like')!;
const writes: Array<Record<string, unknown>> = [];

function okResult(): EngineResult {
  return {
    ...createUnavailableResult({ engineId: 'mira', version: 'fake', code: 'X', message: 'x', latencyMs: 1, traceId: 't' }),
    status: 'ok',
    unfilled: [],
    error: undefined,
    differential: { likely: [{ icd10: 'K35.8', label: 'Acute appendicitis', confidenceTier: 'high' }], alternatives: [], cannotMiss: [] },
  };
}

function engine(step: () => Promise<EngineResult>): DiagnosisEngine {
  return { id: 'mira', version: 'fake', step };
}

describe('mira-prefetch', () => {
  beforeEach(async () => {
    await installLegacyRuntime();
    resetPrefetchMemory();
    writes.length = 0;
    vi.stubGlobal('browser', { storage: { local: { set: async (v: Record<string, unknown>) => void writes.push(v) } } });
  });
  afterEach(() => vi.unstubAllGlobals());

  it('runs one step per hash and writes the ready key once', async () => {
    let steps = 0;
    const deps = { engine: engine(async () => (steps++, okResult())), timeoutMs: 100 };
    const first = await runMiraPrefetch(CASE.encounter, CASE.context, deps);
    const second = await runMiraPrefetch(CASE.encounter, CASE.context, deps);
    expect(first.started).toBe(true);
    expect(second.started).toBe(false);
    expect(steps).toBe(1);
    expect(peekPrefetch(first.hash)).toMatchObject({ status: 'done' });
    expect(writes).toEqual([{ [MIRA_PREFETCH_READY_KEY]: { key: first.hash, at: expect.any(String) } }]);
  });

  it('serves a done prefetch to getSuggestions without a new step', async () => {
    let steps = 0;
    const active = engine(async () => (steps++, okResult()));
    await runMiraPrefetch(CASE.encounter, CASE.context, { engine: active, timeoutMs: 100 });
    const response = await runDiagnosisSuggestions(CASE.encounter, CASE.context, { mode: 'mira', engines: { legacy: (await import('./registry')).getLegacyEngine(), active } });
    expect(steps).toBe(1);
    expect(response.data?.diagnosis_suggestions[0]?.icd_x).toBe('K35.8');
    expect(response.data?.engine_pending).toBeUndefined();
  });

  it('answers legacy with a pending notice while the prefetch is running', async () => {
    let release: () => void = () => undefined;
    const active = engine(() => new Promise((resolve) => { release = () => resolve(okResult()); }));
    const started = runMiraPrefetch(CASE.encounter, CASE.context, { engine: active, timeoutMs: 1000 });
    const response = await runDiagnosisSuggestions(CASE.encounter, CASE.context, { mode: 'mira', engines: { legacy: (await import('./registry')).getLegacyEngine(), active } });
    expect(response.data?.engine_pending).toBe(true);
    expect(response.data?.engine_notice).toBe('Menunggu MIRA…');
    expect(response.data?.prefetch_key).toBe(hashCanonical(encounterToCaseState(CASE.encounter, CASE.context)));
    release();
    expect((await started).hash).toBe(response.data?.prefetch_key);
  });

  it('serves the prefetch when only the page fills keluhan_tambahan from the encounter', async () => {
    // The Trajectory stage sends an empty tambahan; the page falls back to the encounter's own.
    let steps = 0;
    const active = engine(async () => (steps++, okResult()));
    const encounter: typeof CASE.encounter = {
      ...CASE.encounter,
      anamnesa: { ...CASE.encounter.anamnesa, keluhan_tambahan: 'Mual' },
    };
    await runMiraPrefetch(encounter, { ...CASE.context, keluhan_tambahan: '' }, { engine: active, timeoutMs: 100 });
    const response = await runDiagnosisSuggestions(encounter, { ...CASE.context, keluhan_tambahan: 'Mual' }, { mode: 'mira', engines: { legacy: (await import('./registry')).getLegacyEngine(), active } });
    expect(steps).toBe(1);
    expect(response.data?.diagnosis_suggestions[0]?.icd_x).toBe('K35.8');
  });

  it('ignores a done entry for a different case', async () => {
    let steps = 0;
    const active = engine(async () => (steps++, okResult()));
    await runMiraPrefetch(CASE.encounter, CASE.context, { engine: active, timeoutMs: 100 });
    const other = { ...CASE.context, keluhan_utama: 'batuk lama' };
    expect(peekPrefetch(hashCanonical(encounterToCaseState(CASE.encounter, other)))).toBeUndefined();
    await runDiagnosisSuggestions(CASE.encounter, other, { mode: 'mira', engines: { legacy: (await import('./registry')).getLegacyEngine(), active } });
    expect(steps).toBe(2);
  });

  it('never serves one patient the prefetch of another with the same request context', async () => {
    let steps = 0;
    const active = engine(async () => (steps++, okResult()));
    const other: typeof CASE.encounter = {
      ...CASE.encounter,
      diagnosa: { ...CASE.encounter.diagnosa, penyakit_kronis: ['Diabetes melitus tipe 2'] },
    };
    await runMiraPrefetch(CASE.encounter, CASE.context, { engine: active, timeoutMs: 100 });

    await runDiagnosisSuggestions(other, CASE.context, { mode: 'mira', engines: { legacy: (await import('./registry')).getLegacyEngine(), active } });
    expect(steps).toBe(2);

    const second = await runMiraPrefetch(other, CASE.context, { engine: active, timeoutMs: 100 });
    expect(second.started).toBe(true);
    expect(steps).toBe(3);
  });

  it('does not keep a failed prefetch but still tells the page it finished', async () => {
    let steps = 0;
    const failing = engine(async () => {
      steps++;
      return createUnavailableResult({ engineId: 'mira', version: 'fake', code: 'NETWORK_ERROR', message: 'down', latencyMs: 1, traceId: 't' });
    });
    const first = await runMiraPrefetch(CASE.encounter, CASE.context, { engine: failing, timeoutMs: 100 });
    expect(peekPrefetch(first.hash)).toBeUndefined();
    expect(writes).toEqual([{ [MIRA_PREFETCH_READY_KEY]: { key: first.hash, at: expect.any(String) } }]);

    const active = engine(async () => (steps++, okResult()));
    const response = await runDiagnosisSuggestions(CASE.encounter, CASE.context, { mode: 'mira', engines: { legacy: (await import('./registry')).getLegacyEngine(), active } });
    expect(steps).toBe(2);
    expect(response.data?.diagnosis_suggestions[0]?.icd_x).toBe('K35.8');

    const again = await runMiraPrefetch(CASE.encounter, CASE.context, { engine: failing, timeoutMs: 100 });
    expect(again.started).toBe(true);
  });
});
