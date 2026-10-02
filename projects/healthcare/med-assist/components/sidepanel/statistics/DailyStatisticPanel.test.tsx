import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import type { DailyServiceReport, DailyServiceRow } from '@/lib/statistics/types';

function row(overrides: Partial<DailyServiceRow>): DailyServiceRow {
  return {
    tanggal: '02-10-2026',
    jenisKelamin: 'P',
    umurTahun: 40,
    jenisKunjungan: 'LAMA',
    poli: 'DEWASA',
    asuransi: 'BPJS Kesehatan',
    dokter: 'dr. Satu',
    diagnosa: [{ icd: 'I10', nama: 'Essential (primary) hypertension', jenisKasus: 'LAMA' }],
    lamaAntreanMenit: 30,
    lamaPemeriksaanMenit: 10,
    lamaPelayananObatMenit: 5,
    ...overrides,
  };
}

const todayReport: DailyServiceReport = {
  date: '2026-10-02',
  fetchedAt: '2026-10-02T06:05:00.000Z',
  sourceBaseUrl: 'https://kotakediri.epuskesmas.id',
  rows: [
    row({}),
    row({ jenisKelamin: 'L', dokter: 'dr. Dua' }),
    row({
      dokter: 'dr. Dua',
      diagnosa: [{ icd: 'J06.9', nama: 'Acute upper respiratory infection, unspecified', jenisKasus: 'BARU' }],
    }),
  ],
};

const previousReport: DailyServiceReport = {
  ...todayReport,
  date: '2026-10-01',
  rows: [row({})],
};

const readDailyReportMock = vi.fn();
const readPreviousDailyReportMock = vi.fn();
vi.mock('@/lib/statistics/daily-cache', () => ({
  readDailyReport: (...args: unknown[]) => readDailyReportMock(...args),
  readPreviousDailyReport: (...args: unknown[]) => readPreviousDailyReportMock(...args),
}));

const sendMessageMock = vi.fn();
vi.mock('@/utils/messaging', () => ({
  sendMessage: (...args: unknown[]) => sendMessageMock(...args),
}));

import { DailyStatisticPanel } from './DailyStatisticPanel';

