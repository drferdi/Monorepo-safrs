import { beforeEach, describe, expect, it, vi } from 'vitest';

import type { AuthSession } from './auth-store';

const { clearSessionMock, fetchMock, getAuthConfigMock, getStoredSessionMock, logMock } =
  vi.hoisted(() => ({
    clearSessionMock: vi.fn(),
    fetchMock: vi.fn(),
    getAuthConfigMock: vi.fn(),
    getStoredSessionMock: vi.fn(),
    logMock: { debug: vi.fn(), error: vi.fn(), warn: vi.fn() },
  }));

vi.mock('~/utils/logger', () => ({
  createLogger: () => logMock,
}));

vi.mock('./auth-client', () => ({
  getAuthConfig: getAuthConfigMock,
  getStoredSession: getStoredSessionMock,
}));

vi.mock('./auth-store', () => ({
  clearSession: clearSessionMock,
  storeSession: vi.fn(),
}));

import { AuthRequiredError, BridgeApiError, authedFetch, authedUpload } from './authed-fetch';

const cookieBackedSession: AuthSession = {
  user: {
    id: 'doctor-1',
    username: 'drferdi',
    name: 'dr. Ferdi',
    role: 'doctor',
    facilityId: 'PKM',
    facilityName: 'Puskesmas',
  },
  tokens: {
    accessToken: 'cookie-session',
    refreshToken: 'cookie-session',
    expiresAt: Date.now() + 60 * 60 * 1000,
  },
  serverBaseUrl: 'https://crew.test',
};

describe('authedUpload', () => {
  beforeEach(() => {
    clearSessionMock.mockReset();
    fetchMock.mockReset();
    getAuthConfigMock.mockReset();
    getStoredSessionMock.mockReset();
    vi.stubGlobal('fetch', fetchMock);

    getAuthConfigMock.mockResolvedValue({
      baseUrl: 'https://crew.test',
      automationToken: '',
    });
  });

  it('does not attempt token refresh for cookie-backed upload sessions after 401', async () => {
    getStoredSessionMock.mockResolvedValue(cookieBackedSession);
    fetchMock.mockResolvedValueOnce(
      new Response(JSON.stringify({ ok: false, error: 'No active session' }), { status: 401 })
    );

    await expect(authedUpload('/api/medlens/ecg/analyze', new FormData())).rejects.toBeInstanceOf(
      AuthRequiredError
    );

    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(fetchMock.mock.calls[0][0]).toBe('https://crew.test/api/medlens/ecg/analyze');
    expect(fetchMock.mock.calls.some(([url]) => String(url).includes('/api/auth/refresh'))).toBe(
      false
    );
    expect(clearSessionMock).toHaveBeenCalledTimes(1);
  });
});

// The bridge poll calls authedFetch every 30 s; chrome://extensions lists every console error or
// warning of the service worker, so an unreachable server must not log at those levels.
describe('authedFetch when the server is unreachable', () => {
  beforeEach(() => {
    fetchMock.mockReset();
    Object.values(logMock).forEach((fn) => fn.mockReset());
    vi.stubGlobal('fetch', fetchMock);
    getStoredSessionMock.mockResolvedValue(cookieBackedSession);
    getAuthConfigMock.mockResolvedValue({ baseUrl: 'https://crew.test', automationToken: '' });
  });

  it('throws the connection message without logging an error on a network failure', async () => {
    fetchMock.mockRejectedValueOnce(new TypeError('Failed to fetch'));

    await expect(authedFetch('/api/emr/bridge')).rejects.toThrow(
      'Tidak dapat terhubung ke server. Periksa koneksi internet.'
    );

    expect(logMock.error).not.toHaveBeenCalled();
    expect(logMock.warn).not.toHaveBeenCalled();
  });

  it('throws BridgeApiError without logging an error on a 404', async () => {
    fetchMock.mockResolvedValueOnce(new Response('DEPLOYMENT_NOT_FOUND', { status: 404 }));

    await expect(authedFetch('/api/emr/bridge')).rejects.toBeInstanceOf(BridgeApiError);

    expect(logMock.error).not.toHaveBeenCalled();
    expect(logMock.warn).not.toHaveBeenCalled();
  });
});
