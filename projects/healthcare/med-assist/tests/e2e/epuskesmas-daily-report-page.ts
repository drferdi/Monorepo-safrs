/**
 * A synthetic "Laporan Harian - Pelayanan Pasien" page shaped like the live ePuskesmas one
 * (read live 2026-10-02, structure only): a filter summary table first, then the report table
 * whose first header row has 79 cells (SOAP spans four sub-headers in the second row, the last
 * header "Jumlah Pelayanan" has no data cell), one body row of 81 cells per service. Every value
 * here is invented.
 */

export const DAILY_REPORT_HEADERS = [
  'No.', 'Tanggal', 'Nama Pasien', 'No. eRM', 'NIK', 'No. KK', 'No. RM Lama', 'No. Dokumen RM',
  'Jenis Kelamin', 'No Telp', 'Alamat', 'RT', 'RW', 'Pekerjaan', 'Tanggal Pemeriksaan',
  'Kelurahan', 'Tempat Lahir', 'Tgl.Lahir', 'Umur Tahun', 'Umur Bulan', 'Umur Hari', 'Nama Ayah',
  'Nama Ibu', 'Jenis Kunjungan', 'Poli/Ruangan', 'Asuransi', 'No. Asuransi', 'Kelainan',
  'Dokter / Tenaga Medis', 'Perawat / Bidan / Nutrisionis / Sanitarian', 'SOAP', 'Keluhan Utama',
  'Keluhan Tambahan', 'Lama Sakit', 'Merokok', 'Konsumsi Alkohol', 'Kurang Sayur/Buah', 'Terapi',
  'Edukasi', 'Tindakan Keperawatan', 'Keterangan', 'RPS', 'RPD', 'RPK', 'Alergi', 'Kesadaran',
  'Triage', 'Tinggi', 'Badan', 'Lingkar Perut', 'IMT', 'Hasil IMT', 'Sistole', 'Diastole',
  'Nafas', 'Detak Nadi', 'Detak Jantung', 'Suhu', 'Aktifitas Fisik dan Assesment',
  'Skala Nyeri', 'Diagnosa 1', 'Jenis Kasus 1', 'Diagnosa 2', 'Jenis Kasus 2', 'Diagnosa 3',
  'Jenis Kasus 3', 'Diagnosa 4', 'Jenis Kasus 4', 'Diagnosa 5', 'Jenis Kasus 5', 'Tindakan',
  'Resep', 'Apoteker', 'Pendaftaran/Rujukan Internal', 'Lama Antrean', 'Lama Pemeriksaan',
  'Lama Pelayanan Obat', 'Petugas Pendaftaran', 'Jumlah Pelayanan',
] as const;

const SOAP_SUBHEADERS = ['Assessment', 'Subjective', 'Objective', 'Planning'];

export interface SyntheticDailyService {
  jenisKelamin: 'Laki-laki' | 'Perempuan';
  umur: string;
  kunjungan: 'BARU' | 'LAMA';
  poli: string;
  asuransi: string;
  dokter: string;
  diagnosa: Array<[string, 'BARU' | 'LAMA' | '']>;
  antrean?: string;
  pemeriksaan?: string;
  obat?: string;
}

// Identity values that must never leave the page.
export const SYNTHETIC_IDENTITY = {
  nama: 'Pasien Sintetis',
  nik: '3571999900000001',
  telp: '081200000000',
  alamat: 'Jl. Contoh Sintetis 1',
  keluhan: 'keluhan sintetis rahasia',
} as const;

function cell(value: string): string {
  return `<td>${value}</td>`;
}

