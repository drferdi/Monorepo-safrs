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
    const actions = [...workflow.matchAll(/^\s*uses:\s*([^\s#]+)\s*$/gmu)].map(
      (match) => match[1],
    );

    assert.doesNotMatch(workflow, /^\s*deploy(?:\s|:|$)/imu, workflowFile);
    assert.doesNotMatch(workflow, /^\s*contents:\s*write\s*$/imu, workflowFile);
    assert.doesNotMatch(
      workflow,
      /^\s*permissions:\s*write-all\s*$/imu,
      workflowFile,
    );
    for (const action of actions) {
      assert.match(action, immutableAction, `${workflowFile}: ${action}`);
    }
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
