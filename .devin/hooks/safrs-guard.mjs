#!/usr/bin/env node
/**
 * Devin CLI PreToolUse guard — thin translator into the shared SAFRS guard
 * (tools/automation/src/guard.mjs). Zero policy here.
 *
 * Devin tool names differ from Claude's (`exec`, `edit`, `write`,
 * `apply_patch`, `notebook_edit`, `read`), so the imported `.claude/` guard
 * cannot be relied on. Devin hooks have no "ask" channel: ask renders as a
 * block (fail closed), the same as Codex; Gaffer runs the merge.
 *
 * Paths resolve from this file, not from the hook's cwd: a wrong cwd would
 * make the import fail with exit 1, which Devin treats as non-blocking.
 *
 * Blocks use Devin's JSON decision with exit 0, not exit 2: `powershell
 * -Command` turns a native exit 2 into 1 (observed 2026-10-15), and Devin
 * treats 1 as a non-blocking error. Exit 0 survives every shell.
 */
import { readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  "../..",
);
function block(message) {
  const reason = `SAFRS guard: ${message}`;
  process.stderr.write(`${reason}\n`);
  process.stdout.write(JSON.stringify({ decision: "block", reason }));
  process.exit(0);
}

let authorize;
try {
  ({ authorize } = await import(
    new URL("../../tools/automation/src/guard.mjs", import.meta.url).href
  ));
} catch (error) {
  block(
    `shared guard could not be loaded (${error.message}); blocked (fail closed).`,
  );
}

let payload;
try {
  payload = JSON.parse(readFileSync(0, "utf8").trim() || "null");
} catch (error) {
  block(
    `hook payload could not be parsed (${error.message}); blocked (fail closed).`,
  );
}

const tool = String(payload?.tool_name ?? "");
const input = payload?.tool_input ?? {};
const base = input.workdir ?? process.env.DEVIN_PROJECT_DIR ?? process.cwd();

function relative(target) {
  return path
    .relative(root, path.resolve(base, String(target)))
    .split(path.sep)
    .join("/");
}

/** apply_patch carries file targets inside the patch text, whatever the key. */
function patchPaths() {
  const text = Object.values(input)
    .filter((value) => typeof value === "string")
    .join("\n");
  return [...text.matchAll(/^\*\*\* (?:Add|Update|Delete) File: (.+)$/gmu)].map(
    (match) => match[1].trim(),
  );
}

function translate() {
  if (tool === "exec") {
    return [{ type: "command", command: String(input.command ?? "") }];
  }
  if (tool === "apply_patch") {
    const targets = patchPaths();
    if (targets.length === 0) {
      block("apply_patch payload has no file targets; blocked (fail closed).");
    }
    return [{ type: "write", paths: targets.map(relative) }];
  }
  const target = input.file_path ?? input.notebook_path ?? input.path;
  if (!target) {
    return [];
  }
  if (tool === "read") {
    return [{ type: "read", paths: [relative(target)] }];
  }
  if (["edit", "write", "notebook_edit"].includes(tool)) {
    return [{ type: "write", paths: [relative(target)] }];
  }
  return [];
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
  if (["ask", "deny", "stop"].includes(result.decision)) {
    block(result.message);
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
