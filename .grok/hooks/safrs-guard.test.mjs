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
const hookConfig = JSON.parse(
  readFileSync(path.join(repoRoot, ".grok/hooks/safrs-guard.json"), "utf8"),
).hooks.PreToolUse[0];

/** Grok's envelope, as captured from Grok 1.0.60 (camelCase plus snake_case). */
function grok(toolName, toolInput, extra = {}) {
  return {
    hookEventName: "pre_tool_use",
    hook_event_name: "PreToolUse",
    cwd: repoRoot,
    workspaceRoot: repoRoot,
    toolName,
    tool_name: toolName,
    toolInput,
    tool_input: toolInput,
    toolInputTruncated: false,
    permissionMode: "default",
    ...extra,
  };
}
const shell = (command) => grok("run_terminal_command", { command });

function run(argv, input, options = {}) {
  const result = spawnSync(argv[0], argv.slice(1), {
    input: typeof input === "string" ? input : JSON.stringify(input),
    cwd: repoRoot,
    encoding: "utf8",
    ...options,
  });
  const stdout = (result.stdout ?? "").trim();
  return {
    exitCode: result.status,
    stderr: result.stderr ?? "",
    reply: stdout ? JSON.parse(stdout) : {},
  };
}
const runHook = (input, options) => run(["node", hookPath], input, options);

for (const [name, payload, decision, pattern] of [
  ["force push", shell("git push --force origin main"), "deny", /force-push/],
  ["merge asks Gaffer", shell("git merge feat/x"), "ask", /Gaffer/],
  [
    "reset --hard asks",
    shell("git.exe reset --hard HEAD"),
    "ask",
    /reset --hard/,
  ],
  ["cat .env", shell("cat .env"), "deny", /credential/],
  [
    "read_file .env",
    grok("read_file", { target_file: path.join(repoRoot, ".env") }),
    "deny",
    /credential/,
  ],
  [
    "search_replace on a nested .env",
    grok("search_replace", { file_path: "projects/x/.env.local" }),
    "deny",
    /credential/,
  ],
  [
    "write outside the repository",
    grok("write", { file_path: OUTSIDE_FILE, content: "x" }),
    "deny",
    /outside the repository/,
  ],
  [
    "truncated command",
    grok(
      "run_terminal_command",
      { command: "echo hi" },
      { toolInputTruncated: true },
    ),
    "deny",
    /truncated/,
  ],
  ["malformed payload", "not-json", "deny", /could not be parsed/],
]) {
  test(`${decision}: ${name}`, () => {
    const result = runHook(payload);
    assert.equal(result.exitCode, 0, result.stderr);
    assert.equal(result.reply.decision, decision);
    assert.match(result.reply.reason, pattern);
  });
}

for (const [name, payload] of [
  ["git status", shell("git status --short")],
  [
    "read_file .env.example",
    grok("read_file", { target_file: path.join(repoRoot, ".env.example") }),
  ],
  [
    "write inside the repository",
    grok("write", {
      file_path: path.join(repoRoot, "docs/x.md"),
      content: "x",
    }),
  ],
  ["unguarded tool", grok("grep", { pattern: "x" })],
]) {
  test(`allows: ${name}`, () => {
    const result = runHook(payload);
    assert.equal(result.exitCode, 0, result.stderr);
    assert.equal(result.reply.decision, undefined);
  });
}

test("a verification-control write carries an R2 note for the model", () => {
  const result = runHook(
    grok("search_replace", { file_path: path.join(repoRoot, "AGENTS.md") }),
  );
  assert.match(result.reply.hookSpecificOutput.additionalContext, /R2/);
});

test("a guard that cannot be loaded denies (fail closed)", () => {
  const outside = mkdtempSync(path.join(os.tmpdir(), "grok-guard-no-repo-"));
  try {
    const copy = path.join(outside, ".grok", "hooks", "safrs-guard.mjs");
    mkdirSync(path.dirname(copy), { recursive: true });
    copyFileSync(hookPath, copy);
    const result = run(["node", copy], shell("echo hi"));
    assert.equal(result.reply.decision, "deny");
    assert.match(result.reply.reason, /fail closed/);
  } finally {
    rmSync(outside, { recursive: true, force: true });
  }
});

test("the matcher lists Grok's file and shell tools", () => {
  const names = hookConfig.matcher.split("|");
  for (const tool of [
    "run_terminal_command",
    "read_file",
    "search_replace",
    "write",
  ]) {
    assert.ok(names.includes(tool), tool);
  }
});

const shells = [["platform shell", { shell: true }]];
if (process.platform === "win32") {
  shells.push(["powershell", { shell: "powershell.exe" }]);
}
const command = hookConfig.hooks[0].command;
for (const [shellName, options] of shells) {
  test(`hook command guards through ${shellName} from a subdirectory`, () => {
    const exec = (payload) =>
      run([command], payload, {
        cwd: path.join(repoRoot, "tools"),
        ...options,
      });
    assert.equal(
      exec(shell("git push --force origin main")).reply.decision,
      "deny",
    );
    assert.equal(exec(shell("git status")).reply.decision, undefined);
  });
}

test("hook command stays silent outside a repository", () => {
  const outside = mkdtempSync(path.join(os.tmpdir(), "grok-hook-no-repo-"));
  try {
    const result = run([command], shell("git push --force origin main"), {
      cwd: outside,
      shell: true,
    });
    assert.equal(result.exitCode, 0);
    assert.deepEqual(result.reply, {});
  } finally {
    rmSync(outside, { recursive: true, force: true });
  }
});

test("under always-approve an ask becomes a deny (Grok would not prompt)", () => {
  const result = runHook(
    grok(
      "run_terminal_command",
      { command: "git merge feat/x" },
      {
        permissionMode: "bypassPermissions",
      },
    ),
  );
  assert.equal(result.reply.decision, "deny");
  assert.match(result.reply.reason, /bypassPermissions/);
});
