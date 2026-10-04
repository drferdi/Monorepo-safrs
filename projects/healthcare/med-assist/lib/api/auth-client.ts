// Ghost Protocols — Auth Client
// Backend authentication integration for Sentra Assist
// Uses unified auth-store as single source of truth for session.

import {
  isAuthenticated as checkAuthenticated,
  clearSession as clearAuthStore,
  getSession,
  storeSession,
  type AuthSession,
  type AuthTokens,
  type AuthUser,
} from './auth-store';
import { bootstrapOrVerifyLocalAccount, hasLocalAccount, LOCAL_SESSION_TOKEN } from './local-auth';

import { createLogger } from '~/utils/logger';

const log = createLogger('AuthClient', 'background');

// ============================================================================
// TYPES (re-export from auth-store for backwards compatibility)
// ============================================================================

export type { AuthSession, AuthTokens, AuthUser };

/**
 * AuthCredentials interface
 *
 * @remarks
 * TODO: Add type description and property documentation
 * Auto-generated on 2026-04-15
 */

export interface AuthCredentials {
  username: string;
  password: string;
}

/**
 * AuthResponse interface
 *
 * @remarks
 * TODO: Add type description and property documentation
 * Auto-generated on 2026-04-15
 */

export interface AuthResponse {
  success: boolean;
  session?: AuthSession;
  error?: {
    code: string;
    message: string;
  };
}

// ============================================================================
// CONFIG
// ============================================================================

export const AUTH_CONFIG_KEY = 'sentra:auth-config';

// No backend by default. Empty base URL = "Mode Lokal" — login is verified
// device-local (lib/api/local-auth.ts) with no server. Set a real base URL via
// the Settings UI once a backend exists; server login then takes over.
const DEFAULT_AUTH_BASE_URL = '';
const COOKIE_SESSION_ACCESS_TOKEN = 'cookie-session';
const COOKIE_SESSION_REFRESH_TOKEN = 'cookie-session';

interface AuthConfig {
  baseUrl: string;
  automationToken: string;
}

interface StoredSessionRetryOptions {
  attempts?: number;
  intervalMs?: number;
}

type DashboardSessionResponse = {
  ok: boolean;
  user?: {
    username?: string;
    displayName?: string;
    role?: string;
    institution?: string;
    profession?: string;
  };
  expiresAt?: string | number;
  error?: string;
};

const DEFAULT_CONFIG: AuthConfig = {
  baseUrl: DEFAULT_AUTH_BASE_URL,
  automationToken: '',
};

function isCrewDomain(baseUrl: string): boolean {
  try {
    const hostname = new URL(baseUrl).hostname.toLowerCase();
    return hostname === 'crew.puskesmasbalowerti.com';
  } catch {
    return false;
  }
}

function isSyntheticLocalSession(session: AuthSession): boolean {
  const accessToken = session.tokens.accessToken;
  return (
    accessToken.startsWith('dev-token-') ||
    accessToken.startsWith('offline-token-') ||
    accessToken.startsWith('fallback-token-')
  );
}

// ============================================================================
// CONFIG MANAGEMENT
// ============================================================================

export async function getAuthConfig(): Promise<AuthConfig> {
  try {
    const raw = await browser.storage.local.get(AUTH_CONFIG_KEY);
    const stored = raw[AUTH_CONFIG_KEY] as Partial<AuthConfig> | undefined;
    if (!stored) return DEFAULT_CONFIG;

    return {
      baseUrl: stored.baseUrl?.trim() || DEFAULT_CONFIG.baseUrl,
      automationToken: stored.automationToken?.trim() || DEFAULT_CONFIG.automationToken,
    };
  } catch (e) {
    log.warn('[AuthClient] Failed to load config:', e);
    return DEFAULT_CONFIG;
  }
}

/**
 * saveAuthConfig
 *
 * @remarks
 * TODO: Add detailed description, parameters, and examples
 * Auto-generated on 2026-04-15
 */

