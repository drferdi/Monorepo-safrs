// @vitest-environment node
/**
 * Golden tests: the proof that isolating the legacy engine changed nothing for physicians.
 *
 * `__golden__/legacy-outputs.json` was recorded from `runGetSuggestionsFlow` before any caller
 * was switched to the engine registry (commit "record golden outputs of the legacy diagnosis
 * flow"). Every assertion below compares against that recording; see `testing/golden.ts` for
 * the only fields that are masked.
 *
 * Re-record only on purpose, after a reviewed change to the legacy engine:
 *   UPDATE_GOLDEN=1 node scripts/pnpm.mjs exec vitest run lib/diagnosis-engine/legacy-golden.test.ts
 */

import { existsSync, writeFileSync } from 'node:fs';

import { beforeAll, describe, expect, it, vi } from 'vitest';

import { GOLDEN_CASES } from './__golden__/cases';
import { getActiveDiagnosisEngine } from './registry';
import { runDiagnosisSuggestions } from './run-diagnosis';
import {
  GOLDEN_PATH,
  type GoldenRecording,
  readGoldenRecording,
  stripVolatileFields,
} from './testing/golden';
import { installLegacyRuntime } from './testing/legacy-runtime';

import { runGetSuggestionsFlow } from '@/lib/iskandar-diagnosis-engine/get-suggestions-flow';

vi.mock('@/lib/rag/icd10-db', () => import('./testing/memory-icd10-db'));

describe('legacy diagnosis engine golden outputs', () => {
  beforeAll(async () => {
    await installLegacyRuntime();

    if (process.env.UPDATE_GOLDEN === '1') {
      const recording: GoldenRecording = {};
      for (const goldenCase of GOLDEN_CASES) {
        const response = await runGetSuggestionsFlow(
          structuredClone(goldenCase.encounter),
          goldenCase.context
        );
        recording[goldenCase.id] = stripVolatileFields(response);
      }
      writeFileSync(GOLDEN_PATH, `${JSON.stringify(recording, null, 2)}\n`);
    }
  });

  it('has a recording for every golden case', () => {
    expect(existsSync(GOLDEN_PATH)).toBe(true);
    expect(Object.keys(readGoldenRecording()).sort()).toEqual(
      GOLDEN_CASES.map((goldenCase) => goldenCase.id).sort()
    );
  });

  it.each(GOLDEN_CASES)('runGetSuggestionsFlow matches the recording: $id', async (goldenCase) => {
    const response = await runGetSuggestionsFlow(
      structuredClone(goldenCase.encounter),
      goldenCase.context
    );
    expect(stripVolatileFields(response)).toEqual(readGoldenRecording()[goldenCase.id]);
  });

  it('selects the legacy engine with the default flag', () => {
    expect(getActiveDiagnosisEngine().id).toBe('legacy');
  });

  it.each(GOLDEN_CASES)(
    'the background path (runDiagnosisSuggestions, default flag) matches the recording: $id',
    async (goldenCase) => {
      const response = await runDiagnosisSuggestions(
        structuredClone(goldenCase.encounter),
        goldenCase.context
      );
      expect(stripVolatileFields(response)).toEqual(readGoldenRecording()[goldenCase.id]);
    }
  );
});
