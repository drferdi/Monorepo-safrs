import { beforeEach, describe, expect, it, vi } from 'vitest';

import type { VisitRecord } from './visit-history-store';

const deleteDatabase = vi.fn(() => ({}) as IDBOpenDBRequest);

const scraped = (terapi: string, patientId = 'RM-1'): Omit<VisitRecord, 'id'> => ({
  patient_id: patientId,
  encounter_id: `E-${patientId}`,
  timestamp: '2026-09-20T08:00:00Z',
  vitals: { sbp: 120, dbp: 80, hr: 80, rr: 18, temp: 36.5, glucose: 0 },
  keluhan_utama: 'batuk',
  terapi_obat: terapi,
  source: 'scrape',
});

describe('saveScrapedVisits', () => {
  beforeEach(() => {
    vi.resetModules();
    deleteDatabase.mockClear();
    vi.stubGlobal('indexedDB', { deleteDatabase });
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

  // Chief, 2026-10-03: "Assist hanya mengambil dari rme lalu proses done".
  it("drops the previous patient's visits when another patient's visits arrive", async () => {
    const { getPatientVisits, saveScrapedVisits } = await import('./visit-history-store');

    await saveScrapedVisits([scraped('NAC, CTM', 'RM-1')]);
    await saveScrapedVisits([scraped('Amlodipin 1x10mg', 'RM-2')]);

    expect(await getPatientVisits('RM-1')).toEqual([]);
    expect((await getPatientVisits('RM-2')).map((visit) => visit.terapi_obat)).toEqual([
      'Amlodipin 1x10mg',
    ]);
  });

  it('deletes the visit database earlier versions kept on the PC, once', async () => {
    const { getPatientVisits, saveScrapedVisits } = await import('./visit-history-store');

    await saveScrapedVisits([scraped('NAC, CTM')]);
    await getPatientVisits('RM-1');

    expect(deleteDatabase).toHaveBeenCalledTimes(1);
    expect(deleteDatabase).toHaveBeenCalledWith('sentra-visit-history');
  });
});
