// Designed and constructed by Drferdi.
/**
 * Sentra Assist — Dashboard Bridge Poller
 * Uses Chrome Alarms API to periodically poll for pending transfers.
 * Integrates with RMETransferOrchestrator to execute auto-fill.
 */

import { AuthRequiredError, BridgeApiError } from './authed-fetch';
import {
  type BridgeEntry,
  claimEntry,
  fetchEntryDetail,
  fetchPendingEntries,
  getBridgeConfig,
  isBridgeReady,
  reportComplete,
  reportFailed,
  reportProcessing,
} from './bridge-client';

import { createLogger } from '~/utils/logger';
import type { RMETransferPayload, RMETransferResult } from '~/utils/types';

const log = createLogger('BridgePoller', 'background');

const ALARM_NAME = 'sentra-bridge-poll';
const MAX_BACKOFF_MS = 5 * 60_000; // 5 minutes max backoff
const PAGE_READY_POLL_DELAY_MS = 800;
// One poll at a time. A transfer can run for minutes (three steps, each retried), so a second poll
// waits for it instead of resetting a "stale" flag and filling the same tab twice.
let inFlightPoll: Promise<void> | null = null;
// A poll asked for while one runs (a page that loaded meanwhile) runs once more right after it.
let pollRequestedDuringRun = false;
let listenerRegistered = false;
let pageReadyPollTimer: ReturnType<typeof setTimeout> | null = null;
let consecutiveNetworkErrors = 0;
let backoffUntilMs = 0;

/**
 * BridgeTransferExecutor type
 *
 * @remarks
 * TODO: Add type description and property documentation
 * Auto-generated on 2026-04-15
 */

export type BridgeTransferExecutor = (
  entryId: string,
  pelayananId: string,
  payload: RMETransferPayload
) => Promise<RMETransferResult>;

/** Whether a tab of this pelayanan is open, so its entry can be filled now. */
export type BridgeTargetProbe = (pelayananId: string) => Promise<boolean>;

let registeredExecutor: BridgeTransferExecutor | null = null;
let registeredTargetProbe: BridgeTargetProbe | null = null;

/**
 * Register the transfer executor function and the probe that says whether an entry's patient is
 * open. Called from background.ts to wire up the RMETransferOrchestrator.
 */
export function registerBridgeExecutor(
  executor: BridgeTransferExecutor,
  targetProbe: BridgeTargetProbe
): void {
  registeredExecutor = executor;
  registeredTargetProbe = targetProbe;
  log.debug('[BridgePoller] Transfer executor registered');
}

/**
 * Listen for the poll alarm. Called synchronously while the service worker starts: an alarm that
 * wakes a suspended worker is delivered only to listeners registered in that first turn.
 */
export function attachBridgeAlarmListener(): void {
  if (listenerRegistered) return;
  browser.alarms.onAlarm.addListener((alarm) => {
    if (alarm.name === ALARM_NAME) {
      pollOnce().catch((err) => log.error('[BridgePoller] Poll error:', err));
    }
  });
  listenerRegistered = true;
}

/**
 * Poll soon after an ePuskesmas page has loaded, so an entry waiting for that patient fills
 * without waiting for the next alarm. Page loads close together cause one poll.
 */
export function requestBridgePoll(): void {
  if (pageReadyPollTimer) clearTimeout(pageReadyPollTimer);
  pageReadyPollTimer = setTimeout(() => {
    pageReadyPollTimer = null;
    pollOnce().catch((err) => log.error('[BridgePoller] Poll error:', err));
  }, PAGE_READY_POLL_DELAY_MS);
}

/**
 * Start bridge polling using Chrome Alarms API.
 */
export async function startBridgePoller(): Promise<void> {
  const ready = await isBridgeReady();
  if (!ready) {
    log.debug(
      '[BridgePoller] Bridge not ready (disabled or not authenticated), skipping alarm setup'
    );
    return;
  }

  const config = await getBridgeConfig();

  const periodInMinutes = Math.max(0.5, config.pollIntervalMinutes || 0.5);

  await browser.alarms.create(ALARM_NAME, {
    delayInMinutes: 0.1,
    periodInMinutes,
  });

  log.debug(`[BridgePoller] Started — polling every ${periodInMinutes} minutes`);
}

/**
 * Stop bridge polling.
 */
export async function stopBridgePoller(): Promise<void> {
  await browser.alarms.clear(ALARM_NAME);
  log.debug('[BridgePoller] Stopped');
}

/**
 * Single poll cycle: fetch pending → keep the entries whose patient is open → claim → execute →
 * report. An entry whose patient is not open stays pending until that page is opened.
 */
function pollOnce(): Promise<void> {
  if (inFlightPoll) {
    log.debug('[BridgePoller] Poll already in progress, polling again after it');
    pollRequestedDuringRun = true;
    return inFlightPoll;
  }
  inFlightPoll = runPoll().finally(() => {
    inFlightPoll = null;
    if (pollRequestedDuringRun) {
      pollRequestedDuringRun = false;
      pollOnce().catch((err) => log.error('[BridgePoller] Poll error:', err));
    }
  });
  return inFlightPoll;
}

