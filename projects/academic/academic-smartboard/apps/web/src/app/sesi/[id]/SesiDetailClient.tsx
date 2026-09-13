"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import Link from "next/link";
import type { Route } from "next";
import { useParams } from "next/navigation";
import { useEffect, useMemo, useState, type ReactNode } from "react";
import { toast } from "sonner";
import { AttendanceCatchUp } from "../../../components/AttendanceCatchUp.tsx";
import { AppShell } from "../../../components/AppShell.tsx";
import { CpPickerModal } from "../../../components/CpPickerModal.tsx";
import { PageHead } from "../../../components/PageHead.tsx";
import { ProtectedRoute } from "../../../components/ProtectedRoute.tsx";
import { StatusBadge } from "../../../components/StatusBadge.tsx";
import { Button } from "../../../components/ui/button.tsx";
import {
  cancelSession,
  draftEvaluation,
  getSession,
  getTutor,
  listGradeLevels,
  listStudents,
  listSubjects,
  listTutors,
  rescheduleSession,
  saveAttendance,
  submitEvaluation,
  tutorCheckIn,
  tutorCheckOut,
  verifySession,
  type CurriculumOutcome,
  type StudentAttendance,
} from "../../../lib/api.ts";
import { useAuth } from "../../../lib/auth.tsx";
import {
  ATTEND_LABEL,
  COMPETENCE_LABEL,
  FORMAT_LABEL,
  MODE_LABEL,
  SESSION_STATUS_LABEL,
  STATUS_BADGE,
  rupiah,
  type StatusBadgeTone,
} from "../../../lib/labels.ts";
import {
  buildCpContext,
  buildEvalSubmitBody,
  canSubmitDraft,
  initialEvalForm,
  needsParentNoteConfirm,
  shouldShowCatchUp,
  studentsMissingAttendance,
  type EvalFormState,
} from "../../../lib/sessionDetail.ts";

const ATT_STATUS = ["hadir", "terlambat", "izin", "sakit", "tidak_hadir"] as const;
const SCORE_KEYS = [
  "understanding",
  "focus",
  "participation",
  "independence",
] as const;

const SCORE_LABELS: Record<(typeof SCORE_KEYS)[number], string> = {
  understanding: "Pemahaman",
  focus: "Fokus",
  participation: "Partisipasi",
  independence: "Kemandirian",
};

