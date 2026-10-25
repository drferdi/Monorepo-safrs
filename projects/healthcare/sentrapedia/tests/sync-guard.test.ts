import { describe, expect, it } from "vitest";
import parity from "./fixtures/pii-parity.json";
import { projectEncounterForSync } from "../src/lib/sync/guard";
import type { Encounter } from "../src/lib/workspace";

// S2 of docs/plans/active/2026-10-25-e2e-integration.md. The guard holds a document back; it never rewrites
// clinical text, because src/lib/theoracle-grounding.ts already skips rather than rewrites and stored text is
// never translated in place (AGENT-CONTEXT section 8). No new pattern and no new parity row: the detector is
// containsIdentity from src/lib/aadi/contract.ts, so client/engine parity holds by construction.
const encounter = (over: Partial<Encounter> = {}): Encounter => ({
  id: "enc-1", patientId: "pat-random-1", title: "Demam tiga hari", createdAt: "2026-10-25T00:00:00.000Z",
  context: "Dewasa, tanpa penyakit kronis", messages: [], ...over,
});
const message = (content: string) => ({ id: "msg-1", role: "assistant" as const, content, mode: "clinic" as const, createdAt: "2026-10-25T00:00:00.000Z" });

describe("sync guard", () => {
  it("projects a clean encounter and carries the format version", () => {
    const result = projectEncounterForSync(encounter({ messages: [message("Subjektif: demam.")] }));
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.body.formatVersion).toBe(1);
    expect(result.body.messages[0].content).toBe("Subjektif: demam.");
  });

  it("carries patientId through as an opaque patientRef and never a name", () => {
    const result = projectEncounterForSync(encounter());
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.body.patientRef).toBe("pat-random-1");
    expect(JSON.stringify(result.body)).not.toContain("patientId");
  });

  it("holds back every case the client refuses, and passes every case it allows", () => {
    // The fixture rows are the inputs; its client column is the expectation. Nothing is added to it.
    for (const row of parity.cases) {
      const held = projectEncounterForSync(encounter({ messages: [message(row.text)] }));
      expect(held.ok, `message content: ${row.text}`).toBe(!row.client);
      const inContext = projectEncounterForSync(encounter({ context: row.text, messages: [] }));
      expect(inContext.ok, `context: ${row.text}`).toBe(!row.client);
    }
  });

  it("reports why a document was held back, without echoing the identity it found", () => {
    const result = projectEncounterForSync(encounter({ messages: [message("Pasien Sdr. Budi Santoso")] }));
    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.reason).toBe("identity");
    expect(JSON.stringify(result)).not.toContain("Budi");
  });

  it("never rewrites clinical text: a held document yields no body at all", () => {
    const result = projectEncounterForSync(encounter({ messages: [message("hubungi keluarga di 081234567890")] }));
    expect(result.ok).toBe(false);
    expect("body" in result).toBe(false);
  });

  it("reads free text only, so a 13-digit id or timestamp is not mistaken for a NIK", () => {
    // The 2026-10-19 work removed exactly this class of false refusal from the engine; the guard must not reintroduce it.
    const digits = "1761350400000";
    expect(projectEncounterForSync(encounter({ id: digits, patientId: digits, createdAt: digits, messages: [] })).ok).toBe(true);
    expect(projectEncounterForSync(encounter({ context: `NIK ${digits}001`, messages: [] })).ok).toBe(false);
  });

  it("excludes revisions, so the server never holds superseded clinical text", () => {
    const withRevisions = { ...message("Subjektif: demam."), revisions: [{ id: "rev-1", content: "Pasien Ny. Ani", savedAt: "2026-10-25T00:00:00.000Z", name: "v1", reason: "edit" as const }] };
    const result = projectEncounterForSync(encounter({ messages: [withRevisions] }));
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(JSON.stringify(result.body)).not.toContain("revisions");
    expect(JSON.stringify(result.body)).not.toContain("Ani");
  });

  it("excludes sourceText, so the private TheOracle corpus never reaches the server", () => {
    // sourceText holds the whole AadiAnalysis, grounding passages included (src/lib/workspace.ts migration path).
    const withSource = { ...message("Diagnosis: ISPA."), sourceText: '{"kind":"AADI","grounding":{"passages":["kutipan pedoman"]}}' };
    const result = projectEncounterForSync(encounter({ messages: [withSource] }));
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(JSON.stringify(result.body)).not.toContain("sourceText");
    expect(JSON.stringify(result.body)).not.toContain("kutipan pedoman");
  });

  it("keeps task text under the same guard as the rest", () => {
    expect(projectEncounterForSync(encounter({ tasks: [{ id: "t1", text: "Hubungi 081234567890", done: false }] })).ok).toBe(false);
    expect(projectEncounterForSync(encounter({ tasks: [{ id: "t1", text: "Kontrol tujuh hari", done: false }] })).ok).toBe(true);
  });
});
