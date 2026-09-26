// Ghost Protocols — Authenticated Fetch
// Single wrapper for ALL API calls to Crew Dashboard.
// Reads token from auth-store, handles refresh at point-of-use.

import { getAuthConfig, getStoredSession } from './auth-client';
import { clearSession, storeSession, type AuthSession } from './auth-store';

import { createLogger } from '~/utils/logger';

const log = createLogger('AuthedFetch', 'background');
const COOKIE_SESSION_ACCESS_TOKEN = 'cookie-session';
const COOKIE_SESSION_REFRESH_TOKEN = 'cookie-session';

// ============================================================================
// ERRORS
// ============================================================================

export class AuthRequiredError extends Error {
  constructor(message = 'Login diperlukan. Silakan login ulang.') {
    super(message);
    this.name = 'AuthRequiredError';
  }
}

const BRIDGE_AUTH_REQUIRED_MESSAGE =
  'Bridge memerlukan Crew API Base URL dan Bridge Automation Token, atau sesi Dashboard yang masih aktif.';

/**
 * BridgeApiError class
 *
 * @remarks
 * TODO: Add class description and usage examples
 * Auto-generated on 2026-04-15
 */

export class BridgeApiError extends Error {
  status: number;

  constructor(status: number, body: string) {
    const message = parseBridgeErrorMessage(body, `Bridge API error ${status}`);
    super(message);
    this.name = 'BridgeApiError';
    this.status = status;
  }
}

/**
 * BridgeResponseFormatError class
 *
 * @remarks
 * TODO: Add class description and usage examples
 * Auto-generated on 2026-04-15
 */

export class BridgeResponseFormatError extends Error {
  status: number;

  constructor(status: number, message: string) {
    super(message);
    this.name = 'BridgeResponseFormatError';
    this.status = status;
  }
}

function parseBridgeErrorMessage(text: string, fallback: string): string {
  if (!text.trim()) return fallback;

  try {
    const parsed = JSON.parse(text) as { error?: string; message?: string; code?: string };
    if (typeof parsed.error === 'string' && parsed.error.trim()) {
      if (looksLikeHtml(parsed.error)) {
        return 'Server mengembalikan halaman HTML, bukan JSON API. Cek Base URL Bridge dan pastikan endpoint API Crew yang dipakai, bukan halaman web/login.';
      }
      return parsed.error.trim();
    }
    if (typeof parsed.message === 'string' && parsed.message.trim()) {
      if (looksLikeHtml(parsed.message)) {
        return 'Server mengembalikan halaman HTML, bukan JSON API. Cek Base URL Bridge dan pastikan endpoint API Crew yang dipakai, bukan halaman web/login.';
      }
      return parsed.message.trim();
    }
    if (typeof parsed.code === 'string' && parsed.code.trim()) return parsed.code.trim();
  } catch {
    // Not JSON — use text
  }

  if (looksLikeHtml(text)) {
    return 'Server mengembalikan halaman HTML, bukan JSON API. Cek Base URL Bridge dan pastikan endpoint API Crew yang dipakai, bukan halaman web/login.';
  }

  const capped = text.length > 500 ? `${text.slice(0, 497)}...` : text;
  return capped;
}

function looksLikeHtml(text: string): boolean {
  const normalized = text.trim().toLowerCase();
  return normalized.startsWith('<!doctype html') || normalized.startsWith('<html');
}

function inferFormatErrorMessage(status: number, body: string): string {
  if (looksLikeHtml(body)) {
    return 'Server mengembalikan halaman HTML, bukan JSON API. Cek Base URL Bridge dan pastikan endpoint API Crew yang dipakai, bukan halaman web/login.';
  }

  if (!body.trim()) {
    return `Respon server kosong (status ${status}).`;
  }

  const compactBody = body.replace(/\s+/g, ' ').trim();
  const snippet = compactBody.length > 160 ? `${compactBody.slice(0, 157)}...` : compactBody;
  return `Format respon API tidak valid (status ${status}): ${snippet}`;
}

async function parseJsonResponse<T>(response: Response, correlationId: string): Promise<T> {
  const raw = await response.text();

  try {
    return JSON.parse(raw) as T;
  } catch {
    const message = inferFormatErrorMessage(response.status, raw);
    log.error('[AuthedFetch] Invalid JSON response', {
      correlationId,
      status: response.status,
      contentType: response.headers.get('content-type') || 'unknown',
      preview: raw.slice(0, 120),
    });
    throw new BridgeResponseFormatError(response.status, message);
  }
}

// ============================================================================
// TOKEN REFRESH (point-of-use, serialized)
// ============================================================================

