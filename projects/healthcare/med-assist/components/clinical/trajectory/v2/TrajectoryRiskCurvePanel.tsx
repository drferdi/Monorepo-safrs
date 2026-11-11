import {
  CartesianGrid,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';

import {
  TRAJECTORY_CHART_PALETTE,
  TrajectoryEmptyState,
  TrajectoryResultTimeline,
  TrajectorySimplePanel,
  formatChartDate,
  formatValue,
} from '../charts/chart-shared';

import type { TrajectoryVisualizationViewModel } from '@/lib/iskandar-diagnosis-engine/trajectory-visualization-view-model';

export function TrajectoryRiskCurvePanel({
  viewModel,
}: {
  viewModel: TrajectoryVisualizationViewModel;
}) {
  const riskRows = viewModel.riskTrajectory ?? [];

  return (
    <div data-testid="trajectory-risk-curve-panel">
      <TrajectorySimplePanel
        title="Kurva Perburukan"
        chart={
          riskRows.length > 0 ? (
            <div className="h-56 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={riskRows} margin={{ top: 8, right: 8, left: 0, bottom: 8 }}>
                  <CartesianGrid
                    stroke={TRAJECTORY_CHART_PALETTE.surfaceLine}
                    strokeDasharray="3 3"
                  />
                  <XAxis
                    dataKey="visitLabel"
                    tick={{ fill: TRAJECTORY_CHART_PALETTE.textMuted, fontSize: 11 }}
                    axisLine={{ stroke: TRAJECTORY_CHART_PALETTE.surfaceLine }}
                    tickLine={false}
                  />
                  <YAxis
                    domain={[0, 100]}
                    tick={{ fill: TRAJECTORY_CHART_PALETTE.textMuted, fontSize: 10 }}
                    axisLine={false}
                    tickLine={false}
                    width={36}
                  />
                  <Tooltip
                    content={({ active, payload }) => {
                      if (!active || !payload?.length) return null;
                      const point = payload[0]?.payload as (typeof riskRows)[number] | undefined;
                      if (!point) return null;

                      return (
                        <div className="neu-card-inset min-w-44 p-3">
                          <div className="ttv-label text-tertiary">{point.visitLabel}</div>
                          <div className="text-small text-platinum">{point.score} / 100</div>
                          <div className="mt-1 text-tiny text-muted">
                            {formatChartDate(point.date)}
                          </div>
                        </div>
                      );
                    }}
                  />
                  <Line
                    type="monotone"
                    dataKey="score"
                    stroke={TRAJECTORY_CHART_PALETTE.high}
                    strokeWidth={2.5}
                    dot={{
                      r: 4,
                      stroke: TRAJECTORY_CHART_PALETTE.dotStroke,
                      strokeWidth: 1.5,
                    }}
                    activeDot={{
                      r: 5,
                      stroke: TRAJECTORY_CHART_PALETTE.dotStroke,
                      strokeWidth: 2,
                    }}
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>
          ) : (
            <TrajectoryEmptyState
              title="Kurva risiko belum tersedia"
              message="Belum ada kurva risiko antar kunjungan."
            />
          )
        }
        result={
          riskRows.length > 0 ? (
            <TrajectoryResultTimeline
              items={riskRows.map((item) => ({
                id: `${item.visitLabel}-${item.date}`,
                eyebrow: item.visitLabel,
                title: `${item.score} / 100`,
                meta: formatChartDate(item.date),
                detail: `${item.riskLevel} · ${item.overallTrend} · ${item.physiologyState}`,
                note: `${item.momentumLabel} · NEWS2 proxy ${formatValue(
                  item.news2AggregateScore
                )} · Confidence ${formatValue(item.confidence * 100, '%')}`,
              }))}
            />
          ) : (
            <div className="text-small text-muted">
              No visit-to-visit risk trajectory is available.
            </div>
          )
        }
      />
    </div>
  );
}
