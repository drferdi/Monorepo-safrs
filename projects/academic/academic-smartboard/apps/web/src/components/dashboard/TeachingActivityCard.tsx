"use client";

import {
  Bar,
  BarChart,
  CartesianGrid,
  Legend,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { fmtDate, fmtDateShort } from "../../lib/labels.ts";
import { VizCardShell } from "./VizCardShell.tsx";

interface TeachingActivityCardProps {
  data?: {
    series?: Array<{ date: string; done?: number; canceled?: number }>;
    sessions_week?: number;
    done_week?: number;
    canceled_week?: number;
  };
  loading?: boolean;
  error?: string;
  onRetry?: () => void;
}

export function TeachingActivityCard({
  data,
  loading = false,
  error = "",
  onRetry,
}: TeachingActivityCardProps) {
  const series = data?.series || [];
  const empty =
    !loading && !error && (!series.length || (data?.sessions_week || 0) === 0);

  return (
    <VizCardShell
      title="Pola Belajar Siswa (Akademik)"
      subtitle="7 hari terakhir"
      href="/sesi"
      loading={loading}
      error={error}
      onRetry={onRetry}
      empty={empty}
      emptyMessage="Belum ada sesi dalam 7 hari terakhir."
      testId="card-teaching-activity"
    >
      <div className="grid grid-cols-3 gap-(--space-3)">
        <Metric label="Total sesi" value={data?.sessions_week ?? 0} />
        <Metric label="Selesai" value={data?.done_week ?? 0} />
        <Metric label="Dibatalkan" value={data?.canceled_week ?? 0} />
      </div>
      <div className="h-48">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={series}>
            <CartesianGrid
              stroke="var(--color-border-subtle, #e5e5e5)"
              vertical={false}
            />
            <XAxis
              dataKey="date"
              tickFormatter={(v: string) => fmtDateShort(v)}
            />
            <YAxis allowDecimals={false} />
            <Tooltip labelFormatter={(v) => fmtDate(String(v))} />
            <Legend />
            <Bar
              dataKey="done"
              name="Selesai"
              fill="var(--color-status-success, #0f766e)"
              isAnimationActive={false}
            />
            <Bar
              dataKey="canceled"
              name="Batal"
              fill="var(--color-status-critical, #b91c1c)"
              isAnimationActive={false}
            />
          </BarChart>
        </ResponsiveContainer>
      </div>
    </VizCardShell>
  );
}

function Metric({ label, value }: { label: string; value: number }) {
  return (
    <div>
      <div className="text-xs text-secondary">{label}</div>
      <div className="font-semibold text-primary">{value}</div>
    </div>
  );
}
