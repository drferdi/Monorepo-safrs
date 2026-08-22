import assert from "node:assert/strict";
import { test } from "node:test";
import { mergeAgentRows } from "./agents-view.ts";
import type { AgentRecord } from "./control-center.ts";

const CATALOG: AgentRecord[] = [
  {
    id: "observer",
    name: "Observer",
    kind: "role",
    purpose: "Read and search without changing anything.",
    may: "Read and search.",
    mayNot: "Plan, change, review for release, or deploy.",
    risk: "R0",
  },
  {
    id: "coding-agent",
    name: "Coding agent",
    kind: "automation",
    purpose: "A machine identity.",
    may: "Read, write within contracted scope.",
    mayNot: "Merge.",
    risk: "Tool capability is not authority.",
  },
];

test("role mendapat kolom May dari policy live", () => {
  const rows = mergeAgentRows(CATALOG, { observer: ["read", "search"] });
  assert.equal(rows[0]?.may, "read, search");
  assert.equal(rows[0]?.fromPolicy, true);
});

test("identitas otomasi tetap memakai prosa katalog dan ditandai", () => {
  const rows = mergeAgentRows(CATALOG, { observer: ["read"] });
  assert.equal(rows[1]?.may, "Read, write within contracted scope.");
  assert.equal(rows[1]?.fromPolicy, false);
});

test("role tanpa entri policy jatuh kembali ke katalog", () => {
  const rows = mergeAgentRows(CATALOG, {});
  assert.equal(rows[0]?.may, "Read and search.");
  assert.equal(rows[0]?.fromPolicy, false);
});
