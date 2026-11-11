"use client";

import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Plus, X } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { AppShell } from "../../components/AppShell.tsx";
import { PageHead } from "../../components/PageHead.tsx";
import { ProtectedRoute } from "../../components/ProtectedRoute.tsx";
import { StatusBadge } from "../../components/StatusBadge.tsx";
import { Button } from "../../components/ui/button.tsx";
import { createTask, listTasks, listTutors, patchTask } from "../../lib/api.ts";
import { useAuth } from "../../lib/auth.tsx";
import type { StatusBadgeTone } from "../../lib/labels.ts";

const CAT_LABEL: Record<string, string> = {
  siapkan_materi: "Siapkan Materi",
  buat_soal: "Buat Soal",
  periksa_tugas: "Periksa Tugas",
  isi_evaluasi: "Isi Evaluasi",
  hubungi_ortu: "Hubungi Orang Tua",
  rapat: "Rapat",
  pelaporan: "Pelaporan",
  administrasi: "Administrasi",
  lainnya: "Lainnya",
};

const STATUS_LABEL: Record<string, string> = {
  belum_dimulai: "Belum Dimulai",
  berjalan: "Berjalan",
  menunggu_review: "Menunggu Review",
  selesai: "Selesai",
  terlambat: "Terlambat",
  dibatalkan: "Dibatalkan",
};

const STATUS_TONE: Record<string, StatusBadgeTone> = {
  belum_dimulai: "neutral",
  berjalan: "info",
  menunggu_review: "warning",
  selesai: "success",
  terlambat: "critical",
  dibatalkan: "neutral",
};

const PRIO_TONE: Record<string, StatusBadgeTone> = {
  high: "critical",
  normal: "info",
  low: "neutral",
};

function emptyForm() {
  return {
    title: "",
    description: "",
    tutor_id: "",
    category: "administrasi",
    priority: "normal",
    due_date: "",
  };
}

