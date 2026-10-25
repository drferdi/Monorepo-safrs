import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { initialWorkspace, parseWorkspace } from "../src/lib/workspace";

// Tech-debt row 14: saved and exported workspaces from earlier builds, frozen as files. A change to the storage format
// must keep every fixture readable (docs/data.md, "Format changes").
const fixture = (name: string) => readFileSync(`tests/fixtures/workspace/${name}`, "utf8");

describe("frozen v1 workspaces", () => {
  it("reads a workspace with every workflow field and loses nothing", () => {
    const raw = fixture("v1-workflow.json");
    const parsed = parseWorkspace(raw);
    // Reading upgrades the untouched demo seed note, the same deliberate rewrite as the seed name below; everything else is unchanged.
    const expected = JSON.parse(raw);
    expected.patients[0].notes = initialWorkspace.patients[0].notes;
    expect(parsed).toEqual(expected);
    expect(parseWorkspace(JSON.stringify(parsed, null, 2))).toEqual(parsed); // export, then import
  });

  it("reads the demo seed saved before 2026-10-09 and renames its untouched patient", () => {
    const parsed = parseWorkspace(fixture("v1-demo-seed-2026-10-08.json"));
    expect(parsed?.patients[0].name).toBe("Pasien");
    expect(parseWorkspace(JSON.stringify(parsed))).toEqual(parsed);
  });

  it("keeps a field it does not know on a saved message and encounter", () => {
    // A newer build may add optional fields; an import must carry them through untouched.
    const data = JSON.parse(fixture("v1-workflow.json"));
    data.patients[0].notes = initialWorkspace.patients[0].notes; // already upgraded, so the seed rewrite is not what this test measures
    const extra = { puskesmas: { note: "catatan" } };
    Object.assign(data.encounters[0], extra);
    Object.assign(data.encounters[0].messages[1], extra);
    expect(parseWorkspace(JSON.stringify(data))).toEqual(data);
  });
});
