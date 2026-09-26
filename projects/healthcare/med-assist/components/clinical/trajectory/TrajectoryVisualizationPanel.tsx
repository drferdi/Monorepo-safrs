import type { TrajectoryVisualizationViewModel } from '@/lib/iskandar-diagnosis-engine/trajectory-visualization-view-model';

import {
  BaselineDeviationChart,
  KeyDriverContributionChart,
  TrajectoryStateTimelineChart,
  VitalTrendChart,
} from './charts';

export function TrajectoryVisualizationPanel({
  viewModel,
}: {
  viewModel: TrajectoryVisualizationViewModel;
}) {
  return (
    <div className="flex flex-col gap-3 md:gap-4" data-testid="trajectory-visualization-panel">
      <TrajectoryStateTimelineChart viewModel={viewModel} />

      <div className="grid gap-3 md:gap-4 xl:grid-cols-[minmax(0,1.2fr)_minmax(0,0.95fr)]">
        <div className="min-w-0">
          <VitalTrendChart viewModel={viewModel} />
        </div>
        <div className="min-w-0">
          <KeyDriverContributionChart viewModel={viewModel} />
        </div>
      </div>

      <BaselineDeviationChart
        viewModel={{
          baselineDeviation: viewModel.baselineDeviation,
          baselineAvailability: viewModel.baselineAvailability,
          dataQualityWarnings: viewModel.dataQualityWarnings,
        }}
      />
    </div>
  );
}
