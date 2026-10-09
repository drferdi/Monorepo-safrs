import { modeIds, type ModeId } from "./drafts";
import type { Encounter, Message, Workspace } from "./workspace";

export interface PersonalTemplate { id: string; name: string; mode: ModeId; sections: string[]; instructions: string }
export interface ReviewItem { id: string; label: string; required: boolean; checked: boolean; target: string }
export interface Revision { id: string; content: string; savedAt: string; name: string; reason: "edit" | "restore" }
export interface WorkTask { id: string; text: string; done: boolean }
export type WorkStatus = "active" | "review" | "done";
export const workLabels: Record<WorkStatus, string> = { active: "Sedang dikerjakan", review: "Perlu ditinjau", done: "Selesai" };
export const defaultReviewItems: ReviewItem[] = [
  { id: "identity", label: "Identitas dan kaitan Encounter diperiksa", required: true, checked: false, target: "source" },
  { id: "source", label: "Sumber dan isi ditinjau", required: true, checked: false, target: "source" },
  { id: "missing", label: "Bagian kosong diperhatikan", required: true, checked: false, target: "document" },
  { id: "language", label: "Bahasa dan format diperiksa", required: true, checked: false, target: "document" },
];
export function reviewComplete(items: ReviewItem[] = []): boolean { return items.some((item) => item.required) && items.every((item) => !item.required || item.checked); }
export function freshReview(items: ReviewItem[] = defaultReviewItems): ReviewItem[] { return items.map((item) => ({ ...item, checked: false })); }
export function saveLocalWorkspace(state: Workspace, write: (raw: string) => void): string | null {
  try { write(JSON.stringify(state)); return null; }
  catch { return "Perubahan belum tersimpan ke browser. Ekspor backup dari profil workspace untuk menyimpan salinan."; }
}

function record(value: unknown): value is Record<string, unknown> { return !!value && typeof value === "object" && !Array.isArray(value); }
function text(value: unknown, max: number): value is string { return typeof value === "string" && value.length <= max; }
function date(value: unknown): value is string { return typeof value === "string" && Number.isFinite(Date.parse(value)); }
export function validTemplate(value: unknown): value is PersonalTemplate {
  return record(value) && text(value.id, 100) && !!value.id && text(value.name, 80) && !!value.name.trim() && modeIds.includes(value.mode as ModeId) && text(value.instructions, 2000) && Array.isArray(value.sections) && value.sections.length > 0 && value.sections.length <= 20 && value.sections.every((item) => text(item, 80) && !!item.trim() && !/[\r\n]/.test(item)) && new Set(value.sections.map((item: string) => item.toLowerCase())).size === value.sections.length;
}
export function cleanReview(value: unknown): ReviewItem[] | undefined {
  if (!Array.isArray(value) || !value.length || value.length > 30) return undefined;
  const items = value.filter((item): item is ReviewItem => record(item) && text(item.id, 100) && !!item.id && text(item.label, 160) && !!item.label.trim() && typeof item.required === "boolean" && typeof item.checked === "boolean" && text(item.target, 80));
  return items.length === value.length && items.some((item) => item.required) && new Set(items.map((item) => item.id)).size === items.length ? items.map((item) => ({ id: item.id, label: item.label, checked: item.checked, required: item.required, target: item.target })) : undefined;
}
export function cleanWorkflowMessage(message: Message): Message {
  const clean = { ...message };
  if (clean.reviewItems !== undefined) clean.reviewItems = cleanReview(clean.reviewItems) ?? freshReview();
  if (clean.revisions !== undefined) clean.revisions = Array.isArray(clean.revisions) ? clean.revisions.filter((r): r is Revision => record(r) && text(r.id, 160) && text(r.content, 200000) && date(r.savedAt) && text(r.name, 80) && (r.reason === "edit" || r.reason === "restore")).slice(-50).map((r) => ({ id: r.id, content: r.content, savedAt: r.savedAt, name: r.name, reason: r.reason })) : [];
  if (!Number.isSafeInteger(clean.revisionSequence) || (clean.revisionSequence ?? 0) < 0) delete clean.revisionSequence;
  if (clean.templateSnapshot !== undefined && !validTemplate(clean.templateSnapshot)) delete clean.templateSnapshot;
  if (clean.reviewItems && !reviewComplete(clean.reviewItems) && (clean.reviewStatus === "reviewed" || clean.reviewStatus === "final")) clean.reviewStatus = "draft";
  return clean;
}
export function cleanWorkflowEncounter(encounter: Encounter): Encounter {
  const clean = { ...encounter };
  if (!["active", "review", "done"].includes(clean.workStatus ?? "")) delete clean.workStatus;
  if (typeof clean.pinned !== "boolean") delete clean.pinned;
  if (!date(clean.updatedAt)) delete clean.updatedAt;
  if (clean.tasks !== undefined) clean.tasks = Array.isArray(clean.tasks) ? clean.tasks.filter((t): t is WorkTask => record(t) && text(t.id, 100) && text(t.text, 300) && !!t.text.trim() && typeof t.done === "boolean").slice(0, 50).map((t) => ({ id: t.id, text: t.text, done: t.done })) : [];
  return clean;
}
export function cleanWorkflowState(state: Workspace): Workspace {
  const clean = { ...state };
  if (state.templates !== undefined) clean.templates = Array.isArray(state.templates) ? state.templates.filter(validTemplate).slice(0, 50) : [];
  if (state.favorites !== undefined) clean.favorites = Array.isArray(state.favorites) ? [...new Set(state.favorites.filter((key) => typeof key === "string" && (key.startsWith("mode:") ? modeIds.includes(key.slice(5) as ModeId) : key.startsWith("template:") && clean.templates?.some((item) => `template:${item.id}` === key))))].slice(0, 64) : [];
  if (state.reviewDefaults !== undefined) clean.reviewDefaults = freshReview(cleanReview(state.reviewDefaults) ?? defaultReviewItems);
  return clean;
}

