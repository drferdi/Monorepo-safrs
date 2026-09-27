// @vitest-environment node
/**
 * Contract tests for the MIRA reasoning service (`mira-step-*.schema.json`). The Python service
 * is to be built against the same schema files and the examples in `examples/`.
 *
 * Refresh the request example after a deliberate CaseState change:
 *   UPDATE_CONTRACT_EXAMPLES=1 node scripts/pnpm.mjs exec vitest run lib/diagnosis-engine/contract
 */

import { readFileSync, writeFileSync } from 'node:fs';
import { join, resolve } from 'node:path';

import { describe, expect, it } from 'vitest';

import { GOLDEN_CASES } from '../__golden__/cases';
import { isMiraCase, miraCaseToCaseState } from '../benchmark/mira-case';
import { encounterToCaseState } from '../case-state';
import { createUnavailableResult } from '../engine-result';
import { legacyResponseToEngineResult } from '../legacy-engine';
import { buildMiraStepRequest, validateMiraStepResponse } from '../mira-engine';
import { readGoldenRecording } from '../testing/golden';
import type { EngineResult } from '../types';

import requestSchema from './mira-step-request.schema.json';
import responseSchema from './mira-step-response.schema.json';
import { SUPPORTED_KEYWORDS, validateJson, type JsonSchema } from './validate-json';

import { assertNoPII } from '@/lib/api/pii-guard';
import type { APIResponse, CDSSResponse } from '@/types/api';

const EXAMPLES_DIR = resolve(__dirname, 'examples');
const REQUEST_EXAMPLE = join(EXAMPLES_DIR, 'mira-step-request.example.json');
const RESPONSE_EXAMPLE = join(EXAMPLES_DIR, 'mira-step-response.example.json');
const EXAMPLE_TRACE_ID = 'example-trace-0001';

function readJson(path: string): unknown {
  return JSON.parse(readFileSync(path, 'utf-8'));
}

function roundTrip<T>(value: T): T {
  return JSON.parse(JSON.stringify(value)) as T;
}

/** The response shape of an EngineResult: what a conforming service would have sent. */
function asServiceResponse(result: EngineResult): unknown {
  const { meta, ...rest } = result;
  return roundTrip({
    contractVersion: '1',
    ...rest,
    meta: { version: meta.version, model: meta.model, costUsd: meta.costUsd },
  });
}

function schemaKeywords(schema: unknown, found = new Set<string>()): Set<string> {
  if (!schema || typeof schema !== 'object') return found;
  const record = schema as JsonSchema;
  for (const key of Object.keys(record)) found.add(key);
  for (const nested of Object.values((record.properties ?? {}) as Record<string, unknown>)) {
    schemaKeywords(nested, found);
  }
  for (const nested of Object.values((record.$defs ?? {}) as Record<string, unknown>)) {
    schemaKeywords(nested, found);
  }
  if (record.items) schemaKeywords(record.items, found);
  return found;
}

function syntheticRequest() {
  const fixture = readJson(
    resolve(__dirname, '../benchmark/__fixtures__/synthetic_appendicitis_001.json')
  );
  if (!isMiraCase(fixture)) throw new Error('fixture is not a MIRA case');
  return roundTrip(buildMiraStepRequest(miraCaseToCaseState(fixture), EXAMPLE_TRACE_ID));
}

if (process.env.UPDATE_CONTRACT_EXAMPLES === '1') {
  writeFileSync(REQUEST_EXAMPLE, `${JSON.stringify(syntheticRequest(), null, 2)}\n`);
}

