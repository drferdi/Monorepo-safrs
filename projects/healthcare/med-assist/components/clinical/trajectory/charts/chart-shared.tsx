import React from 'react';

import type {
  TrajectoryBaselineDeviation,
  TrajectoryDriverContribution,
  TrajectoryTimelineState,
} from '@/lib/iskandar-diagnosis-engine/trajectory-visualization-view-model';

export const TRAJECTORY_CHART_PALETTE = {
  stable: 'var(--sentra-safe)',
  info: 'var(--sentra-info)',
  mild: 'var(--sentra-info)',
  warning: 'var(--sentra-warning)',
  high: 'var(--sentra-danger)',
  critical: 'var(--sentra-danger-strong)',
  baseline: 'var(--sentra-info)',
  current: 'var(--sentra-warning)',
  surfaceLine: 'var(--neu-border-medium)',
  textMuted: 'var(--text-muted)',
  textMain: 'var(--text-main)',
  dotStroke: 'var(--sentra-bg)',
};

export const TRAJECTORY_STATE_META: Record<
  TrajectoryTimelineState,
  { value: number; label: string; color: string }
> = {
  stable: { value: 1, label: 'Stabil', color: TRAJECTORY_CHART_PALETTE.stable },
  mild_concern: {
    value: 2,
    label: 'Perlu perhatian ringan',
    color: TRAJECTORY_CHART_PALETTE.mild,
  },
  worsening: { value: 3, label: 'Memburuk', color: TRAJECTORY_CHART_PALETTE.warning },
  high_concern: { value: 4, label: 'Kekhawatiran tinggi', color: TRAJECTORY_CHART_PALETTE.high },
  critical_concern: {
    value: 5,
    label: 'Kekhawatiran kritis',
    color: TRAJECTORY_CHART_PALETTE.critical,
  },
};

export const DRIVER_SEVERITY_META: Record<
  TrajectoryDriverContribution['severity'],
  { label: string; color: string; border: string; bg: string }
> = {
  low: {
    label: 'Rendah',
    color: TRAJECTORY_CHART_PALETTE.stable,
    border: 'var(--sentra-safe-border)',
    bg: 'var(--sentra-safe-bg)',
  },
  moderate: {
    label: 'Sedang',
    color: TRAJECTORY_CHART_PALETTE.warning,
    border: 'var(--sentra-warning-border)',
    bg: 'var(--sentra-warning-bg)',
  },
  high: {
    label: 'Tinggi',
    color: TRAJECTORY_CHART_PALETTE.high,
    border: 'var(--sentra-danger-border)',
    bg: 'var(--sentra-danger-bg)',
  },
};

export const DEVIATION_META: Record<
  TrajectoryBaselineDeviation['deviationLabel'],
  { label: string; color: string; border: string; bg: string }
> = {
  within_baseline: {
    label: 'Dalam baseline',
    color: TRAJECTORY_CHART_PALETTE.stable,
    border: 'var(--sentra-safe-border)',
    bg: 'var(--sentra-safe-bg)',
  },
  mild_deviation: {
    label: 'Deviasi ringan',
    color: TRAJECTORY_CHART_PALETTE.warning,
    border: 'var(--sentra-warning-border)',
    bg: 'var(--sentra-warning-bg)',
  },
  significant_deviation: {
    label: 'Deviasi bermakna',
    color: TRAJECTORY_CHART_PALETTE.high,
    border: 'var(--sentra-danger-border)',
    bg: 'var(--sentra-danger-bg)',
  },
  unknown: {
    label: 'Belum cukup data',
    color: 'var(--text-muted)',
    border: 'var(--sentra-glass-border)',
    bg: 'var(--sentra-glass-bg)',
  },
};

export function cx(...values: Array<string | false | null | undefined>): string {
  return values.filter(Boolean).join(' ');
}

export function formatChartDate(value?: string): string {
  if (!value) return 'Tanggal tidak tersedia';
  const parsed = new Date(value);
  if (!Number.isFinite(parsed.getTime())) return value;
  return new Intl.DateTimeFormat('id-ID', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  }).format(parsed);
}

