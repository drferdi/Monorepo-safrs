"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { FileText, Lock, RefreshCw, X } from "lucide-react";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { AppShell } from "../../../components/AppShell.tsx";
import { PageHead } from "../../../components/PageHead.tsx";
import { ProtectedRoute } from "../../../components/ProtectedRoute.tsx";
import { StatusBadge } from "../../../components/StatusBadge.tsx";
import { Button } from "../../../components/ui/button.tsx";
import {
  createPayrollCorrection,
  generatePayrollPeriod,
  getApiBaseUrl,
  listPayrollItems,
  listPayrollPeriods,
  lockPayrollPeriod,
  type PayrollItem,
  type PayrollPeriod,
} from "../../../lib/api.ts";
import { rupiah } from "../../../lib/labels.ts";
import {
  buildSlipUrl,
  payrollStatusLabel,
  payrollStatusTone,
} from "../../../lib/payroll.ts";

function PayrollView() {
  const qc = useQueryClient();
  const [month, setMonth] = useState(() =>
    new Date().toISOString().slice(0, 7),
  );
  const [formatFilter, setFormatFilter] = useState("");
  const [showCorrection, setShowCorrection] = useState<PayrollItem | null>(
    null,
  );
  const [correction, setCorrection] = useState({ amount: 0, reason: "" });

  const periodsQ = useQuery({
    queryKey: ["payroll-periods"],
    queryFn: listPayrollPeriods,
  });

  const period: PayrollPeriod | null =
    periodsQ.data?.find((x) => x.month === month) ?? null;

  const itemsQ = useQuery({
    queryKey: ["payroll-items", period?.period_id, formatFilter],
    queryFn: () =>
      listPayrollItems(period!.period_id, {
        format: formatFilter || undefined,
      }),
    enabled: Boolean(period?.period_id),
  });

  useEffect(() => {
    if (!period) {
      /* items query disabled */
    }
  }, [period]);

  const items = itemsQ.data ?? [];

  const generateM = useMutation({
    mutationFn: () => generatePayrollPeriod(month),
    onSuccess: (data) => {
      toast.success(
        `Payroll dibuat: ${data.items ?? 0} tentor, total ${rupiah(data.total)}`,
      );
      void qc.invalidateQueries({ queryKey: ["payroll-periods"] });
    },
    onError: (e: unknown) => {
      const detail =
        e && typeof e === "object" && "response" in e
          ? (e as { response?: { data?: { detail?: string } } }).response?.data
              ?.detail
          : undefined;
      toast.error(detail || "Gagal");
    },
  });

  const lockM = useMutation({
    mutationFn: () => lockPayrollPeriod(period!.period_id),
    onSuccess: () => {
      toast.success("Periode dikunci");
      void qc.invalidateQueries({ queryKey: ["payroll-periods"] });
    },
    onError: (e: unknown) => {
      const detail =
        e && typeof e === "object" && "response" in e
          ? (e as { response?: { data?: { detail?: string } } }).response?.data
              ?.detail
          : undefined;
      toast.error(detail || "Gagal");
    },
  });

  const correctionM = useMutation({
    mutationFn: () =>
      createPayrollCorrection({
        period_id: period!.period_id,
        tutor_id: showCorrection!.tutor_id,
        amount: correction.amount,
        reason: correction.reason,
      }),
    onSuccess: () => {
      toast.success("Koreksi dicatat");
      setShowCorrection(null);
      setCorrection({ amount: 0, reason: "" });
      void qc.invalidateQueries({ queryKey: ["payroll-items"] });
      void qc.invalidateQueries({ queryKey: ["payroll-periods"] });
    },
    onError: (e: unknown) => {
      const detail =
        e && typeof e === "object" && "response" in e
          ? (e as { response?: { data?: { detail?: string } } }).response?.data
              ?.detail
          : undefined;
      toast.error(detail || "Gagal");
    },
  });

  function handleLock(): void {
    if (!period) return;
    if (
      !window.confirm(
        "Kunci periode ini? Perubahan setelah kunci hanya melalui transaksi koreksi.",
      )
    ) {
      return;
    }
    lockM.mutate();
  }

  function handleSaveCorrection(): void {
    if (!correction.reason) {
      toast.error("Alasan wajib diisi");
      return;
    }
    correctionM.mutate();
  }

  return (
    <div className="space-y-(--space-5)">
      <PageHead
        seq="KEU"
        eyebrow="Keuangan"
        title="Payroll Periode"
        lede="Alur: Generate → Verifikasi → Disetujui → Dibayar → Dikunci. Perubahan setelah dikunci hanya melalui transaksi koreksi."
        actions={
          <>
            <input
              type="month"
              value={month}
              onChange={(e) => setMonth(e.target.value)}
              data-testid="input-period-month"
              className="min-h-(--target-min) rounded-control border border-line-subtle bg-canvas px-(--space-3) py-(--space-2)"
            />
            <select
              className="min-h-(--target-min) rounded-control border border-line-subtle bg-canvas px-(--space-3) py-(--space-2)"
              value={formatFilter}
              onChange={(e) => setFormatFilter(e.target.value)}
              data-testid="payroll-format-filter"
              aria-label="Filter tipe sesi"
            >
              <option value="">Semua tipe sesi</option>
              <option value="privat">Privat</option>
              <option value="semi_privat">Semi Privat</option>
              <option value="reguler">Reguler</option>
            </select>
            <Button
              type="button"
              size="sm"
              data-testid="btn-generate-payroll"
              onClick={() => generateM.mutate()}
            >
              <RefreshCw size={14} aria-hidden /> Generate
            </Button>
            {period && period.status !== "dikunci" ? (
              <Button
                type="button"
                variant="outline"
                size="sm"
                data-testid="btn-lock-period"
                onClick={handleLock}
              >
                <Lock size={14} aria-hidden /> Kunci Periode
              </Button>
            ) : null}
          </>
        }
      />

      {period ? (
        <div className="grid gap-(--space-3) sm:grid-cols-3">
          <div className="rounded-control border border-line-subtle p-(--space-4)">
            <p className="text-(length:--font-size-label) text-secondary">
              Total Payroll {month}
            </p>
            <p className="text-(length:--font-size-title-section) font-semibold">
              {rupiah(period.total_amount || 0)}
            </p>
          </div>
          <div className="rounded-control border border-line-subtle p-(--space-4)">
            <p className="text-(length:--font-size-label) text-secondary">
              Jumlah Tentor
            </p>
            <p className="text-(length:--font-size-title-section) font-semibold">
              {items.length}
            </p>
          </div>
          <div className="rounded-control border border-line-subtle p-(--space-4)">
            <p className="text-(length:--font-size-label) text-secondary">
              Status
            </p>
            <StatusBadge tone={payrollStatusTone(period.status)}>
              {payrollStatusLabel(period.status)}
            </StatusBadge>
          </div>
        </div>
      ) : null}

      <section className="space-y-(--space-3)">
        <div className="flex flex-wrap items-baseline justify-between gap-(--space-2)">
          <h2 className="text-(length:--font-size-title-section) font-semibold text-primary">
            Detail Payroll Item
          </h2>
          <span className="text-(length:--font-size-label) text-secondary">
            Periode {month}
          </span>
        </div>
        <div className="overflow-x-auto rounded-control border border-line-subtle">
          <table className="min-w-full border-collapse text-(length:--font-size-body)">
            <thead>
              <tr className="border-b border-line-subtle bg-surface">
                <th className="px-(--space-3) py-(--space-2) text-left">
                  Pengajar
                </th>
                <th className="px-(--space-3) py-(--space-2) text-left">
                  Sesi
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
                  Lembur
                </th>
                <th className="px-(--space-3) py-(--space-2) text-left">
                  Koreksi
                </th>
                <th className="px-(--space-3) py-(--space-2) text-right">
                  Total
                </th>
                <th className="px-(--space-3) py-(--space-2) text-left">
                  Status
                </th>
                <th className="px-(--space-3) py-(--space-2) text-left">
                  Aksi
                </th>
              </tr>
            </thead>
            <tbody>
              {!period ? (
                <tr>
                  <td
                    colSpan={10}
                    className="px-(--space-3) py-(--space-4) text-center text-secondary"
                  >
                    Payroll belum di-generate. Klik &quot;Generate&quot; untuk
                    membuat.
                  </td>
                </tr>
              ) : items.length === 0 ? (
                <tr>
                  <td
                    colSpan={10}
                    className="px-(--space-3) py-(--space-4) text-center text-secondary"
                  >
                    Tidak ada item.
                  </td>
                </tr>
              ) : (
                items.map((it) => (
                  <tr
                    key={it.item_id}
                    data-testid={`row-item-${it.item_id}`}
                    className="border-b border-line-subtle"
                  >
                    <td className="px-(--space-3) py-(--space-2) font-medium">
                      {it.tutor_name}
                    </td>
                    <td className="px-(--space-3) py-(--space-2)">
                      {it.sessions_count ?? it.sessions}
                    </td>
                    <td className="px-(--space-3) py-(--space-2)">
                      {rupiah(it.base_total ?? it.base_amount)}
                    </td>
                    <td className="px-(--space-3) py-(--space-2)">
                      {rupiah(it.incentive_total ?? it.incentive)}
                    </td>
                    <td className="px-(--space-3) py-(--space-2)">
                      {rupiah(it.transport_total ?? it.transport)}
                    </td>
                    <td className="px-(--space-3) py-(--space-2)">
                      {rupiah(it.overtime_total)}
                    </td>
                    <td
                      className={`px-(--space-3) py-(--space-2) ${
                        (it.correction_total ?? 0) < 0
                          ? "text-critical"
                          : (it.correction_total ?? 0) > 0
                            ? "text-success"
                            : ""
                      }`}
                    >
                      {rupiah(it.correction_total)}
                    </td>
                    <td className="px-(--space-3) py-(--space-2) text-right font-semibold">
                      {rupiah(it.total)}
                    </td>
                    <td className="px-(--space-3) py-(--space-2)">
                      <StatusBadge tone={it.paid ? "success" : "neutral"}>
                        {it.paid ? "Dibayar" : "Belum"}
                      </StatusBadge>
                    </td>
                    <td className="px-(--space-3) py-(--space-2)">
                      <div className="flex flex-wrap gap-(--space-2)">
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          data-testid={`btn-correction-${it.tutor_id}`}
                          onClick={() => setShowCorrection(it)}
                        >
                          Koreksi
                        </Button>
                        {period ? (
                          <a
                            href={buildSlipUrl(
                              getApiBaseUrl(),
                              period.period_id,
                              it.tutor_id,
                            )}
                            target="_blank"
                            rel="noreferrer"
                            data-testid={`btn-slip-${it.tutor_id}`}
                            className="inline-flex min-h-(--target-min) items-center gap-(--space-1) rounded-control border border-line-subtle px-(--space-3) text-(length:--font-size-body) text-accent-text"
                          >
                            <FileText size={11} aria-hidden /> Slip
                          </a>
                        ) : null}
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </section>

      {showCorrection ? (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-(--space-4)"
          onClick={() => setShowCorrection(null)}
          role="presentation"
        >
          <div
            className="w-full max-w-md rounded-control border border-line-subtle bg-canvas p-(--space-4)"
            onClick={(e) => e.stopPropagation()}
            role="dialog"
            aria-modal="true"
            aria-label={`Koreksi payroll ${showCorrection.tutor_name}`}
          >
            <div className="mb-(--space-3) flex items-center justify-between">
              <h2 className="font-semibold text-primary">
                Koreksi Payroll: {showCorrection.tutor_name}
              </h2>
              <Button
                type="button"
                variant="outline"
                size="sm"
                aria-label="Tutup"
                onClick={() => setShowCorrection(null)}
              >
                <X size={16} />
              </Button>
            </div>
            <label className="mb-(--space-3) block space-y-(--space-1)">
              <span className="text-(length:--font-size-label) text-secondary">
                Nominal (Rp) — negatif untuk pengurangan
              </span>
              <input
                type="number"
                className="min-h-(--target-min) w-full rounded-control border border-line-subtle px-(--space-3)"
                value={correction.amount}
                onChange={(e) =>
                  setCorrection({
                    ...correction,
                    amount: Number(e.target.value),
                  })
                }
                data-testid="input-correction-amount"
              />
            </label>
            <label className="mb-(--space-3) block space-y-(--space-1)">
              <span className="text-(length:--font-size-label) text-secondary">
                Alasan *
              </span>
              <textarea
                rows={3}
                className="w-full rounded-control border border-line-subtle px-(--space-3) py-(--space-2)"
                value={correction.reason}
                onChange={(e) =>
                  setCorrection({ ...correction, reason: e.target.value })
                }
                data-testid="input-correction-reason"
              />
            </label>
            <div className="flex justify-end gap-(--space-2)">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => setShowCorrection(null)}
              >
                Batal
              </Button>
              <Button
                type="button"
                size="sm"
                data-testid="btn-save-correction"
                onClick={handleSaveCorrection}
              >
                Simpan Koreksi
              </Button>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}

export default function PayrollPage() {
  return (
    <ProtectedRoute roles={["owner", "finance"]}>
      <AppShell>
        <PayrollView />
      </AppShell>
    </ProtectedRoute>
  );
}
