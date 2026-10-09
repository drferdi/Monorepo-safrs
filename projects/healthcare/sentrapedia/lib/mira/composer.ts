import type { ModeId } from "../drafts";
import { newId, type Message, type Patient } from "../workspace";
import type { ReviewItem } from "../workflow";
import { emptyCase, type MiraAnalysis } from "./contract";
import { miraMessage } from "./presentation";

export function composerUsesMira(mode: ModeId, personalTemplate: boolean): boolean {
  return !personalTemplate && (mode === "question" || mode === "ddx");
}

export function composerCase(prompt: string, context: string, patient?: Pick<Patient, "age" | "sex" | "notes"> & Partial<Pick<Patient, "name" | "id">>) {
  const data = emptyCase();
  data.chiefComplaint = prompt.trim();
  const age = patient?.age.trim() ?? "";
  if (/^\d{1,3}(?:\.\d+)?$/.test(age) && Number(age) <= 130) data.demographics.ageYears = Number(age);
  const sex = patient?.sex.trim().toLowerCase();
  data.demographics.sex = sex === "male" || sex === "m" ? "M" : sex === "female" || sex === "f" ? "F" : "unknown";
  const history = [context.trim() && `Konteks Encounter\n${context}`, patient?.notes.trim() && `Catatan kasus\n${patient.notes}`].filter(Boolean).join("\n\n");
  if (history) data.anamnesis.freeText = history;
  return data;
}

export function composerMiraMessages(analysis: MiraAnalysis, prompt: string, mode: ModeId, reviewDefaults?: ReviewItem[]): Message[] {
  return [{ id: newId(), role: "user", content: prompt.trim(), mode, createdAt: analysis.createdAt }, { ...miraMessage(analysis, reviewDefaults), mode }];
}
