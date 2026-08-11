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
import { isAbsolute, join, resolve } from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";

import {
  canTransition,
  closeTargetState,
  findOverlapConflicts,
  normalizePrefix,
  prefixesOverlap,
  publicTask,
  redactNotes,
  validateRegistry,
  validateTaskShape,
} from "../../tools/task/src/ownership.mjs";

const repoRoot = fileURLToPath(new URL("../..", import.meta.url));

function git(cwd, args) {
  const result = spawnSync("git", args, { cwd, encoding: "utf8" });
  assert.equal(result.status, 0, `${result.stdout}\n${result.stderr}`);
  return result.stdout.trim();
}

function createTwoWorktreeFixture() {
  const sandbox = mkdtempSync(join(tmpdir(), "safrs-worktrees-"));
  const repository = join(sandbox, "repository");
  const sibling = join(sandbox, "sibling");
  mkdirSync(repository, { recursive: true });
  git(repository, ["init", "--initial-branch=main"]);
  git(repository, ["config", "user.email", "tests@example.invalid"]);
  git(repository, ["config", "user.name", "SAFRS Tests"]);
  mkdirSync(join(repository, "tools"), { recursive: true });
  cpSync(join(repoRoot, "tools/task"), join(repository, "tools/task"), {
    recursive: true,
  });
  mkdirSync(join(repository, ".safrs"), { recursive: true });
  writeFileSync(
    join(repository, ".safrs/active-tasks.json"),
    `${JSON.stringify({ version: 1, tasks: [] }, null, 2)}\n`,
  );
  writeFileSync(join(repository, "README.md"), "fixture\n");
  git(repository, ["add", "."]);
  git(repository, ["commit", "-m", "test fixture"]);
  git(repository, ["worktree", "add", "-b", "second", sibling]);
  return { sandbox, repository, sibling };
}

function sharedRegistryPath(repository) {
  const rawCommonDirectory = git(repository, ["rev-parse", "--git-common-dir"]);
  const commonDirectory = isAbsolute(rawCommonDirectory)
    ? rawCommonDirectory
    : resolve(repository, rawCommonDirectory);
  return join(commonDirectory, "safrs-control-plane", "active-tasks.json");
}

function taskFixture(overrides = {}) {
  const now = "2026-08-11T12:00:00Z";
  return {
    id: "TASK-FIXTURE",
    title: "Fixture",
    state: "EXECUTING",
    risk: "R1",
    scope_prefixes: ["tools/"],
    allowed_tools: [],
    owner_id: "agent:test",
    owner_label: "Test agent",
    worktree_id: "main",
    claimed_at: now,
    updated_at: now,
    expires_at: null,
    ...overrides,
  };
}

test("path prefixes overlap on ancestor and identity only", () => {
  assert.equal(prefixesOverlap(".cursor/", ".cursor/"), true);
  assert.equal(prefixesOverlap(".cursor/", ".cursor/rules/"), true);
  assert.equal(prefixesOverlap("packages/api/", "packages/ui/"), false);
  assert.equal(prefixesOverlap("package.json", "packages/"), false);
  assert.equal(prefixesOverlap("scripts/", "scripts/safrs-verify.ps1"), true);
});

test("normalizePrefix rejects globs and absolute paths", () => {
  assert.throws(() => normalizePrefix("packages/**"));
  assert.throws(() => normalizePrefix("/etc/passwd"));
  assert.throws(() => normalizePrefix("../secrets"));
  assert.equal(normalizePrefix(".cursor/"), ".cursor/");
  assert.equal(normalizePrefix("packages/api/"), "packages/api/");
});

test("normalizePrefix canonicalizes dot aliases and rejects an existing directory without slash", () => {
  assert.equal(normalizePrefix("././packages/api/"), "packages/api/");
  assert.throws(() => normalizePrefix("tools/task", "scope", repoRoot));
});

test("prefix overlap is conservative across Windows case variants", () => {
  assert.equal(prefixesOverlap(".Cursor/", ".cursor/rules/"), true);
});

