import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { test } from "node:test";

test("Playwright visual baselines are real PNG files, not Git LFS pointers", () => {
  const snapshot = join(
    "projects",
    "golden-path",
    "apps",
    "web",
    "e2e",
    "screenshots",
    "visual.spec.ts-snapshots",
    "readiness-desk.png",
  );
  const bytes = readFileSync(snapshot);
  const head = bytes.subarray(0, 8).toString("hex");
  const asText = bytes.subarray(0, 40).toString("utf8");

  assert.notEqual(
    asText.startsWith("version https://git-lfs.github.com/spec/v1"),
    true,
    "readiness-desk.png is still a Git LFS pointer. Run git lfs pull and git lfs checkout.",
  );
  assert.equal(head, "89504e470d0a1a0a");
  assert.ok(bytes.length > 1024);
});
