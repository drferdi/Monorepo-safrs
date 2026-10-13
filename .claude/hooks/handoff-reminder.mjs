#!/usr/bin/env node

// Claude Code Stop hook: one HANDOFF reminder per session.
//
// When this session's transcript shows Edit / Write / NotebookEdit calls but
// none of them touched a `.agents/HANDOFF.md`, the first stop is blocked once
// with a reminder. `stop_hook_active` and a per-session marker in the temp
// directory make sure it never fires twice, so Claude cannot loop.
//
// Never fails closed: any error allows the stop (exit 0, no output).

import { existsSync, readFileSync, writeFileSync } from "node:fs";
import os from "node:os";
import path from "node:path";

const EDIT_TOOLS = new Set(["Edit", "Write", "NotebookEdit"]);

function readPayload() {
  try {
    const raw = readFileSync(0, "utf8").trim();
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

/** Repository-like targets this session edited, from the JSONL transcript. */
function editedFiles(transcriptPath) {
  const ignored = [
    process.env.CLAUDE_CONFIG_DIR ?? path.join(os.homedir(), ".claude"),
    os.tmpdir(),
  ].map((directory) => path.resolve(directory).toLowerCase());
  const files = new Set();
  for (const line of readFileSync(transcriptPath, "utf8").split("\n")) {
    if (!line.includes('"tool_use"')) {
      continue;
    }
    let entry;
    try {
      entry = JSON.parse(line);
    } catch {
      continue;
    }
    for (const block of entry?.message?.content ?? []) {
      if (block?.type !== "tool_use" || !EDIT_TOOLS.has(block.name)) {
        continue;
      }
      const target = block.input?.file_path ?? block.input?.notebook_path;
      if (!target) {
        continue;
      }
      const absolute = path.resolve(String(target)).toLowerCase();
      if (
        !ignored.some((directory) => absolute.startsWith(directory + path.sep))
      ) {
        files.add(String(target).replaceAll("\\", "/"));
      }
    }
  }
  return [...files];
}

try {
  const payload = readPayload();
  if (!payload || payload.stop_hook_active || !payload.transcript_path) {
    process.exit(0);
  }
  const marker = path.join(
    os.tmpdir(),
    `safrs-handoff-reminded-${String(payload.session_id ?? "unknown").replaceAll(/[^\w-]/gu, "")}`,
  );
  if (existsSync(marker)) {
    process.exit(0);
  }
  const files = editedFiles(payload.transcript_path);
  if (
    files.length === 0 ||
    files.some((file) => file.endsWith(".agents/HANDOFF.md"))
  ) {
    process.exit(0);
  }
  writeFileSync(marker, "");
  process.stdout.write(
    JSON.stringify({
      decision: "block",
      reason:
        `SAFRS: this session edited ${files.length} file(s) but no HANDOFF.md. ` +
        "Before finishing, overwrite the HANDOFF of every scope you touched " +
        "(projects/<domain>/<capsule>/.agents/HANDOFF.md for capsule work, root " +
        ".agents/HANDOFF.md for control-plane work), or state in one line why " +
        "no handoff is needed yet. This reminder fires once per session.",
    }),
  );
} catch {
  // Allow the stop.
}
process.exit(0);
