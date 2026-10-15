#!/usr/bin/env node
/**
 * Cursor preToolUse (matcher "Task") — consult Jev before a subagent spawn.
 *
 * Thin translator around tools/typesafe-jev/mcp/jev_hook.py, the hook Claude
 * Code already runs. It consults Jev at most once per conversation.
 *
 * Cursor's preToolUse output has no additional_context, so Jev's decision can
 * reach the agent only through a deny's agent_message. The hook denies only
 * when Jev is in active mode and answers ask_human or stop_retry. Every other
 * answer, and any failure, allows the spawn. A retry is not blocked again,
 * because jev_hook.py stays silent once the conversation has consulted Jev.
 */
import { spawnSync } from "node:child_process";
import { existsSync, readFileSync } from "node:fs";
import path from "node:path";

const DENY_ACTIONS = new Set(["ask_human", "stop_retry"]);

function respond(body) {
  process.stdout.write(JSON.stringify(body));
  process.exit(0);
}

const allow = () => respond({ permission: "allow" });

let payload = null;
try {
  payload = JSON.parse(readFileSync(0, "utf8"));
} catch {
  allow();
}
if (payload?.tool_name !== "Task") {
  allow();
}

// The playbook venv lives in the main checkout, also for linked worktrees.
const commonDir = spawnSync(
  "git",
  ["rev-parse", "--path-format=absolute", "--git-common-dir"],
  { encoding: "utf8" },
).stdout?.trim();
if (!commonDir) {
  allow();
}
const jev = path.join(path.dirname(commonDir), "tools/typesafe-jev");
const playbook = path.join(jev, "playbook");
const python = path.join(
  playbook,
  process.platform === "win32"
    ? ".venv/Scripts/python.exe"
    : ".venv/bin/python",
);
const hook = path.join(jev, "mcp/jev_hook.py");
if (!existsSync(python) || !existsSync(hook)) {
  allow();
}

const result = spawnSync(
  python,
  [hook, "--playbook", playbook, "--agent", "cursor"],
  {
    input: JSON.stringify({
      tool_name: "Task",
      tool_input: payload.tool_input ?? {},
      session_id: payload.conversation_id ?? "",
    }),
    encoding: "utf8",
  },
);
if (result.stderr) {
  process.stderr.write(result.stderr);
}

let context = "";
try {
  context = JSON.parse(result.stdout).hookSpecificOutput.additionalContext;
} catch {
  allow();
}
const action = /action=(\w+)/.exec(context)?.[1];
const mode = /mode=(\w+)/.exec(context)?.[1];
if (mode !== "active" || !DENY_ACTIONS.has(action)) {
  allow();
}
respond({
  permission: "deny",
  user_message: `Jev: ${action}. Subagent spawn paused once; retry after resolving it.`,
  agent_message: `${context} The spawn was denied once so this decision reaches you; resolve it, then retry.`,
});
