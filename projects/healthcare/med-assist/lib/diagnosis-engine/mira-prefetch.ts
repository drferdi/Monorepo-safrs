/**
 * Runs the MIRA step ahead of the diagnosis page (from the Trajectory stage) and keeps the
 * result in memory by request hash. One live step per hash per service-worker lifetime.
 *
 * @module lib/diagnosis-engine/mira-prefetch
 */
import { encounterToCaseState } from './case-state';
import { MIRA_PREFETCH_READY_KEY, peekPrefetch, rememberPrefetch } from './prefetch-store';
import { getActiveDiagnosisEngine } from './registry';
import { hashDiagnosisContext } from './request-context';
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
  if (peekPrefetch(hash)) return { started: false, hash };
  rememberPrefetch(hash, { status: 'pending' });
  const engine = deps.engine ?? getActiveDiagnosisEngine('mira');
  const result = await stepWithTimeout(
    engine,
    encounterToCaseState(encounter, context),
    deps.timeoutMs ?? CANDIDATE_TIMEOUT_MS
  );
  await recordCandidateRun(result, engine);
  rememberPrefetch(hash, { status: 'done', result });
  try {
    await browser.storage.local.set({ [MIRA_PREFETCH_READY_KEY]: { hash, at: new Date().toISOString() } });
  } catch {
    // the page will fall back to a normal request
  }
  return { started: true, hash };
}
