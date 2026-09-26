import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';

import {
  TRAJECTORY_CHART_PALETTE,
  TrajectoryEmptyState,
  TrajectoryResultTimeline,
  TrajectorySimplePanel,
  formatChartDate,
} from '../charts/chart-shared';

import type {
  TrajectoryVisualizationViewModel,
  VisitToVisitDeltaRow,
} from '@/lib/iskandar-diagnosis-engine/trajectory-visualization-view-model';

function deltaLabel(label: string, value: number | undefined): string | null {
  if (value === undefined || value === 0) return null;
  const direction = value > 0 ? '+' : '-';
  return `${label} ${direction}${Math.abs(value)}`;
}

function deltaLabelWithUnit(label: string, value: number | undefined, unit: string): string | null {
  const formatted = deltaLabel(label, value);
  return formatted ? `${formatted} ${unit}` : null;
}

function concreteChanges(item: VisitToVisitDeltaRow): string[] {
  return [
    deltaLabelWithUnit('SpO2', item.vitalChanges.spo2Delta, '%'),
    deltaLabelWithUnit('Nadi', item.vitalChanges.heartRateDelta, 'bpm'),
    deltaLabelWithUnit('Laju napas', item.vitalChanges.respiratoryRateDelta, '/min'),
    deltaLabelWithUnit('Suhu', item.vitalChanges.temperatureDelta, 'C'),
    deltaLabelWithUnit('Sistolik', item.vitalChanges.systolicBpDelta, 'mmHg'),
    deltaLabelWithUnit('Diastolik', item.vitalChanges.diastolicBpDelta, 'mmHg'),
    deltaLabelWithUnit('Glukosa', item.vitalChanges.glucoseDelta, 'mg/dL'),
  ].filter((value): value is string => Boolean(value));
}

export function TrajectoryVisitDeltaPanel({
  viewModel,
}: {
  viewModel: TrajectoryVisualizationViewModel;
}) {
  const rows = viewModel.visitToVisitDelta ?? [];
  const chartRows = rows.map((item) => ({
    label: `${item.fromVisitLabel} -> ${item.toVisitLabel}`,
    changeCount: concreteChanges(item).length,
    summary: item.summary,
  }));

  return (
    <div data-testid="trajectory-visit-delta-panel">
      <TrajectorySimplePanel
        title="Visit-to-Visit Delta"
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
                    dataKey="label"
                    tick={{ fill: TRAJECTORY_CHART_PALETTE.textMuted, fontSize: 10 }}
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
                          <div className="ttv-label text-tertiary">{point.label}</div>
                          <div className="text-small text-platinum">{point.changeCount} delta</div>
                          <div className="mt-1 text-tiny text-muted">{point.summary}</div>
                        </div>
                      );
                    }}
                  />
                  <Bar
                    dataKey="changeCount"
                    fill={TRAJECTORY_CHART_PALETTE.warning}
                    radius={[6, 6, 0, 0]}
                  />
                </BarChart>
              </ResponsiveContainer>
            </div>
          ) : (
            <TrajectoryEmptyState
              title="Visit deltas unavailable"
              message="At least two visits are needed to render consecutive delta summaries."
            />
          )
        }
        result={
          rows.length > 0 ? (
            <TrajectoryResultTimeline
              items={rows.map((item) => {
                const changes = concreteChanges(item);
                return {
                  id: `${item.fromVisitLabel}-${item.toVisitLabel}`,
                  eyebrow: `${item.fromVisitLabel} to ${item.toVisitLabel}`,
                  title: item.summary,
                  meta: `${formatChartDate(item.fromDate)} to ${formatChartDate(item.toDate)}`,
                  detail:
                    changes.join(' · ') ||
                    'No concrete vital sign delta recorded for this interval.',
                };
              })}
            />
          ) : (
            <div className="text-small text-muted">
              At least two visits are needed to render consecutive delta summaries.
            </div>
          )
        }
      />
    </div>
  );
}