export function createPersonalDraft(template: PersonalTemplate, prompt: string, context: string): string {
  const supplied = new Map(template.sections.map((title) => [title.toLowerCase(), [] as string[]]));
  let current: string | undefined;
  for (const line of `${prompt}\n${context}`.split(/\r?\n/)) {
    const heading = line.match(/^##\s+(.+)$/);
    const label = line.match(/^([^:]{1,80}):\s*(.*)$/);
    if (heading || label) {
      const key = (heading?.[1] ?? label![1]).trim().toLowerCase();
      current = supplied.has(key) ? key : undefined;
      if (current && label?.[2]) supplied.get(current)!.push(label[2]);
    } else if (current) supplied.get(current)!.push(line);
  }
  return [`# ${template.name}`, ...template.sections.map((title) => `## ${title}\n${supplied.get(title.toLowerCase())!.join("\n").trim() || "Belum tersedia - lengkapi dan verifikasi oleh klinisi."}`), `## Input asli\n${prompt}`, context && `## Konteks asli\n${context}`, template.instructions && `## Preferensi penulisan\n${template.instructions}`, "---\nKerangka lokal dari teks yang diberikan. Tinjau sebelum digunakan."].filter(Boolean).join("\n\n");
}
export function changedMessage(message: Message, content: string, at: string, reason: Revision["reason"] = "edit"): Message {
  if (message.content === content) return message;
  if (message.role !== "assistant") return { ...message, content };
  const sequence = (message.revisionSequence ?? 0) + 1;
  return { ...message, content, originalContent: message.originalContent ?? message.content, reviewStatus: "draft", reviewItems: freshReview(message.reviewItems), revisionSequence: sequence, revisions: [...(message.revisions ?? []), { id: `${at}-${sequence}`, content: message.content, savedAt: at, name: "", reason }].slice(-50) };
}
export function queueItems(state: Workspace, query: string, patientId: string): Encounter[] {
  const search = query.toLowerCase().trim();
  return state.encounters.filter((e) => (patientId === "all" || (patientId === "unlinked" ? !e.patientId : e.patientId === patientId)) && `${e.title} ${state.patients.find((p) => p.id === e.patientId)?.name ?? ""} ${e.tasks?.map((task) => task.text).join(" ") ?? ""}`.toLowerCase().includes(search)).sort((a, b) => Number(Boolean(b.pinned)) - Number(Boolean(a.pinned)) || (b.updatedAt ?? b.createdAt).localeCompare(a.updatedAt ?? a.createdAt));
}

type MessageRef = { encounterId: string; messageId: string };
export type WorkflowAction =
  | { type: "template.save"; template: PersonalTemplate }
  | { type: "template.delete"; id: string }
  | { type: "favorite.toggle"; key: string }
  | { type: "review.defaults"; items: ReviewItem[] }
  | ({ type: "review.save"; items: ReviewItem[] } & MessageRef)
  | ({ type: "review.toggle"; id: string } & MessageRef)
  | ({ type: "revision.restore"; id: string; at: string } & MessageRef)
  | ({ type: "revision.rename"; id: string; name: string } & MessageRef)
  | { type: "queue.update"; encounterId: string; updates: Partial<Pick<Encounter, "workStatus" | "pinned" | "tasks">>; at: string };
export function workflowReducer(state: Workspace, action: WorkflowAction): Workspace {
  switch (action.type) {
    case "template.save": return validTemplate(action.template) ? { ...state, templates: state.templates?.some((t) => t.id === action.template.id) ? state.templates.map((t) => t.id === action.template.id ? action.template : t) : [...(state.templates ?? []), action.template].slice(0, 50) } : state;
    case "template.delete": return { ...state, templates: state.templates?.filter((t) => t.id !== action.id) ?? [], favorites: state.favorites?.filter((key) => key !== `template:${action.id}`) ?? [] };
    case "favorite.toggle": return cleanWorkflowState({ ...state, favorites: state.favorites?.includes(action.key) ? state.favorites.filter((key) => key !== action.key) : [...(state.favorites ?? []), action.key] });
    case "review.defaults": return cleanReview(action.items) ? { ...state, reviewDefaults: freshReview(action.items) } : state;
    case "queue.update": return { ...state, encounters: state.encounters.map((e) => e.id === action.encounterId ? cleanWorkflowEncounter({ ...e, ...action.updates, updatedAt: action.at }) : e) };
    default: return { ...state, encounters: state.encounters.map((e) => e.id !== action.encounterId ? e : { ...e, messages: e.messages.map((m) => {
      if (m.id !== action.messageId || m.role !== "assistant") return m;
      switch (action.type) {
        case "revision.rename": return { ...m, revisions: m.revisions?.map((r) => r.id === action.id ? { ...r, name: action.name.slice(0, 80) } : r) };
        case "revision.restore": { const revision = m.revisions?.find((r) => r.id === action.id); return revision ? changedMessage(m, revision.content, action.at, "restore") : m; }
        case "review.save": return cleanReview(action.items) ? { ...m, reviewStatus: "draft", reviewItems: freshReview(action.items) } : m;
        case "review.toggle": return { ...m, reviewStatus: "draft", reviewItems: (m.reviewItems ?? freshReview()).map((item) => item.id === action.id ? { ...item, checked: !item.checked } : item) };
      }
    }) }) };
  }
}
