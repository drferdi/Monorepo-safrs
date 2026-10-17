// Workspace logic moved out of components/workspace.tsx (tech-debt row 37) so it can be tested without a browser.
import type { ModeId } from "./drafts";
import { freshReview, type PersonalTemplate, type ReviewItem } from "./workflow";
import { loadWorkspace, newId, storageKey, unreadableKey, type Message, type Patient, type Settings, type Workspace } from "./workspace";

export type Shortcut = "commands" | "search" | "new";

/** Ctrl or Cmd with J (command palette), / (search) or K (new encounter); none while a dialog or the mobile navigation is open. */
export function shortcutFor(event: Pick<KeyboardEvent, "key" | "ctrlKey" | "metaKey">, blocked: boolean): Shortcut | null {
  if (blocked || !(event.metaKey || event.ctrlKey)) return null;
  if (event.key.toLowerCase() === "j") return "commands";
  if (event.key === "/") return "search";
  if (event.key === "k") return "new";
  return null;
}

/**
 * Reads the saved workspace. Saved text that fails validation is copied to `unreadableKey` (when it fits) and returned
 * so it can be downloaded instead of lost; an earlier unreadable copy stays on offer. Throws when storage is unavailable.
 */
export function restoreFromStorage(storage: Pick<Storage, "getItem" | "setItem">): { workspace: Workspace; unreadable: string | null; notice: string | null } {
  const loaded = loadWorkspace(storage.getItem(storageKey));
  if (loaded.unreadable) {
    try { storage.setItem(unreadableKey, loaded.unreadable); } catch { /* no room for a second copy: the copy in memory stays downloadable until reload */ }
  }
  return {
    workspace: loaded.workspace,
    unreadable: loaded.unreadable ?? storage.getItem(unreadableKey),
    notice: loaded.unreadable ? "Workspace tersimpan tidak dapat dibaca. Datanya disimpan sebagai cadangan dan dapat diunduh dari menu Workspace." : null,
  };
}

/** The user's text and its local draft, with the source the draft was made from. */
export function localDraftMessages({ text, content, mode, context, patient, settings, reviewDefaults, personal }: { text: string; content: string; mode: ModeId; context: string; patient?: Patient; settings: Settings; reviewDefaults?: ReviewItem[]; personal?: PersonalTemplate }): Message[] {
  const createdAt = new Date().toISOString();
  const sourceText = [
    `Input\n${text}`,
    personal && `Templat saat dibuat\n${JSON.stringify(personal, null, 2)}`,
    context && `Konteks Encounter\n${context}`,
    patient && `Pasien\n${patient.name}\n${patient.age}\n${patient.sex}\nCatatan Pasien\n${patient.notes}`,
    `Preferensi format\n${settings.specialty} · ${settings.model} · ${settings.language}\n${settings.instructions}`,
  ].filter(Boolean).join("\n\n");
  return [
    { id: newId(), role: "user", content: text.trim(), mode, createdAt },
    { id: newId(), role: "assistant", content, originalContent: content, reviewStatus: "draft", reviewItems: freshReview(reviewDefaults), ...(personal ? { templateSnapshot: { ...personal, sections: [...personal.sections] } } : {}), sourceText, mode, createdAt },
  ];
}
