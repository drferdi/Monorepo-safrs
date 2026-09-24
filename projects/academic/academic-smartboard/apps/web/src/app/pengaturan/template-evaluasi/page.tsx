"use client";

import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Edit2, Plus, Trash2, X } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { AppShell } from "../../../components/AppShell.tsx";
import { PageHead } from "../../../components/PageHead.tsx";
import { ProtectedRoute } from "../../../components/ProtectedRoute.tsx";
import { StatusBadge } from "../../../components/StatusBadge.tsx";
import { Button } from "../../../components/ui/button.tsx";
import {
  createEvaluationTemplate,
  deleteEvaluationTemplate,
  type EvaluationTemplate,
  type EvaluationTemplateField,
  listEvaluationTemplates,
  listSchools,
  listSubjects,
  updateEvaluationTemplate,
} from "../../../lib/api.ts";

const FIELD_TYPES = [
  { value: "rating", label: "Skala 1-5" },
  { value: "select", label: "Pilihan" },
  { value: "text", label: "Teks Singkat" },
  { value: "textarea", label: "Teks Panjang" },
  { value: "boolean", label: "Ya/Tidak" },
] as const;

interface TemplateForm {
  name: string;
  description: string;
  stage: string;
  subject_id: string;
  school_id: string;
  active: boolean;
  fields: EvaluationTemplateField[];
}

function initForm(): TemplateForm {
  return {
    name: "",
    description: "",
    stage: "",
    subject_id: "",
    school_id: "",
    active: true,
    fields: [],
  };
}

