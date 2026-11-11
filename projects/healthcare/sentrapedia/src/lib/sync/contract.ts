import type { SyncEncounterBody } from "./guard";

// The wire shape of /api/sync, shared by the browser client and the server store. It lives apart from store.ts
// because that module is server-only: the browser must be able to type a response without pulling in pg.
export interface SyncedDocument { docId: string; formatVersion: number; patientRef: string | null; body: SyncEncounterBody; updatedAt: string }
export interface SyncPushResult { saved: string[]; held: string[] }
export type { SyncEncounterBody };

// The only stored format this build writes and reads. A document carrying anything else is left alone rather
// than guessed at, so a reader always predates a writer (docs/data.md).
export const syncFormatVersion = 1;
