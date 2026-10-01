import { beforeEach, describe, expect, it, vi } from 'vitest';

import type { VisitRecord } from './visit-history-store';

// A minimal IndexedDB with what the store calls: one object store, its indexes, add/put/get/getAll.
function installFakeIndexedDb(): void {
  const rows: VisitRecord[] = [];
  let nextId = 1;
  const request = <T>(run: () => T) => {
    const req: { result?: T; error?: unknown; onsuccess?: () => void; onerror?: () => void } = {};
    queueMicrotask(() => {
      req.result = run();
      req.onsuccess?.();
    });
    return req;
  };
  const objectStore = {
    add: (record: VisitRecord) => request(() => rows.push({ ...record, id: nextId++ })),
    put: (record: VisitRecord) =>
      request(() =>
        rows.splice(
          rows.findIndex((row) => row.id === record.id),
          1,
          { ...record }
        )
      ),
    index: (name: keyof VisitRecord) => ({
      get: (key: string) => request(() => rows.find((row) => row[name] === key)),
      getAll: (key: string) => request(() => rows.filter((row) => row[name] === key)),
    }),
    createIndex: () => undefined,
  };
  const database = {
    objectStoreNames: { contains: () => true },
    createObjectStore: () => objectStore,
    transaction: () => ({ objectStore: () => objectStore }),
  };
  vi.stubGlobal('indexedDB', { open: () => request(() => database) });
}

const scraped = (terapi: string): Omit<VisitRecord, 'id'> => ({
  patient_id: 'RM-1',
  encounter_id: 'E-1',
  timestamp: '2026-09-20T08:00:00Z',
  vitals: { sbp: 120, dbp: 80, hr: 80, rr: 18, temp: 36.5, glucose: 0 },
  keluhan_utama: 'batuk',
  terapi_obat: terapi,
  source: 'scrape',
});

describe('saveScrapedVisits', () => {
  beforeEach(() => {
    vi.resetModules();
    installFakeIndexedDb();
  });

  // Chief, 2026-10-02 ("Pengisian dosis salah"): a visit stored before the riwayat Resep table was
  // read keeps its free-text therapy ("NAC, CTM") unless a new scan replaces it.
  it('replaces a scanned visit whose therapy the new scan reads differently', async () => {
    const { getPatientVisits, saveScrapedVisits } = await import('./visit-history-store');

    await saveScrapedVisits([scraped('NAC, CTM')]);
    await saveScrapedVisits([scraped('N-asetilsistein kapsul 200 mg 2x1 Sesudah Makan')]);

    const visits = await getPatientVisits('RM-1');
    expect(visits).toHaveLength(1);
    expect(visits[0]?.terapi_obat).toBe('N-asetilsistein kapsul 200 mg 2x1 Sesudah Makan');
  });

  it('leaves a visit recorded in this session as it is', async () => {
    const { getPatientVisits, saveScrapedVisits, saveVisit } =
      await import('./visit-history-store');

    await saveVisit({ ...scraped('Amlodipin 1x10mg'), source: 'uplink' });
    await saveScrapedVisits([scraped('NAC, CTM')]);

    expect((await getPatientVisits('RM-1'))[0]?.terapi_obat).toBe('Amlodipin 1x10mg');
  });
});
