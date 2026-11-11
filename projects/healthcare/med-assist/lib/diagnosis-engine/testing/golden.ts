/**
 * Access to the recorded legacy outputs (`__golden__/legacy-outputs.json`) for tests.
 *
 * @module lib/diagnosis-engine/testing/golden
 */

import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

import type { APIResponse, CDSSResponse } from '@/types/api';

export const GOLDEN_PATH = resolve(__dirname, '../__golden__/legacy-outputs.json');

export type GoldenRecording = Record<string, unknown>;

// Alert ids are `alert-<Date.now()>-<random>`; only the id is masked, never the alert content.
const VOLATILE_ALERT_ID = /^alert-\d+-[a-z0-9]+$/;

/**
 * Removes the only values that differ on every run: `meta.timestamp`, `meta.processing_time_ms`
 * and generated alert ids. Everything else is compared as recorded.
 */
export function stripVolatileFields(response: APIResponse<CDSSResponse>): unknown {
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

export function readGoldenRecording(): GoldenRecording {
  return JSON.parse(readFileSync(GOLDEN_PATH, 'utf-8')) as GoldenRecording;
}
