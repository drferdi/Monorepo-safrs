import {
  isFinalServiceStatus,
  isMeaningfulSpecialCase,
  normalizeBpjsStatus,
  normalizeCategoryLabel,
  normalizeServiceStatus,
  normalizeVisitKind,
} from './normalizers';
import type {
  ExpiringStockItem,
  LowStockItem,
  Phase1ShiftOverview,
  Phase2ShiftOverview,
  QueueStatisticRow,
  ReferralStatisticRow,
  ShiftOverviewSnapshot,
  StatisticCountItem,
  StockStatisticRow,
  StockValueItem,
} from './types';

const LOW_STOCK_CRITICAL_THRESHOLD = 10;
const LOW_STOCK_WARNING_THRESHOLD = 25;
const EXPIRY_WARNING_DAYS = 90;

function sortCounts(items: Map<string, number>): StatisticCountItem[] {
  return Array.from(items.entries())
    .map(([label, count]) => ({ label, count }))
    .sort((a, b) => b.count - a.count || a.label.localeCompare(b.label));
}

function countBy(values: string[]): StatisticCountItem[] {
  const counts = new Map<string, number>();
  for (const value of values) {
    counts.set(value, (counts.get(value) || 0) + 1);
  }
  return sortCounts(counts);
}

function parseNumber(raw: string): number {
  const numeric = raw
    .replace(/[^0-9,-]/g, '')
    .replace(/\./g, '')
    .replace(',', '.');
  const parsed = Number.parseFloat(numeric);
  return Number.isFinite(parsed) ? parsed : 0;
}

function parseDate(raw: string): Date | null {
  const value = raw.trim();
  if (!value) return null;
  const dash = value.match(/^(\d{2})-(\d{2})-(\d{4})$/);
  if (dash) {
    const parsed = new Date(`${dash[3]}-${dash[2]}-${dash[1]}T00:00:00`);
    return Number.isNaN(parsed.getTime()) ? null : parsed;
  }
  const iso = new Date(value);
  return Number.isNaN(iso.getTime()) ? null : iso;
}

function daysUntil(date: Date, now = new Date()): number {
  const diff = date.getTime() - now.getTime();
  return Math.ceil(diff / (24 * 60 * 60 * 1000));
}

export function buildPhase1ShiftOverview(rows: QueueStatisticRow[]): Phase1ShiftOverview {
  return {
    totalPasien: rows.length,
    pasienPerRuangan: countBy(rows.map((row) => normalizeCategoryLabel(row.ruanganDaftar))),
    pasienPerDokter: countBy(rows.map((row) => normalizeCategoryLabel(row.dokter))),
    breakdownAsuransi: countBy(rows.map((row) => normalizeCategoryLabel(row.asuransi))),
    statusPelayanan: countBy(rows.map((row) => normalizeServiceStatus(row.statusPelayanan))),
    kunjunganBaruVsLama: {
      baru: rows.filter((row) => normalizeVisitKind(row.kunjungan) === 'Baru').length,
      lama: rows.filter((row) => normalizeVisitKind(row.kunjungan) === 'Lama').length,
    },
    kasusPenyakitKhusus: countBy(
      rows
        .map((row) => row.penyakitKhusus)
        .filter((value) => isMeaningfulSpecialCase(value))
        .map((value) => normalizeCategoryLabel(value))
    ),
  };
}

function buildLowStock(stockRows: StockStatisticRow[]): LowStockItem[] {
  return stockRows
    .map((row) => {
      const stok = parseNumber(row.jumlahStok);
      if (stok <= 0 || stok > LOW_STOCK_WARNING_THRESHOLD) return null;
      return {
        namaObat: normalizeCategoryLabel(row.namaObat),
        ruangan: normalizeCategoryLabel(row.ruangan),
        stok,
        status: stok <= LOW_STOCK_CRITICAL_THRESHOLD ? 'Sangat Rendah' : 'Rendah',
      } satisfies LowStockItem;
    })
    .filter((item): item is LowStockItem => Boolean(item))
    .sort((a, b) => a.stok - b.stok || a.namaObat.localeCompare(b.namaObat));
}

