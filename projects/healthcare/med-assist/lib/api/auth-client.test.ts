import { beforeEach, describe, expect, it, vi } from 'vitest';

const { getSessionMock, clearSessionMock, isAuthenticatedMock, storeSessionMock } = vi.hoisted(
  () => ({
    getSessionMock: vi.fn(),
    clearSessionMock: vi.fn(),
    isAuthenticatedMock: vi.fn(async () => true),
    storeSessionMock: vi.fn(),
  })
);

vi.mock('./auth-store', () => ({
  getSession: getSessionMock,
  clearSession: clearSessionMock,
  isAuthenticated: isAuthenticatedMock,
  storeSession: storeSessionMock,
}));

import {
  getAuthConfig,
  getStoredSession,
  getStoredSessionWithRetry,
  login,
  loginWithPasskey,
  logout,
  probeApiBaseUrl,
  registerPasskey,
  saveAuthConfig,
  sendPresence,
} from './auth-client';

const browserStorageGet = vi.fn();
const fetchMock = vi.fn();

beforeEach(() => {
  getSessionMock.mockReset();
  clearSessionMock.mockReset();
  isAuthenticatedMock.mockReset();
  isAuthenticatedMock.mockResolvedValue(true);
  storeSessionMock.mockReset();
  browserStorageGet.mockReset();
  fetchMock.mockReset();

  (
    globalThis as typeof globalThis & {
      browser?: {
        storage: {
          local: {
            get: typeof browserStorageGet;
          };
        };
      };
    }
  ).browser = {
    storage: {
      local: {
        get: browserStorageGet,
      },
    },
  };

  globalThis.fetch = fetchMock as typeof fetch;
});

