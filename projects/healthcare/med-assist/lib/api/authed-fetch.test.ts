import { beforeEach, describe, expect, it, vi } from 'vitest';

import type { AuthSession } from './auth-store';

const {
  clearSessionMock,
  fetchMock,
  getAuthConfigMock,
  getStoredSessionMock,
} = vi.hoisted(() => ({
  clearSessionMock: vi.fn(),
  fetchMock: vi.fn(),
  getAuthConfigMock: vi.fn(),
  getStoredSessionMock: vi.fn(),
}));

vi.mock('~/utils/logger', () => ({
  createLogger: () => ({
    debug: vi.fn(),
    error: vi.fn(),
    warn: vi.fn(),
  }),
}));

vi.mock('./auth-client', () => ({
  getAuthConfig: getAuthConfigMock,
  getStoredSession: getStoredSessionMock,
}));

vi.mock('./auth-store', () => ({
  clearSession: clearSessionMock,
  storeSession: vi.fn(),
}));

import { AuthRequiredError, authedUpload } from './authed-fetch';

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
