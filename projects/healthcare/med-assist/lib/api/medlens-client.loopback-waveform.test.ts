// @vitest-environment node

import type { AddressInfo } from 'node:net';
import { existsSync, readFileSync } from 'node:fs';

import sharp from 'sharp';
import { afterEach, describe, expect, it } from 'vitest';

import { analyzeEcgImage, getMedlensRuntimeStatus } from './medlens-client';

const REAL_NORMAL_ECG_FIXTURE_PATH =
  'C:/Users/drfer/Desktop/hasil-elektrokardiografi-ekg-ecg-normal-src-ecg-library.png';
const REAL_INFARCT_ECG_FIXTURE_PATH = 'C:/Users/drfer/Desktop/infmi_2x.png';

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

async function loadServerModule(): Promise<{
  createMedlensLocalServer: () => {
    server: { address: () => AddressInfo | null };
    start: (port?: number, host?: string) => Promise<unknown>;
    stop: () => Promise<void>;
  };
}> {
  // @ts-expect-error runtime-only local service
  return import('../../services/medlens-local/server.mjs');
}

function createFixtureFile(path: string, fileName: string): File {
  const buffer = readFileSync(path);
  return new File([new Uint8Array(buffer)], fileName, { type: 'image/png' });
}

async function createRotatedFixtureFile(path: string, fileName: string): Promise<File> {
  const buffer = await sharp(readFileSync(path))
    .rotate(0.5, {
      background: { r: 255, g: 255, b: 255, alpha: 1 },
    })
    .png()
    .toBuffer();

  return new File([new Uint8Array(buffer)], fileName, { type: 'image/png' });
}

describe('medlens client real loopback waveform integration', () => {
  const runningServers: Array<{ stop: () => Promise<void> }> = [];

  afterEach(async () => {
    await Promise.all(runningServers.splice(0).map((instance) => instance.stop()));
  });

  const realNormalFixtureTest = existsSync(REAL_NORMAL_ECG_FIXTURE_PATH) ? it : it.skip;
  realNormalFixtureTest(
    'uploads a real ECG image through medlensClient and returns a waveform-ready packet',
    async () => {
      const { createMedlensLocalServer } = await loadServerModule();
      const instance = createMedlensLocalServer();
      runningServers.push(instance);
      await instance.start(0, '127.0.0.1');
      const port = (instance.server.address() as AddressInfo).port;
      const localStorageArea = createStorageArea();
      const sessionStorageArea = createStorageArea();

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
          baseUrl: `http://127.0.0.1:${port}`,
          automationToken: '',
        },
      });

      const status = await getMedlensRuntimeStatus();
      expect(status).toMatchObject({
        readiness: 'ready',
        serverReachable: true,
        serverAuthorized: true,
      });

      const result = await analyzeEcgImage(
        createFixtureFile(REAL_NORMAL_ECG_FIXTURE_PATH, 'ecg-normal.png')
      );

      expect(result.extraction_method).toBe('waveform');
      expect(result.waveform_review_output.status).toBe('ready_for_physician_review');
      expect(result.waveform_review_output.clinicalOutputAllowed).toBe(true);
      expect(result.waveform_evidence_packet.gridCalibration.calibrated).toBe(true);
      expect(result.waveform_evidence_packet.leadMeasurements.length).toBeGreaterThanOrEqual(12);
      expect(
        result.waveform_evidence_packet.rhythmEvidence?.estimatedRateBpm
      ).toBeGreaterThanOrEqual(60);
      expect(result.waveform_evidence_packet.rhythmEvidence?.estimatedRateBpm).toBeLessThanOrEqual(
        80
      );
      expect(result.raw_ecg_relevant_text).toEqual([]);
      expect(result.audit_log.outputPassedEvidenceGate).toBe(true);
    },
    30000
  );

  const realInfarctFixtureTest = existsSync(REAL_INFARCT_ECG_FIXTURE_PATH) ? it : it.skip;
  realInfarctFixtureTest(
    'keeps medlensClient waveform-ready on a second real ECG case',
    async () => {
      const { createMedlensLocalServer } = await loadServerModule();
      const instance = createMedlensLocalServer();
      runningServers.push(instance);
      await instance.start(0, '127.0.0.1');
      const port = (instance.server.address() as AddressInfo).port;
      const localStorageArea = createStorageArea();
      const sessionStorageArea = createStorageArea();

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
          baseUrl: `http://127.0.0.1:${port}`,
          automationToken: '',
        },
      });

      const result = await analyzeEcgImage(
        createFixtureFile(REAL_INFARCT_ECG_FIXTURE_PATH, 'infmi_2x.png')
      );

      expect(result.extraction_method).toBe('waveform');
      expect(result.waveform_review_output.status).toBe('ready_for_physician_review');
      expect(result.waveform_review_output.clinicalOutputAllowed).toBe(true);
      expect(result.waveform_evidence_packet.gridCalibration.calibrated).toBe(true);
      expect(result.waveform_evidence_packet.leadMeasurements.length).toBeGreaterThanOrEqual(12);
      expect(result.audit_log.outputPassedEvidenceGate).toBe(true);
    },
    30000
  );

  realInfarctFixtureTest(
    'keeps medlensClient waveform-first on a lightly rotated infarct ECG image',
    async () => {
      const { createMedlensLocalServer } = await loadServerModule();
      const instance = createMedlensLocalServer();
      runningServers.push(instance);
      await instance.start(0, '127.0.0.1');
      const port = (instance.server.address() as AddressInfo).port;
      const localStorageArea = createStorageArea();
      const sessionStorageArea = createStorageArea();

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
          baseUrl: `http://127.0.0.1:${port}`,
          automationToken: '',
        },
      });

      const result = await analyzeEcgImage(
        await createRotatedFixtureFile(REAL_INFARCT_ECG_FIXTURE_PATH, 'infmi_2x-rotate-05.png')
      );

      expect(result.extraction_method).toBe('waveform');
      expect(result.waveform_review_output.status).toBe('ready_for_physician_review');
      expect(result.waveform_review_output.clinicalOutputAllowed).toBe(true);
      expect(result.waveform_evidence_packet.gridCalibration.calibrated).toBe(true);
      expect(result.waveform_evidence_packet.leadMeasurements.length).toBeGreaterThanOrEqual(12);
      expect(
        result.waveform_evidence_packet.rhythmEvidence?.estimatedRateBpm
      ).toBeGreaterThanOrEqual(40);
      expect(result.waveform_evidence_packet.rhythmEvidence?.estimatedRateBpm).toBeLessThanOrEqual(
        80
      );
      expect(result.raw_ecg_relevant_text).toEqual([]);
      expect(result.audit_log.outputPassedEvidenceGate).toBe(true);
    },
    30000
  );
});
