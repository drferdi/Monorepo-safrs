"use client";

import { Edit2, Plus, Search, Trash2, X } from "lucide-react";
import { useCallback, useEffect, useMemo, useState, type ReactNode } from "react";
import { toast } from "sonner";
import {
  createMasterResource,
  deleteMasterResource,
  listMasterResource,
  updateMasterResource,
} from "../lib/api.ts";
import {
  filterMasterRows,
  initMasterForm,
  resolveRowIdKey,
  validateRequiredFields,
  type MasterField,
} from "../lib/masterCrud.ts";
import { PageHead } from "./PageHead.tsx";
import { Button } from "./ui/button.tsx";

export interface MasterColumn {
  key: string;
  label: string;
  render?: (
    row: Record<string, unknown>,
    extra: Record<string, unknown>,
  ) => ReactNode;
}

export function MasterCrud({
  title,
  lede,
  resource,
  fields,
  columns,
  extraFetch,
}: {
  title: string;
  lede: string;
  resource: string;
  fields: MasterField[];
  columns: MasterColumn[];
  extraFetch?: () => Promise<Record<string, unknown>>;
}) {
  const [rows, setRows] = useState<Record<string, unknown>[]>([]);
  const [q, setQ] = useState("");
  const [form, setForm] = useState<Record<string, unknown>>({});
  const [editing, setEditing] = useState<Record<string, unknown> | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [extraData, setExtraData] = useState<Record<string, unknown>>({});

  const load = useCallback(async () => {
    try {
      const [r, extra] = await Promise.all([
        listMasterResource(resource),
        extraFetch ? extraFetch() : Promise.resolve({}),
      ]);
      setRows(r as Record<string, unknown>[]);
      setExtraData(extra || {});
    } catch (e) {
      console.error(e);
    }
  }, [extraFetch, resource]);

  useEffect(() => {
    void load();
  }, [load]);

  const filtered = useMemo(() => filterMasterRows(rows, q), [rows, q]);

  function openNew(): void {
    setForm(initMasterForm(fields));
    setEditing(null);
    setShowForm(true);
  }

  function openEdit(row: Record<string, unknown>): void {
    setForm({ ...row });
    setEditing(row);
    setShowForm(true);
  }

  async function save(): Promise<void> {
    const err = validateRequiredFields(fields, form);
    if (err) {
      toast.error(err);
      return;
    }
    try {
      if (editing) {
        const idKey =
          fields[0]?._idKey || resolveRowIdKey(editing) || undefined;
        if (!idKey) throw new Error("missing id");
        await updateMasterResource(
          resource,
          String(editing[idKey]),
          form,
        );
        toast.success(`${title} berhasil diperbarui.`);
      } else {
        await createMasterResource(resource, form);
        toast.success(`${title} berhasil ditambahkan.`);
      }
      setShowForm(false);
      setForm({});
      setEditing(null);
      await load();
    } catch (e: unknown) {
      const detail =
        e && typeof e === "object" && "response" in e
          ? (e as { response?: { data?: { detail?: string } } }).response?.data
              ?.detail
          : undefined;
      toast.error(detail || "Gagal menyimpan data.");
    }
  }

  async function del(row: Record<string, unknown>): Promise<void> {
    if (!window.confirm(`Hapus ${title}? Tindakan ini tidak dapat dibatalkan.`)) {
      return;
    }
    const idKey = resolveRowIdKey(row);
    if (!idKey) return;
    try {
      await deleteMasterResource(resource, String(row[idKey]));
      toast.success(`${title} berhasil dihapus.`);
      await load();
    } catch {
      toast.error("Gagal menghapus data.");
    }
  }

  return (
    <div className="space-y-(--space-5)">
      <PageHead
        seq="MST"
        eyebrow="Master Data"
        title={title}
        lede={lede}
        actions={
          <Button
            type="button"
            data-testid={`btn-add-${resource}`}
            onClick={openNew}
          >
            <Plus size={14} strokeWidth={1.5} aria-hidden /> Tambah
          </Button>
        }
      />

      <label className="flex min-h-(--target-min) items-center gap-(--space-2) rounded-control border border-line-subtle px-(--space-3)">
        <Search size={16} aria-hidden />
        <span className="sr-only">Cari {title}</span>
        <input
          type="search"
          placeholder={`Cari ${title.toLowerCase()}…`}
          value={q}
          onChange={(e) => setQ(e.target.value)}
          data-testid={`search-${resource}`}
          className="w-full bg-transparent py-(--space-2) outline-none"
        />
      </label>

      <p className="text-(length:--font-size-body) text-secondary">
        {filtered.length} data
        {q ? " · Hasil pencarian" : " · Seluruh data aktif"}
      </p>

      <div className="overflow-x-auto rounded-control border border-line-subtle">
        <table className="min-w-full border-collapse text-(length:--font-size-body)">
          <thead>
            <tr className="border-b border-line-subtle bg-surface">
              {columns.map((c) => (
                <th
                  key={c.key}
                  scope="col"
                  className="px-(--space-3) py-(--space-2) text-left"
                >
                  {c.label}
                </th>
              ))}
              <th
                className="px-(--space-3) py-(--space-2) text-left"
                scope="col"
                aria-label="Aksi"
              />
            </tr>
          </thead>
          <tbody>
            {filtered.length === 0 ? (
              <tr>
                <td
                  colSpan={columns.length + 1}
                  className="px-(--space-3) py-(--space-4) text-center text-secondary"
                >
                  <p className="font-medium text-primary">Belum ada data</p>
                  <p>
                    {q
                      ? "Tidak ada entri yang cocok dengan pencarian. Ubah kata kunci atau kosongkan filter."
                      : "Silakan tambah entri baru untuk mengisi master data ini."}
                  </p>
                </td>
              </tr>
            ) : (
              filtered.map((row, i) => {
                const idKey = resolveRowIdKey(row);
                const id = idKey ? String(row[idKey]) : String(i);
                return (
                  <tr key={id} className="border-b border-line-subtle">
                    {columns.map((c) => (
                      <td key={c.key} className="px-(--space-3) py-(--space-2)">
                        {c.render
                          ? c.render(row, extraData)
                          : String(row[c.key] ?? "—")}
                      </td>
                    ))}
                    <td className="px-(--space-3) py-(--space-2)">
                      <div className="flex gap-(--space-2)">
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          data-testid={`btn-edit-${id}`}
                          aria-label={`Ubah ${title}`}
                          onClick={() => openEdit(row)}
                        >
                          <Edit2 size={15} strokeWidth={1.5} />
                        </Button>
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          data-testid={`btn-del-${id}`}
                          aria-label={`Hapus ${title}`}
                          onClick={() => void del(row)}
                        >
                          <Trash2 size={15} strokeWidth={1.5} />
                        </Button>
                      </div>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      {showForm ? (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-(--space-4)"
          role="dialog"
          aria-modal="true"
          aria-label={`${editing ? "Ubah" : "Tambah"} ${title}`}
          onClick={() => setShowForm(false)}
        >
          <div
            className="max-h-[90vh] w-full max-w-lg overflow-y-auto rounded-control border border-line-subtle bg-canvas p-(--space-4)"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="mb-(--space-3) flex items-center justify-between">
              <h2 className="font-semibold text-primary">
                {editing ? "Ubah" : "Tambah"} {title}
              </h2>
              <Button
                type="button"
                variant="outline"
                size="sm"
                data-testid="btn-close-master-form"
                aria-label="Tutup"
                onClick={() => setShowForm(false)}
              >
                <X size={16} />
              </Button>
            </div>
            <div className="grid gap-(--space-3) sm:grid-cols-2">
              {fields.map((f) => (
                <div
                  key={f.name}
                  className={f.wide ? "space-y-(--space-1) sm:col-span-2" : "space-y-(--space-1)"}
                >
                  <label className="text-(length:--font-size-label) text-secondary">
                    {f.label}
                    {f.required ? " *" : ""}
                  </label>
                  {f.type === "select" ? (
                    <select
                      data-testid={`field-${f.name}`}
                      className="min-h-(--target-min) w-full rounded-control border border-line-subtle px-(--space-3)"
                      value={String(form[f.name] ?? "")}
                      onChange={(e) =>
                        setForm({ ...form, [f.name]: e.target.value })
                      }
                    >
                      <option value="">— Pilih —</option>
                      {(f.options?.(extraData) || []).map((o) => (
                        <option key={o.value} value={o.value}>
                          {o.label}
                        </option>
                      ))}
                    </select>
                  ) : f.type === "textarea" ? (
                    <textarea
                      rows={3}
                      data-testid={`field-${f.name}`}
                      className="w-full rounded-control border border-line-subtle px-(--space-3) py-(--space-2)"
                      value={String(form[f.name] ?? "")}
                      onChange={(e) =>
                        setForm({ ...form, [f.name]: e.target.value })
                      }
                    />
                  ) : f.type === "boolean" ? (
                    <select
                      data-testid={`field-${f.name}`}
                      className="min-h-(--target-min) w-full rounded-control border border-line-subtle px-(--space-3)"
                      value={form[f.name] ? "1" : "0"}
                      onChange={(e) =>
                        setForm({
                          ...form,
                          [f.name]: e.target.value === "1",
                        })
                      }
                    >
                      <option value="1">Aktif</option>
                      <option value="0">Tidak aktif</option>
                    </select>
                  ) : f.type === "number" ? (
                    <input
                      type="number"
                      data-testid={`field-${f.name}`}
                      className="min-h-(--target-min) w-full rounded-control border border-line-subtle px-(--space-3)"
                      value={Number(form[f.name] ?? 0)}
                      onChange={(e) =>
                        setForm({
                          ...form,
                          [f.name]: Number(e.target.value),
                        })
                      }
                    />
                  ) : f.type === "multi" ? (
                    <div
                      className="max-h-40 space-y-1 overflow-y-auto rounded-control border border-line-subtle p-(--space-2)"
                      data-testid={`field-${f.name}`}
                    >
                      {(f.options?.(extraData) || []).map((o) => {
                        const selected = Array.isArray(form[f.name])
                          ? (form[f.name] as string[]).includes(o.value)
                          : false;
                        return (
                          <label
                            key={o.value}
                            className="flex min-h-(--target-min) items-center gap-(--space-2) text-sm"
                          >
                            <input
                              type="checkbox"
                              checked={selected}
                              onChange={(e) => {
                                const prev = Array.isArray(form[f.name])
                                  ? ([...(form[f.name] as string[])] as string[])
                                  : [];
                                setForm({
                                  ...form,
                                  [f.name]: e.target.checked
                                    ? [...prev, o.value]
                                    : prev.filter((v) => v !== o.value),
                                });
                              }}
                            />
                            {o.label}
                          </label>
                        );
                      })}
                    </div>
                  ) : (
                    <input
                      type={f.type || "text"}
                      data-testid={`field-${f.name}`}
                      className="min-h-(--target-min) w-full rounded-control border border-line-subtle px-(--space-3)"
                      placeholder={f.placeholder}
                      value={String(form[f.name] ?? "")}
                      onChange={(e) =>
                        setForm({ ...form, [f.name]: e.target.value })
                      }
                    />
                  )}
                </div>
              ))}
            </div>
            <div className="mt-(--space-4) flex justify-end gap-(--space-2)">
              <Button
                type="button"
                variant="outline"
                onClick={() => setShowForm(false)}
              >
                Batal
              </Button>
              <Button
                type="button"
                data-testid="btn-save-master"
                onClick={() => void save()}
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