test("mutation-active R0 and invalid calendar timestamps are rejected", () => {
  assert.throws(() => validateTaskShape(taskFixture({ risk: "R0" })), /R0/u);
  assert.throws(
    () =>
      validateRegistry({
        version: 1,
        tasks: [
          taskFixture({
            state: "CLOSED",
            claimed_at: "2026-99-99T99:99:99Z",
            updated_at: "2026-99-99T99:99:99Z",
          }),
        ],
      }),
    /ISO-8601/iu,
  );
});

test("public task output redacts secret-like values in every field", () => {
  const visible = publicTask(
    taskFixture({
      title: "API_TOKEN=top-secret",
      owner_id: "PASSWORD=hunter2",
      owner_label: "AUTH_SECRET=hidden",
      allowed_tools: ["API_KEY=private"],
    }),
  );
  const serialized = JSON.stringify(visible);
  assert.doesNotMatch(serialized, /top-secret|hunter2|hidden|private/u);
  assert.match(serialized, /REDACTED/u);

  const credentialShaped = JSON.stringify(
    publicTask(
      taskFixture({
        title: "api_token=lowercase-secret",
        owner_label: "ghp_ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789",
      }),
    ),
  );
  assert.doesNotMatch(
    credentialShaped,
    /lowercase-secret|ghp_ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789/u,
  );
});

test("registry validation rejects secret assignments before persistence", () => {
  for (const overrides of [
    { title: "API_TOKEN=top-secret" },
    { owner_id: "PASSWORD=hunter2" },
    { owner_label: "AUTH_SECRET=hidden" },
    { allowed_tools: ["API_KEY=private"] },
    { notes: "DATABASE_PASSWORD=do-not-store" },
    { title: "api_token=lowercase-secret" },
    { owner_label: "ghp_ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789" },
    { id: "ghp_ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789" },
  ]) {
    assert.throws(() => validateTaskShape(taskFixture(overrides)), /secret/iu);
  }
});

test("terminal tasks do not create overlap conflicts", () => {
  const conflicts = findOverlapConflicts([
    {
      id: "A",
      state: "CLOSED",
      scope_prefixes: [".cursor/"],
    },
    {
      id: "B",
      state: "EXECUTING",
      scope_prefixes: [".cursor/rules/"],
    },
  ]);
  assert.equal(conflicts.length, 0);
});

test("lifecycle helpers match the v1 table", () => {
  assert.equal(canTransition("EXECUTING", "VERIFYING"), true);
  assert.equal(canTransition("CLOSED", "EXECUTING"), false);
  assert.equal(closeTargetState("MERGED"), "CLOSED");
  assert.equal(closeTargetState("EXECUTING"), "ABORTED");
});

test("secret-like notes redact", () => {
  assert.equal(redactNotes("API_TOKEN=abc"), "[redacted]");
});

test("task claim previews without --yes and writes with --yes", () => {
  const fixture = createTwoWorktreeFixture();
  try {
    const fixtureCli = join(fixture.repository, "tools/task/src/cli.mjs");
    const claimArguments = [
      fixtureCli,
      "claim",
      "--id",
      "TASK-TEST-PREVIEW",
      "--title",
      "Preview only",
      "--owner-id",
      "agent:test",
      "--owner-label",
      "Test",
      "--risk",
      "R1",
      "--scope",
      "docs/",
    ];
    const preview = spawnSync(process.execPath, claimArguments, {
      cwd: fixture.repository,
      encoding: "utf8",
    });
    assert.equal(preview.status, 0, preview.stderr);
    assert.match(preview.stdout, /Preview claim/u);
    const beforeWrite = spawnSync(
      process.execPath,
      [fixtureCli, "list", "--json"],
      { cwd: fixture.repository, encoding: "utf8" },
    );
    assert.equal(JSON.parse(beforeWrite.stdout).tasks.length, 0);

    const write = spawnSync(process.execPath, [...claimArguments, "--yes"], {
      cwd: fixture.repository,
      encoding: "utf8",
    });
    assert.equal(write.status, 0, write.stderr);
    const registry = JSON.parse(
      readFileSync(sharedRegistryPath(fixture.repository), "utf8"),
    );
    assert.equal(registry.tasks[0].id, "TASK-TEST-PREVIEW");
  } finally {
    rmSync(fixture.sandbox, { recursive: true, force: true });
  }
});

