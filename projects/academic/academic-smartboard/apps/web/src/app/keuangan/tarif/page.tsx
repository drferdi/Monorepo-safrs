"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Edit2, Plus, Search, Trash2, X } from "lucide-react";
import { useMemo, useState } from "react";
import { toast } from "sonner";
import { AppShell } from "../../../components/AppShell.tsx";
import { PageHead } from "../../../components/PageHead.tsx";
import { ProtectedRoute } from "../../../components/ProtectedRoute.tsx";
import { StatusBadge } from "../../../components/StatusBadge.tsx";
import { Button } from "../../../components/ui/button.tsx";
import {
  createRate,
  deleteRate,
  listRates,
  listSubjects,
  listTutors,
  type Rate,
  updateRate,
} from "../../../lib/api.ts";
import { FORMAT_LABEL, MODE_LABEL, rupiah } from "../../../lib/labels.ts";

interface RateForm {
  name: string;
  format: string;
  mode: string;
  tutor_id: string;
  subject_id: string;
  duration_min: number;
  amount: number;
  transport_bonus: number;
  active: boolean;
}

function emptyForm(): RateForm {
  return {
    name: "",
    format: "",
    mode: "",
    tutor_id: "",
    subject_id: "",
    duration_min: 90,
    amount: 60000,
    transport_bonus: 0,
    active: true,
  };
}

function rowToForm(row: Rate): RateForm {
  return {
    name: row.name ?? "",
    format: row.format ?? "",
    mode: row.mode ?? "",
    tutor_id: row.tutor_id ?? "",
    subject_id: row.subject_id ?? "",
    duration_min: row.duration_min ?? 90,
    amount: row.amount ?? 60000,
    transport_bonus: row.transport_bonus ?? 0,
    active: row.active ?? true,
  };
}