let refreshPromise: Promise<string> | null = null;

async function refreshTokenIfNeeded(session: AuthSession): Promise<string> {
  const bufferMs = 5 * 60 * 1000; // 5 min before expiry

  if (session.tokens.expiresAt > Date.now() + bufferMs) {
    return session.tokens.accessToken; // Still valid
  }

  // Serialize concurrent refresh attempts
  if (refreshPromise) return refreshPromise;

  refreshPromise = doRefresh(session).finally(() => {
    refreshPromise = null;
  });

  return refreshPromise;
}

async function doRefresh(session: AuthSession): Promise<string> {
  // Re-read — another context may have refreshed already
  const current = await getStoredSession();
  if (current && current.tokens.expiresAt > Date.now() + 60_000) {
    return current.tokens.accessToken;
  }

  log.debug('[AuthedFetch] Refreshing token...');

  const url = `${session.serverBaseUrl.replace(/\/$/, '')}/api/auth/refresh`;

  const response = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ refreshToken: session.tokens.refreshToken }),
  });

  if (!response.ok) {
    if (response.status === 401 || response.status === 403) {
      log.warn('[AuthedFetch] Refresh rejected — clearing session');
      await clearSession();
      throw new AuthRequiredError('Sesi kedaluwarsa. Silakan login ulang.');
    }
    throw new Error(`Token refresh failed: ${response.status}`);
  }

  const data = (await response.json()) as { tokens: AuthSession['tokens'] };

  const updated: AuthSession = {
    ...session,
    tokens: data.tokens,
  };

  await storeSession(updated);
  log.debug('[AuthedFetch] Token refreshed successfully');

  return updated.tokens.accessToken;
}

type BridgeAuthContext =
  | {
      mode: 'automation-token';
      baseUrl: string;
      token: string;
    }
  | {
      mode: 'session';
      baseUrl: string;
      session: AuthSession;
    };

async function resolveBridgeAuthContext(): Promise<BridgeAuthContext> {
  const session = await getStoredSession();
  const config = await getAuthConfig();
  const baseUrl = (session?.serverBaseUrl || config.baseUrl).replace(/\/$/, '');
  const automationToken = config.automationToken.trim();

  if (automationToken) {
    return {
      mode: 'automation-token',
      baseUrl,
      token: automationToken,
    };
  }

  if (!session) {
    throw new AuthRequiredError(BRIDGE_AUTH_REQUIRED_MESSAGE);
  }

  return {
    mode: 'session',
    baseUrl,
    session,
  };
}

function isCookieBackedSession(session: AuthSession): boolean {
  return (
    session.tokens.accessToken === COOKIE_SESSION_ACCESS_TOKEN &&
    session.tokens.refreshToken === COOKIE_SESSION_REFRESH_TOKEN
  );
}

// ============================================================================
// MAIN FETCH WRAPPER
// ============================================================================

