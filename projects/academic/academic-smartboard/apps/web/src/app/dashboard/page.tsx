"use client";

import { useQuery, useQueryClient } from "@tanstack/react-query";
import { AlertTriangle, ChevronRight, RefreshCw } from "lucide-react";
import Link from "next/link";
import type { Route } from "next";
import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import { AppShell } from "../../components/AppShell.tsx";
import { FinanceActivityCard } from "../../components/dashboard/FinanceActivityCard.tsx";
import { StudentEvalCard } from "../../components/dashboard/StudentEvalCard.tsx";
import { TeachingActivityCard } from "../../components/dashboard/TeachingActivityCard.tsx";
import { TutorEvalCard } from "../../components/dashboard/TutorEvalCard.tsx";
import { PageHead } from "../../components/PageHead.tsx";
import { ProtectedRoute } from "../../components/ProtectedRoute.tsx";
import { StatusBadge } from "../../components/StatusBadge.tsx";
import { TerminalPanel } from "../../components/TerminalPanel.tsx";
import { Button } from "../../components/ui/button.tsx";
import {
  getDashboardInsights,
  getDashboardStats,
  getDashboardStudentRegularity,
  getDashboardTodaySchedule,
  listAttendanceGaps,
  listStudents,
  sendReminder,
  type DashboardSessionRow,
  type DashboardStatsResponse,
  type Student,
} from "../../lib/api.ts";
import { useAuth } from "../../lib/auth.tsx";
import {
  ANALYTICS_ORDER,
  buildDashboardProblems,
  formatMetric,
  greetingName,
  ROLE_VIEW,
  STARTED_STATUSES,
  type DashboardStats,
} from "../../lib/dashboard.ts";
import {
  SESSION_STATUS_LABEL,
  STATUS_BADGE,
  type StatusBadgeTone,
} from "../../lib/labels.ts";
import type { Role } from "../../lib/nav.ts";

const ANALYTICS_CARD = {
  teaching: { Component: TeachingActivityCard, source: "teaching" as const },
  tutor: { Component: TutorEvalCard, source: "tutor_eval" as const },
  finance: { Component: FinanceActivityCard, source: "finance" as const },
  student: { Component: StudentEvalCard, source: "student_eval" as const },
};

function toStats(raw: DashboardStatsResponse): DashboardStats {
  return {
    sessions_today: Number(raw.sessions_today ?? 0),
    sessions_ongoing: Number(raw.sessions_ongoing ?? 0),
    sessions_done_today: Number(raw.sessions_done_today ?? 0),
    missing_evaluations: Number(raw.missing_evaluations ?? 0),
    pending_verify: Number(raw.pending_verify ?? 0),
    students_present: Number(raw.students_present ?? 0),
    students_absent: Number(raw.students_absent ?? 0),
    est_payroll_month: Number(raw.est_payroll_month ?? 0),
    verified_sessions_month: Number(raw.verified_sessions_month ?? 0),
    attendance_sessions_today: Number(raw.attendance_sessions_today ?? 0),
    honor_entries_today: Number(raw.honor_entries_today ?? 0),
    period: typeof raw.period === "string" ? raw.period : undefined,
  };
}

