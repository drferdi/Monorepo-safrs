// Local (offline) account — lets the extension be used on a single device
// without any backend. Intentional, documented mode (see DECISIONS.md
// [2026-07-05] "Mode Lokal"), NOT the silently-hidden bypass that was closed
// earlier: the credential is verified against a PBKDF2 hash stored device-local
// in browser.storage.local, and the session it mints carries a distinct
// `local-session` marker (so it is never confused with the rejected synthetic
// dev/offline/fallback tokens).
//
// When a real backend base URL is configured, auth-client routes to the server
// instead and this module is bypassed.
//
// `browser` is the WXT/extension global (same pattern as auth-client.ts) — no
// import so tests can polyfill globalThis.browser.
import type { AuthSession, AuthUser } from './auth-store';

const LOCAL_ACCOUNT_KEY = 'sentra:local-account';

/** Distinct from the rejected `dev-token-*`/`offline-token-*`/`fallback-token-*`. */
export const LOCAL_SESSION_TOKEN = 'local-session';

const LOCAL_SESSION_TTL_MS = 12 * 60 * 60 * 1000;
const PBKDF2_ITERATIONS = 210_000;

interface StoredLocalAccount {
  username: string;
  displayName: string;
  facilityName: string;
  poli: string;
  salt: string; // base64
  hash: string; // base64, PBKDF2-SHA256, 256-bit
  createdAt: number;
}

function bytesToBase64(bytes: Uint8Array): string {
  let binary = '';
  for (let i = 0; i < bytes.byteLength; i += 1) binary += String.fromCharCode(bytes[i]);
  return btoa(binary);
}

function base64ToBytes(base64: string): Uint8Array {
  const raw = atob(base64);
  const bytes = new Uint8Array(raw.length);
  for (let i = 0; i < raw.length; i += 1) bytes[i] = raw.charCodeAt(i);
  return bytes;
}

async function derivePbkdf2(password: string, salt: Uint8Array): Promise<string> {
  const enc = new TextEncoder();
  const keyMaterial = await crypto.subtle.importKey('raw', enc.encode(password), 'PBKDF2', false, [
    'deriveBits',
  ]);
  const bits = await crypto.subtle.deriveBits(
    { name: 'PBKDF2', salt: salt as BufferSource, iterations: PBKDF2_ITERATIONS, hash: 'SHA-256' },
    keyMaterial,
    256
  );
  return bytesToBase64(new Uint8Array(bits));
}

async function readStoredAccount(): Promise<StoredLocalAccount | null> {
  try {
    const raw = await browser.storage.local.get(LOCAL_ACCOUNT_KEY);
    const account = raw[LOCAL_ACCOUNT_KEY] as StoredLocalAccount | undefined;
    if (!account?.username || !account.salt || !account.hash) return null;
    return account;
  } catch {
    return null;
  }
}

export async function hasLocalAccount(): Promise<boolean> {
  return (await readStoredAccount()) !== null;
}

/** Nice defaults for the founder account; generic for anyone else. */
function profileForUsername(username: string): {
  displayName: string;
  facilityName: string;
  poli: string;
} {
  if (username.trim().toLowerCase() === 'sentraone') {
    return {
      displayName: 'dr Ferdi Iskandar. SH MKN CLM CMDC',
      facilityName: 'Puskesmas Balowerti Kota Kediri',
      poli: 'Dokter',
    };
  }
  return { displayName: username.trim(), facilityName: 'Sentra Assist (Lokal)', poli: 'Umum' };
}

function sessionFromAccount(account: StoredLocalAccount): AuthSession {
  const user: AuthUser = {
    id: `local:${account.username}`,
    username: account.username,
    name: account.displayName || account.username,
    role: 'admin',
    facilityId: account.facilityName.toUpperCase().replace(/\s+/g, '_'),
    facilityName: account.facilityName,
    poli: account.poli,
  };
  return {
    user,
    tokens: {
      accessToken: LOCAL_SESSION_TOKEN,
      refreshToken: LOCAL_SESSION_TOKEN,
      expiresAt: Date.now() + LOCAL_SESSION_TTL_MS,
    },
    serverBaseUrl: '',
  };
}

/**
 * First call with a given username/password creates the device-local account
 * (bootstrap); later calls verify against it. Returns a session on success,
 * `null` on a wrong password against an existing account.
 */
export async function bootstrapOrVerifyLocalAccount(
  username: string,
  password: string
): Promise<AuthSession | null> {
  const trimmedUser = username.trim();
  if (!trimmedUser || !password) return null;

  const existing = await readStoredAccount();

  if (!existing) {
    const salt = crypto.getRandomValues(new Uint8Array(16));
    const hash = await derivePbkdf2(password, salt);
    const profile = profileForUsername(trimmedUser);
    const account: StoredLocalAccount = {
      username: trimmedUser,
      displayName: profile.displayName,
      facilityName: profile.facilityName,
      poli: profile.poli,
      salt: bytesToBase64(salt),
      hash,
      createdAt: Date.now(),
    };
    await browser.storage.local.set({ [LOCAL_ACCOUNT_KEY]: account });
    return sessionFromAccount(account);
  }

  if (trimmedUser.toLowerCase() !== existing.username.toLowerCase()) return null;
  const candidate = await derivePbkdf2(password, base64ToBytes(existing.salt));
  if (candidate !== existing.hash) return null;
  return sessionFromAccount(existing);
}

/** Remove the device-local account (used when switching to a real backend). */
export async function clearLocalAccount(): Promise<void> {
  try {
    await browser.storage.local.remove(LOCAL_ACCOUNT_KEY);
  } catch {
    /* best-effort */
  }
}
