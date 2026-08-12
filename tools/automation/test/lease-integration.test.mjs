import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import {
  cpSync,
  mkdirSync,
  mkdtempSync,
  readFileSync,
  rmSync,
  writeFileSync,
} from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";

import { replayState, verifyEventChain } from "../src/leases.mjs";

const repoRoot = fileURLToPath(new URL("../../..", import.meta.url));

function git(cwd, args) {
  const result = spawnSync("git", args, { cwd, encoding: "utf8" });
  assert.equal(result.status, 0, result.stderr);
  return result.stdout.trim();
}

function taskCli(cwd, args) {
  const result = spawnSync(
    process.execPath,
    [join(cwd, "tools/task/src/cli.mjs"), ...args],
    { cwd, encoding: "utf8" },
  );
  return result;
}

test("task CLI mirrors claim/state/close into an append-only lease chain", (t) => {
  const sandbox = mkdtempSync(join(tmpdir(), "safrs-lease-integration-"));
  t.after(() => rmSync(sandbox, { recursive: true, force: true }));
  const repository = join(sandbox, "repository");
  mkdirSync(join(repository, "tools"), { recursive: true });
  cpSync(join(repoRoot, "tools/task"), join(repository, "tools/task"), {
    recursive: true,
  });
  cpSync(
    join(repoRoot, "tools/automation/src"),
    join(repository, "tools/automation/src"),
    { recursive: true },
  );
  git(repository, ["init", "--initial-branch=main"]);
  git(repository, ["config", "user.email", "tests@example.invalid"]);
  git(repository, ["config", "user.name", "SAFRS Tests"]);
  writeFileSync(join(repository, "README.md"), "fixture\n");
  writeFileSync(join(repository, "demo.txt"), "demo\n");
  git(repository, ["add", "."]);
  git(repository, ["commit", "-m", "fixture"]);

  const claim = taskCli(repository, [
    "claim",
    "--id",
    "TASK-20260813-LEASE-DEMO",
    "--title",
    "Lease demo",
    "--owner-id",
    "agent:test",
    "--owner-label",
    "Test agent",
    "--risk",
    "R1",
    "--scope",
    "demo.txt",
    "--state",
    "EXECUTING",
    "--yes",
  ]);
  assert.equal(claim.status, 0, claim.stderr);

  const state = taskCli(repository, [
    "state",
    "--id",
    "TASK-20260813-LEASE-DEMO",
    "--to",
    "VERIFYING",
    "--yes",
  ]);
  assert.equal(state.status, 0, state.stderr);

  const close = taskCli(repository, [
    "close",
    "--id",
    "TASK-20260813-LEASE-DEMO",
    "--yes",
  ]);
  assert.equal(close.status, 0, close.stderr);

  const commonDirectory = git(repository, ["rev-parse", "--git-common-dir"]);
  const ndjson = readFileSync(
    join(
      repository,
      commonDirectory,
      "safrs-control-plane/lease-events.ndjson",
    ),
    "utf8",
  );
  const events = ndjson
    .split(/\r?\n/u)
    .filter((line) => line.trim())
    .map((line) => JSON.parse(line));

  assert.deepEqual(
    events.map((event) => event.event_type),
    ["CLAIM", "TRANSITION", "RELEASE"],
  );
  assert.deepEqual(verifyEventChain(events).errors, []);
  const snapshot = replayState(events);
  assert.equal(snapshot.fencing_token, 1);
  assert.equal(snapshot.terminal, true);
  assert.equal(snapshot.next_state, "ABORTED");
});
