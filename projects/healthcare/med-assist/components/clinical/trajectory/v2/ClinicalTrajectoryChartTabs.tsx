import { useState } from 'react';

import { TrajectoryClinicalTimelinePanel } from './TrajectoryClinicalTimelinePanel';
import { TrajectoryDiagnosticEvolutionPanel } from './TrajectoryDiagnosticEvolutionPanel';
import { TrajectoryRedFlagTimelinePanel } from './TrajectoryRedFlagTimelinePanel';
import { TrajectoryRiskCurvePanel } from './TrajectoryRiskCurvePanel';
import { TrajectoryVisitDeltaPanel } from './TrajectoryVisitDeltaPanel';
import { TrajectoryVitalSignsPanel } from './TrajectoryVitalSignsPanel';

import type { HybridTrajectoryResult } from '@/lib/iskandar-diagnosis-engine/hybrid-trajectory';
import type { TrajectoryVisualizationViewModel } from '@/lib/iskandar-diagnosis-engine/trajectory-visualization-view-model';

type ChartTabId =
  | 'clinical-timeline'
  | 'risk-curve'
  | 'vital-signs'
  | 'red-flag-timeline'
  | 'visit-delta'
  | 'diagnostic-evolution';

const DEFAULT_CHART_TAB_ID: ChartTabId = 'clinical-timeline';

const CHART_TABS: Array<{
  id: ChartTabId;
  label: string;
  shortLabel: string;
}> = [
  {
    id: DEFAULT_CHART_TAB_ID,
    label: 'Linimasa Klinis Pasien',
    shortLabel: 'LINIMASA',
  },
  {
    id: 'risk-curve',
    label: 'Kurva Risiko / Perburukan',
    shortLabel: 'PERBURUKAN',
  },
  {
    id: 'vital-signs',
    label: 'Tren Tanda Vital',
    shortLabel: 'TREN TTV',
  },
  {
    id: 'red-flag-timeline',
    label: 'Linimasa Tanda Bahaya',
    shortLabel: 'TANDA BAHAYA',
  },
  {
    id: 'visit-delta',
    label: 'Selisih Antar Kunjungan',
    shortLabel: 'SELISIH',
  },
  {
    id: 'diagnostic-evolution',
    label: 'Evolusi Hipotesis Diagnosis',
    shortLabel: 'EVOLUSI DX',
  },
];

function ClinicalLensAnimationAnchor() {
  return (
    <svg
      aria-hidden="true"
      className="pointer-events-none absolute h-0 w-0 opacity-0"
      focusable="false"
    >
      <g>
        <line
          className="ct-v2-compact-segment ct-v2-compact-segment--latest"
          data-clinical-lens-segment="latest"
          x1="0"
          x2="1"
          y1="0"
          y2="0"
          stroke="currentColor"
          strokeWidth="4"
        />
      </g>
      <g className="ct-v2-compact-point" data-clinical-lens-point="latest">
        <circle className="ct-v2-compact-point__core" cx="0" cy="0" r="1" />
        <circle className="ct-v2-compact-point__ring" cx="0" cy="0" r="1.5" />
      </g>
    </svg>
  );
}

function renderActivePanel(activeTab: ChartTabId, viewModel: TrajectoryVisualizationViewModel) {
  if (activeTab === 'clinical-timeline') {
    return <TrajectoryClinicalTimelinePanel viewModel={viewModel} />;
  }

  if (activeTab === 'risk-curve') {
    return <TrajectoryRiskCurvePanel viewModel={viewModel} />;
  }

  if (activeTab === 'vital-signs') {
    return <TrajectoryVitalSignsPanel viewModel={viewModel} />;
  }

  if (activeTab === 'red-flag-timeline') {
    return <TrajectoryRedFlagTimelinePanel viewModel={viewModel} />;
  }

  if (activeTab === 'visit-delta') {
    return <TrajectoryVisitDeltaPanel viewModel={viewModel} />;
  }

  if (activeTab === 'diagnostic-evolution') {
    return <TrajectoryDiagnosticEvolutionPanel viewModel={viewModel} />;
  }

  return null;
}

export function ClinicalTrajectoryChartTabs({
  hybridResult: _hybridResult,
  viewModel,
}: {
  hybridResult: HybridTrajectoryResult;
  viewModel: TrajectoryVisualizationViewModel;
}) {
  const [activeTab, setActiveTab] = useState<ChartTabId>(DEFAULT_CHART_TAB_ID);

  return (
    <section className="ct-v2-primary-trajectory" data-testid="trajectory-chart-tabs">
      <ClinicalLensAnimationAnchor />

      <div
        className="ct-v2-primary-trajectory__tablist"
        role="tablist"
        aria-label="Grafik trajektori klinis"
      >
        {CHART_TABS.map((tab) => {
          const selected = tab.id === activeTab;

          return (
            <button
              key={tab.id}
              type="button"
              role="tab"
              aria-label={tab.label}
              aria-selected={selected}
              aria-controls={`trajectory-chart-tabpanel-${tab.id}`}
              id={`trajectory-chart-tab-${tab.id}`}
              tabIndex={selected ? 0 : -1}
              className={`ct-v2-primary-trajectory__tab ${selected ? 'active' : ''}`}
              onClick={() => setActiveTab(tab.id)}
            >
              <span className="ct-v2-primary-trajectory__tab-short">{tab.shortLabel}</span>
            </button>
          );
        })}
      </div>

      <div
        role="tabpanel"
        id={`trajectory-chart-tabpanel-${activeTab}`}
        aria-labelledby={`trajectory-chart-tab-${activeTab}`}
        data-testid={`trajectory-chart-tabpanel-${activeTab}`}
        className="ct-v2-primary-trajectory__chart"
      >
        {renderActivePanel(activeTab, viewModel)}
      </div>
    </section>
  );
}
