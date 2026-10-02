import { beforeEach, describe, expect, it, vi } from 'vitest';

import type { DailyServiceReport } from './types';

const store: Record<string, unknown> = {};
vi.mock('wxt/browser', () => ({
  browser: {
    storage: {
      local: {
        get: vi.fn(async (key: string) => ({ [key]: store[key] })),
        set: vi.fn(async (items: Record<string, unknown>) => {
          Object.assign(store, items);
        }),
      },
    },
  },
}));

import { readDailyReport, readPreviousDailyReport, saveDailyReport } from './daily-cache';

function report(date: string, rowCount = 1): DailyServiceReport {
  return {
    date,
    fetchedAt: `${date}T06:00:00.000Z`,
    sourceBaseUrl: 'https://kotakediri.epuskesmas.id',
    rows: Array.from({ length: rowCount }, () => ({
      tanggal: date,
      jenisKelamin: 'P' as const,
      umurTahun: 40,
      jenisKunjungan: 'LAMA',
      poli: 'DEWASA',
      asuransi: 'Umum',
      dokter: 'dr. Satu',
      diagnosa: [],
      lamaAntreanMenit: null,
      lamaPemeriksaanMenit: null,
      lamaPelayananObatMenit: null,
    })),
  };
}

describe('daily report store', () => {
  beforeEach(() => {
    for (const key of Object.keys(store)) delete store[key];
  });

  it('keeps each day apart and finds the latest stored day before a date', async () => {
    await saveDailyReport(report('2026-09-29'));
    await saveDailyReport(report('2026-10-01'));
    await saveDailyReport(report('2026-10-02', 3));

    expect((await readDailyReport('2026-10-02'))?.rows).toHaveLength(3);
    expect(await readDailyReport('2026-09-30')).toBeNull();
    expect((await readPreviousDailyReport('2026-10-02'))?.date).toBe('2026-10-01');
    expect((await readPreviousDailyReport('2026-10-01'))?.date).toBe('2026-09-29');
    expect(await readPreviousDailyReport('2026-09-29')).toBeNull();
  });

  it('replaces a reloaded day and keeps only the 31 most recent days', async () => {
    for (let day = 1; day <= 31; day += 1) {
      await saveDailyReport(report(`2026-08-${String(day).padStart(2, '0')}`));
    }
    await saveDailyReport(report('2026-09-01'));
    await saveDailyReport(report('2026-09-02'));
    await saveDailyReport(report('2026-09-02', 5));

    expect(await readDailyReport('2026-08-01')).toBeNull();
    expect(await readDailyReport('2026-08-02')).toBeNull();
    expect(await readDailyReport('2026-08-03')).not.toBeNull();
    expect((await readDailyReport('2026-09-02'))?.rows).toHaveLength(5);
  });
});
