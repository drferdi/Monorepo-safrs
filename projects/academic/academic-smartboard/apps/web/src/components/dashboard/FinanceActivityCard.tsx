"use client";

import { useMemo } from "react";
import { Cell, Pie, PieChart, ResponsiveContainer, Tooltip } from "recharts";
import { rupiah } from "../../lib/labels.ts";
import { VizCardShell } from "./VizCardShell.tsx";

const COLORS = [
  "var(--color-data-1, #1d4ed8)",
  "var(--color-data-2, #0f766e)",
  "var(--color-data-3, #a16207)",
];

interface FinanceActivityCardProps {
  data?: {
    visible?: boolean;
    period?: string;
    est_payroll?: number;
    verified_sessions?: number;
    breakdown?: Array<{ name: string; value?: number }>;
    paid_total?: number;
    unpaid_total?: number;
  };
  loading?: boolean;
  error?: string;
  onRetry?: () => void;
}

export function FinanceActivityCard({
  data,
  loading = false,
  error = "",
  onRetry,
}: FinanceActivityCardProps) {
  const visible = data?.visible !== false;
  const breakdown = useMemo(
    () => (data?.breakdown || []).filter((b) => (b.value || 0) > 0),
    [data],
  );
  const empty =
    !loading &&
    !error &&
    visible &&
    (data?.est_payroll || 0) === 0 &&
    breakdown.length === 0;

  if (!loading && !error && data && !visible) {
    return (
      <VizCardShell
        title="Pola Keuangan (Payroll)"
        subtitle={data.period || "—"}
        empty
        emptyMessage="Ringkasan keuangan tidak ditampilkan untuk peran ini."
        onRetry={onRetry}
        testId="card-finance-activity"
      />
    );
  }

  const paid = Number(data?.paid_total) || 0;
  const unpaid = Number(data?.unpaid_total) || 0;
  const total = paid + unpaid;
  const paidPct = total > 0 ? Math.round((paid / total) * 100) : 0;

  return (
    <VizCardShell
      title="Pola Keuangan (Payroll)"
      subtitle={`Periode ${data?.period || "—"}`}
      href="/keuangan/honor"
      loading={loading}
      error={error}
      onRetry={onRetry}
      empty={empty}
      emptyMessage="Belum ada honor terverifikasi bulan ini."
      testId="card-finance-activity"
    >
      <div>
        <div className="text-xs text-secondary">Estimasi payroll</div>
        <div className="text-lg font-semibold text-primary">
          {rupiah(data?.est_payroll)}
        </div>
        <div className="mt-1 text-xs text-secondary">
          {data?.verified_sessions || 0} sesi terverifikasi
        </div>
      </div>

      <div className="grid gap-(--space-4) sm:grid-cols-2">
        <div className="h-40">
          {breakdown.length > 0 ? (
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={breakdown}
                  dataKey="value"
                  nameKey="name"
                  cx="50%"
                  cy="50%"
                  innerRadius={32}
                  outerRadius={52}
                  isAnimationActive={false}
                >
                  {breakdown.map((entry, i) => (
                    <Cell key={entry.name} fill={COLORS[i % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip formatter={(v) => rupiah(Number(v))} />
              </PieChart>
            </ResponsiveContainer>
          ) : null}
        </div>
        <div className="space-y-(--space-2)">
          {(data?.breakdown || []).map((b, i) => (
            <div
              key={b.name}
              className="flex justify-between gap-(--space-2) text-sm"
            >
              <span className="text-primary">
                <span
                  aria-hidden
                  className="mr-2 inline-block h-2 w-2 align-middle"
                  style={{ background: COLORS[i % COLORS.length] }}
                />
                {b.name}
              </span>
              <span className="font-medium">{rupiah(b.value)}</span>
            </div>
          ))}
          <div>
            <div className="mb-2 text-xs text-secondary">
              Dibayar {paidPct}%
            </div>
            <div
              className="h-2 overflow-hidden rounded-control bg-surface"
              role="progressbar"
              aria-label={`Honor dibayar ${paidPct} persen`}
              aria-valuenow={paidPct}
              aria-valuemin={0}
              aria-valuemax={100}
            >
              <i
                className="block h-full bg-accent"
                style={{ width: `${paidPct}%` }}
              />
            </div>
            <div className="mt-2 flex justify-between text-sm">
              <span>{rupiah(paid)}</span>
              <span className="text-secondary">{rupiah(unpaid)} belum</span>
            </div>
          </div>
        </div>
      </div>
    </VizCardShell>
  );
}
