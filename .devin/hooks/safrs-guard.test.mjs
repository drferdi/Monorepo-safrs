import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import {
  copyFileSync,
  mkdirSync,
  mkdtempSync,
  readFileSync,
  rmSync,
} from "node:fs";
import os from "node:os";
import path from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";

const hookPath = path.join(
  path.dirname(fileURLToPath(import.meta.url)),
  "safrs-guard.mjs",
);
const repoRoot = path.resolve(path.dirname(hookPath), "..", "..");
const OUTSIDE_FILE = path.join(os.tmpdir(), "outside-the-repo", "file.txt");

function runHook(input, spawnOptions = {}, script = hookPath) {
  const result = spawnSync("node", [script], {
    input: typeof input === "string" ? input : JSON.stringify(input),
    cwd: repoRoot,
    encoding: "utf8",
    ...spawnOptions,
  });
  return {
    exitCode: result.status,
    stderr: result.stderr ?? "",
    stdout: result.stdout ?? "",
  };
}

const exec = (command) => ({ tool_name: "exec", tool_input: { command } });

/** Blocks travel as Devin's JSON decision with exit 0 (see the hook header). */
function decision(result) {
  return result.stdout.trim()
    ? (JSON.parse(result.stdout).decision ?? "allow")
    : "allow";
}

const configuredCommand = JSON.parse(
  readFileSync(path.join(repoRoot, ".devin/hooks.v1.json"), "utf8"),
).PreToolUse[0].hooks[0].command;

for (const [name, payload, pattern] of [
  ["force push", exec("git push --force origin main"), /force-push/],
  ["merge (ask renders as block)", exec("git merge feat/x"), /Gaffer/],
  [
    "git.exe reset --hard",
    exec("git.exe -C x reset --hard HEAD"),
    /reset --hard/,
  ],
  ["cat .env", exec("cat .env"), /credential/],
  [
    "read .env",
    { tool_name: "read", tool_input: { file_path: ".env" } },
    /credential/,
  ],
  [
    "edit a nested .env file",
    { tool_name: "edit", tool_input: { file_path: "projects/x/.env.local" } },
    /credential/,
  ],
  [
    "write outside the repository",
    { tool_name: "write", tool_input: { file_path: OUTSIDE_FILE } },
    /outside the repository/,
  ],
  [
    "apply_patch on a credential file",
    {
      tool_name: "apply_patch",
      tool_input: {
        input: "*** Begin Patch\n*** Update File: secrets.json\n*** End Patch",
      },
    },
    /credential/,
  ],
  [
    "apply_patch without file targets",
    { tool_name: "apply_patch", tool_input: { input: "no targets" } },
    /fail closed/,
  ],
  ["malformed payload", "not-json", /could not be parsed/],
]) {
  test(`blocks: ${name}`, () => {
    const result = runHook(payload);
    assert.equal(result.exitCode, 0, result.stderr);
    assert.equal(decision(result), "block");
    assert.match(JSON.parse(result.stdout).reason, pattern);
  });
}

for (const [name, payload] of [
  ["pnpm test", exec("pnpm test")],
  [
    "read .env.example",
    { tool_name: "read", tool_input: { file_path: ".env.example" } },
  ],
  [
    "apply_patch adding a doc",
    {
      tool_name: "apply_patch",
      tool_input: {
        input: "*** Begin Patch\n*** Add File: docs/x.md\n*** End Patch",
      },
    },
  ],
  ["unguarded tool", { tool_name: "grep", tool_input: { pattern: "x" } }],
  [
    "absolute path inside the repository",
    {
      tool_name: "edit",
      tool_input: { file_path: path.join(repoRoot, "README.md") },
    },
  ],
]) {
  test(`allows: ${name}`, () => {
    const result = runHook(payload);
    assert.equal(result.exitCode, 0, result.stderr);
    assert.notEqual(decision(result), "block");
  });
}

test("a verification-control write is allowed with an R2 notice", () => {
  const result = runHook({
    tool_name: "edit",
    tool_input: { file_path: path.join(repoRoot, "AGENTS.md") },
  });
  assert.equal(result.exitCode, 0);
  assert.match(
    JSON.parse(result.stdout).hookSpecificOutput.additionalContext,
    /R2/,
  );
});

test("guards from any cwd: paths resolve from the hook file", () => {
  const result = runHook(exec("git push --force origin main"), {
    cwd: os.tmpdir(),
  });
  assert.equal(decision(result), "block", result.stderr);
});

test("relative paths resolve against DEVIN_PROJECT_DIR", () => {
  const result = runHook(
    { tool_name: "edit", tool_input: { file_path: "README.md" } },
    { cwd: os.tmpdir(), env: { ...process.env, DEVIN_PROJECT_DIR: repoRoot } },
  );
  assert.equal(result.exitCode, 0, result.stderr);
});

test("a guard that cannot be loaded blocks (fail closed)", () => {
  const outside = mkdtempSync(path.join(os.tmpdir(), "devin-guard-no-repo-"));
  try {
    const copy = path.join(outside, ".devin", "hooks", "safrs-guard.mjs");
    mkdirSync(path.dirname(copy), { recursive: true });
    copyFileSync(hookPath, copy);
    const result = runHook(exec("echo hi"), {}, copy);
    assert.equal(result.exitCode, 0, result.stderr);
    assert.equal(decision(result), "block");
    assert.match(result.stderr, /fail closed/);
  } finally {
    rmSync(outside, { recursive: true, force: true });
  }
});

test("hooks.v1.json routes every guarded Devin tool to this hook", () => {
  const hooks = JSON.parse(
    readFileSync(path.join(repoRoot, ".devin/hooks.v1.json"), "utf8"),
  );
  const entry = hooks.PreToolUse.find((candidate) =>
    candidate.hooks.some((hook) => hook.command.includes("safrs-guard.mjs")),
  );
  const matcher = new RegExp(entry.matcher, "u");
  for (const tool of [
    "exec",
    "read",
    "edit",
    "write",
    "apply_patch",
    "notebook_edit",
  ]) {
    assert.ok(matcher.test(tool), tool);
  }
  assert.ok(!matcher.test("grep"));
});

const shells = [["platform shell", { shell: true }]];
if (process.platform === "win32") {
  shells.push(["powershell -Command", { shell: "powershell.exe" }]);
}
for (const [shellName, shellOptions] of shells) {
  test(`configured command guards through ${shellName} from a subdirectory`, () => {
    const run = (payload) => {
      const result = spawnSync(configuredCommand, {
        input: JSON.stringify(payload),
        cwd: path.join(repoRoot, "tools"),
        encoding: "utf8",
        ...shellOptions,
      });
      return { exitCode: result.status, stdout: result.stdout ?? "" };
    };
    const blocked = run(exec("git push --force origin main"));
    assert.equal(blocked.exitCode, 0);
    assert.equal(decision(blocked), "block");
    const allowed = run(exec("git status"));
    assert.equal(allowed.exitCode, 0);
    assert.equal(decision(allowed), "allow");
  });
}

test("configured command blocks when the guard cannot be found", () => {
  const outside = mkdtempSync(path.join(os.tmpdir(), "devin-hook-no-repo-"));
  try {
    const { DEVIN_PROJECT_DIR: _ignored, ...env } = process.env;
    const result = spawnSync(configuredCommand, {
      input: JSON.stringify(exec("git status")),
      cwd: outside,
      encoding: "utf8",
      shell: true,
      env,
    });
    assert.equal(result.status, 0);
    assert.equal(decision({ stdout: result.stdout ?? "" }), "block");
  } finally {
    rmSync(outside, { recursive: true, force: true });
  }
});
