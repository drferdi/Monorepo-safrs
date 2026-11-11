// @vitest-environment node

import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';

import { startMockCrewServer, type MockCrewServer } from '@/tests/mock-crew-server';
import { analyzeEcgImage, getMedlensRuntimeStatus } from './medlens-client';

type StorageAreaMock = {
  get: (key?: string | string[] | Record<string, unknown>) => Promise<Record<string, unknown>>;
  set: (items: Record<string, unknown>) => Promise<void>;
  remove: (key: string | string[]) => Promise<void>;
  clear: () => Promise<void>;
};

function createStorageArea(): StorageAreaMock {
  const store = new Map<string, unknown>();

  return {
    async get(key?: string | string[] | Record<string, unknown>) {
      if (!key) return Object.fromEntries(store.entries());
      if (typeof key === 'string') return { [key]: store.get(key) };
      if (Array.isArray(key)) {
        return Object.fromEntries(key.map((entry) => [entry, store.get(entry)]));
      }
      return Object.fromEntries(
        Object.keys(key).map((entry) => [entry, store.has(entry) ? store.get(entry) : key[entry]])
      );
    },
    async set(items: Record<string, unknown>) {
      for (const [key, value] of Object.entries(items)) {
        store.set(key, value);
      }
    },
    async remove(key: string | string[]) {
      const keys = Array.isArray(key) ? key : [key];
      for (const entry of keys) {
        store.delete(entry);
      }
    },
    async clear() {
      store.clear();
    },
  };
}

describe('medlens client local Crew integration', () => {
  let server: MockCrewServer;
  let localStorageArea: StorageAreaMock;
  let sessionStorageArea: StorageAreaMock;

  beforeAll(async () => {
    server = await startMockCrewServer();
  });

  afterAll(async () => {
    await server.close();
  });

  beforeEach(async () => {
    server.clearRequests();
    localStorageArea = createStorageArea();
    sessionStorageArea = createStorageArea();

    (
      globalThis as typeof globalThis & {
        browser?: {
          storage: {
            local: StorageAreaMock;
            session: StorageAreaMock;
          };
        };
      }
    ).browser = {
      storage: {
        local: localStorageArea,
        session: sessionStorageArea,
      },
    };

    await localStorageArea.set({
      'sentra:auth-config': {
        baseUrl: server.baseUrl,
        automationToken: 'local-automation-token',
      },
    });
  });

  it('uploads ECG image through Crew auth transport using multipart field file', async () => {
    const file = new File(['synthetic-ecg-image'], 'ekg.png', { type: 'image/png' });

    const result = await analyzeEcgImage(file);

    expect(result.status).toBe('ok');
    expect(result.module).toBe('ecg');
    expect(result.physician_verification_required).toBe(true);
    expect(result.disclaimer).toContain('reviewed by a clinician');
    expect(result.audit_log.outputPassedEvidenceGate).toBe(true);
    expect(result.waveform_review_output.status).toBe('ready_for_physician_review');
    expect(result.ecg_clinical_output.status).toBe('insufficient_evidence');
    expect(result.ecg_clinical_output.findings).toEqual([]);
    expect(JSON.stringify(result)).not.toContain('Patient Name');
    expect(JSON.stringify(result)).not.toContain('MRN');

    const medlensRequest = server.requests.find(
      (request) => request.path === '/api/medlens/ecg/analyze'
    );

    expect(medlensRequest).toBeDefined();
    expect(medlensRequest?.method).toBe('POST');
    expect(String(medlensRequest?.headers['content-type'])).toContain('multipart/form-data');
    expect(medlensRequest?.rawBody).toContain('name="file"');
    expect(medlensRequest?.rawBody).toContain('filename="ekg.png"');
  });

  it('reports runtime ready against the Crew MedLens route before upload begins', async () => {
    const status = await getMedlensRuntimeStatus();

    expect(status).toMatchObject({
      readiness: 'ready',
      serverReachable: true,
      serverAuthorized: true,
    });

    const medlensRequest = server.requests.find(
      (request) => request.path === '/api/medlens/ecg/analyze'
    );

    expect(medlensRequest).toBeDefined();
    expect(medlensRequest?.method).toBe('POST');
  });

  it('maps Crew MedLens unavailable response to a clinician-facing message', async () => {
    await server.close();
    server = await startMockCrewServer({ medlensEcgEnabled: false });
    await localStorageArea.set({
      'sentra:auth-config': {
        baseUrl: server.baseUrl,
        automationToken: 'local-automation-token',
      },
    });

    let message = '';
    try {
      await analyzeEcgImage(new File(['synthetic-ecg-image'], 'ekg.png', { type: 'image/png' }));
    } catch (error) {
      message = error instanceof Error ? error.message : '';
    }

    expect(message).toBe(
      'MedLens belum tersedia untuk workspace ini. Coba lagi nanti atau hubungi admin.'
    );
  });
});