test("task claim rejects overlapping mutation-active scope", () => {
  const fixture = createTwoWorktreeFixture();
  try {
    const now = new Date().toISOString().replace(/\.\d{3}Z$/u, "Z");
    const target = sharedRegistryPath(fixture.repository);
    mkdirSync(resolve(target, ".."), { recursive: true });
    writeFileSync(
      target,
      `${JSON.stringify(
        {
          version: 1,
          tasks: [
            {
              id: "TASK-HOLD",
              title: "Hold",
              state: "EXECUTING",
              risk: "R1",
              scope_prefixes: ["docs/governance/"],
              allowed_tools: [],
              owner_id: "agent:hold",
              owner_label: "Hold",
              worktree_id: "main",
              claimed_at: now,
              updated_at: now,
              expires_at: null,
            },
          ],
        },
        null,
        2,
      )}\n`,
    );
    const result = spawnSync(
      process.execPath,
      [
        join(fixture.repository, "tools/task/src/cli.mjs"),
        "claim",
        "--id",
        "TASK-OVERLAP",
        "--title",
        "Overlap",
        "--owner-id",
        "agent:other",
        "--owner-label",
        "Other",
        "--risk",
        "R1",
        "--scope",
        "docs/governance/SAFRS_MULTI_AGENT_PROTOCOL.md",
        "--yes",
      ],
      { cwd: fixture.repository, encoding: "utf8" },
    );
    assert.notEqual(result.status, 0);
    assert.match(`${result.stderr}${result.stdout}`, /overlap/iu);
  } finally {
    rmSync(fixture.sandbox, { recursive: true, force: true });
  }
});

test("claims are shared across sibling Git worktrees", () => {
  const fixture = createTwoWorktreeFixture();
  try {
    const claim = spawnSync(
      process.execPath,
      [
        join(fixture.repository, "tools/task/src/cli.mjs"),
        "claim",
        "--id",
        "TASK-SHARED",
        "--title",
        "Shared claim",
        "--owner-id",
        "agent:first",
        "--owner-label",
        "First worktree",
        "--risk",
        "R1",
        "--scope",
        "docs/",
        "--yes",
      ],
      { cwd: fixture.repository, encoding: "utf8" },
    );
    assert.equal(claim.status, 0, claim.stderr);

    const list = spawnSync(
      process.execPath,
      [join(fixture.sibling, "tools/task/src/cli.mjs"), "list", "--json"],
      { cwd: fixture.sibling, encoding: "utf8" },
    );
    assert.equal(list.status, 0, list.stderr);
    const registry = JSON.parse(list.stdout);
    assert.equal(registry.tasks.length, 1);
    assert.equal(registry.tasks[0].id, "TASK-SHARED");
    assert.equal(registry.tasks[0].worktree_id, "main");
  } finally {
    rmSync(fixture.sandbox, { recursive: true, force: true });
  }
});

test("a sibling worktree cannot mutate another worktree's task", () => {
  const fixture = createTwoWorktreeFixture();
  try {
    const mainCli = join(fixture.repository, "tools/task/src/cli.mjs");
    const siblingCli = join(fixture.sibling, "tools/task/src/cli.mjs");
    const claim = spawnSync(
      process.execPath,
      [
        mainCli,
        "claim",
        "--id",
        "TASK-MAIN-OWNER",
        "--title",
        "Main owner",
        "--owner-id",
        "agent:main",
        "--owner-label",
        "Main",
        "--risk",
        "R1",
        "--scope",
        "docs/",
        "--yes",
      ],
      { cwd: fixture.repository, encoding: "utf8" },
    );
    assert.equal(claim.status, 0, claim.stderr);

    const close = spawnSync(
      process.execPath,
      [siblingCli, "close", "--id", "TASK-MAIN-OWNER", "--yes"],
      { cwd: fixture.sibling, encoding: "utf8" },
    );
    assert.notEqual(close.status, 0);
    assert.match(
      `${close.stdout}${close.stderr}`,
      /belongs to worktree main/iu,
    );
    const registry = JSON.parse(
      readFileSync(sharedRegistryPath(fixture.repository), "utf8"),
    );
    assert.equal(registry.tasks[0].state, "CLAIMED");
  } finally {
    rmSync(fixture.sandbox, { recursive: true, force: true });
  }
});

