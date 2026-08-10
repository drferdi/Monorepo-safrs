import assert from "node:assert/strict";
import { existsSync, readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import test from "node:test";

const workflowsDirectory = ".github/workflows";
const ciFile = join(workflowsDirectory, "ci.yml");
const renovateFile = ".github/renovate.json";
const immutableAction = /^[a-z0-9][a-z0-9_.-]*\/[a-z0-9_.-]+@[a-f0-9]{40}$/u;

function workflowFiles() {
  return readdirSync(workflowsDirectory)
    .filter((file) => file.endsWith(".yml") || file.endsWith(".yaml"))
    .map((file) => join(workflowsDirectory, file));
}

function assertWorkflowPolicy(workflow) {
  const actions = [
    ...workflow.matchAll(/^\s*(?:-\s*)?uses:\s*([^\s#]+)\s*(?:#.*)?$/gmu),
  ].map((match) => match[1]);
  const lines = workflow.split(/\r?\n/u);
  let permissionsIndentation;

  for (const line of lines) {
    const permissions = /^(\s*)permissions:\s*(.*?)\s*$/u.exec(line);
    if (permissions) {
      if (
        permissions[2] === "write-all" ||
        /\b[a-z0-9-]+\s*:\s*write\b/iu.test(permissions[2])
      ) {
        throw new Error("Workflow permissions write-all tidak diizinkan.");
      }
      permissionsIndentation = permissions[1].length;
      continue;
    }

    if (permissionsIndentation !== undefined) {
      const indentation = /^\s*/u.exec(line)?.[0].length ?? 0;
      if (line.trim() && indentation <= permissionsIndentation) {
        permissionsIndentation = undefined;
      } else if (/^\s*[a-z0-9-]+:\s*write\s*(?:#.*)?$/iu.test(line)) {
        throw new Error("Workflow permission write tidak diizinkan.");
      }
    }
  }

  if (/\bdeploy(?:ment|ed|ing)?\b/iu.test(workflow)) {
    throw new Error("Workflow deploy tidak diizinkan.");
  }
  for (const action of actions) {
    if (!immutableAction.test(action)) {
      throw new Error("Action harus memakai SHA immutable.");
    }
  }
}

test("Renovate remains PR-only and keeps a dependency dashboard", () => {
  const renovate = JSON.parse(readFileSync(renovateFile, "utf8"));

  assert.equal(renovate.automerge, false);
  assert.equal(renovate.dependencyDashboard, true);
  assert.deepEqual(renovate.extends, ["config:recommended"]);
  assert.ok(Array.isArray(renovate.schedule));
  assert.ok(renovate.schedule.length > 0);
});

test("every repository workflow is non-deploying, least-privileged, and SHA-pinned", () => {
  const files = workflowFiles();
  assert.ok(files.length > 0);

  for (const workflowFile of files) {
    const workflow = readFileSync(workflowFile, "utf8");
    assert.doesNotThrow(() => assertWorkflowPolicy(workflow), workflowFile);
  }
});

test("CI proves the full safe verification path without deployment", () => {
  assert.equal(existsSync(ciFile), true);
  const workflow = readFileSync(ciFile, "utf8");

  for (const command of [
    "pnpm governance",
    "pnpm install --frozen-lockfile",
    "pnpm lint",
    "pnpm typecheck",
    "pnpm test",
    "pnpm build",
    "pnpm test:e2e",
  ]) {
    assert.match(
      workflow,
      new RegExp(command.replace(/[.*+?^${}()|[\]\\]/gu, "\\$&")),
    );
  }
  assert.match(workflow, /services:\s*\n\s+postgres:/u);
  assert.match(workflow, /DATABASE_URL:/u);
  assert.doesNotMatch(workflow, /\bdeploy\b/iu);
});

test("workflow policy rejects YAML bypasses for action pins, write permissions, and deployment", () => {
  for (const workflow of [
    "- uses: actions/checkout@v4\n",
    "permissions:\n  id-token: write\n",
    "permissions:\n  packages: write\n",
    "permissions: write-all\n",
    "permissions: { actions: write }\n",
    "jobs:\n  publish:\n    steps:\n      - run: npm run deploy\n",
  ]) {
    assert.throws(() => assertWorkflowPolicy(workflow), /SHA|write|deploy/iu);
  }
});