export async function authedFetch<T>(path: string, options: RequestInit = {}): Promise<T> {
  const authContext = await resolveBridgeAuthContext();
  const url = `${authContext.baseUrl}${path}`;
  const correlationId = `ghost-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;

  log.debug(`[AuthedFetch] >>> ${options.method || 'GET'} ${url}`, { correlationId });

  let response: Response;

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 30_000);

  try {
    const sessionHeaders: Record<string, string> =
      authContext.mode === 'automation-token'
        ? { 'X-Crew-Access-Token': authContext.token }
        : isCookieBackedSession(authContext.session)
          ? {}
          : { 'X-Crew-Access-Token': await refreshTokenIfNeeded(authContext.session) };

    response = await fetch(url, {
      ...options,
      signal: controller.signal,
      credentials: 'include',
      headers: {
        'Content-Type': 'application/json',
        'X-Correlation-Id': correlationId,
        ...sessionHeaders,
        ...options.headers,
      },
    });
  } catch (e) {
    if (e instanceof Error && e.name === 'AbortError') {
      log.error('[AuthedFetch] Request timeout (30s):', url);
      throw new Error(
        'Request timeout (30 detik). Server tidak merespons — coba lagi atau cek koneksi.'
      );
    }
    log.error('[AuthedFetch] Network error:', e);
    throw new Error('Tidak dapat terhubung ke server. Periksa koneksi internet.');
  } finally {
    clearTimeout(timeoutId);
  }

  log.debug(`[AuthedFetch] <<< ${response.status} ${url}`, { correlationId, ok: response.ok });

  // Token rejected — attempt one refresh then retry
  if (response.status === 401) {
    if (authContext.mode === 'automation-token') {
      const errorBody = await response.text().catch(() => '');
      log.error(`[AuthedFetch] FAIL ${response.status}: ${errorBody.slice(0, 200)}`, {
        correlationId,
      });
      throw new BridgeApiError(
        response.status,
        errorBody ||
          'Token Bridge tidak valid. Buka Settings → Bridge Automation Token di extension dan pastikan nilainya sama dengan CREW_ACCESS_AUTOMATION_TOKEN pada backend Crew.'
      );
    }

    log.warn('[AuthedFetch] 401 received — attempting token refresh');
    try {
      if (authContext.session) {
        const newToken = await doRefresh(authContext.session);
        const retryResponse = await fetch(url, {
          ...options,
          credentials: 'include',
          headers: {
            'Content-Type': 'application/json',
            'X-Crew-Access-Token': newToken,
            'X-Correlation-Id': `${correlationId}-retry`,
            ...options.headers,
          },
        });

        if (retryResponse.ok) {
          return parseJsonResponse<T>(retryResponse, `${correlationId}-retry`);
        }
      }
    } catch {
      // Refresh failed
    }

    await clearSession();
    throw new AuthRequiredError('Sesi tidak valid. Silakan login ulang.');
  }

  if (!response.ok) {
    const errorBody = await response.text().catch(() => '');
    log.error(`[AuthedFetch] FAIL ${response.status}: ${errorBody.slice(0, 200)}`, {
      correlationId,
    });
    throw new BridgeApiError(response.status, errorBody);
  }

  return parseJsonResponse<T>(response, correlationId);
}

export async function authedUpload<T>(
  path: string,
  formData: FormData,
  options: Omit<RequestInit, 'body'> = {}
): Promise<T> {
  const authContext = await resolveBridgeAuthContext();
  const url = `${authContext.baseUrl}${path}`;
  const correlationId = `ghost-upload-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;

  log.debug(`[AuthedFetch] >>> ${options.method || 'POST'} ${url}`, { correlationId });

  let response: Response;
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 60_000);

  try {
    const sessionHeaders: Record<string, string> =
      authContext.mode === 'automation-token'
        ? { 'X-Crew-Access-Token': authContext.token }
        : isCookieBackedSession(authContext.session)
          ? {}
          : { 'X-Crew-Access-Token': await refreshTokenIfNeeded(authContext.session) };

    response = await fetch(url, {
      ...options,
      method: options.method || 'POST',
      body: formData,
      signal: controller.signal,
      credentials: 'include',
      headers: {
        'X-Correlation-Id': correlationId,
        ...sessionHeaders,
        ...options.headers,
      },
    });
  } catch (e) {
    if (e instanceof Error && e.name === 'AbortError') {
      log.error('[AuthedFetch] Upload timeout (60s):', url);
      throw new Error(
        'Upload timeout (60 detik). Server tidak merespons — coba lagi atau cek koneksi.'
      );
    }
    log.error('[AuthedFetch] Upload network error:', e);
    throw new Error('Tidak dapat mengupload file ke server. Periksa koneksi internet.');
  } finally {
    clearTimeout(timeoutId);
  }

  log.debug(`[AuthedFetch] <<< ${response.status} ${url}`, { correlationId, ok: response.ok });

  if (response.status === 401) {
    if (authContext.mode === 'automation-token') {
      const errorBody = await response.text().catch(() => '');
      throw new BridgeApiError(response.status, errorBody);
    }

    if (isCookieBackedSession(authContext.session)) {
      await clearSession();
      throw new AuthRequiredError('Sesi tidak valid. Silakan login ulang.');
    }

    log.warn('[AuthedFetch] Upload 401 received — attempting token refresh');
    try {
      const newToken = await doRefresh(authContext.session);
      const retryResponse = await fetch(url, {
        ...options,
        method: options.method || 'POST',
        body: formData,
        credentials: 'include',
        headers: {
          'X-Crew-Access-Token': newToken,
          'X-Correlation-Id': `${correlationId}-retry`,
          ...options.headers,
        },
      });

      if (retryResponse.ok) {
        return parseJsonResponse<T>(retryResponse, `${correlationId}-retry`);
      }
    } catch {
      // Refresh failed
    }

    await clearSession();
    throw new AuthRequiredError('Sesi tidak valid. Silakan login ulang.');
  }

  if (!response.ok) {
    const errorBody = await response.text().catch(() => '');
    log.error(`[AuthedFetch] FAIL ${response.status}: ${errorBody.slice(0, 200)}`, {
      correlationId,
    });
    throw new BridgeApiError(response.status, errorBody);
  }

  return parseJsonResponse<T>(response, correlationId);
}
