import { render, screen } from '@testing-library/react';
import { beforeAll, describe, expect, it, vi } from 'vitest';

import { analyzeHybridTrajectory } from '@/lib/iskandar-diagnosis-engine/hybrid-trajectory';
import { buildTrajectoryVisualizationViewModel } from '@/lib/iskandar-diagnosis-engine/trajectory-visualization-view-model';
import type { VisitRecord } from '@/lib/iskandar-diagnosis-engine/visit-history-store';

import { CompactTrajectoryEvidenceStrip } from './v2/CompactTrajectoryEvidenceStrip';

function makeVisit(
  index: number,
  vitals: VisitRecord['vitals'],
  overrides: Partial<Omit<VisitRecord, 'vitals'>> = {}
): VisitRecord {
  const base = new Date('2026-02-01T08:00:00.000Z').getTime();
  return {
    patient_id: 'RM-LEGACY-TRAJECTORY-001',
    encounter_id: `enc-${index}`,
    timestamp: new Date(base + index * 24 * 60 * 60 * 1000).toISOString(),
    vitals,
    keluhan_utama: 'Kontrol rutin',
    source: 'scrape',
    ...overrides,
  };
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

describe('TrajectoryVisualizationPanel legacy surface replacement', () => {
  it('renders the active compact trajectory strip instead of the removed full preview panel', () => {
    const viewModel = buildTrajectoryVisualizationViewModel(
      analyzeHybridTrajectory({
        visits: [
          makeVisit(1, { sbp: 148, dbp: 92, hr: 94, rr: 20, temp: 37.4, glucose: 188 }),
          makeVisit(2, { sbp: 162, dbp: 100, hr: 106, rr: 23, temp: 38.1, glucose: 246 }),
          makeVisit(3, { sbp: 176, dbp: 110, hr: 118, rr: 28, temp: 38.8, glucose: 320 }),
        ],
        currentEncounter: {
          keluhanUtama: 'Nyeri dada menjalar dan sesak',
          keluhanTambahan: 'Mual, demam',
          spo2: 91,
        },
      })
    );

    render(<CompactTrajectoryEvidenceStrip viewModel={viewModel} />);

    expect(screen.getByTestId('compact-trajectory-evidence-strip')).toBeInTheDocument();
    expect(screen.getByText('Trajectory')).toBeInTheDocument();
    expect(screen.getByRole('img', { name: 'Trajectory clinical rail' })).toBeInTheDocument();
    expect(screen.queryByText(/preview panel|legacy visualization/i)).not.toBeInTheDocument();
  });

  it('falls back to the active empty state when there is not enough visit trend data', () => {
    const viewModel = buildTrajectoryVisualizationViewModel(
      analyzeHybridTrajectory({
        visits: [makeVisit(1, { sbp: 148, dbp: 92, hr: 0, rr: 0, temp: 0, glucose: 0 })],
        currentEncounter: {
          keluhanUtama: '',
          spo2: undefined,
        },
      })
    );

    render(<CompactTrajectoryEvidenceStrip viewModel={viewModel} />);

    expect(screen.getByText('Insufficient trajectory data')).toBeInTheDocument();
    expect(screen.getByText('No visit trend available.')).toBeInTheDocument();
    expect(screen.queryByTestId('compact-trajectory-mini-chart')).not.toBeInTheDocument();
  });
});
