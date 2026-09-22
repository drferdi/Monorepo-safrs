import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { fileURLToPath } from "node:url";

import test from "node:test";

const repositoryRoot = fileURLToPath(new URL("../..", import.meta.url));

function runHook(path) {
  return spawnSync(process.execPath, [path], {
    cwd: repositoryRoot,
    encoding: "utf8",
    input: "{invalid-json",
  });
}

test("Cursor hooks deny malformed payloads", () => {
  for (const path of [
    ".cursor/hooks/guard-shell.mjs",
    ".cursor/hooks/guard-read-secrets.mjs",
  ]) {
    const result = runHook(path);
    assert.equal(result.status, 0, result.stderr);
    assert.equal(JSON.parse(result.stdout).permission, "deny");
  }
});

test("Codex and Claude hooks block malformed payloads", () => {
  for (const path of [
    ".codex/hooks/guard-tool-use.mjs",
    ".claude/hooks/guard-sensitive-paths.mjs",
  ]) {
    const result = runHook(path);
    assert.equal(result.status, 2, result.stderr);
    assert.match(result.stderr, /could not be parsed/iu);
  }
});

test("Cursor MCP excludes filesystem access and limits browser origins", () => {
  const mcp = JSON.parse(
    readFileSync(join(repositoryRoot, ".cursor/mcp.json"), "utf8"),
  );
  const inventory = JSON.parse(
    readFileSync(join(repositoryRoot, ".safrs/tool-inventory.json"), "utf8"),
  );

  assert.equal(Object.hasOwn(mcp.mcpServers, "filesystem"), false);
  assert.deepEqual(mcp.mcpServers.playwright.args.slice(-2), [
    "--allowed-origins",
    "http://localhost:*;http://127.0.0.1:*",
  ]);
  assert.equal(
    inventory.tools.some((tool) => tool.id === "filesystem-mcp"),
    false,
  );
});

test("CODEOWNERS covers every sensitive adapter directory", () => {
  const owners = readFileSync(
    join(repositoryRoot, ".github/CODEOWNERS"),
    "utf8",
  );

  for (const pattern of [
    "/.cursor/**",
    "/.claude/**",
    "/.codex/**",
    "/.husky/**",
    "**/.mcp.json",
  ]) {
    assert.match(owners, new RegExp(`^${escapeRegExp(pattern)}\\s+@drferdii$`, "mu"));
  }
});

function escapeRegExp(value) {
  return value.replace(/[.*+?^${}()|[\]\\]/gu, "\\$&");
}