describe('getStoredSession bootstrap hardening', () => {
  it('rejects synthetic fallback session because server auth is the only accepted source', async () => {
    getSessionMock.mockResolvedValue({
      user: {
        id: 'fallback-offline',
        username: 'offline',
        name: 'offline',
        role: 'doctor',
        facilityId: 'PUSKESMAS_BALOWERTI',
        facilityName: 'Puskesmas Balowerti',
        poli: 'Umum',
      },
      tokens: {
        accessToken: 'fallback-token-1',
        refreshToken: 'fallback-refresh-1',
        expiresAt: Date.now() + 60 * 60 * 1000,
      },
      serverBaseUrl: 'https://crew.puskesmasbalowerti.com',
    });
    browserStorageGet.mockResolvedValue({
      'sentra:auth-config': {
        baseUrl: 'https://crew.puskesmasbalowerti.com',
        automationToken: '',
      },
    });

    await expect(getStoredSession()).resolves.toBeNull();
    expect(clearSessionMock).toHaveBeenCalledTimes(1);
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('accepts cookie-backed session without dashboard re-verification', async () => {
    getSessionMock.mockResolvedValue({
      user: {
        id: 'dr-ferdi',
        username: 'dr.ferdi',
        name: 'dr. Ferdi Iskandar',
        role: 'doctor',
        facilityId: 'PUSKESMAS_BALOWERTI',
        facilityName: 'Puskesmas Balowerti',
        poli: 'Umum',
      },
      tokens: {
        accessToken: 'cookie-session',
        refreshToken: 'cookie-session',
        expiresAt: Date.now() + 60 * 60 * 1000,
      },
      serverBaseUrl: 'https://crew.puskesmasbalowerti.com',
    });

    await expect(getStoredSession()).resolves.toMatchObject({
      user: { username: 'dr.ferdi' },
      tokens: { accessToken: 'cookie-session' },
    });
    expect(clearSessionMock).not.toHaveBeenCalled();
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('clears cookie-backed session when it has expired', async () => {
    getSessionMock.mockResolvedValue({
      user: {
        id: 'dr-ferdi',
        username: 'dr.ferdi',
        name: 'dr. Ferdi Iskandar',
        role: 'doctor',
        facilityId: 'PUSKESMAS_BALOWERTI',
        facilityName: 'Puskesmas Balowerti',
        poli: 'Umum',
      },
      tokens: {
        accessToken: 'cookie-session',
        refreshToken: 'cookie-session',
        expiresAt: Date.now() - 1000,
      },
      serverBaseUrl: 'https://crew.puskesmasbalowerti.com',
    });

    await expect(getStoredSession()).resolves.toBeNull();
    expect(clearSessionMock).toHaveBeenCalledTimes(1);
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('retries bootstrap reads before giving up when session appears shortly after mount', async () => {
    getSessionMock
      .mockResolvedValueOnce(null)
      .mockResolvedValueOnce(null)
      .mockResolvedValueOnce({
        user: {
          id: 'dr-ferdi',
          username: 'dr.ferdi',
          name: 'dr. Ferdi Iskandar',
          role: 'doctor',
          facilityId: 'PUSKESMAS_BALOWERTI',
          facilityName: 'Puskesmas Balowerti',
          poli: 'Umum',
        },
        tokens: {
          accessToken: 'cookie-session',
          refreshToken: 'cookie-session',
          expiresAt: Date.now() + 60 * 60 * 1000,
        },
        serverBaseUrl: 'https://crew.puskesmasbalowerti.com',
      });

    await expect(getStoredSessionWithRetry({ attempts: 3, intervalMs: 0 })).resolves.toMatchObject({
      user: { username: 'dr.ferdi' },
      tokens: { accessToken: 'cookie-session' },
    });
    expect(getSessionMock).toHaveBeenCalledTimes(3);
  });
});

describe('login (crew cookie-based auth)', () => {
  beforeEach(() => {
    browserStorageGet.mockResolvedValue({
      'sentra:auth-config': { baseUrl: 'https://crew.puskesmasbalowerti.com', automationToken: '' },
    });
  });

  it('posts credentials to /api/auth/login and stores a cookie-backed session on success', async () => {
    fetchMock.mockResolvedValue({
      ok: true,
      status: 200,
      text: vi.fn().mockResolvedValue(
        JSON.stringify({
          ok: true,
          user: {
            username: 'dr.ferdi',
            displayName: 'dr. Ferdi Iskandar',
            role: 'DOKTER',
            institution: 'Puskesmas Balowerti',
            profession: 'Umum',
          },
          expiresAt: Date.now() + 12 * 60 * 60 * 1000,
        })
      ),
    });

    const result = await login({ username: 'dr.ferdi', password: 'secret-crew' });

    expect(fetchMock).toHaveBeenCalledWith(
      'https://crew.puskesmasbalowerti.com/api/auth/login',
      expect.objectContaining({
        method: 'POST',
        credentials: 'include',
        body: JSON.stringify({ username: 'dr.ferdi', password: 'secret-crew' }),
      })
    );
    expect(result.success).toBe(true);
    expect(result.session?.user.username).toBe('dr.ferdi');
    expect(result.session?.tokens.accessToken).toBe('cookie-session');
    expect(storeSessionMock).toHaveBeenCalledTimes(1);
  });

  // MedBoard crew roles (crew-access-auth CLINICAL_CREW_ROLES, intelligence/server MANAGEMENT_ROLES).
  it.each([
    ['DOKTER', 'doctor'],
    ['DOKTER_GIGI', 'doctor'],
    ['PERAWAT', 'nurse'],
    ['BIDAN', 'nurse'],
    ['TRIAGE_OFFICER', 'nurse'],
    ['APOTEKER', 'nurse'],
    ['ADMIN', 'admin'],
    ['ADMINISTRATOR', 'admin'],
    ['CEO', 'admin'],
    ['CHIEF_EXECUTIVE_OFFICER', 'admin'],
    ['KEPALA_PUSKESMAS', 'admin'],
    ['CEO_SENTRA', 'admin'],
  ])('maps the MedBoard role %s to the Assist role %s', async (serverRole, assistRole) => {
    fetchMock.mockResolvedValue({
      ok: true,
      status: 200,
      text: vi.fn().mockResolvedValue(
        JSON.stringify({
          ok: true,
          user: { username: 'crew.test', displayName: 'Crew Test', role: serverRole },
          expiresAt: Date.now() + 60 * 60 * 1000,
        })
      ),
    });

    const result = await login({ username: 'crew.test', password: 'synthetic-pass' });

    expect(result.session?.user.role).toBe(assistRole);
  });

  it('returns a failure AuthResponse (not a thrown error) on invalid credentials', async () => {
    fetchMock.mockResolvedValue({
      ok: false,
      status: 401,
      text: vi
        .fn()
        .mockResolvedValue(
          JSON.stringify({ ok: false, error: 'Username/email atau password salah.' })
        ),
    });

    const result = await login({ username: 'dr.ferdi', password: 'wrong' });

    expect(result.success).toBe(false);
    expect(result.error?.message).toBe('Username/email atau password salah.');
    expect(storeSessionMock).not.toHaveBeenCalled();
  });
});

describe('passkey (WebAuthn)', () => {
  const originalPublicKeyCredential = (
    globalThis as typeof globalThis & { PublicKeyCredential?: unknown }
  ).PublicKeyCredential;
  const originalCredentialsContainer = (navigator as Navigator & { credentials?: unknown })
    .credentials;

  function setPublicKeyCredentialStub(value: unknown): void {
    Object.defineProperty(globalThis, 'PublicKeyCredential', {
      value,
      configurable: true,
      writable: true,
    });
  }

  beforeEach(() => {
    browserStorageGet.mockResolvedValue({
      'sentra:auth-config': { baseUrl: 'https://crew.puskesmasbalowerti.com', automationToken: '' },
    });
  });

  afterEach(() => {
    setPublicKeyCredentialStub(originalPublicKeyCredential);
    Object.defineProperty(navigator, 'credentials', {
      value: originalCredentialsContainer,
      configurable: true,
    });
  });

  function stubPasskeySupport(): {
    create: ReturnType<typeof vi.fn>;
    get: ReturnType<typeof vi.fn>;
  } {
    setPublicKeyCredentialStub(function PublicKeyCredentialStub() {});
    const credentialsStub = { create: vi.fn(), get: vi.fn() };
    Object.defineProperty(navigator, 'credentials', {
      value: credentialsStub,
      configurable: true,
    });
    return credentialsStub;
  }

  it('registerPasskey reports PASSKEY_UNSUPPORTED when WebAuthn is unavailable', async () => {
    setPublicKeyCredentialStub(undefined);

    const result = await registerPasskey();

    expect(result.success).toBe(false);
    expect(result.error?.code).toBe('PASSKEY_UNSUPPORTED');
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('registerPasskey completes the ceremony and posts the encoded response to verify-registration', async () => {
    const credentials = stubPasskeySupport();

    fetchMock.mockImplementation(async (url: string) => {
      if (url.includes('generate-registration-options')) {
        return {
          ok: true,
          text: async () =>
            JSON.stringify({
              options: {
                challenge: 'Y2hhbGxlbmdl',
                rp: { name: 'Sentra Crew', id: 'crew.puskesmasbalowerti.com' },
                user: { id: 'dXNlci0x', name: 'dr.ferdi', displayName: 'dr. Ferdi' },
                pubKeyCredParams: [{ type: 'public-key', alg: -7 }],
              },
            }),
        };
      }
      if (url.includes('verify-registration')) {
        return { ok: true, text: async () => JSON.stringify({ ok: true }) };
      }
      throw new Error(`unexpected fetch: ${url}`);
    });

    credentials.create.mockResolvedValue({
      id: 'cred-1',
      rawId: new Uint8Array([1, 2, 3]).buffer,
      type: 'public-key',
      response: {
        clientDataJSON: new Uint8Array([4, 5, 6]).buffer,
        attestationObject: new Uint8Array([7, 8, 9]).buffer,
        getTransports: () => ['internal'],
      },
      getClientExtensionResults: () => ({}),
    });

    const result = await registerPasskey();

    expect(result.success).toBe(true);
    expect(credentials.create).toHaveBeenCalledTimes(1);
    const verifyCall = fetchMock.mock.calls.find((call: unknown[]) =>
      (call[0] as string).includes('verify-registration')
    );
    expect(verifyCall).toBeTruthy();
    const verifyBody = JSON.parse((verifyCall![1] as { body: string }).body);
    expect(verifyBody.response.id).toBe('cred-1');
    expect(verifyBody.response.response.transports).toEqual(['internal']);
  });

  it('loginWithPasskey reports PASSKEY_CANCELLED (not a hard failure) when the user dismisses the prompt', async () => {
    const credentials = stubPasskeySupport();

    fetchMock.mockResolvedValue({
      ok: true,
      text: async () =>
        JSON.stringify({
          options: { challenge: 'Y2hhbGxlbmdl', rpId: 'crew.puskesmasbalowerti.com' },
        }),
    });
    credentials.get.mockRejectedValue(
      Object.assign(new Error('cancelled'), { name: 'NotAllowedError' })
    );

    const result = await loginWithPasskey();

    expect(result.success).toBe(false);
    expect(result.error?.code).toBe('PASSKEY_CANCELLED');
    expect(storeSessionMock).not.toHaveBeenCalled();
  });

  it('loginWithPasskey completes the ceremony and stores a cookie-backed session', async () => {
    const credentials = stubPasskeySupport();

    fetchMock.mockImplementation(async (url: string) => {
      if (url.includes('generate-authentication-options')) {
        return {
          ok: true,
          text: async () =>
            JSON.stringify({
              options: { challenge: 'Y2hhbGxlbmdl', rpId: 'crew.puskesmasbalowerti.com' },
            }),
        };
      }
      if (url.includes('verify-authentication')) {
        return {
          ok: true,
          text: async () =>
            JSON.stringify({
              ok: true,
              user: {
                username: 'dr.ferdi',
                displayName: 'dr. Ferdi Iskandar',
                role: 'DOKTER',
                institution: 'Puskesmas Balowerti',
                profession: 'Umum',
              },
              expiresAt: Date.now() + 12 * 60 * 60 * 1000,
            }),
        };
      }
      throw new Error(`unexpected fetch: ${url}`);
    });

    credentials.get.mockResolvedValue({
      id: 'cred-1',
      rawId: new Uint8Array([1, 2, 3]).buffer,
      type: 'public-key',
      response: {
        clientDataJSON: new Uint8Array([4, 5, 6]).buffer,
        authenticatorData: new Uint8Array([7, 8, 9]).buffer,
        signature: new Uint8Array([10, 11, 12]).buffer,
        userHandle: null,
      },
      getClientExtensionResults: () => ({}),
    });

    const result = await loginWithPasskey();

    expect(result.success).toBe(true);
    expect(result.session?.user.username).toBe('dr.ferdi');
    expect(result.session?.tokens.accessToken).toBe('cookie-session');
    expect(storeSessionMock).toHaveBeenCalledTimes(1);
  });
});

describe('probeApiBaseUrl diagnostics', () => {
  it('returns a specific Crew-domain message when backend responds with Application not found', async () => {
    fetchMock.mockResolvedValue({
      status: 404,
      ok: false,
      headers: {
        get: (name: string) => (name.toLowerCase() === 'content-type' ? 'application/json' : null),
      },
      text: vi.fn().mockResolvedValue(
        JSON.stringify({
          status: 'error',
          code: 404,
          message: 'Application not found',
        })
      ),
    });

    await expect(probeApiBaseUrl('https://crew.puskesmasbalowerti.com')).resolves.toEqual({
      ok: false,
      status: 404,
      message:
        'Host Crew merespons backend tanpa aplikasi aktif. Periksa sertifikat, mapping domain, dan service target backend Crew.',
    });
  });

  it('still reports plain endpoint-missing 404 for non-crew responses', async () => {
    fetchMock.mockResolvedValue({
      status: 404,
      ok: false,
      headers: {
        get: (name: string) => (name.toLowerCase() === 'content-type' ? 'application/json' : null),
      },
      text: vi.fn().mockResolvedValue(
        JSON.stringify({
          status: 'error',
          code: 404,
          message: 'Route not found',
        })
      ),
    });

    await expect(probeApiBaseUrl('https://example.com')).resolves.toEqual({
      ok: false,
      status: 404,
      message: 'Endpoint /api/auth/login tidak ditemukan di host ini (404).',
    });
  });

  it('mentions TLS/domain mapping when Crew host is unreachable', async () => {
    fetchMock.mockRejectedValue(new TypeError('Failed to fetch'));

    await expect(probeApiBaseUrl('https://crew.puskesmasbalowerti.com')).resolves.toEqual({
      ok: false,
      status: 0,
      message:
        'Tidak dapat menjangkau host Crew API. Periksa sertifikat TLS, mapping domain, dan jaringan.',
    });
  });
});

describe('presence (ACARS shows who is online in Asisten Medis)', () => {
  const serverSession = {
    user: {
      id: 'perawat-uji',
      username: 'perawat.uji',
      name: 'Perawat Uji',
      role: 'nurse',
      facilityId: 'PUSKESMAS_UJI',
      facilityName: 'Puskesmas Uji',
      poli: 'Umum',
    },
    tokens: {
      accessToken: 'cookie-session',
      refreshToken: 'cookie-session',
      expiresAt: Date.now() + 60 * 60 * 1000,
    },
    serverBaseUrl: 'https://medboard.example.test/',
  };

  it('a heartbeat posts to MedBoard with the session cookie', async () => {
    getSessionMock.mockResolvedValue(serverSession);
    fetchMock.mockResolvedValue(new Response(JSON.stringify({ ok: true }), { status: 200 }));

    await expect(sendPresence('POST')).resolves.toBe(true);

    expect(fetchMock).toHaveBeenCalledWith('https://medboard.example.test/api/presence', {
      method: 'POST',
      credentials: 'include',
    });
  });

  it('a Mode Lokal session has no MedBoard user, so no heartbeat is sent', async () => {
    getSessionMock.mockResolvedValue({
      ...serverSession,
      tokens: { ...serverSession.tokens, accessToken: 'local-session' },
      serverBaseUrl: '',
    });
    browserStorageGet.mockResolvedValue({ 'sentra:local-account': { username: 'perawat.uji' } });

    await expect(sendPresence('POST')).resolves.toBe(false);

    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('a heartbeat that cannot reach MedBoard reports false instead of throwing', async () => {
    getSessionMock.mockResolvedValue(serverSession);
    fetchMock.mockRejectedValue(new TypeError('Failed to fetch'));

    await expect(sendPresence('POST')).resolves.toBe(false);
  });

  it('logout tells MedBoard the user went offline before the session cookie is cleared', async () => {
    getSessionMock.mockResolvedValue(serverSession);
    fetchMock.mockResolvedValue(new Response(JSON.stringify({ ok: true }), { status: 200 }));

    await logout();

    expect(fetchMock.mock.calls.map(([url, init]) => [url, (init as RequestInit).method])).toEqual([
      ['https://medboard.example.test/api/presence', 'DELETE'],
      ['https://medboard.example.test/api/auth/logout', 'POST'],
    ]);
  });
});

describe('server address (a MedBoard account signs in to Asisten Medis)', () => {
  const browserStorageSet = vi.fn();
  let stored: Record<string, unknown> = {};

  beforeEach(() => {
    stored = {};
    browserStorageSet.mockReset();
    browserStorageGet.mockImplementation(async (key: string) =>
      key in stored ? { [key]: stored[key] } : {}
    );
    browserStorageSet.mockImplementation(async (items: Record<string, unknown>) => {
      stored = { ...stored, ...items };
    });
    (
      globalThis as typeof globalThis & {
        browser?: {
          storage: { local: { get: typeof browserStorageGet; set: typeof browserStorageSet } };
        };
      }
    ).browser = { storage: { local: { get: browserStorageGet, set: browserStorageSet } } };
    getSessionMock.mockResolvedValue(null);
  });

  it('a fresh install points at MedBoard, so a MedBoard account signs in without Settings', async () => {
    await expect(getAuthConfig()).resolves.toEqual({
      baseUrl: 'https://crew.puskesmasbalowerti.com',
      automationToken: '',
    });
  });

  it('Mode Lokal stays reachable: an empty address saved in Settings is kept, not replaced', async () => {
    await saveAuthConfig({ baseUrl: '' });

    await expect(getAuthConfig()).resolves.toMatchObject({ baseUrl: '' });
  });

  it('saving only a token keeps the address already chosen', async () => {
    await saveAuthConfig({ baseUrl: 'https://medboard.example.test' });
    await saveAuthConfig({ automationToken: 'synthetic-token' });

    await expect(getAuthConfig()).resolves.toEqual({
      baseUrl: 'https://medboard.example.test',
      automationToken: 'synthetic-token',
    });
  });

  it('with Mode Lokal chosen, login stays on the device and never calls MedBoard', async () => {
    await saveAuthConfig({ baseUrl: '' });

    await login({ username: 'perawat.uji', password: 'synthetic-password-0001' });

    expect(fetchMock).not.toHaveBeenCalled();
  });
});
