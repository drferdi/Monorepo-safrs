export type StatisticSourcePage =
  'pendaftaran' | 'rujukanexternal' | 'stokobat' | 'laporanpelayananpasien';
export type StatisticFailureStage =
  'load' | 'redirect' | 'receiver' | 'parse' | 'pagination' | 'complete' | 'unknown';

export interface StatisticDiagnosticEvent {
  stage: StatisticFailureStage;
  status: 'info' | 'success' | 'warn' | 'error';
  message: string;
  url?: string;
  attempt?: number;
  rowCount?: number;
  pageNumber?: number;
}

export interface StatisticCollectorDiagnostic {
  sourcePage: StatisticSourcePage;
  events: StatisticDiagnosticEvent[];
}

export interface QueueStatisticRow {
  page: 'pendaftaran';
  tanggalPendaftaran: string;
  noPendaftaran: string;
  dataPasien: string;
  penyakitKhusus: string;
  ruanganDaftar: string;
  dokter: string;
  asuransi: string;
  statusPembayaran: string;
  statusBpjs: string;
  kunjungan: string;
  statusPelayanan: string;
}

export interface ReferralStatisticRow {
  page: 'rujukanexternal';
  tanggal: string;
  tenagaMedis1: string;
  tenagaMedis2: string;
  namaPasien: string;
  umur: string;
  rsTujuanRujukan: string;
  poliRuangan: string;
}

export interface StockStatisticRow {
  page: 'stokobat';
  namaObat: string;
  jumlahStok: string;
  nilaiPersediaan: string;
  tanggalKadaluarsa: string;
  ruangan: string;
}

export interface StatisticCountItem {
  label: string;
  count: number;
}

export interface LowStockItem {
  namaObat: string;
  ruangan: string;
  stok: number;
  status: 'Sangat Rendah' | 'Rendah';
}

export interface ExpiringStockItem {
  namaObat: string;
  tanggalKadaluarsa: string;
  sisaHari: number;
}

export interface StockValueItem {
  namaObat: string;
  nilaiPersediaan: number;
}

export interface RoomPendingItem {
  label: string;
  count: number;
}

export interface Phase1ShiftOverview {
  totalPasien: number;
  pasienPerRuangan: StatisticCountItem[];
  pasienPerDokter: StatisticCountItem[];
  breakdownAsuransi: StatisticCountItem[];
  statusPelayanan: StatisticCountItem[];
  kunjunganBaruVsLama: {
    baru: number;
    lama: number;
  };
  kasusPenyakitKhusus: StatisticCountItem[];
}

export interface Phase2ShiftOverview {
  topRuanganTerpadat: StatisticCountItem[];
  topDokterTertinggi: StatisticCountItem[];
  bpjsBermasalah: number;
  pasienBelumSelesaiTotal: number;
  pasienBelumSelesaiPerRuangan: RoomPendingItem[];
  rujukanHariIni: {
    total: number;
    rsTujuanTerbanyak: StatisticCountItem[];
    poliTujuanTerbanyak: StatisticCountItem[];
    tenagaMedisTerbanyak: StatisticCountItem[];
  };
  stokRendah: LowStockItem[];
  kadaluarsaTerdekat: ExpiringStockItem[];
  nilaiPersediaanTertinggi: StockValueItem[];
  distribusiStokPerRuangan: StatisticCountItem[];
}

export interface ShiftOverviewSnapshot {
  phase1: Phase1ShiftOverview;
  phase2?: Phase2ShiftOverview;
  fetchedAt: string;
  sourceBaseUrl: string;
  partialSources?: StatisticSourcePage[];
  errors?: Partial<Record<StatisticSourcePage, string>>;
  diagnostics?: Partial<Record<StatisticSourcePage, StatisticCollectorDiagnostic>>;
}

export interface StatisticPageScanResult<T> {
  success: boolean;
  rows: T[];
  nextPageUrl?: string | null;
  error?: string;
  diagnostics?: string[];
}

export interface DailyServiceDiagnosis {
  icd: string;
  nama: string;
  jenisKasus: string;
}

/**
 * One service row of the ePuskesmas "Laporan Harian - Pelayanan Pasien", without any identity:
 * no name, NIK, KK, eRM, phone, address, parents, SOAP, complaint, therapy or prescription.
 */
export interface DailyServiceRow {
  tanggal: string;
  jenisKelamin: 'L' | 'P' | '';
  umurTahun: number | null;
  jenisKunjungan: string;
  poli: string;
  asuransi: string;
  dokter: string;
  diagnosa: DailyServiceDiagnosis[];
  lamaAntreanMenit: number | null;
  lamaPemeriksaanMenit: number | null;
  lamaPelayananObatMenit: number | null;
}

export interface DailyServiceReport {
  /** YYYY-MM-DD */
  date: string;
  fetchedAt: string;
  sourceBaseUrl: string;
  rows: DailyServiceRow[];
}

export interface DailyDiseaseItem {
  icd: string;
  label: string;
  count: number;
  kasusBaru: number;
}

export interface DailyStatistics {
  date: string;
  totalPelayanan: number;
  jenisKelamin: { lakiLaki: number; perempuan: number };
  kunjungan: { baru: number; lama: number };
  kasusDiagnosisUtama: { baru: number; lama: number };
  topPenyakit: DailyDiseaseItem[];
  diagnosaTanpaKode: number;
  pelayananTanpaDiagnosa: number;
  perDpjp: StatisticCountItem[];
  perPoli: StatisticCountItem[];
  perAsuransi: StatisticCountItem[];
  kelompokUmur: StatisticCountItem[];
  medianMenit: { antrean: number | null; pemeriksaan: number | null; pelayananObat: number | null };
}
