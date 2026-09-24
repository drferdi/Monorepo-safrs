import { describe, expect, it } from "vitest";
import type { LearningSession } from "./api";
import {
  buildCpContext,
  buildEvalSubmitBody,
  canSubmitDraft,
  initialEvalForm,
  needsParentNoteConfirm,
  shouldShowCatchUp,
  studentsMissingAttendance,
} from "./sessionDetail";

const baseSes: LearningSession = {
  session_id: "s1",
  student_ids: ["a", "b"],
  tutor_id: "t1",
  subject_id: "sub1",
  grade_id: "g1",
  format: "privat",
  mode: "online",
  date: "2026-08-01",
  scheduled_start: "16:00",
  scheduled_end: "17:00",
  status: "berlangsung",
  student_attendance: [{ session_id: "s1", student_id: "a", status: "hadir" }],
};

describe("buildCpContext", () => {
  it("ready ketika phase + subject ada", () => {
    const ctx = buildCpContext(
      baseSes,
      [{ grade_id: "g1", name: "SD 2", stage: "SD", order: 2 }],
      { subject_id: "sub1", name: "Matematika", active: true },
    );
    expect(ctx.ready).toBe(true);
    expect(ctx.phase).toBe("A");
    expect(ctx.subjectName).toBe("Matematika");
  });

  it("tidak ready tanpa grade/subject", () => {
    expect(buildCpContext(baseSes, [], null).ready).toBe(false);
  });
});

describe("studentsMissingAttendance / shouldShowCatchUp", () => {
  it("mengembalikan murid tanpa absensi", () => {
    expect(studentsMissingAttendance(baseSes, { a: "Ani", b: "Budi" })).toEqual(
      [{ student_id: "b", name: "Budi" }],
    );
  });

  it("catch-up hanya jika sesi sudah due", () => {
    expect(shouldShowCatchUp(baseSes, 1, new Date("2026-08-02T12:00:00"))).toBe(
      true,
    );
    expect(
      shouldShowCatchUp(
        { ...baseSes, date: "2099-01-01" },
        1,
        new Date("2026-08-02T12:00:00"),
      ),
    ).toBe(false);
    expect(
      shouldShowCatchUp(
        { ...baseSes, status: "terverifikasi" },
        1,
        new Date("2026-08-02T12:00:00"),
      ),
    ).toBe(false);
  });
});

describe("eval helpers", () => {
  it("draft notes minimal 8 karakter", () => {
    expect(canSubmitDraft("pendek")).toBe(false);
    expect(canSubmitDraft("catatan cukup panjang")).toBe(true);
  });

  it("buildEvalSubmitBody menyertakan cp_id dari picker", () => {
    const body = buildEvalSubmitBody({
      sessionId: "s1",
      studentId: "a",
      evalForm: initialEvalForm(),
      aiMeta: { populated_fields: ["material_taught"], model: "x" },
      cpPicked: {
        learning_outcome_code: "CP.A.01",
        phase: "A",
        subject: "Matematika",
      },
    });
    expect(body.cp_id).toBe("CP.A.01");
    expect(body.ai_assisted).toBe(true);
    expect(body.student_id).toBe("a");
  });

  it("needsParentNoteConfirm mengikuti meta AI", () => {
    expect(
      needsParentNoteConfirm(
        { parent_note_needs_confirm: true },
        "halo ortu",
        false,
      ),
    ).toBe(true);
    expect(
      needsParentNoteConfirm(
        { parent_note_needs_confirm: true },
        "halo ortu",
        true,
      ),
    ).toBe(false);
  });
});
