"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Plus, X } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { AppShell } from "../../components/AppShell.tsx";
import { PageHead } from "../../components/PageHead.tsx";
import { ProtectedRoute } from "../../components/ProtectedRoute.tsx";
import { StatusBadge } from "../../components/StatusBadge.tsx";
import { Button } from "../../components/ui/button.tsx";
import {
  createOvertime,
  decideOvertime,
  listOvertime,
  listTutors,
} from "../../lib/api.ts";
import { useAuth } from "../../lib/auth.tsx";
import { rupiah } from "../../lib/labels.ts";
import type { StatusBadgeTone } from "../../lib/labels.ts";
import {
  canApproveOvertime,
  OT_STATUS_LABEL,
  OT_STATUS_TONE,
  OT_TYPE_LABEL,
} from "../../lib/payroll.ts";

function emptyForm() {
  return {
    tutor_id: "",
    date: new Date().toISOString().slice(0, 10),
    start_time: "18:00",
    end_time: "19:00",
    work_type: "administrasi",
    reason: "",
    amount: 50000,
  };
}

function LemburView() {
  const qc = useQueryClient();
  const { user } = useAuth();
  const isTutor = user?.role === "tentor";
  const canApprove = canApproveOvertime(user?.role);

  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState(emptyForm);

  const overtimeQ = useQuery({ queryKey: ["overtime"], queryFn: () => listOvertime() });
  const tutorsQ = useQuery({ queryKey: ["tutors"], queryFn: listTutors });

  const rows = overtimeQ.data ?? [];
  const tutors = tutorsQ.data ?? [];

  const createM = useMutation({
    mutationFn: () => createOvertime(form),
    onSuccess: () => {
      toast.success("Pengajuan lembur terkirim");
      setShowForm(false);
      setForm(emptyForm());
      void qc.invalidateQueries({ queryKey: ["overtime"] });
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

  const decideM = useMutation({
    mutationFn: ({
      id,
      approve,
      note,
    }: {
      id: string;
      approve: boolean;
      note: string;
    }) => decideOvertime(id, { approve, note }),
    onSuccess: (_data, vars) => {
      toast.success(vars.approve ? "Disetujui" : "Ditolak");
      void qc.invalidateQueries({ queryKey: ["overtime"] });
    },
    onError: () => {
      toast.error("Gagal");
    },
  });

  function handleSubmit(): void {
    if (!isTutor && !form.tutor_id) {
      toast.error("Pilih pengajar");
      return;
    }
    createM.mutate();
  }

  function handleDecide(id: string, approve: boolean): void {
    const note = approve ? "" : window.prompt("Alasan penolakan:") || "";
    decideM.mutate({ id, approve, note });
  }

  return (
    <div className="space-y-(--space-5)">
      <PageHead
        seq="PGJ"
        eyebrow="Pengajar"
        title="Pengajuan Lembur"
        lede="Pengajuan lembur hanya masuk payroll setelah disetujui Owner atau Finance."
        actions={
          <Button
            type="button"
            size="sm"
            data-testid="btn-add-overtime"
            onClick={() => setShowForm(true)}
          >
            <Plus size={14} aria-hidden /> Ajukan Lembur
          </Button>
        }
      />

      <div className="flex flex-wrap items-baseline justify-between gap-(--space-2)">
        <p className="text-(length:--font-size-body) font-medium text-primary">
          {rows.length} pengajuan
        </p>
        <p className="hidden text-(length:--font-size-label) text-secondary sm:block">
          Terbaru dahulu
        </p>
      </div>

      <div className="overflow-x-auto rounded-control border border-line-subtle">
        <table className="min-w-full border-collapse text-(length:--font-size-body)">
          <thead>
            <tr className="border-b border-line-subtle bg-surface">
              <th className="px-(--space-3) py-(--space-2) text-left">Tanggal</th>
              <th className="px-(--space-3) py-(--space-2) text-left">Pengajar</th>
              <th className="px-(--space-3) py-(--space-2) text-left">Jam</th>
              <th className="px-(--space-3) py-(--space-2) text-left">Durasi</th>
              <th className="px-(--space-3) py-(--space-2) text-left">Jenis</th>
              <th className="px-(--space-3) py-(--space-2) text-left">Alasan</th>
              <th className="px-(--space-3) py-(--space-2) text-left">Nilai</th>
              <th className="px-(--space-3) py-(--space-2) text-left">Status</th>
              <th className="px-(--space-3) py-(--space-2) text-left">Aksi</th>
            </tr>
          </thead>
          <tbody>
            {rows.length === 0 ? (
              <tr>
                <td
                  colSpan={9}
                  className="px-(--space-3) py-(--space-4) text-center text-secondary"
                >
                  Belum ada pengajuan.
                </td>
              </tr>
            ) : (
              rows.map((r) => (
                <tr
                  key={r.overtime_id}
                  data-testid={`row-ot-${r.overtime_id}`}
                  className="border-b border-line-subtle"
                >
                  <td className="px-(--space-3) py-(--space-2)">{r.date}</td>
                  <td className="px-(--space-3) py-(--space-2)">
                    {tutors.find((x) => x.tutor_id === r.tutor_id)?.name || "—"}
                  </td>
                  <td className="px-(--space-3) py-(--space-2)">
                    {r.start_time}–{r.end_time}
                  </td>
                  <td className="px-(--space-3) py-(--space-2)">
                    {r.duration_min} mnt
                  </td>
                  <td className="px-(--space-3) py-(--space-2)">
                    {(OT_TYPE_LABEL as Record<string, string>)[r.work_type ?? ""] ??
                      r.work_type}
                  </td>
                  <td className="px-(--space-3) py-(--space-2)">{r.reason}</td>
                  <td className="px-(--space-3) py-(--space-2) font-semibold">
                    {rupiah(r.amount)}
                  </td>
                  <td className="px-(--space-3) py-(--space-2)">
                    <StatusBadge
                      tone={
                        (OT_STATUS_TONE as Record<string, StatusBadgeTone>)[
                          r.status ?? ""
                        ] ?? "neutral"
                      }
                    >
                      {(OT_STATUS_LABEL as Record<string, string>)[r.status ?? ""] ??
                        r.status}
                    </StatusBadge>
                  </td>
                  <td className="px-(--space-3) py-(--space-2)">
                    {canApprove && r.status === "diajukan" ? (
                      <div className="flex flex-wrap gap-(--space-2)">
                        <Button
                          type="button"
                          size="sm"
                          data-testid={`btn-approve-${r.overtime_id}`}
                          onClick={() => handleDecide(r.overtime_id, true)}
                        >
                          Setujui
                        </Button>
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          className="text-critical"
                          data-testid={`btn-reject-${r.overtime_id}`}
                          onClick={() => handleDecide(r.overtime_id, false)}
                        >
                          Tolak
                        </Button>
                      </div>
                    ) : null}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {showForm ? (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-(--space-4)"
          onClick={() => setShowForm(false)}
          role="presentation"
        >
          <div
            className="w-full max-w-lg rounded-control border border-line-subtle bg-canvas p-(--space-4)"
            onClick={(e) => e.stopPropagation()}
            role="dialog"
            aria-modal="true"
            aria-label="Ajukan lembur"
          >
            <div className="mb-(--space-4) flex items-center justify-between">
              <h2 className="font-semibold text-primary">Ajukan Lembur</h2>
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

            <div className="grid gap-(--space-3) sm:grid-cols-2">
              {!isTutor ? (
                <label className="block space-y-(--space-1) sm:col-span-2">
                  <span className="text-(length:--font-size-label) text-secondary">
                    Pengajar *
                  </span>
                  <select
                    className="min-h-(--target-min) w-full rounded-control border border-line-subtle bg-canvas px-(--space-3)"
                    value={form.tutor_id}
                    onChange={(e) =>
                      setForm({ ...form, tutor_id: e.target.value })
                    }
                    data-testid="select-ot-tutor"
                  >
                    <option value="">— Pilih —</option>
                    {tutors.map((t) => (
                      <option key={t.tutor_id} value={t.tutor_id}>
                        {t.name}
                      </option>
                    ))}
                  </select>
                </label>
              ) : null}

              <label className="block space-y-(--space-1)">
                <span className="text-(length:--font-size-label) text-secondary">
                  Tanggal
                </span>
                <input
                  type="date"
                  className="min-h-(--target-min) w-full rounded-control border border-line-subtle px-(--space-3)"
                  value={form.date}
                  onChange={(e) => setForm({ ...form, date: e.target.value })}
                />
              </label>

              <label className="block space-y-(--space-1)">
                <span className="text-(length:--font-size-label) text-secondary">
                  Jenis
                </span>
                <select
                  className="min-h-(--target-min) w-full rounded-control border border-line-subtle bg-canvas px-(--space-3)"
                  value={form.work_type}
                  onChange={(e) =>
                    setForm({ ...form, work_type: e.target.value })
                  }
                >
                  {Object.entries(OT_TYPE_LABEL).map(([key, label]) => (
                    <option key={key} value={key}>
                      {label}
                    </option>
                  ))}
                </select>
              </label>

              <label className="block space-y-(--space-1)">
                <span className="text-(length:--font-size-label) text-secondary">
                  Jam Mulai
                </span>
                <input
                  type="time"
                  className="min-h-(--target-min) w-full rounded-control border border-line-subtle px-(--space-3)"
                  value={form.start_time}
                  onChange={(e) =>
                    setForm({ ...form, start_time: e.target.value })
                  }
                />
              </label>

              <label className="block space-y-(--space-1)">
                <span className="text-(length:--font-size-label) text-secondary">
                  Jam Selesai
                </span>
                <input
                  type="time"
                  className="min-h-(--target-min) w-full rounded-control border border-line-subtle px-(--space-3)"
                  value={form.end_time}
                  onChange={(e) =>
                    setForm({ ...form, end_time: e.target.value })
                  }
                />
              </label>

              <label className="block space-y-(--space-1) sm:col-span-2">
                <span className="text-(length:--font-size-label) text-secondary">
                  Alasan
                </span>
                <textarea
                  rows={2}
                  className="w-full rounded-control border border-line-subtle px-(--space-3) py-(--space-2)"
                  value={form.reason}
                  onChange={(e) => setForm({ ...form, reason: e.target.value })}
                />
              </label>

              <label className="block space-y-(--space-1) sm:col-span-2">
                <span className="text-(length:--font-size-label) text-secondary">
                  Nilai Lembur (Rp)
                </span>
                <input
                  type="number"
                  className="min-h-(--target-min) w-full rounded-control border border-line-subtle px-(--space-3)"
                  value={form.amount}
                  onChange={(e) =>
                    setForm({ ...form, amount: Number(e.target.value) })
                  }
                  data-testid="input-ot-amount"
                />
              </label>
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
                data-testid="btn-save-ot"
                onClick={handleSubmit}
              >
                Ajukan
              </Button>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}

export default function LemburPage() {
  return (
    <ProtectedRoute
      roles={["owner", "admin_akademik", "tentor", "finance"]}
    >
      <AppShell>
        <LemburView />
      </AppShell>
    </ProtectedRoute>
  );
}
