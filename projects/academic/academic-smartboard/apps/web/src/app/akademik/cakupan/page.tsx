"use client";

import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import { AppShell } from "../../../components/AppShell.tsx";
import { EmptyState } from "../../../components/EmptyState.tsx";
import { PageHead } from "../../../components/PageHead.tsx";
import { ProtectedRoute } from "../../../components/ProtectedRoute.tsx";
import {
  getCurriculumCoverage,
  getCurriculumStructure,
  listGradeLevels,
  listSubjects,
} from "../../../lib/api.ts";
import { phaseForGrade } from "../../../lib/curriculumPhase.ts";

function CakupanView() {
  const [gradeId, setGradeId] = useState("");
  const [subjectName, setSubjectName] = useState("");

  const gradesQ = useQuery({ queryKey: ["grades"], queryFn: listGradeLevels });
  const subjectsQ = useQuery({ queryKey: ["subjects"], queryFn: listSubjects });
  const structureQ = useQuery({
    queryKey: ["curriculum-structure"],
    queryFn: getCurriculumStructure,
  });

  const grade = gradesQ.data?.find((g) => g.grade_id === gradeId);
  const phase = grade ? phaseForGrade(grade.stage, grade.order) : null;

  const coverageQ = useQuery({
    queryKey: ["curriculum-coverage", subjectName, gradeId],
    queryFn: () =>
      getCurriculumCoverage({
        subject: subjectName || undefined,
        grade_id: gradeId || undefined,
      }),
    enabled: Boolean(subjectName && gradeId),
  });

  return (
    <div className="space-y-(--space-5)">
      <PageHead
        seq="AKA"
        eyebrow="Akademik"
        title="Cakupan Kurikulum"
        lede="CP yang sudah / belum diajarkan per jenjang dan mapel."
      />
      {phase ? (
        <span data-testid="coverage-phase-chip" className="text-accent-text">
          Fase {phase}
        </span>
      ) : null}
      <div className="flex flex-wrap gap-(--space-3)">
        <select
          data-testid="coverage-grade"
          className="rounded-control border border-line-subtle px-(--space-3) py-(--space-2)"
          value={gradeId}
          onChange={(e) => setGradeId(e.target.value)}
        >
          <option value="">Pilih jenjang</option>
          {(gradesQ.data ?? []).map((g) => (
            <option key={g.grade_id} value={g.grade_id}>
              {g.name}
            </option>
          ))}
        </select>
        <select
          data-testid="coverage-subject"
          className="rounded-control border border-line-subtle px-(--space-3) py-(--space-2)"
          value={subjectName}
          onChange={(e) => setSubjectName(e.target.value)}
        >
          <option value="">Pilih mapel</option>
          {(subjectsQ.data ?? []).map((s) => (
            <option key={s.subject_id} value={s.name}>
              {s.name}
            </option>
          ))}
        </select>
      </div>
      {!gradeId || !subjectName ? (
        <EmptyState
          testId="coverage-prompt"
          title="Pilih jenjang dan mapel"
          lede="Cakupan dihitung setelah kedua filter dipilih."
        />
      ) : coverageQ.isPending ? (
        <p className="text-secondary">Memuat cakupan…</p>
      ) : coverageQ.isError ? (
        <p role="alert" className="text-critical">
          Gagal memuat cakupan
        </p>
      ) : (
        <p data-testid="coverage-thesis" className="text-secondary">
          {(coverageQ.data?.items?.length ?? 0) || "—"} item cakupan
          {structureQ.data ? " · struktur tersedia" : ""}
        </p>
      )}
    </div>
  );
}

export default function CakupanPage() {
  return (
    <ProtectedRoute roles={["owner", "admin_akademik", "tentor"]}>
      <AppShell>
        <CakupanView />
      </AppShell>
    </ProtectedRoute>
  );
}
