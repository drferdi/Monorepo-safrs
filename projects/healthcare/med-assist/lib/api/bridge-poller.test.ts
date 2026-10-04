import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import type { RMETransferResult, RMETransferStepStatus } from '~/utils/types';

import type { BridgeEntry } from './bridge-client';

const client = vi.hoisted(() => ({
  claimEntry: vi.fn(),
  fetchEntryDetail: vi.fn(),
  fetchPendingEntries: vi.fn(),
  getBridgeConfig: vi.fn(),
  isBridgeReady: vi.fn(),
  reportComplete: vi.fn(),
  reportFailed: vi.fn(),
  reportProcessing: vi.fn(),
}));

vi.mock('./bridge-client', () => client);

const entry = (id: string, pelayananId: string): BridgeEntry => ({
  id,
  status: 'pending',
  createdAt: '2026-10-03T08:00:00Z',
  createdBy: 'dashboard',
  pelayananId,
  hasAnamnesa: true,
  hasDiagnosa: false,
  hasResep: false,
});

const step = (name: RMETransferStepStatus) => ({
  step: name,
  state: 'success' as const,
  attempt: 1,
  latencyMs: 0,
  successCount: 1,
  failedCount: 0,
  skippedCount: 0,
});

const success: RMETransferResult = {
  runId: 'run-1',
  fingerprint: 'fp-1',
  state: 'success',
  startedAt: '2026-10-03T08:00:00Z',
  completedAt: '2026-10-03T08:00:01Z',
  totalLatencyMs: 1000,
  reasonCodes: [],
  steps: { anamnesa: step('anamnesa'), diagnosa: step('diagnosa'), resep: step('resep') },
};

type AlarmListener = (alarm: { name: string }) => void;
let alarmListeners: AlarmListener[] = [];

function fireAlarm(): void {
  alarmListeners.forEach((listener) => listener({ name: 'sentra-bridge-poll' }));
}

async function loadPoller() {
  return import('./bridge-poller');
}

describe('bridge poller', () => {
  beforeEach(() => {
    vi.resetModules();
    alarmListeners = [];
    vi.stubGlobal('browser', {
      alarms: {
        onAlarm: { addListener: (listener: AlarmListener) => alarmListeners.push(listener) },
        create: vi.fn(),
        clear: vi.fn(),
      },
    });
    Object.values(client).forEach((fn) => fn.mockReset());
    client.isBridgeReady.mockResolvedValue(true);
    client.getBridgeConfig.mockResolvedValue({ pollIntervalMinutes: 0.5 });
    client.fetchEntryDetail.mockImplementation(async (id: string) => ({ payload: { id } }));
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.unstubAllGlobals();
  });

  // An alarm that wakes a suspended service worker reaches only listeners registered in its first
  // synchronous turn.
  it('listens for the poll alarm synchronously', async () => {
    const { attachBridgeAlarmListener } = await loadPoller();

    attachBridgeAlarmListener();
    attachBridgeAlarmListener();

    expect(alarmListeners).toHaveLength(1);
  });

  it("claims and fills only the entries whose patient's page is open", async () => {
    const { attachBridgeAlarmListener, registerBridgeExecutor } = await loadPoller();
    const executor = vi.fn().mockResolvedValue(success);
    registerBridgeExecutor(executor, async (pelayananId) => pelayananId === '83206');
    client.fetchPendingEntries.mockResolvedValue([entry('e1', '90001'), entry('e2', '83206')]);
    attachBridgeAlarmListener();

    fireAlarm();
    await vi.waitFor(() => expect(client.reportComplete).toHaveBeenCalled());

    expect(client.claimEntry.mock.calls).toEqual([['e2']]);
    expect(executor.mock.calls).toEqual([['e2', '83206', { id: 'e2' }]]);
  });

  // A 409 on claim means another Assist owns the entry; reporting a failure would mark its work failed.
  it('does not report a failure for an entry it could not claim', async () => {
    const { attachBridgeAlarmListener, registerBridgeExecutor } = await loadPoller();
    const executor = vi.fn().mockResolvedValue(success);
    registerBridgeExecutor(executor, async () => true);
    client.fetchPendingEntries.mockResolvedValue([entry('e1', '83206')]);
    client.claimEntry.mockRejectedValue(new Error('Entry tidak tersedia untuk diklaim.'));
    attachBridgeAlarmListener();

    fireAlarm();
    await vi.waitFor(() => expect(client.claimEntry).toHaveBeenCalledWith('e1'));
    await new Promise((resolve) => setTimeout(resolve, 0));

    expect(client.reportFailed).not.toHaveBeenCalled();
    expect(executor).not.toHaveBeenCalled();
  });

  it('leaves every entry pending when no patient of theirs is open', async () => {
    const { attachBridgeAlarmListener, registerBridgeExecutor } = await loadPoller();
    const executor = vi.fn().mockResolvedValue(success);
    const probe = vi.fn().mockResolvedValue(false);
    registerBridgeExecutor(executor, probe);
    client.fetchPendingEntries.mockResolvedValue([entry('e1', '90001')]);
    attachBridgeAlarmListener();

    fireAlarm();
    await vi.waitFor(() => expect(probe).toHaveBeenCalledWith('90001'));

    expect(client.claimEntry).not.toHaveBeenCalled();
    expect(executor).not.toHaveBeenCalled();
  });

  it('starts no second transfer while one is still filling, and polls once more after it', async () => {
    const { attachBridgeAlarmListener, registerBridgeExecutor } = await loadPoller();
    let running = 0;
    let maxRunning = 0;
    const finishers: Array<(value: RMETransferResult) => void> = [];
    const executor = vi.fn(
      (_entryId: string) =>
        new Promise<RMETransferResult>((resolve) => {
          running += 1;
          maxRunning = Math.max(maxRunning, running);
          finishers.push((value) => {
            running -= 1;
            resolve(value);
          });
        })
    );
    registerBridgeExecutor(executor, async () => true);
    client.fetchPendingEntries
      .mockResolvedValueOnce([entry('e1', '83206')])
      .mockResolvedValue([entry('e2', '83206')]);
    attachBridgeAlarmListener();

    fireAlarm();
    await vi.waitFor(() => expect(executor).toHaveBeenCalledTimes(1));
    fireAlarm();
    fireAlarm();
    finishers[0]?.(success);
    await vi.waitFor(() => expect(executor).toHaveBeenCalledTimes(2));
    finishers[1]?.(success);
    await vi.waitFor(() => expect(client.reportComplete).toHaveBeenCalledTimes(2));

    expect(maxRunning).toBe(1);
    expect(executor.mock.calls.map(([id]) => id)).toEqual(['e1', 'e2']);
    expect(client.fetchPendingEntries).toHaveBeenCalledTimes(2);
  });

  it('polls once shortly after ePuskesmas pages load', async () => {
    vi.useFakeTimers();
    const { registerBridgeExecutor, requestBridgePoll } = await loadPoller();
    registerBridgeExecutor(vi.fn().mockResolvedValue(success), async () => false);
    client.fetchPendingEntries.mockResolvedValue([]);

    requestBridgePoll();
    requestBridgePoll();
    await vi.advanceTimersByTimeAsync(1000);

    expect(client.fetchPendingEntries).toHaveBeenCalledTimes(1);
  });
});
