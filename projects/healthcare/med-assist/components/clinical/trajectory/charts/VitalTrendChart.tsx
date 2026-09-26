import {
  CartesianGrid,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';

import type {
  TrajectoryVitalTrendPoint,
  TrajectoryVisualizationViewModel,
} from '@/lib/iskandar-diagnosis-engine/trajectory-visualization-view-model';

import {
  TRAJECTORY_CHART_PALETTE,
  TrajectoryChartSection,
  TrajectoryEmptyState,
  WarningPills,
  formatChartDate,
  formatValue,
} from './chart-shared';

type VitalTrendChartProps = {
  viewModel: Pick<TrajectoryVisualizationViewModel, 'vitalTrends' | 'vitalTrendMeta'>;
  className?: string;
};

type VitalKey = keyof Pick<
  TrajectoryVitalTrendPoint,
  'spo2' | 'pulse' | 'respiratoryRate' | 'temperature' | 'systolic' | 'diastolic'
>;

type VitalSeriesMeta = {
  key: VitalKey;
  label: string;
  unit: string;
  stroke: string;
  emptyMessage: string;
  isActualValue: (value: number | undefined) => boolean;
};

const VITAL_SERIES: VitalSeriesMeta[] = [
  {
    key: 'spo2',
    label: 'SpO2',
    unit: '%',
    stroke: TRAJECTORY_CHART_PALETTE.info,
    emptyMessage: 'Data SpO2 belum cukup untuk divisualisasikan.',
    isActualValue: (value) =>
      typeof value === 'number' && Number.isFinite(value) && value >= 50 && value <= 100,
  },
  {
    key: 'pulse',
    label: 'Nadi',
    unit: ' bpm',
    stroke: TRAJECTORY_CHART_PALETTE.stable,
    emptyMessage: 'Data nadi belum cukup untuk divisualisasikan.',
    isActualValue: (value) =>
      typeof value === 'number' && Number.isFinite(value) && value >= 20 && value <= 250,
  },
  {
    key: 'respiratoryRate',
    label: 'Laju napas',
    unit: ' /menit',
    stroke: TRAJECTORY_CHART_PALETTE.warning,
    emptyMessage: 'Data laju napas belum cukup untuk divisualisasikan.',
    isActualValue: (value) =>
      typeof value === 'number' && Number.isFinite(value) && value >= 5 && value <= 80,
  },
  {
    key: 'temperature',
    label: 'Suhu',
    unit: ' °C',
    stroke: TRAJECTORY_CHART_PALETTE.warning,
    emptyMessage: 'Data suhu belum cukup untuk divisualisasikan.',
    isActualValue: (value) =>
      typeof value === 'number' && Number.isFinite(value) && value >= 30 && value <= 45,
  },
  {
    key: 'systolic',
    label: 'Tekanan darah sistolik',
    unit: ' mmHg',
    stroke: TRAJECTORY_CHART_PALETTE.high,
    emptyMessage: 'Data sistolik belum cukup untuk divisualisasikan.',
    isActualValue: (value) =>
      typeof value === 'number' && Number.isFinite(value) && value >= 40 && value <= 300,
  },
  {
    key: 'diastolic',
    label: 'Tekanan darah diastolik',
    unit: ' mmHg',
    stroke: TRAJECTORY_CHART_PALETTE.high,
    emptyMessage: 'Data diastolik belum cukup untuk divisualisasikan.',
    isActualValue: (value) =>
      typeof value === 'number' && Number.isFinite(value) && value >= 20 && value <= 200,
  },
];

function pickSelectedVitals(viewModel: VitalTrendChartProps['viewModel']): VitalSeriesMeta[] {
  const available = VITAL_SERIES.filter((series) =>
    viewModel.vitalTrends.some((point) => point[series.key] !== undefined)
  );

  const prioritized = available.filter((series) =>
    viewModel.vitalTrendMeta.primaryVitalDrivers.includes(series.label)
  );

  return (prioritized.length > 0 ? prioritized : available).slice(0, 3);
}

function buildSeriesRows(
  points: TrajectoryVisualizationViewModel['vitalTrends'],
  series: VitalSeriesMeta
): Array<TrajectoryVitalTrendPoint & { label: string; unit: string; value?: number }> {
  return points.map((point) => ({
    ...point,
    label: series.label,
    unit: series.unit,
    value: series.isActualValue(point[series.key]) ? point[series.key] : undefined,
  }));
}

export function VitalTrendChart({ viewModel, className }: VitalTrendChartProps) {
  const selectedSeries = pickSelectedVitals(viewModel);

  return (
    <TrajectoryChartSection
      title="Tren Vital Prioritas"
      subtitle="Menyoroti hingga tiga parameter vital yang paling relevan untuk membaca perubahan pola saat ini."
      className={className}
    >
      <WarningPills
        title="Data yang perlu diperiksa"
        items={viewModel.vitalTrendMeta.missingVitalWarnings}
      />

      {selectedSeries.length === 0 ? (
        <TrajectoryEmptyState
          title="Belum ada tren prioritas"
          message="Belum ada data vital prioritas yang cukup untuk divisualisasikan dengan aman."
        />
      ) : (
        <div className="grid gap-3">
          {selectedSeries.map((series) => {
            const rows = buildSeriesRows(viewModel.vitalTrends, series);
            const validValues = rows.filter((row) => row.value !== undefined);
            const latest = validValues.at(-1)?.value;
            const isRenderable = validValues.length >= 2;

            return (
              <div
                key={series.key}
                className="neu-card-inset p-3 md:p-4"
                data-testid={`vital-series-${series.key}`}
              >
                <div className="mb-2 flex items-center justify-between gap-3">
                  <div>
                    <div className="ttv-label text-tertiary">{series.label}</div>
                    <div className="text-small text-platinum">
                      {isRenderable ? formatValue(latest, series.unit) : 'Tidak tersedia'}
                    </div>
                  </div>
                  {isRenderable ? (
                    <span className="ct-neu-chip ct-neu-chip--muted">{series.unit.trim()}</span>
                  ) : null}
                </div>
                {isRenderable ? (
                  <div className="h-44 w-full">
                    <ResponsiveContainer width="100%" height="100%">
                      <LineChart data={rows} margin={{ top: 8, right: 8, left: 0, bottom: 8 }}>
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
                            const point = payload[0]?.payload as (typeof rows)[number] | undefined;
                            if (!point) return null;

                            return (
                              <div className="neu-card-inset min-w-44 p-3">
                                <div className="ttv-label text-tertiary">{point.visitLabel}</div>
                                <div className="text-small text-platinum">{series.label}</div>
                                <div className="mt-1 text-tiny text-muted">
                                  {formatChartDate(point.date)}
                                </div>
                                <div className="mt-2 text-small text-platinum">
                                  {formatValue(point.value, series.unit)}
                                </div>
                              </div>
                            );
                          }}
                        />
                        <Line
                          type="monotone"
                          dataKey="value"
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
                      </LineChart>
                    </ResponsiveContainer>
                  </div>
                ) : (
                  <div
                    className="neu-card-inset px-3 py-3 text-small text-muted leading-relaxed"
                    data-testid={`vital-series-empty-${series.key}`}
                  >
                    {series.emptyMessage}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </TrajectoryChartSection>
  );
}
