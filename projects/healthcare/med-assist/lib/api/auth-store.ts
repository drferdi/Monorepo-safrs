// Ghost Protocols — Unified Auth Store
// Single source of truth for auth session across all extension contexts.
// Dual-layer: chrome.storage.session (RAM, secure) + chrome.storage.local (persist across browser restart).

import { createLogger } from '~/utils/logger';

const log = createLogger('AuthStore', 'background');

// ============================================================================
// KEYS
// ============================================================================

const SESSION_KEY = 'sentra:active-session';
const PERSIST_KEY = 'sentra:persisted-session';

// ============================================================================
// TYPES
// ============================================================================

export interface AuthUser {
  id: string;
  username: string;
  name: string;
  role: 'doctor' | 'nurse' | 'admin';
  facilityId: string;
  facilityName: string;
  poli?: string;
}

/**
 * AuthTokens interface
 *
 * @remarks
 * TODO: Add type description and property documentation
 * Auto-generated on 2026-04-15
 */

export interface AuthTokens {
  accessToken: string;
  refreshToken: string;
  expiresAt: number;
}

/**
 * AuthSession interface
 *
 * @remarks
 * TODO: Add type description and property documentation
 * Auto-generated on 2026-04-15
 */

export interface AuthSession {
  user: AuthUser;
  tokens: AuthTokens;
  serverBaseUrl: string;
}

type StorageScope = 'local' | 'session';

type PromiseStorageArea = {
  get(key: string): Promise<Record<string, unknown>>;
  set(items: Record<string, unknown>): Promise<void>;
  remove(key: string): Promise<void>;
};

function getPromiseStorageArea(scope: StorageScope): PromiseStorageArea | null {
  const browserApi = (
    globalThis as typeof globalThis & {
      browser?: {
        storage?: {
          local?: PromiseStorageArea;
          session?: PromiseStorageArea;
        };
      };
    }
  ).browser;

  return browserApi?.storage?.[scope] ?? null;
}

function getChromeStorageArea(scope: StorageScope):
  | {
      get(
        key: string,
        callback: (items: Record<string, unknown>) => void
      ): void;
      set(items: Record<string, unknown>, callback?: () => void): void;
      remove(key: string, callback?: () => void): void;
    }
  | null {
  const chromeApi = (
    globalThis as typeof globalThis & {
      chrome?: {
        storage?: {
          local?: {
            get(key: string, callback: (items: Record<string, unknown>) => void): void;
            set(items: Record<string, unknown>, callback?: () => void): void;
            remove(key: string, callback?: () => void): void;
          };
          session?: {
            get(key: string, callback: (items: Record<string, unknown>) => void): void;
            set(items: Record<string, unknown>, callback?: () => void): void;
            remove(key: string, callback?: () => void): void;
          };
        };
      };
    }
  ).chrome;

  return chromeApi?.storage?.[scope] ?? null;
}

async function storageSet(scope: StorageScope, key: string, value: unknown): Promise<void> {
  const browserArea = getPromiseStorageArea(scope);
  if (browserArea) {
    try {
      await browserArea.set({ [key]: value });
      return;
    } catch (error) {
      log.warn(`[AuthStore] browser.storage.${scope}.set failed, trying chrome fallback`, error);
    }
  }

  const chromeArea = getChromeStorageArea(scope);
  if (!chromeArea) {
    throw new Error(`No ${scope} storage API available`);
  }

  await new Promise<void>((resolve) => chromeArea.set({ [key]: value }, resolve));
}

async function storageGet<T>(scope: StorageScope, key: string): Promise<T | null> {
  const browserArea = getPromiseStorageArea(scope);
  if (browserArea) {
    try {
      const result = await browserArea.get(key);
      return (result[key] as T | undefined) ?? null;
    } catch (error) {
      log.warn(`[AuthStore] browser.storage.${scope}.get failed, trying chrome fallback`, error);
    }
  }

  const chromeArea = getChromeStorageArea(scope);
  if (!chromeArea) {
    return null;
  }

  return await new Promise<T | null>((resolve) =>
    chromeArea.get(key, (items) => resolve((items[key] as T | undefined) ?? null))
  );
}