describe('MIRA contract schemas', () => {
  it.each([
    ['request', requestSchema],
    ['response', responseSchema],
  ])('the %s schema uses only keywords the validator enforces', (_name, schema) => {
    const unsupported = [...schemaKeywords(schema)].filter(
      (keyword) => !SUPPORTED_KEYWORDS.has(keyword)
    );
    expect(unsupported).toEqual([]);
  });

  it('the unfilled-field enum matches the TypeScript contract', () => {
    const allFields = createUnavailableResult({
      engineId: 'mira',
      version: 'v',
      code: 'X',
      message: 'x',
      latencyMs: null,
      traceId: 't',
    }).unfilled.map((entry) => entry.field);
    const schemaFields = (
      responseSchema.properties.unfilled.items.properties.field as { enum: string[] }
    ).enum;
    expect([...schemaFields].sort()).toEqual([...allFields].sort());
  });
});

describe('MIRA request contract', () => {
  it('the committed request example is the converted synthetic case and is valid', () => {
    const example = readJson(REQUEST_EXAMPLE);
    expect(example).toEqual(syntheticRequest());
    expect(validateJson(example, requestSchema as JsonSchema)).toEqual([]);
  });

  it('the committed request example passes the PII guard the client runs before sending', () => {
    expect(() => assertNoPII(readFileSync(REQUEST_EXAMPLE, 'utf-8'))).not.toThrow();
  });

  it.each(GOLDEN_CASES)('the request for golden case $id is valid', (goldenCase) => {
    const request = roundTrip(
      buildMiraStepRequest(encounterToCaseState(goldenCase.encounter, goldenCase.context), 't-1')
    );
    expect(validateJson(request, requestSchema as JsonSchema)).toEqual([]);
  });

  it('rejects a request carrying fields outside CaseState', () => {
    const valid = syntheticRequest();
    const request = { ...valid, case: { ...valid.case, patientName: 'not allowed' } };
    expect(validateJson(request, requestSchema as JsonSchema)).toContain(
      '$.case.patientName: not allowed'
    );
  });
});

describe('MIRA response contract', () => {
  it('the committed response example is valid', () => {
    expect(validateMiraStepResponse(readJson(RESPONSE_EXAMPLE))).toEqual([]);
  });

  it('an unavailable result is a valid response', () => {
    const unavailable = createUnavailableResult({
      engineId: 'mira',
      version: 'svc',
      code: 'TIMEOUT',
      message: 'late',
      latencyMs: 10,
      traceId: 't',
    });
    expect(validateMiraStepResponse(asServiceResponse(unavailable))).toEqual([]);
  });

  it.each(GOLDEN_CASES)(
    'the legacy engine result for $id fits the same contract (comparable in Gate 1)',
    (goldenCase) => {
      const recorded = readGoldenRecording()[goldenCase.id] as APIResponse<CDSSResponse>;
      const result = legacyResponseToEngineResult(recorded, { latencyMs: 1, traceId: 't' });
      expect(validateMiraStepResponse(asServiceResponse(result))).toEqual([]);
    }
  );

  it.each([
    ['an invented top-level field', { treatmentPlan: 'x' }, '$.treatmentPlan: not allowed'],
    ['an unknown status', { status: 'maybe' }, '$.status: expected one of ["ok","unavailable"]'],
    [
      'a score above 1',
      {
        differential: {
          likely: [{ icd10: 'K35.8', label: 'x', confidenceTier: 'high', score: 1.5 }],
          alternatives: [],
          cannotMiss: [],
        },
      },
      '$.differential.likely[0].score: above maximum 1',
    ],
    [
      'a disposition outside treat/refer',
      { disposition: { decision: 'observe', urgency: 'routine' } },
      '$.disposition.decision: expected one of ["treat","refer"]',
    ],
  ])('rejects %s', (_label, override, expectedError) => {
    const response = { ...(readJson(RESPONSE_EXAMPLE) as object), ...override };
    expect(validateMiraStepResponse(response)).toContain(expectedError);
  });

  it('rejects a response without the unfilled list', () => {
    const { unfilled: _unfilled, ...response } = readJson(RESPONSE_EXAMPLE) as Record<
      string,
      unknown
    >;
    expect(validateMiraStepResponse(response)).toContain('$.unfilled: required');
  });
});
