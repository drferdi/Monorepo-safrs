"use client";

import { useQuery } from "@tanstack/react-query";
import Link from "next/link";
import type { Route } from "next";
import { useParams } from "next/navigation";
import {
  Bar,
  BarChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { AppShell } from "../../../../components/AppShell.tsx";
import { CurriculumPhaseBanner } from "../../../../components/CurriculumPhaseBanner.tsx";
import { PageHead } from "../../../../components/PageHead.tsx";
import { ProtectedRoute } from "../../../../components/ProtectedRoute.tsx";
import { getStudentProgression } from "../../../../lib/api.ts";
import { averageMetric } from "../../../../lib/progression.ts";

export function ProgressionDetailClient() {
  const params = useParams<{ studentId: string }>();
  const studentId = params?.studentId ?? "";

  const progQ = useQuery({
    queryKey: ["progression", studentId],
    queryFn: () => getStudentProgression(studentId),
    enabled: Boolean(studentId) && studentId !== "placeholder",
  });

  const subjects = (progQ.data?.subjects ?? []) as Array<{
    subject_id?: string;
    name?: string;
    understanding?: number;
    focus?: number;
    participation?: number;
    independence?: number;
  }>;

  const chartData = subjects.map((s) => ({
    name: s.name ?? s.subject_id ?? "?",
    score: averageMetric([
      Number(s.understanding ?? 0),
      Number(s.focus ?? 0),
      Number(s.participation ?? 0),
      Number(s.independence ?? 0),
    ]),
  }));

  return (
    <ProtectedRoute roles={["owner", "admin_akademik", "tentor", "murid_ortu"]}>
      <AppShell>
        <div className="space-y-(--space-5)">
          <Link
            data-testid="btn-back-progression"
            href={"/akademik/perkembangan/" as Route}
            className="text-accent-text underline"
          >
            ← Kembali
          </Link>
          <PageHead
            seq="AKA"
            eyebrow="Akademik"
            title={
              <span data-testid="progression-name">
                {progQ.data?.student?.name ?? "Perkembangan Murid"}
              </span>
            }
            lede="Ringkasan metrik per mapel. Jurnal & Kayyisa ditunda ke sub-fase 4/5."
          />
          <CurriculumPhaseBanner gradeId={progQ.data?.student?.grade_id} />
          {/* Jurnal Kolaboratif — sub-fase 4 */}
          {/* Kak Kayyisa trajectory — sub-fase 5 */}
          <p data-testid="prog-thesis" className="text-secondary">
            {progQ.isPending
              ? "Memuat…"
              : progQ.isError
                ? "Gagal memuat perkembangan"
                : `${subjects.length} mapel`}
          </p>
          {chartData.length > 0 ? (
            <div
              data-testid="progression-compare-chart"
              className="h-64 rounded-control border border-line-subtle bg-canvas p-(--space-3)"
            >
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={chartData}>
                  <XAxis dataKey="name" />
                  <YAxis domain={[0, 5]} />
                  <Tooltip />
                  <Bar
                    dataKey="score"
                    fill="var(--color-accent, #c8102e)"
                    radius={4}
                  />
                </BarChart>
              </ResponsiveContainer>
            </div>
          ) : null}
        </div>
      </AppShell>
    </ProtectedRoute>
  );
}