function DashboardView() {
  const { user } = useAuth();
  const qc = useQueryClient();
  const role = (user?.role || "owner") as Role;
  const view = ROLE_VIEW[role] || ROLE_VIEW.owner;
  const canSeeJadwal = ["owner", "admin_akademik", "tentor"].includes(role);
  const canSeeAttGaps = ["owner", "admin_akademik", "tentor"].includes(role);
  const isOwner = role === "owner";
  const isParent = role === "murid_ortu";
  const isFinance = role === "finance";

  const [reminderStudentId, setReminderStudentId] = useState("");
  const [reminderMessage, setReminderMessage] = useState("");
  const [reminderBusy, setReminderBusy] = useState(false);

  const coreQ = useQuery({
    queryKey: ["dashboard", "core", role],
    queryFn: async () => {
      const [statsRaw, today] = await Promise.all([
        getDashboardStats(),
        getDashboardTodaySchedule(),
      ]);
      let attGaps = 0;
      if (canSeeAttGaps) {
        try {
          attGaps = (await listAttendanceGaps()).length;
        } catch {
          attGaps = 0;
        }
      }
      let regularityTidakRutin = 0;
      if (isOwner) {
        try {
          const reg = await getDashboardStudentRegularity();
          regularityTidakRutin = Number(reg?.tidak_rutin || 0);
        } catch {
          regularityTidakRutin = 0;
        }
      }
      let parentStudents: Student[] = [];
      if (isParent) {
        try {
          parentStudents = await listStudents();
        } catch {
          parentStudents = [];
        }
      }
      return {
        stats: toStats(statsRaw),
        today,
        attGaps,
        regularityTidakRutin,
        parentStudents,
      };
    },
  });

  const insightsQ = useQuery({
    queryKey: ["dashboard", "insights"],
    queryFn: getDashboardInsights,
  });

  const stats = coreQ.data?.stats ?? null;
  const today = coreQ.data?.today ?? [];
  const attGaps = coreQ.data?.attGaps ?? 0;
  const parentStudents = coreQ.data?.parentStudents ?? [];
  const problems = useMemo(
    () =>
      buildDashboardProblems({
        role,
        stats,
        attGaps,
        canSeeAttGaps,
        isOwner,
        isParent,
        regularityTidakRutin: coreQ.data?.regularityTidakRutin ?? 0,
      }),
    [
      role,
      stats,
      attGaps,
      canSeeAttGaps,
      isOwner,
      isParent,
      coreQ.data?.regularityTidakRutin,
    ],
  );

  useEffect(() => {
    if (isParent && !reminderStudentId && parentStudents[0]?.student_id) {
      setReminderStudentId(parentStudents[0].student_id);
    }
  }, [isParent, parentStudents, reminderStudentId]);

  async function retryAll(): Promise<void> {
    await Promise.all([
      qc.invalidateQueries({ queryKey: ["dashboard", "core"] }),
      qc.invalidateQueries({ queryKey: ["dashboard", "insights"] }),
    ]);
  }

  async function onSendReminder(): Promise<void> {
    if (!reminderStudentId || reminderMessage.trim().length < 3) {
      toast.error("Pilih murid dan isi pesan minimal 3 karakter.");
      return;
    }
    setReminderBusy(true);
    try {
      const data = await sendReminder({
        student_id: reminderStudentId,
        message: reminderMessage.trim(),
      });
      toast.success(`Pengingat terkirim ke ${data.notified || 0} penerima.`);
      setReminderMessage("");
    } catch (e: unknown) {
      const detail =
        e && typeof e === "object" && "response" in e
          ? (e as { response?: { data?: { detail?: string } } }).response?.data
              ?.detail
          : undefined;
      toast.error(detail || "Pengingat belum berhasil dikirim.");
    } finally {
      setReminderBusy(false);
    }
  }

  const attendanceRecorded =
    Number(stats?.students_present || 0) + Number(stats?.students_absent || 0) >
    0;

  const kpiByKey: Record<
    string,
    {
      testId: string;
      label: string;
      value: number | null | undefined;
      hint: string;
      format?: "int" | "rupiah";
      emphasis?: boolean;
    }
  > = {
    sessions: {
      testId: "kpi-sesi-hari-ini",
      label: "Kelas Hari Ini",
      value: stats?.sessions_today,
      hint: `${stats?.sessions_ongoing || 0} berlangsung · ${
        stats?.sessions_done_today || 0
      } selesai`,
    },
    attendance: {
      testId: "kpi-murid-hadir",
      label: "Murid Hadir Hari Ini",
      value: attendanceRecorded ? stats?.students_present : null,
      hint: attendanceRecorded
        ? `${stats?.students_absent || 0} tidak hadir atau izin`
        : "Belum ada absensi tercatat",
    },
    missing: {
      testId: "kpi-eval-belum",
      label: "Evaluasi Belum Diisi",
      value: stats?.missing_evaluations,
      hint: "Sesi menunggu evaluasi tentor",
    },
    verify: {
      testId: "kpi-verifikasi",
      label: "Menunggu Verifikasi",
      value: stats?.pending_verify,
      hint: "Sesi siap ditinjau admin",
    },
    payroll: {
      testId: "kpi-est-payroll",
      label:
        role === "tentor"
          ? "Estimasi Honor Bulan Ini"
          : "Estimasi Payroll Bulan Ini",
      value: stats?.est_payroll_month,
      format: "rupiah",
      hint: `Dari ${stats?.verified_sessions_month || 0} sesi terverifikasi`,
      emphasis: true,
    },
    verified: {
      testId: "kpi-verified-sessions",
      label: "Sesi Terverifikasi Bulan Ini",
      value: stats?.verified_sessions_month,
      hint: "Sumber perhitungan payroll",
    },
  };

  const error =
    coreQ.isError ? "Data ringkasan belum tersedia." : "";
  const insightsError = insightsQ.isError
    ? "Analitik belum tersedia. Ringkasan operasional tetap dapat digunakan."
    : "";

  return (
    <div className="space-y-(--space-5)" data-dashboard-role={role}>
      <PageHead
        seq={view.seq}
        eyebrow={view.eyebrow}
        title={
          <span data-testid="dashboard-greeting">
            Selamat datang kembali, {greetingName(user?.name)}
          </span>
        }
        lede="Smartboard merangkum kondisi operasional, kelas terdekat, dan hal-hal yang memerlukan perhatian hari ini."
        actions={
          <Button
            type="button"
            variant="outline"
            size="sm"
            data-testid="dashboard-retry"
            onClick={() => void retryAll()}
          >
            <RefreshCw size={14} aria-hidden /> Muat ulang
          </Button>
        }
      />

      {error ? (
        <div
          className="flex flex-wrap items-start justify-between gap-(--space-3) rounded-control border border-line-subtle bg-surface p-(--space-4)"
          role="alert"
          data-testid="dashboard-error"
        >
          <div>
            <h2 className="flex items-center gap-2 font-semibold text-primary">
              <AlertTriangle size={16} aria-hidden /> Smartboard belum dapat
              diperbarui
            </h2>
            <p className="mt-1 text-sm text-secondary">{error}</p>
          </div>
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => void retryAll()}
          >
            Muat ulang
          </Button>
        </div>
      ) : null}

      {coreQ.isPending && !stats ? (
        <p className="text-secondary" role="status" aria-live="polite">
          Memuat Smartboard…
        </p>
      ) : null}

      {stats ? (
        <>
          <section
            className="rounded-control border border-line-subtle bg-canvas p-(--space-4)"
            data-testid="dashboard-thesis"
            aria-label="Ringkasan operasional hari ini"
          >
            <div className="grid gap-(--space-4) lg:grid-cols-[1.2fr_1fr]">
              <div>
                <span className="text-xs tracking-wide text-secondary uppercase">
                  {problems.length > 0 ? "Perlu tindakan" : "Status antrean"}
                </span>
                <div
                  className={`mt-1 text-3xl font-semibold ${
                    problems.length > 0 ? "text-warning" : "text-success"
                  }`}
                >
                  {formatMetric(problems.length)}
                </div>
                <p className="mt-1 text-sm text-secondary">
                  {problems.length > 0
                    ? `${problems.length} item menunggu perhatian role ini — urut mendesak di bawah.`
                    : "Tidak ada item mendesak. Rantai sesi dan metrik di bawah tetap dapat ditinjau."}
                </p>
              </div>
              <ul className="grid gap-(--space-2) sm:grid-cols-3">
                <ThesisRail
                  label="Kelas hari ini"
                  value={formatMetric(stats.sessions_today)}
                  meta={`${stats.sessions_ongoing || 0} berlangsung`}
                />
                <ThesisRail
                  label="Eval belum"
                  value={formatMetric(stats.missing_evaluations)}
                  meta="Menunggu tentor"
                />
                <ThesisRail
                  label={role === "tentor" ? "Est. honor" : "Est. payroll"}
                  value={formatMetric(stats.est_payroll_month, "rupiah")}
                  meta={`${stats.verified_sessions_month || 0} sesi terverifikasi`}
                />
              </ul>
            </div>
          </section>

          <div className="grid gap-(--space-4) lg:grid-cols-[1.6fr_1fr]">
            <div className="space-y-(--space-4)">
              <ActionQueue problems={problems} />
              <SessionChain stats={stats} today={today} />
            </div>
            <aside className="space-y-(--space-4)" aria-label="Konteks role">
              {isFinance ? (
                <FinanceContext stats={stats} />
              ) : (
                <KayyisaStub />
              )}
              {isParent ? (
                <ParentReminder
                  students={parentStudents}
                  studentId={reminderStudentId}
                  setStudentId={setReminderStudentId}
                  message={reminderMessage}
                  setMessage={setReminderMessage}
                  busy={reminderBusy}
                  onSend={() => void onSendReminder()}
                />
              ) : null}
            </aside>
          </div>

          <section
            className="grid gap-(--space-3) sm:grid-cols-2 xl:grid-cols-4"
            aria-label="Ringkasan metrik"
          >
            {view.kpis.map((key) => {
              const kpi = kpiByKey[key];
              if (!kpi) return null;
              return (
                <div
                  key={key}
                  data-testid={kpi.testId}
                  className={`rounded-control border border-line-subtle p-(--space-4) ${
                    kpi.emphasis ? "bg-surface" : "bg-canvas"
                  }`}
                >
                  <div className="text-xs text-secondary">{kpi.label}</div>
                  <div className="mt-1 text-2xl font-semibold text-primary">
                    {formatMetric(kpi.value, kpi.format)}
                  </div>
                  <div className="mt-1 text-xs text-secondary">{kpi.hint}</div>
                </div>
              );
            })}
          </section>
        </>
      ) : null}

      {view.analytics.length > 0 ? (
        <section className="space-y-(--space-3)">
          <div>
            <p className="text-xs tracking-wide text-secondary uppercase">03</p>
            <h2 className="text-lg font-semibold text-primary">
              Indikator Operasional
            </h2>
            <p className="text-sm text-secondary">Bukan antrean kerja</p>
          </div>
          <div
            className="grid gap-(--space-4) lg:grid-cols-2"
            data-testid="dashboard-insights-grid"
            aria-busy={insightsQ.isPending}
          >
            {ANALYTICS_ORDER.filter((key) =>
              (view.analytics as readonly string[]).includes(key),
            ).map((key) => {
              const { Component, source } = ANALYTICS_CARD[key];
              return (
                <Component
                  key={key}
                  data={
                    insightsQ.data?.[source] as
                      | Record<string, unknown>
                      | undefined
                  }
                  loading={insightsQ.isPending && !insightsQ.data}
                  error={insightsError}
                  onRetry={() => void insightsQ.refetch()}
                />
              );
            })}
          </div>
        </section>
      ) : null}

      <TodaySchedule today={today} canSeeJadwal={canSeeJadwal} />
    </div>
  );
}

