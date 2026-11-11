/**
 * The ePuskesmas "Laporan Harian - Pelayanan Pasien" (`/laporanpelayananpasien`): one row per
 * service with sex, age, poli, payer, DPJP, five diagnoses and service times, but also the
 * patient's name, NIK, phone, address and SOAP. Columns are read by header name, and only the
 * whitelisted ones below ever leave the page.
 */
import type { DailyServiceDiagnosis, DailyServiceRow } from './types';

export const DAILY_REPORT_ROUTE = '/laporanpelayananpasien';

const REQUIRED_HEADERS = {
  tanggal: 'Tanggal',
  jenisKelamin: 'Jenis Kelamin',
  umurTahun: 'Umur Tahun',
  jenisKunjungan: 'Jenis Kunjungan',
  poli: 'Poli/Ruangan',
  asuransi: 'Asuransi',
  dokter: 'Dokter / Tenaga Medis',
  diagnosa1: 'Diagnosa 1',
  jenisKasus1: 'Jenis Kasus 1',
} as const;

const OPTIONAL_HEADERS = {
  diagnosa2: 'Diagnosa 2',
  jenisKasus2: 'Jenis Kasus 2',
  diagnosa3: 'Diagnosa 3',
  jenisKasus3: 'Jenis Kasus 3',
  diagnosa4: 'Diagnosa 4',
  jenisKasus4: 'Jenis Kasus 4',
  diagnosa5: 'Diagnosa 5',
  jenisKasus5: 'Jenis Kasus 5',
  lamaAntrean: 'Lama Antrean',
  lamaPemeriksaan: 'Lama Pemeriksaan',
  lamaPelayananObat: 'Lama Pelayanan Obat',
} as const;

type ColumnKey = keyof typeof REQUIRED_HEADERS | keyof typeof OPTIONAL_HEADERS;

function cleanText(raw: string | null | undefined): string {
  return (raw || '').replace(/\s+/g, ' ').trim();
}

function headerKey(text: string): string {
  return cleanText(text).toLowerCase();
}

/** "2026-10-02" → "02-10-2026", the date format of the report's filter. */
function toReportDate(isoDate: string): string {
  const [year, month, day] = isoDate.split('-');
  return `${day}-${month}-${year}`;
}

/** The report URL for one day, with every field the page's own "Tampilkan" submits. */
export function buildDailyReportUrl(origin: string, isoDate: string): string {
  const date = toReportDate(isoDate);
  const params: Array<[string, string]> = [
    ['dari_tanggal', date],
    ['active_tanggal', date],
    ['sampai_tanggal', date],
    ['status_periksa', '0'],
    ['pendaftaran', ''],
    ['ruangan_id', ''],
    ['ruangan_name', 'Semua'],
    ['kamar_name', ''],
    ['bed_name', ''],
    ['jenis_kunjungan', ''],
    ['kunjungan', ''],
    ['reg_type', ''],
    ['asuransi_id', ''],
    ['jenis_kelamin', ''],
    ['wilayah', ''],
    ['kecamatan_id', ''],
    ['kecamatan_nama', ''],
    ['kelurahan_id', ''],
    ['kelurahan_nama', ''],
    ['rt', ''],
    ['rw', ''],
    ['pekerjaan_id', ''],
    ['pekerjaan_nama', ''],
    ['5kunjunganlebih', ''],
    ['petugas_id', ''],
    ['petugas_nama', ''],
    ['diagnosa_id', ''],
    ['diagnosa', ''],
    ['tindakan', ''],
    ['obat_id', ''],
    ['obat', ''],
    ['kelainan', ''],
    ['dari_umur_tahun', '0'],
    ['dari_umur_bulan', '0'],
    ['dari_umur_hari', '0'],
    ['sampai_umur_tahun', '0'],
    ['sampai_umur_bulan', '0'],
    ['sampai_umur_hari', '0'],
  ];
  const search = new URLSearchParams(params.map(([name, value]) => [`search[${name}]`, value]));
  return `${origin}${DAILY_REPORT_ROUTE}?${search.toString()}`;
}

/**
 * The label of every data column, header rows laid out on a grid so a colspan (SOAP over four
 * sub-headers) or a rowspan shifts the columns after it the way the browser does.
 */
function leafHeaders(table: HTMLTableElement): string[] {
  const grid: string[][] = [];
  const headRows = table.tHead ? Array.from(table.tHead.rows) : [];
  headRows.forEach((tr, rowIndex) => {
    const gridRow = (grid[rowIndex] ??= []);
    let column = 0;
    for (const th of Array.from(tr.cells)) {
      while (gridRow[column] !== undefined) column += 1;
      const text = cleanText(th.textContent);
      const colSpan = Math.max(1, th.colSpan);
      for (let dr = 0; dr < Math.max(1, th.rowSpan); dr += 1) {
        const target = (grid[rowIndex + dr] ??= []);
        for (let dc = 0; dc < colSpan; dc += 1) target[column + dc] = text;
      }
      column += colSpan;
    }
  });

  const width = Math.max(0, ...grid.map((row) => row.length));
  return Array.from({ length: width }, (_, column) => {
    const parts: string[] = [];
    for (const row of grid) {
      const text = row[column];
      if (text && parts[parts.length - 1] !== text) parts.push(text);
    }
    return parts.join(' / ');
  });
}

