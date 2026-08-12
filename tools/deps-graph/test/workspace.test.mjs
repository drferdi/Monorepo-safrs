import assert from "node:assert/strict";
import { mkdir, mkdtemp, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { test } from "node:test";
import {
  loadWorkspaceMembers,
  parseWorkspacePackages,
} from "../src/workspace.mjs";

test("parseWorkspacePackages extracts the packages list", () => {
  const yaml = `packages:
  - projects/*/apps/*
  - packages/*
  - tools/*

allowBuilds:
  esbuild: true
`;
  assert.deepEqual(parseWorkspacePackages(yaml), [
    "projects/*/apps/*",
    "packages/*",
    "tools/*",
  ]);
});

test("parseWorkspacePackages handles comments and empty packages", () => {
  assert.deepEqual(parseWorkspacePackages("# comment\npackages:\n"), []);
});

test("resolveMembers expands globs to concrete dirs", async () => {
  const root = await mkdtemp(path.join(tmpdir(), "deps-graph-"));
  await writeFile(
    path.join(root, "pnpm-workspace.yaml"),
    "packages:\n  - packages/*\n",
    "utf8",
  );
  await mkdir(path.join(root, "packages", "a"), { recursive: true });
  await mkdir(path.join(root, "packages", "b"), { recursive: true });
  await writeFile(
    path.join(root, "packages", "a", "package.json"),
    "{}",
    "utf8",
  );
  await writeFile(
    path.join(root, "packages", "b", "package.json"),
    "{}",
    "utf8",
  );
  const members = await loadWorkspaceMembers(root);
  assert.deepEqual(members, ["packages/a", "packages/b"]);
});

test("loadWorkspaceMembers reads pnpm-workspace.yaml", async () => {
  const root = await mkdtemp(path.join(tmpdir(), "deps-graph-"));
  await writeFile(
    path.join(root, "pnpm-workspace.yaml"),
    "packages:\n  - packages/*\n",
    "utf8",
  );
  await mkdir(path.join(root, "packages", "a"), { recursive: true });
  await writeFile(
    path.join(root, "packages", "a", "package.json"),
    JSON.stringify({ name: "@safrs/a" }),
    "utf8",
  );
  const members = await loadWorkspaceMembers(root);
  assert.deepEqual(members, ["packages/a"]);
});
