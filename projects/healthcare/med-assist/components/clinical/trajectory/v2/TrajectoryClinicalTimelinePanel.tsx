import type { CSSProperties } from 'react';
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
  TRAJECTORY_STATE_META,
  TrajectoryEmptyState,
  TrajectorySimplePanel,
  formatChartDate,
} from '../charts/chart-shared';

import type { TrajectoryVisualizationViewModel } from '@/lib/iskandar-diagnosis-engine/trajectory-visualization-view-model';

function summarizeTherapySummary(value: string | undefined) {
  if (!value) {
    return null;
  }

  const items = value
    .split(/[,\n;]+/)
    .map((item) => item.trim())
    .filter(Boolean);

  if (items.length === 0) {
    return null;
  }

  if (items.length <= 2) {
    return {
      primary: items.join(', '),
      remainingCount: 0,
    };
  }

  return {
    primary: items.slice(0, 2).join(', '),
    remainingCount: items.length - 2,
  };
}

export function TrajectoryClinicalTimelinePanel({
  viewModel,
}: {
  viewModel: TrajectoryVisualizationViewModel;
}) {
  const timeline = viewModel.clinicalTimeline ?? [];
  const chartRows = viewModel.trajectoryTimeline.map((item) => ({
    visitLabel: item.visitLabel,
    date: item.date,
    stateValue: TRAJECTORY_STATE_META[item.state].value,
    displayLabel: item.displayLabel,
  }));

  return (
    <div data-testid="trajectory-clinical-timeline-panel">
      <TrajectorySimplePanel
        title="Patient Clinical Timeline"
        chart={
          chartRows.length > 0 ? (
            <div className="h-56 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={chartRows} margin={{ top: 8, right: 8, left: 0, bottom: 8 }}>
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
                    domain={[1, 5]}
                    ticks={[1, 2, 3, 4, 5]}
                    tick={{ fill: TRAJECTORY_CHART_PALETTE.textMuted, fontSize: 10 }}
                    axisLine={false}
                    tickLine={false}
                    width={36}
                  />
                  <Tooltip
                    content={({ active, payload }) => {
                      if (!active || !payload?.length) return null;
                      const point = payload[0]?.payload as (typeof chartRows)[number] | undefined;
                      if (!point) return null;

                      return (
                        <div className="neu-card-inset min-w-44 p-3">
                          <div className="ttv-label text-tertiary">{point.visitLabel}</div>
                          <div className="text-small text-platinum">{point.displayLabel}</div>
                          <div className="mt-1 text-tiny text-muted">
                            {formatChartDate(point.date)}
                          </div>
                        </div>
                      );
                    }}
                  />
                  <Line
                    type="monotone"
                    dataKey="stateValue"
                    stroke={TRAJECTORY_CHART_PALETTE.warning}
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
              title="Clinical timeline unavailable"
              message="No longitudinal clinical summary is available for review."
            />
          )
        }
        result={
          timeline.length > 0 ? (
            <div className="ct-v2-visit-timeline" data-testid="trajectory-result-timeline">
              {timeline.map((item, index) => (
                (() => {
                  const therapySummary = summarizeTherapySummary(item.therapySummary);

                  return (
                    <article
                      key={`${item.visitLabel}-${item.date}`}
                      className="ct-v2-visit-entry"
                      data-testid="trajectory-result-entry"
                      style={{ '--ct-visit-index': String(index) } as CSSProperties}
                    >
                      <div className="ct-v2-visit-entry__track">
                        <div className="ct-v2-visit-entry__meta">
                          <div className="ct-v2-visit-entry__visit">{item.visitLabel}</div>
                          <div className="ct-v2-visit-entry__when">
                            {formatChartDate(item.date)}
                          </div>
                        </div>

                        <div
                          className="ct-v2-visit-entry__rail"
                          data-testid="trajectory-visit-rail"
                          aria-hidden="true"
                        >
                          {index < timeline.length - 1 ? (
                            <span className="ct-v2-visit-entry__line" />
                          ) : null}
                        </div>
                      </div>

                      <div className="ct-v2-visit-entry__body">
                        <div className="ct-v2-visit-entry__facts">
                          <div className="ct-v2-visit-entry__fact">
                            <div className="ct-v2-visit-entry__fact-label">Keluhan</div>
                            <div className="ct-v2-visit-entry__fact-value">
                              {item.complaint || 'Tidak ada keluhan tercatat'}
                            </div>
                          </div>

                          <div className="ct-v2-visit-entry__fact">
                            <div className="ct-v2-visit-entry__fact-label">Diagnosis</div>
                            <div className="ct-v2-visit-entry__fact-value">
                              {item.diagnosisLabel || 'Belum ada diagnosis tercatat'}
                            </div>
                          </div>

                          <div className="ct-v2-visit-entry__fact">
                            <div className="ct-v2-visit-entry__fact-label">Terapi</div>
                            <div className="ct-v2-visit-entry__fact-value">
                              {therapySummary ? (
                                <>
                                  <span>{therapySummary.primary}</span>
                                  {therapySummary.remainingCount > 0 ? (
                                    <span className="ct-v2-visit-entry__fact-more">
                                      +{therapySummary.remainingCount} terapi
                                    </span>
                                  ) : null}
                                </>
                              ) : (
                                'Belum ada terapi tercatat'
                              )}
                            </div>
                          </div>
                        </div>
                      </div>
                    </article>
                  );
                })()
              ))}
            </div>
          ) : (
            <div className="text-small text-muted">
              No longitudinal clinical summary is available for review.
            </div>
          )
        }
      />
    </div>
  );
}
