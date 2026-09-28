// @vitest-environment node
/**
 * MIRA client tests. `fetch` is always a mock; the global `fetch` is replaced by one that fails
 * the test, so no real network call (and no OpenAI call) can happen.
 */

import { afterEach, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';

import { GOLDEN_CASES } from './__golden__/cases';
import { encounterToCaseState } from './case-state';
import { createUnavailableResult } from './engine-result';
import { MIRA_STEP_PATH, createMiraEngine, validateMiraStepResponse } from './mira-engine';
import { getActiveDiagnosisEngine, getLegacyEngine } from './registry';
import {
  MIRA_CANNOT_MISS_TAG,
  MIRA_TAG,
  miraDifferentialToSuggestions,
  runDiagnosisSuggestions,
} from './run-diagnosis';
import { readGoldenRecording, stripVolatileFields } from './testing/golden';
import { installLegacyRuntime } from './testing/legacy-runtime';
import type { CaseState, DiagnosisEngine, DiagnosisItem, EngineResult } from './types';

import * as auditLogger from '@/lib/iskandar-diagnosis-engine/audit-logger';
import type { APIResponse, CDSSResponse } from '@/types/api';

vi.mock('@/lib/rag/icd10-db', () => import('./testing/memory-icd10-db'));

const SERVICE_URL = 'http://127.0.0.1:8765';
const APPENDICITIS = GOLDEN_CASES.find((goldenCase) => goldenCase.id === 'appendicitis-like');
if (!APPENDICITIS) throw new Error('appendicitis golden case missing');
const CASE: CaseState = encounterToCaseState(APPENDICITIS.encounter, APPENDICITIS.context);

const OK_RESPONSE = {
  contractVersion: '1',
  status: 'ok',
  differential: {
    likely: [{ icd10: 'K35.8', label: 'Acute appendicitis', confidenceTier: 'high', score: 0.82 }],
    alternatives: [{ icd10: 'A09', label: 'Gastroenteritis', confidenceTier: 'low' }],
    cannotMiss: [{ icd10: 'K65.0', label: 'Acute peritonitis', confidenceTier: 'low' }],
  },
  evidence: [{ icd10: 'K35.8', supporting: ['migrating right lower quadrant pain'], opposing: [] }],
  missingInformation: ['white cell count'],
  nextBestActions: [{ kind: 'exam', item: 'Rovsing sign', reason: 'supports appendicitis' }],
  disposition: { decision: 'refer', urgency: 'urgent' },
  unfilled: [],
  meta: { version: 'mira-service-0.1', model: 'example-model', costUsd: 0.12 },
};

function jsonResponse(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json' },
  });
}

function engineWith(fetchFn: typeof fetch, timeoutMs = 1_000) {
  return createMiraEngine({ fetchFn, baseUrl: () => SERVICE_URL, timeoutMs });
}

