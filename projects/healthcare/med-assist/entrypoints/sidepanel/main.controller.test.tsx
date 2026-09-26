import { act, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { SentraAssistSidepanelApp } from './main';

import type * as SidePanelHeaderModule from '@/components/sidepanel/SidePanelHeader';

const { mockSendMessage } = vi.hoisted(() => ({
  mockSendMessage: vi.fn(),
}));

const { mockClinicalDifferential } = vi.hoisted(() => ({
  mockClinicalDifferential: vi.fn(),
}));

const { mockTTVInferenceUI } = vi.hoisted(() => ({
  mockTTVInferenceUI: vi.fn(),
}));

const { mockSidePanelHeader } = vi.hoisted(() => ({
  mockSidePanelHeader: vi.fn(),
}));

// Spy-wrap rather than fully replace: SidePanelHeader owns the OCR/DIAGNOSIS/
// TRAJECTORY buttons other tests in this file click, so it must keep
// rendering for real — only its received props are captured.
vi.mock('@/components/sidepanel/SidePanelHeader', async (importOriginal) => {
  const actual = await importOriginal<typeof SidePanelHeaderModule>();
  return {
    ...actual,
    SidePanelHeader: (props: React.ComponentProps<typeof actual.SidePanelHeader>) => {
      mockSidePanelHeader(props);
      return <actual.SidePanelHeader {...props} />;
    },
  };
});

vi.mock('@/utils/messaging', () => ({
  sendMessage: mockSendMessage,
}));

vi.mock('@/utils/sound', () => ({
  playSound: vi.fn(),
}));

vi.mock('@/components/sidepanel/ClinicalReasoningWorkbench', () => ({
  ClinicalReasoningWorkbench: ({ symptomText }: { symptomText: string }) => (
    <div data-testid="mock-workbench">Workbench {symptomText || 'ready'}</div>
  ),
}));

vi.mock('wxt/browser', () => ({
  browser: {
    runtime: {
      getURL: (assetPath: string) => `chrome-extension://test${assetPath}`,
    },
    storage: {
      local: {
        get: vi.fn(async () => ({
          'sentra:encounter': {
            encounter: {
              id: 'pel-77',
              patient_id: 'RM-77',
              timestamp: '2026-06-25T20:00:00.000Z',
              dokter: { id: '', nama: '' },
              perawat: { id: '', nama: '' },
              anamnesa: {
                keluhan_utama: 'Keluhan dari encounter cache',
                keluhan_tambahan: 'Batuk sejak 3 hari',
                lama_sakit: { thn: 0, bln: 0, hr: 3 },
                riwayat_penyakit: null,
                alergi: { obat: [], makanan: [], udara: [], lainnya: [] },
              },
              diagnosa: {
                icd_x: '',
                nama: '',
                jenis: 'PRIMER',
                kasus: 'BARU',
                prognosa: '',
                penyakit_kronis: [],
              },
              resep: [],
            },
            timestamp: Date.now(),
          },
        })),
        set: vi.fn(async () => undefined),
      },
      onChanged: {
        addListener: vi.fn(),
        removeListener: vi.fn(),
      },
    },
  },
}));

const mockAuthSession = {
  user: {
    id: 'user-1',
    username: 'dr.budi',
    name: 'dr. Budi',
    role: 'doctor' as const,
    facilityId: 'fac-1',
    facilityName: 'Puskesmas Balowerti',
  },
  tokens: { accessToken: 'test-token', refreshToken: 'test-refresh', expiresAt: Date.now() + 1e9 },
  serverBaseUrl: 'https://crew.puskesmasbalowerti.com',
};

const { mockGetStoredSession } = vi.hoisted(() => ({
  mockGetStoredSession: vi.fn(),
}));

vi.mock('@/lib/api/auth-client', () => ({
  getStoredSession: mockGetStoredSession,
  logout: vi.fn(async () => undefined),
}));

vi.mock('framer-motion', async () => {
  const ReactModule = await import('react');

  const motion = new Proxy(
    {},
    {
      get: (_target, tag: string) =>
        ReactModule.forwardRef<HTMLElement, Record<string, unknown>>(
          function MotionElement(props, ref) {
            const {
              children,
              initial: _initial,
              animate: _animate,
              exit: _exit,
              variants: _variants,
              transition: _transition,
              ...rest
            } = props;

            return ReactModule.createElement(tag, { ...rest, ref }, children as React.ReactNode);
          }
        ),
    }
  );

  return {
    AnimatePresence: ({ children }: { children: React.ReactNode }) => <>{children}</>,
    motion,
    useReducedMotion: () => true,
  };
});

vi.mock('@/components/clinical/TTVInferenceUI', () => ({
  TTVInferenceUI: (props: Record<string, unknown>) => {
    mockTTVInferenceUI(props);
    return <div data-testid="mock-ttv-controller">TTV</div>;
  },
}));

vi.mock('@/components/clinical/ClinicalDifferential', () => ({
  ClinicalDifferential: (props: Record<string, unknown>) => {
    mockClinicalDifferential(props);
    return <div data-testid="mock-diagnosis-therapy-page">Diagnosis &amp; Therapy</div>;
  },
}));

describe('Sentra Assist sidepanel latest design route', () => {
  const originalChrome = (globalThis as typeof globalThis & { chrome?: unknown }).chrome;

  beforeEach(() => {
    vi.useFakeTimers();
    mockSendMessage.mockReset();
    mockClinicalDifferential.mockReset();
    mockTTVInferenceUI.mockReset();
    mockSidePanelHeader.mockReset();
    mockGetStoredSession.mockReset();
    mockGetStoredSession.mockResolvedValue(mockAuthSession);
    mockSendMessage.mockImplementation(async (type: string) => {
      if (type === 'scanMedicalHistory') {
        return { success: true, history: [{ shortLabel: 'HT' }] };
      }
      if (type === 'scanVisitHistory') {
        return {
          success: true,
          visits: [
            {
              encounter_id: 'enc-17',
              date: '2026-03-31',
              vitals: { sbp: 120, dbp: 80, hr: 88, rr: 18, temp: 36.8, glucose: 110 },
              keluhan_utama: 'Kontrol tekanan darah',
            },
          ],
          diagnostics: [],
        };
      }
      if (type === 'scanClinicalContext') {
        return { success: true, context: {} };
      }
      if (type === 'scanVitalSigns') {
        return {
          success: true,
          vitals: {
            sbp: '190',
            dbp: '125',
            hr: '110',
            rr: '24',
            temp: '39.1',
            spo2: '94',
            glucose: '180',
          },
        };
      }
      return { success: true };
    });

    Object.defineProperty(globalThis, 'chrome', {
      configurable: true,
      value: {
        tabs: {
          query: vi.fn(async () => [{ id: 77 }]),
          sendMessage: vi.fn(async () => ({
            success: true,
            patient: {
              name: 'Tn. Budi',
              gender: 'L',
              age: 45,
              rm: 'RM-77',
              dob: '1980-01-01',
              bpjsStatus: 'aktif',
              kelurahan: 'Sukamaju',
            },
          })),
        },
      },
    });
  });

  afterEach(() => {
    vi.useRealTimers();
    Object.defineProperty(globalThis, 'chrome', {
      configurable: true,
      value: originalChrome,
    });
    vi.restoreAllMocks();
  });

  it('starts on DashboardView and enters the approved main design only after launch', async () => {
    render(<SentraAssistSidepanelApp />);

    await act(async () => {
      await vi.advanceTimersByTimeAsync(500);
    });

    await act(async () => undefined);

    expect(screen.getByRole('button', { name: /Masuk ke ASSIST/i })).toBeTruthy();
    expect(screen.queryByTestId('mock-workbench')).toBeNull();
    expect(screen.queryByRole('tab', { name: 'START' })).toBeNull();

    fireEvent.click(screen.getByRole('button', { name: /Masuk ke ASSIST/i }));

    expect(screen.getByTestId('mock-ttv-controller')).toBeTruthy();
    expect(screen.queryByTestId('mock-workbench')).toBeNull();
    expect(screen.queryByRole('button', { name: /Masuk ke ASSIST/i })).toBeNull();
    expect(screen.getByRole('tab', { name: 'START' })).toBeTruthy();
  });

  it('opens Diagnosis & Therapy from the new header diagnosis action row', async () => {
    render(<SentraAssistSidepanelApp />);

    await act(async () => {
      await vi.advanceTimersByTimeAsync(500);
    });

    await act(async () => undefined);

    fireEvent.click(screen.getByRole('button', { name: /Masuk ke ASSIST/i }));

    await act(async () => undefined);

    fireEvent.click(screen.getByRole('button', { name: /DIAGNOSIS/i }));

    expect(screen.getByTestId('mock-diagnosis-therapy-page')).toBeTruthy();
    expect(screen.queryByTestId('mock-ttv-controller')).toBeNull();
    expect(mockClinicalDifferential).toHaveBeenCalled();
    const latestProps = mockClinicalDifferential.mock.calls.at(-1)?.[0] as
      | { keluhanUtama?: string; keluhanTambahan?: string }
      | undefined;
    expect(latestProps?.keluhanUtama).toBe('Keluhan dari encounter cache');
    expect(latestProps?.keluhanTambahan).toBe('Batuk sejak 3 hari');
  });

  it('hides the patient summary strip after entering the trajectory dashboard surface', async () => {
    render(<SentraAssistSidepanelApp />);

    await act(async () => {
      await vi.advanceTimersByTimeAsync(500);
    });

    await act(async () => undefined);

    fireEvent.click(screen.getByRole('button', { name: /Masuk ke ASSIST/i }));

    await act(async () => undefined);

    fireEvent.click(screen.getByRole('button', { name: /OCR/i }));

    await act(async () => undefined);

    expect(screen.getByText('Tn. Budi')).toBeTruthy();
    expect(screen.getByText('45 tahun')).toBeTruthy();

    fireEvent.click(screen.getByRole('button', { name: /TRAJECTORY/i }));

    expect(screen.getByTestId('mock-workbench')).toBeTruthy();
    expect(screen.queryByText('Tn. Budi')).toBeNull();
    expect(screen.queryByText('45 tahun')).toBeNull();
    expect(screen.queryByRole('button', { name: /RIWAYAT KUNJUNGAN PASIEN/i })).toBeNull();
  });

  it('feeds RME-extracted vital signs into TTVInferenceUI as rmeVitalFieldKeys after OCR', async () => {
    render(<SentraAssistSidepanelApp />);

    await act(async () => {
      await vi.advanceTimersByTimeAsync(500);
    });

    await act(async () => undefined);

    fireEvent.click(screen.getByRole('button', { name: /Masuk ke ASSIST/i }));

    await act(async () => undefined);

    fireEvent.click(screen.getByRole('button', { name: /OCR/i }));

    await act(async () => undefined);

    const lastCallProps = mockTTVInferenceUI.mock.calls.at(-1)?.[0] as Record<string, unknown>;
    expect(lastCallProps.rmeVitalFieldKeys).toEqual(
      expect.arrayContaining(['sbp', 'dbp', 'hr', 'rr', 'temp', 'spo2', 'glucose'])
    );
    expect(lastCallProps.ttvState).toMatchObject({
      sbp: '190',
      dbp: '125',
      hr: '110',
      rr: '24',
      temp: '39.1',
      spo2: '94',
      glucose: '180',
    });
  });

  it('leaves vitals untouched and does not crash when scanVitalSigns fails', async () => {
    mockSendMessage.mockImplementation(async (type: string) => {
      if (type === 'scanVitalSigns') {
        return { success: false, error: 'No active ePuskesmas tab' };
      }
      if (type === 'scanMedicalHistory') {
        return { success: true, history: [] };
      }
      return { success: true };
    });

    render(<SentraAssistSidepanelApp />);

    await act(async () => {
      await vi.advanceTimersByTimeAsync(500);
    });

    await act(async () => undefined);

    fireEvent.click(screen.getByRole('button', { name: /Masuk ke ASSIST/i }));

    await act(async () => undefined);

    fireEvent.click(screen.getByRole('button', { name: /OCR/i }));

    await act(async () => undefined);

    const lastCallProps = mockTTVInferenceUI.mock.calls.at(-1)?.[0] as Record<string, unknown>;
    expect(lastCallProps.rmeVitalFieldKeys).toEqual([]);
    expect(lastCallProps.ttvState).toMatchObject({ sbp: '', dbp: '' });
  });

  it('derives vitalWarnings from RME-extracted vitals and passes them to SidePanelHeader', async () => {
    render(<SentraAssistSidepanelApp />);

    await act(async () => {
      await vi.advanceTimersByTimeAsync(500);
    });

    await act(async () => undefined);

    fireEvent.click(screen.getByRole('button', { name: /Masuk ke ASSIST/i }));

    await act(async () => undefined);

    fireEvent.click(screen.getByRole('button', { name: /OCR/i }));

    await act(async () => undefined);

    const lastCallProps = mockSidePanelHeader.mock.calls.at(-1)?.[0] as Record<string, unknown>;
    expect(lastCallProps.vitalWarnings).toEqual(
      expect.arrayContaining([expect.objectContaining({ label: 'TD' })])
    );
  });

  it('shows ConsoleLogin (not DashboardView or console) when no session is stored', async () => {
    mockGetStoredSession.mockReset();
    mockGetStoredSession.mockResolvedValue(null);

    render(<SentraAssistSidepanelApp />);

    await act(async () => {
      await vi.advanceTimersByTimeAsync(500);
    });
    await act(async () => undefined);

    expect(screen.getByLabelText(/Nama pengguna/i)).toBeTruthy();
    expect(screen.queryByRole('button', { name: /Masuk ke ASSIST/i })).toBeNull();
    expect(screen.queryByTestId('mock-ttv-controller')).toBeNull();
  });

  it('shows DashboardView directly (skips ConsoleLogin) when a session is already stored', async () => {
    render(<SentraAssistSidepanelApp />);

    await act(async () => {
      await vi.advanceTimersByTimeAsync(500);
    });
    await act(async () => undefined);

    expect(screen.getByRole('button', { name: /Masuk ke ASSIST/i })).toBeTruthy();
    expect(screen.queryByLabelText(/Nama pengguna/i)).toBeNull();
  });
});
