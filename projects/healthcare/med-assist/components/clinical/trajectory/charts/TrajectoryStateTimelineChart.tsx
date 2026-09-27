import {
  CartesianGrid,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
  type TooltipContentProps,
} from 'recharts';

import type { TrajectoryVisualizationViewModel } from '@/lib/iskandar-diagnosis-engine/trajectory-visualization-view-model';

import {
  TRAJECTORY_CHART_PALETTE,
  TRAJECTORY_STATE_META,
  TrajectoryChartSection,
  cx,
  formatChartDate,
} from './chart-shared';

type TrajectoryStateTimelineChartProps = {
  viewModel: Pick<TrajectoryVisualizationViewModel, 'trajectoryTimeline'>;
  className?: string;
  compact?: boolean;
};

type TimelineRow = {
  visitLabel: string;
  date?: string;
  stateValue: number;
  stateLabel: string;
  displayLabel: string;
  score?: number;
  stroke: string;
  compactLabel: string;
};

function TimelineDot({ cx, cy, payload }: { cx?: number; cy?: number; payload?: TimelineRow }) {
  if (cx === undefined || cy === undefined || !payload) {
    return <g />;
  }

  return (
    <circle
      cx={cx}
      cy={cy}
      r={5}
      fill={payload.stroke}
      stroke={TRAJECTORY_CHART_PALETTE.dotStroke}
      strokeWidth={2}
    />
  );
}

function TimelineTooltip({ active, payload }: TooltipContentProps) {
  if (!active || !payload?.length) return null;

  const point = payload[0]?.payload as TimelineRow | undefined;
  if (!point) return null;

  return (
    <div className="neu-card-inset min-w-44 p-3">
      <div className="ttv-label text-tertiary">{point.visitLabel}</div>
      <div className="text-small text-platinum">{point.displayLabel}</div>
      <div className="mt-1 text-tiny text-muted">{formatChartDate(point.date)}</div>
      {point.score !== undefined ? (
        <div className="mt-2 text-tiny text-muted">Skor konteks: {point.score.toFixed(1)}</div>
      ) : null}
    </div>
  );
}

