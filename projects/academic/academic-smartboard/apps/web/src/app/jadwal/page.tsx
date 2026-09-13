"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Plus } from "lucide-react";
import { useMemo, useState } from "react";
import { toast } from "sonner";
import { AppShell } from "../../components/AppShell.tsx";
import { ChipTabs } from "../../components/ChipTabs.tsx";
import { PageHead } from "../../components/PageHead.tsx";
import { ProtectedRoute } from "../../components/ProtectedRoute.tsx";
import { Button } from "../../components/ui/button.tsx";
import {
  createSchedule,
  deleteSchedule,
  listGradeLevels,
  listSchedules,
  listSchools,
  listStudents,
  listSubjects,
  listTutors,
  updateSchedule,
  type Schedule,
  type ScheduleCreate,
} from "../../lib/api.ts";
import { useAuth } from "../../lib/auth.tsx";
import { FORMAT_LABEL } from "../../lib/labels.ts";
import {
  addDays,
  schedulesInDay,
  toIsoDate,
  weekDays,
} from "../../lib/week.ts";

const DAY_NAMES = ["Min", "Sen", "Sel", "Rab", "Kam", "Jum", "Sab"];

function initForm(): ScheduleCreate {
  return {
    student_ids: [],
    tutor_id: "",
    subject_id: "",
    school_id: "",
    grade_id: "",
    format: "privat",
    mode: "di_tempat",
    location: "",
    date: new Date().toISOString().slice(0, 10),
    start_time: "16:00",
    end_time: "17:30",
    is_recurring: false,
    recurrence_days: [],
    recurrence_until: "",
    notes: "",
  };
}

