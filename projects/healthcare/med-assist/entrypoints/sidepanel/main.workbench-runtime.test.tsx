import { act, fireEvent, render, screen, within } from '@testing-library/react';
import React from 'react';
import { afterEach, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';

import { SentraAssistSidepanelApp } from './main';

import type { ComposedAnamnesaDraft } from '@/lib/clinical/anamnesa-composer';
import { findForbiddenPhysicianTrajectoryTerms } from '@/lib/iskandar-diagnosis-engine/presentation-safety';

const { mockSendMessage, mockPlaySound, mockEvaluateCanonicalClinicalEngine } = vi.hoisted(() => ({
  mockSendMessage: vi.fn(),
  mockPlaySound: vi.fn(),
  mockEvaluateCanonicalClinicalEngine: vi.fn(async () => ({
    request_id: 'req-sidepanel-runtime',
    processed_at: '2026-06-23T06:00:00.000Z',
    source: {
      engine: 'dashboard-clinical-engine' as const,
      engine_version: 'test',
      mode: 'canonical' as const,
    },
    scoring: {},
    alerts: [],
    recommendations: {
      immediate_actions: [],
      monitoring_actions: [],
      referral_actions: [],
      next_best_questions: [],
    },
    governance: {
      disclaimer: 'support only',
      review_required: true,
      authoritative_engine: 'dashboard' as const,
    },
    trajectory: {
      available: false,
      visit_count: 4,
    },
  })),
}));

vi.mock('@/utils/messaging', () => ({
  sendMessage: mockSendMessage,
}));

vi.mock('@/utils/sound', () => ({
  playSound: mockPlaySound,
}));

vi.mock('@/lib/api/auth-client', () => ({
  getStoredSession: vi.fn(async () => ({
    user: {
      id: 'user-1',
      username: 'dr.budi',
      name: 'dr. Budi',
      role: 'doctor',
      facilityId: 'fac-1',
      facilityName: 'Puskesmas Balowerti',
    },
    tokens: {
      accessToken: 'test-token',
      refreshToken: 'test-refresh',
      expiresAt: Date.now() + 1e9,
    },
    serverBaseUrl: 'https://crew.puskesmasbalowerti.com',
  })),
  logout: vi.fn(async () => undefined),
}));

vi.mock('@/lib/api/bridge-client', () => ({
  evaluateCanonicalClinicalEngine: mockEvaluateCanonicalClinicalEngine,
}));

vi.mock('wxt/browser', () => ({
  browser: {
    runtime: {
      getURL: (assetPath: string) => `chrome-extension://test${assetPath}`,
      getManifest: () => ({ version: '2.1.0' }),
      onMessage: {
        addListener: vi.fn(),
        removeListener: vi.fn(),
      },
    },
    storage: {
      local: {
        get: vi.fn(async () => ({})),
        set: vi.fn(async () => undefined),
      },
      onChanged: {
        addListener: vi.fn(),
        removeListener: vi.fn(),
      },
    },
  },
}));

vi.mock('react-apexcharts', () => ({
  default: ({ height }: { height?: number }) => (
    <div data-testid="trajectory-chart">chart:{height ?? 'na'}</div>
  ),
}));

vi.mock('@/components/ui/AssistShell', () => ({
  AssistShell: ({ children, className }: { children: React.ReactNode; className?: string }) => (
    <div data-testid="assist-shell-wrapper" className={className}>
      {children}
    </div>
  ),
}));

vi.mock('@/components/ui/ConsoleFrame', () => ({
  ConsoleFrame: ({ children, ariaLabel }: { children: React.ReactNode; ariaLabel?: string }) => (
    <section aria-label={ariaLabel}>{children}</section>
  ),
}));

vi.mock('@/components/clinical/CTHeader', () => ({
  CTHeader: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
}));

vi.mock('@/components/clinical/ClinicalScreenTabs', () => ({
  ClinicalScreenTabs: () => <div data-testid="trajectory-tabs" />,
}));

vi.mock('@/components/clinical/DosageCalculator', () => ({
  DosageCalculator: () => <div data-testid="dose-calc" />,
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
    useAnimate: () => [{ current: null }, vi.fn(async () => undefined)] as const,
    useReducedMotion: () => true,
  };
});

function buildSyntheticWorkbenchDraft(): ComposedAnamnesaDraft {
  return {
    chiefComplaint: 'Sesak berat, nyeri dada menjalar, dan demam',
    presentIllness:
      'Keluhan sesak berat, nyeri dada menjalar, demam, dan pusing sejak 2 hari dengan penurunan kesadaran ringan.',
    payload: {
      keluhan_utama: 'Sesak berat, nyeri dada menjalar, dan demam',
      keluhan_tambahan: 'Pusing, lemah, dan batuk produktif',
      lama_sakit: { thn: 0, bln: 0, hr: 2 },
      riwayat_penyakit: {
        sekarang: 'Keluhan memberat dalam 24 jam terakhir.',
        dahulu: 'Riwayat diabetes melitus dan hipertensi.',
        keluarga: 'Tidak ada riwayat keluarga yang relevan untuk keluhan akut ini.',
      },
      alergi: {
        obat: ['Amoxicillin'],
        makanan: [],
        udara: ['Debu'],
        lainnya: [],
      },
      vital_signs: {
        tekanan_darah_sistolik: 168,
        tekanan_darah_diastolik: 102,
        nadi: 122,
        respirasi: 28,
        suhu: 38.7,
        gula_darah: 286,
        kesadaran: 'SOMNOLEN',
      },
    },
    metadata: {
      symptomPhrases: ['sesak berat', 'nyeri dada', 'demam'],
      durationLabel: '2 hari',
      missingFacts: [],
    },
  };
}

vi.mock('@/components/clinical/TTVInferenceUI', async () => {
  const ReactModule = await import('react');

  const MockTTVInferenceUI = ReactModule.forwardRef(function MockTTVInferenceUI(
    props: {
      ttvState: Record<string, unknown>;
      onTTVStateChange?: (state: Record<string, unknown>) => void;
      onNavigateToTrajectory?: () => void;
      onComplete?: (payload: { anamnesaDraft: ComposedAnamnesaDraft }) => void;
      bootSequenceActive?: boolean;
    },
    ref
  ) {
    const stateRef = ReactModule.useRef(props.ttvState);

    ReactModule.useEffect(() => {
      stateRef.current = props.ttvState;
    }, [props.ttvState]);

    ReactModule.useImperativeHandle(ref, () => ({
      setField(field: string, value: unknown) {
        props.onTTVStateChange?.({
          ...stateRef.current,
          [field]: value,
        });
      },
    }));

    const applySyntheticTrajectoryFixture = () => {
      props.onTTVStateChange?.({
        ...stateRef.current,
        sbp: '168',
        dbp: '102',
        hr: '122',
        rr: '28',
        temp: '38.7',
        spo2: '91',
        glucose: '286',
        symptomText: 'Sesak berat, nyeri dada menjalar, dan demam',
      });
      props.onComplete?.({
        anamnesaDraft: buildSyntheticWorkbenchDraft(),
      });
    };

    return (
      <div
        data-testid="synthetic-ttv-controller"
        data-boot-sequence-active={props.bootSequenceActive ? 'true' : 'false'}
      >
        <button type="button" onClick={applySyntheticTrajectoryFixture}>
          Gunakan fixture trajectory sintetis
        </button>
        <button type="button" onClick={() => props.onNavigateToTrajectory?.()}>
          Buka review trajectory lengkap
        </button>
      </div>
    );
  });

  return {
    TTVInferenceUI: MockTTVInferenceUI,
  };
});

beforeAll(() => {
  vi.stubGlobal(
    'ResizeObserver',
    class ResizeObserver {
      observe() {}
      unobserve() {}
      disconnect() {}
    }
  );

  Object.defineProperty(HTMLElement.prototype, 'clientWidth', {
    configurable: true,
    get() {
      return 960;
    },
  });

  Object.defineProperty(HTMLElement.prototype, 'clientHeight', {
    configurable: true,
    get() {
      return 320;
    },
  });

  Object.defineProperty(HTMLElement.prototype, 'offsetWidth', {
    configurable: true,
    get() {
      return 960;
    },
  });

  Object.defineProperty(HTMLElement.prototype, 'offsetHeight', {
    configurable: true,
    get() {
      return 320;
    },
  });

  HTMLElement.prototype.getBoundingClientRect = () =>
    ({
      width: 960,
      height: 320,
      top: 0,
      left: 0,
      right: 960,
      bottom: 320,
      x: 0,
      y: 0,
      toJSON: () => undefined,
    }) as DOMRect;
});

describe('Sentra Assist sidepanel workbench runtime smoke', () => {
  const originalChrome = (globalThis as typeof globalThis & { chrome?: unknown }).chrome;

  const syntheticVisitHistory = [
    {
      encounter_id: '69915',
      date: '2026-03-25',
      vitals: { sbp: 142, dbp: 88, hr: 92, rr: 18, temp: 36.8, glucose: 178 },
      keluhan_utama: 'Kontrol diabetes dan hipertensi',
      diagnosa: { icd_x: 'E11.9', nama: 'Diabetes melitus tipe 2' },
      terapi_obat: 'Metformin 500 mg 3x1',
      dokter_penanganan: 'dr. Sentra Satu',
      perawat_penanganan: 'Ns. Assist Satu',
    },
    {
      encounter_id: '70211',
      date: '2026-04-12',
      vitals: { sbp: 154, dbp: 94, hr: 104, rr: 22, temp: 38.1, glucose: 224 },
      keluhan_utama: 'Demam, batuk, dan sesak ringan',
      diagnosa: { icd_x: 'J18.9', nama: 'Pneumonia' },
      terapi_obat: 'Antibiotik oral sesuai advis dokter',
      dokter_penanganan: 'dr. Sentra Dua',
      perawat_penanganan: 'Ns. Assist Dua',
    },
    {
      encounter_id: '70844',
      date: '2026-05-08',
      vitals: { sbp: 164, dbp: 100, hr: 116, rr: 26, temp: 38.5, glucose: 268 },
      keluhan_utama: 'Nyeri dada dan sesak memberat',
      diagnosa: { icd_x: 'J18.9', nama: 'Pneumonia' },
      terapi_obat: 'Antibiotik oral dan bronkodilator',
      dokter_penanganan: 'dr. Sentra Tiga',
      perawat_penanganan: 'Ns. Assist Tiga',
    },
  ];

  beforeEach(() => {
    vi.useFakeTimers();

    (
      globalThis as typeof globalThis & {
        __SENTRA_FEATURE_FLAGS__?: Record<string, boolean>;
      }
    ).__SENTRA_FEATURE_FLAGS__ = {
      USE_HYBRID_TRAJECTORY_ENGINE: true,
      USE_CLINICAL_TRAJECTORY_V2: true,
      USE_TRAJECTORY_VISUALIZATION_PANEL: false,
    };

    mockPlaySound.mockReset();
    mockEvaluateCanonicalClinicalEngine.mockClear();
    mockSendMessage.mockReset();
    mockSendMessage.mockImplementation(async (type: string, payload?: unknown) => {
      if (type === 'scanMedicalHistory') {
        return { success: true, history: [{ shortLabel: 'DM' }, { shortLabel: 'HT' }] };
      }
      if (type === 'scanVisitHistory') {
        return {
          success: true,
          visits: syntheticVisitHistory,
          diagnostics: ['SYNTHETIC_RICH_VISIT_HISTORY'],
        };
      }
      if (type === 'scanClinicalContext') {
        return {
          success: true,
          context: {
            facilityName: 'Puskesmas Balowerti',
            payerLabel: 'BPJS Aktif',
            pregnancyRisk: 'Risiko tinggi trimester 3',
            specialConditions: ['Kehamilan', 'Obesitas'],
            allergies: ['Debu', 'Obat'],
            pregnancyStatus: true,
          },
        };
      }
      if (type === 'resolveTenagaMedis') {
        return {
          success: true,
          tenagaMedis: { dokterNama: 'dr. Sentra', perawatNama: 'Ns. Assist' },
        };
      }
      if (type === 'transferRME') {
        return { state: 'completed', payload };
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
              name: 'Ny. Siti Aminah',
              gender: 'P',
              age: 34,
              rm: '00001033231',
              dob: '1991-08-13',
              bpjsStatus: 'aktif',
              kelurahan: 'Balowerti',
            },
          })),
        },
      },
    });
  });

  afterEach(() => {
    vi.useRealTimers();
    delete (
      globalThis as typeof globalThis & {
        __SENTRA_FEATURE_FLAGS__?: Record<string, boolean>;
      }
    ).__SENTRA_FEATURE_FLAGS__;

    Object.defineProperty(globalThis, 'chrome', {
      configurable: true,
      value: originalChrome,
    });

    vi.clearAllMocks();
    vi.restoreAllMocks();
  });

  async function openWorkbenchWithSyntheticFixture() {
    const renderResult = render(<SentraAssistSidepanelApp />);

    await act(async () => {
      await vi.advanceTimersByTimeAsync(500);
    });

    fireEvent.click(screen.getByRole('button', { name: /Launch Console/i }));

    await act(async () => {
      await vi.advanceTimersByTimeAsync(500);
    });

    fireEvent.click(screen.getByRole('button', { name: 'Gunakan fixture trajectory sintetis' }));
    fireEvent.click(screen.getByRole('button', { name: 'Buka review trajectory lengkap' }));

    await act(async () => {
      await vi.advanceTimersByTimeAsync(50);
    });

    expect(screen.getByTestId('sentra-approved-workbench-slot')).toBeTruthy();

    return renderResult;
  }

  it('renders real ClinicalTrajectoryV2 from sidepanel workbench with three synthetic visits', async () => {
    const { container } = await openWorkbenchWithSyntheticFixture();

    expect(screen.getByTestId('clinical-reasoning-workbench')).toBeTruthy();
    expect(screen.getByTestId('clinical-trajectory-v2')).toBeTruthy();
    expect(screen.queryByText('Data not available')).toBeNull();
    expect(screen.getByText(/4 kunjungan ditinjau/i)).toBeTruthy();
    expect(screen.getByText('Evidence map')).toBeTruthy();
    expect(findForbiddenPhysicianTrajectoryTerms(container.textContent || '')).toEqual([]);
  }, 15000);

  it('keeps therapy support locked in rich runtime trajectory fixture', async () => {
    const { container } = await openWorkbenchWithSyntheticFixture();

    const panel = screen.getByTestId('clinical-reasoning-differential-panel');

    expect(
      within(panel).getByText('Select a working diagnosis to unlock therapy support.')
    ).toBeTruthy();
    expect(
      within(panel).getByText('Therapy support locked until physician selection.')
    ).toBeTruthy();
    // Therapy support stays locked, but the diagnosis-review navigation is now
    // wired end-to-end (main.tsx -> ClinicalReasoningWorkbench -> ClinicalTrajectory),
    // so the button must be enabled — not the stale "Diagnosis review unavailable" state.
    expect(
      (within(panel).getByRole('button', { name: 'Open diagnosis review' }) as HTMLButtonElement)
        .disabled
    ).toBe(false);
    expect(within(panel).queryByText(/therapy plan|probability|percentage/i)).toBeNull();

    expect(findForbiddenPhysicianTrajectoryTerms(container.textContent || '')).toEqual([]);
  }, 15000);
});
