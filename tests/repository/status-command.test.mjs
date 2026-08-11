import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { cpSync, mkdirSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { isAbsolute, join, resolve } from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";

const repoRoot = fileURLToPath(new URL("../..", import.meta.url));
const statusCli = join(repoRoot, "tools/status/src/cli.mjs");

function run(command, args, cwd = repoRoot) {
  return spawnSync(command, args, {
    cwd,
    encoding: "utf8",
    timeout: 120_000,
  });
}

function git(args, cwd = repoRoot) {
  const result = run("git", args, cwd);
  assert.equal(result.status, 0, result.stderr);
  return result.stdout.trim();
}

function currentChangedPaths() {
  const commands = [
    ["diff", "--name-only", "HEAD"],
    ["diff", "--cached", "--name-only"],
    ["ls-files", "--others", "--exclude-standard"],
  ];
  const paths = new Set();
  for (const args of commands) {
    for (const path of git(args).split(/\r?\n/u).filter(Boolean)) {
      paths.add(path);
    }
  }
  return paths;
}

function createStatusFixture() {
  const sandbox = mkdtempSync(join(tmpdir(), "safrs-status-"));
  const repository = join(sandbox, "repository");
  mkdirSync(join(repository, "tools"), { recursive: true });
  cpSync(join(repoRoot, "tools/task"), join(repository, "tools/task"), {
    recursive: true,
  });
  cpSync(join(repoRoot, "tools/status"), join(repository, "tools/status"), {
    recursive: true,
  });
  git(["init", "--initial-branch=main"], repository);
  const rawCommon = git(["rev-parse", "--git-common-dir"], repository);
  const commonDirectory = isAbsolute(rawCommon)
    ? rawCommon
    : resolve(repository, rawCommon);
  const registryPath = join(
    commonDirectory,
    "safrs-control-plane",
    "active-tasks.json",
  );
  mkdirSync(resolve(registryPath, ".."), { recursive: true });
  return { sandbox, repository, registryPath };
}

test("status --json uses English fields and platform not_in_scope", () => {
  const result = run(process.execPath, [statusCli, "--json"]);
  assert.ok(result.stdout.length > 0, result.stderr);
  const report = JSON.parse(result.stdout);
  assert.ok(["PASS", "WARN", "FAIL"].includes(report.status));
  assert.equal(typeof report.observed_at, "string");
  assert.equal(report.platform.state, "not_in_scope");
  assert.equal(typeof report.next_action, "string");
  assert.ok(report.verification);
  assert.ok(report.git);
});

test("status reports the file-level dirty count", () => {
  const result = run(process.execPath, [statusCli, "--json"]);
  const report = JSON.parse(result.stdout);
  assert.equal(report.git.dirty_count, currentChangedPaths().size);
});

test("human status uses Bahasa Indonesia for the next action", () => {
  const result = run(process.execPath, [statusCli]);
  assert.match(result.stdout, /Langkah berikutnya:/u);
  assert.doesNotMatch(
    result.stdout,
    /\b(?:Fix|Resolve|Investigate|Re-run|Review|Continue|No active)\b/u,
  );
});

test("status leaves the complete Git working state unchanged", () => {
  const before = git(["status", "--porcelain=v1", "--untracked-files=all"]);
  const result = run(process.execPath, [statusCli, "--json"]);
  assert.ok(result.status === 0 || result.status === 1);
  const after = git(["status", "--porcelain=v1", "--untracked-files=all"]);
  assert.equal(after, before);
});

test("status FAIL exit code on malformed shared registry", () => {
  const fixture = createStatusFixture();
  try {
    writeFileSync(fixture.registryPath, "{bad", "utf8");
    const result = run(
      process.execPath,
      [join(fixture.repository, "tools/status/src/cli.mjs"), "--json"],
      fixture.repository,
    );
    assert.equal(result.status, 1);
    const report = JSON.parse(result.stdout);
    assert.equal(report.status, "FAIL");
    assert.match(report.next_action, /shared task registry/u);
    assert.doesNotMatch(report.next_action, /\.safrs\/active-tasks\.json/u);
  } finally {
    rmSync(fixture.sandbox, { recursive: true, force: true });
  }
});
