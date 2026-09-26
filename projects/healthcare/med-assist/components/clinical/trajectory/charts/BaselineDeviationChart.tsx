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
  DEVIATION_META,
  TRAJECTORY_CHART_PALETTE,
  MetaPill,
  TrajectoryChartSection,
  TrajectoryEmptyState,
  formatValue,
} from './chart-shared';

type BaselineDeviationChartProps = {
  viewModel: Pick<
    TrajectoryVisualizationViewModel,
    'baselineDeviation' | 'baselineAvailability' | 'dataQualityWarnings'
  >;
  className?: string;
};

function BaselineTooltip({ active, payload }: TooltipContentProps) {
  if (!active || !payload?.length) return null;

  const point = payload[0]?.payload as
    BaselineDeviationChartProps['viewModel']['baselineDeviation'][number] | undefined;
  if (!point) return null;

  const tone = DEVIATION_META[point.deviationLabel];

  return (
    <div className="neu-card-inset min-w-52 p-3">
      <div className="ttv-label text-tertiary">{point.parameter}</div>
      <div className="mt-1 text-small text-platinum">
        Baseline {formatValue(point.baseline)} | Saat ini {formatValue(point.current)}
      </div>
      <div className="mt-1 text-tiny" style={{ color: tone.color }}>
        {tone.label}
      </div>
      <div className="mt-2 text-[11px] leading-relaxed text-muted">{point.clinicalMeaning}</div>
    </div>
  );
}

export function BaselineDeviationChart({ viewModel, className }: BaselineDeviationChartProps) {
  if (!viewModel.baselineAvailability.available) {
    return (
      <TrajectoryChartSection
        title="Baseline Personal vs Kondisi Saat Ini"
        subtitle="Perbandingan baseline personal hanya ditampilkan bila riwayat cukup untuk pembacaan yang aman."
        className={className}
      >
        <TrajectoryEmptyState
          title="Baseline personal belum tersedia"
          message={
            viewModel.baselineAvailability.message ||
            'Riwayat kunjungan belum cukup untuk membentuk baseline personal yang aman.'
          }
        />
      </TrajectoryChartSection>
    );
  }

  const completeRows = viewModel.baselineDeviation.filter(
    (item) => item.baseline !== undefined && item.current !== undefined
  );

  if (completeRows.length === 0) {
    return (
      <TrajectoryChartSection
        title="Baseline Personal vs Kondisi Saat Ini"
        subtitle="Perbandingan baseline personal hanya ditampilkan bila riwayat cukup untuk pembacaan yang aman."
        className={className}
      >
        <TrajectoryEmptyState
          title="Belum ada pasangan data lengkap"
          message="Baseline tersedia, tetapi belum ada pasangan baseline dan nilai saat ini yang lengkap untuk divisualisasikan."
        />
      </TrajectoryChartSection>
    );
  }

  return (
    <TrajectoryChartSection
      title="Baseline Personal vs Kondisi Saat Ini"
      subtitle="Membandingkan baseline personal dengan kondisi saat ini tanpa mengisi nilai yang belum tersedia."
      className={className}
    >
      <div className="h-80 w-full">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={completeRows} margin={{ top: 8, right: 16, left: 8, bottom: 8 }}>
            <CartesianGrid stroke={TRAJECTORY_CHART_PALETTE.surfaceLine} strokeDasharray="3 3" />
            <XAxis
              dataKey="parameter"
              tick={{ fill: TRAJECTORY_CHART_PALETTE.textMuted, fontSize: 10 }}
              axisLine={{ stroke: TRAJECTORY_CHART_PALETTE.surfaceLine }}
              tickLine={false}
              interval={0}
              angle={-10}
              textAnchor="end"
              height={64}
            />
            <YAxis
              tick={{ fill: TRAJECTORY_CHART_PALETTE.textMuted, fontSize: 10 }}
              axisLine={false}
              tickLine={false}
              width={48}
            />
            <Tooltip content={BaselineTooltip} />
            <Bar
              dataKey="baseline"
              name="Baseline"
              fill={TRAJECTORY_CHART_PALETTE.baseline}
              radius={[0, 0, 0, 0]}
            />
            <Bar
              dataKey="current"
              name="Saat ini"
              fill={TRAJECTORY_CHART_PALETTE.current}
              radius={[0, 0, 0, 0]}
            />
          </BarChart>
        </ResponsiveContainer>
      </div>

      <div className="mt-3 grid gap-2 md:grid-cols-2">
        {viewModel.baselineDeviation.map((item) => {
          const tone = DEVIATION_META[item.deviationLabel];
          return (
            <div key={item.parameter} className="neu-card-inset p-3">
              <div className="mb-2 flex flex-wrap items-start justify-between gap-2">
                <div>
                  <div className="ttv-label text-tertiary">{item.parameter}</div>
                  <div className="text-small text-platinum">
                    {item.baseline !== undefined && item.current !== undefined
                      ? `${formatValue(item.baseline)} -> ${formatValue(item.current)}`
                      : 'Data pasangan belum lengkap'}
                  </div>
                </div>
                <MetaPill
                  label={tone.label}
                  color={tone.color}
                  border={tone.border}
                  background={tone.bg}
                />
              </div>
              <div className="text-[11px] leading-relaxed text-muted">{item.clinicalMeaning}</div>
            </div>
          );
        })}
      </div>
    </TrajectoryChartSection>
  );
}
