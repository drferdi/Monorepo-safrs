import { modeIds, type ModeId } from "./drafts";
import { fallbackTitle } from "./nav-format";

import { changedMessage, cleanWorkflowEncounter, cleanWorkflowMessage, cleanWorkflowState, reviewComplete, workflowReducer, type PersonalTemplate, type ReviewItem, type Revision, type WorkflowAction, type WorkStatus, type WorkTask } from "./workflow";

export interface Patient { id: string; name: string; age: string; sex: string; notes: string }
export interface PatientList { id: string; name: string; patientIds: string[] }
export type ReviewStatus = "draft" | "reviewed" | "final";
export interface Message { id: string; role: "user" | "assistant"; content: string; mode: ModeId; createdAt: string; reviewStatus?: ReviewStatus; originalContent?: string; sourceText?: string; reviewItems?: ReviewItem[]; revisions?: Revision[]; revisionSequence?: number; templateSnapshot?: PersonalTemplate }
export interface Encounter { id: string; patientId: string | null; title: string; createdAt: string; messages: Message[]; context: string; workStatus?: WorkStatus; pinned?: boolean; tasks?: WorkTask[]; updatedAt?: string }
export interface Settings { specialty: string; model: "Standard" | "Extended"; language: "English" | "Bahasa Indonesia"; instructions: string }
export interface Workspace { version: 1; patients: Patient[]; lists: PatientList[]; encounters: Encounter[]; activeEncounterId: string | null; settings: Settings; templates?: PersonalTemplate[]; favorites?: string[]; reviewDefaults?: ReviewItem[] }

export const specialties = ["Primary Care", "Internal Medicine", "Emergency Medicine", "Pediatrics", "Obstetrics & Gynecology", "Family Medicine", "Cardiology", "Psychiatry"];
export const storageKey = "sentrapedia-workspace-v1";

export const initialWorkspace: Workspace = {
  version: 1,
  patients: [{ id: "demo-patient", name: "Patient", age: "", sex: "Not specified", notes: "Patient demonstrasi fiktif. Ganti dengan informasi fiktif saja." }],
  lists: [],
  encounters: [
    { id: "demo-encounter", patientId: "demo-patient", title: "Encounter • 8 Okt", createdAt: "2026-10-08T14:03:00Z", messages: [], context: "" },
    { id: "demo-pneumonia", patientId: "demo-patient", title: "Pneumonia", createdAt: "2026-10-08T14:00:00Z", messages: [], context: "" },
    { id: "demo-previous", patientId: "demo-patient", title: "Encounter • 27 Sep", createdAt: "2026-09-26T20:22:00Z", messages: [], context: "" },
    { id: "demo-followup", patientId: "demo-patient", title: "Kehamilan 2 dengan perdarahan", createdAt: "2026-09-26T20:00:00Z", messages: [], context: "" },
  ],
  activeEncounterId: "demo-encounter",
  settings: { specialty: "Primary Care", model: "Standard", language: "Bahasa Indonesia", instructions: "" },
};

export type WorkspaceAction = WorkflowAction
  | { type: "restore"; state: Workspace }
  | { type: "patient.add"; patient: Patient }
  | { type: "patient.edit"; patient: Patient }
  | { type: "patient.delete"; id: string }
  | { type: "list.save"; list: PatientList }
  | { type: "list.delete"; id: string }
  | { type: "encounter.add"; encounter: Encounter }
  | { type: "encounter.select"; id: string | null }
  | { type: "encounter.update"; id: string; updates: Partial<Pick<Encounter, "title" | "context" | "patientId">> }
  | { type: "encounter.delete"; id: string }
  | { type: "message.add"; encounterId: string; messages: Message[] }
  | { type: "message.edit"; encounterId: string; messageId: string; content: string; at?: string }
  | { type: "message.review"; encounterId: string; messageId: string; status: ReviewStatus }
  | { type: "settings.save"; settings: Settings }
  | { type: "clear" };

