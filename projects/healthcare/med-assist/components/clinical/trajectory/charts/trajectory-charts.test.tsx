import { render, screen } from '@testing-library/react';
import { beforeAll, describe, expect, it, vi } from 'vitest';

import { analyzeHybridTrajectory } from '@/lib/iskandar-diagnosis-engine/hybrid-trajectory';
import { findForbiddenPhysicianTrajectoryTerms } from '@/lib/iskandar-diagnosis-engine/presentation-safety';
import { buildTrajectoryVisualizationViewModel } from '@/lib/iskandar-diagnosis-engine/trajectory-visualization-view-model';
import type { VisitRecord } from '@/lib/iskandar-diagnosis-engine/visit-history-store';

import {
  BaselineDeviationChart,
  KeyDriverContributionChart,
  MortalityProxyChart,
  TimeToCriticalChart,
  TrajectoryStateTimelineChart,
  VitalTrendChart,
} from './index';

function makeVisit(
  index: number,
  vitals: VisitRecord['vitals'],
  overrides: Partial<Omit<VisitRecord, 'vitals'>> = {}
): VisitRecord {
  const base = new Date('2026-02-01T08:00:00.000Z').getTime();
  return {
    patient_id: 'RM-CHART-001',
    encounter_id: `enc-${index}`,
    timestamp: new Date(base + index * 24 * 60 * 60 * 1000).toISOString(),
    vitals,
    keluhan_utama: 'Kontrol rutin',
    source: 'scrape',
    ...overrides,
  };
}

function buildStableViewModel() {
  return buildTrajectoryVisualizationViewModel(
    analyzeHybridTrajectory({
      visits: [
        makeVisit(1, { sbp: 124, dbp: 80, hr: 78, rr: 18, temp: 36.7, glucose: 116 }),
        makeVisit(2, { sbp: 126, dbp: 82, hr: 80, rr: 18, temp: 36.8, glucose: 118 }),
        makeVisit(3, { sbp: 125, dbp: 81, hr: 79, rr: 18, temp: 36.8, glucose: 117 }),
      ],
      currentEncounter: {
        keluhanUtama: 'Kontrol rutin',
        spo2: 98,
      },
    })
  );
}

function buildWorseningViewModel() {
  return buildTrajectoryVisualizationViewModel(
    analyzeHybridTrajectory({
      visits: [
        makeVisit(
          1,
          { sbp: 148, dbp: 92, hr: 94, rr: 20, temp: 37.4, glucose: 188 },
          {
            keluhan_utama: 'Batuk ringan',
            diagnosa: { icd_x: 'E11.9', nama: 'Diabetes melitus tipe 2' },
            terapi_obat: 'Metformin 500mg',
          }
        ),
        makeVisit(
          2,
          { sbp: 162, dbp: 100, hr: 106, rr: 23, temp: 38.1, glucose: 246 },
          {
            keluhan_utama: 'Demam dan sesak',
            diagnosa: { icd_x: 'I20', nama: 'Angina pektoris' },
            terapi_obat: 'Clopidogrel, Metformin',
          }
        ),
        makeVisit(
          3,
          { sbp: 176, dbp: 110, hr: 118, rr: 28, temp: 38.8, glucose: 320 },
          {
            keluhan_utama: 'Nyeri dada berat',
            diagnosa: { icd_x: 'I21.9', nama: 'Acute myocardial infarction' },
            terapi_obat: 'Clopidogrel, Nitrat, Furosemide, Metformin',
          }
        ),
      ],
      currentEncounter: {
        keluhanUtama: 'Nyeri dada menjalar dan sesak',
        keluhanTambahan: 'Mual, demam',
        spo2: 91,
      },
    })
  );
}

function buildPartialViewModel() {
  return buildTrajectoryVisualizationViewModel(
    analyzeHybridTrajectory({
      visits: [makeVisit(1, { sbp: 148, dbp: 92, hr: 0, rr: 0, temp: 0, glucose: 0 })],
      currentEncounter: {
        keluhanUtama: '',
        spo2: undefined,
      },
    })
  );
}

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

