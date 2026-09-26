import type { TrajectoryVisualizationViewModel } from '@/lib/iskandar-diagnosis-engine/trajectory-visualization-view-model';

import { TrajectoryStateTimelineChart } from '../charts';
import { TrajectoryEmptyState } from '../charts/chart-shared';

export function CompactTrajectoryEvidenceStrip({
  viewModel,
}: {
  viewModel: TrajectoryVisualizationViewModel;
}) {
  const latestVisits = viewModel.trajectoryTimeline.slice(-5);

  return (
    <section
      className="ct-v2-primary-trajectory"
      data-testid="compact-trajectory-evidence-strip"
    >
      <div className="ct-v2-primary-trajectory__head">
        <div className="ttv-section-title">Trajectory</div>
      </div>

      <div className="ct-v2-primary-trajectory__chart">
        {latestVisits.length >= 2 ? (
          <TrajectoryStateTimelineChart
            viewModel={{ trajectoryTimeline: latestVisits }}
            compact
          />
        ) : (
          <TrajectoryEmptyState
            title="Insufficient trajectory data"
            message="No visit trend available."
          />
        )}
      </div>
    </section>
  );
}
