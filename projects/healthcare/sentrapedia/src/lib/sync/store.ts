import "server-only";
import { withPrincipal } from "./db";
import { projectEncounterForSync, type SyncEncounterBody } from "./guard";
import type { Encounter } from "../workspace";

export interface SyncedDocument { docId: string; formatVersion: number; patientRef: string | null; body: SyncEncounterBody; updatedAt: string }
export interface PushOutcome { saved: string[]; held: string[] }

// Only the format this build understands is written, and only the same is read back, so a reader always
// predates a writer (docs/data.md). The column carries a check constraint for the same reason.
const formatVersion = 1;

export async function pushEncounters(principal: string, encounters: Encounter[]): Promise<PushOutcome> {
  const projections = encounters.map(encounter => ({ encounter, projection: projectEncounterForSync(encounter) }));
  const saved: string[] = [];
  const held = projections.filter(item => !item.projection.ok).map(item => item.encounter.id);
  const sendable = projections.flatMap(item => (item.projection.ok ? [item.projection] : []));
  if (!sendable.length) return { saved, held };

  await withPrincipal(principal, async client => {
    // The profile row is the parent of every synced document, so it is ensured in the same transaction.
    await client.query("insert into profile (user_id, updated_at) values ($1, now()) on conflict (user_id) do nothing", [principal]);
    for (const projection of sendable) {
      await client.query(
        `insert into workspace_sync (user_id, doc_id, format_version, patient_ref, body, updated_at)
         values ($1, $2, $3, $4, $5::jsonb, now())
         on conflict (user_id, doc_id) do update set format_version = excluded.format_version, patient_ref = excluded.patient_ref, body = excluded.body, updated_at = now()`,
        [principal, projection.docId, formatVersion, projection.body.patientRef, JSON.stringify(projection.body)],
      );
      saved.push(projection.docId);
    }
  });
  return { saved, held };
}

export async function pullEncounters(principal: string): Promise<SyncedDocument[]> {
  return withPrincipal(principal, async client => {
    const { rows } = await client.query<{ doc_id: string; format_version: number; patient_ref: string | null; body: SyncEncounterBody; updated_at: Date }>(
      "select doc_id, format_version, patient_ref, body, updated_at from workspace_sync where format_version = $1 order by updated_at desc",
      [formatVersion],
    );
    return rows.map(row => ({ docId: row.doc_id, formatVersion: row.format_version, patientRef: row.patient_ref, body: row.body, updatedAt: row.updated_at.toISOString() }));
  });
}
