#!/usr/bin/env node
/**
 * Cline hook bridge — pinned Node entry replacing shell-only enforcement.
 * Translates the Cline event through the shared SAFRS guard and preserves
 * the Cline-specific supplements (knowledge-base freeze, lockfile freeze).
 * Prints "{}" to allow or a {"cancel": true, ...} payload to block.
 */
import { readFileSync } from "node:fs";
import path from "node:path";
import { pathToFileURL } from "node:url";

function allow() {
  process.stdout.write("{}");
  process.exit(0);
}

function cancel(message) {
  process.stdout.write(
    JSON.stringify({ cancel: true, errorMessage: `SAFRS: ${message}` }),
  );
  process.exit(0);
}

let payload = null;
try {
  const raw = readFileSync(0, "utf8").trim();
  payload = raw ? JSON.parse(raw) : null;
} catch {
  allow();
}

const call = payload?.tool_call ?? {};
const tool = String(call.name ?? "");
const input = call.input ?? {};
const target = String(
  input.file_path ??
    input.filePath ??
    input.path ??
    input.target_path ??
    input.rename ??
    "",
).replaceAll("\\", "/");

// Cline-specific supplements retained from the shell hook.
if (/(^|\/)\.agents\/knowledge\//u.test(target)) {
  cancel(".agents/knowledge/ edits require Chief approval.");
}
const base = target.split("/").pop() ?? "";
if (
  ["pnpm-lock.yaml", "package-lock.json", "yarn.lock", "bun.lockb"].includes(
    base,
  ) &&
  tool !== "read_files"
) {
  cancel("lockfiles must be regenerated with pnpm, not hand-edited.");
}

const root = process.cwd();
const [{ authorize }, cline] = await Promise.all([
  import(pathToFileURL(path.join(root, "tools/automation/src/guard.mjs")).href),
  import(
    pathToFileURL(path.join(root, "tools/automation/src/adapters/cline.mjs"))
      .href
  ),
]);

const MUTATE = new Set([
  "write_to_file",
  "edit_file",
  "multi_edit",
  "apply_diff",
  "insert_content",
  "insert_content_multiple",
  "renaming",
  "delete_file",
]);

const events = [];
if (tool === "run_commands" || tool === "execute_command") {
  events.push({ type: "command", command: String(input.command ?? "") });
} else if (tool === "read_files") {
  const files = (input.files ?? []).map((file) =>
    String(file).replaceAll("\\", "/"),
  );
  if (files.length > 0) {
    events.push({ type: "read", paths: files });
  }
} else if (MUTATE.has(tool) && target) {
  events.push({ type: "write", paths: [target] });
} else {
  events.push(...cline.translate(payload));
}

for (const event of events) {
  const verdict = authorize(event, {});
  if (verdict.decision !== "allow") {
    cancel(verdict.message);
  }
}
allow();
