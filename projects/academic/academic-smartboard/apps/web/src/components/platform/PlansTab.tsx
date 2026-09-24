"use client";

import { useQuery, useQueryClient } from "@tanstack/react-query";
import { type FormEvent, useState } from "react";
import { toast } from "sonner";
import {
  createPlatformPlan,
  listPlatformPlans,
  type PlatformPlan,
  patchPlatformPlan,
} from "../../lib/api.ts";
import {
  ALL_FEATURES,
  ALL_QUOTAS,
  FEATURE_LABEL,
  fmtRupiah,
  INTERVAL_LABEL,
  QUOTA_LABEL,
} from "../../lib/platform/pricing.ts";
import { StatusBadge } from "../StatusBadge.tsx";
import { Button } from "../ui/button.tsx";

export function PlansTab() {
  const qc = useQueryClient();
  const plansQ = useQuery({
    queryKey: ["platform", "plans"],
    queryFn: listPlatformPlans,
  });
  const [editing, setEditing] = useState<PlatformPlan | "new" | null>(null);
  const plans = plansQ.data ?? [];

  return (
    <>
      <div className="mb-(--space-5) flex flex-wrap items-start justify-between gap-(--space-4)">
        <div>
          <p className="text-(length:--font-size-label) uppercase tracking-(--letter-spacing-label) text-secondary">
            <span className="mr-(--space-2) font-semibold text-accent-text">
              HRG
            </span>
            Katalog
          </p>
          <h1 className="text-(length:--font-size-title-page) font-bold text-primary">
            Paket &amp; Harga
          </h1>
          <p className="mt-(--space-2) max-w-prose text-(length:--font-size-body) text-secondary">
            Tentukan paket berlangganan: harga, interval, kuota, dan fitur.
          </p>
        </div>
        <Button
          type="button"
          onClick={() => setEditing("new")}
          data-testid="plan-create"
        >
          Buat Paket
        </Button>
      </div>

      {plansQ.isError ? (
        <div className="mb-(--space-4)" role="alert">
          <p className="text-critical">Gagal memuat paket</p>
        </div>
      ) : null}

      <div className="overflow-x-auto rounded-control border border-line-subtle">
        <table className="w-full min-w-[48rem] text-left text-(length:--font-size-body)">
          <thead className="border-b border-line-subtle bg-surface text-secondary">
            <tr>
              <th className="px-(--space-3) py-(--space-2)">Paket</th>
              <th className="px-(--space-3) py-(--space-2)">Kode</th>
              <th className="px-(--space-3) py-(--space-2)">Harga</th>
              <th className="px-(--space-3) py-(--space-2)">Interval</th>
              <th className="px-(--space-3) py-(--space-2)">Kuota</th>
              <th className="px-(--space-3) py-(--space-2)">Fitur</th>
              <th className="px-(--space-3) py-(--space-2)">Status</th>
              <th className="px-(--space-3) py-(--space-2)">Aksi</th>
            </tr>
          </thead>
          <tbody>
            {plansQ.isPending ? (
              <tr>
                <td
                  colSpan={8}
                  className="px-(--space-3) py-(--space-4) text-secondary"
                >
                  Memuat…
                </td>
              </tr>
            ) : null}
            {!plansQ.isPending && plans.length === 0 ? (
              <tr>
                <td
                  colSpan={8}
                  className="px-(--space-3) py-(--space-4) text-secondary"
                >
                  Belum ada paket. Klik “Buat Paket”.
                </td>
              </tr>
            ) : null}
            {plans.map((p) => (
              <tr
                key={p.plan_id}
                data-testid={`plan-row-${p.code}`}
                className="border-t border-line-subtle text-primary"
              >
                <td className="px-(--space-3) py-(--space-2) font-semibold">
                  {p.name}
                </td>
                <td className="px-(--space-3) py-(--space-2) tabular-nums">
                  {p.code}
                </td>
                <td
                  className="px-(--space-3) py-(--space-2) tabular-nums"
                  data-testid={`plan-price-${p.code}`}
                >
                  {fmtRupiah(p.price_amount, p.currency)}
                </td>
                <td className="px-(--space-3) py-(--space-2)">
                  {INTERVAL_LABEL[p.interval] || p.interval}
                </td>
                <td className="px-(--space-3) py-(--space-2) text-(length:--font-size-body-compact) text-secondary">
                  {Object.keys(p.quotas || {}).length
                    ? Object.entries(p.quotas || {})
                        .map(
                          ([k, v]) =>
                            `${QUOTA_LABEL[k] || k}: ${v < 0 ? "∞" : v}`,
                        )
                        .join(" · ")
                    : "—"}
                </td>
                <td className="px-(--space-3) py-(--space-2) text-(length:--font-size-body-compact) text-secondary">
                  {(p.features || [])
                    .map((f) => FEATURE_LABEL[f] || f)
                    .join(", ") || "—"}
                </td>
                <td className="px-(--space-3) py-(--space-2)">
                  <StatusBadge
                    tone={p.status === "active" ? "success" : "neutral"}
                  >
                    {p.status === "active" ? "Aktif" : "Arsip"}
                  </StatusBadge>
                </td>
                <td className="px-(--space-3) py-(--space-2)">
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() => setEditing(p)}
                    data-testid={`plan-edit-${p.code}`}
                  >
                    Ubah
                  </Button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {editing ? (
        <PlanModal
          plan={editing === "new" ? null : editing}
          onClose={() => setEditing(null)}
          onSaved={() => {
            setEditing(null);
            void qc.invalidateQueries({ queryKey: ["platform", "plans"] });
          }}
        />
      ) : null}
    </>
  );
}

function PlanModal({
  plan,
  onClose,
  onSaved,
}: {
  plan: PlatformPlan | null;
  onClose: () => void;
  onSaved: () => void;
}) {
  const isEdit = !!plan;
  const [code, setCode] = useState(plan?.code || "");
  const [name, setName] = useState(plan?.name || "");
  const [price, setPrice] = useState(String(plan?.price_amount ?? 0));
  const [interval, setIntervalV] = useState(plan?.interval || "monthly");
  const [quotas, setQuotas] = useState<Record<string, number | undefined>>(
    plan?.quotas || {},
  );
  const [features, setFeatures] = useState<string[]>(plan?.features || []);
  const [status, setStatus] = useState(plan?.status || "active");
  const [busy, setBusy] = useState(false);

  const toggleFeature = (f: string) =>
    setFeatures((prev) =>
      prev.includes(f) ? prev.filter((x) => x !== f) : [...prev, f],
    );

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    if (name.trim().length < 2) {
      toast.error("Nama paket wajib diisi");
      return;
    }
    if (Number(price) < 0) {
      toast.error("Harga tidak boleh negatif");
      return;
    }
    const cleanQuotas = Object.fromEntries(
      Object.entries(quotas).filter(
        ([, v]) => v !== undefined && v !== null && !Number.isNaN(v),
      ),
    );
    setBusy(true);
    try {
      if (isEdit && plan) {
        await patchPlatformPlan(plan.plan_id, {
          name: name.trim(),
          price_amount: Number(price),
          interval,
          quotas: cleanQuotas,
          features,
          status,
        });
        toast.success("Paket diperbarui");
      } else {
        if (!/^[a-z0-9]([a-z0-9-]{0,38}[a-z0-9])?$/.test(code)) {
          toast.error("Kode paket tidak valid");
          setBusy(false);
          return;
        }
        await createPlatformPlan({
          code,
          name: name.trim(),
          price_amount: Number(price),
          interval,
          quotas: cleanQuotas,
          features,
        });
        toast.success("Paket dibuat");
      }
      onSaved();
    } catch (err: unknown) {
      const detail =
        err && typeof err === "object" && "response" in err
          ? (err as { response?: { data?: { detail?: string } } }).response
              ?.data?.detail
          : undefined;
      toast.error(detail || "Gagal menyimpan paket");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="fixed inset-0 z-(--z-drawer) flex items-center justify-center bg-overlay/40 p-(--space-4)">
      <button
        type="button"
        aria-label="Tutup"
        tabIndex={-1}
        className="absolute inset-0 cursor-default"
        onClick={onClose}
      />
      <div
        className="relative max-h-[90vh] w-full max-w-2xl overflow-y-auto rounded-control border border-line-subtle bg-canvas shadow-overlay"
        role="dialog"
        aria-modal="true"
      >
        <div className="flex items-center justify-between border-b border-line-subtle px-(--space-4) py-(--space-3)">
          <h2 className="text-(length:--font-size-title-section) font-bold text-primary">
            {isEdit ? `Ubah Paket: ${plan?.name}` : "Buat Paket"}
          </h2>
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={onClose}
            aria-label="Tutup"
          >
            ✕
          </Button>
        </div>
        <form
          id="plan-form"
          onSubmit={(e) => void submit(e)}
          className="flex flex-col gap-(--space-3) p-(--space-4)"
        >
          {!isEdit ? (
            <label className="flex flex-col gap-(--space-1)">
              <span className="text-(length:--font-size-label) text-secondary">
                Kode Paket
              </span>
              <input
                className="min-h-(--target-min) rounded-control border border-line-subtle bg-canvas px-(--space-3) text-primary"
                value={code}
                onChange={(e) => setCode(e.target.value.toLowerCase())}
                data-testid="plan-f-code"
              />
            </label>
          ) : null}
          <label className="flex flex-col gap-(--space-1)">
            <span className="text-(length:--font-size-label) text-secondary">
              Nama Paket
            </span>
            <input
              className="min-h-(--target-min) rounded-control border border-line-subtle bg-canvas px-(--space-3) text-primary"
              value={name}
              onChange={(e) => setName(e.target.value)}
              data-testid="plan-f-name"
            />
          </label>
          <div className="grid gap-(--space-3) sm:grid-cols-2">
            <label className="flex flex-col gap-(--space-1)">
              <span className="text-(length:--font-size-label) text-secondary">
                Harga (Rp)
              </span>
              <input
                className="min-h-(--target-min) rounded-control border border-line-subtle bg-canvas px-(--space-3) text-primary"
                type="number"
                min={0}
                value={price}
                onChange={(e) => setPrice(e.target.value)}
                data-testid="plan-f-price"
              />
            </label>
            <label className="flex flex-col gap-(--space-1)">
              <span className="text-(length:--font-size-label) text-secondary">
                Interval
              </span>
              <select
                className="min-h-(--target-min) rounded-control border border-line-subtle bg-canvas px-(--space-3) text-primary"
                value={interval}
                onChange={(e) => setIntervalV(e.target.value)}
                data-testid="plan-f-interval"
              >
                <option value="monthly">Per bulan</option>
                <option value="yearly">Per tahun</option>
                <option value="one_time">Sekali bayar</option>
              </select>
            </label>
          </div>
          <div>
            <span className="text-(length:--font-size-label) text-secondary">
              Kuota (kosong = tak terbatas)
            </span>
            <div className="mt-(--space-2) grid gap-(--space-2) sm:grid-cols-2">
              {ALL_QUOTAS.map((k) => (
                <label key={k} className="flex flex-col gap-(--space-1)">
                  <span className="text-(length:--font-size-body-compact) text-secondary">
                    {QUOTA_LABEL[k]}
                  </span>
                  <input
                    className="min-h-(--target-min) rounded-control border border-line-subtle bg-canvas px-(--space-3) text-primary"
                    type="number"
                    value={quotas[k] ?? ""}
                    onChange={(e) =>
                      setQuotas((prev) => ({
                        ...prev,
                        [k]:
                          e.target.value === ""
                            ? undefined
                            : Number(e.target.value),
                      }))
                    }
                    data-testid={`plan-q-${k}`}
                  />
                </label>
              ))}
            </div>
          </div>
          <div>
            <span className="text-(length:--font-size-label) text-secondary">
              Fitur
            </span>
            <div className="mt-(--space-2) flex flex-col gap-(--space-2)">
              {ALL_FEATURES.map((f) => (
                <label
                  key={f}
                  className="flex items-center gap-(--space-2) text-primary"
                >
                  <input
                    type="checkbox"
                    checked={features.includes(f)}
                    onChange={() => toggleFeature(f)}
                    data-testid={`plan-feat-${f}`}
                  />
                  {FEATURE_LABEL[f]}
                </label>
              ))}
            </div>
          </div>
          {isEdit ? (
            <label className="flex flex-col gap-(--space-1)">
              <span className="text-(length:--font-size-label) text-secondary">
                Status
              </span>
              <select
                className="min-h-(--target-min) rounded-control border border-line-subtle bg-canvas px-(--space-3) text-primary"
                value={status}
                onChange={(e) => setStatus(e.target.value)}
              >
                <option value="active">Aktif</option>
                <option value="archived">Arsip</option>
              </select>
            </label>
          ) : null}
        </form>
        <div className="flex justify-end gap-(--space-2) border-t border-line-subtle px-(--space-4) py-(--space-3)">
          <Button type="button" variant="ghost" onClick={onClose}>
            Batal
          </Button>
          <Button
            type="submit"
            form="plan-form"
            disabled={busy}
            data-testid="plan-save"
          >
            {busy ? "Menyimpan…" : isEdit ? "Simpan" : "Buat Paket"}
          </Button>
        </div>
      </div>
    </div>
  );
}
