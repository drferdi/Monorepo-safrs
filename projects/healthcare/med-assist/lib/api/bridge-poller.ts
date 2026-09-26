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
const POLL_STALE_MS = 60_000; // 60s — if poll flag is stuck longer, force reset
const MAX_BACKOFF_MS = 5 * 60_000; // 5 minutes max backoff
let isPolling = false;
let pollStartedAt = 0;
let listenerRegistered = false;
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

let registeredExecutor: BridgeTransferExecutor | null = null;

/**
 * Register the transfer executor function.
 * Called from background.ts to wire up the RMETransferOrchestrator.
 */
export function registerBridgeExecutor(executor: BridgeTransferExecutor): void {
  registeredExecutor = executor;
  log.debug('[BridgePoller] Transfer executor registered');
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

  if (!listenerRegistered) {
    browser.alarms.onAlarm.addListener((alarm) => {
      if (alarm.name === ALARM_NAME) {
        pollOnce().catch((err) => log.error('[BridgePoller] Poll error:', err));
      }
    });
    listenerRegistered = true;
  }

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
 * Single poll cycle: fetch pending → claim → execute → report.
 */
async function pollOnce(): Promise<void> {
  // Guard: if poll flag stuck (MV3 Service Worker suspend/resume), force reset after 60s
  if (isPolling) {
    if (Date.now() - pollStartedAt < POLL_STALE_MS) {
      log.debug('[BridgePoller] Poll already in progress, skipping');
      return;
    }
    log.warn('[BridgePoller] Stale poll flag detected, force resetting');
  }
  isPolling = true;
  pollStartedAt = Date.now();

  const ready = await isBridgeReady();
  if (!ready) {
    isPolling = false;
    return;
  }
  // Backoff: skip if we're in a cooldown window from repeated network errors
  if (backoffUntilMs > Date.now()) {
    const remaining = Math.ceil((backoffUntilMs - Date.now()) / 1000);
    log.debug(`[BridgePoller] Backoff active — skipping poll (${remaining}s remaining)`);
    isPolling = false;
    return;
  }

  try {
    const pending = await fetchPendingEntries();
    consecutiveNetworkErrors = 0; // reset on success
    if (pending.length === 0) return;

    log.debug(`[BridgePoller] Found ${pending.length} pending entries`);

    // Process one at a time to avoid overwhelming ePuskesmas
    const entry = pending[0];
    await processEntry(entry);
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
  } finally {
    isPolling = false;
  }
}

async function processEntry(entry: BridgeEntry): Promise<void> {
  if (!registeredExecutor) {
    log.error('[BridgePoller] No transfer executor registered');
    return;
  }

  try {
    // Step 1: Claim the entry
    await claimEntry(entry.id);
    log.debug(
      `[BridgePoller] Claimed entry ${entry.id} (${entry.patientName || entry.pelayananId})`
    );

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

    await processEntry(pending[0]);
    return { found: pending.length, processed: true };
  } catch (error) {
    return {
      found: 0,
      processed: false,
      error: error instanceof Error ? error.message : String(error),
    };
  }
}
