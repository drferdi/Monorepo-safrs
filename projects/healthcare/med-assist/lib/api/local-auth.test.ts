import { beforeEach, describe, expect, it } from 'vitest';

import {
  bootstrapOrVerifyLocalAccount,
  clearLocalAccount,
  hasLocalAccount,
  LOCAL_SESSION_TOKEN,
} from './local-auth';

// In-memory browser.storage.local so the module's global `browser` works in node.
function installStorage(): void {
  const store = new Map<string, unknown>();
  (globalThis as typeof globalThis & { browser?: unknown }).browser = {
    storage: {
      local: {
        get: async (key: string) => (store.has(key) ? { [key]: store.get(key) } : {}),
        set: async (items: Record<string, unknown>) => {
          for (const [k, v] of Object.entries(items)) store.set(k, v);
        },
        remove: async (key: string) => {
          store.delete(key);
        },
      },
    },
  };
}

beforeEach(() => {
  installStorage();
});

describe('local-auth (Mode Lokal)', () => {
  it('first login bootstraps the device-local account and returns an admin local session', async () => {
    expect(await hasLocalAccount()).toBe(false);

    const session = await bootstrapOrVerifyLocalAccount('sentraone', 'Delia#2105210');

    expect(session).not.toBeNull();
    expect(session?.user.username).toBe('sentraone');
    expect(session?.user.role).toBe('admin');
    expect(session?.tokens.accessToken).toBe(LOCAL_SESSION_TOKEN);
    expect(session?.tokens.expiresAt).toBeGreaterThan(Date.now());
    // founder profile niceties
    expect(session?.user.name).toMatch(/Ferdi/);
    expect(await hasLocalAccount()).toBe(true);
  });

  it('subsequent login with the correct password verifies against the stored account', async () => {
    await bootstrapOrVerifyLocalAccount('sentraone', 'Delia#2105210');

    const again = await bootstrapOrVerifyLocalAccount('sentraone', 'Delia#2105210');
    expect(again).not.toBeNull();
    expect(again?.user.username).toBe('sentraone');
  });

  it('rejects a wrong password against an existing account (no re-bootstrap)', async () => {
    await bootstrapOrVerifyLocalAccount('sentraone', 'Delia#2105210');

    const wrong = await bootstrapOrVerifyLocalAccount('sentraone', 'salah');
    expect(wrong).toBeNull();
  });

  it('rejects a different username once an account exists', async () => {
    await bootstrapOrVerifyLocalAccount('sentraone', 'Delia#2105210');

    const other = await bootstrapOrVerifyLocalAccount('someoneelse', 'Delia#2105210');
    expect(other).toBeNull();
  });

  it('empty username or password is rejected', async () => {
    expect(await bootstrapOrVerifyLocalAccount('', 'x')).toBeNull();
    expect(await bootstrapOrVerifyLocalAccount('sentraone', '')).toBeNull();
  });

  it('clearLocalAccount removes the account so a fresh bootstrap can happen', async () => {
    await bootstrapOrVerifyLocalAccount('sentraone', 'Delia#2105210');
    await clearLocalAccount();
    expect(await hasLocalAccount()).toBe(false);

    // A new password now bootstraps a fresh account (no wrong-password lockout).
    const fresh = await bootstrapOrVerifyLocalAccount('sentraone', 'BaruLagi#99');
    expect(fresh).not.toBeNull();
  });
});
