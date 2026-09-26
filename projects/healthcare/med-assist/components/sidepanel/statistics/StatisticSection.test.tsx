import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

vi.mock('@/lib/statistics/cache', () => ({
  readShiftOverviewCache: vi.fn(async () => ({
    fetchedAt: '2026-06-26T10:00:00.000Z',
    sourceBaseUrl: 'https://kotakediri.epuskesmas.id',
    phase1: {
      totalPasien: 12,
      pasienPerRuangan: [{ label: 'Poli Umum', count: 7 }],
      pasienPerDokter: [{ label: 'dr. Sinta', count: 6 }],
      breakdownAsuransi: [{ label: 'BPJS', count: 9 }],
      statusPelayanan: [{ label: 'Menunggu', count: 4 }],
      kunjunganBaruVsLama: { baru: 8, lama: 4 },
      kasusPenyakitKhusus: [{ label: 'Hipertensi', count: 2 }],
    },
    phase2: {
      topRuanganTerpadat: [{ label: 'Poli Umum', count: 7 }],
      topDokterTertinggi: [{ label: 'dr. Sinta', count: 6 }],
      bpjsBermasalah: 2,
      pasienBelumSelesaiTotal: 5,
      pasienBelumSelesaiPerRuangan: [{ label: 'Poli Umum', count: 3 }],
      rujukanHariIni: {
        total: 1,
        rsTujuanTerbanyak: [{ label: 'RSUD Gambiran', count: 1 }],
        poliTujuanTerbanyak: [{ label: 'Penyakit Dalam', count: 1 }],
        tenagaMedisTerbanyak: [{ label: 'dr. Sinta', count: 1 }],
      },
      stokRendah: [
        { namaObat: 'Paracetamol', ruangan: 'Farmasi', stok: 8, status: 'Sangat Rendah' },
      ],
      kadaluarsaTerdekat: [],
      nilaiPersediaanTertinggi: [],
      distribusiStokPerRuangan: [{ label: 'Farmasi', count: 2 }],
    },
  })),
}));

const sendMessageMock = vi.fn();
vi.mock('@/utils/messaging', () => ({
  sendMessage: (...args: unknown[]) => sendMessageMock(...args),
}));

import { StatisticSection } from './StatisticSection';

describe('StatisticSection', () => {
  it('renders the statistic heading and cached phase content', async () => {
    render(<StatisticSection />);

    expect(screen.getByRole('heading', { name: 'Statistic' })).toBeTruthy();
    expect(screen.getByText('Ringkasan operasional shift dari data RME hari ini')).toBeTruthy();
    await waitFor(() => {
      expect(screen.getByText('Total Pasien')).toBeTruthy();
      expect(screen.getByText('Status Pelayanan')).toBeTruthy();
      expect(screen.getByText('Beban per Ruangan')).toBeTruthy();
    });
  });

  it('refreshes statistics from runtime messaging', async () => {
    sendMessageMock.mockResolvedValueOnce({
      fetchedAt: '2026-06-26T11:00:00.000Z',
      sourceBaseUrl: 'https://kotakediri.epuskesmas.id',
      phase1: {
        totalPasien: 15,
        pasienPerRuangan: [],
        pasienPerDokter: [],
        breakdownAsuransi: [],
        statusPelayanan: [],
        kunjunganBaruVsLama: { baru: 9, lama: 6 },
        kasusPenyakitKhusus: [],
      },
    });

    render(<StatisticSection />);
    fireEvent.click(screen.getByRole('button', { name: /Muat ulang data RME/i }));

    await waitFor(() => {
      expect(sendMessageMock).toHaveBeenCalledWith('collectShiftOverview', {
        phases: ['phase1', 'phase2'],
      });
    });
  });
});
