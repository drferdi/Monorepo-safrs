import type { DailyServiceRow } from './types';

const DIAGNOSIS_SLOTS = [1, 2, 3, 4, 5] as const;

const HEADER = [
  'tanggal',
  'jenis_kelamin',
  'umur_tahun',
  'jenis_kunjungan',
  'poli',
  'asuransi',
  'dokter',
  ...DIAGNOSIS_SLOTS.flatMap((n) => [`diagnosa_${n}_icd`, `diagnosa_${n}_nama`, `jenis_kasus_${n}`]),
  'lama_antrean_menit',
  'lama_pemeriksaan_menit',
  'lama_pelayanan_obat_menit',
];

function field(value: string | number | null): string {
  const text = value === null ? '' : String(value);
  return /[",\n]/.test(text) ? `"${text.replace(/"/g, '""')}"` : text;
}

/** "02-10-2026" → "2026-10-02", so pandas reads it as a date. */
function isoDate(reportDate: string): string {
  const match = reportDate.match(/^(\d{2})-(\d{2})-(\d{4})/);
  return match ? `${match[3]}-${match[2]}-${match[1]}` : reportDate;
}

/** One wide row per service, identity-free, for `pandas.read_csv`. */
export function dailyRowsToCsv(rows: DailyServiceRow[]): string {
  const lines = rows.map((row) =>
    [
      isoDate(row.tanggal),
      row.jenisKelamin,
      row.umurTahun,
      row.jenisKunjungan,
      row.poli,
      row.asuransi,
      row.dokter,
      ...DIAGNOSIS_SLOTS.flatMap((n) => {
        const diagnosis = row.diagnosa[n - 1];
        return [diagnosis?.icd ?? '', diagnosis?.nama ?? '', diagnosis?.jenisKasus ?? ''];
      }),
      row.lamaAntreanMenit,
      row.lamaPemeriksaanMenit,
      row.lamaPelayananObatMenit,
    ]
      .map(field)
      .join(',')
  );
  return [HEADER.join(','), ...lines].join('\n');
}
