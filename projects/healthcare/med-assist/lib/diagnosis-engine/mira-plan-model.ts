/**
 * Planning model for the MIRA reasoning service, picked by a developer or admin in the side
 * panel and sent with each step as the `X-MIRA-Plan-Model` header.
 *
 * - The options come from `VITE_MIRA_PLAN_MODELS` (comma-separated, per build); unset = no
 *   picker and no header, so the service uses its own default.
 * - The service accepts only models on its own allowlist and refuses anything else before any
 *   model call, so this list only decides what the picker offers.
 * - The choice is not a secret; it is kept in `browser.storage.local` (device-local). Reads fail
 *   closed to "service default".
 *
 * @module lib/diagnosis-engine/mira-plan-model
 */

// `browser` is the WXT-provided global (same access pattern as openai-key-store.ts).

export const MIRA_PLAN_MODEL_HEADER = 'X-MIRA-Plan-Model';
export const MIRA_PLAN_MODEL_STORAGE_KEY = 'sentra:mira-plan-model';

export function listMiraPlanModels(raw: unknown = import.meta.env.VITE_MIRA_PLAN_MODELS): string[] {
  if (typeof raw !== 'string') return [];
  const names = raw
    .split(',')
    .map((name) => name.trim())
    .filter((name) => name.length > 0);
  return [...new Set(names)];
}

/** The stored choice when it is still offered; otherwise undefined (service default). */
export async function getMiraPlanModel(): Promise<string | undefined> {
  try {
    const raw = await browser.storage.local.get(MIRA_PLAN_MODEL_STORAGE_KEY);
    const stored: unknown = raw[MIRA_PLAN_MODEL_STORAGE_KEY];
    return typeof stored === 'string' && listMiraPlanModels().includes(stored) ? stored : undefined;
  } catch {
    return undefined;
  }
}

/** Store a choice; undefined returns to the service default. */
export async function setMiraPlanModel(model: string | undefined): Promise<void> {
  if (model) {
    await browser.storage.local.set({ [MIRA_PLAN_MODEL_STORAGE_KEY]: model });
  } else {
    await browser.storage.local.remove(MIRA_PLAN_MODEL_STORAGE_KEY);
  }
}
