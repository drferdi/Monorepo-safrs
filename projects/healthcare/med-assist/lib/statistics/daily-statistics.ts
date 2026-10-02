import type {
  DailyDiseaseItem,
  DailyServiceRow,
  DailyStatistics,
  StatisticCountItem,
} from './types';

const AGE_BANDS: Array<{ label: string; max: number }> = [
  { label: '0–4 th', max: 4 },
  { label: '5–14 th', max: 14 },
  { label: '15–44 th', max: 44 },
  { label: '45–59 th', max: 59 },
  { label: '≥60 th', max: Number.POSITIVE_INFINITY },
];

/** Highest count first; equal counts in name order, so a list does not shuffle between loads. */
function byCountThenLabel(a: { count: number; label: string }, b: { count: number; label: string }) {
  return b.count - a.count || a.label.localeCompare(b.label);
}

function countBy(rows: DailyServiceRow[], pick: (row: DailyServiceRow) => string): StatisticCountItem[] {
  const counts = new Map<string, number>();
  for (const row of rows) {
    const label = pick(row);
    counts.set(label, (counts.get(label) ?? 0) + 1);
  }
  return Array.from(counts, ([label, count]) => ({ label, count })).sort(byCountThenLabel);
}

function median(values: Array<number | null>): number | null {
  const known = values.filter((value): value is number => value !== null).sort((a, b) => a - b);
  if (known.length === 0) return null;
  const middle = Math.floor(known.length / 2);
  return known.length % 2 === 1 ? known[middle] : Math.round((known[middle - 1] + known[middle]) / 2);
}

export function buildDailyStatistics(date: string, rows: DailyServiceRow[]): DailyStatistics {
  const diseases = new Map<string, DailyDiseaseItem>();
  let diagnosaTanpaKode = 0;
  for (const diagnosis of rows.flatMap((row) => row.diagnosa)) {
    if (!diagnosis.icd) {
      diagnosaTanpaKode += 1;
      continue;
    }
    const item = diseases.get(diagnosis.icd) ?? {
      icd: diagnosis.icd,
      label: `${diagnosis.icd} · ${diagnosis.nama}`,
      count: 0,
      kasusBaru: 0,
    };
    item.count += 1;
    if (diagnosis.jenisKasus === 'BARU') item.kasusBaru += 1;
    diseases.set(diagnosis.icd, item);
  }

  const primaryCases = rows.map((row) => row.diagnosa[0]?.jenisKasus);

  return {
    date,
    totalPelayanan: rows.length,
    jenisKelamin: {
      lakiLaki: rows.filter((row) => row.jenisKelamin === 'L').length,
      perempuan: rows.filter((row) => row.jenisKelamin === 'P').length,
    },
    kunjungan: {
      baru: rows.filter((row) => row.jenisKunjungan === 'BARU').length,
      lama: rows.filter((row) => row.jenisKunjungan === 'LAMA').length,
    },
    kasusDiagnosisUtama: {
      baru: primaryCases.filter((kasus) => kasus === 'BARU').length,
      lama: primaryCases.filter((kasus) => kasus === 'LAMA').length,
    },
    // Sorted by count, then by ICD code.
    topPenyakit: Array.from(diseases.values())
      .sort((a, b) => b.count - a.count || a.icd.localeCompare(b.icd))
      .slice(0, 10),
    diagnosaTanpaKode,
    pelayananTanpaDiagnosa: rows.filter((row) => row.diagnosa.length === 0).length,
    perDpjp: countBy(rows, (row) => row.dokter || 'Tanpa DPJP'),
    perPoli: countBy(rows, (row) => row.poli || 'Tanpa poli'),
    perAsuransi: countBy(rows, (row) => row.asuransi || 'Tanpa asuransi'),
    kelompokUmur: AGE_BANDS.map((band, index) => ({
      label: band.label,
      count: rows.filter(
        (row) =>
          row.umurTahun !== null &&
          row.umurTahun <= band.max &&
          (index === 0 || row.umurTahun > AGE_BANDS[index - 1].max)
      ).length,
    })),
    medianMenit: {
      antrean: median(rows.map((row) => row.lamaAntreanMenit)),
      pemeriksaan: median(rows.map((row) => row.lamaPemeriksaanMenit)),
      pelayananObat: median(rows.map((row) => row.lamaPelayananObatMenit)),
    },
  };
}