export async function saveAuthConfig(config: Partial<AuthConfig>): Promise<AuthConfig> {
  const current = await getAuthConfig();
  const updated = {
    ...current,
    ...config,
    baseUrl: config.baseUrl?.trim() || current.baseUrl,
    automationToken: config.automationToken?.trim() || '',
  };
  await browser.storage.local.set({ [AUTH_CONFIG_KEY]: updated });
  const existingSession = await getSession();
  if (existingSession) {
    await storeSession({
      ...existingSession,
      serverBaseUrl: updated.baseUrl,
    });
  }
  return updated;
}

// ============================================================================
// SESSION MANAGEMENT — delegates to unified auth-store
// ============================================================================

export async function getStoredSession(): Promise<AuthSession | null> {
  const session = await getSession();
  if (!session) return null;

  // Check token expiration (with 5 min buffer)
  if (session.tokens.expiresAt < Date.now() + 5 * 60 * 1000) {
    log.debug('[AuthClient] Session expired');
    await clearAuthStore();
    return null;
  }

  if (isSyntheticLocalSession(session)) {
    log.warn('[AuthClient] Rejecting legacy synthetic local session');
    await clearAuthStore();
    return null;
  }

  // Mode Lokal: session minted device-local. Accept only while the local
  // account still exists (guards against cleared/switched storage).
  if (session.tokens.accessToken === LOCAL_SESSION_TOKEN) {
    if (!(await hasLocalAccount())) {
      await clearAuthStore();
      return null;
    }
    return session;
  }

  // Cookie-backed sessions: skip re-verification via Dashboard ping.
  // verifyDashboardSession() calls /api/auth/session with credentials:include,
  // which does not work cross-origin from a Chrome extension context —
  // cookies are not forwarded and the check always fails, clearing valid sessions.
  // The session was already verified at login time; expiry check above is sufficient.

  return session;
}

function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export async function getStoredSessionWithRetry(
  options: StoredSessionRetryOptions = {}
): Promise<AuthSession | null> {
  const attempts = Math.max(1, options.attempts ?? 1);
  const intervalMs = Math.max(0, options.intervalMs ?? 0);

  for (let attempt = 0; attempt < attempts; attempt += 1) {
    const session = await getStoredSession();
    if (session) {
      return session;
    }

    if (attempt < attempts - 1 && intervalMs > 0) {
      await delay(intervalMs);
    }
  }

  return null;
}

/**
 * saveSession
 *
 * @remarks
 * TODO: Add detailed description, parameters, and examples
 * Auto-generated on 2026-04-15
 */

export async function saveSession(session: AuthSession): Promise<void> {
  await storeSession(session);
  log.debug('[AuthClient] Session saved for user:', session.user.username);
}

/**
 * clearSession
 *
 * @remarks
 * TODO: Add detailed description, parameters, and examples
 * Auto-generated on 2026-04-15
 */

export async function clearSession(): Promise<void> {
  await clearAuthStore();
  log.debug('[AuthClient] Session cleared');
}

/**
 * isAuthenticated
 *
 * @remarks
 * TODO: Add detailed description, parameters, and examples
 * Auto-generated on 2026-04-15
 */

export async function isAuthenticated(): Promise<boolean> {
  const session = await getStoredSession();
  if (!session) return false;
  return checkAuthenticated();
}

// ============================================================================
// HTTP CLIENT
// ============================================================================

async function authFetch<T>(
  endpoint: string,
  options: RequestInit = {}
): Promise<
  { success: true; data: T } | { success: false; error: { code: string; message: string } }
