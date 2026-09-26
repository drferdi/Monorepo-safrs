import { render, screen, waitFor, within } from '@testing-library/react';
import React from 'react';
import { afterEach, beforeAll, describe, expect, it, vi } from 'vitest';

import { ClinicalTrajectory } from './ClinicalTrajectory';

import {
  FORBIDDEN_PHYSICIAN_TRAJECTORY_PATTERNS,
  findForbiddenPhysicianTrajectoryTerms,
} from '@/lib/iskandar-diagnosis-engine/presentation-safety';
import * as trajectoryVisualizationViewModelModule from '@/lib/iskandar-diagnosis-engine/trajectory-visualization-view-model';
import type { VisitRecord } from '@/lib/iskandar-diagnosis-engine/visit-history-store';

const mockFns = vi.hoisted(() => ({
  evaluateCanonicalClinicalEngine: vi.fn(async () => ({
    request_id: 'req-test',
    processed_at: '2026-06-18T08:00:00.000Z',
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
      visit_count: 3,
    },
  })),
  sendMessage: vi.fn(),
}));

vi.mock('wxt/browser', () => ({
  browser: {
    runtime: {
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

vi.mock('@/components/clinical/CTHeader', () => ({
  CTHeader: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
}));

vi.mock('@/components/clinical/ClinicalScreenTabs', () => ({
  ClinicalScreenTabs: () => <div data-testid="trajectory-tabs" />,
}));

vi.mock('@/components/clinical/DosageCalculator', () => ({
  DosageCalculator: () => <div data-testid="dose-calc" />,
}));

vi.mock('@/lib/api/bridge-client', () => ({
  evaluateCanonicalClinicalEngine: mockFns.evaluateCanonicalClinicalEngine,
}));

vi.mock('@/utils/messaging', () => ({
  sendMessage: mockFns.sendMessage,
}));

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

afterEach(() => {
  delete process.env.USE_HYBRID_TRAJECTORY_ENGINE;
  delete process.env.USE_TRAJECTORY_VISUALIZATION_PANEL;
  delete process.env.USE_CLINICAL_TRAJECTORY_V2;
  delete process.env.TRAJECTORY_COMPARE_MODE;
  delete (
    globalThis as typeof globalThis & {
      __SENTRA_FEATURE_FLAGS__?: Record<string, boolean>;
    }
  ).__SENTRA_FEATURE_FLAGS__;
  vi.clearAllMocks();
  vi.restoreAllMocks();
});

function makeVisit(
  index: number,
  vitals: VisitRecord['vitals'],
  overrides: Partial<Omit<VisitRecord, 'vitals'>> = {}
): VisitRecord {
  const base = new Date('2026-04-01T08:00:00.000Z').getTime();
  return {
    patient_id: 'RM-CT-001',
    encounter_id: `enc-${index}`,
    timestamp: new Date(base + index * 24 * 60 * 60 * 1000).toISOString(),
    vitals,
    keluhan_utama: 'Kontrol rutin',
    source: 'scrape',
    ...overrides,
  };
}

function renderTrajectory(
  visits: VisitRecord[],
  overrides: Partial<React.ComponentProps<typeof ClinicalTrajectory>> = {}
) {
  return render(
    <ClinicalTrajectory
      vitals={{
        sbp: 166,
        dbp: 104,
        hr: 112,
        rr: 24,
        temp: 38.2,
        spo2: 92,
        glucose: 286,
      }}
      keluhanUtama="Nyeri dada menjalar dan sesak"
      keluhanTambahan="Demam dan batuk"
      narrative={{
        keluhan_utama: 'Nyeri dada menjalar dan sesak',
        lama_sakit: '2 hari',
        is_akut: true,
        confidence: 0.84,
      }}
      alerts={[]}
      patientAge={57}
      patientGender="L"
      patientName="Tn. Sentra"
      patientRM="RM-CT-001"
      prefetchedVisits={visits}
      prefetchedDiagnostics={['OK']}
      prefetchedVisitStatus="ready"
      onBack={() => undefined}
      {...overrides}
    />
  );
}

describe('ClinicalTrajectory physician safety', () => {
  it('renders V2 safely even when old feature flags are OFF', async () => {
    process.env.USE_HYBRID_TRAJECTORY_ENGINE = 'false';
    process.env.USE_TRAJECTORY_VISUALIZATION_PANEL = 'false';
    process.env.USE_CLINICAL_TRAJECTORY_V2 = 'false';

    renderTrajectory([
      makeVisit(1, { sbp: 148, dbp: 92, hr: 94, rr: 20, temp: 37.4, glucose: 188 }),
      makeVisit(2, { sbp: 152, dbp: 96, hr: 98, rr: 21, temp: 37.7, glucose: 212 }),
      makeVisit(3, { sbp: 158, dbp: 98, hr: 104, rr: 22, temp: 38.0, glucose: 236 }),
    ]);

    expect(await screen.findByTestId('clinical-trajectory-v2')).toBeInTheDocument();
    expect(screen.getByTestId('trajectory-chart-tabs')).toBeInTheDocument();
    expect(
      screen.getByRole('tab', { name: 'Patient Clinical Timeline' })
    ).toHaveAttribute('aria-selected', 'true');
    expect(screen.getByTestId('trajectory-chart-tabpanel-clinical-timeline')).toBeInTheDocument();
    expect(screen.queryByTestId('compact-trajectory-mini-chart')).not.toBeInTheDocument();
    expect(screen.queryByText('Grafik trajectory compact')).not.toBeInTheDocument();
    expect(screen.queryByTestId('trajectory-visualization-panel')).not.toBeInTheDocument();
    expect(mockFns.sendMessage).not.toHaveBeenCalled();
  });

  it('renders V2 without forbidden physician-facing terms or prognostic proxy label', async () => {
    process.env.USE_HYBRID_TRAJECTORY_ENGINE = 'true';
    process.env.USE_TRAJECTORY_VISUALIZATION_PANEL = 'false';

    const { container } = renderTrajectory([
      makeVisit(
        1,
        { sbp: 138, dbp: 88, hr: 92, rr: 20, temp: 37.1, glucose: 176 },
        {
          keluhan_utama: 'Kontrol diabetes',
          diagnosa: { icd_x: 'E11.9', nama: 'Diabetes melitus tipe 2' },
          terapi_obat: 'Metformin 500mg',
        }
      ),
      makeVisit(
        2,
        { sbp: 152, dbp: 96, hr: 104, rr: 22, temp: 38.0, glucose: 248 },
        {
          keluhan_utama: 'Demam dan sesak',
          diagnosa: { icd_x: 'E11.9', nama: 'Diabetes melitus tipe 2' },
          terapi_obat: 'Metformin 500mg',
        }
      ),
      makeVisit(
        3,
        { sbp: 166, dbp: 104, hr: 112, rr: 24, temp: 38.5, glucose: 302 },
        {
          keluhan_utama: 'Sesak memberat',
          diagnosa: { icd_x: 'E11.9', nama: 'Diabetes melitus tipe 2' },
          terapi_obat: 'Metformin 500mg',
        }
      ),
    ]);

    expect(await screen.findByTestId('clinical-trajectory-v2')).toBeInTheDocument();
    expect(screen.getByTestId('clinical-reasoning-workbench')).toBeInTheDocument();
    expect(screen.getByTestId('clinical-trajectory-status-strip')).toBeInTheDocument();
    expect(screen.queryByText('MORTALITY PROXY')).not.toBeInTheDocument();

    await waitFor(() => {
      const text = container.textContent ?? '';
      for (const pattern of FORBIDDEN_PHYSICIAN_TRAJECTORY_PATTERNS) {
        expect(pattern.test(text)).toBe(false);
      }
      expect(findForbiddenPhysicianTrajectoryTerms(text)).toEqual([]);
    });
  });

  it('keeps the old trajectory visualization panel hidden because V2 is the product surface', async () => {
    process.env.USE_HYBRID_TRAJECTORY_ENGINE = 'true';
    process.env.USE_TRAJECTORY_VISUALIZATION_PANEL = 'true';
    process.env.USE_CLINICAL_TRAJECTORY_V2 = 'false';

    const { container } = renderTrajectory([
      makeVisit(
        1,
        { sbp: 138, dbp: 88, hr: 92, rr: 20, temp: 37.1, glucose: 176 },
        {
          keluhan_utama: 'Kontrol diabetes',
          diagnosa: { icd_x: 'E11.9', nama: 'Diabetes melitus tipe 2' },
          terapi_obat: 'Metformin 500mg',
        }
      ),
      makeVisit(
        2,
        { sbp: 152, dbp: 96, hr: 104, rr: 22, temp: 38.0, glucose: 248 },
        {
          keluhan_utama: 'Demam dan sesak',
          diagnosa: { icd_x: 'E11.9', nama: 'Diabetes melitus tipe 2' },
          terapi_obat: 'Metformin 500mg',
        }
      ),
      makeVisit(
        3,
        { sbp: 166, dbp: 104, hr: 112, rr: 24, temp: 38.5, glucose: 302 },
        {
          keluhan_utama: 'Sesak memberat',
          diagnosa: { icd_x: 'E11.9', nama: 'Diabetes melitus tipe 2' },
          terapi_obat: 'Metformin 500mg',
        }
      ),
    ]);

    expect(await screen.findByTestId('clinical-trajectory-v2')).toBeInTheDocument();
    expect(screen.queryByTestId('trajectory-visualization-panel')).not.toBeInTheDocument();
    expect(screen.queryByText('Trajectory Antar Kunjungan')).not.toBeInTheDocument();

    await waitFor(() => {
      expect(findForbiddenPhysicianTrajectoryTerms(container.textContent || '')).toEqual([]);
    });
  });

  it('renders ClinicalTrajectoryV2 when V2 flag is ON and hybrid data is safe to build', async () => {
    process.env.USE_HYBRID_TRAJECTORY_ENGINE = 'true';
    process.env.USE_TRAJECTORY_VISUALIZATION_PANEL = 'false';
    process.env.USE_CLINICAL_TRAJECTORY_V2 = 'true';

    const { container } = renderTrajectory([
      makeVisit(
        1,
        { sbp: 138, dbp: 88, hr: 92, rr: 20, temp: 37.1, glucose: 176 },
        {
          keluhan_utama: 'Kontrol diabetes',
          diagnosa: { icd_x: 'E11.9', nama: 'Diabetes melitus tipe 2' },
          terapi_obat: 'Metformin 500mg',
        }
      ),
      makeVisit(
        2,
        { sbp: 152, dbp: 96, hr: 104, rr: 22, temp: 38.0, glucose: 248 },
        {
          keluhan_utama: 'Demam dan sesak',
          diagnosa: { icd_x: 'J18.9', nama: 'Pneumonia' },
          terapi_obat: 'Antibiotik oral',
        }
      ),
      makeVisit(
        3,
        { sbp: 166, dbp: 104, hr: 112, rr: 24, temp: 38.5, glucose: 302 },
        {
          keluhan_utama: 'Sesak memberat',
          diagnosa: { icd_x: 'J18.9', nama: 'Pneumonia' },
          terapi_obat: 'Antibiotik oral',
        }
      ),
    ]);

    const header = await screen.findByTestId('clinical-trajectory-v2-header');
    const chartSection = await screen.findByTestId('trajectory-chart-tabs');
    const statusStrip = await screen.findByTestId('clinical-trajectory-status-strip');

    expect(await screen.findByTestId('clinical-trajectory-v2')).toBeInTheDocument();
    expect(
      statusStrip.compareDocumentPosition(header) & Node.DOCUMENT_POSITION_FOLLOWING
    ).toBeTruthy();
    expect(
      header.compareDocumentPosition(chartSection) & Node.DOCUMENT_POSITION_FOLLOWING
    ).toBeTruthy();
    expect(screen.queryByText('First Glance Clinical Status')).not.toBeInTheDocument();
    expect(within(header).queryByText('Kualitas data')).not.toBeInTheDocument();
    expect(
      within(header).getByText(/Trajectory suggests|Trajectory is relatively stable/i)
    ).toBeInTheDocument();
    expect(screen.queryByText('Driver Klinis Utama')).not.toBeInTheDocument();
    expect(screen.queryByText('Catatan Keselamatan')).not.toBeInTheDocument();
    expect(screen.queryByText('Trajectory Coverage Strip')).not.toBeInTheDocument();
    expect(screen.queryByRole('tab', { name: 'Trajectory' })).not.toBeInTheDocument();
    expect(screen.queryByRole('tab', { name: 'Vital' })).not.toBeInTheDocument();
    expect(screen.queryByRole('tab', { name: 'Driver' })).not.toBeInTheDocument();
    expect(screen.queryByText('Perhatian klinis')).not.toBeInTheDocument();
    expect(screen.queryByText('Data terbatas')).not.toBeInTheDocument();
    expect(
      within(chartSection).getByRole('tab', { name: 'Patient Clinical Timeline' })
    ).toHaveAttribute('aria-selected', 'true');
    expect(screen.getByTestId('trajectory-chart-tabpanel-clinical-timeline')).toBeInTheDocument();
    expect(screen.getByTestId('trajectory-clinical-timeline-panel')).toBeInTheDocument();
    expect(screen.queryByTestId('compact-trajectory-mini-chart')).not.toBeInTheDocument();
    expect(screen.queryByText('Grafik trajectory compact')).not.toBeInTheDocument();
    expect(
      within(screen.getByTestId('clinical-trajectory-v2')).queryByRole('button', {
        name: /evidence/i,
      })
    ).not.toBeInTheDocument();
    expect(
      within(screen.getByTestId('clinical-evidence-drawer')).getByText('Evidence map')
    ).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Review details' })).toBeInTheDocument();
    expect(screen.queryByTestId('trajectory-visualization-panel')).not.toBeInTheDocument();
    expect(screen.queryByText('Trajectory Antar Kunjungan')).not.toBeInTheDocument();
    expect(screen.queryByText('Tren Vital Prioritas')).not.toBeInTheDocument();

    await waitFor(() => {
      expect(findForbiddenPhysicianTrajectoryTerms(container.textContent || '')).toEqual([]);
    });
  });

  it('renders ClinicalTrajectoryV2 from runtime feature flags so V2 can be reviewed from the app path', async () => {
    (
      globalThis as typeof globalThis & {
        __SENTRA_FEATURE_FLAGS__?: Record<string, boolean>;
      }
    ).__SENTRA_FEATURE_FLAGS__ = {
      USE_HYBRID_TRAJECTORY_ENGINE: true,
      USE_CLINICAL_TRAJECTORY_V2: true,
      USE_TRAJECTORY_VISUALIZATION_PANEL: false,
    };

    renderTrajectory([
      makeVisit(
        1,
        { sbp: 138, dbp: 88, hr: 92, rr: 20, temp: 37.1, glucose: 176 },
        {
          keluhan_utama: 'Kontrol diabetes',
          diagnosa: { icd_x: 'E11.9', nama: 'Diabetes melitus tipe 2' },
          terapi_obat: 'Metformin 500mg',
        }
      ),
      makeVisit(
        2,
        { sbp: 152, dbp: 96, hr: 104, rr: 22, temp: 38.0, glucose: 248 },
        {
          keluhan_utama: 'Demam dan sesak',
          diagnosa: { icd_x: 'J18.9', nama: 'Pneumonia' },
          terapi_obat: 'Antibiotik oral',
        }
      ),
      makeVisit(
        3,
        { sbp: 166, dbp: 104, hr: 112, rr: 24, temp: 38.5, glucose: 302 },
        {
          keluhan_utama: 'Sesak memberat',
          diagnosa: { icd_x: 'J18.9', nama: 'Pneumonia' },
          terapi_obat: 'Antibiotik oral',
        }
      ),
    ]);

    expect(await screen.findByTestId('clinical-trajectory-v2')).toBeInTheDocument();
  });

  it('does not fall back to legacy UI when old hybrid flags are OFF', async () => {
    process.env.USE_HYBRID_TRAJECTORY_ENGINE = 'false';
    process.env.USE_TRAJECTORY_VISUALIZATION_PANEL = 'true';

    renderTrajectory([
      makeVisit(1, { sbp: 148, dbp: 92, hr: 94, rr: 20, temp: 37.4, glucose: 188 }),
      makeVisit(2, { sbp: 152, dbp: 96, hr: 98, rr: 21, temp: 37.7, glucose: 212 }),
      makeVisit(3, { sbp: 158, dbp: 98, hr: 104, rr: 22, temp: 38.0, glucose: 236 }),
    ]);

    expect(await screen.findByTestId('clinical-trajectory-v2')).toBeInTheDocument();
    expect(screen.queryByTestId('trajectory-visualization-panel')).not.toBeInTheDocument();
  });

  it('keeps V2 visible when view model construction fails under visualization mode', async () => {
    process.env.USE_HYBRID_TRAJECTORY_ENGINE = 'true';
    process.env.USE_TRAJECTORY_VISUALIZATION_PANEL = 'true';
    process.env.USE_CLINICAL_TRAJECTORY_V2 = 'true';

    vi.spyOn(
      trajectoryVisualizationViewModelModule,
      'buildTrajectoryVisualizationViewModel'
    ).mockImplementationOnce(() => {
      throw new Error('view model builder failed');
    });

    renderTrajectory([
      makeVisit(1, { sbp: 148, dbp: 92, hr: 94, rr: 20, temp: 37.4, glucose: 188 }),
      makeVisit(2, { sbp: 152, dbp: 96, hr: 98, rr: 21, temp: 37.7, glucose: 212 }),
      makeVisit(3, { sbp: 158, dbp: 98, hr: 104, rr: 22, temp: 38.0, glucose: 236 }),
    ]);

    expect(await screen.findByTestId('clinical-trajectory-v2')).toBeInTheDocument();
    expect(screen.queryByText(/View model chart rinci belum tersedia/i)).not.toBeInTheDocument();
    expect(screen.queryByTestId('trajectory-visualization-panel')).not.toBeInTheDocument();
  });

  it('keeps trajectory page safe when visit-history scan returns no response', async () => {
    process.env.USE_HYBRID_TRAJECTORY_ENGINE = 'true';
    process.env.USE_CLINICAL_TRAJECTORY_V2 = 'true';
    mockFns.sendMessage.mockResolvedValueOnce(undefined);

    render(
      <ClinicalTrajectory
        vitals={{
          sbp: 166,
          dbp: 104,
          hr: 112,
          rr: 24,
          temp: 38.2,
          spo2: 92,
          glucose: 286,
        }}
        keluhanUtama="Nyeri dada menjalar dan sesak"
        keluhanTambahan="Demam dan batuk"
        narrative={{
          keluhan_utama: 'Nyeri dada menjalar dan sesak',
          lama_sakit: '2 hari',
          is_akut: true,
          confidence: 0.84,
        }}
        alerts={[]}
        patientAge={57}
        patientGender="L"
        patientName="Tn. Sentra"
        patientRM="RM-CT-001"
        onBack={() => undefined}
      />
    );

    expect(await screen.findByTestId('clinical-trajectory-v2-error')).toBeInTheDocument();
    expect(screen.getByText('Data trajectory tidak cukup')).toBeInTheDocument();
    expect(screen.getByText(/Data trajectory belum cukup untuk review terstruktur/i)).toBeInTheDocument();
    expect(screen.queryByTestId('clinical-trajectory-v2')).not.toBeInTheDocument();
    expect(screen.queryByTestId('trajectory-chart-tabs')).not.toBeInTheDocument();
    expect(mockFns.evaluateCanonicalClinicalEngine).not.toHaveBeenCalled();
  });

  it('fails closed when prefetched history is marked ready but contains no longitudinal evidence', async () => {
    process.env.USE_HYBRID_TRAJECTORY_ENGINE = 'true';
    process.env.USE_CLINICAL_TRAJECTORY_V2 = 'true';

    renderTrajectory([], {
      prefetchedVisits: [],
      prefetchedDiagnostics: ['OK_BUT_EMPTY_HISTORY'],
      prefetchedVisitStatus: 'ready',
    });

    expect(await screen.findByTestId('clinical-trajectory-v2-error')).toBeInTheDocument();
    expect(screen.getByText('Data trajectory tidak cukup')).toBeInTheDocument();
    expect(screen.queryByTestId('clinical-trajectory-v2')).not.toBeInTheDocument();
    expect(mockFns.sendMessage).not.toHaveBeenCalled();
    expect(mockFns.evaluateCanonicalClinicalEngine).not.toHaveBeenCalled();
  });

  it('omits missing-data warnings in ClinicalTrajectoryV2 instead of spending space on data gaps', async () => {
    process.env.USE_HYBRID_TRAJECTORY_ENGINE = 'true';
    process.env.USE_TRAJECTORY_VISUALIZATION_PANEL = 'false';
    process.env.USE_CLINICAL_TRAJECTORY_V2 = 'true';

    const { container } = renderTrajectory(
      [
        makeVisit(1, { sbp: 150, dbp: 94, hr: 0, rr: 0, temp: 0, glucose: 0 }),
        makeVisit(2, { sbp: 152, dbp: 96, hr: 0, rr: 0, temp: 0, glucose: 0 }),
        makeVisit(3, { sbp: 154, dbp: 98, hr: 0, rr: 0, temp: 0, glucose: 0 }),
      ],
      {
        vitals: {
          sbp: 156,
          dbp: 100,
          hr: 0,
          rr: 0,
          temp: 0,
          spo2: 0,
          glucose: 0,
        },
        keluhanUtama: 'Lemas',
        keluhanTambahan: '',
        narrative: {
          keluhan_utama: 'Lemas',
          lama_sakit: '1 hari',
          is_akut: true,
          confidence: 0.52,
        },
      }
    );

    const header = await screen.findByTestId('clinical-trajectory-v2-header');
    const chartSection = await screen.findByTestId('trajectory-chart-tabs');
    const statusStrip = await screen.findByTestId('clinical-trajectory-status-strip');

    expect(await screen.findByTestId('clinical-trajectory-v2')).toBeInTheDocument();
    expect(
      statusStrip.compareDocumentPosition(header) & Node.DOCUMENT_POSITION_FOLLOWING
    ).toBeTruthy();
    expect(
      header.compareDocumentPosition(chartSection) & Node.DOCUMENT_POSITION_FOLLOWING
    ).toBeTruthy();
    expect(screen.queryByText('Data terbatas')).not.toBeInTheDocument();
    expect(within(header).queryByText('Kualitas data')).not.toBeInTheDocument();
    expect(within(header).queryByText(/data klinis masih terbatas/i)).not.toBeInTheDocument();
    expect(
      screen.queryByText(/interpretasi dipengaruhi kelengkapan riwayat/i)
    ).not.toBeInTheDocument();
    expect(screen.queryByText(/baseline personal belum cukup/i)).not.toBeInTheDocument();
    expect(screen.getByTestId('trajectory-chart-tabpanel-clinical-timeline')).toBeInTheDocument();
    expect(screen.getByTestId('trajectory-clinical-timeline-panel')).toBeInTheDocument();
    expect(
      within(chartSection).getByRole('tab', { name: 'Patient Clinical Timeline' })
    ).toHaveAttribute('aria-selected', 'true');
    expect(screen.queryByText('Trajectory Antar Kunjungan')).not.toBeInTheDocument();
    expect(findForbiddenPhysicianTrajectoryTerms(container.textContent || '')).toEqual([]);
  });

  it('embeds V2 workbench without old shell wrapper and hides raw diagnostics', async () => {
    renderTrajectory([], {
      shellMode: 'embedded',
      prefetchedVisits: [],
      prefetchedDiagnostics: ['RAW_DEBUG_LINE_SHOULD_NOT_RENDER'],
      prefetchedVisitStatus: 'insufficient',
      onBack: undefined,
    });

    expect(await screen.findByTestId('clinical-trajectory-v2-error')).toBeInTheDocument();
    expect(document.querySelector('.assist-shell--trajectory-v2')).not.toBeInTheDocument();
    expect(screen.queryByText('ERROR DIAGNOSTICS')).not.toBeInTheDocument();
    expect(screen.queryByText('RAW_DEBUG_LINE_SHOULD_NOT_RENDER')).not.toBeInTheDocument();
  });
});