export function workspaceReducer(state: Workspace, action: WorkspaceAction): Workspace {
  switch (action.type) {
    case "restore": return action.state;
    case "clear": return { ...initialWorkspace, patients: [], lists: [], encounters: [], activeEncounterId: null };
    case "patient.add": return { ...state, patients: [...state.patients, action.patient] };
    case "patient.edit": return { ...state, patients: state.patients.map((p) => p.id === action.patient.id ? action.patient : p) };
    case "patient.delete": {
      const encounters = state.encounters.filter((e) => e.patientId !== action.id);
      return { ...state, patients: state.patients.filter((p) => p.id !== action.id), lists: state.lists.map((list) => ({ ...list, patientIds: list.patientIds.filter((id) => id !== action.id) })), encounters, activeEncounterId: encounters.some((e) => e.id === state.activeEncounterId) ? state.activeEncounterId : encounters[0]?.id ?? null };
    }
    case "list.save": return { ...state, lists: state.lists.some((l) => l.id === action.list.id) ? state.lists.map((l) => l.id === action.list.id ? action.list : l) : [...state.lists, action.list] };
    case "list.delete": return { ...state, lists: state.lists.filter((l) => l.id !== action.id) };
    case "encounter.add": return { ...state, encounters: [action.encounter, ...state.encounters], activeEncounterId: action.encounter.id };
    case "encounter.select": return { ...state, activeEncounterId: action.id };
    case "encounter.update": return { ...state, encounters: state.encounters.map((e) => e.id === action.id ? { ...e, ...action.updates } : e) };
    case "encounter.delete": {
      const encounters = state.encounters.filter((e) => e.id !== action.id);
      return { ...state, encounters, activeEncounterId: state.activeEncounterId === action.id ? encounters[0]?.id ?? null : state.activeEncounterId };
    }
    case "message.add": return { ...state, encounters: state.encounters.map((e) => e.id === action.encounterId ? { ...e, messages: [...e.messages, ...action.messages] } : e) };
    case "message.edit": return { ...state, encounters: state.encounters.map((e) => e.id === action.encounterId ? { ...e, messages: e.messages.map((m) => m.id === action.messageId ? changedMessage(m, action.content, action.at ?? new Date().toISOString()) : m) } : e) };
    case "message.review": return { ...state, encounters: state.encounters.map((e) => e.id === action.encounterId ? { ...e, messages: e.messages.map((m) => m.id === action.messageId && m.role === "assistant" && (action.status === "draft" || reviewComplete(m.reviewItems)) && (action.status !== "final" || m.reviewStatus === "reviewed" || m.reviewStatus === "final") ? { ...m, reviewStatus: action.status } : m) } : e) };
    case "settings.save": return { ...state, settings: action.settings };
    default: return workflowReducer(state, action);
  }
}

function record(value: unknown): value is Record<string, unknown> { return typeof value === "object" && value !== null && !Array.isArray(value); }
function strings(value: unknown, keys: string[]): boolean { return record(value) && keys.every((key) => typeof value[key] === "string"); }

export function restoreWorkspace(raw: string | null): Workspace {
  if (!raw) return initialWorkspace;
  try {
    const data: unknown = JSON.parse(raw);
    if (!record(data) || data.version !== 1 || !Array.isArray(data.patients) || !Array.isArray(data.lists) || !Array.isArray(data.encounters)) return initialWorkspace;
    if (!data.patients.every((p) => strings(p, ["id", "name", "age", "sex", "notes"]))) return initialWorkspace;
    if (!data.lists.every((l) => record(l) && strings(l, ["id", "name"]) && Array.isArray(l.patientIds) && l.patientIds.every((id: unknown) => typeof id === "string"))) return initialWorkspace;
    if (!data.encounters.every((e) => record(e) && strings(e, ["id", "title", "createdAt", "context"]) && (e.patientId === null || typeof e.patientId === "string") && Array.isArray(e.messages) && e.messages.every((m: unknown) => record(m) && strings(m, ["id", "content", "mode", "createdAt"]) && (m.role === "user" || m.role === "assistant") && modeIds.includes(m.mode as ModeId)))) return initialWorkspace;
    if (!record(data.settings) || !strings(data.settings, ["specialty", "model", "language", "instructions"]) || !specialties.includes(String(data.settings.specialty)) || !["Standard", "Extended"].includes(String(data.settings.model)) || !["English", "Bahasa Indonesia"].includes(String(data.settings.language))) return initialWorkspace;
    if (data.activeEncounterId !== null && (typeof data.activeEncounterId !== "string" || !data.encounters.some((e: Record<string, unknown>) => e.id === data.activeEncounterId))) return initialWorkspace;
    const workspace = data as unknown as Workspace;
    return cleanWorkflowState({ ...workspace, encounters: workspace.encounters.map((encounter) => ({ ...cleanWorkflowEncounter(encounter), messages: encounter.messages.map((message) => {
      const clean = { ...message };
      if (typeof clean.sourceText !== "string") delete clean.sourceText;
      if (typeof clean.originalContent !== "string") delete clean.originalContent;
      if (!["draft", "reviewed", "final"].includes(clean.reviewStatus ?? "")) delete clean.reviewStatus;
      return cleanWorkflowMessage(clean);
    }) })) });
  } catch { return initialWorkspace; }
}

export function newId(): string { return crypto.randomUUID(); }

export function newEncounter(patientId: string | null = null): Encounter {
  const now = new Date();
  return { id: newId(), patientId, title: fallbackTitle(now), createdAt: now.toISOString(), messages: [], context: "" };
}