function buildRow(service: SyntheticDailyService, index: number): string {
  const byHeader: Record<string, string> = {
    'No.': String(index + 1),
    Tanggal: '02-10-2026',
    'Nama Pasien': `${SYNTHETIC_IDENTITY.nama} ${index + 1}`,
    'No. eRM': `99000${index}`,
    NIK: SYNTHETIC_IDENTITY.nik,
    'No Telp': SYNTHETIC_IDENTITY.telp,
    Alamat: SYNTHETIC_IDENTITY.alamat,
    'Jenis Kelamin': service.jenisKelamin,
    'Tanggal Pemeriksaan': '02-10-2026',
    'Tgl.Lahir': '01-01-1980',
    'Umur Tahun': service.umur,
    'Umur Bulan': '0 Bulan',
    'Umur Hari': '0 Hari',
    'Jenis Kunjungan': service.kunjungan,
    'Poli/Ruangan': service.poli,
    Asuransi: service.asuransi,
    'Dokter / Tenaga Medis': service.dokter,
    'Keluhan Utama': SYNTHETIC_IDENTITY.keluhan,
    'Pendaftaran/Rujukan Internal': 'Pendaftaran',
    'Lama Antrean': service.antrean ?? '0 hari 0 jam 30 menit',
    'Lama Pemeriksaan': service.pemeriksaan ?? '0 hari 0 jam 10 menit',
    'Lama Pelayanan Obat': service.obat ?? '0 hari 0 jam 5 menit',
    'Petugas Pendaftaran': 'Petugas Sintetis',
  };
  service.diagnosa.forEach(([nama, kasus], i) => {
    byHeader[`Diagnosa ${i + 1}`] = nama;
    byHeader[`Jenis Kasus ${i + 1}`] = kasus;
  });

  const cells: string[] = [];
  for (const header of DAILY_REPORT_HEADERS) {
    if (header === 'Jumlah Pelayanan') continue; // the live page has no cell for it
    if (header === 'SOAP') {
      SOAP_SUBHEADERS.forEach(() => cells.push(cell('')));
      continue;
    }
    cells.push(cell(byHeader[header] ?? ''));
  }
  return `<tr>${cells.join('')}</tr>`;
}

export function buildDailyReportPage(services: SyntheticDailyService[]): string {
  const headerRow = DAILY_REPORT_HEADERS.map((header) =>
    header === 'SOAP' ? '<th colspan="4">SOAP</th>' : `<th rowspan="2">${header}</th>`
  ).join('');
  const subHeaderRow = SOAP_SUBHEADERS.map((name) => `<th>${name}</th>`).join('');
  const body =
    services.length > 0
      ? services.map(buildRow).join('')
      : '<tr><td colspan="66">Data tidak ditemukan</td></tr>';

  return `<!doctype html>
<html>
  <head><meta charset="utf-8" /><title>e-Puskesmas - Laporan Harian - Pelayanan Pasien</title></head>
  <body>
    <table class="table table-hover table-condensed">
      <thead>
        <tr><th colspan="66">Laporan Harian - Pelayanan Pasien</th></tr>
        <tr><th colspan="2">Tanggal</th><th colspan="4">02-10-2026 - 02-10-2026</th></tr>
        <tr><th colspan="2">Total</th><th colspan="4">${services.length} Data</th></tr>
      </thead>
      <tbody><tr><td></td></tr></tbody>
    </table>
    <table class="table table-bordered">
      <thead><tr>${headerRow}</tr><tr>${subHeaderRow}</tr></thead>
      <tbody>${body}</tbody>
    </table>
  </body>
</html>`;
}

export const SYNTHETIC_DAILY_SERVICES: SyntheticDailyService[] = [
  {
    jenisKelamin: 'Perempuan', umur: '45 Tahun', kunjungan: 'LAMA', poli: 'DEWASA',
    asuransi: 'BPJS Kesehatan', dokter: 'dr. Satu',
    diagnosa: [['Essential (primary) hypertension (I10)', 'LAMA'], ['Dyspepsia (K30)', 'BARU']],
    antrean: '0 hari 1 jam 10 menit', pemeriksaan: '0 hari 0 jam 12 menit',
  },
  {
    jenisKelamin: 'Laki-laki', umur: '67 Tahun', kunjungan: 'LAMA', poli: 'LANSIA',
    asuransi: 'BPJS Kesehatan', dokter: 'dr. Satu',
    diagnosa: [['Essential (primary) hypertension (I10)', 'LAMA']],
  },
  {
    jenisKelamin: 'Perempuan', umur: '3 Tahun', kunjungan: 'BARU', poli: 'ANAK (0-18 TAHUN)',
    asuransi: 'Umum', dokter: 'dr. Dua',
    diagnosa: [['Acute upper respiratory infection, unspecified (J06.9)', 'BARU']],
  },
  {
    jenisKelamin: 'Perempuan', umur: '29 Tahun', kunjungan: 'LAMA', poli: 'DEWASA',
    asuransi: 'BPJS Kesehatan', dokter: '',
    diagnosa: [['Pemeriksaan umum tanpa kode', 'BARU']],
  },
];