export function SesiDetailClient() {
  const params = useParams<{ id: string }>();
  const id = params?.id ?? "";
  const { user } = useAuth();
  const queryClient = useQueryClient();

  const isTutor = user?.role === "tentor";
  const isStaff = user?.role === "owner" || user?.role === "admin_akademik";
  const isParent = user?.role === "murid_ortu";
  const canManageAtt = isTutor || isStaff;

  const sessionQ = useQuery({
    queryKey: ["session", id],
    queryFn: () => getSession(id),
    enabled: Boolean(id) && id !== "placeholder",
  });
  const studentsQ = useQuery({ queryKey: ["students"], queryFn: listStudents });
  const subjectsQ = useQuery({ queryKey: ["subjects"], queryFn: listSubjects });
  const tutorsQ = useQuery({ queryKey: ["tutors"], queryFn: listTutors });
  const gradesQ = useQuery({ queryKey: ["grades"], queryFn: listGradeLevels });

  const ses = sessionQ.data;
  const subject = subjectsQ.data?.find((s) => s.subject_id === ses?.subject_id);
  const tutorQ = useQuery({
    queryKey: ["tutor", ses?.tutor_id],
    queryFn: () => getTutor(ses!.tutor_id),
    enabled: Boolean(ses?.tutor_id),
  });

  const [attForm, setAttForm] = useState<
    Record<string, { student_id: string; status: string; note: string; reason?: string }>
  >({});
  const [showEvalFor, setShowEvalFor] = useState<string | null>(null);
  const [evalForm, setEvalForm] = useState<EvalFormState>(initialEvalForm);
  const [draftNotes, setDraftNotes] = useState("");
  const [drafting, setDrafting] = useState(false);
  const [aiMeta, setAiMeta] = useState<{
    populated_fields?: string[];
    model?: string | null;
    parent_note_needs_confirm?: boolean;
    cp_used?: { code?: string };
    cp_text_injected?: boolean;
    draft?: EvalFormState;
  } | null>(null);
  const [parentNoteConfirmed, setParentNoteConfirmed] = useState(false);
  const [cpPicked, setCpPicked] = useState<CurriculumOutcome | null>(null);
  const [showCpModal, setShowCpModal] = useState(false);
  const [showReschedule, setShowReschedule] = useState(false);
  const [reschedule, setReschedule] = useState({
    date: "",
    start_time: "",
    end_time: "",
    reason: "",
  });
  const [markSubstitute, setMarkSubstitute] = useState(false);
  const [substituteId, setSubstituteId] = useState("");

  useEffect(() => {
    if (!ses) return;
    const next: typeof attForm = {};
    for (const sid of ses.student_ids ?? []) {
      const existing = ses.student_attendance?.find((a) => a.student_id === sid);
      next[sid] = {
        student_id: sid,
        status: existing?.status ?? "hadir",
        note: existing?.note ?? "",
        reason: existing?.reason ?? "",
      };
    }
    setAttForm(next);
  }, [ses]);

  const studentNames = useMemo(() => {
    const m: Record<string, string> = {};
    for (const s of studentsQ.data ?? []) m[s.student_id] = s.name;
    return m;
  }, [studentsQ.data]);

  const cpContext = useMemo(
    () => buildCpContext(ses ?? null, gradesQ.data ?? [], subject),
    [ses, gradesQ.data, subject],
  );

  const missing = useMemo(
    () => (ses ? studentsMissingAttendance(ses, studentNames) : []),
    [ses, studentNames],
  );
  const showCatchUp = Boolean(
    ses && canManageAtt && shouldShowCatchUp(ses, missing.length),
  );

  const invalidate = () =>
    void queryClient.invalidateQueries({ queryKey: ["session", id] });

  const saveAtt = useMutation({
    mutationFn: async () => {
      const rows: StudentAttendance[] = Object.values(attForm).map((v) => ({
        session_id: id,
        student_id: v.student_id,
        status: v.status,
        note: v.note,
        reason: v.reason,
      }));
      return saveAttendance(id, rows);
    },
    onSuccess: () => {
      toast.success("Absensi murid tersimpan.");
      invalidate();
    },
    onError: () => toast.error("Gagal menyimpan absensi"),
  });

  const verifyMut = useMutation({
    mutationFn: () => verifySession(id),
    onSuccess: () => {
      toast.success("Sesi terverifikasi. Honor otomatis dihitung.");
      invalidate();
    },
    onError: () => toast.error("Gagal verifikasi"),
  });

  const cancelMut = useMutation({
    mutationFn: () => cancelSession(id, "Dibatalkan dari UI"),
    onSuccess: () => {
      toast.success("Sesi dibatalkan.");
      invalidate();
    },
    onError: () => toast.error("Gagal membatalkan"),
  });

  const rescheduleMut = useMutation({
    mutationFn: () => rescheduleSession(id, reschedule),
    onSuccess: () => {
      toast.success("Sesi dijadwalkan ulang.");
      setShowReschedule(false);
      invalidate();
    },
    onError: () => toast.error("Gagal menjadwalkan ulang"),
  });

  async function handleCheckIn() {
    if (markSubstitute && !substituteId) {
      toast.error("Pilih pengajar pengganti terlebih dahulu.");
      return;
    }
    const now = new Date().toTimeString().slice(0, 5);
    try {
      await tutorCheckIn({
        session_id: id,
        check_in: now,
        status: markSubstitute ? "digantikan" : "hadir",
        substitute_tutor_id: markSubstitute ? substituteId : null,
      });
      toast.success(markSubstitute ? `Check-in pengganti ${now}` : `Check-in ${now}`);
      setMarkSubstitute(false);
      invalidate();
    } catch {
      toast.error("Gagal check-in");
    }
  }

  async function handleCheckOut() {
    const now = new Date().toTimeString().slice(0, 5);
    try {
      await tutorCheckOut({ session_id: id, check_out: now });
      toast.success(`Check-out ${now}`);
      invalidate();
    } catch {
      toast.error("Gagal check-out");
    }
  }

  async function handleDraftEval(studentId: string) {
    if (!canSubmitDraft(draftNotes)) {
      toast.error("Tulis catatan sesi minimal beberapa kalimat dulu.");
      return;
    }
    setDrafting(true);
    try {
      const data = (await draftEvaluation(id, {
        student_id: studentId,
        notes: draftNotes,
        ...(cpPicked ? { cp_id: cpPicked.learning_outcome_code } : {}),
      })) as typeof aiMeta & { draft?: EvalFormState };
      setEvalForm((f) => ({
        ...f,
        ...(data?.draft ?? {}),
        internal_note: f.internal_note || "",
      }));
      setAiMeta(data);
      setParentNoteConfirmed(false);
      toast.success("Draf AI siap. Periksa dan edit sebelum menyimpan.");
    } catch {
      toast.error("Gagal membuat draf AI");
    } finally {
      setDrafting(false);
    }
  }

  async function handleSubmitEval(studentId: string) {
    if (
      needsParentNoteConfirm(
        aiMeta,
        String(evalForm.parent_note ?? ""),
        parentNoteConfirmed,
      )
    ) {
      toast.error("Konfirmasi dulu catatan untuk orang tua sebelum menyimpan.");
      return;
    }
    try {
      await submitEvaluation(
        id,
        buildEvalSubmitBody({
          sessionId: id,
          studentId,
          evalForm,
          aiMeta,
          cpPicked,
        }),
      );
      toast.success("Evaluasi tersimpan.");
      setShowEvalFor(null);
      setEvalForm(initialEvalForm());
      setDraftNotes("");
      setAiMeta(null);
      setParentNoteConfirmed(false);
      setCpPicked(null);
      setShowCpModal(false);
      invalidate();
    } catch {
      toast.error("Gagal menyimpan evaluasi");
    }
  }

  const tone = (STATUS_BADGE[ses?.status ?? ""] ?? "neutral") as StatusBadgeTone;
  const locked =
    ses?.status === "terverifikasi" || ses?.status === "dibatalkan";

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
            lede={
              ses ? `${ses.date} · ${ses.scheduled_start}–${ses.scheduled_end}` : "…"
            }
            actions={
              isStaff && ses && !locked ? (
                <>
                  <Button
                    type="button"
                    variant="outline"
                    data-testid="btn-reschedule"
                    onClick={() => {
                      setReschedule({
                        date: ses.date,
                        start_time: ses.scheduled_start,
                        end_time: ses.scheduled_end,
                        reason: "",
                      });
                      setShowReschedule(true);
                    }}
                  >
                    Jadwalkan ulang
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    data-testid="btn-verify"
                    onClick={() => {
                      if (
                        window.confirm(
                          "Verifikasi sesi ini? Honor akan dihitung otomatis.",
                        )
                      ) {
                        verifyMut.mutate();
                      }
                    }}
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
              ) : null
            }
          />

          {sessionQ.isPending ? <p className="text-secondary">Memuat sesi…</p> : null}
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

              <div className="grid gap-(--space-4) lg:grid-cols-2">
                <section className="rounded-control border border-line-subtle bg-canvas p-(--space-4)">
                  <h2 className="mb-(--space-3) font-semibold text-primary">
                    Informasi Sesi
                  </h2>
                  <dl className="grid gap-(--space-3) sm:grid-cols-2">
                    <Info label="Pengajar" value={tutorQ.data?.name || "—"} />
                    <Info label="Mata Pelajaran" value={subject?.name || "—"} />
                    <Info
                      label="Format Kelas"
                      value={
                        FORMAT_LABEL[ses.format as keyof typeof FORMAT_LABEL] ??
                        ses.format
                      }
                    />
                    <Info
                      label="Mode Pembelajaran"
                      value={
                        MODE_LABEL[ses.mode as keyof typeof MODE_LABEL] ?? ses.mode
                      }
                    />
                    <Info
                      label="Waktu Terjadwal"
                      value={`${ses.scheduled_start} — ${ses.scheduled_end}`}
                    />
                    <Info
                      label="Waktu Aktual"
                      value={
                        ses.actual_start
                          ? `${ses.actual_start} — ${ses.actual_end || "…"}`
                          : "—"
                      }
                    />
                    <Info label="Jumlah Murid" value={String(ses.student_ids.length)} />
                    <Info
                      label="Status Verifikasi"
                      value={ses.verified ? "Terverifikasi" : "Belum"}
                    />
                  </dl>
                </section>

                <section className="rounded-control border border-line-subtle bg-canvas p-(--space-4)">
                  <h2 className="mb-(--space-3) font-semibold text-primary">
                    Absensi Pengajar
                  </h2>
                  <div className="space-y-(--space-2) text-(length:--font-size-body)">
                    <div className="flex justify-between">
                      <span className="text-secondary">Check-in</span>
                      <span>{ses.tutor_attendance?.check_in || "—"}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-secondary">Check-out</span>
                      <span>{ses.tutor_attendance?.check_out || "—"}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-secondary">Durasi Aktual</span>
                      <span>
                        {ses.tutor_attendance?.actual_duration_min || 0} menit
                      </span>
                    </div>
                    {ses.tutor_attendance?.status === "digantikan" ? (
                      <p
                        data-testid="substitute-banner"
                        className="rounded-control bg-surface px-(--space-3) py-(--space-2) text-warning"
                      >
                        Digantikan ·{" "}
                        {tutorsQ.data?.find(
                          (t) =>
                            t.tutor_id === ses.tutor_attendance?.substitute_tutor_id,
                        )?.name || ses.tutor_attendance.substitute_tutor_id}
                      </p>
                    ) : null}
                    {canManageAtt && !locked ? (
                      <div className="mt-(--space-3) flex flex-col gap-(--space-2)">
                        {!ses.tutor_attendance?.check_in ? (
                          <>
                            <label className="flex items-center gap-(--space-2)">
                              <input
                                type="checkbox"
                                checked={markSubstitute}
                                onChange={(e) => setMarkSubstitute(e.target.checked)}
                                data-testid="chk-substitute"
                              />
                              Digantikan pengajar lain
                            </label>
                            {markSubstitute ? (
                              <select
                                data-testid="select-substitute"
                                className="rounded-control border border-line-subtle px-(--space-3) py-(--space-2)"
                                value={substituteId}
                                onChange={(e) => setSubstituteId(e.target.value)}
                              >
                                <option value="">— Pilih pengganti —</option>
                                {(tutorsQ.data ?? [])
                                  .filter((t) => t.tutor_id !== ses.tutor_id)
                                  .map((t) => (
                                    <option key={t.tutor_id} value={t.tutor_id}>
                                      {t.name}
                                    </option>
                                  ))}
                              </select>
                            ) : null}
                            <Button
                              type="button"
                              data-testid="btn-checkin"
                              onClick={() => void handleCheckIn()}
                            >
                              Check-in
                            </Button>
                          </>
                        ) : null}
                        {ses.tutor_attendance?.check_in &&
                        !ses.tutor_attendance?.check_out ? (
                          <Button
                            type="button"
                            data-testid="btn-checkout"
                            onClick={() => void handleCheckOut()}
                          >
                            Check-out
                          </Button>
                        ) : null}
                      </div>
                    ) : null}
                  </div>
                </section>
              </div>

              {showCatchUp ? (
                <AttendanceCatchUp
                  sessionId={id}
                  students={missing}
                  onDone={invalidate}
                />
              ) : null}

              <section className="rounded-control border border-line-subtle bg-canvas p-(--space-4)">
                <div className="mb-(--space-3) flex items-center justify-between gap-(--space-3)">
                  <h2 className="font-semibold text-primary">Absensi Murid</h2>
                  {canManageAtt && !locked ? (
                    <Button
                      type="button"
                      data-testid="btn-save-attendance"
                      onClick={() => saveAtt.mutate()}
                    >
                      Simpan Absensi
                    </Button>
                  ) : null}
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-(length:--font-size-body)">
                    <thead className="bg-surface text-secondary">
                      <tr>
                        <th className="px-(--space-3) py-(--space-2)">Nama Murid</th>
                        <th className="px-(--space-3) py-(--space-2)">Status</th>
                        <th className="px-(--space-3) py-(--space-2)">Alasan / Catatan</th>
                        <th className="px-(--space-3) py-(--space-2)">Evaluasi</th>
                      </tr>
                    </thead>
                    <tbody>
                      {(ses.student_ids ?? []).map((sid) => {
                        const student = studentsQ.data?.find((s) => s.student_id === sid);
                        const att = attForm[sid] ?? {
                          student_id: sid,
                          status: "hadir",
                          note: "",
                        };
                        const existingEval = (ses.evaluations ?? []).find(
                          (e) => e.student_id === sid,
                        );
                        return (
                          <tr
                            key={sid}
                            data-testid={`att-row-${sid}`}
                            className="border-t border-line-subtle"
                          >
                            <td className="px-(--space-3) py-(--space-2)">
                              {student?.name ?? sid}
                            </td>
                            <td className="px-(--space-3) py-(--space-2)">
                              {canManageAtt ? (
                                <select
                                  data-testid={`att-status-${sid}`}
                                  disabled={locked}
                                  className="rounded-control border border-line-subtle px-(--space-2) py-(--space-1)"
                                  value={att.status}
                                  onChange={(e) =>
                                    setAttForm({
                                      ...attForm,
                                      [sid]: {
                                        ...att,
                                        student_id: sid,
                                        status: e.target.value,
                                      },
                                    })
                                  }
                                >
                                  {ATT_STATUS.map((x) => (
                                    <option key={x} value={x}>
                                      {ATTEND_LABEL[x]}
                                    </option>
                                  ))}
                                </select>
                              ) : (
                                ATTEND_LABEL[
                                  att.status as keyof typeof ATTEND_LABEL
                                ] ?? att.status
                              )}
                            </td>
                            <td className="px-(--space-3) py-(--space-2)">
                              {canManageAtt ? (
                                <input
                                  data-testid={`att-note-${sid}`}
                                  disabled={locked}
                                  className="w-full rounded-control border border-line-subtle px-(--space-2) py-(--space-1)"
                                  value={att.note}
                                  onChange={(e) =>
                                    setAttForm({
                                      ...attForm,
                                      [sid]: {
                                        ...att,
                                        student_id: sid,
                                        note: e.target.value,
                                      },
                                    })
                                  }
                                />
                              ) : (
                                att.note || "—"
                              )}
                            </td>
                            <td className="px-(--space-3) py-(--space-2)">
                              {existingEval ? (
                                <span className="text-success">
                                  Terisi · {existingEval.overall_score}/5
                                </span>
                              ) : canManageAtt && !locked ? (
                                <button
                                  type="button"
                                  data-testid={`btn-eval-${sid}`}
                                  className="text-accent-text underline"
                                  onClick={() => {
                                    setShowEvalFor(sid);
                                    setEvalForm(initialEvalForm());
                                    setDraftNotes("");
                                    setAiMeta(null);
                                    setParentNoteConfirmed(false);
                                    setCpPicked(null);
                                    setShowCpModal(false);
                                  }}
                                >
                                  Isi Evaluasi →
                                </button>
                              ) : (
                                "Belum diisi"
                              )}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </section>

              {(ses.evaluations ?? []).length > 0 ? (
                <section className="rounded-control border border-line-subtle bg-canvas p-(--space-4)">
                  <h2 className="mb-(--space-3) font-semibold text-primary">
                    Evaluasi Murid
                  </h2>
                  <div className="grid gap-(--space-3) md:grid-cols-2">
                    {(ses.evaluations ?? []).map((ev) => {
                      const s = studentsQ.data?.find(
                        (x) => x.student_id === ev.student_id,
                      );
                      return (
                        <div
                          key={ev.eval_id ?? ev.student_id}
                          className="rounded-control border border-line-subtle bg-surface p-(--space-3)"
                        >
                          <div className="mb-(--space-2) flex items-center justify-between gap-(--space-2)">
                            <span className="font-medium">{s?.name ?? ev.student_id}</span>
                            <StatusBadge tone="info">
                              {COMPETENCE_LABEL[
                                ev.competence_status as keyof typeof COMPETENCE_LABEL
                              ] ?? ev.competence_status}
                            </StatusBadge>
                          </div>
                          <div className="grid grid-cols-4 gap-(--space-2) text-(length:--font-size-label)">
                            <div>Paham {ev.understanding}/5</div>
                            <div>Fokus {ev.focus}/5</div>
                            <div>Partisipasi {ev.participation}/5</div>
                            <div>Kemandirian {ev.independence}/5</div>
                          </div>
                          {ev.parent_note ? (
                            <p className="mt-(--space-2) text-(length:--font-size-body) text-secondary">
                              {ev.parent_note}
                            </p>
                          ) : null}
                          {!isParent && ev.internal_note ? (
                            <p className="mt-(--space-2) text-(length:--font-size-label) text-secondary">
                              <span className="font-medium">Internal: </span>
                              {ev.internal_note}
                            </p>
                          ) : null}
                        </div>
                      );
                    })}
                  </div>
                </section>
              ) : null}

              {ses.earnings && !isParent ? (
                <section className="rounded-control border border-line-subtle bg-canvas p-(--space-4)">
                  <h2 className="mb-(--space-3) font-semibold text-primary">
                    Honor Tentor untuk Sesi Ini
                  </h2>
                  <div className="grid gap-(--space-3) sm:grid-cols-4">
                    <Info
                      label="Tarif Dasar"
                      value={rupiah(ses.earnings.base_amount)}
                    />
                    <Info
                      label="Insentif"
                      value={rupiah(ses.earnings.incentive)}
                    />
                    <Info
                      label="Transport"
                      value={rupiah(ses.earnings.transport)}
                    />
                    <Info label="Total" value={rupiah(ses.earnings.total)} />
                  </div>
                </section>
              ) : null}
            </>
          ) : null}

          {showEvalFor ? (
            <div
              className="fixed inset-0 z-(--z-drawer) flex items-center justify-center bg-black/40 p-(--space-4)"
              role="presentation"
              onClick={() => setShowEvalFor(null)}
            >
              <div
                className="max-h-[90vh] w-full max-w-2xl overflow-y-auto rounded-control border border-line-subtle bg-canvas p-(--space-5)"
                role="dialog"
                aria-modal="true"
                aria-label={`Evaluasi untuk ${studentNames[showEvalFor] || "murid"}`}
                onClick={(e) => e.stopPropagation()}
              >
                <div className="mb-(--space-4) flex items-start justify-between">
                  <h2 className="text-(length:--font-size-title-section) font-semibold">
                    Evaluasi untuk {studentNames[showEvalFor] || showEvalFor}
                  </h2>
                  <Button
                    type="button"
                    variant="ghost"
                    aria-label="Tutup"
                    onClick={() => setShowEvalFor(null)}
                  >
                    ✕
                  </Button>
                </div>

                <div className="space-y-(--space-3)">
                  <Field label="Catatan sesi (untuk draf AI)">
                    <textarea
                      rows={3}
                      data-testid="eval-draft-notes"
                      className="w-full rounded-control border border-line-subtle px-(--space-3) py-(--space-2)"
                      value={draftNotes}
                      onChange={(e) => setDraftNotes(e.target.value)}
                      placeholder="Contoh: Murid masih bingung pecahan, latihan 5 soal, PR halaman 12…"
                    />
                  </Field>

                  <Field label="Capaian Pembelajaran (konteks draf AI, opsional)">
                    {cpPicked ? (
                      <div className="flex flex-wrap items-center gap-(--space-3)">
                        <span data-testid="cp-picked-label" className="text-primary">
                          {cpPicked.learning_outcome_code} — {cpPicked.element_name}
                        </span>
                        <button
                          type="button"
                          data-testid="btn-change-cp"
                          className="text-accent-text underline"
                          onClick={() => setShowCpModal(true)}
                        >
                          Ganti CP
                        </button>
                        <button
                          type="button"
                          data-testid="btn-clear-cp"
                          className="text-accent-text underline"
                          onClick={() => setCpPicked(null)}
                        >
                          Hapus
                        </button>
                      </div>
                    ) : cpContext.ready ? (
                      <div className="space-y-(--space-1)">
                        <Button
                          type="button"
                          variant="outline"
                          data-testid="btn-pick-cp"
                          onClick={() => setShowCpModal(true)}
                        >
                          Pilih CP →
                        </Button>
                        <p className="text-(length:--font-size-label) text-secondary">
                          Filter: {cpContext.subjectName} · {cpContext.gradeLabel} ·
                          Fase {cpContext.phase}
                        </p>
                      </div>
                    ) : (
                      <Button
                        type="button"
                        variant="outline"
                        disabled
                        title="Lengkapi subject & grade di sesi untuk mengaktifkan pemilihan CP"
                        data-testid="btn-pick-cp-disabled"
                      >
                        Pilih CP (subject/grade belum diisi)
                      </Button>
                    )}
                  </Field>

                  <div className="flex justify-end">
                    <Button
                      type="button"
                      variant="outline"
                      data-testid="btn-draft-eval"
                      disabled={drafting}
                      onClick={() => void handleDraftEval(showEvalFor)}
                    >
                      {drafting ? "Menyusun draf…" : "Susun draf AI"}
                    </Button>
                  </div>

                  {aiMeta?.cp_used ? (
                    <p data-testid="ai-cp-badge" className="text-(length:--font-size-label) text-secondary">
                      {aiMeta.cp_text_injected
                        ? `Draf AI memakai CP: ${aiMeta.cp_used.code}`
                        : `(CP dipilih tapi teks tertahan lisensi: ${aiMeta.cp_used.code})`}
                    </p>
                  ) : null}

                  <Field label="Target Pembelajaran">
                    <input
                      data-testid="eval-target"
                      className="w-full rounded-control border border-line-subtle px-(--space-3) py-(--space-2)"
                      value={String(evalForm.target_learning ?? "")}
                      onChange={(e) =>
                        setEvalForm((f) => ({ ...f, target_learning: e.target.value }))
                      }
                    />
                  </Field>
                  <Field label="Materi yang Diajarkan">
                    <input
                      data-testid="eval-material"
                      className="w-full rounded-control border border-line-subtle px-(--space-3) py-(--space-2)"
                      value={String(evalForm.material_taught ?? "")}
                      onChange={(e) =>
                        setEvalForm((f) => ({ ...f, material_taught: e.target.value }))
                      }
                    />
                  </Field>
                  <div className="grid grid-cols-2 gap-(--space-2) md:grid-cols-4">
                    {SCORE_KEYS.map((k) => (
                      <Field key={k} label={SCORE_LABELS[k]}>
                        <select
                          data-testid={`eval-${k}`}
                          className="w-full rounded-control border border-line-subtle px-(--space-2) py-(--space-1)"
                          value={Number(evalForm[k] ?? 3)}
                          onChange={(e) =>
                            setEvalForm((f) => ({ ...f, [k]: Number(e.target.value) }))
                          }
                        >
                          {[1, 2, 3, 4, 5].map((n) => (
                            <option key={n} value={n}>
                              {n}
                            </option>
                          ))}
                        </select>
                      </Field>
                    ))}
                  </div>
                  <Field label="Status Kompetensi">
                    <select
                      data-testid="eval-competence"
                      className="w-full rounded-control border border-line-subtle px-(--space-3) py-(--space-2)"
                      value={String(evalForm.competence_status ?? "cukup_memahami")}
                      onChange={(e) =>
                        setEvalForm((f) => ({
                          ...f,
                          competence_status: e.target.value,
                        }))
                      }
                    >
                      {Object.entries(COMPETENCE_LABEL).map(([k, v]) => (
                        <option key={k} value={k}>
                          {v}
                        </option>
                      ))}
                    </select>
                  </Field>
                  <Field label="Kesulitan">
                    <textarea
                      rows={2}
                      data-testid="eval-difficulties"
                      className="w-full rounded-control border border-line-subtle px-(--space-3) py-(--space-2)"
                      value={String(evalForm.difficulties ?? "")}
                      onChange={(e) =>
                        setEvalForm((f) => ({ ...f, difficulties: e.target.value }))
                      }
                    />
                  </Field>
                  <Field label="Latihan di kelas">
                    <textarea
                      rows={2}
                      data-testid="eval-exercises"
                      className="w-full rounded-control border border-line-subtle px-(--space-3) py-(--space-2)"
                      value={String(evalForm.exercises ?? "")}
                      onChange={(e) =>
                        setEvalForm((f) => ({ ...f, exercises: e.target.value }))
                      }
                    />
                  </Field>
                  <Field label="Tugas Rumah">
                    <input
                      data-testid="eval-homework"
                      className="w-full rounded-control border border-line-subtle px-(--space-3) py-(--space-2)"
                      value={String(evalForm.homework ?? "")}
                      onChange={(e) =>
                        setEvalForm((f) => ({ ...f, homework: e.target.value }))
                      }
                    />
                  </Field>
                  <Field label="Rekomendasi pertemuan berikutnya">
                    <textarea
                      rows={2}
                      data-testid="eval-next"
                      className="w-full rounded-control border border-line-subtle px-(--space-3) py-(--space-2)"
                      value={String(evalForm.next_recommendation ?? "")}
                      onChange={(e) =>
                        setEvalForm((f) => ({
                          ...f,
                          next_recommendation: e.target.value,
                        }))
                      }
                    />
                  </Field>
                  <Field label="Catatan untuk Orang Tua">
                    <textarea
                      rows={2}
                      data-testid="eval-parent-note"
                      className="w-full rounded-control border border-line-subtle px-(--space-3) py-(--space-2)"
                      value={String(evalForm.parent_note ?? "")}
                      onChange={(e) => {
                        setEvalForm((f) => ({ ...f, parent_note: e.target.value }));
                        setParentNoteConfirmed(false);
                      }}
                    />
                  </Field>
                  {aiMeta && String(evalForm.parent_note ?? "").trim() ? (
                    <label className="flex items-start gap-(--space-2) text-(length:--font-size-label)">
                      <input
                        type="checkbox"
                        checked={parentNoteConfirmed}
                        onChange={(e) => setParentNoteConfirmed(e.target.checked)}
                        data-testid="eval-parent-confirm"
                      />
                      <span>
                        Saya sudah memeriksa catatan untuk orang tua dan setuju dikirim
                        apa adanya.
                      </span>
                    </label>
                  ) : null}
                  {!isParent ? (
                    <Field label="Catatan Internal (tidak tampil ke ortu)">
                      <textarea
                        rows={2}
                        data-testid="eval-internal-note"
                        className="w-full rounded-control border border-line-subtle px-(--space-3) py-(--space-2)"
                        value={String(evalForm.internal_note ?? "")}
                        onChange={(e) =>
                          setEvalForm((f) => ({
                            ...f,
                            internal_note: e.target.value,
                          }))
                        }
                      />
                    </Field>
                  ) : null}
                  <Field label="Skor Keseluruhan (1-5)">
                    <select
                      data-testid="eval-overall"
                      className="w-full rounded-control border border-line-subtle px-(--space-3) py-(--space-2)"
                      value={Number(evalForm.overall_score ?? 3)}
                      onChange={(e) =>
                        setEvalForm((f) => ({
                          ...f,
                          overall_score: Number(e.target.value),
                        }))
                      }
                    >
                      {[1, 2, 3, 4, 5].map((n) => (
                        <option key={n} value={n}>
                          {n}
                        </option>
                      ))}
                    </select>
                  </Field>
                </div>

                <div className="mt-(--space-5) flex justify-end gap-(--space-2)">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => setShowEvalFor(null)}
                  >
                    Batal
                  </Button>
                  <Button
                    type="button"
                    data-testid="btn-submit-eval"
                    onClick={() => void handleSubmitEval(showEvalFor)}
                  >
                    Simpan Evaluasi
                  </Button>
                </div>
              </div>
            </div>
          ) : null}

          <CpPickerModal
            open={showCpModal}
            onClose={() => setShowCpModal(false)}
            onPick={(cp) => {
              setCpPicked(cp);
              setShowCpModal(false);
            }}
            lockedPhase={cpContext.phase}
            lockedSubject={cpContext.subjectName}
            gradeLabel={cpContext.gradeLabel}
            subjectLabel={cpContext.subjectName || ""}
          />

          {showReschedule ? (
            <div
              className="fixed inset-0 z-(--z-drawer) flex items-center justify-center bg-black/40 p-(--space-4)"
              role="presentation"
              onClick={() => setShowReschedule(false)}
            >
              <div
                className="w-full max-w-md rounded-control border border-line-subtle bg-canvas p-(--space-5)"
                role="dialog"
                aria-modal="true"
                aria-label="Jadwalkan ulang sesi"
                data-testid="reschedule-modal"
                onClick={(e) => e.stopPropagation()}
              >
                <h2 className="mb-(--space-4) font-semibold">Jadwalkan Ulang Sesi</h2>
                <div className="space-y-(--space-3)">
                  <label className="block text-(length:--font-size-label) text-secondary">
                    Tanggal
                    <input
                      type="date"
                      data-testid="reschedule-date"
                      className="mt-(--space-1) w-full rounded-control border border-line-subtle px-(--space-3) py-(--space-2)"
                      value={reschedule.date}
                      onChange={(e) =>
                        setReschedule({ ...reschedule, date: e.target.value })
                      }
                    />
                  </label>
                  <div className="grid grid-cols-2 gap-(--space-3)">
                    <label className="block text-(length:--font-size-label) text-secondary">
                      Mulai
                      <input
                        type="time"
                        data-testid="reschedule-start"
                        className="mt-(--space-1) w-full rounded-control border border-line-subtle px-(--space-3) py-(--space-2)"
                        value={reschedule.start_time}
                        onChange={(e) =>
                          setReschedule({
                            ...reschedule,
                            start_time: e.target.value,
                          })
                        }
                      />
                    </label>
                    <label className="block text-(length:--font-size-label) text-secondary">
                      Selesai
                      <input
                        type="time"
                        data-testid="reschedule-end"
                        className="mt-(--space-1) w-full rounded-control border border-line-subtle px-(--space-3) py-(--space-2)"
                        value={reschedule.end_time}
                        onChange={(e) =>
                          setReschedule({ ...reschedule, end_time: e.target.value })
                        }
                      />
                    </label>
                  </div>
                  <label className="block text-(length:--font-size-label) text-secondary">
                    Alasan
                    <textarea
                      rows={2}
                      data-testid="reschedule-reason"
                      className="mt-(--space-1) w-full rounded-control border border-line-subtle px-(--space-3) py-(--space-2)"
                      value={reschedule.reason}
                      onChange={(e) =>
                        setReschedule({ ...reschedule, reason: e.target.value })
                      }
                    />
                  </label>
                </div>
                <div className="mt-(--space-4) flex justify-end gap-(--space-2)">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => setShowReschedule(false)}
                  >
                    Batal
                  </Button>
                  <Button
                    type="button"
                    data-testid="btn-save-reschedule"
                    onClick={() => {
                      if (
                        !reschedule.date ||
                        !reschedule.start_time ||
                        !reschedule.end_time
                      ) {
                        toast.error("Lengkapi tanggal dan jam.");
                        return;
                      }
                      if (window.confirm("Jadwalkan ulang sesi ini?")) {
                        rescheduleMut.mutate();
                      }
                    }}
                  >
                    Simpan
                  </Button>
                </div>
              </div>
            </div>
          ) : null}
        </div>
      </AppShell>
    </ProtectedRoute>
  );
}

function Info({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <div className="text-(length:--font-size-label) text-secondary">{label}</div>
      <div className="text-primary">{value}</div>
    </div>
  );
}

function Field({
  label,
  children,
}: {
  label: string;
  children: ReactNode;
}) {
  return (
    <label className="block text-(length:--font-size-label) text-secondary">
      {label}
      <div className="mt-(--space-1)">{children}</div>
    </label>
  );
}
