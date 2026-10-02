import { describe, expect, it } from 'vitest';

import { buildDailyStatistics } from './daily-statistics';
import type { DailyServiceRow } from './types';

function row(overrides: Partial<DailyServiceRow>): DailyServiceRow {
  return {
    tanggal: '02-10-2026',
    jenisKelamin: 'P',
    umurTahun: 40,
    jenisKunjungan: 'LAMA',
    poli: 'DEWASA',
    asuransi: 'BPJS Kesehatan',
    dokter: 'dr. Satu',
    diagnosa: [{ icd: 'I10', nama: 'Essential (primary) hypertension', jenisKasus: 'LAMA' }],
    lamaAntreanMenit: 30,
    lamaPemeriksaanMenit: 10,
    lamaPelayananObatMenit: 5,
    ...overrides,
  };
}

describe('buildDailyStatistics', () => {
  const rows: DailyServiceRow[] = [
    row({ diagnosa: [
      { icd: 'I10', nama: 'Essential (primary) hypertension', jenisKasus: 'LAMA' },
      { icd: 'K30', nama: 'Dyspepsia', jenisKasus: 'BARU' },
    ], lamaAntreanMenit: 70 }),
    row({ jenisKelamin: 'L', umurTahun: 67, poli: 'LANSIA', lamaAntreanMenit: 20 }),
    row({
      umurTahun: 3, jenisKunjungan: 'BARU', poli: 'ANAK (0-18 TAHUN)', asuransi: 'Umum',
      dokter: 'dr. Dua',
      diagnosa: [{ icd: 'J06.9', nama: 'Acute upper respiratory infection, unspecified', jenisKasus: 'BARU' }],
      lamaAntreanMenit: null,
    }),
    row({ dokter: '', diagnosa: [{ icd: '', nama: 'Pemeriksaan umum tanpa kode', jenisKasus: 'BARU' }] }),
    row({ dokter: 'dr. Dua', diagnosa: [] }),
  ];

  const stats = buildDailyStatistics('2026-10-02', rows);

  it('counts services, sex, visit type and the primary diagnosis case type', () => {
    expect(stats.date).toBe('2026-10-02');
    expect(stats.totalPelayanan).toBe(5);
    expect(stats.jenisKelamin).toEqual({ lakiLaki: 1, perempuan: 4 });
    expect(stats.kunjungan).toEqual({ baru: 1, lama: 4 });
    expect(stats.kasusDiagnosisUtama).toEqual({ baru: 2, lama: 2 });
  });

  it('ranks diseases by ICD over every diagnosis, with their new cases', () => {
    expect(stats.topPenyakit).toEqual([
      { icd: 'I10', label: 'I10 · Essential (primary) hypertension', count: 2, kasusBaru: 0 },
      { icd: 'J06.9', label: 'J06.9 · Acute upper respiratory infection, unspecified', count: 1, kasusBaru: 1 },
      { icd: 'K30', label: 'K30 · Dyspepsia', count: 1, kasusBaru: 1 },
    ]);
    expect(stats.diagnosaTanpaKode).toBe(1);
    expect(stats.pelayananTanpaDiagnosa).toBe(1);
  });

  it('counts services per DPJP, poli, payer and age band', () => {
    // Equal counts read in name order, so the list does not shuffle between refreshes.
    expect(stats.perDpjp).toEqual([
      { label: 'dr. Dua', count: 2 },
      { label: 'dr. Satu', count: 2 },
      { label: 'Tanpa DPJP', count: 1 },
    ]);
    expect(stats.perPoli[0]).toEqual({ label: 'DEWASA', count: 3 });
    expect(stats.perAsuransi).toEqual([
      { label: 'BPJS Kesehatan', count: 4 },
      { label: 'Umum', count: 1 },
    ]);
    expect(stats.kelompokUmur).toEqual([
      { label: '0–4 th', count: 1 },
      { label: '5–14 th', count: 0 },
      { label: '15–44 th', count: 3 },
      { label: '45–59 th', count: 0 },
      { label: '≥60 th', count: 1 },
    ]);
  });

  it('gives the median service times in minutes, skipping unknown ones', () => {
    expect(stats.medianMenit).toEqual({ antrean: 30, pemeriksaan: 10, pelayananObat: 5 });
  });
});
