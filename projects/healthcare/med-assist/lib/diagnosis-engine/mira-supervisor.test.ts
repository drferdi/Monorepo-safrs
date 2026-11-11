// lib/diagnosis-engine/mira-supervisor.test.ts
// @vitest-environment node
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import {
  MIRA_STATUS_STORAGE_KEY,
  ensureMira,
  getLastMiraStatus,
  publishMiraStatus,
  resetMiraStatusMemory,
  type MiraStatus,
} from './mira-supervisor';

const items: Record<string, unknown> = {};
const writes: Array<Record<string, unknown>> = [];

function fakeBrowser(port: { reply?: unknown; error?: string }) {
  return {
    storage: {
      local: {
        get: async (key: string) => (key in items ? { [key]: items[key] } : {}),
        set: async (values: Record<string, unknown>) => {
          writes.push(values);
          Object.assign(items, values);
        },
      },
    },
    runtime: {
      connectNative: (name: string) => {
        if (port.error) throw new Error(port.error);
        const listeners: Array<(msg: unknown) => void> = [];
        return {
          name,
          onMessage: { addListener: (fn: (msg: unknown) => void) => listeners.push(fn) },
          onDisconnect: { addListener: () => undefined },
          postMessage: () => queueMicrotask(() => listeners.forEach((fn) => fn(port.reply))),
          disconnect: () => undefined,
        };
      },
    },
  };
}

describe('mira-supervisor', () => {
  beforeEach(() => {
    for (const key of Object.keys(items)) delete items[key];
    writes.length = 0;
    resetMiraStatusMemory();
  });
  afterEach(() => vi.unstubAllGlobals());

  it('publishes a status only when state or reason changes', async () => {
    vi.stubGlobal('browser', fakeBrowser({}));
    const ready: MiraStatus = { state: 'ready', checkedAt: 't1' };
    expect(await publishMiraStatus(ready)).toBe(true);
    expect(await publishMiraStatus({ ...ready, checkedAt: 't2' })).toBe(false);
    expect(await publishMiraStatus({ state: 'down', reason: 'x', checkedAt: 't3' })).toBe(true);
    expect(writes).toHaveLength(2);
    expect(writes[0]).toEqual({ [MIRA_STATUS_STORAGE_KEY]: ready });
  });

  it('maps a missing host to not-installed and publishes it', async () => {
    vi.stubGlobal('browser', fakeBrowser({ error: 'Specified native messaging host not found.' }));
    const status = await ensureMira({ health: async () => false, pollMs: 1, maxWaitMs: 5 });
    expect(status.state).toBe('not-installed');
    expect(items[MIRA_STATUS_STORAGE_KEY]).toMatchObject({ state: 'not-installed' });
  });

  it('returns ready once healthz answers, with one starting and one ready write', async () => {
    vi.stubGlobal('browser', fakeBrowser({ reply: { status: 'starting', port: 8787, pid: 1 } }));
    let calls = 0;
    const status = await ensureMira({ health: async () => ++calls >= 3, pollMs: 1, maxWaitMs: 100 });
    expect(status.state).toBe('ready');
    expect(writes.map((w) => (w[MIRA_STATUS_STORAGE_KEY] as MiraStatus).state)).toEqual(['starting', 'ready']);
  });

  it('returns down when the service never answers within the wait', async () => {
    vi.stubGlobal('browser', fakeBrowser({ reply: { status: 'starting', port: 8787, pid: 1 } }));
    const status = await ensureMira({ health: async () => false, pollMs: 1, maxWaitMs: 5 });
    expect(status.state).toBe('down');
  });

  it('returns failed with the host reason', async () => {
    vi.stubGlobal('browser', fakeBrowser({ reply: { status: 'failed', reason: 'venv missing' } }));
    const status = await ensureMira({ health: async () => false, pollMs: 1, maxWaitMs: 5 });
    expect(status).toMatchObject({ state: 'failed', reason: 'venv missing' });
  });

  it('holds the last published status in memory for the controller', async () => {
    vi.stubGlobal('browser', fakeBrowser({}));
    expect(getLastMiraStatus()).toBeNull();
    const ready: MiraStatus = { state: 'ready', checkedAt: 't1' };
    await publishMiraStatus(ready);
    expect(getLastMiraStatus()).toEqual(ready);
  });
});
