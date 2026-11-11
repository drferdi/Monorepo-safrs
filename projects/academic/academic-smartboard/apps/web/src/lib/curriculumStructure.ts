export interface StructureSubject {
  subject: string;
  cp_count?: number;
  tp_count?: number;
}

export interface StructurePhaseBlock {
  phase: string;
  subjects?: StructureSubject[];
}

export interface CurriculumStructureLike {
  phases?: StructurePhaseBlock[] | Record<string, unknown>;
}

/** Mata pelajaran nasional untuk satu fase — dari korpus, bukan master bimbel. */
export function getNationalSubjects(
  structure: CurriculumStructureLike | null | undefined,
  phase: string | null | undefined,
): string[] {
  if (!phase || !structure?.phases) return [];

  if (Array.isArray(structure.phases)) {
    const block = structure.phases.find((p) => p.phase === phase);
    if (!block?.subjects) return [];
    return [...block.subjects]
      .map((s) => s.subject)
      .filter(Boolean)
      .sort((a, b) => a.localeCompare(b, "id"));
  }

  const entry = (structure.phases as Record<string, unknown>)[phase];
  if (!Array.isArray(entry)) return [];
  return entry
    .map((item) => {
      if (typeof item === "string") return item;
      if (item && typeof item === "object" && "subject" in item) {
        const subject = (item as { subject?: unknown }).subject;
        return typeof subject === "string" ? subject : "";
      }
      return "";
    })
    .filter(Boolean)
    .sort((a, b) => a.localeCompare(b, "id"));
}
