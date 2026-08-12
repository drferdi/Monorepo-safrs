import assert from "node:assert/strict";
import test from "node:test";

import {
  detectCaseCollisions,
  normalizeScope,
  scopesOverlap,
} from "../src/scopes.mjs";

test("normalizes separators, collapses duplicates, keeps directory marker", () => {
  assert.equal(normalizeScope("tools\\automation\\"), "tools/automation/");
  assert.equal(normalizeScope("a//b//c.txt"), "a/b/c.txt");
  assert.equal(normalizeScope("./a/./b/"), "a/b/");
});

test("rejects absolute paths, drive letters, UNC, parent escapes, wildcards, negations", () => {
  for (const bad of [
    "/etc/passwd",
    "C:/secrets",
    "//server/share",
    "../outside",
    "a/../../b",
    "src/**",
    "src/*.ts",
    "file?.txt",
    "!negated",
    "src/[ab]/x",
    "",
    ".",
    "./",
  ]) {
    assert.throws(() => normalizeScope(bad), /scope/iu, bad);
  }
});

test("overlap: identical, ancestor directory, descendant; non-overlap stays free", () => {
  assert.equal(scopesOverlap("a/b.txt", "a/b.txt"), true);
  assert.equal(scopesOverlap("a/", "a/b/c.txt"), true);
  assert.equal(scopesOverlap("a/b/c.txt", "a/"), true);
  assert.equal(scopesOverlap("a/", "ab/"), false);
  assert.equal(scopesOverlap("a/x.txt", "a/y.txt"), false);
});

test("overlap is case-insensitive to match Windows filesystems", () => {
  assert.equal(scopesOverlap("Tools/", "tools/x.mjs"), true);
});

test("case collisions inside one scope list are detected", () => {
  assert.deepEqual(detectCaseCollisions(["a/File.txt", "b/other.txt"]), []);
  const collisions = detectCaseCollisions(["a/File.txt", "a/file.txt"]);
  assert.equal(collisions.length, 1);
});
