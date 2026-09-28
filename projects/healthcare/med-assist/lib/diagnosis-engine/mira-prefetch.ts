/**
 * Runs the MIRA step ahead of the diagnosis page (from the Trajectory stage) and keeps the
 * result in memory by case key (the hash of `encounterToCaseState`), so the page's request finds
 * it whenever it describes the same case, even when its fields fill in differently (e.g. the
 * page's keluhan_tambahan comes from the encounter, the Trajectory stage's is empty). One live
 * step per case; a failed step is not kept, so the page runs its own.
 *
 * @module lib/diagnosis-engine/mira-prefetch
 */
import { encounterToCaseState } from './case-state';
import {
  forgetPrefetch,
  MIRA_PREFETCH_READY_KEY,
  peekPrefetch,
  rememberPrefetch,
} from './prefetch-store';
import { getActiveDiagnosisEngine } from './registry';
import { hashCanonical } from './request-context';
import { CANDIDATE_TIMEOUT_MS, recordCandidateRun, stepWithTimeout } from './run-diagnosis';
import type { DiagnosisEngine } from './types';

import type { DiagnosisRequestContext } from '@/types/api';
import type { Encounter } from '~/utils/types';

export {
  MIRA_PREFETCH_READY_KEY,
  peekPrefetch,
  resetPrefetchMemory,
  type PrefetchEntry,
} from './prefetch-store';

/** `hash` is the case key the step is stored under (the `prefetchDiagnosis` reply's field name). */
export async function runMiraPrefetch(
  encounter: Encounter,
  context: DiagnosisRequestContext,
  deps: { engine?: DiagnosisEngine; timeoutMs?: number } = {}
): Promise<{ started: boolean; hash: string }> {
  const caseState = encounterToCaseState(encounter, context);
  const caseKey = hashCanonical(caseState);
  if (peekPrefetch(caseKey)) return { started: false, hash: caseKey };
  rememberPrefetch(caseKey, { status: 'pending' });
  const engine = deps.engine ?? getActiveDiagnosisEngine('mira');
  const result = await stepWithTimeout(engine, caseState, deps.timeoutMs ?? CANDIDATE_TIMEOUT_MS);
  await recordCandidateRun(result, engine);
  // Only the pending entry this call made is settled (it may have been evicted meanwhile).
  if (peekPrefetch(caseKey)?.status === 'pending') {
    if (result.status === 'ok') rememberPrefetch(caseKey, { status: 'done', result });
    else forgetPrefetch(caseKey);
  }
  try {
    // Written after a failure too, so a waiting page asks again and runs its own step.
    await browser.storage.local.set({
      [MIRA_PREFETCH_READY_KEY]: { key: caseKey, at: new Date().toISOString() },
    });
  } catch {
    // the page's fallback timer (PREFETCH_FALLBACK_MS) asks again without the ready record
  }
  return { started: true, hash: caseKey };
}