function ThesisRail({
  label,
  value,
  meta,
}: {
  label: string;
  value: string;
  meta: string;
}) {
  return (
    <li className="rounded-control border border-line-subtle p-(--space-3)">
      <div className="text-xs text-secondary">{label}</div>
      <div className="font-semibold text-primary">{value}</div>
      <div className="text-xs text-secondary">{meta}</div>
    </li>
  );
}

function ActionQueue({
  problems,
}: {
  problems: ReturnType<typeof buildDashboardProblems>;
}) {
  return (
    <section data-testid="dashboard-actions" aria-labelledby="actions-title">
      <div className="mb-(--space-3)">
        <p className="text-xs tracking-wide text-secondary uppercase">01</p>
        <h2 className="text-lg font-semibold text-primary" id="actions-title">
          Perlu Tindakan
        </h2>
        <p className="text-sm text-secondary">
          {problems.length} aktif · urut mendesak
        </p>
      </div>
      {problems.length === 0 ? (
        <p
          className="rounded-control border border-line-subtle p-(--space-4) text-sm text-secondary"
          data-testid="dashboard-actions-clear"
        >
          Antrean hari ini sudah bersih. Tidak ada tindak lanjut yang
          membutuhkan perhatian role ini.
        </p>
      ) : (
        <div className="space-y-(--space-2)">
          {problems.map((problem) => (
            <Link
              key={problem.key}
              href={problem.to as Route}
              className="flex items-center gap-(--space-3) rounded-control border border-line-subtle bg-canvas px-(--space-3) py-(--space-3) hover:bg-surface"
            >
              <StatusBadge
                tone={
                  problem.status === "critical"
                    ? "critical"
                    : problem.status === "warning"
                      ? "warning"
                      : "neutral"
                }
              >
                {problem.word}
              </StatusBadge>
              <span className="flex-1 text-sm text-primary">
                {problem.label}
              </span>
              <ChevronRight size={16} aria-hidden />
            </Link>
          ))}
        </div>
      )}
    </section>
  );
}

