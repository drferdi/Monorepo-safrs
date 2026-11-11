import { containsIdentity } from "../aadi/contract";
import type { Encounter, Message } from "../workspace";
import type { ReviewItem, WorkStatus, WorkTask } from "../workflow";

// Step S2 of docs/plans/active/2026-10-25-e2e-integration.md. This is a guard, not a redactor, by the same rule
// that governs retrieval: src/lib/theoracle-grounding.ts skips a matching passage rather than rewriting it, and
// stored text is never translated in place. A document carrying identity is held back whole; the local copy is
// untouched and stays authoritative. Rewriting it would leave two divergent versions of one clinical note.
//
// The detector is containsIdentity from src/lib/aadi/contract.ts, used verbatim. No pattern is defined here, so
// client/engine parity (tests/fixtures/pii-parity.json) holds by construction and needs no new row.
//
// Pseudonymisation at the edge (decision 2026-10-25): patientId is the random local id and travels as
// patientRef. Patient records themselves never sync, so no name reaches the server.

export interface SyncMessage { id: string; role: Message["role"]; content: string; mode: Message["mode"]; createdAt: string; reviewStatus?: Message["reviewStatus"]; reviewItems?: ReviewItem[] }
export interface SyncEncounterBody { formatVersion: 1; title: string; context: string; createdAt: string; updatedAt?: string; patientRef: string | null; workStatus?: WorkStatus; tasks?: WorkTask[]; messages: SyncMessage[] }
export type SyncProjection = { ok: true; docId: string; body: SyncEncounterBody } | { ok: false; reason: "identity" };

// Only free text is scanned. Ids, timestamps and trace values are structural: a 13-digit epoch or hash reads as
// a NIK, which is the false-refusal class removed from the engine on 2026-10-19 and must not come back here.
function held(...freeText: (string | undefined)[]): boolean {
  return freeText.some(text => typeof text === "string" && text.length > 0 && containsIdentity(text));
}

function projectMessage(message: Message): SyncMessage {
  // Allowlist, never a spread: a field added to Message later must be considered before it can ever sync.
  // Deliberately excluded - revisions (superseded clinical text), originalContent, templateSnapshot, and
  // sourceText, which holds the whole AadiAnalysis including the private TheOracle passages that grounded it.
  const projected: SyncMessage = { id: message.id, role: message.role, content: message.content, mode: message.mode, createdAt: message.createdAt };
  if (message.reviewStatus) projected.reviewStatus = message.reviewStatus;
  if (message.reviewItems) projected.reviewItems = message.reviewItems;
  return projected;
}

export function projectEncounterForSync(encounter: Encounter): SyncProjection {
  const messages = encounter.messages ?? [];
  const tasks = encounter.tasks ?? [];
  const reviewLabels = messages.flatMap(message => (message.reviewItems ?? []).map(item => item.label));
  if (held(encounter.title, encounter.context, ...messages.map(message => message.content), ...tasks.map(task => task.text), ...reviewLabels)) return { ok: false, reason: "identity" };

  const body: SyncEncounterBody = {
    formatVersion: 1,
    title: encounter.title,
    context: encounter.context,
    createdAt: encounter.createdAt,
    patientRef: encounter.patientId,
    messages: messages.map(projectMessage),
  };
  if (encounter.updatedAt) body.updatedAt = encounter.updatedAt;
  if (encounter.workStatus) body.workStatus = encounter.workStatus;
  if (tasks.length) body.tasks = tasks;
  return { ok: true, docId: encounter.id, body };
}
