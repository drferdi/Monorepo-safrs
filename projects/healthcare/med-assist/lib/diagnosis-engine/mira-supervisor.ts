/**
 * Asks the native messaging host `com.sentra.mira` to start the MIRA reasoning service and
 * publishes the service status to `storage.local` — only when the status changes, because the
 * side panel re-renders on every `storage.onChanged` event.
 *
 * @module lib/diagnosis-engine/mira-supervisor
 */

// `browser` is the WXT-provided global (same access pattern as mira-plan-model.ts).
// `browser.runtime.connectNative` is not in the webextension-polyfill types, so the native
// messaging port and the subset of `runtime` we use are typed locally instead of casting to `any`.

export type MiraStatusState = 'not-installed' | 'starting' | 'ready' | 'down' | 'failed';

export interface MiraStatus {
  state: MiraStatusState;
  reason?: string;
  checkedAt: string;
}

export const MIRA_STATUS_STORAGE_KEY = 'sentra:mira-status';
export const MIRA_HOST_NAME = 'com.sentra.mira';
const DEFAULT_POLL_MS = 500;
const DEFAULT_MAX_WAIT_MS = 30_000;

type HostReply =
  | { status: 'running' | 'starting'; port: number; pid?: number }
  | { status: 'failed'; reason: string };

interface NativePort {
  onMessage: { addListener(fn: (message: unknown) => void): void };
  onDisconnect: { addListener(fn: () => void): void };
  postMessage(message: unknown): void;
  disconnect(): void;
}

interface NativeMessagingRuntime {
  connectNative(name: string): NativePort;
  lastError?: { message?: string };
}

let lastPublished: MiraStatus | null = null;

export function resetMiraStatusMemory(): void {
  lastPublished = null;
}

/** The last status this module published, held in memory for controllers (e.g. run-diagnosis). */
export function getLastMiraStatus(): MiraStatus | null {
  return lastPublished ? { ...lastPublished } : null;
}

export async function publishMiraStatus(next: MiraStatus): Promise<boolean> {
  if (lastPublished === null) {
    try {
      const raw = await browser.storage.local.get(MIRA_STATUS_STORAGE_KEY);
      const stored = raw[MIRA_STATUS_STORAGE_KEY] as MiraStatus | undefined;
      if (stored) lastPublished = stored;
    } catch {
      // fall through: treat as never published
    }
  }
  if (lastPublished && lastPublished.state === next.state && lastPublished.reason === next.reason) {
    return false;
  }
  await browser.storage.local.set({ [MIRA_STATUS_STORAGE_KEY]: next });
  lastPublished = next;
  return true;
}

function askHost(): Promise<HostReply> {
  return new Promise((resolve, reject) => {
    const runtime = browser.runtime as unknown as NativeMessagingRuntime;
    const port = runtime.connectNative(MIRA_HOST_NAME);
    let settled = false;
    port.onMessage.addListener((message: unknown) => {
      settled = true;
      port.disconnect();
      resolve(message as HostReply);
    });
    port.onDisconnect.addListener(() => {
      if (!settled) reject(new Error(runtime.lastError?.message ?? 'host disconnected'));
    });
    port.postMessage({ cmd: 'ensure' });
  });
}

async function defaultHealth(): Promise<boolean> {
  const base = import.meta.env.VITE_MIRA_SERVICE_URL?.trim().replace(/\/+$/, '');
  if (!base) return false;
  try {
    const response = await fetch(`${base}/healthz`, { credentials: 'omit' });
    return response.ok;
  } catch {
    return false;
  }
}

export async function ensureMira(
  deps: { health?: () => Promise<boolean>; pollMs?: number; maxWaitMs?: number } = {}
): Promise<MiraStatus> {
  const health = deps.health ?? defaultHealth;
  const pollMs = deps.pollMs ?? DEFAULT_POLL_MS;
  const maxWaitMs = deps.maxWaitMs ?? DEFAULT_MAX_WAIT_MS;
  const stamp = () => new Date().toISOString();

  if (await health()) {
    const ready: MiraStatus = { state: 'ready', checkedAt: stamp() };
    await publishMiraStatus(ready);
    return ready;
  }

  let reply: HostReply;
  try {
    reply = await askHost();
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    const status: MiraStatus = /not found/i.test(message)
      ? { state: 'not-installed', checkedAt: stamp() }
      : { state: 'failed', reason: message, checkedAt: stamp() };
    await publishMiraStatus(status);
    return status;
  }
  if (reply.status === 'failed') {
    const status: MiraStatus = { state: 'failed', reason: reply.reason, checkedAt: stamp() };
    await publishMiraStatus(status);
    return status;
  }

  await publishMiraStatus({ state: 'starting', checkedAt: stamp() });
  const deadline = Date.now() + maxWaitMs;
  while (Date.now() < deadline) {
    if (await health()) {
      const ready: MiraStatus = { state: 'ready', checkedAt: stamp() };
      await publishMiraStatus(ready);
      return ready;
    }
    await new Promise((resolve) => setTimeout(resolve, pollMs));
  }
  const down: MiraStatus = { state: 'down', reason: 'no healthz answer', checkedAt: stamp() };
  await publishMiraStatus(down);
  return down;
}
