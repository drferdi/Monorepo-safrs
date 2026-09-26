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

import { TRAJECTORY_CHART_PALETTE, MetaPill, TrajectoryChartSection } from './chart-shared';

type MortalityProxyChartProps = {
  viewModel: Pick<TrajectoryVisualizationViewModel, 'mortalityProxy'>;
  className?: string;
};

const TIER_META: Record<
  MortalityProxyChartProps['viewModel']['mortalityProxy']['tier'],
  { label: string; color: string; border: string; bg: string }
> = {
  low: {
    label: 'Low',
    color: TRAJECTORY_CHART_PALETTE.stable,
    border: 'var(--sentra-safe-border)',
    bg: 'var(--sentra-safe-bg)',
  },
  moderate: {
    label: 'Moderate',
    color: TRAJECTORY_CHART_PALETTE.warning,
    border: 'var(--sentra-warning-border)',
    bg: 'var(--sentra-warning-bg)',
  },
  high: {
    label: 'High',
    color: TRAJECTORY_CHART_PALETTE.high,
    border: 'var(--sentra-danger-border)',
    bg: 'var(--sentra-danger-bg)',
  },
  very_high: {
    label: 'Very high',
    color: TRAJECTORY_CHART_PALETTE.critical,
    border: 'var(--sentra-danger-strong-border)',
    bg: 'var(--sentra-danger-strong-bg)',
  },
};

const URGENCY_LABEL: Record<
  MortalityProxyChartProps['viewModel']['mortalityProxy']['clinicalUrgencyTier'],
  string
> = {
  low: 'Low',
  moderate: 'Moderate',
  high: 'High',
  immediate: 'Immediate',
};

function MortalityProxyTooltip({ active, payload }: TooltipContentProps) {
  if (!active || !payload?.length) return null;

  const point = payload[0]?.payload as { score: number; tier: string } | undefined;
  if (!point) return null;

  return (
    <div className="neu-card-inset min-w-44 p-3">
      <div className="ttv-label text-tertiary">Mortality proxy</div>
      <div className="mt-1 text-small text-platinum">{point.score.toFixed(0)} / 100</div>
      <div className="mt-1 text-tiny text-muted">Tier: {point.tier}</div>
    </div>
  );
}

export function MortalityProxyChart({ viewModel, className }: MortalityProxyChartProps) {
  const proxy = viewModel.mortalityProxy;
  const score = Math.max(0, Math.min(100, proxy.score));
  const tone = TIER_META[proxy.tier];
  const chartData = [
    {
      metric: 'Score',
      score,
      tier: tone.label,
    },
  ];

  return (
    <TrajectoryChartSection
      title="Mortality proxy"
      subtitle="Visualisasi output mortality_proxy dari model trajectory fisiologis."
      className={className}
    >
      <div className="grid gap-3 md:grid-cols-[minmax(0,1fr)_220px]">
        <div className="h-44 w-full" data-testid="mortality-proxy-chart">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart
              data={chartData}
              layout="vertical"
              margin={{ top: 8, right: 16, left: 8, bottom: 8 }}
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
                dataKey="metric"
                tick={{ fill: TRAJECTORY_CHART_PALETTE.textMuted, fontSize: 11 }}
                axisLine={false}
                tickLine={false}
                width={48}
              />
              <Tooltip content={MortalityProxyTooltip} />
              <Bar dataKey="score" fill={tone.color} radius={[0, 0, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>

        <div className="grid gap-2">
          <div className="neu-card-inset p-3">
            <div className="ttv-label text-tertiary">Proxy score</div>
            <div className="mt-1 text-xl font-semibold text-platinum">{score.toFixed(0)} / 100</div>
          </div>
          <div className="neu-card-inset p-3">
            <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
              <div className="ttv-label text-tertiary">Tier</div>
              <MetaPill
                label={tone.label}
                color={tone.color}
                border={tone.border}
                background={tone.bg}
              />
            </div>
            <div className="text-small text-muted">
              Clinical urgency: {URGENCY_LABEL[proxy.clinicalUrgencyTier]}
            </div>
          </div>
        </div>
      </div>
    </TrajectoryChartSection>
  );
}
