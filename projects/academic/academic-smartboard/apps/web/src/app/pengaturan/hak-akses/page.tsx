"use client";

import { useQuery, useQueryClient } from "@tanstack/react-query";
import { X } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { AppShell } from "../../../components/AppShell.tsx";
import { PageHead } from "../../../components/PageHead.tsx";
import { ProtectedRoute } from "../../../components/ProtectedRoute.tsx";
import { StatusBadge } from "../../../components/StatusBadge.tsx";
import { Button } from "../../../components/ui/button.tsx";
import {
  type AuthUserRow,
  listAuthUsers,
  listStudents,
  listTutors,
  patchUserRole,
} from "../../../lib/api.ts";
import { ROLE_LABEL } from "../../../lib/labels.ts";

const ROLES = [
  "owner",
  "admin_akademik",
  "tentor",
  "finance",
  "murid_ortu",
  "content_manager",
] as const;

function HakAksesView() {
  const qc = useQueryClient();
  const usersQ = useQuery({ queryKey: ["auth-users"], queryFn: listAuthUsers });
  const tutorsQ = useQuery({ queryKey: ["tutors"], queryFn: listTutors });
  const studentsQ = useQuery({
    queryKey: ["students"],
    queryFn: listStudents,
  });

  const [editing, setEditing] = useState<AuthUserRow | null>(null);
  const [form, setForm] = useState<{
    role: string;
    tutor_id?: string | null;
    student_ids: string[];
  }>({ role: "owner", student_ids: [] });

  const users = usersQ.data ?? [];
  const tutors = tutorsQ.data ?? [];
  const students = studentsQ.data ?? [];

  const save = async () => {
    if (!editing) return;
    try {
      await patchUserRole(editing.user_id, form);
      toast.success("Peran diperbarui.");
      setEditing(null);
      void qc.invalidateQueries({ queryKey: ["auth-users"] });
    } catch (e: unknown) {
      const detail =
        e && typeof e === "object" && "response" in e
          ? (e as { response?: { data?: { detail?: string } } }).response?.data
              ?.detail
          : undefined;
      toast.error(detail || "Gagal");
    }
  };

  return (
    <AppShell>
      <div className="flex flex-col gap-(--space-4)">
        <PageHead
          seq="SET"
          eyebrow="Pengaturan"
          title="Hak Akses Pengguna"
          lede="Tetapkan peran dan hubungkan ke akun tentor/murid. Peran menentukan seluruh isi layar yang dilihat pengguna."
        />

        <p className="text-(length:--font-size-body) text-secondary">
          <span className="font-semibold text-primary">{users.length}</span>{" "}
          pengguna
        </p>

        <div className="overflow-x-auto rounded-control border border-line-subtle">
          <table className="w-full min-w-[40rem] text-left text-(length:--font-size-body)">
            <thead className="border-b border-line-subtle bg-surface text-secondary">
              <tr>
                <th className="px-(--space-3) py-(--space-2) font-medium">
                  Nama
                </th>
                <th className="px-(--space-3) py-(--space-2) font-medium">
                  Email
                </th>
                <th className="px-(--space-3) py-(--space-2) font-medium">
                  Peran
                </th>
                <th className="px-(--space-3) py-(--space-2) font-medium">
                  Terhubung ke
                </th>
                <th className="px-(--space-3) py-(--space-2) font-medium" />
              </tr>
            </thead>
            <tbody>
              {usersQ.isPending && (
                <tr>
                  <td
                    colSpan={5}
                    className="px-(--space-3) py-(--space-4) text-secondary"
                  >
                    Memuat…
                  </td>
                </tr>
              )}
              {!usersQ.isPending && users.length === 0 && (
                <tr>
                  <td
                    colSpan={5}
                    className="px-(--space-3) py-(--space-4) text-secondary"
                  >
                    Belum ada pengguna terdaftar.
                  </td>
                </tr>
              )}
              {users.map((u) => (
                <tr
                  key={u.user_id}
                  className="border-t border-line-subtle text-primary"
                >
                  <td className="px-(--space-3) py-(--space-2) font-semibold">
                    {u.name}
                  </td>
                  <td className="px-(--space-3) py-(--space-2)">{u.email}</td>
                  <td className="px-(--space-3) py-(--space-2)">
                    <StatusBadge tone="info">
                      {ROLE_LABEL[u.role as keyof typeof ROLE_LABEL] || u.role}
                    </StatusBadge>
                  </td>
                  <td className="px-(--space-3) py-(--space-2) text-(length:--font-size-body-compact)">
                    {u.tutor_id
                      ? `Tentor: ${tutors.find((t) => t.tutor_id === u.tutor_id)?.name || u.tutor_id}`
                      : null}
                    {(u.student_ids || []).length > 0
                      ? ` · Anak: ${(u.student_ids || []).length}`
                      : null}
                  </td>
                  <td className="px-(--space-3) py-(--space-2)">
                    <button
                      type="button"
                      className="text-accent-text underline"
                      data-testid={`btn-edit-user-${u.user_id}`}
                      onClick={() => {
                        setEditing(u);
                        setForm({
                          role: u.role,
                          tutor_id: u.tutor_id,
                          student_ids: u.student_ids || [],
                        });
                      }}
                    >
                      Ubah →
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {editing ? (
        <div className="fixed inset-0 z-(--z-drawer) flex items-center justify-center bg-overlay/40 p-(--space-4)">
          <button
            type="button"
            aria-label="Tutup"
            tabIndex={-1}
            className="absolute inset-0 cursor-default"
            onClick={() => setEditing(null)}
          />
          <div
            className="relative max-h-[90vh] w-full max-w-lg overflow-y-auto rounded-control border border-line-subtle bg-canvas p-(--space-4) shadow-overlay"
            role="dialog"
            aria-modal="true"
            aria-label={`Ubah peran ${editing.name}`}
          >
            <div className="mb-(--space-4) flex items-center justify-between">
              <h2 className="text-(length:--font-size-title-section) font-semibold text-primary">
                Ubah Peran: {editing.name}
              </h2>
              <button
                type="button"
                className="rounded-control p-(--space-2) text-secondary hover:bg-surface"
                aria-label="Tutup"
                onClick={() => setEditing(null)}
              >
                <X size={16} />
              </button>
            </div>
            <div className="flex flex-col gap-(--space-3)">
              <label className="flex flex-col gap-(--space-1)">
                <span className="text-(length:--font-size-label) text-secondary">
                  Peran
                </span>
                <select
                  className="min-h-(--target-min) rounded-control border border-line-subtle bg-canvas px-(--space-3) text-primary"
                  value={form.role}
                  onChange={(e) => setForm({ ...form, role: e.target.value })}
                  data-testid="select-role"
                >
                  {ROLES.map((r) => (
                    <option key={r} value={r}>
                      {ROLE_LABEL[r]}
                    </option>
                  ))}
                </select>
              </label>
              {form.role === "tentor" ? (
                <label className="flex flex-col gap-(--space-1)">
                  <span className="text-(length:--font-size-label) text-secondary">
                    Hubungkan dengan Tentor
                  </span>
                  <select
                    className="min-h-(--target-min) rounded-control border border-line-subtle bg-canvas px-(--space-3) text-primary"
                    value={form.tutor_id || ""}
                    onChange={(e) =>
                      setForm({ ...form, tutor_id: e.target.value })
                    }
                    data-testid="select-tutor-link"
                  >
                    <option value="">— Pilih Tentor —</option>
                    {tutors.map((t) => (
                      <option key={t.tutor_id} value={t.tutor_id}>
                        {t.name}
                      </option>
                    ))}
                  </select>
                </label>
              ) : null}
              {form.role === "murid_ortu" ? (
                <fieldset className="flex flex-col gap-(--space-2)">
                  <legend className="text-(length:--font-size-label) text-secondary">
                    Anak yang Dapat Dilihat
                  </legend>
                  {students.map((s) => (
                    <label
                      key={s.student_id}
                      className="flex items-center gap-(--space-2) text-primary"
                    >
                      <input
                        type="checkbox"
                        checked={(form.student_ids || []).includes(
                          s.student_id,
                        )}
                        data-testid={`chk-student-${s.student_id}`}
                        onChange={(e) => {
                          const cur = form.student_ids || [];
                          setForm({
                            ...form,
                            student_ids: e.target.checked
                              ? [...cur, s.student_id]
                              : cur.filter((x) => x !== s.student_id),
                          });
                        }}
                      />
                      {s.name}
                    </label>
                  ))}
                </fieldset>
              ) : null}
            </div>
            <div className="mt-(--space-4) flex justify-end gap-(--space-2)">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => setEditing(null)}
              >
                Batal
              </Button>
              <Button
                type="button"
                size="sm"
                data-testid="btn-save-role"
                onClick={() => void save()}
              >
                Simpan
              </Button>
            </div>
          </div>
        </div>
      ) : null}
    </AppShell>
  );
}

export default function HakAksesPage() {
  return (
    <ProtectedRoute roles={["owner"]}>
      <HakAksesView />
    </ProtectedRoute>
  );
}
