"use client";

import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Edit2, Plus, Search, Trash2, X } from "lucide-react";
import { useCallback, useMemo, useRef, useState } from "react";
import { toast } from "sonner";
import { AppShell } from "../../../components/AppShell.tsx";
import { PageHead } from "../../../components/PageHead.tsx";
import { ProtectedRoute } from "../../../components/ProtectedRoute.tsx";
import { StatusBadge } from "../../../components/StatusBadge.tsx";
import { Button } from "../../../components/ui/button.tsx";
import {
  createTeamRaw,
  deleteTeamRaw,
  listAcademicYears,
  listGradeLevels,
  listStudents,
  listTeams,
  type Student,
  type Team,
  updateTeamRaw,
} from "../../../lib/api.ts";
import { FORMAT_LABEL } from "../../../lib/labels.ts";
import { getTeamHeadLabel, isPendingApproval } from "../../../lib/teams.ts";

const EMPTY_FORM = {
  name: "",
  head_student_id: "",
  format: "semi_privat",
  grade_order: 1 as number | null,
  grade_id: "",
  academic_year_id: "",
  student_ids: [] as string[],
  notes: "",
  active: true,
};

function TimView() {
  const qc = useQueryClient();
  const saveInFlightRef = useRef(false);
  const deleteInFlightRef = useRef(false);

  const [q, setQ] = useState("");
  const [form, setForm] = useState(EMPTY_FORM);
  const [editing, setEditing] = useState<Team | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [memberAddQ, setMemberAddQ] = useState("");
  const [saving, setSaving] = useState(false);
  const [deletingTeamId, setDeletingTeamId] = useState<string | null>(null);

  const teamsQ = useQuery({ queryKey: ["teams"], queryFn: listTeams });
  const studentsQ = useQuery({ queryKey: ["students"], queryFn: listStudents });
  const gradesQ = useQuery({
    queryKey: ["grade-levels"],
    queryFn: listGradeLevels,
  });
  const yearsQ = useQuery({
    queryKey: ["academic-years"],
    queryFn: listAcademicYears,
  });

  const teams = teamsQ.data ?? [];
  const students = studentsQ.data ?? [];
  const grades = gradesQ.data ?? [];
  const years = yearsQ.data ?? [];
  const loading =
    teamsQ.isPending ||
    studentsQ.isPending ||
    gradesQ.isPending ||
    yearsQ.isPending;
  const loadError =
    teamsQ.isError || studentsQ.isError || gradesQ.isError || yearsQ.isError;

  const studentsById = useMemo(
    () =>
      Object.fromEntries(students.map((s) => [s.student_id, s])) as Record<
        string,
        Student
      >,
    [students],
  );

  const reload = useCallback(async () => {
    await Promise.all([
      qc.invalidateQueries({ queryKey: ["teams"] }),
      qc.invalidateQueries({ queryKey: ["students"] }),
      qc.invalidateQueries({ queryKey: ["grade-levels"] }),
      qc.invalidateQueries({ queryKey: ["academic-years"] }),
    ]);
  }, [qc]);

  const filtered = useMemo(() => {
    if (!q.trim()) return teams;
    const ql = q.trim().toLowerCase();
    return teams.filter((t) => {
      const head = t.head_student_id
        ? studentsById[t.head_student_id]?.name
        : "";
      const members = (t.student_ids || [])
        .map((id) => studentsById[id]?.name || "")
        .join(" ");
      return `${t.name} ${head} ${members} ${t.format} ${t.grade_order}`
        .toLowerCase()
        .includes(ql);
    });
  }, [teams, q, studentsById]);

  const teamMembers = useMemo(() => {
    const ids = form.student_ids || [];
    return ids
      .map((id) => studentsById[id])
      .filter(Boolean)
      .sort((a, b) => {
        if (a.student_id === form.head_student_id) return -1;
        if (b.student_id === form.head_student_id) return 1;
        return (a.name || "").localeCompare(b.name || "", "id");
      });
  }, [form.student_ids, form.head_student_id, studentsById]);

  const addMemberHits = useMemo(() => {
    const qn = memberAddQ.trim().toLowerCase();
    if (qn.length < 2) return [];
    const have = new Set(form.student_ids || []);
    return students
      .filter(
        (s) =>
          !have.has(s.student_id) && (s.name || "").toLowerCase().includes(qn),
      )
      .slice(0, 8);
  }, [memberAddQ, students, form.student_ids]);

  function openNew(): void {
    setForm({ ...EMPTY_FORM });
    setEditing(null);
    setMemberAddQ("");
    setShowForm(true);
  }

  function openEdit(row: Team): void {
    setForm({
      name: row.name || "",
      head_student_id: row.head_student_id || "",
      format: row.format || "semi_privat",
      grade_order: row.grade_order ?? 1,
      grade_id: row.grade_id || "",
      academic_year_id: row.academic_year_id || "",
      student_ids: row.student_ids || [],
      notes: row.notes || "",
      active: row.active !== false,
    });
    setEditing(row);
    setMemberAddQ("");
    setShowForm(true);
  }

  function closeForm(): void {
    setShowForm(false);
  }

  async function save(): Promise<void> {
    if (saveInFlightRef.current) return;
    if (!form.name?.trim()) {
      toast.error("Kolom Nama TIM wajib diisi");
      return;
    }
    if (
      form.head_student_id &&
      !(form.student_ids || []).includes(form.head_student_id)
    ) {
      toast.error("Kepala TIM harus termasuk anggota");
      return;
    }
    const payload = {
      ...form,
      grade_order: form.grade_order === null ? null : Number(form.grade_order),
      head_student_id: form.head_student_id || null,
      grade_id: form.grade_id || null,
      academic_year_id: form.academic_year_id || null,
    };
    saveInFlightRef.current = true;
    setSaving(true);
    try {
      const response = editing
        ? await updateTeamRaw(editing.team_id, payload)
        : await createTeamRaw(payload);
      if (isPendingApproval(response)) {
        toast.info("Perubahan TIM dikirim dan menunggu persetujuan Owner");
      } else {
        toast.success(editing ? "TIM diperbarui" : "TIM ditambahkan");
      }
      closeForm();
      setEditing(null);
      await reload();
    } catch (e: unknown) {
      const detail =
        e && typeof e === "object" && "response" in e
          ? (e as { response?: { data?: { detail?: string } } }).response?.data
              ?.detail
          : undefined;
      toast.error(detail || "Gagal menyimpan");
    } finally {
      saveInFlightRef.current = false;
      setSaving(false);
    }
  }

  async function del(row: Team): Promise<void> {
    if (deleteInFlightRef.current) return;
    if (!window.confirm(`Hapus ${row.name}?`)) return;
    deleteInFlightRef.current = true;
    setDeletingTeamId(row.team_id);
    try {
      const response = await deleteTeamRaw(row.team_id);
      if (isPendingApproval(response)) {
        toast.info("Penghapusan TIM dikirim dan menunggu persetujuan Owner");
      } else {
        toast.success("TIM dihapus");
      }
      await reload();
    } catch {
      toast.error("Gagal hapus");
    } finally {
      deleteInFlightRef.current = false;
      setDeletingTeamId(null);
    }
  }

  const formatLabel = (format: string): string =>
    (FORMAT_LABEL as Record<string, string>)[format] ||
    ({ privat: "Privat", semi_privat: "Semi", reguler: "Reguler" }[format] ??
      format);

  return (
    <div className="space-y-(--space-5)">
      <PageHead
        seq="MST"
        eyebrow="Master Data"
        title="Pembagian TIM"
        lede="Kelompok murid per jenjang beserta kepala TIM. Dipakai saat menyusun jadwal kelas reguler."
        actions={
          <Button type="button" data-testid="btn-add-teams" onClick={openNew}>
            <Plus size={14} aria-hidden /> Tambah
          </Button>
        }
      />

      <div className="rounded-control border border-line-subtle p-(--space-3)">
        <label className="flex items-center gap-(--space-2)">
          <Search size={16} className="text-secondary" aria-hidden />
          <span className="sr-only">Cari TIM</span>
          <input
            type="search"
            placeholder="Cari TIM / kepala…"
            value={q}
            onChange={(e) => setQ(e.target.value)}
            data-testid="search-teams"
            className="min-h-(--target-min) flex-1 rounded-control border border-line-subtle px-(--space-3)"
          />
        </label>
      </div>

      <div className="flex flex-wrap items-baseline justify-between gap-(--space-2)">
        <p className="text-(length:--font-size-body) font-medium text-primary">
          {filtered.length} TIM
        </p>
        <p className="hidden text-(length:--font-size-label) text-secondary sm:block">
          {q ? "Hasil pencarian" : "Semua jenjang"}
        </p>
      </div>

      <div className="overflow-x-auto rounded-control border border-line-subtle">
        <table className="min-w-full border-collapse text-(length:--font-size-body)">
          <thead>
            <tr className="border-b border-line-subtle bg-surface">
              <th
                className="px-(--space-3) py-(--space-2) text-left"
                scope="col"
              >
                Nama
              </th>
              <th
                className="px-(--space-3) py-(--space-2) text-left"
                scope="col"
              >
                Kepala
              </th>
              <th
                className="px-(--space-3) py-(--space-2) text-left"
                scope="col"
              >
                Format
              </th>
              <th
                className="px-(--space-3) py-(--space-2) text-left"
                scope="col"
              >
                Kelas
              </th>
              <th
                className="px-(--space-3) py-(--space-2) text-left"
                scope="col"
              >
                Anggota
              </th>
              <th
                className="px-(--space-3) py-(--space-2) text-left"
                scope="col"
              >
                Status
              </th>
              <th
                className="hidden px-(--space-3) py-(--space-2) sm:table-cell"
                scope="col"
                aria-label="Aksi"
              />
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td
                  colSpan={7}
                  className="px-(--space-3) py-(--space-4) text-center text-secondary"
                >
                  <span role="status">Memuat data TIM…</span>
                </td>
              </tr>
            ) : loadError ? (
              <tr>
                <td
                  colSpan={7}
                  className="px-(--space-3) py-(--space-4) text-center"
                >
                  <div
                    role="alert"
                    className="space-y-(--space-2) text-secondary"
                  >
                    Data TIM gagal dimuat. Tidak ada data yang diubah.{" "}
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => void reload()}
                    >
                      Coba lagi
                    </Button>
                  </div>
                </td>
              </tr>
            ) : teams.length === 0 ? (
              <tr>
                <td
                  colSpan={7}
                  className="px-(--space-3) py-(--space-4) text-center text-secondary"
                >
                  Belum ada TIM. Gunakan tombol Tambah untuk membuat TIM
                  pertama.
                </td>
              </tr>
            ) : filtered.length === 0 ? (
              <tr>
                <td
                  colSpan={7}
                  className="px-(--space-3) py-(--space-4) text-center"
                >
                  <span className="text-secondary">
                    Tidak ada TIM yang cocok.{" "}
                  </span>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => setQ("")}
                  >
                    Hapus filter
                  </Button>
                </td>
              </tr>
            ) : (
              filtered.map((row) => (
                <tr key={row.team_id} className="border-b border-line-subtle">
                  <td className="px-(--space-3) py-(--space-2)">{row.name}</td>
                  <td className="px-(--space-3) py-(--space-2)">
                    {getTeamHeadLabel(row, studentsById)}
                  </td>
                  <td className="px-(--space-3) py-(--space-2)">
                    {formatLabel(row.format)}
                  </td>
                  <td className="px-(--space-3) py-(--space-2)">
                    {row.grade_order === 0 ? "TK" : (row.grade_order ?? "—")}
                  </td>
                  <td className="px-(--space-3) py-(--space-2)">
                    {(row.student_ids || []).length}
                  </td>
                  <td className="px-(--space-3) py-(--space-2)">
                    {row.active !== false ? (
                      <StatusBadge tone="success">Aktif</StatusBadge>
                    ) : (
                      <StatusBadge tone="neutral">Non-aktif</StatusBadge>
                    )}
                  </td>
                  <td className="hidden px-(--space-3) py-(--space-2) sm:table-cell">
                    <div className="flex gap-(--space-2)">
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        aria-label="Ubah TIM"
                        disabled={deletingTeamId === row.team_id}
                        onClick={() => openEdit(row)}
                      >
                        <Edit2 size={15} aria-hidden />
                      </Button>
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        className="text-critical"
                        aria-label={
                          deletingTeamId === row.team_id
                            ? "Menghapus TIM…"
                            : "Hapus TIM"
                        }
                        aria-busy={deletingTeamId === row.team_id}
                        disabled={deletingTeamId !== null}
                        onClick={() => void del(row)}
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
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-(--space-4)"
          onClick={(event) => {
            if (
              event.target === event.currentTarget &&
              !saveInFlightRef.current
            ) {
              closeForm();
            }
          }}
          role="presentation"
        >
          <div
            className="max-h-[90vh] w-full max-w-2xl overflow-y-auto rounded-control border border-line-subtle bg-canvas p-(--space-4)"
            role="dialog"
            aria-modal="true"
            aria-labelledby="tim-dialog-title"
            aria-busy={saving}
          >
            <div className="mb-(--space-4) flex items-center justify-between">
              <h2
                id="tim-dialog-title"
                className="text-(length:--font-size-title-section) font-semibold text-primary"
              >
                {editing ? "Ubah" : "Tambah"} TIM
              </h2>
              <Button
                type="button"
                variant="outline"
                size="sm"
                aria-label="Tutup"
                disabled={saving}
                onClick={closeForm}
              >
                <X size={16} />
              </Button>
            </div>

            <div className="grid gap-(--space-3) sm:grid-cols-2">
              <label className="block space-y-(--space-1) sm:col-span-2">
                <span className="text-(length:--font-size-label) text-secondary">
                  Nama TIM (Wajib)
                </span>
                <input
                  id="tim-name"
                  className="min-h-(--target-min) w-full rounded-control border border-line-subtle px-(--space-3)"
                  data-testid="field-name"
                  required
                  value={form.name}
                  onChange={(e) => setForm({ ...form, name: e.target.value })}
                  placeholder="TIM Contoh"
                />
              </label>

              <label className="block space-y-(--space-1) sm:col-span-2">
                <span className="text-(length:--font-size-label) text-secondary">
                  Kepala TIM
                </span>
                <select
                  id="tim-head-student"
                  className="min-h-(--target-min) w-full rounded-control border border-line-subtle bg-canvas px-(--space-3)"
                  data-testid="field-head_student_id"
                  value={form.head_student_id || ""}
                  onChange={(e) => {
                    const hid = e.target.value;
                    const ids = form.student_ids || [];
                    setForm({
                      ...form,
                      head_student_id: hid,
                      student_ids:
                        hid && !ids.includes(hid) ? [hid, ...ids] : ids,
                    });
                  }}
                >
                  <option value="">— Pilih dari daftar murid —</option>
                  {form.head_student_id &&
                  !studentsById[form.head_student_id] ? (
                    <option value={form.head_student_id}>
                      Murid tidak ditemukan ·{" "}
                      {form.head_student_id.slice(0, 12)}
                    </option>
                  ) : null}
                  {students.map((s) => (
                    <option key={s.student_id} value={s.student_id}>
                      {s.name}
                    </option>
                  ))}
                </select>
              </label>

              <label className="block space-y-(--space-1)">
                <span className="text-(length:--font-size-label) text-secondary">
                  Format (Wajib)
                </span>
                <select
                  id="tim-format"
                  className="min-h-(--target-min) w-full rounded-control border border-line-subtle bg-canvas px-(--space-3)"
                  data-testid="field-format"
                  required
                  value={form.format}
                  onChange={(e) => setForm({ ...form, format: e.target.value })}
                >
                  <option value="privat">Privat</option>
                  <option value="semi_privat">Semi Privat</option>
                  <option value="reguler">Reguler</option>
                </select>
              </label>

              <label className="block space-y-(--space-1)">
                <span className="text-(length:--font-size-label) text-secondary">
                  Kelas (angka)
                </span>
                <input
                  id="tim-grade-order"
                  type="number"
                  className="min-h-(--target-min) w-full rounded-control border border-line-subtle px-(--space-3)"
                  data-testid="field-grade_order"
                  value={form.grade_order ?? ""}
                  onChange={(e) =>
                    setForm({
                      ...form,
                      grade_order:
                        e.target.value === "" ? null : Number(e.target.value),
                    })
                  }
                  placeholder="1–9 (0 = TK)"
                />
              </label>

              <label className="block space-y-(--space-1)">
                <span className="text-(length:--font-size-label) text-secondary">
                  Jenjang
                </span>
                <select
                  id="tim-grade"
                  className="min-h-(--target-min) w-full rounded-control border border-line-subtle bg-canvas px-(--space-3)"
                  value={form.grade_id || ""}
                  onChange={(e) =>
                    setForm({ ...form, grade_id: e.target.value })
                  }
                >
                  <option value="">— Pilih —</option>
                  {grades.map((g) => (
                    <option key={g.grade_id} value={g.grade_id}>
                      {g.name}
                    </option>
                  ))}
                </select>
              </label>

              <label className="block space-y-(--space-1)">
                <span className="text-(length:--font-size-label) text-secondary">
                  Tahun Ajaran
                </span>
                <select
                  id="tim-academic-year"
                  className="min-h-(--target-min) w-full rounded-control border border-line-subtle bg-canvas px-(--space-3)"
                  value={form.academic_year_id || ""}
                  onChange={(e) =>
                    setForm({ ...form, academic_year_id: e.target.value })
                  }
                >
                  <option value="">— Pilih —</option>
                  {years.map((y) => (
                    <option key={y.year_id} value={y.year_id}>
                      {y.name}
                    </option>
                  ))}
                </select>
              </label>

              <div className="space-y-(--space-2) sm:col-span-2">
                <div
                  id="tim-members-label"
                  className="text-(length:--font-size-label) text-secondary"
                >
                  Anggota TIM{" "}
                  {teamMembers.length ? `(${teamMembers.length})` : ""}
                </div>
                <p
                  id="tim-members-hint"
                  className="text-(length:--font-size-label) text-secondary"
                >
                  Hanya murid di bawah kepala TIM ini (dari roster kuning).
                  Bukan seluruh database.
                </p>
                <ul
                  className="space-y-(--space-2) rounded-control border border-line-subtle p-(--space-3)"
                  data-testid="tim-member-list"
                  aria-labelledby="tim-members-label"
                  aria-describedby="tim-members-hint"
                >
                  {teamMembers.length === 0 ? (
                    <li className="text-(length:--font-size-label) text-secondary">
                      Belum ada anggota — cari untuk menambah.
                    </li>
                  ) : (
                    teamMembers.map((s) => {
                      const isHead = s.student_id === form.head_student_id;
                      return (
                        <li
                          key={s.student_id}
                          className="flex items-center justify-between gap-(--space-2)"
                        >
                          <span className="text-primary">
                            {s.name}
                            {isHead ? (
                              <StatusBadge tone="info">
                                <span className="ml-(--space-2)">Kepala</span>
                              </StatusBadge>
                            ) : null}
                          </span>
                          {!isHead ? (
                            <Button
                              type="button"
                              variant="outline"
                              size="sm"
                              disabled={saving}
                              onClick={() =>
                                setForm({
                                  ...form,
                                  student_ids: (form.student_ids || []).filter(
                                    (id) => id !== s.student_id,
                                  ),
                                })
                              }
                            >
                              Hapus
                            </Button>
                          ) : null}
                        </li>
                      );
                    })
                  )}
                </ul>
                <label
                  className="block space-y-(--space-1)"
                  htmlFor="tim-add-member"
                >
                  <span className="text-(length:--font-size-label) text-secondary">
                    Tambah anggota
                  </span>
                  <input
                    id="tim-add-member"
                    type="search"
                    className="min-h-(--target-min) w-full rounded-control border border-line-subtle px-(--space-3)"
                    placeholder="Ketik nama murid (min. 2 huruf)…"
                    value={memberAddQ}
                    onChange={(e) => setMemberAddQ(e.target.value)}
                    data-testid="field-add-member"
                  />
                </label>
                {addMemberHits.length > 0 ? (
                  <ul className="space-y-(--space-1) rounded-control border border-line-subtle p-(--space-2)">
                    {addMemberHits.map((s) => (
                      <li key={s.student_id}>
                        <button
                          type="button"
                          className="w-full rounded-control px-(--space-2) py-(--space-1) text-left text-accent-text hover:bg-surface"
                          disabled={saving}
                          onClick={() => {
                            setForm({
                              ...form,
                              student_ids: [
                                ...(form.student_ids || []),
                                s.student_id,
                              ],
                              head_student_id:
                                form.head_student_id || s.student_id,
                            });
                            setMemberAddQ("");
                          }}
                        >
                          + {s.name}
                        </button>
                      </li>
                    ))}
                  </ul>
                ) : null}
              </div>

              <label className="block space-y-(--space-1) sm:col-span-2">
                <span className="text-(length:--font-size-label) text-secondary">
                  Catatan
                </span>
                <textarea
                  id="tim-notes"
                  rows={2}
                  className="w-full rounded-control border border-line-subtle px-(--space-3) py-(--space-2)"
                  value={form.notes || ""}
                  onChange={(e) => setForm({ ...form, notes: e.target.value })}
                />
              </label>

              <label className="block space-y-(--space-1)">
                <span className="text-(length:--font-size-label) text-secondary">
                  Status
                </span>
                <select
                  id="tim-active"
                  className="min-h-(--target-min) w-full rounded-control border border-line-subtle bg-canvas px-(--space-3)"
                  value={form.active ? "1" : "0"}
                  onChange={(e) =>
                    setForm({ ...form, active: e.target.value === "1" })
                  }
                >
                  <option value="1">Aktif</option>
                  <option value="0">Tidak Aktif</option>
                </select>
              </label>
            </div>

            <div className="mt-(--space-4) flex justify-end gap-(--space-2)">
              <Button
                type="button"
                variant="outline"
                disabled={saving}
                onClick={closeForm}
              >
                Batal
              </Button>
              <Button
                type="button"
                data-testid="btn-save-master"
                aria-busy={saving}
                disabled={saving}
                onClick={() => void save()}
              >
                {saving ? "Menyimpan…" : "Simpan"}
              </Button>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}

export default function TimPage() {
  return (
    <ProtectedRoute roles={["owner", "admin_akademik"]}>
      <AppShell>
        <TimView />
      </AppShell>
    </ProtectedRoute>
  );
}
