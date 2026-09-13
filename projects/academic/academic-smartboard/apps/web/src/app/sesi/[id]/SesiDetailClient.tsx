"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import Link from "next/link";
import type { Route } from "next";
import { useParams } from "next/navigation";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { AppShell } from "../../../components/AppShell.tsx";
import { PageHead } from "../../../components/PageHead.tsx";
import { ProtectedRoute } from "../../../components/ProtectedRoute.tsx";
import { StatusBadge } from "../../../components/StatusBadge.tsx";
import { Button } from "../../../components/ui/button.tsx";
import {
  cancelSession,
  getSession,
  listStudents,
  saveAttendance,
  verifySession,
  type StudentAttendance,
} from "../../../lib/api.ts";
import {
  ATTEND_LABEL,
  SESSION_STATUS_LABEL,
  STATUS_BADGE,
  type StatusBadgeTone,
} from "../../../lib/labels.ts";

export function SesiDetailClient() {
  const params = useParams<{ id: string }>();
  const id = params?.id ?? "";
  const queryClient = useQueryClient();
  const sessionQ = useQuery({
    queryKey: ["session", id],
    queryFn: () => getSession(id),
    enabled: Boolean(id) && id !== "placeholder",
  });
  const studentsQ = useQuery({ queryKey: ["students"], queryFn: listStudents });
  const [attForm, setAttForm] = useState<Record<string, { status: string; note: string }>>(
    {},
  );

  useEffect(() => {
    const ses = sessionQ.data;
    if (!ses) return;
    const next: Record<string, { status: string; note: string }> = {};
    for (const sid of ses.student_ids ?? []) {
      const existing = ses.student_attendance?.find((a) => a.student_id === sid);
      next[sid] = {
        status: existing?.status ?? "hadir",
        note: existing?.note ?? "",
      };
    }
    setAttForm(next);
  }, [sessionQ.data]);

  const saveAtt = useMutation({
    mutationFn: async () => {
      const rows: StudentAttendance[] = Object.entries(attForm).map(
        ([student_id, v]) => ({
          session_id: id,
          student_id,
          status: v.status,
          note: v.note,
        }),
      );
      return saveAttendance(id, rows);
    },
    onSuccess: () => {
      toast.success("Absensi disimpan.");
      void queryClient.invalidateQueries({ queryKey: ["session", id] });
    },
    onError: () => toast.error("Gagal menyimpan absensi"),
  });

  const verifyMut = useMutation({
    mutationFn: () => verifySession(id),
    onSuccess: () => {
      toast.success("Sesi diverifikasi.");
      void queryClient.invalidateQueries({ queryKey: ["session", id] });
    },
    onError: () => toast.error("Gagal verifikasi"),
  });

  const cancelMut = useMutation({
    mutationFn: () => cancelSession(id, "Dibatalkan dari UI"),
    onSuccess: () => {
      toast.success("Sesi dibatalkan.");
      void queryClient.invalidateQueries({ queryKey: ["session", id] });
    },
    onError: () => toast.error("Gagal membatalkan"),
  });

  const ses = sessionQ.data;
  const tone = (STATUS_BADGE[ses?.status ?? ""] ?? "neutral") as StatusBadgeTone;

  return (
    <ProtectedRoute>
      <AppShell>
        <div className="space-y-(--space-5)">
          <Link href={"/sesi/" as Route} className="text-accent-text underline">
            ← Kembali ke daftar sesi
          </Link>
          <PageHead
            seq="OPS"
            eyebrow="Operasional"
            title="Detail Sesi"
            lede={ses ? `${ses.date} · ${ses.scheduled_start}–${ses.scheduled_end}` : "…"}
            actions={
              <>
                <Button
                  type="button"
                  variant="outline"
                  data-testid="btn-verify"
                  onClick={() => verifyMut.mutate()}
                >
                  Verifikasi
                </Button>
                <Button
                  type="button"
                  variant="ghost"
                  data-testid="btn-cancel-session"
                  onClick={() => cancelMut.mutate()}
                >
                  Batalkan
                </Button>
              </>
            }
          />
          {sessionQ.isPending ? (
            <p className="text-secondary">Memuat sesi…</p>
          ) : null}
          {sessionQ.isError ? (
            <p role="alert" className="text-critical">
              Gagal memuat sesi
            </p>
          ) : null}
          {ses ? (
            <>
              <p data-testid="ses-status">
                <StatusBadge tone={tone}>
                  {SESSION_STATUS_LABEL[
                    ses.status as keyof typeof SESSION_STATUS_LABEL
                  ] ?? ses.status}
                </StatusBadge>
              </p>
              <section className="rounded-control border border-line-subtle bg-canvas p-(--space-4)">
                <h2 className="mb-(--space-3) font-semibold text-primary">
                  Absensi Murid
                </h2>
                <div className="space-y-(--space-3)">
                  {(ses.student_ids ?? []).map((sid) => {
                    const student = studentsQ.data?.find((s) => s.student_id === sid);
                    const row = attForm[sid] ?? { status: "hadir", note: "" };
                    return (
                      <div
                        key={sid}
                        data-testid={`att-row-${sid}`}
                        className="grid gap-(--space-2) md:grid-cols-[1fr_12rem_1fr]"
                      >
                        <span>{student?.name ?? sid}</span>
                        <select
                          data-testid={`att-status-${sid}`}
                          className="rounded-control border border-line-subtle px-(--space-2) py-(--space-1)"
                          value={row.status}
                          onChange={(e) =>
                            setAttForm({
                              ...attForm,
                              [sid]: { ...row, status: e.target.value },
                            })
                          }
                        >
                          {Object.entries(ATTEND_LABEL).map(([k, v]) => (
                            <option key={k} value={k}>
                              {v}
                            </option>
                          ))}
                        </select>
                        <input
                          data-testid={`att-note-${sid}`}
                          className="rounded-control border border-line-subtle px-(--space-2) py-(--space-1)"
                          value={row.note}
                          onChange={(e) =>
                            setAttForm({
                              ...attForm,
                              [sid]: { ...row, note: e.target.value },
                            })
                          }
                          placeholder="Catatan"
                        />
                      </div>
                    );
                  })}
                </div>
                <Button
                  type="button"
                  className="mt-(--space-4)"
                  data-testid="btn-save-attendance"
                  onClick={() => saveAtt.mutate()}
                >
                  Simpan absensi
                </Button>
              </section>
              <p className="text-(length:--font-size-label) text-secondary">
                Panel evaluasi lengkap + CP picker dilanjutkan di iterasi berikutnya
                sub-fase 2 (Task 10–11).
              </p>
            </>
          ) : null}
        </div>
      </AppShell>
    </ProtectedRoute>
  );
}
