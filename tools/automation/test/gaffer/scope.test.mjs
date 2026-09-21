import assert from "node:assert/strict";
import test from "node:test";
import { assertChangedFilesWithinScope } from "../../src/gaffer/scope.mjs";

test("scope accepts owned files and descendants", () => {
  assert.equal(
    assertChangedFilesWithinScope(
      ["src/a.ts", "tests/unit/a.test.ts"],
      ["src/a.ts", "tests"],
    ),
    true,
  );
});

test("scope rejects unauthorized files", () => {
  assert.throws(
    () =>
      assertChangedFilesWithinScope(["src/a.ts", "package.json"], ["src/a.ts"]),
    /Scope violation/,
  );
});