describe('MIRA engine client', () => {
  beforeEach(() => {
    vi.stubGlobal('fetch', () => {
      throw new Error('real fetch must not be called in MIRA tests');
    });
    // A developer's .env.local may set a real dev token; header tests must not depend on it.
    vi.stubEnv('VITE_MIRA_DEV_TOKEN', '');
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    vi.unstubAllEnvs();
  });

  it('is unavailable and sends nothing when VITE_MIRA_SERVICE_URL is not set', async () => {
    vi.stubEnv('VITE_MIRA_SERVICE_URL', '');
    const fetchFn = vi.fn<typeof fetch>();
    const result = await createMiraEngine({ fetchFn }).step(CASE);
    expect(result).toMatchObject({ status: 'unavailable', error: { code: 'NOT_CONFIGURED' } });
    expect(fetchFn).not.toHaveBeenCalled();
  });

  it('reads the service URL from VITE_MIRA_SERVICE_URL', async () => {
    vi.stubEnv('VITE_MIRA_SERVICE_URL', `${SERVICE_URL}/`);
    const fetchFn = vi.fn<typeof fetch>(async () => jsonResponse(OK_RESPONSE));
    await createMiraEngine({ fetchFn }).step(CASE);
    expect(fetchFn.mock.calls[0][0]).toBe(`${SERVICE_URL}${MIRA_STEP_PATH}`);
  });

  it('posts the de-identified case to the Sentra service only, without credentials', async () => {
    const fetchFn = vi.fn<typeof fetch>(async () => jsonResponse(OK_RESPONSE));
    const result = await engineWith(fetchFn).step(CASE);

    expect(fetchFn).toHaveBeenCalledTimes(1);
    const [url, init] = fetchFn.mock.calls[0];
    expect(url).toBe(`${SERVICE_URL}${MIRA_STEP_PATH}`);
    expect(String(url)).not.toMatch(/openai/i);
    expect(init).toMatchObject({ method: 'POST', credentials: 'omit' });
    expect(init?.headers).toEqual({ 'Content-Type': 'application/json' });

    const body = JSON.parse(String(init?.body)) as { traceId: string; case: CaseState };
    expect(body.case).toEqual(JSON.parse(JSON.stringify(CASE)));
    expect(result.meta.traceId).toBe(body.traceId);
  });

  it('sends the picked planning model as X-MIRA-Plan-Model', async () => {
    const fetchFn = vi.fn<typeof fetch>(async () => jsonResponse(OK_RESPONSE));
    const engine = createMiraEngine({
      fetchFn,
      baseUrl: () => SERVICE_URL,
      planModel: async () => 'inception/mercury-2',
    });
    await engine.step(CASE);
    expect(fetchFn.mock.calls[0][1]?.headers).toEqual({
      'Content-Type': 'application/json',
      'X-MIRA-Plan-Model': 'inception/mercury-2',
    });
  });

  it('sends no planning-model header when none is picked', async () => {
    const fetchFn = vi.fn<typeof fetch>(async () => jsonResponse(OK_RESPONSE));
    await createMiraEngine({ fetchFn, baseUrl: () => SERVICE_URL, planModel: async () => undefined }).step(CASE);
    expect(fetchFn.mock.calls[0][1]?.headers).toEqual({ 'Content-Type': 'application/json' });
  });

  it('sends VITE_MIRA_DEV_TOKEN as a bearer token', async () => {
    const fetchFn = vi.fn<typeof fetch>(async () => jsonResponse(OK_RESPONSE));
    const engine = createMiraEngine({
      fetchFn,
      baseUrl: () => SERVICE_URL,
      planModel: async () => undefined,
      devToken: () => 'local-dev-token',
    });
    await engine.step(CASE);
    expect(fetchFn.mock.calls[0][1]?.headers).toEqual({
      'Content-Type': 'application/json',
      Authorization: 'Bearer local-dev-token',
    });
  });

  it('sends no Authorization header when no dev token is set', async () => {
    const fetchFn = vi.fn<typeof fetch>(async () => jsonResponse(OK_RESPONSE));
    const engine = createMiraEngine({
      fetchFn,
      baseUrl: () => SERVICE_URL,
      planModel: async () => undefined,
      devToken: () => ' ',
    });
    await engine.step(CASE);
    expect(fetchFn.mock.calls[0][1]?.headers).toEqual({ 'Content-Type': 'application/json' });
  });

  it('maps a valid response to an EngineResult', async () => {
    const result = await engineWith(async () => jsonResponse(OK_RESPONSE)).step(CASE);
    expect(result.status).toBe('ok');
    expect(result.differential).toEqual(OK_RESPONSE.differential);
    expect(result.disposition).toEqual({ decision: 'refer', urgency: 'urgent' });
    expect(result.meta).toMatchObject({
      engineId: 'mira',
      version: 'mira-client-1/mira-service-0.1',
      model: 'example-model',
      costUsd: 0.12,
    });
  });

  it('blocks a payload with personal data and sends nothing', async () => {
    const fetchFn = vi.fn<typeof fetch>();
    const result = await engineWith(fetchFn).step({
      ...CASE,
      anamnesis: { freeText: 'hubungi keluarga di 081234567890' },
    });
    expect(result).toMatchObject({ status: 'unavailable', error: { code: 'PII_BLOCKED' } });
    expect(result.error?.message).not.toContain('081234567890');
    expect(fetchFn).not.toHaveBeenCalled();
  });

  it.each([
    ['HTTP error', async () => jsonResponse({ detail: 'boom' }, 502), 'HTTP_502'],
    [
      'invented field',
      async () => jsonResponse({ ...OK_RESPONSE, treatmentPlan: 'x' }),
      'CONTRACT_MISMATCH',
    ],
    [
      'missing unfilled list',
      async () => {
        const { unfilled: _unfilled, ...rest } = OK_RESPONSE;
        return jsonResponse(rest);
      },
      'CONTRACT_MISMATCH',
    ],
    [
      'network failure',
      async () => {
        throw new TypeError('Failed to fetch');
      },
      'NETWORK_ERROR',
    ],
  ])('returns unavailable on %s', async (_label, fetchImpl, code) => {
    const result = await engineWith(fetchImpl as typeof fetch).step(CASE);
    expect(result).toMatchObject({ status: 'unavailable', error: { code } });
    expect(result.differential).toEqual({ likely: [], alternatives: [], cannotMiss: [] });
    expect(result.unfilled.length).toBeGreaterThan(0);
  });

  it('passes through an unavailable answer from the service', async () => {
    const serviceDown = {
      ...OK_RESPONSE,
      status: 'unavailable',
      differential: { likely: [], alternatives: [], cannotMiss: [] },
      error: { code: 'MODEL_BUDGET_EXCEEDED', message: 'budget reached' },
    };
    const result = await engineWith(async () => jsonResponse(serviceDown)).step(CASE);
    expect(result).toMatchObject({
      status: 'unavailable',
      error: { code: 'MODEL_BUDGET_EXCEEDED' },
    });
  });

  it('times out and aborts the request', async () => {
    let seenSignal: AbortSignal | undefined;
    const hangingFetch = vi.fn<typeof fetch>(
      (_url, init) =>
        new Promise((_resolve, reject) => {
          seenSignal = init?.signal ?? undefined;
          seenSignal?.addEventListener('abort', () =>
            reject(new DOMException('aborted', 'AbortError'))
          );
        })
    );
    const result = await engineWith(hangingFetch, 20).step(CASE);
    expect(result).toMatchObject({ status: 'unavailable', error: { code: 'TIMEOUT' } });
    expect(seenSignal?.aborted).toBe(true);
  });

  it('stops when the caller aborts', async () => {
    const controller = new AbortController();
    const hangingFetch = vi.fn<typeof fetch>(
      (_url, init) =>
        new Promise((_resolve, reject) => {
          init?.signal?.addEventListener('abort', () =>
            reject(new DOMException('aborted', 'AbortError'))
          );
          controller.abort();
        })
    );
    const result = await engineWith(hangingFetch).step(CASE, { signal: controller.signal });
    expect(result).toMatchObject({ status: 'unavailable', error: { code: 'ABORTED' } });
  });

  it('the example response in this file satisfies the contract', () => {
    expect(validateMiraStepResponse(OK_RESPONSE)).toEqual([]);
  });
});

