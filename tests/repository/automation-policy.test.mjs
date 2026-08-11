import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import {
  existsSync,
  mkdtempSync,
  readdirSync,
  readFileSync,
  rmSync,
  writeFileSync,
} from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import test from "node:test";
import { pathToFileURL } from "node:url";

const workflowsDirectory = ".github/workflows";
const ciFile = join(workflowsDirectory, "ci.yml");
const renovateFile = ".github/renovate.json";
const immutableAction = /^[a-z0-9][a-z0-9_.-]*\/[a-z0-9_.-]+@[a-f0-9]{40}$/u;
const repositoryRoot = process.cwd();
const codexGuard = join(repositoryRoot, ".codex/hooks/guard-tool-use.mjs");

function runHook(script, payload, inputOverride, cwd = repositoryRoot) {
  return spawnSync(process.execPath, [script], {
    cwd,
    encoding: "utf8",
    input: inputOverride ?? JSON.stringify(payload),
  });
}

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

test("Codex guard blocks credential edits and allows env templates", () => {
  const denied = runHook(codexGuard, {
    tool_name: "apply_patch",
    tool_input: {
      command: "*** Begin Patch\n*** Update File: .env\n*** End Patch",
    },
  });
  assert.equal(denied.status, 2);
  assert.match(denied.stderr, /credential/i);

  const allowed = runHook(codexGuard, {
    tool_name: "apply_patch",
    tool_input: {
      command: "*** Begin Patch\n*** Update File: .env.example\n*** End Patch",
    },
  });
  assert.equal(allowed.status, 0, allowed.stderr);
});

test("Codex guard blocks force push and direct database destruction", () => {
  for (const command of [
    "git push origin main --force",
    "git push origin main -f",
    "pnpm exec prisma migrate reset",
    "dropdb production",
  ]) {
    const result = runHook(codexGuard, {
      tool_name: "Bash",
      tool_input: { command },
    });
    assert.equal(result.status, 2, `${command}\n${result.stderr}`);
  }

  const lease = runHook(codexGuard, {
    tool_name: "Bash",
    tool_input: { command: "git push origin main --force-with-lease" },
  });
  assert.equal(lease.status, 0, lease.stderr);
});

test("Codex guard reports verification-control context without blocking", () => {
  const result = runHook(codexGuard, {
    tool_name: "apply_patch",
    tool_input: {
      command:
        "*** Begin Patch\n*** Update File: .safrs/policy.json\n*** End Patch",
    },
  });
  assert.equal(result.status, 0, result.stderr);
  const output = JSON.parse(result.stdout);
  assert.match(
    output.hookSpecificOutput.additionalContext,
    /verification.*R2/i,
  );
});

test("Codex guard handles malformed payloads without inventing a target", () => {
  const result = runHook(codexGuard, {}, "not-json");
  assert.equal(result.status, 0);
  assert.match(result.stderr, /could not be parsed/i);
});

test("Codex guard resolves the repository registry from a nested project cwd", () => {
  const nested = join(repositoryRoot, "projects/golden-path/apps/web");
  const result = runHook(
    codexGuard,
    {
      tool_name: "apply_patch",
      cwd: nested,
      tool_input: {
        command:
          "*** Begin Patch\n*** Update File: .safrs/policy.json\n*** End Patch",
      },
    },
    undefined,
    nested,
  );
  assert.equal(result.status, 0, result.stderr);
  assert.match(
    JSON.parse(result.stdout).hookSpecificOutput.additionalContext,
    /verification.*R2/i,
  );
});

test("Codex formatter extracts unique apply_patch paths", async () => {
  const formatterUrl = pathToFileURL(
    join(repositoryRoot, ".codex/hooks/format-edited-files.mjs"),
  ).href;
  const formatter = await import(formatterUrl);
  const paths = formatter.extractEditedPaths({
    tool_name: "apply_patch",
    tool_input: {
      command: [
        "*** Begin Patch",
        "*** Update File: src/a.ts",
        "*** Add File: src/b.json",
        "*** Update File: src/a.ts",
        "*** End Patch",
      ].join("\n"),
    },
  });
  assert.deepEqual(paths, ["src/a.ts", "src/b.json"]);
  assert.equal(formatter.shouldFormat("src/a.ts"), true);
  assert.equal(formatter.shouldFormat(".next/cache/a.js"), false);
  assert.equal(
    formatter.shouldFormat("packages/database/src/generated/a.ts"),
    false,
  );
  assert.equal(formatter.shouldFormat("README.md"), false);
  assert.equal(
    formatter.findRepositoryRoot(
      join(repositoryRoot, "projects/golden-path/apps/web"),
    ),
    repositoryRoot,
  );
});
