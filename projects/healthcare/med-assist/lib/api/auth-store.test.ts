import { beforeEach, describe, expect, it, vi } from 'vitest';
import { clearSession, getSession, storeSession } from './auth-store';

const browserSessionSet = vi.fn();
const browserSessionGet = vi.fn();
const browserSessionRemove = vi.fn();
const browserLocalSet = vi.fn();
const browserLocalGet = vi.fn();
const browserLocalRemove = vi.fn();

const chromeLocalStore = new Map<string, unknown>();
const chromeSessionStore = new Map<string, unknown>();

beforeEach(() => {
  browserSessionSet.mockReset();
  browserSessionGet.mockReset();
  browserSessionRemove.mockReset();
  browserLocalSet.mockReset();
  browserLocalGet.mockReset();
  browserLocalRemove.mockReset();
  chromeLocalStore.clear();
  chromeSessionStore.clear();

  browserSessionSet.mockRejectedValue(new Error('browser session write failed'));
  browserSessionGet.mockRejectedValue(new Error('browser session read failed'));
  browserSessionRemove.mockRejectedValue(new Error('browser session remove failed'));
  browserLocalSet.mockRejectedValue(new Error('browser local write failed'));
  browserLocalGet.mockRejectedValue(new Error('browser local read failed'));
  browserLocalRemove.mockRejectedValue(new Error('browser local remove failed'));

  (
    globalThis as typeof globalThis & {
      browser?: {
        storage: {
          session: {
            set: typeof browserSessionSet;
            get: typeof browserSessionGet;
            remove: typeof browserSessionRemove;
          };
          local: {
            set: typeof browserLocalSet;
            get: typeof browserLocalGet;
            remove: typeof browserLocalRemove;
          };
        };
      };
      chrome?: {
        storage: {
          session: {
            set(items: Record<string, unknown>, callback?: () => void): void;
            get(key: string, callback: (items: Record<string, unknown>) => void): void;
            remove(key: string, callback?: () => void): void;
          };
          local: {
            set(items: Record<string, unknown>, callback?: () => void): void;
            get(key: string, callback: (items: Record<string, unknown>) => void): void;
            remove(key: string, callback?: () => void): void;
          };
        };
      };
    }
  ).browser = {
    storage: {
      session: {
        set: browserSessionSet,
        get: browserSessionGet,
        remove: browserSessionRemove,
      },
      local: {
        set: browserLocalSet,
        get: browserLocalGet,
        remove: browserLocalRemove,
      },
    },
  };

  (
    globalThis as typeof globalThis & {
      chrome?: {
        storage: {
          session: {
            set(items: Record<string, unknown>, callback?: () => void): void;
            get(key: string, callback: (items: Record<string, unknown>) => void): void;
            remove(key: string, callback?: () => void): void;
          };
          local: {
            set(items: Record<string, unknown>, callback?: () => void): void;
            get(key: string, callback: (items: Record<string, unknown>) => void): void;
            remove(key: string, callback?: () => void): void;
          };
        };
      };
    }
  ).chrome = {
    storage: {
      session: {
        set(items, callback) {
          for (const [key, value] of Object.entries(items)) {
            chromeSessionStore.set(key, value);
          }
          callback?.();
        },
        get(key, callback) {
          callback({ [key]: chromeSessionStore.get(key) });
        },
        remove(key, callback) {
          chromeSessionStore.delete(key);
          callback?.();
        },
      },
      local: {
        set(items, callback) {
          for (const [key, value] of Object.entries(items)) {
            chromeLocalStore.set(key, value);
          }
          callback?.();
        },
        get(key, callback) {
          callback({ [key]: chromeLocalStore.get(key) });
        },
        remove(key, callback) {
          chromeLocalStore.delete(key);
          callback?.();
        },
      },
    },
  };
});

describe('auth-store chrome fallback', () => {
  it('persists, reads, and clears session through chrome.storage fallback when browser.storage fails', async () => {
    const session = {
      user: {
        id: 'drferdi',
        username: 'drferdi',
        name: 'dr. Ferdi Iskandar',
        role: 'doctor' as const,
        facilityId: 'PUSKESMAS_BALOWERTI',
        facilityName: 'Puskesmas Balowerti',
        poli: 'Umum',
      },
      tokens: {
        accessToken: 'cookie-session',
        refreshToken: 'cookie-session',
        expiresAt: Date.now() + 60 * 60 * 1000,
      },
      serverBaseUrl: 'http://localhost:43123',
    };

    await storeSession(session);

    expect(chromeSessionStore.get('sentra:active-session')).toMatchObject({
      user: { username: 'drferdi' },
    });
    expect(chromeLocalStore.get('sentra:persisted-session')).toMatchObject({
      user: { username: 'drferdi' },
    });

    await expect(getSession()).resolves.toMatchObject({
      user: { username: 'drferdi' },
      serverBaseUrl: 'http://localhost:43123',
    });

    await clearSession();

    expect(chromeSessionStore.has('sentra:active-session')).toBe(false);
    expect(chromeLocalStore.has('sentra:persisted-session')).toBe(false);
  });
});
