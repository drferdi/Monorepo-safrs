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

import type {
  TrajectoryVitalTrendPoint,
  TrajectoryVisualizationViewModel,
} from '@/lib/iskandar-diagnosis-engine/trajectory-visualization-view-model';

type VitalKey = keyof Pick<
  TrajectoryVitalTrendPoint,
  'spo2' | 'pulse' | 'respiratoryRate' | 'temperature' | 'systolic' | 'diastolic'
>;

type VitalSeries = {
  key: VitalKey;
  label: string;
  stroke: string;
};

const VITAL_SERIES_META: VitalSeries[] = [
  { key: 'spo2', label: 'SpO2', stroke: TRAJECTORY_CHART_PALETTE.info },
  { key: 'pulse', label: 'Nadi', stroke: TRAJECTORY_CHART_PALETTE.high },
  {
    key: 'respiratoryRate',
    label: 'Laju napas',
    stroke: TRAJECTORY_CHART_PALETTE.warning,
  },
  { key: 'temperature', label: 'Suhu', stroke: TRAJECTORY_CHART_PALETTE.warning },
  {
    key: 'systolic',
    label: 'Tekanan darah sistolik',
    stroke: TRAJECTORY_CHART_PALETTE.high,
  },
  {
    key: 'diastolic',
    label: 'Tekanan darah diastolik',
    stroke: TRAJECTORY_CHART_PALETTE.stable,
  },
];

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
        title="Vital Signs Trend"
        chart={
          hasPoints && selectedSeries.length > 0 ? (
            <div className="space-y-3">
              <div className="flex flex-wrap gap-2">
                {selectedSeries.map((series) => (
                  <span
                    key={series.key}
                    className="ct-neu-chip ct-neu-chip--muted"
                    data-testid={`vital-series-${series.key}`}
                  >
                    {series.label}
                  </span>
                ))}
              </div>
              <div className="h-56 w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart
                    data={viewModel.vitalTrends}
                    margin={{ top: 8, right: 8, left: 0, bottom: 8 }}
                  >
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
                      tick={{ fill: TRAJECTORY_CHART_PALETTE.textMuted, fontSize: 10 }}
                      axisLine={false}
                      tickLine={false}
                      width={48}
                    />
                    <Tooltip
                      content={({ active, payload }) => {
                        if (!active || !payload?.length) return null;
                        const point = payload[0]?.payload as
                          | TrajectoryVisualizationViewModel['vitalTrends'][number]
                          | undefined;
                        if (!point) return null;

                        return (
                          <div className="neu-card-inset min-w-44 p-3">
                            <div className="ttv-label text-tertiary">{point.visitLabel}</div>
                            <div className="mt-1 text-tiny text-muted">
                              {formatChartDate(point.date)}
                            </div>
                          </div>
                        );
                      }}
                    />
                    {selectedSeries.map((series) => (
                      <Line
                        key={series.key}
                        type="monotone"
                        dataKey={series.key}
                        stroke={series.stroke}
                        strokeWidth={2.5}
                        connectNulls={false}
                        dot={{
                          r: 3.5,
                          stroke: TRAJECTORY_CHART_PALETTE.dotStroke,
                          strokeWidth: 1.5,
                        }}
                        activeDot={{
                          r: 5,
                          stroke: TRAJECTORY_CHART_PALETTE.dotStroke,
                          strokeWidth: 2,
                        }}
                      />
                    ))}
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </div>
          ) : (
            <TrajectoryEmptyState
              title="Vital signs unavailable"
              message="No objective vital trajectory is available for chart review."
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