function SessionChain({
  stats,
  today,
}: {
  stats: DashboardStats;
  today: DashboardSessionRow[];
}) {
  const started = today.filter((s) =>
    STARTED_STATUSES.has(String(s.status || "")),
  ).length;
  const evaluated = today.filter((s) =>
    ["menunggu_verifikasi", "terverifikasi"].includes(String(s.status || "")),
  ).length;
  const verified = today.filter(
    (s) => s.status === "terverifikasi",
  ).length;
  const stages = [
    { key: "schedule", label: "Jadwal", value: today.length, unit: "sesi disusun" },
    { key: "session", label: "Check-in", value: started, unit: "sesi dimulai" },
    {
      key: "attendance",
      label: "Absensi",
      value: Number(stats.attendance_sessions_today || 0),
      unit: "sesi terabsen",
    },
    { key: "evaluation", label: "Evaluasi", value: evaluated, unit: "sesi lengkap" },
    { key: "verification", label: "Verifikasi", value: verified, unit: "sesi sah" },
    {
      key: "honor",
      label: "Honor",
      value: Number(stats.honor_entries_today || 0),
      unit: "honor terbit",
    },
  ];

  return (
    <section aria-labelledby="session-chain-title">
      <div className="mb-(--space-3)">
        <p className="text-xs tracking-wide text-secondary uppercase">02</p>
        <h2
          className="text-lg font-semibold text-primary"
          id="session-chain-title"
        >
          Rantai Sesi Hari Ini
        </h2>
        <p className="text-sm text-secondary">
          Jadwal → check-in → absensi → evaluasi → verifikasi → honor
        </p>
      </div>
      <div className="grid grid-cols-2 gap-(--space-2) md:grid-cols-3 xl:grid-cols-6">
        {stages.map((stage, index) => (
          <div
            key={stage.key}
            data-testid="session-chain-stage"
            aria-label={`${stage.label}: ${stage.value} ${stage.unit}`}
            className={`rounded-control border border-line-subtle p-(--space-3) ${
              stage.value > 0 ? "bg-surface" : "bg-canvas"
            }`}
          >
            <div className="text-xs text-secondary">
              {String(index + 1).padStart(2, "0")}
            </div>
            <div className="text-sm text-primary">{stage.label}</div>
            <div className="text-xl font-semibold">{stage.value}</div>
            <div className="text-xs text-secondary">{stage.unit}</div>
          </div>
        ))}
      </div>
    </section>
  );
}

