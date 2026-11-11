import {
  TrajectoryEmptyState,
  TrajectoryResultTimeline,
  TrajectorySimplePanel,
  formatChartDate,
  formatValue,
} from '../charts/chart-shared';

import { VITAL_SERIES_META, VitalPlayground } from './VitalPlayground';

import type { TrajectoryVisualizationViewModel } from '@/lib/iskandar-diagnosis-engine/trajectory-visualization-view-model';

type VitalSeries = (typeof VITAL_SERIES_META)[number];

function pickSeries(viewModel: TrajectoryVisualizationViewModel): VitalSeries[] {
  const prioritized = VITAL_SERIES_META.filter((item) =>
    viewModel.vitalTrendMeta.primaryVitalDrivers.includes(item.label)
  );
  const available = VITAL_SERIES_META.filter((item) =>
    viewModel.vitalTrends.some((point) => point[item.key] !== undefined)
  );
  return (prioritized.length > 0 ? prioritized : available).slice(0, 3);
}

export function TrajectoryVitalSignsPanel({
  viewModel,
}: {
  viewModel: TrajectoryVisualizationViewModel;
}) {
  const hasPoints = viewModel.vitalTrends.length > 0;
  const selectedSeries = pickSeries(viewModel);

  return (
    <div data-testid="trajectory-vital-signs-panel">
      <TrajectorySimplePanel
        title="Tren Tanda Vital"
        chart={
          hasPoints && selectedSeries.length > 0 ? (
            <VitalPlayground viewModel={viewModel} />
          ) : (
            <TrajectoryEmptyState
              title="Tanda vital belum tersedia"
              message="Belum ada tren tanda vital objektif untuk ditinjau."
            />
          )
        }
        result={
          hasPoints ? (
            <TrajectoryResultTimeline
              items={selectedSeries.map((series) => {
                const latestRow = [...viewModel.vitalTrends]
                  .reverse()
                  .find((point) => point[series.key] !== undefined);
                const latestValue = latestRow?.[series.key];

                return {
                  id: series.key,
                  eyebrow: series.label,
                  title: formatValue(latestValue),
                  meta: latestRow ? formatChartDate(latestRow.date) : undefined,
                  detail: `Driver utama: ${
                    viewModel.vitalTrendMeta.primaryVitalDrivers.join(', ') || '-'
                  }`,
                };
              })}
            />
          ) : (
            <div className="text-small text-muted">
              No objective vital trajectory is available for chart review.
            </div>
          )
        }
      />
    </div>
  );
}