describe('DailyStatisticPanel', () => {
  beforeEach(() => {
    vi.useFakeTimers({ toFake: ['Date'] });
    vi.setSystemTime(new Date('2026-10-02T03:00:00.000Z'));
    readDailyReportMock.mockReset().mockResolvedValue(null);
    readPreviousDailyReportMock.mockReset().mockResolvedValue(previousReport);
    sendMessageMock.mockReset();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('loads the chosen day from the RME report and shows diseases, DPJP and the change from the day before', async () => {
    sendMessageMock.mockResolvedValueOnce(todayReport);
    render(<DailyStatisticPanel />);

    fireEvent.click(screen.getByRole('button', { name: 'Muat statistik harian' }));

    await waitFor(() => {
      expect(sendMessageMock).toHaveBeenCalledWith('collectDailyStatistics', { date: '2026-10-02' });
    });
    expect(await screen.findByText('I10 · Essential (primary) hypertension')).toBeTruthy();
    expect(screen.getByText('J06.9 · Acute upper respiratory infection, unspecified')).toBeTruthy();
    expect(screen.getByRole('heading', { name: 'Pasien per DPJP' })).toBeTruthy();
    expect(screen.getByLabelText('Pelayanan')).toHaveTextContent('3');
    expect(screen.getByLabelText('Pelayanan')).toHaveTextContent('+2 dari 01-10-2026');
  });

  it('shows a stored day without asking the RME again', async () => {
    readDailyReportMock.mockResolvedValueOnce(todayReport);
    render(<DailyStatisticPanel />);

    expect(await screen.findByText('I10 · Essential (primary) hypertension')).toBeTruthy();
    expect(readDailyReportMock).toHaveBeenCalledWith('2026-10-02');
    expect(sendMessageMock).not.toHaveBeenCalled();
  });

  it('draws a loaded day with the panels and titles of the other side-panel pages', async () => {
    readDailyReportMock.mockResolvedValueOnce(todayReport);
    const { container } = render(<DailyStatisticPanel />);
    await screen.findByText('I10 · Essential (primary) hypertension');

    const headings = Array.from(container.querySelectorAll('h2, h3'));
    expect(headings.map((h) => h.textContent)).toEqual([
      'Statistik Harian',
      '10 Besar Penyakit',
      'Pasien per DPJP',
      'Poli / Ruangan',
      'Asuransi',
      'Kelompok Umur',
      'Waktu Layanan',
    ]);
    for (const heading of headings) {
      expect(heading.className).toContain('ttv-section-title');
      expect(heading.closest('section')?.className ?? '').toContain('ct-v2-panel');
    }
    expect(screen.getByRole('button', { name: 'Muat statistik harian' }).className).toContain(
      'action-btn--primary'
    );
  });

  // Chief, 2026-10-03: "10 besar penyakit dan bawah nya di buat random ada drop down ada accordion".
  it('opens the 10 largest diseases from the 5 largest, in place', async () => {
    const codes = ['A01', 'B02', 'C03', 'D04', 'E05', 'F06', 'G07'];
    readDailyReportMock.mockResolvedValueOnce({
      ...todayReport,
      rows: codes.map((icd) => row({ diagnosa: [{ icd, nama: `Penyakit ${icd}`, jenisKasus: 'BARU' }] })),
    });
    render(<DailyStatisticPanel />);
    await screen.findByText('A01 · Penyakit A01');

    expect(screen.queryByText('F06 · Penyakit F06')).toBeNull();
    const toggle = screen.getByRole('button', { name: 'Lihat 10 besar' });
    expect(toggle).toHaveAttribute('aria-expanded', 'false');

    fireEvent.click(toggle);

    expect(toggle).toHaveAttribute('aria-expanded', 'true');
    expect(screen.getByText('F06 · Penyakit F06')).toBeTruthy();
    expect(screen.getByText('G07 · Penyakit G07')).toBeTruthy();
  });

  it('keeps one of the panels below open at a time, DPJP first', async () => {
    readDailyReportMock.mockResolvedValueOnce(todayReport);
    render(<DailyStatisticPanel />);
    await screen.findByText('I10 · Essential (primary) hypertension');

    const dpjp = screen.getByRole('button', { name: 'Pasien per DPJP' });
    const poli = screen.getByRole('button', { name: 'Poli / Ruangan' });
    expect(dpjp).toHaveAttribute('aria-expanded', 'true');
    expect(poli).toHaveAttribute('aria-expanded', 'false');
    expect(screen.getByText('dr. Dua')).toBeTruthy();
    expect(screen.queryByText('DEWASA')).toBeNull();

    fireEvent.click(poli);

    expect(poli).toHaveAttribute('aria-expanded', 'true');
    expect(dpjp).toHaveAttribute('aria-expanded', 'false');
    expect(screen.getByText('DEWASA')).toBeTruthy();
    expect(screen.queryByText('dr. Dua')).toBeNull();

    fireEvent.click(poli);
    expect(poli).toHaveAttribute('aria-expanded', 'false');
    expect(screen.queryByText('DEWASA')).toBeNull();
  });

  // Chief, 2026-10-03: "gunakan design berikut di salah satu section" (lab sidebar-submenu).
  it('draws the panels below the diseases as one submenu, the open section rows on its branch', async () => {
    readDailyReportMock.mockResolvedValueOnce(todayReport);
    render(<DailyStatisticPanel />);
    await screen.findByText('I10 · Essential (primary) hypertension');

    const titles = ['Pasien per DPJP', 'Poli / Ruangan', 'Asuransi', 'Kelompok Umur', 'Waktu Layanan'];
    const panels = new Set(
      titles.map((title) => screen.getByRole('heading', { name: title }).closest('.ct-v2-panel'))
    );
    expect(panels.size).toBe(1);

    const branch = screen.getByText('dr. Dua').closest('ul');
    expect(branch).not.toBeNull();
    expect(
      Array.from(branch?.querySelectorAll('li') ?? []).map((item) => item.textContent)
    ).toEqual(['dr. Dua2', 'dr. Satu1']);
    expect(screen.getByText('pelayanan per dokter')).toBeTruthy();
    expect(screen.queryByText('tempat pelayanan')).toBeNull();
  });

  it('says what went wrong when the report cannot be read', async () => {
    sendMessageMock.mockRejectedValueOnce(
      new Error('Kolom laporan harian tidak ditemukan: Dokter / Tenaga Medis')
    );
    render(<DailyStatisticPanel />);

    fireEvent.click(screen.getByRole('button', { name: 'Muat statistik harian' }));

    expect(
      await screen.findByText('Kolom laporan harian tidak ditemukan: Dokter / Tenaga Medis')
    ).toBeTruthy();
  });

  it('downloads the day as a CSV named after its date', async () => {
    readDailyReportMock.mockResolvedValueOnce(todayReport);
    const createObjectURL = vi.fn((_blob: Blob) => 'blob:harness');
    const revokeObjectURL = vi.fn();
    Object.assign(URL, { createObjectURL, revokeObjectURL });
    const downloads: string[] = [];
    const clickSpy = vi
      .spyOn(HTMLAnchorElement.prototype, 'click')
      .mockImplementation(function (this: HTMLAnchorElement) {
        downloads.push(this.download);
      });
    render(<DailyStatisticPanel />);
    await screen.findByText('I10 · Essential (primary) hypertension');

    fireEvent.click(screen.getByRole('button', { name: 'Unduh CSV' }));

    expect(downloads).toEqual(['statistik-harian-2026-10-02.csv']);
    const csv = await new Promise<string>((resolve) => {
      const reader = new FileReader();
      reader.onload = () => resolve(String(reader.result));
      reader.readAsText(createObjectURL.mock.calls[0][0]);
    });
    expect(csv.split('\n')).toHaveLength(4);
    expect(csv).toContain('2026-10-02,L,40,LAMA,DEWASA,BPJS Kesehatan,dr. Dua,I10');
    clickSpy.mockRestore();
  });
});