function FinanceContext({ stats }: { stats: DashboardStats }) {
  return (
    <TerminalPanel
      seq="01"
      module="PAYROLL"
      meta={`Periode ${stats.period || "—"}`}
      title="Kesiapan payroll"
      labelledBy="finance-context-title"
    >
      <div className="space-y-(--space-3)">
        <div>
          <div className="text-xs text-secondary">Estimasi berjalan</div>
          <div className="text-lg font-semibold">
            {formatMetric(stats.est_payroll_month, "rupiah")}
          </div>
        </div>
        <div>
          <div className="text-xs text-secondary">Sesi terverifikasi</div>
          <div className="text-lg font-semibold">
            {stats.verified_sessions_month || 0}
          </div>
        </div>
        <Link
          href={"/keuangan/payroll" as Route}
          className="text-sm text-accent-text underline"
        >
          Tinjau payroll →
        </Link>
      </div>
    </TerminalPanel>
  );
}

/** Chat Kayyisa penuh = sub-fase 5; stub jujur agar layout cockpit tetap. */
function KayyisaStub() {
  return (
    <TerminalPanel
      seq="01"
      module="KAYYISA"
      meta="Panduan"
      title="Kak Kayyisa"
      labelledBy="kayyisa-stub-title"
      testId="kayyisa-stub"
    >
      <p className="text-sm text-secondary">
        Asisten panduan penuh (chat + knowledge) menyusul di sub-fase 5. Panel
        operasional Smartboard di kiri sudah aktif.
      </p>
    </TerminalPanel>
  );
}

function ParentReminder({
  students,
  studentId,
  setStudentId,
  message,
  setMessage,
  busy,
  onSend,
}: {
  students: Student[];
  studentId: string;
  setStudentId: (v: string) => void;
  message: string;
  setMessage: (v: string) => void;
  busy: boolean;
  onSend: () => void;
}) {
  return (
    <TerminalPanel
      seq="02"
      module="PENGINGAT"
      meta="Komunikasi"
      title="Kirim pengingat ke tentor"
      testId="parent-reminder"
    >
      <div className="space-y-(--space-3)">
        <label className="block space-y-1 text-sm">
          <span className="text-secondary">Murid</span>
          <select
            id="reminder-student"
            className="min-h-(--target-min) w-full rounded-control border border-line-subtle px-(--space-3)"
            value={studentId}
            onChange={(e) => setStudentId(e.target.value)}
            disabled={students.length === 0 || busy}
            data-testid="reminder-student"
          >
            {students.length === 0 ? (
              <option value="">Belum ada murid terhubung</option>
            ) : null}
            {students.map((s) => (
              <option key={s.student_id} value={s.student_id}>
                {s.name}
              </option>
            ))}
          </select>
        </label>
        <label className="block space-y-1 text-sm">
          <span className="text-secondary">Pesan · wajib</span>
          <textarea
            id="reminder-message"
            className="w-full rounded-control border border-line-subtle px-(--space-3) py-(--space-2)"
            rows={3}
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            placeholder="Contoh: Mohon konfirmasi jadwal minggu ini"
            disabled={busy}
            data-testid="reminder-message"
          />
        </label>
        <Button
          type="button"
          data-testid="btn-send-reminder"
          disabled={busy || students.length === 0}
          onClick={onSend}
        >
          {busy ? "Mengirim…" : "Kirim pengingat"}
        </Button>
      </div>
    </TerminalPanel>
  );
}