async function storageRemove(scope: StorageScope, key: string): Promise<void> {
  const browserArea = getPromiseStorageArea(scope);
  if (browserArea) {
    try {
      await browserArea.remove(key);
      return;
    } catch (error) {
      log.warn(`[AuthStore] browser.storage.${scope}.remove failed, trying chrome fallback`, error);
    }
  }

  const chromeArea = getChromeStorageArea(scope);
  if (!chromeArea) {
    throw new Error(`No ${scope} storage API available`);
  }

  await new Promise<void>((resolve) => chromeArea.remove(key, resolve));
}

function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function waitForSessionReadable(expected: AuthSession): Promise<void> {
  for (let attempt = 0; attempt < 6; attempt += 1) {
    const sessionScoped = await storageGet<AuthSession>('session', SESSION_KEY).catch(() => null);
    const persistedScoped = await storageGet<AuthSession>('local', PERSIST_KEY).catch(() => null);
    const candidate = sessionScoped ?? persistedScoped;

    if (
      candidate?.tokens?.accessToken === expected.tokens.accessToken &&
      candidate?.user?.username === expected.user.username
    ) {
      return;
    }

    await delay(100);
  }

  log.warn('[AuthStore] Session write not readable after retry window', {
    username: expected.user.username,
  });
}

// ============================================================================
// WRITE — dual-layer store
// ============================================================================

export async function storeSession(session: AuthSession): Promise<void> {
  try {
    await storageSet('session', SESSION_KEY, session);
  } catch (e) {
    log.warn('[AuthStore] session storage write failed (expected in content script)', e);
  }

  try {
    await storageSet('local', PERSIST_KEY, session);
  } catch (e) {
    log.warn('[AuthStore] local storage write failed', e);
  }

  await waitForSessionReadable(session);
  log.debug('[AuthStore] Session stored for:', session.user.username);
}

// ============================================================================
// READ — session first (fast/secure), local fallback (persist)
// ============================================================================

export async function getSession(): Promise<AuthSession | null> {
  // Try in-memory session storage first
  try {
    const session = await storageGet<AuthSession>('session', SESSION_KEY);
    if (session?.tokens?.accessToken) {
      return session;
    }
  } catch {
    // session storage not available in this context — fall through
  }

  // Fallback to persisted local storage
  try {
    const persisted = await storageGet<AuthSession>('local', PERSIST_KEY);
    if (persisted?.tokens?.accessToken) {
      // Re-promote to session storage for faster reads
      try {
        await storageSet('session', SESSION_KEY, persisted);
      } catch {
        // Best effort — session storage may not be available
      }
      return persisted;
    }
  } catch (e) {
    log.warn('[AuthStore] Failed to read persisted session', e);
  }

  return null;
}

// ============================================================================
// CLEAR
// ============================================================================

export async function clearSession(): Promise<void> {
  try {
    await storageRemove('session', SESSION_KEY);
  } catch {
    // May not be available
  }

  try {
    await storageRemove('local', PERSIST_KEY);
  } catch (e) {
    log.warn('[AuthStore] Failed to clear persisted session', e);
  }

  log.debug('[AuthStore] Session cleared');
}

// ============================================================================
// HELPERS
// ============================================================================

export async function isAuthenticated(): Promise<boolean> {
  const session = await getSession();
  if (!session) return false;

  // Check token expiration (with 1 min buffer)
  return session.tokens.expiresAt > Date.now() + 60_000;
}

/**
 * getAccessToken
 *
 * @remarks
 * TODO: Add detailed description, parameters, and examples
 * Auto-generated on 2026-04-15
 */

export async function getAccessToken(): Promise<string | null> {
  const session = await getSession();
  return session?.tokens?.accessToken ?? null;
}

/**
 * getServerBaseUrl
 *
 * @remarks
 * TODO: Add detailed description, parameters, and examples
 * Auto-generated on 2026-04-15
 */

export async function getServerBaseUrl(): Promise<string | null> {
  const session = await getSession();
  return session?.serverBaseUrl ?? null;
}

/** Storage key constants — used by background.ts to listen for changes */
export const AUTH_STORE_KEYS = {
  session: SESSION_KEY,
  persisted: PERSIST_KEY,
} as const;