describe('MIRA behind the registry', () => {
  beforeAll(async () => {
    await installLegacyRuntime();
  });

  afterEach(() => {
    vi.unstubAllEnvs();
    vi.restoreAllMocks();
  });

  it('is selected only by the flag value "mira"', () => {
    expect(getActiveDiagnosisEngine('legacy').id).toBe('legacy');
    expect(getActiveDiagnosisEngine('mira').id).toBe('mira');
  });

  it('in shadow mode with MIRA answering, the physician still gets the legacy output and the MIRA outcome is audited', async () => {
    if (!APPENDICITIS) throw new Error('appendicitis golden case missing');
    const auditSpy = vi.spyOn(auditLogger, 'logShadowComparison');
    const mira = engineWith(async () => jsonResponse(OK_RESPONSE));

    const response = await runDiagnosisSuggestions(
      structuredClone(APPENDICITIS.encounter),
      APPENDICITIS.context,
      { engines: { legacy: getLegacyEngine(), active: mira }, mode: 'shadow' }
    );

    expect(stripVolatileFields(response)).toEqual(readGoldenRecording()['appendicitis-like']);
    await vi.waitFor(() => expect(auditSpy).toHaveBeenCalledTimes(1));
    expect(auditSpy.mock.calls[0][0].metadata).toMatchObject({
      engine_id: 'mira',
      status: 'ok',
      icd10_ranked: 'K35.8,A09',
      cannot_miss: 'K65.0',
    });
  });

  it('in shadow mode with its service down, the legacy output is unchanged', async () => {
    if (!APPENDICITIS) throw new Error('appendicitis golden case missing');
    const auditSpy = vi.spyOn(auditLogger, 'logShadowComparison');
    const mira = engineWith(async () => {
      throw new TypeError('Failed to fetch');
    });

    const response = await runDiagnosisSuggestions(
      structuredClone(APPENDICITIS.encounter),
      APPENDICITIS.context,
      { engines: { legacy: getLegacyEngine(), active: mira }, mode: 'shadow' }
    );

    expect(stripVolatileFields(response)).toEqual(readGoldenRecording()['appendicitis-like']);
    await vi.waitFor(() => expect(auditSpy).toHaveBeenCalledTimes(1));
    expect(auditSpy.mock.calls[0][0].metadata).toMatchObject({
      status: 'unavailable',
      error_code: 'NETWORK_ERROR',
    });
  });

  it('in shadow mode, the physician does not wait for MIRA', async () => {
    if (!APPENDICITIS) throw new Error('appendicitis golden case missing');
    const hanging: DiagnosisEngine = {
      id: 'mira',
      version: 'fake-hanging',
      step: () => new Promise(() => undefined),
    };

    const response = await runDiagnosisSuggestions(
      structuredClone(APPENDICITIS.encounter),
      APPENDICITIS.context,
      {
        engines: { legacy: getLegacyEngine(), active: hanging },
        mode: 'shadow',
        candidateTimeoutMs: 60_000,
      }
    );

    expect(stripVolatileFields(response)).toEqual(readGoldenRecording()['appendicitis-like']);
  });

  it('in mira mode, MIRA replaces only the diagnosis list, tagged MIRA, and the alerts stay legacy', async () => {
    if (!APPENDICITIS) throw new Error('appendicitis golden case missing');
    const mira = engineWith(async () => jsonResponse(OK_RESPONSE));

    const response = await runDiagnosisSuggestions(
      structuredClone(APPENDICITIS.encounter),
      APPENDICITIS.context,
      { engines: { legacy: getLegacyEngine(), active: mira }, mode: 'mira' }
    );

    const legacy = readGoldenRecording()['appendicitis-like'] as APIResponse<CDSSResponse>;
    const shown = stripVolatileFields(response) as APIResponse<CDSSResponse>;
    const { diagnosis_suggestions: miraList, ...rest } = shown.data ?? {};
    const { diagnosis_suggestions: _legacyList, ...legacyRest } = legacy.data ?? {};
    expect(rest).toEqual(legacyRest);
    expect(miraList?.map((entry) => [entry.icd_x, entry.engine_tag])).toEqual([
      ['K35.8', MIRA_TAG],
      ['A09', MIRA_TAG],
      ['K65.0', MIRA_CANNOT_MISS_TAG],
    ]);
  });

  it('in mira mode with its service down, the physician gets the legacy output and the notice', async () => {
    if (!APPENDICITIS) throw new Error('appendicitis golden case missing');
    const mira = engineWith(async () => {
      throw new TypeError('Failed to fetch');
    });

    const response = await runDiagnosisSuggestions(
      structuredClone(APPENDICITIS.encounter),
      APPENDICITIS.context,
      { engines: { legacy: getLegacyEngine(), active: mira }, mode: 'mira' }
    );

    const legacy = readGoldenRecording()['appendicitis-like'] as APIResponse<CDSSResponse>;
    expect(stripVolatileFields(response)).toEqual({
      ...legacy,
      data: { ...legacy.data, engine_notice: 'MIRA mati' },
    });
  });
});

