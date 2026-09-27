import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';

import {
  TRAJECTORY_CHART_PALETTE,
  TrajectoryEmptyState,
  TrajectoryResultTimeline,
  TrajectorySimplePanel,
  formatChartDate,
} from '../charts/chart-shared';

import type { TrajectoryVisualizationViewModel } from '@/lib/iskandar-diagnosis-engine/trajectory-visualization-view-model';

export function TrajectoryDiagnosticEvolutionPanel({
  viewModel,
}: {
  viewModel: TrajectoryVisualizationViewModel;
}) {
  const rows = viewModel.diagnosticHypothesisEvolution ?? [];
  const chartRows = rows.map((item) => ({
    ...item,
    labelCount: item.labels.length,
  }));

  return (
    <div data-testid="trajectory-diagnostic-evolution-panel">
      <TrajectorySimplePanel
        title="Evolusi Diagnosis"
        chart={
          rows.length > 0 ? (
            <div className="h-56 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={chartRows} margin={{ top: 8, right: 8, left: 0, bottom: 8 }}>
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
                    allowDecimals={false}
                    tick={{ fill: TRAJECTORY_CHART_PALETTE.textMuted, fontSize: 10 }}
                    axisLine={false}
                    tickLine={false}
                    width={28}
                  />
                  <Tooltip
                    content={({ active, payload }) => {
                      if (!active || !payload?.length) return null;
                      const point = payload[0]?.payload as (typeof chartRows)[number] | undefined;
                      if (!point) return null;
                      return (
                        <div className="neu-card-inset min-w-44 p-3">
                          <div className="ttv-label text-tertiary">{point.visitLabel}</div>
                          <div className="text-small text-platinum">{point.labelCount} label</div>
                          <div className="mt-1 text-tiny text-muted">
                            {formatChartDate(point.date)}
                          </div>
                        </div>
                      );
                    }}
                  />
                  <Bar
                    dataKey="labelCount"
                    fill={TRAJECTORY_CHART_PALETTE.info}
                    radius={[6, 6, 0, 0]}
                  />
                </BarChart>
              </ResponsiveContainer>
            </div>
          ) : (
            <TrajectoryEmptyState
              title="Evolusi diagnosis belum tersedia"
              message="Belum ada evolusi diagnosis atau hipotesis untuk ditinjau."
            />
          )
        }
        result={
          rows.length > 0 ? (
            <TrajectoryResultTimeline
              items={rows.map((item) => ({
                id: `${item.visitLabel}-${item.date}`,
                eyebrow: item.visitLabel,
                title: formatChartDate(item.date),
                detail:
                  item.labels.join(' · ') ||
                  'Belum ada hipotesis diagnosis tercatat pada kunjungan ini.',
              }))}
            />
          ) : (
            <div className="text-small text-muted">
              No diagnosis or hypothesis evolution is available for review.
            </div>
          )
        }
      />
    </div>
  );
}
