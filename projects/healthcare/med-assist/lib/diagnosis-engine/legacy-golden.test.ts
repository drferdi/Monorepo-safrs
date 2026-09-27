// @vitest-environment node
/**
 * Golden tests: the proof that isolating the legacy engine changed nothing for physicians.
 *
 * `__golden__/legacy-outputs.json` was recorded from `runGetSuggestionsFlow` before any caller
 * was switched to the engine registry. Every assertion below compares against that recording.
 * Only fields that differ on every run (`meta.timestamp`, `meta.processing_time_ms`) are
 * removed before comparing.
 *
 * Re-record only on purpose, after a reviewed change to the legacy engine:
 *   UPDATE_GOLDEN=1 node scripts/pnpm.mjs exec vitest run lib/diagnosis-engine/legacy-golden.test.ts
 */

import { existsSync, readFileSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';

import { beforeAll, describe, expect, it, vi } from 'vitest';

import { GOLDEN_CASES } from './__golden__/cases';
import { installLegacyRuntime } from './testing/legacy-runtime';

import { runGetSuggestionsFlow } from '@/lib/iskandar-diagnosis-engine/get-suggestions-flow';
import type { APIResponse, CDSSResponse } from '@/types/api';

vi.mock('@/lib/rag/icd10-db', () => import('./testing/memory-icd10-db'));

const GOLDEN_PATH = resolve(__dirname, '__golden__/legacy-outputs.json');

type Recording = Record<string, unknown>;

// Alert ids are `alert-<Date.now()>-<random>`; only the id is masked, never the alert content.
const VOLATILE_ALERT_ID = /^alert-\d+-[a-z0-9]+$/;

function stripVolatileFields(response: APIResponse<CDSSResponse>): unknown {
  const copy = JSON.parse(JSON.stringify(response)) as APIResponse<CDSSResponse>;
  if (copy.data?.meta) {
    const {
      timestamp: _timestamp,
      processing_time_ms: _processingTimeMs,
      ...stable
    } = copy.data.meta;
    copy.data.meta = stable as CDSSResponse['meta'];
  }
  for (const alert of copy.data?.alerts ?? []) {
    if (VOLATILE_ALERT_ID.test(alert.id)) alert.id = 'alert-<volatile>';
  }
  return copy;
}

function readRecording(): Recording {
  return JSON.parse(readFileSync(GOLDEN_PATH, 'utf-8')) as Recording;
}

describe('legacy diagnosis engine golden outputs', () => {
  beforeAll(async () => {
    await installLegacyRuntime();

    if (process.env.UPDATE_GOLDEN === '1') {
      const recording: Recording = {};
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
    expect(Object.keys(readRecording()).sort()).toEqual(
      GOLDEN_CASES.map((goldenCase) => goldenCase.id).sort()
    );
  });

  it.each(GOLDEN_CASES)('runGetSuggestionsFlow matches the recording: $id', async (goldenCase) => {
    const response = await runGetSuggestionsFlow(
      structuredClone(goldenCase.encounter),
      goldenCase.context
    );
    expect(stripVolatileFields(response)).toEqual(readRecording()[goldenCase.id]);
  });
});
