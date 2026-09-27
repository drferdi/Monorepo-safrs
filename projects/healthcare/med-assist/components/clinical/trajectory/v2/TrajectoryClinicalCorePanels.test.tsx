import type { ReactNode } from 'react';
import { render, screen, within } from '@testing-library/react';
import { beforeAll, describe, expect, it, vi } from 'vitest';

vi.mock('recharts', async (importOriginal) => {
  const actual = await importOriginal<typeof import('recharts')>();

  return {
    ...actual,
    ResponsiveContainer: ({ children }: { children: ReactNode }) => (
      <div style={{ width: 960, height: 320 }}>{children}</div>
    ),
  };
});

import {
  partialTrajectoryVisualizationFixture,
  worseningTrajectoryVisualizationFixture,
} from '../trajectory-visualization.fixtures';

import {
  TrajectoryClinicalTimelinePanel,
  TrajectoryDiagnosticEvolutionPanel,
  TrajectoryRedFlagTimelinePanel,
  TrajectoryRiskCurvePanel,
  TrajectoryVisitDeltaPanel,
  TrajectoryVitalSignsPanel,
} from './index';

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

describe('Trajectory clinical core panels', () => {
  it('renders all six clinician-first panels from the worsening fixture', () => {
    const viewModel = worseningTrajectoryVisualizationFixture;

    render(
      <div>
        <TrajectoryClinicalTimelinePanel viewModel={viewModel} />
        <TrajectoryRiskCurvePanel viewModel={viewModel} />
        <TrajectoryVitalSignsPanel viewModel={viewModel} />
        <TrajectoryRedFlagTimelinePanel viewModel={viewModel} />
        <TrajectoryVisitDeltaPanel viewModel={viewModel} />
        <TrajectoryDiagnosticEvolutionPanel viewModel={viewModel} />
      </div>
    );

    const timelinePanel = screen.getByTestId('trajectory-clinical-timeline-panel');
    expect(timelinePanel).toBeInTheDocument();
    expect(within(timelinePanel).getByTestId('trajectory-simple-chart')).toBeInTheDocument();
    expect(within(timelinePanel).getByTestId('trajectory-simple-result')).toBeInTheDocument();
    const timelineResult = within(timelinePanel).getByTestId('trajectory-simple-result');
    expect(timelineResult.tagName).toBe('DETAILS');
    expect(timelineResult).not.toHaveAttribute('open');
    expect(within(timelineResult).getByText('Hasil')).toBeInTheDocument();
    expect(within(timelineResult).getByText('Open')).toBeInTheDocument();
    expect(within(timelinePanel).getByTestId('trajectory-result-timeline')).toBeInTheDocument();
    expect(within(timelinePanel).getAllByTestId('trajectory-result-entry').length).toBeGreaterThan(
      0
    );
    const visitEntries = within(timelinePanel).getAllByTestId('trajectory-result-entry');
    expect(
      visitEntries[0]?.querySelector('[data-testid="trajectory-visit-rail"]')
    ).toBeInTheDocument();
    expect(visitEntries[0]).toHaveStyle({ '--ct-visit-index': '0' });
    expect(within(timelinePanel).getByText('Kunjungan 3')).toBeInTheDocument();
    expect(within(timelinePanel).getByText(/Acute myocardial infarction/i)).toBeInTheDocument();
    expect(within(timelinePanel).getByText(/Clopidogrel,\s*Nitrat/i)).toBeInTheDocument();
    expect(within(timelinePanel).getByText('+2 terapi')).toBeInTheDocument();

    const riskPanel = screen.getByTestId('trajectory-risk-curve-panel');
    expect(riskPanel).toBeInTheDocument();
    expect(within(riskPanel).getByTestId('trajectory-simple-chart')).toBeInTheDocument();
    expect(within(riskPanel).getByTestId('trajectory-simple-result')).toBeInTheDocument();
    const riskResultEntries = within(riskPanel).getAllByTestId('trajectory-result-entry');
    expect(riskResultEntries[0]?.querySelector('.ct-v2-result-entry__rail')).toBeNull();
    expect(riskResultEntries[0]?.querySelector('.ct-v2-result-entry__dot')).toBeNull();
    expect(within(riskPanel).getByText('Kunjungan 3')).toBeInTheDocument();
    expect(within(riskPanel).getByText('100 / 100')).toBeInTheDocument();
    expect(within(riskPanel).getByText(/NEWS2 proxy 9/i)).toBeInTheDocument();

    const vitalPanel = screen.getByTestId('trajectory-vital-signs-panel');
    expect(vitalPanel).toBeInTheDocument();
    expect(within(vitalPanel).getByTestId('trajectory-simple-chart')).toBeInTheDocument();
    expect(within(vitalPanel).getByTestId('trajectory-simple-result')).toBeInTheDocument();
    expect(within(vitalPanel).getAllByTestId(/vital-series-/).length).toBeGreaterThan(0);

    const redFlagPanel = screen.getByTestId('trajectory-red-flag-timeline-panel');
    expect(redFlagPanel).toBeInTheDocument();
    expect(within(redFlagPanel).getByTestId('trajectory-simple-chart')).toBeInTheDocument();
    expect(within(redFlagPanel).getByTestId('trajectory-simple-result')).toBeInTheDocument();
    expect(within(redFlagPanel).getByText('Kunjungan 3')).toBeInTheDocument();
    expect(within(redFlagPanel).getByText(/Respiratory worsening concern/i)).toBeInTheDocument();

    const deltaPanel = screen.getByTestId('trajectory-visit-delta-panel');
    expect(deltaPanel).toBeInTheDocument();
    expect(within(deltaPanel).getByTestId('trajectory-simple-chart')).toBeInTheDocument();
    expect(within(deltaPanel).getByTestId('trajectory-simple-result')).toBeInTheDocument();
    expect(within(deltaPanel).getByText('Kunjungan 2 to Kunjungan 3')).toBeInTheDocument();
    expect(within(deltaPanel).getByText(/Laju napas \+5 \/min/i)).toBeInTheDocument();

    const diagnosticPanel = screen.getByTestId('trajectory-diagnostic-evolution-panel');
    expect(diagnosticPanel).toBeInTheDocument();
    expect(within(diagnosticPanel).getByTestId('trajectory-simple-chart')).toBeInTheDocument();
    expect(within(diagnosticPanel).getByTestId('trajectory-simple-result')).toBeInTheDocument();
    expect(within(diagnosticPanel).getByText(/Diabetes melitus tipe 2/i)).toBeInTheDocument();
    expect(
      within(diagnosticPanel).getByText(/Respiratory worsening concern|Pneumonia/i)
    ).toBeInTheDocument();
  });

  it('renders per-visit red-flag fallback when timeline rows exist but labels are empty', () => {
    const viewModel = partialTrajectoryVisualizationFixture;

    render(<TrajectoryRedFlagTimelinePanel viewModel={viewModel} />);

    const redFlagPanel = screen.getByTestId('trajectory-red-flag-timeline-panel');
    expect(redFlagPanel).toBeInTheDocument();
    expect(within(redFlagPanel).getByText('Kunjungan 1')).toBeInTheDocument();
    expect(within(redFlagPanel).getByText('No safety-critical flag recorded.')).toBeInTheDocument();
    expect(within(redFlagPanel).queryByText('No red flags recorded')).not.toBeInTheDocument();
  });

  it('summarizes long therapy regimens in visit cards', () => {
    const viewModel = {
      ...worseningTrajectoryVisualizationFixture,
      clinicalTimeline: worseningTrajectoryVisualizationFixture.clinicalTimeline?.map(
        (item, index) =>
          index === 2
            ? {
                ...item,
                therapySummary: 'Clopidogrel, Nitrat, Furosemide, Metformin, Ceftriaxone',
              }
            : item
      ),
    };

    render(<TrajectoryClinicalTimelinePanel viewModel={viewModel} />);

    const timelinePanel = screen.getByTestId('trajectory-clinical-timeline-panel');
    expect(within(timelinePanel).getByText(/Clopidogrel,\s*Nitrat/i)).toBeInTheDocument();
    expect(within(timelinePanel).getByText('+3 terapi')).toBeInTheDocument();
    expect(
      within(timelinePanel).queryByText(
        /Clopidogrel,\s*Nitrat,\s*Furosemide,\s*Metformin,\s*Ceftriaxone/i
      )
    ).not.toBeInTheDocument();
  });
});