function TodaySchedule({
  today,
  canSeeJadwal,
}: {
  today: DashboardSessionRow[];
  canSeeJadwal: boolean;
}) {
  return (
    <section className="space-y-(--space-3)">
      <div className="flex items-center justify-between gap-(--space-3)">
        <h2 className="text-lg font-semibold text-primary">Jadwal Hari Ini</h2>
        <Link
          href={(canSeeJadwal ? "/jadwal" : "/sesi?date=today") as Route}
          className="text-sm text-accent-text underline"
        >
          Lihat semua →
        </Link>
      </div>
      <div className="overflow-x-auto rounded-control border border-line-subtle">
        <table className="min-w-full border-collapse text-sm">
          <thead>
            <tr className="border-b border-line-subtle bg-surface">
              <th className="px-(--space-3) py-(--space-2) text-left">Jam</th>
              <th className="px-(--space-3) py-(--space-2) text-left">
                Mata Pelajaran
              </th>
              <th className="px-(--space-3) py-(--space-2) text-left">
                Pengajar
              </th>
              <th className="px-(--space-3) py-(--space-2) text-left">
                Format
              </th>
              <th className="px-(--space-3) py-(--space-2) text-left">
                Status
              </th>
              <th className="px-(--space-3) py-(--space-2) text-left">
                <span className="sr-only">Aksi</span>
              </th>
            </tr>
          </thead>
          <tbody>
            {today.length === 0 ? (
              <tr>
                <td
                  colSpan={6}
                  className="px-(--space-3) py-(--space-4) text-center text-secondary"
                  data-testid="dashboard-today-empty"
                >
                  Tidak ada jadwal hari ini.{" "}
                  <Link
                    href={(canSeeJadwal ? "/jadwal" : "/sesi") as Route}
                    className="text-accent-text underline"
                  >
                    {canSeeJadwal ? "Buka kalender" : "Lihat sesi"}
                  </Link>
                </td>
              </tr>
            ) : (
              today.map((session) => {
                const tone =
                  STATUS_BADGE[session.status || ""] ??
                  ("neutral" as StatusBadgeTone);
                const label =
                  SESSION_STATUS_LABEL[
                    session.status as keyof typeof SESSION_STATUS_LABEL
                  ] || session.status;
                return (
                  <tr
                    key={session.session_id}
                    data-testid={`today-${session.session_id}`}
                    className="border-b border-line-subtle"
                  >
                    <td className="px-(--space-3) py-(--space-2)">
                      {session.scheduled_start}—{session.scheduled_end}
                    </td>
                    <td className="px-(--space-3) py-(--space-2)">
                      {session.subject_name}
                    </td>
                    <td className="px-(--space-3) py-(--space-2)">
                      {session.tutor_name}
                    </td>
                    <td className="px-(--space-3) py-(--space-2) capitalize">
                      {String(session.format || "").replace("_", "-")}
                    </td>
                    <td className="px-(--space-3) py-(--space-2)">
                      <StatusBadge tone={tone}>{label}</StatusBadge>
                    </td>
                    <td className="px-(--space-3) py-(--space-2)">
                      <Link
                        href={`/sesi/${session.session_id}` as Route}
                        data-testid={`open-${session.session_id}`}
                        className="text-accent-text underline"
                        aria-label={`Buka sesi ${session.subject_name} pukul ${session.scheduled_start}`}
                      >
                        Buka →
                      </Link>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>
    </section>
  );
}

export default function DashboardPage() {
  return (
    <ProtectedRoute
      roles={[
        "owner",
        "admin_akademik",
        "tentor",
        "murid_ortu",
        "finance",
        "content_manager",
      ]}
    >
      <AppShell>
        <DashboardView />
      </AppShell>
    </ProtectedRoute>
  );
}