function JadwalView() {
  const { user } = useAuth();
  const canManage =
    user?.role === "owner" || user?.role === "admin_akademik";
  const queryClient = useQueryClient();
  const [view, setView] = useState<"week" | "list">("week");
  const [anchor, setAnchor] = useState(() => new Date());
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState<ScheduleCreate>(initForm);

  const schedulesQ = useQuery({ queryKey: ["schedules"], queryFn: listSchedules });
  const tutorsQ = useQuery({ queryKey: ["tutors"], queryFn: listTutors });
  const studentsQ = useQuery({ queryKey: ["students"], queryFn: listStudents });
  const subjectsQ = useQuery({ queryKey: ["subjects"], queryFn: listSubjects });
  const schoolsQ = useQuery({ queryKey: ["schools"], queryFn: listSchools });
  const gradesQ = useQuery({ queryKey: ["grades"], queryFn: listGradeLevels });

  const days = useMemo(() => weekDays(anchor), [anchor]);
  const schedules = schedulesQ.data ?? [];

  const saveMut = useMutation({
    mutationFn: async () => {
      if (!form.tutor_id || !form.subject_id || form.student_ids.length === 0) {
        throw new Error("Lengkapi tentor, mata pelajaran, dan minimal 1 murid.");
      }
      if (editingId) return updateSchedule(editingId, form);
      return createSchedule(form);
    },
    onSuccess: () => {
      toast.success(editingId ? "Jadwal diperbarui." : "Jadwal dibuat.");
      setShowForm(false);
      setEditingId(null);
      setForm(initForm());
      void queryClient.invalidateQueries({ queryKey: ["schedules"] });
    },
    onError: (e: Error) => toast.error(e.message || "Gagal menyimpan jadwal"),
  });

  const delMut = useMutation({
    mutationFn: deleteSchedule,
    onSuccess: () => {
      toast.success("Jadwal dihapus.");
      void queryClient.invalidateQueries({ queryKey: ["schedules"] });
    },
    onError: () => toast.error("Gagal menghapus"),
  });

  function openEdit(s: Schedule) {
    setEditingId(s.schedule_id);
    setForm({
      student_ids: s.student_ids ?? [],
      tutor_id: s.tutor_id ?? "",
      subject_id: s.subject_id ?? "",
      school_id: s.school_id ?? "",
      grade_id: s.grade_id ?? "",
      format: s.format || "privat",
      mode: s.mode || "di_tempat",
      location: s.location ?? "",
      date: s.date,
      start_time: s.start_time,
      end_time: s.end_time,
      is_recurring: Boolean(s.is_recurring),
      recurrence_days: s.recurrence_days ?? [],
      recurrence_until: s.recurrence_until ?? "",
      notes: s.notes ?? "",
    });
    setShowForm(true);
  }

  return (
    <div className="space-y-(--space-5)">
      <PageHead
        seq="OPS"
        eyebrow="Operasional"
        title="Kalender & Jadwal"
        lede="Jadwal berulang yang menurunkan sesi pembelajaran. Perubahan jadwal tidak mengubah sesi yang sudah terbit."
        actions={
          <>
            <ChipTabs
              value={view}
              onChange={(id) => setView(id as "week" | "list")}
              options={[
                { id: "week", label: "Mingguan", testId: "view-week" },
                { id: "list", label: "Daftar", testId: "view-list" },
              ]}
            />
            {canManage ? (
              <Button
                type="button"
                data-testid="btn-tambah-jadwal"
                onClick={() => {
                  setEditingId(null);
                  setForm(initForm());
                  setShowForm(true);
                }}
              >
                <Plus size={14} aria-hidden /> Tambah jadwal
              </Button>
            ) : null}
          </>
        }
      />

      {view === "week" ? (
        <section className="rounded-control border border-line-subtle bg-canvas p-(--space-4)">
          <div className="mb-(--space-4) flex flex-wrap items-center gap-(--space-3)">
            <Button
              type="button"
              variant="ghost"
              data-testid="btn-prev-week"
              aria-label="Minggu sebelumnya"
              onClick={() => setAnchor(addDays(anchor, -7))}
            >
              ‹
            </Button>
            <span className="text-(length:--font-size-title-section) font-semibold text-primary">
              {days[0]?.toLocaleDateString("id-ID", {
                day: "numeric",
                month: "short",
              })}{" "}
              —{" "}
              {days[6]?.toLocaleDateString("id-ID", {
                day: "numeric",
                month: "short",
                year: "numeric",
              })}
            </span>
            <Button
              type="button"
              variant="ghost"
              data-testid="btn-next-week"
              aria-label="Minggu berikutnya"
              onClick={() => setAnchor(addDays(anchor, 7))}
            >
              ›
            </Button>
            <Button type="button" variant="ghost" onClick={() => setAnchor(new Date())}>
              Hari Ini
            </Button>
          </div>
          <div className="grid gap-(--space-2) md:grid-cols-7">
            {days.map((d) => {
              const key = toIsoDate(d);
              const items = schedulesInDay(schedules, key);
              return (
                <div
                  key={key}
                  className="min-h-40 rounded-control border border-line-subtle bg-surface p-(--space-2)"
                >
                  <div className="mb-(--space-2) text-(length:--font-size-label) text-secondary">
                    {DAY_NAMES[d.getDay()]}{" "}
                    <span className="font-semibold text-primary">{d.getDate()}</span>
                  </div>
                  <div className="space-y-(--space-2)">
                    {items.map((s) => {
                      const tut = tutorsQ.data?.find((t) => t.tutor_id === s.tutor_id);
                      const sub = subjectsQ.data?.find(
                        (x) => x.subject_id === s.subject_id,
                      );
                      return (
                        <div
                          key={s.schedule_id}
                          data-testid={`sched-${s.schedule_id}`}
                          className="rounded-control border border-line-subtle bg-canvas p-(--space-2) text-(length:--font-size-label)"
                        >
                          <div className="font-medium text-primary">
                            {s.start_time}—{s.end_time}
                          </div>
                          <div className="text-primary">{sub?.name ?? "?"}</div>
                          <div className="text-secondary">{tut?.name}</div>
                          <div className="text-secondary">
                            {FORMAT_LABEL[s.format as keyof typeof FORMAT_LABEL] ??
                              s.format}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              );
            })}
          </div>
        </section>
      ) : (
        <div className="overflow-x-auto rounded-control border border-line-subtle">
          <table className="w-full text-left text-(length:--font-size-body)">
            <thead className="bg-surface text-secondary">
              <tr>
                <th className="px-(--space-3) py-(--space-2)">Tanggal</th>
                <th className="px-(--space-3) py-(--space-2)">Waktu</th>
                <th className="px-(--space-3) py-(--space-2)">Mapel</th>
                <th className="px-(--space-3) py-(--space-2)">Pengajar</th>
                {canManage ? (
                  <th className="px-(--space-3) py-(--space-2)">Aksi</th>
                ) : null}
              </tr>
            </thead>
            <tbody>
              {schedules.map((s) => {
                const tut = tutorsQ.data?.find((t) => t.tutor_id === s.tutor_id);
                const sub = subjectsQ.data?.find((x) => x.subject_id === s.subject_id);
                return (
                  <tr
                    key={s.schedule_id}
                    data-testid={`row-sched-${s.schedule_id}`}
                    className="border-t border-line-subtle"
                  >
                    <td className="px-(--space-3) py-(--space-2)">{s.date}</td>
                    <td className="px-(--space-3) py-(--space-2)">
                      {s.start_time}—{s.end_time}
                    </td>
                    <td className="px-(--space-3) py-(--space-2)">{sub?.name}</td>
                    <td className="px-(--space-3) py-(--space-2)">{tut?.name}</td>
                    {canManage ? (
                      <td className="px-(--space-3) py-(--space-2)">
                        <Button
                          type="button"
                          variant="ghost"
                          data-testid={`btn-edit-sched-${s.schedule_id}`}
                          onClick={() => openEdit(s)}
                        >
                          Edit
                        </Button>
                        <Button
                          type="button"
                          variant="ghost"
                          data-testid={`btn-del-sched-${s.schedule_id}`}
                          onClick={() => {
                            if (
                              window.confirm(
                                "Hapus jadwal? Sesi terkait yang belum selesai akan dibatalkan.",
                              )
                            ) {
                              delMut.mutate(s.schedule_id);
                            }
                          }}
                        >
                          Hapus
                        </Button>
                      </td>
                    ) : null}
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {showForm ? (
        <div
          className="fixed inset-0 z-(--z-drawer) flex items-center justify-center bg-black/40 p-(--space-4)"
          role="dialog"
          aria-modal="true"
        >
          <div className="max-h-[90vh] w-full max-w-lg overflow-y-auto rounded-control border border-line-subtle bg-canvas p-(--space-5)">
            <h2 className="mb-(--space-4) text-(length:--font-size-title-section) font-semibold">
              {editingId ? "Edit jadwal" : "Tambah jadwal"}
            </h2>
            <div className="space-y-(--space-3)">
              <label className="block text-(length:--font-size-label) text-secondary">
                Tanggal
                <input
                  data-testid="input-date"
                  type="date"
                  className="mt-(--space-1) w-full rounded-control border border-line-subtle px-(--space-3) py-(--space-2)"
                  value={form.date}
                  onChange={(e) => setForm({ ...form, date: e.target.value })}
                />
              </label>
              <label className="block text-(length:--font-size-label) text-secondary">
                Pengajar
                <select
                  data-testid="select-tutor"
                  className="mt-(--space-1) w-full rounded-control border border-line-subtle px-(--space-3) py-(--space-2)"
                  value={form.tutor_id}
                  onChange={(e) => setForm({ ...form, tutor_id: e.target.value })}
                >
                  <option value="">Pilih</option>
                  {(tutorsQ.data ?? []).map((t) => (
                    <option key={t.tutor_id} value={t.tutor_id}>
                      {t.name}
                    </option>
                  ))}
                </select>
              </label>
              <label className="block text-(length:--font-size-label) text-secondary">
                Mata pelajaran
                <select
                  data-testid="select-subject"
                  className="mt-(--space-1) w-full rounded-control border border-line-subtle px-(--space-3) py-(--space-2)"
                  value={form.subject_id}
                  onChange={(e) => setForm({ ...form, subject_id: e.target.value })}
                >
                  <option value="">Pilih</option>
                  {(subjectsQ.data ?? []).map((s) => (
                    <option key={s.subject_id} value={s.subject_id}>
                      {s.name}
                    </option>
                  ))}
                </select>
              </label>
              <fieldset>
                <legend className="text-(length:--font-size-label) text-secondary">
                  Murid
                </legend>
                <div className="mt-(--space-2) max-h-40 space-y-(--space-1) overflow-y-auto">
                  {(studentsQ.data ?? []).map((st) => (
                    <label
                      key={st.student_id}
                      className="flex items-center gap-(--space-2) text-(length:--font-size-body)"
                    >
                      <input
                        type="checkbox"
                        data-testid={`chk-student-${st.student_id}`}
                        checked={form.student_ids.includes(st.student_id)}
                        onChange={(e) => {
                          const next = e.target.checked
                            ? [...form.student_ids, st.student_id]
                            : form.student_ids.filter((id) => id !== st.student_id);
                          setForm({ ...form, student_ids: next });
                        }}
                      />
                      {st.name}
                    </label>
                  ))}
                </div>
              </fieldset>
              {/* silence unused refs for schools/grades until form expands */}
              <span className="sr-only">
                {schoolsQ.data?.length ?? 0}-{gradesQ.data?.length ?? 0}
              </span>
            </div>
            <div className="mt-(--space-5) flex justify-end gap-(--space-2)">
              <Button
                type="button"
                variant="ghost"
                data-testid="btn-cancel"
                onClick={() => setShowForm(false)}
              >
                Batal
              </Button>
              <Button
                type="button"
                data-testid="btn-simpan-jadwal"
                onClick={() => saveMut.mutate()}
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

export default function JadwalPage() {
  return (
    <ProtectedRoute roles={["owner", "admin_akademik", "tentor"]}>
      <AppShell>
        <JadwalView />
      </AppShell>
    </ProtectedRoute>
  );
}
