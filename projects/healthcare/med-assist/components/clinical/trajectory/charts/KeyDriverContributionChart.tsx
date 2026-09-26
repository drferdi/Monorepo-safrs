import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
  type TooltipContentProps,
} from 'recharts';

import type { TrajectoryVisualizationViewModel } from '@/lib/iskandar-diagnosis-engine/trajectory-visualization-view-model';

import {
  DRIVER_SEVERITY_META,
  TRAJECTORY_CHART_PALETTE,
  MetaPill,
  TrajectoryChartSection,
  TrajectoryEmptyState,
} from './chart-shared';

type KeyDriverContributionChartProps = {
  viewModel: Pick<TrajectoryVisualizationViewModel, 'keyDriverContributions'>;
  className?: string;
};

function truncateLabel(value: string): string {
  return value.length > 28 ? `${value.slice(0, 25)}...` : value;
}

function DriverTooltip({ active, payload }: TooltipContentProps) {
  if (!active || !payload?.length) return null;

  const point = payload[0]?.payload as
    | KeyDriverContributionChartProps['viewModel']['keyDriverContributions'][number]
    | undefined;
  if (!point) return null;

  const tone = DRIVER_SEVERITY_META[point.severity];

  return (
    <div className="neu-card-inset max-w-64 p-3">
      <div className="ttv-label text-tertiary">{point.driver}</div>
      <div className="mt-1 text-small text-platinum">{point.contribution.toFixed(0)} poin</div>
      <div className="mt-1 text-tiny" style={{ color: tone.color }}>
        Severity: {tone.label}
      </div>
      <div className="mt-2 text-[11px] leading-relaxed text-muted">{point.explanation}</div>
    </div>
  );
}

export function KeyDriverContributionChart({
  viewModel,
  className,
}: KeyDriverContributionChartProps) {
  if (viewModel.keyDriverContributions.length === 0) {
    return (
      <TrajectoryChartSection
        title="Faktor Pendorong Trajectory"
        subtitle="Faktor yang paling membantu menjelaskan perubahan pola dari sisi fisiologis dan konteks klinis."
        className={className}
      >
        <TrajectoryEmptyState
          title="Belum ada driver"
          message="Belum ada driver yang cukup kuat untuk divisualisasikan."
        />
      </TrajectoryChartSection>
    );
  }

  return (
    <TrajectoryChartSection
      title="Faktor Pendorong Trajectory"
      subtitle="Grafik ini membantu menjelaskan perubahan pola tanpa membuka output engine mentah."
      className={className}
    >
      <div className="h-64 w-full">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart
            data={viewModel.keyDriverContributions}
            layout="vertical"
            margin={{ top: 8, right: 16, left: 16, bottom: 8 }}
          >
            <CartesianGrid stroke={TRAJECTORY_CHART_PALETTE.surfaceLine} strokeDasharray="3 3" />
            <XAxis
              type="number"
              domain={[0, 100]}
              tick={{ fill: TRAJECTORY_CHART_PALETTE.textMuted, fontSize: 11 }}
              axisLine={{ stroke: TRAJECTORY_CHART_PALETTE.surfaceLine }}
              tickLine={false}
            />
            <YAxis
              type="category"
              dataKey="driver"
              tickFormatter={truncateLabel}
              tick={{ fill: TRAJECTORY_CHART_PALETTE.textMuted, fontSize: 10 }}
              axisLine={false}
              tickLine={false}
              width={132}
            />
            <Tooltip content={DriverTooltip} />
            <Bar dataKey="contribution" radius={[0, 0, 0, 0]}>
              {viewModel.keyDriverContributions.map((item) => (
                <Cell key={item.driver} fill={DRIVER_SEVERITY_META[item.severity].color} />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>

      <div className="mt-3 grid gap-2">
        {viewModel.keyDriverContributions.map((item) => {
          const tone = DRIVER_SEVERITY_META[item.severity];
          return (
            <div key={item.driver} className="neu-card-inset p-3">
              <div className="mb-2 flex flex-wrap items-start justify-between gap-2">
                <div>
                  <div className="ttv-label text-tertiary">{item.driver}</div>
                  <div className="text-small text-platinum">{item.contribution.toFixed(0)} poin kontribusi</div>
                </div>
                <MetaPill
                  label={tone.label}
                  color={tone.color}
                  border={tone.border}
                  background={tone.bg}
                />
              </div>
              <div className="max-w-[36ch] text-[11px] leading-relaxed text-muted">
                {item.explanation}
              </div>
            </div>
          );
        })}
      </div>
    </TrajectoryChartSection>
  );
}
