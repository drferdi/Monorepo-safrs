import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { parseWorkspace } from "../src/lib/workspace";

// Tech-debt row 14: saved and exported workspaces from earlier builds, frozen as files. A change to the storage format
// must keep every fixture readable (docs/data.md, "Format changes").
const fixture = (name: string) => readFileSync(`tests/fixtures/workspace/${name}`, "utf8");

describe("frozen v1 workspaces", () => {
  it("reads a workspace with every workflow field and loses nothing", () => {
    const raw = fixture("v1-workflow.json");
    const parsed = parseWorkspace(raw);
    expect(parsed).toEqual(JSON.parse(raw));
    expect(parseWorkspace(JSON.stringify(parsed, null, 2))).toEqual(parsed); // export, then import
  });

  it("reads the demo seed saved before 2026-10-09 and renames its untouched patient", () => {
    const parsed = parseWorkspace(fixture("v1-demo-seed-2026-10-08.json"));
    expect(parsed?.patients[0].name).toBe("Pasien");
    expect(parseWorkspace(JSON.stringify(parsed))).toEqual(parsed);
  });
});