function buildExpiringStock(stockRows: StockStatisticRow[], now = new Date()): ExpiringStockItem[] {
  return stockRows
    .map((row) => {
      const date = parseDate(row.tanggalKadaluarsa);
      if (!date) return null;
      const sisaHari = daysUntil(date, now);
      if (sisaHari < 0 || sisaHari > EXPIRY_WARNING_DAYS) return null;
      return {
        namaObat: normalizeCategoryLabel(row.namaObat),
        tanggalKadaluarsa: row.tanggalKadaluarsa,
        sisaHari,
      } satisfies ExpiringStockItem;
    })
    .filter((item): item is ExpiringStockItem => Boolean(item))
    .sort((a, b) => a.sisaHari - b.sisaHari || a.namaObat.localeCompare(b.namaObat));
}

function buildStockValue(stockRows: StockStatisticRow[]): StockValueItem[] {
  return stockRows
    .map((row) => ({
      namaObat: normalizeCategoryLabel(row.namaObat),
      nilaiPersediaan: parseNumber(row.nilaiPersediaan),
    }))
    .filter((row) => row.nilaiPersediaan > 0)
    .sort((a, b) => b.nilaiPersediaan - a.nilaiPersediaan || a.namaObat.localeCompare(b.namaObat));
}

export function buildPhase2ShiftOverview(
  queueRows: QueueStatisticRow[],
  referralRows: ReferralStatisticRow[],
  stockRows: StockStatisticRow[]
): Phase2ShiftOverview {
  const rsTujuan = countBy(referralRows.map((row) => normalizeCategoryLabel(row.rsTujuanRujukan)));
  const poliTujuan = countBy(referralRows.map((row) => normalizeCategoryLabel(row.poliRuangan)));
  const tenagaMedis = countBy(
    referralRows
      .flatMap((row) => [row.tenagaMedis1, row.tenagaMedis2])
      .map((value) => normalizeCategoryLabel(value))
      .filter((value) => value !== 'Tidak Diketahui')
  );
  const pendingPerRoom = countBy(
    queueRows
      .filter((row) => !isFinalServiceStatus(row.statusPelayanan))
      .map((row) => normalizeCategoryLabel(row.ruanganDaftar))
  );

  return {
    topRuanganTerpadat: countBy(queueRows.map((row) => normalizeCategoryLabel(row.ruanganDaftar))),
    topDokterTertinggi: countBy(queueRows.map((row) => normalizeCategoryLabel(row.dokter))),
    bpjsBermasalah: queueRows.filter((row) => normalizeBpjsStatus(row.statusBpjs) !== 'Aktif')
      .length,
    pasienBelumSelesaiTotal: queueRows.filter((row) => !isFinalServiceStatus(row.statusPelayanan))
      .length,
    pasienBelumSelesaiPerRuangan: pendingPerRoom,
    rujukanHariIni: {
      total: referralRows.length,
      rsTujuanTerbanyak: rsTujuan,
      poliTujuanTerbanyak: poliTujuan,
      tenagaMedisTerbanyak: tenagaMedis,
    },
    stokRendah: buildLowStock(stockRows),
    kadaluarsaTerdekat: buildExpiringStock(stockRows),
    nilaiPersediaanTertinggi: buildStockValue(stockRows),
    distribusiStokPerRuangan: countBy(stockRows.map((row) => normalizeCategoryLabel(row.ruangan))),
  };
}

export function buildShiftOverviewSnapshot(args: {
  sourceBaseUrl: string;
  queueRows: QueueStatisticRow[];
  referralRows?: ReferralStatisticRow[];
  stockRows?: StockStatisticRow[];
  partialSources?: ShiftOverviewSnapshot['partialSources'];
  errors?: ShiftOverviewSnapshot['errors'];
}): ShiftOverviewSnapshot {
  const phase1 = buildPhase1ShiftOverview(args.queueRows);
  const hasPhase2 = Boolean(args.referralRows || args.stockRows);
  return {
    phase1,
    phase2: hasPhase2
      ? buildPhase2ShiftOverview(args.queueRows, args.referralRows || [], args.stockRows || [])
      : undefined,
    fetchedAt: new Date().toISOString(),
    sourceBaseUrl: args.sourceBaseUrl,
    partialSources: args.partialSources,
    errors: args.errors,
  };
}
