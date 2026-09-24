"use client";

import { useState } from "react";
import { toast } from "sonner";
import { attendanceCatchUp } from "../lib/api.ts";
import { ATTEND_LABEL } from "../lib/labels.ts";
import { Button } from "./ui/button.tsx";

const ATT_STATUS = [
  "hadir",
  "terlambat",
  "izin",
  "sakit",
  "tidak_hadir",
] as const;

export function AttendanceCatchUp({
  sessionId,
  students,
  onDone,
}: {
  sessionId: string;
  students: Array<{ student_id: string; name?: string }>;
  onDone?: () => void;
}) {
  const [form, setForm] = useState(() =>
    Object.fromEntries(
      students.map((s) => [
        s.student_id,
        { student_id: s.student_id, status: "hadir", note: "" },
      ]),
    ),
  );
  const [reason, setReason] = useState("");
  const [saving, setSaving] = useState(false);
  const reasonValid = reason.trim().length >= 5;

  if (!students.length) return null;

  async function handleSubmit() {
    if (!reasonValid) {
      toast.error(
        "Alasan wajib diisi (minimal 5 karakter) untuk absensi susulan.",
      );
      return;
    }
    setSaving(true);
    try {
      await attendanceCatchUp({
        session_id: sessionId,
        items: Object.values(form),
        reason: reason.trim(),
      });
      toast.success("Absensi susulan tersimpan.");
      setReason("");
      onDone?.();
    } catch {
      toast.error("Gagal menyimpan absensi susulan");
    } finally {
      setSaving(false);
    }
  }

  return (
    <section
      data-testid="attendance-catchup"
      className="rounded-control border border-line-subtle bg-canvas p-(--space-4)"
    >
      <h2 className="mb-(--space-3) text-(length:--font-size-title-section) font-semibold text-primary">
        Absensi Susulan
      </h2>
      <p className="mb-(--space-3) text-(length:--font-size-body) text-secondary">
        Sesi ini sudah lewat dan sebagian murid belum diabsen. Isi status murid
        di bawah, lalu jelaskan alasan keterlambatan sebelum menyimpan.
      </p>
      <div className="mb-(--space-3) space-y-(--space-2)">
        {students.map((s) => {
          const row = form[s.student_id];
          if (!row) return null;
          return (
            <div
              key={s.student_id}
              data-testid={`catchup-row-${s.student_id}`}
              className="flex flex-wrap items-center gap-(--space-3)"
            >
              <span className="min-w-40 text-primary">
                {s.name || s.student_id}
              </span>
              <select
                className="rounded-control border border-line-subtle px-(--space-2) py-(--space-1)"
                value={row.status}
                data-testid={`catchup-status-${s.student_id}`}
                onChange={(e) =>
                  setForm((f) => ({
                    ...f,
                    [s.student_id]: { ...row, status: e.target.value },
                  }))
                }
              >
                {ATT_STATUS.map((x) => (
                  <option key={x} value={x}>
                    {ATTEND_LABEL[x]}
                  </option>
                ))}
              </select>
            </div>
          );
        })}
      </div>
      <label className="block text-(length:--font-size-label) text-secondary">
        Alasan absensi susulan (wajib, minimal 5 karakter)
        <textarea
          data-testid="catchup-reason"
          rows={2}
          className="mt-(--space-1) w-full rounded-control border border-line-subtle px-(--space-3) py-(--space-2)"
          value={reason}
          onChange={(e) => setReason(e.target.value)}
          placeholder="Contoh: Lupa mengisi absensi saat sesi berlangsung"
        />
      </label>
      <div className="mt-(--space-3) flex justify-end">
        <Button
          type="button"
          data-testid="btn-submit-catchup"
          disabled={saving || !reasonValid}
          onClick={() => void handleSubmit()}
        >
          {saving ? "Menyimpan…" : "Simpan Absensi Susulan"}
        </Button>
      </div>
    </section>
  );
}