function columnIndexes(headers: string[]): Partial<Record<ColumnKey, number>> {
  const byText = new Map<string, number>();
  headers.forEach((text, index) => {
    if (!byText.has(headerKey(text))) byText.set(headerKey(text), index);
  });
  const indexes: Partial<Record<ColumnKey, number>> = {};
  for (const [key, text] of Object.entries({ ...REQUIRED_HEADERS, ...OPTIONAL_HEADERS })) {
    const index = byText.get(headerKey(text));
    if (index !== undefined) indexes[key as ColumnKey] = index;
  }
  return indexes;
}

function parseSex(text: string): DailyServiceRow['jenisKelamin'] {
  if (/^(l|laki)/i.test(text)) return 'L';
  if (/^(p|perempuan)/i.test(text)) return 'P';
  return '';
}

function parseLeadingNumber(text: string): number | null {
  const match = text.match(/^\d+/);
  return match ? Number(match[0]) : null;
}

/** "0 hari 1 jam 10 menit" → 70. */
function parseMinutes(text: string): number | null {
  const units: Record<string, number> = { hari: 1440, jam: 60, menit: 1, detik: 1 / 60 };
  let total = 0;
  let found = false;
  for (const [, amount, unit] of text.matchAll(/(\d+)\s*(hari|jam|menit|detik)/gi)) {
    total += Number(amount) * units[unit.toLowerCase()];
    found = true;
  }
  return found ? Math.round(total) : null;
}

/** "Essential (primary) hypertension (I10)" → { icd: 'I10', nama: 'Essential (primary) hypertension' }. */
function parseDiagnosis(text: string, jenisKasus: string): DailyServiceDiagnosis | null {
  if (!text) return null;
  const match = text.match(/^(.*?)\s*\(([A-Z]\d{2}(?:\.\d{1,2})?)\)$/);
  return match
    ? { icd: match[2], nama: match[1], jenisKasus }
    : { icd: '', nama: text, jenisKasus };
}

function findReportTable(root: ParentNode): { table: HTMLTableElement; headers: string[] } | null {
  let best: { table: HTMLTableElement; headers: string[]; score: number } | null = null;
  for (const table of Array.from(root.querySelectorAll('table'))) {
    const headers = leafHeaders(table);
    const score = Object.keys(columnIndexes(headers)).length;
    if (score > 0 && (!best || score > best.score)) best = { table, headers, score };
  }
  return best;
}

export function extractDailyServiceRows(root: ParentNode): {
  rows: DailyServiceRow[];
  missingHeaders: string[];
} {
  const found = findReportTable(root);
  if (!found) return { rows: [], missingHeaders: Object.values(REQUIRED_HEADERS) };

  const index = columnIndexes(found.headers);
  const missingHeaders = (Object.keys(REQUIRED_HEADERS) as Array<keyof typeof REQUIRED_HEADERS>)
    .filter((key) => index[key] === undefined)
    .map((key) => REQUIRED_HEADERS[key]);
  if (missingHeaders.length > 0) return { rows: [], missingHeaders };

  const lastColumn = Math.max(...Object.values(index));
  const rows: DailyServiceRow[] = [];
  for (const tr of Array.from(found.table.tBodies).flatMap((body) => Array.from(body.rows))) {
    // "Data tidak ditemukan" is one cell spanning the table.
    if (tr.cells.length <= lastColumn) continue;
    const read = (key: ColumnKey): string => {
      const column = index[key];
      return column === undefined ? '' : cleanText(tr.cells[column]?.textContent);
    };
    const diagnosa = ([1, 2, 3, 4, 5] as const)
      .map((n) => parseDiagnosis(read(`diagnosa${n}`), read(`jenisKasus${n}`)))
      .filter((item): item is DailyServiceDiagnosis => item !== null);

    rows.push({
      tanggal: read('tanggal'),
      jenisKelamin: parseSex(read('jenisKelamin')),
      umurTahun: parseLeadingNumber(read('umurTahun')),
      jenisKunjungan: read('jenisKunjungan').toUpperCase(),
      poli: read('poli'),
      asuransi: read('asuransi'),
      dokter: read('dokter'),
      diagnosa,
      lamaAntreanMenit: parseMinutes(read('lamaAntrean')),
      lamaPemeriksaanMenit: parseMinutes(read('lamaPemeriksaan')),
      lamaPelayananObatMenit: parseMinutes(read('lamaPelayananObat')),
    });
  }
  return { rows, missingHeaders: [] };
}