export function formatValue(value?: number, suffix = ''): string {
  if (value === undefined || !Number.isFinite(value)) return 'Tidak tersedia';
  if (Number.isInteger(value)) return `${value}${suffix}`;
  return `${value.toFixed(1)}${suffix}`;
}

export function TrajectoryChartSection({
  title,
  subtitle,
  className,
  actions,
  children,
}: {
  title: string;
  subtitle?: string;
  className?: string;
  actions?: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <section className={cx('ttv-section p-4 md:p-5', className)} data-testid={title}>
      <div className="mb-4 flex flex-wrap items-start justify-between gap-3">
        <div className="max-w-[60ch]">
          <h3 className="ttv-section-title">{title}</h3>
          {subtitle ? (
            <p className="mt-1.5 text-small leading-relaxed text-muted">{subtitle}</p>
          ) : null}
        </div>
        {actions ? <div className="flex flex-wrap items-center gap-2">{actions}</div> : null}
      </div>
      {children}
    </section>
  );
}

export function TrajectoryEmptyState({ title, message }: { title: string; message: string }) {
  return (
    <div className="neu-card-inset flex min-h-48 flex-col items-start justify-center gap-2 p-4">
      <div className="ttv-label text-tertiary">{title}</div>
      <div className="text-small text-platinum leading-relaxed">{message}</div>
    </div>
  );
}

export function WarningPills({ title, items }: { title: string; items: string[] }) {
  if (items.length === 0) return null;

  return (
    <div className="neu-card-inset mb-3 px-3 py-3">
      <div className="mb-1 text-tiny font-bold uppercase tracking-wide text-muted">{title}</div>
      <div className="flex flex-wrap gap-1">
        {items.map((item) => (
          <span key={item} className="ct-neu-chip ct-neu-chip--muted">
            {item}
          </span>
        ))}
      </div>
    </div>
  );
}

export function TrajectorySimplePanel({
  title,
  chart,
  result,
}: {
  title: string;
  chart: React.ReactNode;
  result: React.ReactNode;
}) {
  return (
    <section className="grid gap-4">
      <div
        className="neu-card-inset overflow-hidden p-4 md:p-5"
        data-testid="trajectory-simple-chart"
      >
        <div className="mb-3 flex items-center justify-between gap-3">
          <div>
            <div className="ttv-label text-tertiary">Chart</div>
            <h3 className="ttv-section-title">{title}</h3>
          </div>
        </div>
        {chart}
      </div>

      <div className="neu-card-inset p-4 md:p-5" data-testid="trajectory-simple-result">
        <div className="mb-3">
          <div className="ttv-label text-tertiary">Hasil</div>
        </div>
        {result}
      </div>
    </section>
  );
}

export function TrajectoryResultTimeline({
  items,
}: {
  items: Array<{
    id: string;
    eyebrow?: string;
    title: string;
    meta?: string;
    detail?: string;
    note?: string;
  }>;
}) {
  return (
    <div className="ct-v2-result-timeline" data-testid="trajectory-result-timeline">
      {items.map((item) => (
        <article key={item.id} className="ct-v2-result-entry" data-testid="trajectory-result-entry">
          <div className="ct-v2-result-entry__meta-block">
            {item.eyebrow ? (
              <div className="ct-v2-result-entry__eyebrow">{item.eyebrow}</div>
            ) : null}
            {item.meta ? <div className="ct-v2-result-entry__meta">{item.meta}</div> : null}
          </div>

          <div className="ct-v2-result-entry__body">
            <div className="ct-v2-result-entry__title">{item.title}</div>

            {item.detail ? <p className="ct-v2-result-entry__detail">{item.detail}</p> : null}

            {item.note ? <p className="ct-v2-result-entry__note">{item.note}</p> : null}
          </div>
        </article>
      ))}
    </div>
  );
}

export function MetaPill({
  label,
  color,
  border,
  background,
}: {
  label: string;
  color: string;
  border: string;
  background: string;
}) {
  return (
    <span
      className="ct-neu-chip"
      style={
        {
          '--ct-c': color,
          '--ct-bc': border,
          '--ct-bg': background,
        } as React.CSSProperties
      }
    >
      {label}
    </span>
  );
}
