import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { randomUUID } from "node:crypto";
import { mkdtempSync, rmSync, writeFileSync } from "node:fs";
import os from "node:os";
import path from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";

const hookPath = path.join(
  path.dirname(fileURLToPath(import.meta.url)),
  "handoff-reminder.mjs",
);
const repoRoot = path.resolve(path.dirname(hookPath), "..", "..");
const scratch = mkdtempSync(path.join(os.tmpdir(), "handoff-reminder-"));
// The hook ignores the Claude config dir; pin it to the ~/.claude default.
const { CLAUDE_CONFIG_DIR: _ignored, ...env } = process.env;
test.after(() => rmSync(scratch, { recursive: true, force: true }));

function transcript(...edits) {
  const file = path.join(scratch, `${randomUUID()}.jsonl`);
  const lines = edits.map(([name, file_path]) =>
    JSON.stringify({
      type: "assistant",
      message: { content: [{ type: "tool_use", name, input: { file_path } }] },
    }),
  );
  writeFileSync(file, `${lines.join("\n")}\n`);
  return file;
}

function stop(transcript_path, extra = {}) {
  const session_id = extra.session_id ?? randomUUID();
  const result = spawnSync("node", [hookPath], {
    input: JSON.stringify({
      session_id,
      transcript_path,
      stop_hook_active: false,
      ...extra,
    }),
    cwd: repoRoot,
    encoding: "utf8",
    env,
  });
  rmSync(path.join(os.tmpdir(), `safrs-handoff-reminded-${session_id}`), {
    force: true,
  });
  return result;
}

const repoFile = path.join(repoRoot, "tools", "example.mjs");

test("edits without a HANDOFF block the first stop, once per session", () => {
  const session_id = randomUUID();
  const file = transcript(["Edit", repoFile]);
  const first = spawnSync("node", [hookPath], {
    input: JSON.stringify({
      session_id,
      transcript_path: file,
      stop_hook_active: false,
    }),
    cwd: repoRoot,
    encoding: "utf8",
    env,
  });
  assert.equal(first.status, 0);
  const verdict = JSON.parse(first.stdout);
  assert.equal(verdict.decision, "block");
  assert.match(verdict.reason, /HANDOFF/);
  const second = stop(file, { session_id });
  assert.equal(second.status, 0);
  assert.equal(second.stdout, "");
});

test("a payload without session_id never blocks", () => {
  const result = stop(transcript(["Write", repoFile]), { session_id: "" });
  assert.equal(result.status, 0);
  assert.equal(result.stdout, "");
});

test("stop_hook_active never blocks again", () => {
  const result = stop(transcript(["Write", repoFile]), {
    stop_hook_active: true,
  });
  assert.equal(result.status, 0);
  assert.equal(result.stdout, "");
});

test("a touched HANDOFF.md (root or capsule) satisfies the reminder", () => {
  const capsuleHandoff = path.join(
    repoRoot,
    "projects",
    "x",
    "y",
    ".agents",
    "HANDOFF.md",
  );
  const result = stop(
    transcript(["Edit", repoFile], ["Write", capsuleHandoff]),
  );
  assert.equal(result.status, 0);
  assert.equal(result.stdout, "");
});

test("plan files and temp files alone do not count as edits", () => {
  const result = stop(
    transcript(
      ["Write", path.join(os.homedir(), ".claude", "plans", "p.md")],
      ["Write", path.join(os.tmpdir(), "scratch.txt")],
    ),
  );
  assert.equal(result.status, 0);
  assert.equal(result.stdout, "");
});

test("a missing transcript allows the stop", () => {
  const result = stop(path.join(scratch, "missing.jsonl"));
  assert.equal(result.status, 0);
  assert.equal(result.stdout, "");
});
