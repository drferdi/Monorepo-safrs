import { describe, expect, it } from 'vitest';

import {
  buildDailyReportPage,
  SYNTHETIC_DAILY_SERVICES,
  SYNTHETIC_IDENTITY,
} from '../../tests/e2e/epuskesmas-daily-report-page';

import { buildDailyReportUrl, extractDailyServiceRows } from './daily-report';

import { detectEpuskesmasPageType } from '@/lib/rme/transfer-targeting';

function parse(html: string): Document {
  return new DOMParser().parseFromString(html, 'text/html');
}

describe('buildDailyReportUrl', () => {
  it('asks the report page for one day with the full filter set the page itself submits', () => {
    const url = new URL(buildDailyReportUrl('https://kotakediri.epuskesmas.id', '2026-10-02'));

    expect(url.origin + url.pathname).toBe('https://kotakediri.epuskesmas.id/laporanpelayananpasien');
    expect(url.searchParams.get('search[dari_tanggal]')).toBe('02-10-2026');
    expect(url.searchParams.get('search[sampai_tanggal]')).toBe('02-10-2026');
    expect(url.searchParams.get('search[active_tanggal]')).toBe('02-10-2026');
    // Only the two date fields gave "Data tidak ditemukan" live; the submitted form carries all.
    expect(url.searchParams.get('search[status_periksa]')).toBe('0');
    expect(url.searchParams.get('search[ruangan_name]')).toBe('Semua');
    expect(url.searchParams.has('search[petugas_id]')).toBe(true);
    expect(url.searchParams.get('search[sampai_umur_tahun]')).toBe('0');
  });
});

describe('the report tab beside the clinical pages', () => {
  it('is no clinical page, so loading it never triggers an anamnesa or diagnosa scrape', () => {
    const url = buildDailyReportUrl('https://kotakediri.epuskesmas.id', '2026-10-02');
    const page = parse(buildDailyReportPage(SYNTHETIC_DAILY_SERVICES));

    expect(detectEpuskesmasPageType(url, page)).toBeNull();
    expect(detectEpuskesmasPageType(new URL(url).toString(), page)).toBeNull();
  });
});

describe('extractDailyServiceRows', () => {
  it('reads every service row by header name, past the SOAP sub-headers', () => {
    const { rows, missingHeaders } = extractDailyServiceRows(
      parse(buildDailyReportPage(SYNTHETIC_DAILY_SERVICES))
    );

    expect(missingHeaders).toEqual([]);
    expect(rows).toHaveLength(4);
    expect(rows[0]).toEqual({
      tanggal: '02-10-2026',
      jenisKelamin: 'P',
      umurTahun: 45,
      jenisKunjungan: 'LAMA',
      poli: 'DEWASA',
      asuransi: 'BPJS Kesehatan',
      dokter: 'dr. Satu',
      diagnosa: [
        { icd: 'I10', nama: 'Essential (primary) hypertension', jenisKasus: 'LAMA' },
        { icd: 'K30', nama: 'Dyspepsia', jenisKasus: 'BARU' },
      ],
      lamaAntreanMenit: 70,
      lamaPemeriksaanMenit: 12,
      lamaPelayananObatMenit: 5,
    });
    expect(rows[1].jenisKelamin).toBe('L');
    expect(rows[3].diagnosa).toEqual([
      { icd: '', nama: 'Pemeriksaan umum tanpa kode', jenisKasus: 'BARU' },
    ]);
  });

  it('never carries a name, NIK, phone, address or complaint out of the page', () => {
    const { rows } = extractDailyServiceRows(parse(buildDailyReportPage(SYNTHETIC_DAILY_SERVICES)));
    const serialized = JSON.stringify(rows);

    for (const value of Object.values(SYNTHETIC_IDENTITY)) {
      expect(serialized).not.toContain(value);
    }
  });

  it('reads the "Data tidak ditemukan" row as a day without services', () => {
    const result = extractDailyServiceRows(parse(buildDailyReportPage([])));

    expect(result).toEqual({ rows: [], missingHeaders: [] });
  });

  it('names a required column the page no longer has instead of guessing', () => {
    const html = buildDailyReportPage(SYNTHETIC_DAILY_SERVICES).replace(
      '<td rowspan="2">Dokter / Tenaga Medis</td>',
      '<td rowspan="2">DPJP</td>'
    );

    const result = extractDailyServiceRows(parse(html));

    expect(result.rows).toEqual([]);
    expect(result.missingHeaders).toEqual(['Dokter / Tenaga Medis']);
  });
});
