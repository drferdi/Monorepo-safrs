"use client";

import { useQuery } from "@tanstack/react-query";
import type { Route } from "next";
import Link from "next/link";
import { getCurriculumStructure, listGradeLevels } from "../lib/api.ts";
import { phaseForGrade } from "../lib/curriculumPhase.ts";

function structureHasPhase(structure: unknown, phase: string): boolean {
  if (!structure || typeof structure !== "object") return false;
  const data = structure as {
    phases?:
      | Array<{ phase?: string; subjects?: unknown[] }>
      | Record<string, unknown>;
  };
  if (Array.isArray(data.phases)) {
    return data.phases.some(
      (p) => p.phase === phase && (p.subjects?.length ?? 0) > 0,
    );
  }
  if (data.phases && typeof data.phases === "object") {
    const entry = (data.phases as Record<string, unknown>)[phase];
    return Array.isArray(entry) ? entry.length > 0 : Boolean(entry);
  }
  return false;
}

export function CurriculumPhaseBanner({
  gradeId,
}: {
  gradeId: string | null | undefined;
}) {
  const gradesQ = useQuery({
    queryKey: ["grades"],
    queryFn: listGradeLevels,
    enabled: Boolean(gradeId),
  });
  const structureQ = useQuery({
    queryKey: ["curriculum-structure"],
    queryFn: getCurriculumStructure,
    enabled: Boolean(gradeId),
  });

  if (!gradeId) return null;
  const grade = gradesQ.data?.find((g) => g.grade_id === gradeId);
  const phase = grade ? phaseForGrade(grade.stage, grade.order) : null;
  if (!phase || !structureHasPhase(structureQ.data, phase)) return null;

  return (
    <p
      className="text-(length:--font-size-body) text-secondary"
      data-testid="curriculum-phase-banner"
    >
      {grade?.name} · Fase {phase} —{" "}
      <Link
        href={`/akademik/kurikulum/` as Route}
        className="text-accent-text underline"
      >
        lihat CP/TP resmi fase ini
      </Link>
    </p>
  );
}
