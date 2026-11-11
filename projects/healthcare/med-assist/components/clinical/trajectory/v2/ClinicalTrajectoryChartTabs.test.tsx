import { fireEvent, render, screen, within } from '@testing-library/react';
import { beforeAll, describe, expect, it, vi } from 'vitest';

import { ClinicalTrajectoryChartTabs } from './ClinicalTrajectoryChartTabs';

import {
  analyzeHybridTrajectory,
  type HybridTrajectoryResult,
} from '@/lib/iskandar-diagnosis-engine/hybrid-trajectory';
import {
  buildTrajectoryVisualizationViewModel,
  type TrajectoryVisualizationViewModel,
} from '@/lib/iskandar-diagnosis-engine/trajectory-visualization-view-model';
import type { VisitRecord } from '@/lib/iskandar-diagnosis-engine/visit-history-store';

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

  Element.prototype.animate = (() =>
    ({
      cancel() {},
      commitStyles() {},
      finished: Promise.resolve(),
      finish() {},
      id: '',
      oncancel: null,
      onfinish: null,
      onremove: null,
      pause() {},
      pending: false,
      play() {},
      playbackRate: 1,
      playState: 'finished',
      ready: Promise.resolve(),
      reverse() {},
      startTime: 0,
      currentTime: 0,
      timeline: null,
      effect: null,
      addEventListener() {},
      removeEventListener() {},
      dispatchEvent() {
        return true;
      },
      persist() {},
      replaceState: 'active',
      updatePlaybackRate() {},
    }) as unknown as Animation) as Element['animate'];
});

function makeVisit(
  index: number,
  vitals: VisitRecord['vitals'],
  overrides: Partial<Omit<VisitRecord, 'vitals'>> = {}
): VisitRecord {
  const base = new Date('2026-02-01T08:00:00.000Z').getTime();
  return {
    patient_id: 'RM-V2-TABS-001',
    encounter_id: `v2-tabs-enc-${index}`,
    timestamp: new Date(base + index * 24 * 60 * 60 * 1000).toISOString(),
    vitals,
    keluhan_utama: 'Kontrol rutin',
    source: 'scrape',
    ...overrides,
  };
}

function buildScenario(
  visits: VisitRecord[],
  currentEncounter: {
    keluhanUtama: string;
    keluhanTambahan?: string;
    spo2?: number;
    consciousness?: 'alert' | 'voice' | 'pain' | 'unresponsive' | 'unknown';
    ageYears?: number;
  }
): {
  hybridResult: HybridTrajectoryResult;
  viewModel: TrajectoryVisualizationViewModel;
} {
  const hybridResult = analyzeHybridTrajectory({
    visits,
    currentEncounter,
  });

  return {
    hybridResult,
    viewModel: buildTrajectoryVisualizationViewModel(hybridResult),
  };
}

