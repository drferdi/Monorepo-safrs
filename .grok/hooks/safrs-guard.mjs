#!/usr/bin/env node
/**
 * Grok PreToolUse guard — thin translator into the shared SAFRS guard
 * (tools/automation/src/guard.mjs). Zero policy here.
 *
 * Payload keys observed from Grok 1.0.60 on 2026-10-15: `run_terminal_command`
 * {command}, `read_file` {target_file}, `search_replace` {file_path},
 * `write` {file_path}. Grok has an "ask" channel: in a mode that prompts, ask
 * becomes Grok's permission prompt (also inside Devin Desktop over ACP); in
 * always-approve it would pass unasked, so it denies instead.
 *
 * Every reply is JSON with exit 0: Grok honors a JSON deny at any exit code,
 * and exit 0 survives every shell. Paths resolve from this file, so a wrong
 * cwd cannot make the import fail open.
 */
import { readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  "../..",
);

function reply(decision, reason) {
  process.stdout.write(
    JSON.stringify({ decision, reason: `SAFRS guard: ${reason}` }),
  );
  process.exit(0);
}

let authorize;
try {
  ({ authorize } = await import(
    new URL("../../tools/automation/src/guard.mjs", import.meta.url).href
  ));
} catch (error) {
  reply(
    "deny",
    `shared guard could not be loaded (${error.message}); blocked (fail closed).`,
  );
}

let payload;
try {
  payload = JSON.parse(readFileSync(0, "utf8").trim() || "null");
} catch (error) {
  reply(
    "deny",
    `hook payload could not be parsed (${error.message}); blocked (fail closed).`,
  );
}

const PROMPTING_MODES = new Set(["default", "auto", "plan"]);
const mode = String(payload?.permissionMode ?? payload?.permission_mode ?? "");
const tool = String(payload?.toolName ?? payload?.tool_name ?? "");
const input = payload?.toolInput ?? payload?.tool_input ?? {};
const base =
  input.cwd ?? payload?.cwd ?? payload?.workspaceRoot ?? process.cwd();

function relative(target) {
  return path
    .relative(root, path.resolve(base, String(target)))
    .split(path.sep)
    .join("/");
}

function translate() {
  if (tool === "run_terminal_command") {
    if (payload?.toolInputTruncated === true) {
      reply(
        "deny",
        "command was truncated in the hook payload and cannot be checked.",
      );
    }
    return [{ type: "command", command: String(input.command ?? "") }];
  }
  const target = input.file_path ?? input.target_file ?? input.path;
  if (!target) {
    return [];
  }
  if (tool === "read_file") {
    return [{ type: "read", paths: [relative(target)] }];
  }
  // Any other file tool the matcher selects writes, deletes, or edits.
  return [{ type: "write", paths: [relative(target)] }];
}

let sensitivePaths;
try {
  sensitivePaths = JSON.parse(
    readFileSync(path.join(root, ".safrs/sensitive-paths.json"), "utf8"),
  );
} catch {
  sensitivePaths = { patterns: [], verification_control_patterns: [] };
}

for (const event of translate()) {
  const result = authorize(event, { sensitivePaths });
  if (result.decision === "ask") {
    // Under always-approve (bypassPermissions) Grok auto-approves an ask
    // (observed 2026-10-15), so only modes that really prompt get one.
    if (PROMPTING_MODES.has(mode)) {
      reply("ask", result.message);
    }
    reply(
      "deny",
      `${result.message} (Grok is in ${mode || "an unknown"} mode, which would approve this without asking.)`,
    );
  }
  if (["deny", "stop"].includes(result.decision)) {
    reply("deny", result.message);
  }
  if (result.additionalContext) {
    process.stdout.write(
      JSON.stringify({
        hookSpecificOutput: {
          hookEventName: "PreToolUse",
          additionalContext: result.additionalContext,
        },
      }),
    );
    break;
  }
}
process.exit(0);
