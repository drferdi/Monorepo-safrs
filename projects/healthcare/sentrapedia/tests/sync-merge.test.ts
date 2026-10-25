import { describe, expect, it } from "vitest";
import { mergePulledDocuments } from "../src/lib/sync/merge";
import { initialWorkspace, type Encounter, type Workspace } from "../src/lib/workspace";
import type { SyncedDocument } from "../src/lib/sync/contract";

// A pulled body is a de-identified projection: it has no revisions, no sourceText, no originalContent and no
// templateSnapshot (src/lib/sync/guard.ts). Overwriting a local encounter with one would therefore destroy the
// doctor's revision history and the evidence behind an AI answer. So a pull only ever ADDS what is missing, and
// the browser copy stays authoritative - the same rule the whole sync design rests on.
const local = (encounters: Encounter[], patients = initialWorkspace.patients): Workspace => ({ ...initialWorkspace, patients, encounters });
const encounter = (id: string): Encounter => ({ id, patientId: "demo-patient", title: "Lokal", createdAt: "2026-10-25T00:00:00.000Z", context: "", messages: [{ id: `${id}-m`, role: "assistant", content: "Teks lokal", mode: "clinic", createdAt: "2026-10-25T00:00:00.000Z", revisions: [{ id: "r1", content: "versi lama", savedAt: "2026-10-25T00:00:00.000Z", name: "v1", reason: "edit" }] }] });
const document = (docId: string, over: Partial<SyncedDocument["body"]> = {}): SyncedDocument => ({
  docId, formatVersion: 1, patientRef: "demo-patient", updatedAt: "2026-10-25T01:00:00.000Z",
  body: { formatVersion: 1, title: "Dari server", context: "Konteks server", createdAt: "2026-10-25T00:30:00.000Z", patientRef: "demo-patient", messages: [{ id: `${docId}-m`, role: "assistant", content: "Teks server", mode: "clinic", createdAt: "2026-10-25T00:30:00.000Z" }], ...over },
});

describe("merge pulled documents", () => {
  it("adds a document the browser does not have", () => {
    const result = mergePulledDocuments(local([]), [document("enc-server")]);
    expect(result.added).toEqual(["enc-server"]);
    expect(result.skipped).toEqual([]);
    expect(result.workspace.encounters.map(item => item.id)).toEqual(["enc-server"]);
    expect(result.workspace.encounters[0].title).toBe("Dari server");
  });

  it("never overwrites a local encounter, because the server copy has no revisions", () => {
    const before = local([encounter("enc-1")]);
    const result = mergePulledDocuments(before, [document("enc-1")]);
    expect(result.added).toEqual([]);
    expect(result.skipped).toEqual(["enc-1"]);
    expect(result.workspace.encounters[0].title).toBe("Lokal");
    expect(result.workspace.encounters[0].messages[0].revisions).toHaveLength(1);
    expect(result.workspace).toBe(before);
  });

  it("drops a patient reference the browser cannot resolve, rather than leaving it dangling", () => {
    const result = mergePulledDocuments(local([]), [document("enc-server", { patientRef: "pat-not-here" })]);
    expect(result.workspace.encounters[0].patientId).toBeNull();
  });

  it("keeps a patient reference that does resolve locally", () => {
    const result = mergePulledDocuments(local([]), [document("enc-server")]);
    expect(result.workspace.encounters[0].patientId).toBe("demo-patient");
  });

  it("refuses a format version it does not know, instead of guessing at the shape", () => {
    const future = { ...document("enc-future"), formatVersion: 2 };
    const result = mergePulledDocuments(local([]), [future]);
    expect(result.added).toEqual([]);
    expect(result.unknownFormat).toEqual(["enc-future"]);
    expect(result.workspace.encounters).toEqual([]);
  });

  it("ignores a malformed document rather than letting it into the workspace", () => {
    const result = mergePulledDocuments(local([]), [{ docId: "", formatVersion: 1, patientRef: null, updatedAt: "", body: null } as unknown as SyncedDocument]);
    expect(result.added).toEqual([]);
    expect(result.workspace.encounters).toEqual([]);
  });

  it("carries the optional fields a projection may hold", () => {
    const result = mergePulledDocuments(local([]), [document("enc-server", { workStatus: "review", tasks: [{ id: "t1", text: "Kontrol tujuh hari", done: false }], updatedAt: "2026-10-25T02:00:00.000Z" })]);
    const added = result.workspace.encounters[0];
    expect(added.workStatus).toBe("review");
    expect(added.tasks).toEqual([{ id: "t1", text: "Kontrol tujuh hari", done: false }]);
    expect(added.updatedAt).toBe("2026-10-25T02:00:00.000Z");
  });
});