function TarifView() {
  const qc = useQueryClient();
  const [search, setSearch] = useState("");
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState<Rate | null>(null);
  const [form, setForm] = useState<RateForm>(emptyForm);

  const ratesQ = useQuery({ queryKey: ["rates"], queryFn: listRates });
  const tutorsQ = useQuery({ queryKey: ["tutors"], queryFn: listTutors });
  const subjectsQ = useQuery({ queryKey: ["subjects"], queryFn: listSubjects });

  const rates = ratesQ.data ?? [];
  const tutors = tutorsQ.data ?? [];
  const subjects = subjectsQ.data ?? [];

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return rates;
    return rates.filter((r) => (r.name ?? "").toLowerCase().includes(q));
  }, [rates, search]);

  const saveM = useMutation({
    mutationFn: async () => {
      const payload: Record<string, unknown> = {
        ...form,
        tutor_id: form.tutor_id || null,
        subject_id: form.subject_id || null,
      };
      if (editing) {
        return updateRate(editing.rate_id, payload);
      }
      return createRate(payload);
    },
    onSuccess: () => {
      toast.success(
        editing ? "Tarif berhasil diperbarui." : "Tarif berhasil ditambahkan.",
      );
      setShowForm(false);
      setEditing(null);
      setForm(emptyForm());
      void qc.invalidateQueries({ queryKey: ["rates"] });
    },
    onError: (e: unknown) => {
      const detail =
        e && typeof e === "object" && "response" in e
          ? (e as { response?: { data?: { detail?: string } } }).response?.data
              ?.detail
          : undefined;
      toast.error(detail || "Gagal menyimpan data.");
    },
  });

  const deleteM = useMutation({
    mutationFn: (rateId: string) => deleteRate(rateId),
    onSuccess: () => {
      toast.success("Tarif berhasil dihapus.");
      void qc.invalidateQueries({ queryKey: ["rates"] });
    },
    onError: () => {
      toast.error("Gagal menghapus data.");
    },
  });

  function openNew(): void {
    setForm(emptyForm());
    setEditing(null);
    setShowForm(true);
  }

  function openEdit(row: Rate): void {
    setForm(rowToForm(row));
    setEditing(row);
    setShowForm(true);
  }

  function handleSave(): void {
    if (!form.name.trim()) {
      toast.error("Kolom Nama Tarif wajib diisi.");
      return;
    }
    saveM.mutate();
  }

  function handleDelete(row: Rate): void {
    if (!window.confirm("Hapus Tarif? Tindakan ini tidak dapat dibatalkan.")) {
      return;
    }
    deleteM.mutate(row.rate_id);
  }

  return (
    <div className="space-y-(--space-5)">
      <PageHead
        seq="KEU"
        eyebrow="Keuangan"
        title="Tarif"
        lede="Tarif per sesi yang dipakai mesin honor. Perubahan berlaku untuk sesi yang belum terverifikasi."
        actions={
          <Button
            type="button"
            size="sm"
            data-testid="btn-add-rates"
            onClick={openNew}
          >
            <Plus size={14} aria-hidden /> Tambah
          </Button>
        }
      />

      <div className="rounded-control border border-line-subtle p-(--space-4)">
        <label className="block space-y-(--space-2)">
          <span className="text-(length:--font-size-label) text-secondary">
            Pencarian
          </span>
          <div className="relative">
            <Search
              size={16}
              className="pointer-events-none absolute top-1/2 left-(--space-3) -translate-y-1/2 text-secondary"
              aria-hidden
            />
            <input
              type="search"
              placeholder="Cari tarif…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              data-testid="search-rates"
              className="min-h-(--target-min) w-full rounded-control border border-line-subtle bg-canvas py-(--space-2) pr-(--space-3) pl-(--space-8)"
            />
          </div>
        </label>
      </div>

      <div className="flex flex-wrap items-baseline justify-between gap-(--space-2)">
        <p className="text-(length:--font-size-body) font-medium text-primary">
          {filtered.length} data
        </p>
        <p className="text-(length:--font-size-label) text-secondary">
          {search ? "Hasil pencarian" : "Seluruh data aktif"}
        </p>
      </div>

      <div className="overflow-x-auto rounded-control border border-line-subtle">
        <table className="min-w-full border-collapse text-(length:--font-size-body)">
          <thead>
            <tr className="border-b border-line-subtle bg-surface">
              <th className="px-(--space-3) py-(--space-2) text-left">Nama</th>
              <th className="px-(--space-3) py-(--space-2) text-left">
                Format
              </th>
              <th className="px-(--space-3) py-(--space-2) text-left">Mode</th>
              <th className="px-(--space-3) py-(--space-2) text-left">
                Durasi
              </th>
              <th className="px-(--space-3) py-(--space-2) text-left">Tarif</th>
              <th className="px-(--space-3) py-(--space-2) text-left">
                Transport
              </th>
              <th className="px-(--space-3) py-(--space-2) text-left">
                Status
              </th>
              <th className="px-(--space-3) py-(--space-2) text-left">Aksi</th>
            </tr>
          </thead>
          <tbody>
            {filtered.length === 0 ? (
              <tr>
                <td
                  colSpan={8}
                  className="px-(--space-3) py-(--space-4) text-center text-secondary"
                >
                  {search
                    ? "Tidak ada entri yang cocok dengan pencarian."
                    : "Belum ada data."}
                </td>
              </tr>
            ) : (
              filtered.map((row) => (
                <tr key={row.rate_id} className="border-b border-line-subtle">
                  <td className="px-(--space-3) py-(--space-2) font-medium">
                    {row.name}
                  </td>
                  <td className="px-(--space-3) py-(--space-2)">
                    {(FORMAT_LABEL as Record<string, string>)[
                      row.format ?? ""
                    ] ?? "—"}
                  </td>
                  <td className="px-(--space-3) py-(--space-2)">
                    {(MODE_LABEL as Record<string, string>)[row.mode ?? ""] ??
                      "—"}
                  </td>
                  <td className="px-(--space-3) py-(--space-2)">
                    {row.duration_min}
                  </td>
                  <td className="px-(--space-3) py-(--space-2)">
                    {rupiah(row.amount)}
                  </td>
                  <td className="px-(--space-3) py-(--space-2)">
                    {rupiah(row.transport_bonus)}
                  </td>
                  <td className="px-(--space-3) py-(--space-2)">
                    {row.active ? (
                      <StatusBadge tone="success">Aktif</StatusBadge>
                    ) : (
                      <StatusBadge tone="neutral">—</StatusBadge>
                    )}
                  </td>
                  <td className="px-(--space-3) py-(--space-2)">
                    <div className="flex gap-(--space-2)">
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        data-testid={`btn-edit-${row.rate_id}`}
                        aria-label="Ubah Tarif"
                        onClick={() => openEdit(row)}
                      >
                        <Edit2 size={15} aria-hidden />
                      </Button>
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        data-testid={`btn-del-${row.rate_id}`}
                        aria-label="Hapus Tarif"
                        className="text-critical"
                        onClick={() => handleDelete(row)}
                      >
                        <Trash2 size={15} aria-hidden />
                      </Button>
                    </div>
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
            aria-label={editing ? "Ubah Tarif" : "Tambah Tarif"}
          >
            <div className="mb-(--space-4) flex items-center justify-between">
              <h2 className="font-semibold text-primary">
                {editing ? "Ubah" : "Tambah"} Tarif
              </h2>
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
              <label className="block space-y-(--space-1) sm:col-span-2">
                <span className="text-(length:--font-size-label) text-secondary">
                  Nama Tarif *
                </span>
                <input
                  type="text"
                  className="min-h-(--target-min) w-full rounded-control border border-line-subtle px-(--space-3)"
                  value={form.name}
                  onChange={(e) => setForm({ ...form, name: e.target.value })}
                  data-testid="field-name"
                />
              </label>

              <label className="block space-y-(--space-1)">
                <span className="text-(length:--font-size-label) text-secondary">
                  Format
                </span>
                <select
                  className="min-h-(--target-min) w-full rounded-control border border-line-subtle bg-canvas px-(--space-3)"
                  value={form.format}
                  onChange={(e) => setForm({ ...form, format: e.target.value })}
                  data-testid="field-format"
                >
                  <option value="">— Pilih —</option>
                  {Object.entries(FORMAT_LABEL).map(([value, label]) => (
                    <option key={value} value={value}>
                      {label}
                    </option>
                  ))}
                </select>
              </label>

              <label className="block space-y-(--space-1)">
                <span className="text-(length:--font-size-label) text-secondary">
                  Mode
                </span>
                <select
                  className="min-h-(--target-min) w-full rounded-control border border-line-subtle bg-canvas px-(--space-3)"
                  value={form.mode}
                  onChange={(e) => setForm({ ...form, mode: e.target.value })}
                  data-testid="field-mode"
                >
                  <option value="">— Pilih —</option>
                  {Object.entries(MODE_LABEL).map(([value, label]) => (
                    <option key={value} value={value}>
                      {label}
                    </option>
                  ))}
                </select>
              </label>

              <label className="block space-y-(--space-1)">
                <span className="text-(length:--font-size-label) text-secondary">
                  Tentor (opsional)
                </span>
                <select
                  className="min-h-(--target-min) w-full rounded-control border border-line-subtle bg-canvas px-(--space-3)"
                  value={form.tutor_id}
                  onChange={(e) =>
                    setForm({ ...form, tutor_id: e.target.value })
                  }
                  data-testid="field-tutor_id"
                >
                  <option value="">— Pilih —</option>
                  {tutors.map((t) => (
                    <option key={t.tutor_id} value={t.tutor_id}>
                      {t.name}
                    </option>
                  ))}
                </select>
              </label>

              <label className="block space-y-(--space-1)">
                <span className="text-(length:--font-size-label) text-secondary">
                  Mapel (opsional)
                </span>
                <select
                  className="min-h-(--target-min) w-full rounded-control border border-line-subtle bg-canvas px-(--space-3)"
                  value={form.subject_id}
                  onChange={(e) =>
                    setForm({ ...form, subject_id: e.target.value })
                  }
                  data-testid="field-subject_id"
                >
                  <option value="">— Pilih —</option>
                  {subjects.map((s) => (
                    <option key={s.subject_id} value={s.subject_id}>
                      {s.name}
                    </option>
                  ))}
                </select>
              </label>

              <label className="block space-y-(--space-1)">
                <span className="text-(length:--font-size-label) text-secondary">
                  Durasi (menit)
                </span>
                <input
                  type="number"
                  className="min-h-(--target-min) w-full rounded-control border border-line-subtle px-(--space-3)"
                  value={form.duration_min}
                  onChange={(e) =>
                    setForm({
                      ...form,
                      duration_min: Number(e.target.value),
                    })
                  }
                  data-testid="field-duration_min"
                />
              </label>

              <label className="block space-y-(--space-1)">
                <span className="text-(length:--font-size-label) text-secondary">
                  Tarif (Rp)
                </span>
                <input
                  type="number"
                  className="min-h-(--target-min) w-full rounded-control border border-line-subtle px-(--space-3)"
                  value={form.amount}
                  onChange={(e) =>
                    setForm({ ...form, amount: Number(e.target.value) })
                  }
                  data-testid="field-amount"
                />
              </label>

              <label className="block space-y-(--space-1) sm:col-span-2">
                <span className="text-(length:--font-size-label) text-secondary">
                  Bonus Transport (Rp)
                </span>
                <input
                  type="number"
                  className="min-h-(--target-min) w-full rounded-control border border-line-subtle px-(--space-3)"
                  value={form.transport_bonus}
                  onChange={(e) =>
                    setForm({
                      ...form,
                      transport_bonus: Number(e.target.value),
                    })
                  }
                  data-testid="field-transport_bonus"
                />
              </label>

              <label className="block space-y-(--space-1) sm:col-span-2">
                <span className="text-(length:--font-size-label) text-secondary">
                  Status
                </span>
                <select
                  className="min-h-(--target-min) w-full rounded-control border border-line-subtle bg-canvas px-(--space-3)"
                  value={form.active ? "1" : "0"}
                  onChange={(e) =>
                    setForm({ ...form, active: e.target.value === "1" })
                  }
                  data-testid="field-active"
                >
                  <option value="1">Aktif</option>
                  <option value="0">Tidak aktif</option>
                </select>
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
                data-testid="btn-save-master"
                onClick={handleSave}
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

export default function TarifPage() {
  return (
    <ProtectedRoute roles={["owner", "finance"]}>
      <AppShell>
        <TarifView />
      </AppShell>
    </ProtectedRoute>
  );
}
