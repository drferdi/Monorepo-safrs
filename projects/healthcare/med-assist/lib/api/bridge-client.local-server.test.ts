// @vitest-environment node

import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import {
  getBridgeRuntimeStatus,
  getOnlineDoctors,
  sendConsultToDoctor,
  syncPatientToDashboard,
} from './bridge-client';
import { startMockCrewServer, type MockCrewServer } from '@/tests/mock-crew-server';

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
      if (!key) {
        return Object.fromEntries(store.entries());
      }

      if (typeof key === 'string') {
        return { [key]: store.get(key) };
      }

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

describe('bridge client local Crew integration', () => {
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
      'sentra:bridge-config': {
        enabled: true,
        pollIntervalMinutes: 0.5,
      },
    });
  });

  it('verifies bridge runtime, doctor loading, consult send, and patient sync against local Crew server', async () => {
    await expect(getBridgeRuntimeStatus()).resolves.toMatchObject({
      readiness: 'ready',
      authSource: 'automation-token',
      serverReachable: true,
      serverAuthorized: true,
    });

    const doctors = await getOnlineDoctors();
    expect(doctors).toEqual([
      expect.objectContaining({
        id: 'doctor-1',
        name: 'dr. Ferdi Iskandar',
      }),
    ]);

    const consultResult = await sendConsultToDoctor({
      patient: {
        name: 'ALPHA',
        age: 34,
        gender: 'P',
        rm: 'patientrefhashalpha',
        bpjsStatus: 'aktif',
        kelurahan: 'zonealpha',
      },
      ttv: {
        sbp: '120',
        dbp: '80',
        hr: '90',
        rr: '18',
        temp: '37.0',
        spo2: '98',
        glucose: '110',
      },
      keluhan_utama: 'Demam 3 hari',
      risk_factors: ['demam'],
      anthropometrics: {
        tinggi: 160,
        berat: 55,
        imt: 21.5,
        hasil_imt: 'Sehat',
        lingkar_perut: 78,
      },
      penyakit_kronis: ['Hipertensi'],
      alergi: ['Obat'],
      status_kehamilan: 'tidak_diisi',
      target_doctor_id: 'doctor-1',
      sent_at: '2026-06-17T00:00:00.000Z',
    });

    expect(consultResult.consultId).toBe('consult-local-1');
    expect(consultResult.eventId).toMatch(
      /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i
    );

    await expect(
      syncPatientToDashboard({
        patient: {
          name: 'ALPHA',
          rm: 'patientrefhashalpha',
          gender: 'P',
          age: 34,
        },
        vitals: {
          sbp: 120,
          dbp: 80,
          hr: 90,
          rr: 18,
          temp: 37,
          spo2: 98,
          glucose: 110,
        },
        narrative: {
          keluhan_utama: 'Demam 3 hari',
          keluhan_tambahan: 'Demam 3 hari',
        },
      })
    ).resolves.toEqual({
      ok: true,
      id: 'sync-local-1',
    });

    const doctorRequest = server.requests.find((request) => request.path === '/api/doctors/online');
    const consultRequest = server.requests.find((request) => request.path === '/api/consult');
    const syncRequest = server.requests.find((request) => request.path === '/api/emr/patient-sync');

    expect(doctorRequest?.headers['x-crew-access-token']).toBe('local-automation-token');
    expect(consultRequest?.headers['x-crew-access-token']).toBe('local-automation-token');
    expect(syncRequest?.headers['x-crew-access-token']).toBe('local-automation-token');

    expect(
      (consultRequest?.jsonBody as { target_doctor_id?: string; event_id?: string })?.target_doctor_id
    ).toBe('doctor-1');
    expect(
      (consultRequest?.jsonBody as { event_id?: string })?.event_id
    ).toBe(consultResult.eventId);
    expect(
      (syncRequest?.jsonBody as { patient?: { rm?: string } })?.patient?.rm
    ).toBe('patientrefhashalpha');
  });
});
