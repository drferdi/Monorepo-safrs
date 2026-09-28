/**
 * Runs the MIRA step ahead of the diagnosis page (from the Trajectory stage) and keeps the
 * result in memory by request hash, for the patient (case) it was made for. One live step per
 * hash and case; a failed step is not kept, so the page runs its own.
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
import { hashCanonical, hashDiagnosisContext } from './request-context';
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

export async function runMiraPrefetch(
  encounter: Encounter,
  context: DiagnosisRequestContext,
  deps: { engine?: DiagnosisEngine; timeoutMs?: number } = {}
): Promise<{ started: boolean; hash: string }> {
  const hash = hashDiagnosisContext(context);
  const caseState = encounterToCaseState(encounter, context);
  const caseKey = hashCanonical(caseState);
  if (peekPrefetch(hash)?.caseKey === caseKey) return { started: false, hash };
  rememberPrefetch(hash, { status: 'pending', caseKey });
  const engine = deps.engine ?? getActiveDiagnosisEngine('mira');
  const result = await stepWithTimeout(engine, caseState, deps.timeoutMs ?? CANDIDATE_TIMEOUT_MS);
  await recordCandidateRun(result, engine);
  // Another patient's prefetch with the same request may have replaced this entry meanwhile.
  if (peekPrefetch(hash)?.caseKey === caseKey) {
    if (result.status === 'ok') rememberPrefetch(hash, { status: 'done', caseKey, result });
    else forgetPrefetch(hash);
  }
  try {
    // Written after a failure too, so a waiting page asks again and runs its own step.
    await browser.storage.local.set({ [MIRA_PREFETCH_READY_KEY]: { hash, at: new Date().toISOString() } });
  } catch {
    // the page's fallback timer (PREFETCH_FALLBACK_MS) asks again without the ready record
  }
  return { started: true, hash };
}