export function TrajectoryStateTimelineChart({
  viewModel,
  className,
  compact = false,
}: TrajectoryStateTimelineChartProps) {
  const chartData: TimelineRow[] = viewModel.trajectoryTimeline.map((point) => ({
    visitLabel: point.visitLabel,
    date: point.date,
    stateValue: TRAJECTORY_STATE_META[point.state].value,
    stateLabel: TRAJECTORY_STATE_META[point.state].label,
    displayLabel: point.displayLabel,
    score: point.score,
    stroke: TRAJECTORY_STATE_META[point.state].color,
    compactLabel: point.date?.slice(5) ?? point.visitLabel.replace('Kunjungan ', 'K'),
  }));

  if (compact) {
    const chartWidth = 420;
    const chartHeight = 196;
    const left = 28;
    const right = 28;
    const top = 18;
    const bottom = 34;
    const trackWidth = chartWidth - left - right;
    const trackHeight = chartHeight - top - bottom;
    const states = [
      { y: top + trackHeight, label: 'Rendah', color: TRAJECTORY_CHART_PALETTE.stable },
      { y: top + trackHeight * 0.66, label: 'Pantau', color: TRAJECTORY_CHART_PALETTE.info },
      { y: top + trackHeight * 0.33, label: 'Perhatian', color: TRAJECTORY_CHART_PALETTE.warning },
      { y: top, label: 'Mendesak', color: TRAJECTORY_CHART_PALETTE.high },
    ];
    const points = chartData.map((point, index) => {
      const x =
        left +
        (chartData.length === 1 ? trackWidth / 2 : (trackWidth * index) / (chartData.length - 1));
      const normalized = (point.stateValue - 1) / 4;
      const y = top + trackHeight - normalized * trackHeight;
      return { ...point, x, y };
    });
    const segments = points.slice(1).map((point, index) => ({
      from: points[index],
      to: point,
      isLatest: index === points.length - 2,
    }));
    const latestPoint = points.at(-1);

    return (
      <div
        className={cx('ct-v2-compact-chart-shell', className)}
        data-testid="compact-trajectory-mini-chart"
        data-clinical-lens-chart="compact"
      >
        <div className="h-[196px] w-full">
          <svg
            viewBox={`0 0 ${chartWidth} ${chartHeight}`}
            className="h-full w-full"
            role="img"
            aria-label="Trajectory clinical rail"
          >
            {states.map((state) => (
              <g key={state.label}>
                <line
                  className="ct-v2-compact-gridline"
                  x1={left}
                  y1={state.y}
                  x2={chartWidth - right}
                  y2={state.y}
                  stroke="var(--neu-border-medium)"
                  strokeDasharray="3 5"
                />
                <text className="ct-v2-compact-gridlabel" x={left} y={state.y - 6}>
                  {state.label}
                </text>
              </g>
            ))}

            {segments.map((segment, index) => (
              <g key={`${segment.from.visitLabel}:${segment.to.visitLabel}:${index}`}>
                {segment.isLatest ? (
                  <line
                    className="ct-v2-compact-segment__underlay"
                    x1={segment.from.x}
                    y1={segment.from.y}
                    x2={segment.to.x}
                    y2={segment.to.y}
                    stroke={segment.to.stroke}
                    strokeWidth="8"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                ) : null}
                <line
                  className={cx(
                    'ct-v2-compact-segment',
                    segment.isLatest && 'ct-v2-compact-segment--latest'
                  )}
                  data-clinical-lens-segment={segment.isLatest ? 'latest' : 'prior'}
                  x1={segment.from.x}
                  y1={segment.from.y}
                  x2={segment.to.x}
                  y2={segment.to.y}
                  stroke={segment.to.stroke}
                  strokeWidth="3"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </g>
            ))}

            {points.map((point, index) => {
              const isLatest = index === points.length - 1;
              return (
                <g
                  key={`${point.visitLabel}:${point.date ?? index}`}
                  className={cx('ct-v2-compact-point', isLatest && 'ct-v2-compact-point--latest')}
                  data-clinical-lens-point={isLatest ? 'latest' : 'prior'}
                >
                  {isLatest ? (
                    <circle
                      className="ct-v2-compact-point__halo"
                      cx={point.x}
                      cy={point.y}
                      r={13}
                      fill={point.stroke}
                    />
                  ) : null}
                  <circle
                    className="ct-v2-compact-point__core"
                    cx={point.x}
                    cy={point.y}
                    r={isLatest ? 6.5 : 5}
                    fill={point.stroke}
                    stroke="var(--sentra-bg)"
                    strokeWidth="2"
                  />
                  {isLatest ? (
                    <circle
                      className="ct-v2-compact-point__ring"
                      cx={point.x}
                      cy={point.y}
                      r={10}
                      fill="none"
                      stroke={point.stroke}
                      strokeOpacity="0.32"
                      strokeWidth="1.5"
                    />
                  ) : null}
                  <text
                    className="ct-v2-compact-point__label"
                    x={point.x}
                    y={chartHeight - 10}
                    textAnchor="middle"
                    fill="var(--text-muted)"
                    fontSize="10"
                  >
                    {point.compactLabel}
                  </text>
                </g>
              );
            })}

            {latestPoint ? (
              <text
                className="ct-v2-compact-latest-label"
                x={chartWidth - right}
                y={18}
                textAnchor="end"
              >
                {latestPoint.stateLabel}
              </text>
            ) : null}
          </svg>
        </div>
      </div>
    );
  }

  return (
    <TrajectoryChartSection
      title="Trajectory Antar Kunjungan"
      subtitle="Membaca arah perubahan antar kunjungan. Skor hanya ditampilkan sebagai konteks tambahan pada tooltip."
      className={className}
    >
      <div className="h-64 w-full">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={chartData} margin={{ top: 8, right: 16, left: 8, bottom: 8 }}>
            <CartesianGrid stroke={TRAJECTORY_CHART_PALETTE.surfaceLine} strokeDasharray="3 3" />
            <XAxis
              dataKey="visitLabel"
              tick={{ fill: TRAJECTORY_CHART_PALETTE.textMuted, fontSize: 11 }}
              axisLine={{ stroke: TRAJECTORY_CHART_PALETTE.surfaceLine }}
              tickLine={false}
            />
            <YAxis
              type="number"
              domain={[1, 5]}
              ticks={[1, 2, 3, 4, 5]}
              tickFormatter={(value) =>
                Object.values(TRAJECTORY_STATE_META).find((entry) => entry.value === value)
                  ?.label || ''
              }
              tick={{ fill: TRAJECTORY_CHART_PALETTE.textMuted, fontSize: 10 }}
              axisLine={false}
              tickLine={false}
              width={112}
            />
            <Tooltip content={TimelineTooltip} />
            <Line
              type="monotone"
              dataKey="stateValue"
              stroke={TRAJECTORY_CHART_PALETTE.warning}
              strokeWidth={2.5}
              dot={<TimelineDot />}
              activeDot={{ r: 6, stroke: TRAJECTORY_CHART_PALETTE.dotStroke, strokeWidth: 2 }}
            />
          </LineChart>
        </ResponsiveContainer>
      </div>

      <div className="mt-3 neu-card-inset p-3">
        <div className="ttv-label text-tertiary mb-2">Progression strip</div>
        <div className="flex flex-wrap gap-2">
          {chartData.map((point) => (
            <span
              key={point.visitLabel}
              className="ct-neu-chip"
              style={
                {
                  '--ct-c': point.stroke,
                  '--ct-bg': 'var(--sentra-glass-bg)',
                  '--ct-bc': point.stroke,
                } as React.CSSProperties
              }
            >
              {point.date?.slice(5) ?? point.visitLabel}: {point.stateLabel}
            </span>
          ))}
        </div>
        <div className="mt-3 text-small text-muted leading-relaxed">
          {chartData.map((point) => point.stateLabel).join(' -> ')}
        </div>
      </div>
    </TrajectoryChartSection>
  );
}