async function runPoll(): Promise<void> {
  const ready = await isBridgeReady();
  if (!ready) return;
  // Backoff: skip if we're in a cooldown window from repeated network errors
  if (backoffUntilMs > Date.now()) {
    const remaining = Math.ceil((backoffUntilMs - Date.now()) / 1000);
    log.debug(`[BridgePoller] Backoff active — skipping poll (${remaining}s remaining)`);
    return;
  }

  try {
    const pending = await fetchPendingEntries();
    consecutiveNetworkErrors = 0; // reset on success
    if (pending.length === 0) return;

    const openEntries = await selectEntriesWithOpenPatient(pending);
    log.debug(
      `[BridgePoller] Found ${pending.length} pending entries, ${openEntries.length} with the patient open`
    );

    // One at a time to avoid overwhelming ePuskesmas
    for (const entry of openEntries) {
      await processEntry(entry);
    }
  } catch (error) {
    const isAuthError =
      error instanceof AuthRequiredError ||
      (error instanceof BridgeApiError && (error.status === 401 || error.status === 403));

    if (isAuthError) {
      log.error(
        '[BridgePoller] Auth error detected — stopping poller. Cek: Settings → Bridge Automation Token harus sama dengan CREW_ACCESS_AUTOMATION_TOKEN pada backend Crew.'
      );
      await stopBridgePoller();
    } else {
      // Network / server error — apply exponential backoff
      consecutiveNetworkErrors++;
      const config = await getBridgeConfig().catch(() => ({ pollIntervalMinutes: 0.5 }));
      const baseMs = (config.pollIntervalMinutes || 0.5) * 60_000;
      const backoffMs = Math.min(
        baseMs * Math.pow(2, consecutiveNetworkErrors - 1),
        MAX_BACKOFF_MS
      );
      backoffUntilMs = Date.now() + backoffMs;
      log.warn(
        `[BridgePoller] Poll failed (attempt ${consecutiveNetworkErrors}) — backoff ${Math.round(backoffMs / 1000)}s:`,
        error
      );
    }
  }
}

async function selectEntriesWithOpenPatient(entries: BridgeEntry[]): Promise<BridgeEntry[]> {
  const probe = registeredTargetProbe;
  if (!probe) return [];
  const open: BridgeEntry[] = [];
  for (const entry of entries) {
    if (await probe(entry.pelayananId)) open.push(entry);
  }
  return open;
}

async function processEntry(entry: BridgeEntry): Promise<void> {
  if (!registeredExecutor) {
    log.error('[BridgePoller] No transfer executor registered');
    return;
  }

  // Step 1: Claim the entry. Only the claimant reports on it: when the claim fails (another
  // Assist took it, or it expired), skip the entry instead of reporting a failure.
  try {
    await claimEntry(entry.id);
  } catch (error) {
    const errorMsg = error instanceof Error ? error.message : String(error);
    log.warn(`[BridgePoller] Entry ${entry.id} not claimed: ${errorMsg}`);
    return;
  }
  log.debug(`[BridgePoller] Claimed entry ${entry.id} (${entry.patientName || entry.pelayananId})`);

  try {
    // Step 2: Fetch full payload
    const detail = await fetchEntryDetail(entry.id);

    // Step 3: Report processing
    await reportProcessing(entry.id);

    // Step 4: Execute transfer via registered executor
    const result = await registeredExecutor(entry.id, entry.pelayananId, detail.payload);

    // Step 5: Report result
    if (result.state === 'success' || result.state === 'partial') {
      await reportComplete(entry.id, result);
      log.debug(`[BridgePoller] Entry ${entry.id} completed: ${result.state}`);
    } else {
      const errorMsg = result.reasonCodes.join(', ') || 'Transfer failed';
      await reportFailed(entry.id, errorMsg, result);
      log.warn(`[BridgePoller] Entry ${entry.id} failed: ${errorMsg}`);
    }
  } catch (error) {
    const errorMsg = error instanceof Error ? error.message : String(error);
    log.error(`[BridgePoller] Entry ${entry.id} error:`, errorMsg);
    try {
      await reportFailed(entry.id, errorMsg);
    } catch {
      log.error(`[BridgePoller] Failed to report failure for ${entry.id}`);
    }
  }
}

/**
 * Manually trigger a single poll (for testing / UI button).
 */
export async function triggerManualPoll(): Promise<{
  found: number;
  processed: boolean;
  error?: string;
}> {
  const ready = await isBridgeReady();
  if (!ready)
    return { found: 0, processed: false, error: 'Bridge not ready (disabled or not logged in)' };

  try {
    const pending = await fetchPendingEntries();
    if (pending.length === 0) return { found: 0, processed: false };

    const [entry] = await selectEntriesWithOpenPatient(pending);
    if (!entry) return { found: pending.length, processed: false };
    await processEntry(entry);
    return { found: pending.length, processed: true };
  } catch (error) {
    return {
      found: 0,
      processed: false,
      error: error instanceof Error ? error.message : String(error),
    };
  }
}
