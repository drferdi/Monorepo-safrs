import {
  Bar,
  BarChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
  type TooltipContentProps,
} from 'recharts';

import type { TrajectoryVisualizationViewModel } from '@/lib/iskandar-diagnosis-engine/trajectory-visualization-view-model';

import {
  TRAJECTORY_CHART_PALETTE,
  TrajectoryChartSection,
  TrajectoryEmptyState,
  formatValue,
} from './chart-shared';

type TimeToCriticalChartProps = {
  viewModel: Pick<TrajectoryVisualizationViewModel, 'timeToCritical'>;
  className?: string;
};

function truncateParameter(value: string): string {
  return value.length > 26 ? `${value.slice(0, 23)}...` : value;
}

function reliabilityLabel(value: boolean): string {
  return value ? 'Reliable' : 'Uncertain';
}

function TimeToCriticalTooltip({ active, payload }: TooltipContentProps) {
  if (!active || !payload?.length) return null;

  const point = payload[0]?.payload as
    TimeToCriticalChartProps['viewModel']['timeToCritical'][number] | undefined;
  if (!point) return null;

  return (
    <div className="neu-card-inset min-w-56 p-3">
      <div className="ttv-label text-tertiary">{point.parameter}</div>
      <div className="mt-1 text-small text-platinum">
        {point.hoursBestEstimate.toFixed(1)} jam ke critical
      </div>
      <div className="mt-1 text-tiny text-muted">
        Saat ini {formatValue(point.currentValue)} | Threshold{' '}
        {formatValue(point.criticalThreshold)}
      </div>
      {point.confidenceIntervalHours !== null ? (
        <div className="mt-1 text-tiny text-muted">
          CI: +/- {point.confidenceIntervalHours.toFixed(1)} jam
        </div>
      ) : null}
    </div>
  );
}

export function TimeToCriticalChart({ viewModel, className }: TimeToCriticalChartProps) {
  if (viewModel.timeToCritical.length === 0) {
    return (
      <TrajectoryChartSection
        title="Time to critical"
        subtitle="Estimasi time_to_critical hanya ditampilkan bila engine menghasilkan nilai finite."
        className={className}
      >
        <TrajectoryEmptyState
          title="Time to critical belum tersedia"
          message="Belum ada parameter dengan estimasi waktu critical yang cukup untuk divisualisasikan."
        />
      </TrajectoryChartSection>
    );
  }

  return (
    <TrajectoryChartSection
      title="Time to critical"
      subtitle="Visualisasi output time_to_critical per parameter dari model trajectory fisiologis."
      className={className}
    >
      <div className="h-64 w-full" data-testid="time-to-critical-chart">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart
            data={viewModel.timeToCritical}
            layout="vertical"
            margin={{ top: 8, right: 16, left: 16, bottom: 8 }}
          >
            <CartesianGrid stroke={TRAJECTORY_CHART_PALETTE.surfaceLine} strokeDasharray="3 3" />
            <XAxis
              type="number"
              tick={{ fill: TRAJECTORY_CHART_PALETTE.textMuted, fontSize: 11 }}
              axisLine={{ stroke: TRAJECTORY_CHART_PALETTE.surfaceLine }}
              tickLine={false}
              unit="h"
            />
            <YAxis
              type="category"
              dataKey="parameter"
              tickFormatter={truncateParameter}
              tick={{ fill: TRAJECTORY_CHART_PALETTE.textMuted, fontSize: 10 }}
              axisLine={false}
              tickLine={false}
              width={132}
            />
            <Tooltip content={TimeToCriticalTooltip} />
            <Bar
              dataKey="hoursBestEstimate"
              name="Jam"
              fill={TRAJECTORY_CHART_PALETTE.warning}
              radius={[0, 0, 0, 0]}
            />
          </BarChart>
        </ResponsiveContainer>
      </div>

      <div className="mt-3 grid gap-2 md:grid-cols-2">
        {viewModel.timeToCritical.map((item) => (
          <div key={item.parameter} className="neu-card-inset p-3">
            <div className="mb-2 flex flex-wrap items-start justify-between gap-2">
              <div>
                <div className="ttv-label text-tertiary">{item.parameter}</div>
                <div className="text-small text-platinum">
                  {item.hoursBestEstimate.toFixed(1)} jam
                </div>
              </div>
              <span className="ct-neu-chip ct-neu-chip--muted">
                {reliabilityLabel(item.isReliable)}
              </span>
            </div>
            <div className="text-[11px] leading-relaxed text-muted">
              Saat ini {formatValue(item.currentValue)} menuju threshold{' '}
              {formatValue(item.criticalThreshold)}
              {item.confidenceIntervalHours !== null
                ? `, CI +/- ${item.confidenceIntervalHours.toFixed(1)} jam`
                : ''}
            </div>
          </div>
        ))}
      </div>
    </TrajectoryChartSection>
  );
}
