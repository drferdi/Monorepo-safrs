"use client";

import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import { AppShell } from "../../../components/AppShell.tsx";
import { PageHead } from "../../../components/PageHead.tsx";
import { ProtectedRoute } from "../../../components/ProtectedRoute.tsx";
import { StatusBadge } from "../../../components/StatusBadge.tsx";
import { getEarningsSummary, listEarnings } from "../../../lib/api.ts";
import { rupiah } from "../../../lib/labels.ts";
import { earningRowStatus, sumEarningsSummary } from "../../../lib/payroll.ts";

function HonorView() {
  const [period, setPeriod] = useState(() =>
    new Date().toISOString().slice(0, 7),
  );

  const summaryQ = useQuery({
    queryKey: ["earnings-summary", period],
    queryFn: () => getEarningsSummary({ period }),
  });
  const detailsQ = useQuery({
    queryKey: ["earnings", period],
    queryFn: () => listEarnings({ period }),
  });

  const summary = summaryQ.data ?? [];
  const details = detailsQ.data ?? [];
  const kpi = sumEarningsSummary(summary);

  return (
    <div className="space-y-(--space-5)">
      <PageHead
        seq="KEU"
        eyebrow="Keuangan"
        title="Rekap Honor per Periode"
        lede="Honor hanya dihitung dari sesi yang telah terverifikasi."
        actions={
          <input
            type="month"
            value={period}
            onChange={(e) => setPeriod(e.target.value)}
            data-testid="input-period"
            className="min-h-(--target-min) rounded-control border border-line-subtle bg-canvas px-(--space-3) py-(--space-2)"
          />
        }
      />

      <div className="grid gap-(--space-3) sm:grid-cols-3">
        <div
          data-testid="kpi-total-payroll"
          className="rounded-control border border-line-subtle p-(--space-4)"
        >
          <p className="text-(length:--font-size-label) text-secondary">
            Total Payroll
          </p>
          <p className="text-(length:--font-size-title-section) font-semibold text-primary">
            {rupiah(kpi.totalPayroll)}
          </p>
        </div>
        <div className="rounded-control border border-line-subtle p-(--space-4)">
          <p className="text-(length:--font-size-label) text-secondary">
            Jumlah Sesi
          </p>
          <p className="text-(length:--font-size-title-section) font-semibold text-primary">
            {kpi.totalSessions}
          </p>
        </div>
        <div className="rounded-control border border-line-subtle p-(--space-4)">
          <p className="text-(length:--font-size-label) text-secondary">
            Jumlah Tentor
          </p>
          <p className="text-(length:--font-size-title-section) font-semibold text-primary">
            {kpi.tutorCount}
          </p>
        </div>
      </div>

      <section className="space-y-(--space-3)">
        <div className="flex flex-wrap items-baseline justify-between gap-(--space-2)">
          <h2 className="text-(length:--font-size-title-section) font-semibold text-primary">
            Ringkasan per Tentor
          </h2>
          <span className="text-(length:--font-size-label) text-secondary">
            Periode {period}
          </span>
        </div>
        <div className="overflow-x-auto rounded-control border border-line-subtle">
          <table className="min-w-full border-collapse text-(length:--font-size-body)">
            <thead>
              <tr className="border-b border-line-subtle bg-surface">
                <th className="px-(--space-3) py-(--space-2) text-left">
                  Nama Tentor
                </th>
                <th className="px-(--space-3) py-(--space-2) text-left">
                  Jumlah Sesi
                </th>
                <th className="px-(--space-3) py-(--space-2) text-left">
                  Tarif Dasar
                </th>
                <th className="px-(--space-3) py-(--space-2) text-left">
                  Insentif
                </th>
                <th className="px-(--space-3) py-(--space-2) text-left">
                  Transport
                </th>
                <th className="px-(--space-3) py-(--space-2) text-right">
                  Total Honor
                </th>
              </tr>
            </thead>
            <tbody>
              {summary.length === 0 ? (
                <tr>
                  <td
                    colSpan={6}
                    className="px-(--space-3) py-(--space-4) text-center text-secondary"
                  >
                    Belum ada honor untuk periode ini.
                  </td>
                </tr>
              ) : (
                summary.map((row) => (
                  <tr
                    key={row.tutor_id}
                    data-testid={`row-honor-${row.tutor_id}`}
                    className="border-b border-line-subtle"
                  >
                    <td className="px-(--space-3) py-(--space-2) font-medium text-primary">
                      {row.tutor_name}
                    </td>
                    <td className="px-(--space-3) py-(--space-2)">
                      {row.sessions}
                    </td>
                    <td className="px-(--space-3) py-(--space-2)">
                      {rupiah(row.base_amount)}
                    </td>
                    <td className="px-(--space-3) py-(--space-2)">
                      {rupiah(row.incentive)}
                    </td>
                    <td className="px-(--space-3) py-(--space-2)">
                      {rupiah(row.transport)}
                    </td>
                    <td className="px-(--space-3) py-(--space-2) text-right font-semibold">
                      {rupiah(row.total)}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </section>

      <section className="space-y-(--space-3)">
        <h2 className="text-(length:--font-size-title-section) font-semibold text-primary">
          Detail per Sesi
        </h2>
        <div className="overflow-x-auto rounded-control border border-line-subtle">
          <table className="min-w-full border-collapse text-(length:--font-size-body)">
            <thead>
              <tr className="border-b border-line-subtle bg-surface">
                <th className="px-(--space-3) py-(--space-2) text-left">
                  Sesi
                </th>
                <th className="px-(--space-3) py-(--space-2) text-left">
                  Periode
                </th>
                <th className="px-(--space-3) py-(--space-2) text-left">
                  Base
                </th>
                <th className="px-(--space-3) py-(--space-2) text-left">
                  Insentif
                </th>
                <th className="px-(--space-3) py-(--space-2) text-left">
                  Transport
                </th>
                <th className="px-(--space-3) py-(--space-2) text-left">
                  Total
                </th>
                <th className="px-(--space-3) py-(--space-2) text-left">
                  Status
                </th>
              </tr>
            </thead>
            <tbody>
              {details.length === 0 ? (
                <tr>
                  <td
                    colSpan={7}
                    className="px-(--space-3) py-(--space-4) text-center text-secondary"
                  >
                    Kosong.
                  </td>
                </tr>
              ) : (
                details.map((d) => {
                  const st = earningRowStatus(d);
                  return (
                    <tr
                      key={d.earning_id}
                      className="border-b border-line-subtle"
                    >
                      <td className="px-(--space-3) py-(--space-2)">
                        {d.session_id}
                      </td>
                      <td className="px-(--space-3) py-(--space-2)">
                        {d.period_month}
                      </td>
                      <td className="px-(--space-3) py-(--space-2)">
                        {rupiah(d.base_amount)}
                      </td>
                      <td className="px-(--space-3) py-(--space-2)">
                        {rupiah(d.incentive)}
                      </td>
                      <td className="px-(--space-3) py-(--space-2)">
                        {rupiah(d.transport)}
                      </td>
                      <td className="px-(--space-3) py-(--space-2) font-semibold">
                        {rupiah(d.total)}
                      </td>
                      <td className="px-(--space-3) py-(--space-2)">
                        <StatusBadge tone={st.tone}>{st.label}</StatusBadge>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}

export default function HonorPage() {
  return (
    <ProtectedRoute roles={["owner", "finance", "tentor"]}>
      <AppShell>
        <HonorView />
      </AppShell>
    </ProtectedRoute>
  );
}
