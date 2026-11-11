// Designed and constructed by Drferdi.
/**
 * OpenAI credential store — runtime-only, per-installation.
 *
 * The OpenAI API key is a SECRET and must never be baked into the built
 * extension bundle. It is therefore NOT read from `import.meta.env` (which
 * Vite inlines at build time and ships to every user). Instead the physician
 * enters it once through the Settings UI and it is persisted to
 * `browser.storage.local` — device-local, never synced to a cloud account,
 * never part of the distributable artifact.
 *
 * The model name is not a secret; it is stored alongside the key purely so
 * the physician can override the build-time default without a code change.
 *
 * All reads fail closed: any error or missing value yields an empty key, and
 * the caller (llm-reasoner) then degrades to deterministic KB-only mode.
 *
 * @module lib/iskandar-diagnosis-engine/openai-key-store
 */

// `browser` is the WXT-provided global (same access pattern as lib/api/bridge-client.ts);
// intentionally not imported from 'wxt/browser' so it resolves to the live global at
// runtime and to the test-injected globalThis.browser under vitest.

/** Storage key for the OpenAI runtime credentials. */
export const OPENAI_CONFIG_STORAGE_KEY = 'sentra:openai:config';

/**
 * Runtime OpenAI configuration entered by the physician via Settings.
 */
export interface StoredOpenAIConfig {
  /** OpenAI API key. Empty string means "not configured". */
  apiKey: string;

  /** Optional model override (e.g. "gpt-4o-mini"). Empty/undefined = use build default. */
  model?: string;
}

const EMPTY_CONFIG: StoredOpenAIConfig = { apiKey: '' };

/**
 * Read the stored OpenAI config from device-local extension storage.
 *
 * Fail-closed: on any error, or when nothing is stored, returns an empty
 * config ({ apiKey: '' }) so the reranker degrades to KB-only mode rather
 * than throwing.
 */
export async function getStoredOpenAIConfig(): Promise<StoredOpenAIConfig> {
  try {
    const raw = await browser.storage.local.get(OPENAI_CONFIG_STORAGE_KEY);
    const stored = raw[OPENAI_CONFIG_STORAGE_KEY] as Partial<StoredOpenAIConfig> | undefined;
    if (!stored || typeof stored.apiKey !== 'string') {
      return EMPTY_CONFIG;
    }
    const cleaned: StoredOpenAIConfig = { apiKey: stored.apiKey };
    if (typeof stored.model === 'string' && stored.model.trim().length > 0) {
      cleaned.model = stored.model.trim();
    }
    return cleaned;
  } catch {
    return EMPTY_CONFIG;
  }
}

/**
 * Persist the OpenAI config to device-local extension storage.
 *
 * The key is trimmed; a blank key is stored as an empty string, which the
 * reader treats as "not configured".
 */
export async function saveStoredOpenAIConfig(config: StoredOpenAIConfig): Promise<void> {
  const toStore: StoredOpenAIConfig = {
    apiKey: (config.apiKey ?? '').trim(),
  };
  if (typeof config.model === 'string' && config.model.trim().length > 0) {
    toStore.model = config.model.trim();
  }
  await browser.storage.local.set({ [OPENAI_CONFIG_STORAGE_KEY]: toStore });
}
