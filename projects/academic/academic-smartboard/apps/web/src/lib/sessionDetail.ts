import type { CurriculumOutcome, GradeLevel, LearningSession, Subject } from "./api";
import { phaseForGrade, type Phase } from "./curriculumPhase";

export type CpContext = {
  ready: boolean;
  phase: Phase | null;
  subjectName: string | null;
  gradeLabel: string;
};

export function buildCpContext(
  ses: Pick<LearningSession, "grade_id"> | null,
  grades: GradeLevel[],
  subject: Subject | null | undefined,
): CpContext {
  if (!ses) {
    return { ready: false, phase: null, subjectName: null, gradeLabel: "" };
  }
  const sg = grades.find((g) => g.grade_id === ses.grade_id);
  const phase = sg ? phaseForGrade(sg.stage, sg.order) : null;
  const subjectName = subject?.name ?? null;
  return {
    ready: Boolean(phase && subjectName),
    phase,
    subjectName,
    gradeLabel: sg?.name ?? "",
  };
}

export function studentsMissingAttendance(
  ses: LearningSession,
  studentNames: Record<string, string>,
): Array<{ student_id: string; name: string }> {
  const attended = new Set(
    (ses.student_attendance ?? []).map((a) => a.student_id),
  );
  return (ses.student_ids ?? [])
    .filter((sid) => !attended.has(sid))
    .map((sid) => ({
      student_id: sid,
      name: studentNames[sid] ?? sid,
    }));
}

/** Arsip: catch-up when session due and missing attendance (staff/tutor). */
export function shouldShowCatchUp(
  ses: LearningSession,
  missingCount: number,
  now: Date = new Date(),
): boolean {
  if (missingCount === 0) return false;
  if (
    ses.status === "terverifikasi" ||
    ses.status === "dibatalkan" ||
    ses.status === "masuk_payroll"
  ) {
    return false;
  }
  const todayIso = now.toISOString().slice(0, 10);
  const nowHm = now.toTimeString().slice(0, 5);
  const due =
    ses.date < todayIso ||
    (ses.date === todayIso && (ses.scheduled_end || "23:59") <= nowHm);
  return due;
}

export type EvalFormState = Record<string, string | number | undefined>;

export function initialEvalForm(): EvalFormState {
  return {
    understanding: 3,
    focus: 3,
    participation: 3,
    independence: 3,
    competence_status: "cukup_memahami",
    overall_score: 3,
  };
}

export function canSubmitDraft(draftNotes: string): boolean {
  return draftNotes.trim().length >= 8;
}

export function buildEvalSubmitBody(args: {
  sessionId: string;
  studentId: string;
  evalForm: EvalFormState;
  aiMeta: { populated_fields?: string[]; model?: string | null } | null;
  cpPicked: CurriculumOutcome | null;
}): Record<string, unknown> {
  const { sessionId, studentId, evalForm, aiMeta, cpPicked } = args;
  return {
    ...evalForm,
    session_id: sessionId,
    student_id: studentId,
    ai_assisted: Boolean(aiMeta),
    ai_fields: aiMeta?.populated_fields ?? [],
    ai_model: aiMeta?.model ?? null,
    ...(cpPicked ? { cp_id: cpPicked.learning_outcome_code } : {}),
  };
}

export function needsParentNoteConfirm(
  aiMeta: { parent_note_needs_confirm?: boolean } | null,
  parentNote: string,
  confirmed: boolean,
): boolean {
  return Boolean(
    aiMeta?.parent_note_needs_confirm && parentNote.trim() && !confirmed,
  );
}
