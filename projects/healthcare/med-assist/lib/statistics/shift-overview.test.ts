import { describe, expect, it } from 'vitest';

import { buildPhase1ShiftOverview, buildPhase2ShiftOverview } from './shift-overview';
import type { QueueStatisticRow, ReferralStatisticRow, StockStatisticRow } from './types';

import { RME_STATISTIC_PAGES } from '@/lib/scraper/rme-statistic-mapping';

describe('shift overview contracts', () => {
  it('locks phase-1 queue mapping fields', () => {
    expect(RME_STATISTIC_PAGES.pendaftaran.columns.ruanganDaftar).toContain('td:nth-child(7)');
    expect(RME_STATISTIC_PAGES.pendaftaran.columns.statusPelayanan).toContain('td:nth-child(13)');
  });
});

describe('shift overview aggregation', () => {
  const queueRows: QueueStatisticRow[] = [
    {
      page: 'pendaftaran',
      tanggalPendaftaran: '26-06-2026',
      noPendaftaran: 'REG-1',
      dataPasien: 'RM001',
      penyakitKhusus: 'Hipertensi',
      ruanganDaftar: 'Poli Umum',
      dokter: 'dr. Sinta',
      asuransi: 'BPJS',
      statusPembayaran: 'Belum Bayar',
      statusBpjs: 'Aktif',
      kunjungan: 'Baru',
      statusPelayanan: 'Menunggu',
    },
    {
      page: 'pendaftaran',
      tanggalPendaftaran: '26-06-2026',
      noPendaftaran: 'REG-2',
      dataPasien: 'RM002',
      penyakitKhusus: 'Hipertensi',
      ruanganDaftar: 'Poli Umum',
      dokter: 'dr. Sinta',
      asuransi: 'BPJS',
      statusPembayaran: 'Belum Bayar',
      statusBpjs: 'Nonaktif',
      kunjungan: 'Lama',
      statusPelayanan: 'Diproses',
    },
    {
      page: 'pendaftaran',
      tanggalPendaftaran: '26-06-2026',
      noPendaftaran: 'REG-3',
      dataPasien: 'RM003',
      penyakitKhusus: '',
      ruanganDaftar: 'Poli Umum',
      dokter: 'dr. Arif',
      asuransi: 'UMUM',
      statusPembayaran: 'Lunas',
      statusBpjs: '',
      kunjungan: 'Baru',
      statusPelayanan: 'Selesai',
    },
    {
      page: 'pendaftaran',
      tanggalPendaftaran: '26-06-2026',
      noPendaftaran: 'REG-4',
      dataPasien: 'RM004',
      penyakitKhusus: 'DM',
      ruanganDaftar: 'Poli Gigi',
      dokter: 'dr. Arif',
      asuransi: 'BPJS',
      statusPembayaran: 'Lunas',
      statusBpjs: 'Aktif',
      kunjungan: 'Baru',
      statusPelayanan: 'Menunggu',
    },
    {
      page: 'pendaftaran',
      tanggalPendaftaran: '26-06-2026',
      noPendaftaran: 'REG-5',
      dataPasien: 'RM005',
      penyakitKhusus: '-',
      ruanganDaftar: 'Poli Gigi',
      dokter: 'dr. Arif',
      asuransi: 'UMUM',
      statusPembayaran: 'Lunas',
      statusBpjs: 'Aktif',
      kunjungan: 'Lama',
      statusPelayanan: 'Menunggu',
    },
  ];

  const referralRows: ReferralStatisticRow[] = [
    {
      page: 'rujukanexternal',
      tanggal: '26-06-2026',
      tenagaMedis1: 'dr. Sinta',
      tenagaMedis2: 'Ns. Eka',
      namaPasien: 'John',
      umur: '36',
      rsTujuanRujukan: 'RSUD Gambiran',
      poliRuangan: 'Penyakit Dalam',
    },
    {
      page: 'rujukanexternal',
      tanggal: '26-06-2026',
      tenagaMedis1: 'dr. Sinta',
      tenagaMedis2: 'Ns. Eka',
      namaPasien: 'Jane',
      umur: '40',
      rsTujuanRujukan: 'RSUD Gambiran',
      poliRuangan: 'Penyakit Dalam',
    },
  ];

  const stockRows: StockStatisticRow[] = [
    {
      page: 'stokobat',
      namaObat: 'Paracetamol 500 mg',
      jumlahStok: '8',
      nilaiPersediaan: '12000',
      tanggalKadaluarsa: '01-08-2026',
      ruangan: 'Farmasi Umum',
    },
    {
      page: 'stokobat',
      namaObat: 'Amoxicillin',
      jumlahStok: '22',
      nilaiPersediaan: '54000',
      tanggalKadaluarsa: '15-09-2026',
      ruangan: 'Farmasi Umum',
    },
  ];

  it('builds phase-1 shift overview', () => {
    const result = buildPhase1ShiftOverview(queueRows);

    expect(result.totalPasien).toBe(5);
    expect(result.pasienPerRuangan[0]).toEqual({ label: 'Poli Umum', count: 3 });
    expect(result.kunjunganBaruVsLama.baru).toBe(3);
  });

  it('builds phase-2 shift overview', () => {
    const result = buildPhase2ShiftOverview(queueRows, referralRows, stockRows);

    expect(result.rujukanHariIni.total).toBe(2);
    expect(result.bpjsBermasalah).toBe(2);
    expect(result.stokRendah[0]?.ruangan).toBe('Farmasi Umum');
  });
});