describe('trajectory charts', () => {
  it('renders physician-safe timeline and vital trend charts from the view model', () => {
    const stableViewModel = buildStableViewModel();
    const worseningViewModel = buildWorseningViewModel();
    const { container } = render(
      <div className="space-y-4">
        <TrajectoryStateTimelineChart viewModel={stableViewModel} />
        <VitalTrendChart viewModel={worseningViewModel} />
      </div>
    );

    expect(screen.getByText('Trajectory Antar Kunjungan')).toBeInTheDocument();
    expect(screen.getByText('Progression strip')).toBeInTheDocument();
    expect(screen.getAllByText(/Stabil/i).length).toBeGreaterThan(0);
    expect(screen.getByText('Tren Vital Prioritas')).toBeInTheDocument();
    expect(screen.getAllByTestId(/vital-series-/)).not.toHaveLength(0);
    expect(findForbiddenPhysicianTrajectoryTerms(container.textContent || '')).toEqual([]);
  });

  it('renders explainability content for key driver contribution chart', () => {
    const worseningViewModel = buildWorseningViewModel();
    const { container } = render(<KeyDriverContributionChart viewModel={worseningViewModel} />);

    expect(screen.getByText('Faktor Pendorong Trajectory')).toBeInTheDocument();
    expect(screen.getByText(/membantu menjelaskan perubahan/i)).toBeInTheDocument();
    expect(screen.queryByText(/explainability/i)).not.toBeInTheDocument();
    expect(worseningViewModel.keyDriverContributions[0]?.driver).toBeTruthy();
    expect(
      screen.getByText(worseningViewModel.keyDriverContributions[0]?.driver || '')
    ).toBeInTheDocument();
    expect(findForbiddenPhysicianTrajectoryTerms(container.textContent || '')).toEqual([]);
  });

  it('renders mortality proxy and time-to-critical visualizations from engine output', () => {
    const worseningViewModel = buildWorseningViewModel();
    render(
      <div className="space-y-4">
        <MortalityProxyChart viewModel={worseningViewModel} />
        <TimeToCriticalChart viewModel={worseningViewModel} />
      </div>
    );

    expect(screen.getByText('Mortality proxy')).toBeInTheDocument();
    expect(screen.getByText(/proxy score/i)).toBeInTheDocument();
    expect(screen.getByText('Time to critical')).toBeInTheDocument();
    expect(screen.getByTestId('time-to-critical-chart')).toBeInTheDocument();
  });

  it('renders professional empty state when baseline is unavailable and shows missing-data caution', () => {
    const partialViewModel = buildPartialViewModel();
    const { container } = render(
      <div className="space-y-4">
        <VitalTrendChart viewModel={partialViewModel} />
        <BaselineDeviationChart viewModel={partialViewModel} />
      </div>
    );

    expect(screen.getByText('Tren Vital Prioritas')).toBeInTheDocument();
    expect(screen.getByText('Data yang perlu diperiksa')).toBeInTheDocument();
    expect(screen.getByText('Baseline Personal vs Kondisi Saat Ini')).toBeInTheDocument();
    expect(screen.getByText(/baseline personal belum cukup/i)).toBeInTheDocument();
    expect(findForbiddenPhysicianTrajectoryTerms(container.textContent || '')).toEqual([]);
  });

  it('does not render a line chart for vital data that are unavailable or implausible as actual units', () => {
    const invalidViewModel = buildTrajectoryVisualizationViewModel(
      analyzeHybridTrajectory({
        visits: [
          makeVisit(1, { sbp: 148, dbp: 92, hr: 3, rr: 18, temp: 3, glucose: 110 }),
          makeVisit(2, { sbp: 150, dbp: 94, hr: 3, rr: 18, temp: 3, glucose: 112 }),
          makeVisit(3, { sbp: 152, dbp: 96, hr: 3, rr: 18, temp: 3, glucose: 114 }),
        ],
        currentEncounter: {
          keluhanUtama: 'Kontrol',
          spo2: 98,
        },
      })
    );

    render(<VitalTrendChart viewModel={invalidViewModel} />);

    expect(screen.getByTestId('vital-series-empty-pulse')).toBeInTheDocument();
    expect(screen.getByTestId('vital-series-empty-temperature')).toBeInTheDocument();
    expect(screen.queryByText('3 bpm')).not.toBeInTheDocument();
    expect(screen.queryByText('3 °C')).not.toBeInTheDocument();
  });

  it('renders the compact trajectory chart as a clinical rail without legacy chart labels', () => {
    const worseningViewModel = buildWorseningViewModel();

    render(
      <TrajectoryStateTimelineChart
        viewModel={{ trajectoryTimeline: worseningViewModel.trajectoryTimeline.slice(-5) }}
        compact
      />
    );

    expect(screen.getByRole('img', { name: 'Trajectory clinical rail' })).toBeInTheDocument();
    expect(screen.getByText('Mendesak')).toBeInTheDocument();
    expect(screen.queryByText('Grafik trajectory compact')).not.toBeInTheDocument();
  });

  it('marks the latest compact segment and point for clinical lens emphasis', () => {
    const worseningViewModel = buildWorseningViewModel();

    render(
      <TrajectoryStateTimelineChart
        viewModel={{ trajectoryTimeline: worseningViewModel.trajectoryTimeline.slice(-5) }}
        compact
      />
    );

    const compactChart = screen.getByTestId('compact-trajectory-mini-chart');
    const latestSegment = compactChart.querySelector('.ct-v2-compact-segment--latest');
    const latestPoint = compactChart.querySelector('[data-clinical-lens-point="latest"]');
    const allSegments = compactChart.querySelectorAll('.ct-v2-compact-segment');

    expect(allSegments.length).toBeGreaterThan(0);
    expect(latestSegment).not.toBeNull();
    expect(latestPoint).not.toBeNull();
  });
});
