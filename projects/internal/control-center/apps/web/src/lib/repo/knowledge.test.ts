import assert from "node:assert/strict";
import { test } from "node:test";

import { type RegistryDocument, sortDocuments } from "./knowledge.ts";

const DOCS: RegistryDocument[] = [
  {
    id: "b",
    path: "b.md",
    type: "canonical",
    status: "CANONICAL",
    normativity: "SHOULD",
    scope: "always",
  },
  {
    id: "c",
    path: "c.md",
    type: "canonical",
    status: "CANONICAL",
    normativity: "MUST",
    read_order: 3,
    scope: "always",
  },
  {
    id: "a",
    path: "a.md",
    type: "canonical",
    status: "CANONICAL",
    normativity: "MUST",
    read_order: 1,
    scope: "always",
  },
];

test("dokumen ber-read_order tampil dulu, urut naik", () => {
  const sorted = sortDocuments(DOCS);
  assert.deepEqual(
    sorted.map((document) => document.id),
    ["a", "c", "b"],
  );
});