> {
  const config = await getAuthConfig();
  const url = `${config.baseUrl.replace(/\/$/, '')}${endpoint}`;

  const correlationId = `auth-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;

  log.debug(`[AuthFetch] ${options.method || 'GET'} ${url}`, { correlationId });

  try {
    const response = await fetch(url, {
      ...options,
      credentials: 'include',
      headers: {
        'Content-Type': 'application/json',
        'X-Correlation-Id': correlationId,
        ...options.headers,
      },
    });

    if (!response.ok) {
      const errorText = await response.text().catch(() => 'Unknown error');
      log.error(`[AuthFetch] ${response.status}: ${errorText}`, { correlationId });

      return {
        success: false,
        error: {
          code: `HTTP_${response.status}`,
          message: parseErrorMessage(response.status, errorText),
        },
      };
    }

    const data = await response.json();
    return { success: true, data };
  } catch (error) {
    log.error('[AuthFetch] Network error:', error);
    return {
      success: false,
      error: {
        code: 'NETWORK_ERROR',
        message: 'Tidak dapat terhubung ke server. Periksa koneksi internet Anda.',
      },
    };
  }
}

// MedBoard sends its crew roles (DOKTER, BIDAN, CEO, ...); Assist knows doctor, nurse and admin.
const ADMIN_ROLES = new Set([
  'admin',
  'administrator',
  'ceo',
  'chief_executive_officer',
  'kepala_puskesmas',
  'ceo_sentra',
]);
const NURSE_ROLES = new Set(['nurse', 'perawat', 'bidan', 'triage_officer', 'apoteker']);

function normalizeRole(role: unknown): AuthUser['role'] {
  const normalized = String(role ?? '')
    .trim()
    .toLowerCase();
  if (ADMIN_ROLES.has(normalized)) return 'admin';
  if (NURSE_ROLES.has(normalized)) return 'nurse';
  return 'doctor';
}

function toExpiryTimestamp(expiresAt: string | number | undefined): number {
  if (typeof expiresAt === 'number' && Number.isFinite(expiresAt)) {
    // Unix seconds (< 1e10) → convert to ms. Already-ms values pass through.
    return expiresAt < 1e10 ? expiresAt * 1000 : expiresAt;
  }
  if (typeof expiresAt === 'string') {
    const parsed = Date.parse(expiresAt);
    if (!Number.isNaN(parsed)) return parsed;
  }
  return Date.now() + 12 * 60 * 60 * 1000;
}

function createCookieBackedSession(
  payload: NonNullable<DashboardSessionResponse['user']>,
  baseUrl: string,
  expiresAt: string | number | undefined
): AuthSession {
  const username = String(payload.username ?? '')
    .trim()
    .toLowerCase();
  const facilityName = String(payload.institution ?? 'Crew Dashboard').trim() || 'Crew Dashboard';
  const profession = String(payload.profession ?? '').trim() || 'Umum';

  return {
    user: {
      id: username || `crew-${Date.now()}`,
      username: username || 'crew',
      name: String(payload.displayName ?? username).trim() || username || 'Crew',
      role: normalizeRole(payload.role),
      facilityId: facilityName.toUpperCase().replace(/\s+/g, '_'),
      facilityName,
      poli: profession,
    },
    tokens: {
      accessToken: COOKIE_SESSION_ACCESS_TOKEN,
      refreshToken: COOKIE_SESSION_REFRESH_TOKEN,
      expiresAt: toExpiryTimestamp(expiresAt),
    },
    serverBaseUrl: baseUrl,
  };
}

function parseErrorMessage(status: number, text: string): string {
  try {
    const parsed = JSON.parse(text);
    if (parsed.message) return parsed.message;
    if (parsed.error) return parsed.error;
  } catch {
    // Not JSON, use text as-is
  }

  switch (status) {
    case 401:
      return 'Username atau password salah';
    case 403:
      return 'Akun tidak memiliki akses';
    case 429:
      return 'Terlalu banyak percobaan. Silakan coba lagi nanti.';
    case 500:
      return 'Terjadi kesalahan server. Silakan coba lagi.';
    default:
      return text || `Error ${status}`;
  }
}

/**
 * ApiBaseUrlProbeResult interface
 *
 * @remarks
 * TODO: Add type description and property documentation
 * Auto-generated on 2026-04-15
 */

export interface ApiBaseUrlProbeResult {
  ok: boolean;
  status: number;
  message: string;
}

/**
 * probeApiBaseUrl
 *
 * @remarks
 * TODO: Add detailed description, parameters, and examples
 * Auto-generated on 2026-04-15
 */

export async function probeApiBaseUrl(baseUrl: string): Promise<ApiBaseUrlProbeResult> {
  const sanitizedBaseUrl = baseUrl.trim().replace(/\/$/, '');
  if (!sanitizedBaseUrl) {
    return { ok: false, status: 0, message: 'Base URL kosong.' };
  }

  const url = `${sanitizedBaseUrl}/api/auth/login`;
  const crewDomain = isCrewDomain(sanitizedBaseUrl);
  try {
    const response = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username: '__probe__', password: '__probe__' }),
    });

    const contentType = response.headers.get('content-type') || '';
    const rawBody = await response.text().catch(() => '');
    const body = rawBody.trim().toLowerCase();
    const htmlResponse = contentType.includes('text/html') || body.startsWith('<!doctype html');
    const backendAppMissing = body.includes('application not found');

    if (htmlResponse) {
      return {
        ok: false,
        status: response.status,
        message: 'URL ini membalas HTML (web page), bukan API JSON. Gunakan host API backend.',
      };
    }

    if (response.status === 404) {
      if (backendAppMissing) {
        return {
          ok: false,
          status: response.status,
          message:
            'Host Crew merespons backend tanpa aplikasi aktif. Periksa sertifikat, mapping domain, dan service target backend Crew.',
        };
      }
      return {
        ok: false,
        status: response.status,
        message: 'Endpoint /api/auth/login tidak ditemukan di host ini (404).',
      };
    }

    if (response.status === 401 || response.status === 400 || response.ok) {
      return {
        ok: true,
        status: response.status,
        message: `API terjangkau (status ${response.status}).`,
      };
    }

    return {
      ok: false,
      status: response.status,
      message: `Host merespons status ${response.status}. Periksa gateway/API route.`,
    };
  } catch {
    return {
      ok: false,
      status: 0,
      message: crewDomain
        ? 'Tidak dapat menjangkau host Crew API. Periksa sertifikat TLS, mapping domain, dan jaringan.'
        : 'Tidak dapat menjangkau host API. Periksa URL/jaringan.',
    };
  }
}

// ============================================================================
// AUTH API
// ============================================================================

/**
 * Login. Two modes, chosen by whether a backend base URL is configured:
 *
 * - Mode Lokal (baseUrl kosong): kredensial diverifikasi device-local via
 *   local-auth.ts, tanpa server. Login pertama membuat akun lokal.
 * - Mode Server (baseUrl diisi): POST /api/auth/login ke Crew Dashboard API;
 *   server balas cookie sesi ber-signature HMAC (crew-access-auth.ts), body
 *   respons hanya profil user — sesi dibungkus createCookieBackedSession().
 */
export async function login(credentials: AuthCredentials): Promise<AuthResponse> {
  const config = await getAuthConfig();
  const baseUrl = config.baseUrl.replace(/\/$/, '');
  const username = credentials.username.trim();

  if (!baseUrl) {
    const session = await bootstrapOrVerifyLocalAccount(username, credentials.password);
    if (!session) {
      return {
        success: false,
        error: { code: 'LOGIN_FAILED', message: 'Username atau password salah.' },
      };
    }
    await saveSession(session);
    return { success: true, session };
  }

  try {
    const res = await fetch(`${baseUrl}/api/auth/login`, {
      method: 'POST',
      credentials: 'include',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username, password: credentials.password }),
    });

    const rawBody = await res.text();

    if (!res.ok) {
      return {
        success: false,
        error: { code: 'LOGIN_FAILED', message: parseErrorMessage(res.status, rawBody) },
      };
    }

    const data = JSON.parse(rawBody) as DashboardSessionResponse;
    if (!data.ok || !data.user) {
      return {
        success: false,
        error: { code: 'LOGIN_FAILED', message: data.error ?? 'Login gagal. Coba lagi.' },
      };
    }

    const session = createCookieBackedSession(data.user, baseUrl, data.expiresAt);
    await saveSession(session);
    return { success: true, session };
  } catch {
    return {
      success: false,
      error: { code: 'NETWORK_ERROR', message: 'Tidak dapat menghubungi server. Periksa koneksi.' },
    };
  }
}

// ============================================================================
// PASSKEY (WebAuthn) — additive login mechanism, hand-rolled (no new
// dependency in the extension bundle). See auth-client.ts on the backend for
// the matching server-side implementation.
// ============================================================================

interface PasskeyRegistrationOptionsJSON {
  challenge: string;
  rp: { name: string; id?: string };
  user: { id: string; name: string; displayName: string };
  pubKeyCredParams: PublicKeyCredentialParameters[];
  excludeCredentials?: { id: string; type: 'public-key'; transports?: AuthenticatorTransport[] }[];
  authenticatorSelection?: AuthenticatorSelectionCriteria;
  attestation?: AttestationConveyancePreference;
  timeout?: number;
}

interface PasskeyAuthenticationOptionsJSON {
  challenge: string;
  rpId?: string;
  allowCredentials?: { id: string; type: 'public-key'; transports?: AuthenticatorTransport[] }[];
  userVerification?: UserVerificationRequirement;
  timeout?: number;
}

function base64urlToBuffer(base64url: string): ArrayBuffer {
  const padding = '='.repeat((4 - (base64url.length % 4)) % 4);
  const base64 = (base64url + padding).replace(/-/g, '+').replace(/_/g, '/');
  const raw = atob(base64);
  const bytes = new Uint8Array(raw.length);
  for (let i = 0; i < raw.length; i += 1) bytes[i] = raw.charCodeAt(i);
  return bytes.buffer;
}

function bufferToBase64url(buffer: ArrayBuffer): string {
  const bytes = new Uint8Array(buffer);
  let binary = '';
  for (let i = 0; i < bytes.byteLength; i += 1) binary += String.fromCharCode(bytes[i]);
  return btoa(binary).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

/** Passkey/WebAuthn not supported in this environment (unsupported browser context, etc). */
function isPasskeySupported(): boolean {
  return typeof window !== 'undefined' && typeof window.PublicKeyCredential !== 'undefined';
}

/**
 * Register a new passkey for the currently signed-in user. Requires an
 * existing session (login with username/password first) — this is an
 * enrollment step, not an account-creation flow.
 */
export async function registerPasskey(): Promise<AuthResponse> {
  if (!isPasskeySupported()) {
    return {
      success: false,
      error: { code: 'PASSKEY_UNSUPPORTED', message: 'Passkey tidak didukung di browser ini.' },
    };
  }

  const config = await getAuthConfig();
  const baseUrl = config.baseUrl.replace(/\/$/, '');

  try {
    const optionsRes = await fetch(`${baseUrl}/api/auth/passkey/generate-registration-options`, {
      method: 'POST',
      credentials: 'include',
    });
    const optionsRawBody = await optionsRes.text();
    if (!optionsRes.ok) {
      return {
        success: false,
        error: {
          code: 'PASSKEY_REGISTER_FAILED',
          message: parseErrorMessage(optionsRes.status, optionsRawBody),
        },
      };
    }

    const { options } = JSON.parse(optionsRawBody) as { options: PasskeyRegistrationOptionsJSON };

    const credential = (await navigator.credentials.create({
      publicKey: {
        ...options,
        challenge: base64urlToBuffer(options.challenge),
        user: { ...options.user, id: base64urlToBuffer(options.user.id) },
        excludeCredentials: options.excludeCredentials?.map((cred) => ({
          ...cred,
          id: base64urlToBuffer(cred.id),
        })),
      },
    })) as PublicKeyCredential | null;

    if (!credential) {
      return {
        success: false,
        error: { code: 'PASSKEY_CANCELLED', message: 'Pendaftaran passkey dibatalkan.' },
      };
    }

    const attestation = credential.response as AuthenticatorAttestationResponse;
    const verifyRes = await fetch(`${baseUrl}/api/auth/passkey/verify-registration`, {
      method: 'POST',
      credentials: 'include',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        response: {
          id: credential.id,
          rawId: bufferToBase64url(credential.rawId),
          type: credential.type,
          response: {
            clientDataJSON: bufferToBase64url(attestation.clientDataJSON),
            attestationObject: bufferToBase64url(attestation.attestationObject),
            transports: attestation.getTransports?.() ?? [],
          },
          clientExtensionResults: credential.getClientExtensionResults(),
        },
      }),
    });

    const verifyRawBody = await verifyRes.text();
    if (!verifyRes.ok) {
      return {
        success: false,
        error: {
          code: 'PASSKEY_REGISTER_FAILED',
          message: parseErrorMessage(verifyRes.status, verifyRawBody),
        },
      };
    }

    const verifyData = JSON.parse(verifyRawBody) as { ok: boolean; error?: string };
    if (!verifyData.ok) {
      return {
        success: false,
        error: {
          code: 'PASSKEY_REGISTER_FAILED',
          message: verifyData.error ?? 'Pendaftaran passkey gagal.',
        },
      };
    }

    return { success: true };
  } catch (error) {
    if (error instanceof Error && error.name === 'NotAllowedError') {
      return {
        success: false,
        error: { code: 'PASSKEY_CANCELLED', message: 'Pendaftaran passkey dibatalkan.' },
      };
    }
    return {
      success: false,
      error: { code: 'NETWORK_ERROR', message: 'Tidak dapat menghubungi server. Periksa koneksi.' },
    };
  }
}

/**
 * Log in with a discoverable passkey — no username needed up front; the
 * browser resolves which credential to use and the server identifies the
 * account from the credential ID.
 */
export async function loginWithPasskey(): Promise<AuthResponse> {
  if (!isPasskeySupported()) {
    return {
      success: false,
      error: { code: 'PASSKEY_UNSUPPORTED', message: 'Passkey tidak didukung di browser ini.' },
    };
  }

  const config = await getAuthConfig();
  const baseUrl = config.baseUrl.replace(/\/$/, '');

  try {
    const optionsRes = await fetch(`${baseUrl}/api/auth/passkey/generate-authentication-options`, {
      method: 'POST',
    });
    const optionsRawBody = await optionsRes.text();
    if (!optionsRes.ok) {
      return {
        success: false,
        error: {
          code: 'LOGIN_FAILED',
          message: parseErrorMessage(optionsRes.status, optionsRawBody),
        },
      };
    }

    const { options } = JSON.parse(optionsRawBody) as { options: PasskeyAuthenticationOptionsJSON };

    const credential = (await navigator.credentials.get({
      publicKey: {
        ...options,
        challenge: base64urlToBuffer(options.challenge),
        allowCredentials: options.allowCredentials?.map((cred) => ({
          ...cred,
          id: base64urlToBuffer(cred.id),
        })),
      },
    })) as PublicKeyCredential | null;

    if (!credential) {
      return {
        success: false,
        error: { code: 'PASSKEY_CANCELLED', message: 'Login dengan passkey dibatalkan.' },
      };
    }

    const assertion = credential.response as AuthenticatorAssertionResponse;
    const verifyRes = await fetch(`${baseUrl}/api/auth/passkey/verify-authentication`, {
      method: 'POST',
      credentials: 'include',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        response: {
          id: credential.id,
          rawId: bufferToBase64url(credential.rawId),
          type: credential.type,
          response: {
            clientDataJSON: bufferToBase64url(assertion.clientDataJSON),
            authenticatorData: bufferToBase64url(assertion.authenticatorData),
            signature: bufferToBase64url(assertion.signature),
            userHandle: assertion.userHandle ? bufferToBase64url(assertion.userHandle) : undefined,
          },
          clientExtensionResults: credential.getClientExtensionResults(),
        },
      }),
    });

    const verifyRawBody = await verifyRes.text();
    if (!verifyRes.ok) {
      return {
        success: false,
        error: {
          code: 'LOGIN_FAILED',
          message: parseErrorMessage(verifyRes.status, verifyRawBody),
        },
      };
    }

    const data = JSON.parse(verifyRawBody) as DashboardSessionResponse;
    if (!data.ok || !data.user) {
      return {
        success: false,
        error: { code: 'LOGIN_FAILED', message: data.error ?? 'Login dengan passkey gagal.' },
      };
    }

    const session = createCookieBackedSession(data.user, baseUrl, data.expiresAt);
    await saveSession(session);
    return { success: true, session };
  } catch (error) {
    if (error instanceof Error && error.name === 'NotAllowedError') {
      return {
        success: false,
        error: { code: 'PASSKEY_CANCELLED', message: 'Login dengan passkey dibatalkan.' },
      };
    }
    return {
      success: false,
      error: { code: 'NETWORK_ERROR', message: 'Tidak dapat menghubungi server. Periksa koneksi.' },
    };
  }
}

/**
 * Logout - clear session and optionally invalidate token on server
 */
export async function logout(): Promise<void> {
  const session = await getStoredSession();

  if (session) {
    try {
      await fetch(`${session.serverBaseUrl.replace(/\/$/, '')}/api/auth/logout`, {
        method: 'POST',
        credentials: 'include',
      });
    } catch {
      // Ignore errors during logout
    }
  }

  await clearSession();
}

/**
 * Refresh access token using refresh token
 */
export async function refreshToken(): Promise<AuthResponse> {
  const session = await getStoredSession();
  if (!session) {
    return {
      success: false,
      error: { code: 'NO_SESSION', message: 'Tidak ada sesi aktif' },
    };
  }

  if (
    session.tokens.accessToken === COOKIE_SESSION_ACCESS_TOKEN &&
    session.tokens.refreshToken === COOKIE_SESSION_REFRESH_TOKEN
  ) {
    try {
      const response = await fetch(`${session.serverBaseUrl.replace(/\/$/, '')}/api/auth/session`, {
        method: 'GET',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
      });

      if (!response.ok) {
        await clearSession();
        return {
          success: false,
          error: {
            code: 'NO_SESSION',
            message: 'Sesi Dashboard tidak aktif. Login ulang diperlukan.',
          },
        };
      }

      const data = (await response.json()) as DashboardSessionResponse;
      if (!data.ok || !data.user) {
        await clearSession();
        return {
          success: false,
          error: {
            code: 'INVALID_SESSION_RESPONSE',
            message: 'Respons sesi Dashboard tidak valid.',
          },
        };
      }

      const refreshedSession = createCookieBackedSession(
        data.user,
        session.serverBaseUrl,
        data.expiresAt
      );
      await saveSession(refreshedSession);
      return { success: true, session: refreshedSession };
    } catch {
      return {
        success: false,
        error: {
          code: 'NETWORK_ERROR',
          message: 'Tidak dapat memverifikasi sesi Dashboard. Periksa koneksi.',
        },
      };
    }
  }

  const result = await authFetch<{
    tokens: AuthTokens;
  }>('/api/auth/refresh', {
    method: 'POST',
    body: JSON.stringify({ refreshToken: session.tokens.refreshToken }),
  });

  if (!result.success) {
    // Clear invalid session
    await clearSession();
    return { success: false, error: result.error };
  }

  const refreshedSession: AuthSession = {
    user: session.user,
    tokens: result.data.tokens,
    serverBaseUrl: session.serverBaseUrl || (await getAuthConfig()).baseUrl,
  };

  await saveSession(refreshedSession);

  return { success: true, session: refreshedSession };
}

/**
 * Get current authenticated user
 */
export async function getCurrentUser(): Promise<AuthUser | null> {
  const session = await getStoredSession();
  return session?.user || null;
}

// ============================================================================
// AUTH PROVIDER FOR REACT
// ============================================================================

export const AuthClient = {
  login,
  registerPasskey,
  loginWithPasskey,
  logout,
  refreshToken,
  getCurrentUser,
  isAuthenticated,
  getStoredSession,
  getStoredSessionWithRetry,
  saveSession,
  clearSession,
  getAuthConfig,
  saveAuthConfig,
};

export default AuthClient;