function TasksView() {
  const { user } = useAuth();
  const qc = useQueryClient();
  const [statusF, setStatusF] = useState("");
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState(emptyForm);

  const tasksQ = useQuery({
    queryKey: ["tasks", statusF],
    queryFn: () => listTasks(statusF ? { status: statusF } : {}),
  });
  const tutorsQ = useQuery({ queryKey: ["tutors"], queryFn: listTutors });

  const tasks = tasksQ.data ?? [];
  const tutors = tutorsQ.data ?? [];

  async function submit(): Promise<void> {
    if (!form.title) {
      toast.error("Judul wajib diisi");
      return;
    }
    if (user?.role !== "tentor" && !form.tutor_id) {
      toast.error("Pilih pengajar");
      return;
    }
    try {
      await createTask(form);
      toast.success("Task ditambahkan");
      setShowForm(false);
      setForm(emptyForm());
      void qc.invalidateQueries({ queryKey: ["tasks"] });
    } catch {
      toast.error("Gagal menyimpan");
    }
  }

  async function setStatus(taskId: string, status: string): Promise<void> {
    try {
      await patchTask(taskId, { status });
      toast.success("Status diperbarui");
      void qc.invalidateQueries({ queryKey: ["tasks"] });
    } catch {
      toast.error("Gagal");
    }
  }

  return (
    <div className="space-y-(--space-5)">
      <PageHead
        seq="PGJ"
        eyebrow="Pengajar"
        title="Task & Rutinitas Pengajar"
        lede="Task 'Isi evaluasi' dibuat otomatis saat pengajar melakukan check-in pada sesi."
        actions={
          <>
            <select
              value={statusF}
              onChange={(e) => setStatusF(e.target.value)}
              data-testid="filter-task-status"
              className="min-h-(--target-min) rounded-control border border-line-subtle bg-canvas px-(--space-3)"
            >
              <option value="">Semua Status</option>
              {Object.entries(STATUS_LABEL).map(([k, v]) => (
                <option key={k} value={k}>
                  {v}
                </option>
              ))}
            </select>
            <Button
              type="button"
              size="sm"
              data-testid="btn-add-task"
              onClick={() => setShowForm(true)}
            >
              <Plus size={14} aria-hidden /> Tambah Task
            </Button>
          </>
        }
      />

      <div className="flex flex-wrap items-baseline justify-between gap-(--space-2)">
        <p className="text-(length:--font-size-body) font-medium text-primary">
          {tasks.length} task
        </p>
        <p className="hidden text-(length:--font-size-label) text-secondary sm:block">
          {statusF ? STATUS_LABEL[statusF] : "Semua status"}
        </p>
      </div>

      <div className="overflow-x-auto rounded-control border border-line-subtle">
        <table className="min-w-full border-collapse text-(length:--font-size-body)">
          <thead>
            <tr className="border-b border-line-subtle bg-surface">
              <th className="px-(--space-3) py-(--space-2) text-left">Judul</th>
              <th className="px-(--space-3) py-(--space-2) text-left">
                Pengajar
              </th>
              <th className="px-(--space-3) py-(--space-2) text-left">
                Kategori
              </th>
              <th className="px-(--space-3) py-(--space-2) text-left">
                Prioritas
              </th>
              <th className="px-(--space-3) py-(--space-2) text-left">
                Tenggat
              </th>
              <th className="px-(--space-3) py-(--space-2) text-left">
                Status
              </th>
              <th className="px-(--space-3) py-(--space-2) text-left">Aksi</th>
            </tr>
          </thead>
          <tbody>
            {tasks.length === 0 ? (
              <tr>
                <td
                  colSpan={7}
                  className="px-(--space-3) py-(--space-4) text-center text-secondary"
                >
                  Tidak ada task.
                </td>
              </tr>
            ) : (
              tasks.map((t) => (
                <tr
                  key={t.task_id}
                  data-testid={`row-task-${t.task_id}`}
                  className="border-b border-line-subtle"
                >
                  <td className="px-(--space-3) py-(--space-2)">
                    <div className="font-semibold text-primary">{t.title}</div>
                    {t.auto_generated ? (
                      <StatusBadge tone="info">
                        <span className="text-(length:--font-size-label)">
                          Otomatis
                        </span>
                      </StatusBadge>
                    ) : null}
                    {t.description ? (
                      <div className="text-(length:--font-size-label) text-secondary">
                        {t.description}
                      </div>
                    ) : null}
                  </td>
                  <td className="px-(--space-3) py-(--space-2)">
                    {tutors.find((x) => x.tutor_id === t.tutor_id)?.name || "—"}
                  </td>
                  <td className="px-(--space-3) py-(--space-2) text-(length:--font-size-label)">
                    {CAT_LABEL[t.category] ?? t.category}
                  </td>
                  <td className="px-(--space-3) py-(--space-2)">
                    <StatusBadge tone={PRIO_TONE[t.priority] ?? "neutral"}>
                      {t.priority}
                    </StatusBadge>
                  </td>
                  <td className="px-(--space-3) py-(--space-2) tabular-nums">
                    {t.due_date || "—"}
                  </td>
                  <td className="px-(--space-3) py-(--space-2)">
                    <StatusBadge tone={STATUS_TONE[t.status] ?? "neutral"}>
                      {STATUS_LABEL[t.status] ?? t.status}
                    </StatusBadge>
                  </td>
                  <td className="px-(--space-3) py-(--space-2)">
                    {t.status !== "selesai" && t.status !== "dibatalkan" ? (
                      <div className="flex flex-wrap gap-(--space-2)">
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          data-testid={`btn-start-${t.task_id}`}
                          onClick={() => void setStatus(t.task_id, "berjalan")}
                        >
                          Mulai
                        </Button>
                        <Button
                          type="button"
                          size="sm"
                          data-testid={`btn-done-${t.task_id}`}
                          onClick={() => void setStatus(t.task_id, "selesai")}
                        >
                          Selesai
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
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-(--space-4)">
          <button
            type="button"
            aria-label="Tutup"
            tabIndex={-1}
            className="absolute inset-0 cursor-default"
            onClick={() => setShowForm(false)}
          />
          <div
            className="relative w-full max-w-lg rounded-control border border-line-subtle bg-canvas p-(--space-4)"
            role="dialog"
            aria-modal="true"
            aria-label="Tambah task"
          >
            <div className="mb-(--space-4) flex items-center justify-between">
              <h2 className="font-semibold text-primary">Tambah Task</h2>
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
                  Judul *
                </span>
                <input
                  className="min-h-(--target-min) w-full rounded-control border border-line-subtle px-(--space-3)"
                  data-testid="input-task-title"
                  value={form.title}
                  onChange={(e) => setForm({ ...form, title: e.target.value })}
                />
              </label>
              <label className="block space-y-(--space-1) sm:col-span-2">
                <span className="text-(length:--font-size-label) text-secondary">
                  Deskripsi
                </span>
                <textarea
                  rows={2}
                  className="w-full rounded-control border border-line-subtle px-(--space-3) py-(--space-2)"
                  value={form.description}
                  onChange={(e) =>
                    setForm({ ...form, description: e.target.value })
                  }
                />
              </label>
              {user?.role !== "tentor" ? (
                <label className="block space-y-(--space-1)">
                  <span className="text-(length:--font-size-label) text-secondary">
                    Pengajar *
                  </span>
                  <select
                    className="min-h-(--target-min) w-full rounded-control border border-line-subtle bg-canvas px-(--space-3)"
                    data-testid="select-task-tutor"
                    value={form.tutor_id}
                    onChange={(e) =>
                      setForm({ ...form, tutor_id: e.target.value })
                    }
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
                  Kategori
                </span>
                <select
                  className="min-h-(--target-min) w-full rounded-control border border-line-subtle bg-canvas px-(--space-3)"
                  data-testid="select-task-cat"
                  value={form.category}
                  onChange={(e) =>
                    setForm({ ...form, category: e.target.value })
                  }
                >
                  {Object.entries(CAT_LABEL).map(([k, v]) => (
                    <option key={k} value={k}>
                      {v}
                    </option>
                  ))}
                </select>
              </label>
              <label className="block space-y-(--space-1)">
                <span className="text-(length:--font-size-label) text-secondary">
                  Prioritas
                </span>
                <select
                  className="min-h-(--target-min) w-full rounded-control border border-line-subtle bg-canvas px-(--space-3)"
                  value={form.priority}
                  onChange={(e) =>
                    setForm({ ...form, priority: e.target.value })
                  }
                >
                  <option value="low">Rendah</option>
                  <option value="normal">Normal</option>
                  <option value="high">Tinggi</option>
                </select>
              </label>
              <label className="block space-y-(--space-1)">
                <span className="text-(length:--font-size-label) text-secondary">
                  Tenggat
                </span>
                <input
                  type="date"
                  className="min-h-(--target-min) w-full rounded-control border border-line-subtle px-(--space-3)"
                  value={form.due_date}
                  onChange={(e) =>
                    setForm({ ...form, due_date: e.target.value })
                  }
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
                data-testid="btn-save-task"
                onClick={() => void submit()}
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

export default function TasksPage() {
  return (
    <ProtectedRoute roles={["owner", "admin_akademik", "tentor"]}>
      <AppShell>
        <TasksView />
      </AppShell>
    </ProtectedRoute>
  );
}
