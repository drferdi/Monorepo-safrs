"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Plus, X } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { AppShell } from "../../../components/AppShell.tsx";
import { PageHead } from "../../../components/PageHead.tsx";
import { ProtectedRoute } from "../../../components/ProtectedRoute.tsx";
import { Button } from "../../../components/ui/button.tsx";
import {
  createPayment,
  listPayments,
  listPayrollItems,
  listPayrollPeriods,
  listTutors,
  type PayrollItem,
  reconcilePayment,
} from "../../../lib/api.ts";
import { rupiah } from "../../../lib/labels.ts";
import {
  METHOD_LABEL,
  sumPaymentTotal,
  validatePaymentForm,
} from "../../../lib/payroll.ts";

function emptyForm() {
  return {
    period_id: "",
    tutor_id: "",
    amount: 0,
    method: "transfer_bank",
    reference: "",
    note: "",
    paid_at: new Date().toISOString().slice(0, 10),
    bank_name: "",
    account_last4: "",
    transfer_ref: "",
  };
}

function PembayaranView() {
  const qc = useQueryClient();
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState(emptyForm);
  const [items, setItems] = useState<PayrollItem[]>([]);

  const paymentsQ = useQuery({
    queryKey: ["payments"],
    queryFn: () => listPayments(),
  });
  const periodsQ = useQuery({
    queryKey: ["payroll-periods"],
    queryFn: listPayrollPeriods,
  });
  const tutorsQ = useQuery({ queryKey: ["tutors"], queryFn: listTutors });

  const payments = paymentsQ.data ?? [];
  const periods = periodsQ.data ?? [];
  const tutors = tutorsQ.data ?? [];
  const total = sumPaymentTotal(payments);

  async function loadItems(periodId: string): Promise<void> {
    if (!periodId) {
      setItems([]);
      return;
    }
    try {
      setItems(await listPayrollItems(periodId));
    } catch {
      setItems([]);
    }
  }

  const createM = useMutation({
    mutationFn: () => createPayment(form),
    onSuccess: () => {
      toast.success("Pembayaran dicatat");
      setShowForm(false);
      setForm(emptyForm());
      void qc.invalidateQueries({ queryKey: ["payments"] });
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

  const reconcileM = useMutation({
    mutationFn: (id: string) => reconcilePayment(id),
    onSuccess: () => {
      toast.success("Ditandai rekonsiliasi");
      void qc.invalidateQueries({ queryKey: ["payments"] });
    },
    onError: (e: unknown) => {
      const detail =
        e && typeof e === "object" && "response" in e
          ? (e as { response?: { data?: { detail?: string } } }).response?.data
              ?.detail
          : undefined;
      toast.error(detail || "Gagal rekonsiliasi");
    },
  });

  function handleSubmit(): void {
    const err = validatePaymentForm(form);
    if (err) {
      toast.error(err);
      return;
    }
    createM.mutate();
  }

  return (
    <div className="space-y-(--space-5)">
      <PageHead
        seq="KEU"
        eyebrow="Keuangan"
        title="Pembayaran Honor"
        lede="Catat pembayaran manual. Item payroll terkait otomatis ditandai dibayar."
        actions={
          <Button
            type="button"
            size="sm"
            data-testid="btn-add-payment"
            onClick={() => setShowForm(true)}
          >
            <Plus size={14} aria-hidden /> Catat Pembayaran
          </Button>
        }
      />

      <div className="grid gap-(--space-3) sm:grid-cols-2">
        <div className="rounded-control border border-line-subtle p-(--space-4)">
          <p className="text-(length:--font-size-label) text-secondary">
            Total Dibayar
          </p>
          <p className="text-(length:--font-size-title-section) font-semibold">
            {rupiah(total)}
          </p>
        </div>
        <div className="rounded-control border border-line-subtle p-(--space-4)">
          <p className="text-(length:--font-size-label) text-secondary">
            Jumlah Transaksi
          </p>
          <p className="text-(length:--font-size-title-section) font-semibold">
            {payments.length}
          </p>
        </div>
      </div>

      <div className="overflow-x-auto rounded-control border border-line-subtle">
        <table className="min-w-full border-collapse text-(length:--font-size-body)">
          <thead>
            <tr className="border-b border-line-subtle bg-surface">
              <th className="px-(--space-3) py-(--space-2) text-left">
                Tanggal Bayar
              </th>
              <th className="px-(--space-3) py-(--space-2) text-left">
                Pengajar
              </th>
              <th className="px-(--space-3) py-(--space-2) text-left">
                Periode
              </th>
              <th className="px-(--space-3) py-(--space-2) text-left">
                Jumlah
              </th>
              <th className="px-(--space-3) py-(--space-2) text-left">
                Metode
              </th>
              <th className="px-(--space-3) py-(--space-2) text-left">Bank</th>
              <th className="px-(--space-3) py-(--space-2) text-left">
                Referensi
              </th>
              <th className="px-(--space-3) py-(--space-2) text-left">
                Rekonsiliasi
              </th>
            </tr>
          </thead>
          <tbody>
            {payments.length === 0 ? (
              <tr>
                <td
                  colSpan={8}
                  className="px-(--space-3) py-(--space-4) text-center text-secondary"
                >
                  Belum ada pembayaran.
                </td>
              </tr>
            ) : (
              payments.map((p) => (
                <tr
                  key={p.payment_id}
                  data-testid={`row-pay-${p.payment_id}`}
                  className="border-b border-line-subtle"
                >
                  <td className="px-(--space-3) py-(--space-2)">{p.paid_at}</td>
                  <td className="px-(--space-3) py-(--space-2)">
                    {tutors.find((t) => t.tutor_id === p.tutor_id)?.name || "—"}
                  </td>
                  <td className="px-(--space-3) py-(--space-2)">
                    {periods.find((pp) => pp.period_id === p.period_id)
                      ?.month || "—"}
                  </td>
                  <td className="px-(--space-3) py-(--space-2) font-semibold">
                    {rupiah(p.amount)}
                  </td>
                  <td className="px-(--space-3) py-(--space-2)">
                    {(p.method &&
                      METHOD_LABEL[p.method as keyof typeof METHOD_LABEL]) ||
                      p.method}
                  </td>
                  <td className="px-(--space-3) py-(--space-2)">
                    {p.bank_name
                      ? `${p.bank_name} ···${p.account_last4 || ""}`
                      : "—"}
                  </td>
                  <td className="px-(--space-3) py-(--space-2)">
                    {p.transfer_ref || p.reference || "—"}
                  </td>
                  <td className="px-(--space-3) py-(--space-2)">
                    {p.reconciled ? (
                      <span className="text-success">Ya</span>
                    ) : (
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        data-testid={`btn-reconcile-${p.payment_id}`}
                        onClick={() => reconcileM.mutate(p.payment_id)}
                      >
                        Tandai
                      </Button>
                    )}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {showForm ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-(--space-4)">
          <button
            type="button"
            aria-label="Tutup"
            tabIndex={-1}
            className="absolute inset-0 cursor-default"
            onClick={() => setShowForm(false)}
          />
          <div
            className="relative max-h-[90vh] w-full max-w-lg overflow-y-auto rounded-control border border-line-subtle bg-canvas p-(--space-4)"
            role="dialog"
            aria-modal="true"
            aria-label="Catat pembayaran"
          >
            <div className="mb-(--space-3) flex items-center justify-between">
              <h2 className="font-semibold">Catat Pembayaran</h2>
              <Button
                type="button"
                variant="outline"
                size="sm"
                aria-label="Tutup"
                onClick={() => setShowForm(false)}
              >
                <X size={16} />
              </Button>
            </div>
            <div className="space-y-(--space-3)">
              <label className="block space-y-(--space-1)">
                <span className="text-(length:--font-size-label) text-secondary">
                  Periode
                </span>
                <select
                  data-testid="select-pay-period"
                  className="min-h-(--target-min) w-full rounded-control border border-line-subtle px-(--space-3)"
                  value={form.period_id}
                  onChange={(e) => {
                    const period_id = e.target.value;
                    setForm({ ...form, period_id, tutor_id: "", amount: 0 });
                    void loadItems(period_id);
                  }}
                >
                  <option value="">Pilih periode</option>
                  {periods.map((p) => (
                    <option key={p.period_id} value={p.period_id}>
                      {p.month}
                    </option>
                  ))}
                </select>
              </label>
              <label className="block space-y-(--space-1)">
                <span className="text-(length:--font-size-label) text-secondary">
                  Pengajar
                </span>
                <select
                  data-testid="select-pay-tutor"
                  className="min-h-(--target-min) w-full rounded-control border border-line-subtle px-(--space-3)"
                  value={form.tutor_id}
                  onChange={(e) => {
                    const tutor_id = e.target.value;
                    const it = items.find((x) => x.tutor_id === tutor_id);
                    setForm({
                      ...form,
                      tutor_id,
                      amount: it?.total || 0,
                    });
                  }}
                >
                  <option value="">Pilih pengajar</option>
                  {items.map((it) => (
                    <option key={it.tutor_id} value={it.tutor_id}>
                      {it.tutor_name || it.tutor_id}
                    </option>
                  ))}
                </select>
              </label>
              <label className="block space-y-(--space-1)">
                <span className="text-(length:--font-size-label) text-secondary">
                  Jumlah
                </span>
                <input
                  type="number"
                  data-testid="input-pay-amount"
                  className="min-h-(--target-min) w-full rounded-control border border-line-subtle px-(--space-3)"
                  value={form.amount}
                  onChange={(e) =>
                    setForm({ ...form, amount: Number(e.target.value) })
                  }
                />
              </label>
              <label className="block space-y-(--space-1)">
                <span className="text-(length:--font-size-label) text-secondary">
                  Metode
                </span>
                <select
                  data-testid="select-pay-method"
                  className="min-h-(--target-min) w-full rounded-control border border-line-subtle px-(--space-3)"
                  value={form.method}
                  onChange={(e) => setForm({ ...form, method: e.target.value })}
                >
                  {Object.entries(METHOD_LABEL).map(([v, l]) => (
                    <option key={v} value={v}>
                      {l}
                    </option>
                  ))}
                </select>
              </label>
              {form.method === "transfer_bank" ? (
                <>
                  <label className="block space-y-(--space-1)">
                    <span className="text-(length:--font-size-label) text-secondary">
                      Nama bank
                    </span>
                    <input
                      data-testid="input-pay-bank"
                      className="min-h-(--target-min) w-full rounded-control border border-line-subtle px-(--space-3)"
                      value={form.bank_name}
                      onChange={(e) =>
                        setForm({ ...form, bank_name: e.target.value })
                      }
                    />
                  </label>
                  <label className="block space-y-(--space-1)">
                    <span className="text-(length:--font-size-label) text-secondary">
                      4 digit terakhir
                    </span>
                    <input
                      data-testid="input-pay-last4"
                      className="min-h-(--target-min) w-full rounded-control border border-line-subtle px-(--space-3)"
                      value={form.account_last4}
                      onChange={(e) =>
                        setForm({ ...form, account_last4: e.target.value })
                      }
                    />
                  </label>
                  <label className="block space-y-(--space-1)">
                    <span className="text-(length:--font-size-label) text-secondary">
                      No. referensi transfer
                    </span>
                    <input
                      data-testid="input-pay-transfer-ref"
                      className="min-h-(--target-min) w-full rounded-control border border-line-subtle px-(--space-3)"
                      value={form.transfer_ref}
                      onChange={(e) =>
                        setForm({ ...form, transfer_ref: e.target.value })
                      }
                    />
                  </label>
                </>
              ) : null}
            </div>
            <div className="mt-(--space-4) flex justify-end gap-(--space-2)">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => setShowForm(false)}
              >
                Batal
              </Button>
              <Button
                type="button"
                size="sm"
                data-testid="btn-save-payment"
                onClick={handleSubmit}
              >
                Simpan
              </Button>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}

export default function PembayaranPage() {
  return (
    <ProtectedRoute roles={["owner", "finance"]}>
      <AppShell>
        <PembayaranView />
      </AppShell>
    </ProtectedRoute>
  );
}