describe('ClinicalTrajectoryChartTabs', () => {
  it('renders six clinical tabs with Linimasa Klinis Pasien selected by default', () => {
    const scenario = buildScenario(
      [
        makeVisit(1, { sbp: 148, dbp: 92, hr: 94, rr: 20, temp: 37.4, glucose: 188 }),
        makeVisit(2, { sbp: 162, dbp: 100, hr: 106, rr: 23, temp: 38.1, glucose: 246 }),
        makeVisit(3, { sbp: 176, dbp: 110, hr: 118, rr: 28, temp: 38.8, glucose: 320 }),
      ],
      {
        keluhanUtama: 'Nyeri dada menjalar dan sesak',
        keluhanTambahan: 'Mual, demam',
        spo2: 91,
      }
    );

    render(
      <ClinicalTrajectoryChartTabs
        hybridResult={scenario.hybridResult}
        viewModel={scenario.viewModel}
      />
    );

    const tablist = screen.getByRole('tablist', { name: 'Grafik trajektori klinis' });
    expect(within(tablist).getByRole('tab', { name: 'Linimasa Klinis Pasien' })).toHaveAttribute(
      'aria-selected',
      'true'
    );
    expect(
      within(tablist).getByRole('tab', {
        name: 'Kurva Risiko / Perburukan',
      })
    ).toBeInTheDocument();
    expect(within(tablist).getByRole('tab', { name: 'Tren Tanda Vital' })).toBeInTheDocument();
    expect(within(tablist).getByRole('tab', { name: 'Linimasa Tanda Bahaya' })).toBeInTheDocument();
    expect(within(tablist).getByRole('tab', { name: 'Selisih Antar Kunjungan' })).toBeInTheDocument();
    expect(
      within(tablist).getByRole('tab', { name: 'Evolusi Hipotesis Diagnosis' })
    ).toBeInTheDocument();
    expect(screen.queryByText(/^Trajectory$/i)).not.toBeInTheDocument();
    expect(screen.getByTestId('trajectory-chart-tabpanel-clinical-timeline')).toBeInTheDocument();
    expect(screen.getByTestId('trajectory-clinical-timeline-panel')).toBeInTheDocument();
  });

  it('switches across clinical tabs and renders the matching panel surfaces', () => {
    const scenario = buildScenario(
      [
        makeVisit(1, { sbp: 122, dbp: 78, hr: 92, rr: 20, temp: 37.1, glucose: 142 }),
        makeVisit(2, { sbp: 106, dbp: 70, hr: 112, rr: 24, temp: 38.1, glucose: 166 }),
        makeVisit(3, { sbp: 92, dbp: 58, hr: 126, rr: 30, temp: 39.0, glucose: 188 }),
      ],
      {
        keluhanUtama: 'Sesak berat, demam tinggi, sulit bicara',
        keluhanTambahan: 'Batuk dan lemas',
        spo2: 91,
      }
    );

    render(
      <ClinicalTrajectoryChartTabs
        hybridResult={scenario.hybridResult}
        viewModel={scenario.viewModel}
      />
    );

    const defaultTab = screen.getByRole('tab', { name: 'Linimasa Klinis Pasien' });
    const riskTab = screen.getByRole('tab', {
      name: 'Kurva Risiko / Perburukan',
    });
    const vitalsTab = screen.getByRole('tab', { name: 'Tren Tanda Vital' });
    const tabpanel = screen.getByRole('tabpanel');

    fireEvent.click(riskTab);
    expect(riskTab).toHaveAttribute('aria-selected', 'true');
    expect(defaultTab).toHaveAttribute('aria-selected', 'false');
    expect(tabpanel).toHaveAttribute('id', 'trajectory-chart-tabpanel-risk-curve');
    expect(tabpanel).toHaveAttribute('aria-labelledby', 'trajectory-chart-tab-risk-curve');
    expect(screen.getByTestId('trajectory-risk-curve-panel')).toBeInTheDocument();

    fireEvent.click(vitalsTab);
    expect(vitalsTab).toHaveAttribute('aria-selected', 'true');
    expect(riskTab).toHaveAttribute('aria-selected', 'false');
    expect(tabpanel).toHaveAttribute('id', 'trajectory-chart-tabpanel-vital-signs');
    expect(tabpanel).toHaveAttribute('aria-labelledby', 'trajectory-chart-tab-vital-signs');
    expect(screen.getByTestId('trajectory-vital-signs-panel')).toBeInTheDocument();

    fireEvent.click(screen.getByRole('tab', { name: 'Linimasa Tanda Bahaya' }));
    expect(vitalsTab).toHaveAttribute('aria-selected', 'false');
    expect(screen.getByTestId('trajectory-red-flag-timeline-panel')).toBeInTheDocument();

    fireEvent.click(screen.getByRole('tab', { name: 'Selisih Antar Kunjungan' }));
    expect(screen.getByTestId('trajectory-visit-delta-panel')).toBeInTheDocument();

    fireEvent.click(screen.getByRole('tab', { name: 'Evolusi Hipotesis Diagnosis' }));
    expect(screen.getByTestId('trajectory-diagnostic-evolution-panel')).toBeInTheDocument();
  });
});