describe('MIRA differential as side-panel suggestions', () => {
  const item = (
    icd10: string,
    confidenceTier: DiagnosisItem['confidenceTier'] = 'low',
    score?: number
  ): DiagnosisItem => ({
    icd10,
    label: `Label ${icd10}`,
    confidenceTier,
    ...(score === undefined ? {} : { score }),
  });
  const resultWith = (differential: EngineResult['differential']): EngineResult => ({
    ...createUnavailableResult({
      engineId: 'mira',
      version: 't',
      code: 'X',
      message: '',
      latencyMs: 0,
      traceId: 't',
    }),
    status: 'ok',
    differential,
  });

  it('keeps ICD codes the local knowledge base does not have', () => {
    const shown = miraDifferentialToSuggestions(
      resultWith({ likely: [item('Z99.9', 'high')], alternatives: [], cannotMiss: [] })
    );
    expect(shown).toMatchObject([
      { icd_x: 'Z99.9', nama: 'Label Z99.9', engine_tag: MIRA_TAG, rank: 1 },
    ]);
  });

  it('lists a code once, keeping its first place and the cannot-miss tag', () => {
    const shown = miraDifferentialToSuggestions(
      resultWith({
        likely: [item('K35.8', 'high')],
        alternatives: [item('A09')],
        cannotMiss: [item('k35.8')],
      })
    );
    expect(shown.map((entry) => [entry.icd_x, entry.engine_tag])).toEqual([
      ['K35.8', MIRA_CANNOT_MISS_TAG],
      ['A09', MIRA_TAG],
    ]);
  });

  it('always keeps cannot-miss entries within the five shown', () => {
    const shown = miraDifferentialToSuggestions(
      resultWith({
        likely: [item('A01'), item('A02'), item('A03')],
        alternatives: [item('B01'), item('B02'), item('B03')],
        cannotMiss: [item('C01'), item('C02')],
      })
    );
    expect(shown.map((entry) => entry.icd_x)).toEqual(['A01', 'A02', 'A03', 'C01', 'C02']);
  });

  it('never drops an entry below the side panel confidence floor', () => {
    const shown = miraDifferentialToSuggestions(
      resultWith({
        likely: [item('A01', 'high', 0.02)],
        alternatives: [item('A02', 'unknown')],
        cannotMiss: [],
      })
    );
    expect(shown.map((entry) => entry.confidence)).toEqual([0.1, 0.1]);
  });
});
