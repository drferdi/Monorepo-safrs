import { describe, expect, it } from 'vitest';

import { dailyRowsToCsv } from './daily-csv';
import type { DailyServiceRow } from './types';

describe('dailyRowsToCsv', () => {
  it('writes one wide row per service, ready for pandas.read_csv', () => {
    const rows: DailyServiceRow[] = [
      {
        tanggal: '02-10-2026',
        jenisKelamin: 'P',
        umurTahun: 45,
        jenisKunjungan: 'LAMA',
        poli: 'DEWASA',
        asuransi: 'BPJS Kesehatan',
        dokter: 'dr. Satu, Sp.PD',
        diagnosa: [
          { icd: 'J06.9', nama: 'Acute upper respiratory infection, unspecified', jenisKasus: 'BARU' },
        ],
        lamaAntreanMenit: 70,
        lamaPemeriksaanMenit: null,
        lamaPelayananObatMenit: 5,
      },
    ];

    const lines = dailyRowsToCsv(rows).split('\n');

    expect(lines[0]).toBe(
      'tanggal,jenis_kelamin,umur_tahun,jenis_kunjungan,poli,asuransi,dokter,' +
        'diagnosa_1_icd,diagnosa_1_nama,jenis_kasus_1,diagnosa_2_icd,diagnosa_2_nama,jenis_kasus_2,' +
        'diagnosa_3_icd,diagnosa_3_nama,jenis_kasus_3,diagnosa_4_icd,diagnosa_4_nama,jenis_kasus_4,' +
        'diagnosa_5_icd,diagnosa_5_nama,jenis_kasus_5,' +
        'lama_antrean_menit,lama_pemeriksaan_menit,lama_pelayanan_obat_menit'
    );
    expect(lines[1]).toBe(
      '2026-10-02,P,45,LAMA,DEWASA,BPJS Kesehatan,"dr. Satu, Sp.PD",' +
        'J06.9,"Acute upper respiratory infection, unspecified",BARU,,,,,,,,,,,,,70,,5'
    );
    expect(lines).toHaveLength(2);
  });
});