function TemplateEvaluasiView() {
  const qc = useQueryClient();
  const templatesQ = useQuery({
    queryKey: ["evaluation-templates"],
    queryFn: listEvaluationTemplates,
  });
  const subjectsQ = useQuery({ queryKey: ["subjects"], queryFn: listSubjects });
  const schoolsQ = useQuery({ queryKey: ["schools"], queryFn: listSchools });

  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState<EvaluationTemplate | null>(null);
  const [form, setForm] = useState<TemplateForm>(initForm);

  const rows = templatesQ.data ?? [];
  const subjects = subjectsQ.data ?? [];
  const schools = schoolsQ.data ?? [];

  const openNew = () => {
    setForm(initForm());
    setEditing(null);
    setShowForm(true);
  };

  const openEdit = (row: EvaluationTemplate) => {
    setForm({
      name: row.name,
      description: row.description || "",
      stage: row.stage || "",
      subject_id: row.subject_id || "",
      school_id: row.school_id || "",
      active: row.active,
      fields: row.fields || [],
    });
    setEditing(row);
    setShowForm(true);
  };

  const addField = () =>
    setForm((f) => ({
      ...f,
      fields: [
        ...(f.fields || []),
        {
          key: `field_${(f.fields || []).length + 1}`,
          label: "",
          type: "text",
          options: [],
          required: false,
          order: (f.fields || []).length,
          parent_visible: true,
        },
      ],
    }));

  const removeField = (i: number) =>
    setForm((f) => ({
      ...f,
      fields: f.fields.filter((_, idx) => idx !== i),
    }));

  const updateField = (i: number, patch: Partial<EvaluationTemplateField>) =>
    setForm((f) => ({
      ...f,
      fields: f.fields.map((x, idx) => (idx === i ? { ...x, ...patch } : x)),
    }));

  const save = async () => {
    if (!form.name) {
      toast.error("Nama template wajib diisi");
      return;
    }
    const payload = {
      ...form,
      stage: form.stage || null,
      subject_id: form.subject_id || null,
      school_id: form.school_id || null,
    };
    try {
      if (editing) {
        await updateEvaluationTemplate(editing.template_id, payload);
        toast.success("Template diperbarui");
      } else {
        await createEvaluationTemplate(payload);
        toast.success("Template dibuat");
      }
      setShowForm(false);
      void qc.invalidateQueries({ queryKey: ["evaluation-templates"] });
    } catch (e: unknown) {
      const detail =
        e && typeof e === "object" && "response" in e
          ? (e as { response?: { data?: { detail?: string } } }).response?.data
              ?.detail
          : undefined;
      toast.error(detail || "Gagal");
    }
  };

  const del = async (row: EvaluationTemplate) => {
    if (row.is_default) {
      toast.error("Template default tidak dapat dihapus");
      return;
    }
    if (!window.confirm(`Hapus template "${row.name}"?`)) return;
    try {
      await deleteEvaluationTemplate(row.template_id);
      toast.success("Terhapus");
      void qc.invalidateQueries({ queryKey: ["evaluation-templates"] });
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
          title="Template Evaluasi"
          lede="Kustomisasi form evaluasi per jenjang / mata pelajaran / sekolah. Field inti (pemahaman/fokus/partisipasi/kemandirian) selalu ada."
          actions={
            <Button
              type="button"
              size="sm"
              data-testid="btn-add-template"
              onClick={openNew}
            >
              <Plus size={14} aria-hidden="true" /> Tambah Template
            </Button>
          }
        />

        <p className="text-(length:--font-size-body) text-secondary">
          <span className="font-semibold text-primary">{rows.length}</span>{" "}
          template
        </p>

        <div className="overflow-x-auto rounded-control border border-line-subtle">
          <table className="w-full min-w-[40rem] text-left text-(length:--font-size-body)">
            <thead className="border-b border-line-subtle bg-surface text-secondary">
              <tr>
                <th className="px-(--space-3) py-(--space-2) font-medium">
                  Nama
                </th>
                <th className="px-(--space-3) py-(--space-2) font-medium">
                  Cakupan
                </th>
                <th className="px-(--space-3) py-(--space-2) font-medium">
                  Jumlah Field
                </th>
                <th className="px-(--space-3) py-(--space-2) font-medium">
                  Status
                </th>
                <th className="px-(--space-3) py-(--space-2) font-medium" />
              </tr>
            </thead>
            <tbody>
              {templatesQ.isPending && (
                <tr>
                  <td
                    colSpan={5}
                    className="px-(--space-3) py-(--space-4) text-secondary"
                  >
                    Memuat…
                  </td>
                </tr>
              )}
              {!templatesQ.isPending && rows.length === 0 && (
                <tr>
                  <td
                    colSpan={5}
                    className="px-(--space-3) py-(--space-4) text-secondary"
                  >
                    Belum ada template.
                  </td>
                </tr>
              )}
              {rows.map((t) => (
                <tr
                  key={t.template_id}
                  data-testid={`row-tpl-${t.template_id}`}
                  className="border-t border-line-subtle text-primary"
                >
                  <td className="px-(--space-3) py-(--space-2)">
                    <div className="font-semibold">{t.name}</div>
                    {t.is_default ? (
                      <StatusBadge tone="info">Default</StatusBadge>
                    ) : null}
                    {t.description ? (
                      <div className="text-(length:--font-size-body-compact) text-secondary">
                        {t.description}
                      </div>
                    ) : null}
                  </td>
                  <td className="px-(--space-3) py-(--space-2) text-(length:--font-size-body-compact)">
                    {t.stage ? (
                      <>
                        Jenjang: {t.stage}
                        <br />
                      </>
                    ) : null}
                    {t.subject_id ? (
                      <>
                        Mapel:{" "}
                        {subjects.find((s) => s.subject_id === t.subject_id)
                          ?.name || t.subject_id}
                        <br />
                      </>
                    ) : null}
                    {t.school_id
                      ? `Sekolah: ${schools.find((s) => s.school_id === t.school_id)?.name || t.school_id}`
                      : null}
                    {!t.stage && !t.subject_id && !t.school_id ? (
                      <span className="text-secondary">Semua</span>
                    ) : null}
                  </td>
                  <td className="px-(--space-3) py-(--space-2)">
                    {(t.fields || []).length} field
                  </td>
                  <td className="px-(--space-3) py-(--space-2)">
                    {t.active ? (
                      <StatusBadge tone="success">Aktif</StatusBadge>
                    ) : (
                      <StatusBadge tone="neutral">Non-aktif</StatusBadge>
                    )}
                  </td>
                  <td className="px-(--space-3) py-(--space-2)">
                    <div className="flex gap-(--space-2)">
                      <button
                        type="button"
                        className="rounded-control p-(--space-2) text-secondary hover:bg-surface"
                        data-testid={`btn-edit-tpl-${t.template_id}`}
                        aria-label="Ubah template"
                        onClick={() => openEdit(t)}
                      >
                        <Edit2 size={14} />
                      </button>
                      {!t.is_default ? (
                        <button
                          type="button"
                          className="rounded-control p-(--space-2) text-critical hover:bg-surface"
                          data-testid={`btn-del-tpl-${t.template_id}`}
                          aria-label="Hapus template"
                          onClick={() => void del(t)}
                        >
                          <Trash2 size={14} />
                        </button>
                      ) : null}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {showForm ? (
        <div
          className="fixed inset-0 z-(--z-drawer) flex items-center justify-center bg-overlay/40 p-(--space-4)"
          onClick={() => setShowForm(false)}
          role="presentation"
        >
          <div
            className="max-h-[90vh] w-full max-w-3xl overflow-y-auto rounded-control border border-line-subtle bg-canvas p-(--space-4) shadow-overlay"
            onClick={(e) => e.stopPropagation()}
            role="dialog"
            aria-modal="true"
            aria-label={
              editing ? "Ubah template evaluasi" : "Tambah template evaluasi"
            }
          >
            <div className="mb-(--space-4) flex items-center justify-between">
              <h2 className="text-(length:--font-size-title-section) font-bold text-primary">
                {editing ? "Ubah" : "Tambah"} Template Evaluasi
              </h2>
              <button
                type="button"
                className="rounded-control p-(--space-2) text-secondary hover:bg-surface"
                aria-label="Tutup"
                onClick={() => setShowForm(false)}
              >
                <X size={16} />
              </button>
            </div>

            <div className="grid gap-(--space-3) sm:grid-cols-2">
              <label className="flex flex-col gap-(--space-1) sm:col-span-2">
                <span className="text-(length:--font-size-label) text-secondary">
                  Nama Template *
                </span>
                <input
                  className="min-h-(--target-min) rounded-control border border-line-subtle bg-canvas px-(--space-3) text-primary"
                  data-testid="input-tpl-name"
                  value={form.name}
                  onChange={(e) => setForm({ ...form, name: e.target.value })}
                />
              </label>
              <label className="flex flex-col gap-(--space-1) sm:col-span-2">
                <span className="text-(length:--font-size-label) text-secondary">
                  Deskripsi
                </span>
                <textarea
                  rows={2}
                  className="rounded-control border border-line-subtle bg-canvas px-(--space-3) py-(--space-2) text-primary"
                  value={form.description}
                  onChange={(e) =>
                    setForm({ ...form, description: e.target.value })
                  }
                />
              </label>
              <label className="flex flex-col gap-(--space-1)">
                <span className="text-(length:--font-size-label) text-secondary">
                  Jenjang
                </span>
                <select
                  className="min-h-(--target-min) rounded-control border border-line-subtle bg-canvas px-(--space-3) text-primary"
                  value={form.stage}
                  onChange={(e) => setForm({ ...form, stage: e.target.value })}
                >
                  <option value="">Semua</option>
                  <option value="SD">SD</option>
                  <option value="SMP">SMP</option>
                  <option value="SMA">SMA</option>
                </select>
              </label>
              <label className="flex flex-col gap-(--space-1)">
                <span className="text-(length:--font-size-label) text-secondary">
                  Mata Pelajaran
                </span>
                <select
                  className="min-h-(--target-min) rounded-control border border-line-subtle bg-canvas px-(--space-3) text-primary"
                  value={form.subject_id}
                  onChange={(e) =>
                    setForm({ ...form, subject_id: e.target.value })
                  }
                >
                  <option value="">Semua</option>
                  {subjects.map((s) => (
                    <option key={s.subject_id} value={s.subject_id}>
                      {s.name}
                    </option>
                  ))}
                </select>
              </label>
              <label className="flex flex-col gap-(--space-1)">
                <span className="text-(length:--font-size-label) text-secondary">
                  Sekolah
                </span>
                <select
                  className="min-h-(--target-min) rounded-control border border-line-subtle bg-canvas px-(--space-3) text-primary"
                  value={form.school_id}
                  onChange={(e) =>
                    setForm({ ...form, school_id: e.target.value })
                  }
                >
                  <option value="">Semua</option>
                  {schools.map((s) => (
                    <option key={s.school_id} value={s.school_id}>
                      {s.name}
                    </option>
                  ))}
                </select>
              </label>
              <label className="flex flex-col gap-(--space-1)">
                <span className="text-(length:--font-size-label) text-secondary">
                  Status
                </span>
                <select
                  className="min-h-(--target-min) rounded-control border border-line-subtle bg-canvas px-(--space-3) text-primary"
                  value={form.active ? "1" : "0"}
                  onChange={(e) =>
                    setForm({ ...form, active: e.target.value === "1" })
                  }
                >
                  <option value="1">Aktif</option>
                  <option value="0">Non-aktif</option>
                </select>
              </label>
            </div>

            <div className="mt-(--space-4) rounded-control border border-line-subtle p-(--space-3)">
              <div className="mb-(--space-3) flex items-center justify-between">
                <span className="text-(length:--font-size-label) uppercase tracking-(--letter-spacing-label) text-secondary">
                  Field Tambahan ({(form.fields || []).length})
                </span>
                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  data-testid="btn-add-field"
                  onClick={addField}
                >
                  <Plus size={12} aria-hidden="true" /> Tambah Field
                </Button>
              </div>
              {(form.fields || []).map((f, i) => (
                <div
                  key={i}
                  className="mb-(--space-3) rounded-control border border-line-subtle p-(--space-3)"
                  data-testid={`field-row-${i}`}
                >
                  <div className="grid gap-(--space-2) sm:grid-cols-[1fr_8rem_8rem_auto]">
                    <label className="flex flex-col gap-(--space-1)">
                      <span className="text-(length:--font-size-label) text-secondary">
                        Label
                      </span>
                      <input
                        className="min-h-(--target-min) rounded-control border border-line-subtle bg-canvas px-(--space-3) text-primary"
                        data-testid={`field-${i}-label`}
                        value={f.label}
                        placeholder="Contoh: Kesiapan ulangan"
                        onChange={(e) =>
                          updateField(i, {
                            label: e.target.value,
                            key: e.target.value
                              .toLowerCase()
                              .replace(/\s+/g, "_"),
                          })
                        }
                      />
                    </label>
                    <label className="flex flex-col gap-(--space-1)">
                      <span className="text-(length:--font-size-label) text-secondary">
                        Tipe
                      </span>
                      <select
                        className="min-h-(--target-min) rounded-control border border-line-subtle bg-canvas px-(--space-3) text-primary"
                        data-testid={`field-${i}-type`}
                        value={f.type}
                        onChange={(e) =>
                          updateField(i, { type: e.target.value })
                        }
                      >
                        {FIELD_TYPES.map((t) => (
                          <option key={t.value} value={t.value}>
                            {t.label}
                          </option>
                        ))}
                      </select>
                    </label>
                    <label className="flex flex-col gap-(--space-1)">
                      <span className="text-(length:--font-size-label) text-secondary">
                        Wajib
                      </span>
                      <select
                        className="min-h-(--target-min) rounded-control border border-line-subtle bg-canvas px-(--space-3) text-primary"
                        value={f.required ? "1" : "0"}
                        onChange={(e) =>
                          updateField(i, {
                            required: e.target.value === "1",
                          })
                        }
                      >
                        <option value="0">Opsional</option>
                        <option value="1">Wajib</option>
                      </select>
                    </label>
                    <button
                      type="button"
                      className="self-end rounded-control p-(--space-2) text-critical hover:bg-surface"
                      data-testid={`btn-del-field-${i}`}
                      aria-label="Hapus field"
                      onClick={() => removeField(i)}
                    >
                      <Trash2 size={14} />
                    </button>
                  </div>
                  {f.type === "select" ? (
                    <label className="mt-(--space-2) flex flex-col gap-(--space-1)">
                      <span className="text-(length:--font-size-label) text-secondary">
                        Opsi (pisahkan dengan koma)
                      </span>
                      <input
                        className="min-h-(--target-min) rounded-control border border-line-subtle bg-canvas px-(--space-3) text-primary"
                        value={(f.options || []).join(", ")}
                        placeholder="Visual, Auditori, Kinestetik"
                        onChange={(e) =>
                          updateField(i, {
                            options: e.target.value
                              .split(",")
                              .map((x) => x.trim())
                              .filter(Boolean),
                          })
                        }
                      />
                    </label>
                  ) : null}
                  <label className="mt-(--space-2) flex items-center gap-(--space-2) text-primary">
                    <input
                      type="checkbox"
                      checked={f.parent_visible !== false}
                      onChange={(e) =>
                        updateField(i, { parent_visible: e.target.checked })
                      }
                    />
                    Terlihat oleh orang tua
                  </label>
                </div>
              ))}
              {(form.fields || []).length === 0 ? (
                <p className="text-(length:--font-size-body-compact) text-secondary">
                  Belum ada field tambahan. Field inti
                  (pemahaman/fokus/partisipasi/kemandirian) tetap ada.
                </p>
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
                data-testid="btn-save-template"
                onClick={() => void save()}
              >
                Simpan Template
              </Button>
            </div>
          </div>
        </div>
      ) : null}
    </AppShell>
  );
}

export default function TemplateEvaluasiPage() {
  return (
    <ProtectedRoute roles={["owner", "admin_akademik", "content_manager"]}>
      <TemplateEvaluasiView />
    </ProtectedRoute>
  );
}
