import { syncFormatVersion, type SyncedDocument } from "./contract";
import { isRecord } from "../auth/policy";
import type { Encounter, Message, Workspace } from "../workspace";

export interface MergeResult { workspace: Workspace; added: string[]; skipped: string[]; unknownFormat: string[] }

// A pull only ADDS encounters the browser does not have. It never overwrites one, because the server copy is a
// de-identified projection: the guard strips revisions, sourceText, originalContent and templateSnapshot, so
// overwriting would destroy a doctor's revision history and the evidence behind an AI answer. The browser copy
// stays authoritative, which is also what makes SENTRAPEDIA_SYNC_MODE=off a complete rollback.
function toEncounter(document: SyncedDocument, knownPatientIds: Set<string>): Encounter | null {
  const body = document.body;
  if (!document.docId || !isRecord(body) || typeof body.title !== "string" || typeof body.createdAt !== "string" || !Array.isArray(body.messages)) return null;
  const messages = body.messages.flatMap((message): Message[] => {
    if (!isRecord(message) || typeof message.id !== "string" || typeof message.content !== "string") return [];
    const projected: Message = { id: message.id, role: message.role === "user" ? "user" : "assistant", content: message.content, mode: message.mode, createdAt: typeof message.createdAt === "string" ? message.createdAt : body.createdAt };
    if (message.reviewStatus) projected.reviewStatus = message.reviewStatus;
    if (message.reviewItems) projected.reviewItems = message.reviewItems;
    return [projected];
  });
  // The body is the projection of record; the patient_ref column exists so a query can filter without reading
  // jsonb. patient_ref points at a browser-local patient id, and patients never sync, so on a fresh device
  // there is nothing to point at: a dangling id is dropped rather than left for the UI to resolve and fail on.
  const reference = body.patientRef ?? document.patientRef;
  const patientId = reference && knownPatientIds.has(reference) ? reference : null;
  const encounter: Encounter = { id: document.docId, patientId, title: body.title, createdAt: body.createdAt, context: typeof body.context === "string" ? body.context : "", messages };
  if (body.updatedAt) encounter.updatedAt = body.updatedAt;
  if (body.workStatus) encounter.workStatus = body.workStatus;
  if (body.tasks?.length) encounter.tasks = body.tasks;
  return encounter;
}

export function mergePulledDocuments(workspace: Workspace, documents: SyncedDocument[]): MergeResult {
  const existing = new Set(workspace.encounters.map(encounter => encounter.id));
  const knownPatientIds = new Set(workspace.patients.map(patient => patient.id));
  const added: string[] = [];
  const skipped: string[] = [];
  const unknownFormat: string[] = [];
  const incoming: Encounter[] = [];
  for (const document of documents) {
    if (!isRecord(document)) continue;
    if (document.formatVersion !== syncFormatVersion) { if (document.docId) unknownFormat.push(document.docId); continue; }
    if (existing.has(document.docId)) { skipped.push(document.docId); continue; }
    const encounter = toEncounter(document, knownPatientIds);
    if (!encounter) continue;
    incoming.push(encounter);
    added.push(encounter.id);
  }
  // Returning the same object when nothing was added keeps the save effect from writing an identical workspace.
  if (!incoming.length) return { workspace, added, skipped, unknownFormat };
  return { workspace: { ...workspace, encounters: [...workspace.encounters, ...incoming] }, added, skipped, unknownFormat };
}