test("an existing shared registry lock refuses a competing write", () => {
  const fixture = createTwoWorktreeFixture();
  try {
    const rawCommonDirectory = git(fixture.repository, [
      "rev-parse",
      "--git-common-dir",
    ]);
    const commonDirectory = isAbsolute(rawCommonDirectory)
      ? rawCommonDirectory
      : resolve(fixture.repository, rawCommonDirectory);
    const controlDirectory = join(commonDirectory, "safrs-control-plane");
    mkdirSync(controlDirectory, { recursive: true });
    writeFileSync(join(controlDirectory, "active-tasks.lock"), "held\n");

    const claim = spawnSync(
      process.execPath,
      [
        join(fixture.repository, "tools/task/src/cli.mjs"),
        "claim",
        "--id",
        "TASK-LOCKED",
        "--title",
        "Must not write",
        "--owner-id",
        "agent:second",
        "--owner-label",
        "Second writer",
        "--risk",
        "R1",
        "--scope",
        "tools/",
        "--yes",
      ],
      { cwd: fixture.repository, encoding: "utf8" },
    );
    assert.notEqual(claim.status, 0);

    const list = spawnSync(
      process.execPath,
      [join(fixture.repository, "tools/task/src/cli.mjs"), "list", "--json"],
      { cwd: fixture.repository, encoding: "utf8" },
    );
    assert.equal(list.status, 0, list.stderr);
    assert.equal(JSON.parse(list.stdout).tasks.length, 0);
  } finally {
    rmSync(fixture.sandbox, { recursive: true, force: true });
  }
});

test("close repairs one overlapping task without manual registry edits", () => {
  const fixture = createTwoWorktreeFixture();
  try {
    const target = sharedRegistryPath(fixture.repository);
    mkdirSync(resolve(target, ".."), { recursive: true });
    writeFileSync(
      target,
      `${JSON.stringify(
        {
          version: 1,
          tasks: [
            taskFixture({ id: "TASK-A", scope_prefixes: ["tools/"] }),
            taskFixture({
              id: "TASK-B",
              owner_id: "agent:other",
              scope_prefixes: ["tools/task/"],
            }),
          ],
        },
        null,
        2,
      )}\n`,
    );

    const close = spawnSync(
      process.execPath,
      [
        join(fixture.repository, "tools/task/src/cli.mjs"),
        "close",
        "--id",
        "TASK-B",
        "--yes",
      ],
      { cwd: fixture.repository, encoding: "utf8" },
    );
    assert.equal(close.status, 0, close.stderr);
    const registry = JSON.parse(readFileSync(target, "utf8"));
    assert.equal(
      registry.tasks.find((task) => task.id === "TASK-B").state,
      "ABORTED",
    );
  } finally {
    rmSync(fixture.sandbox, { recursive: true, force: true });
  }
});

test("state can move an expired owned task to a terminal state", () => {
  const fixture = createTwoWorktreeFixture();
  try {
    const target = sharedRegistryPath(fixture.repository);
    mkdirSync(resolve(target, ".."), { recursive: true });
    writeFileSync(
      target,
      `${JSON.stringify(
        {
          version: 1,
          tasks: [
            taskFixture({
              id: "TASK-EXPIRED",
              claimed_at: "2020-01-01T00:00:00Z",
              updated_at: "2020-01-01T00:00:00Z",
              expires_at: "2020-01-02T00:00:00Z",
            }),
          ],
        },
        null,
        2,
      )}\n`,
    );

    const state = spawnSync(
      process.execPath,
      [
        join(fixture.repository, "tools/task/src/cli.mjs"),
        "state",
        "--id",
        "TASK-EXPIRED",
        "--to",
        "ABORTED",
        "--yes",
      ],
      { cwd: fixture.repository, encoding: "utf8" },
    );
    assert.equal(state.status, 0, state.stderr);
    const registry = JSON.parse(readFileSync(target, "utf8"));
    assert.equal(registry.tasks[0].state, "ABORTED");
  } finally {
    rmSync(fixture.sandbox, { recursive: true, force: true });
  }
});
