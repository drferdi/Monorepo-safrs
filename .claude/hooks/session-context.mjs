#!/usr/bin/env node

// Claude Code SessionStart context (startup / resume / compact).
//
// Prints the branch, `git status --short`, and the head of the root
// `.agents/HANDOFF.md` so the mandatory "read HANDOFF first" step survives a
// fresh session and, above all, a context compaction. Claude adds SessionStart
// stdout to the model context.
//
// Never blocks: any failure prints less (or nothing) and exits 0.

import { spawnSync } from "node:child_process";
import { readFileSync } from "node:fs";
import path from "node:path";

const HANDOFF = ".agents/HANDOFF.md";
const HANDOFF_LINES = 40;
const STATUS_LINES = 30;

function readPayload() {
  try {
    const raw = readFileSync(0, "utf8").trim();
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

function git(cwd, args) {
  const result = spawnSync("git", args, { cwd, encoding: "utf8" });
  return result.status === 0 ? result.stdout.trimEnd() : null;
}

function capped(lines, limit, more) {
  return lines.length > limit
    ? [...lines.slice(0, limit), `… ${lines.length - limit} more ${more}`]
    : lines;
}

const payload = readPayload();
const cwd = payload?.cwd ?? process.cwd();
const root = git(cwd, ["rev-parse", "--show-toplevel"]);

if (!root) {
  process.exit(0);
}

const out = [`SAFRS session context (${payload?.source ?? "startup"})`];
out.push(`Branch: ${git(root, ["branch", "--show-current"]) || "(detached)"}`);

const status = git(root, ["status", "--short"]);
out.push("", "git status --short:");
out.push(
  ...(status
    ? capped(status.split("\n"), STATUS_LINES, "changed paths")
    : ["(clean)"]),
);

try {
  const lines = readFileSync(path.join(root, HANDOFF), "utf8").split(/\r?\n/u);
  out.push("", `${HANDOFF} (first ${HANDOFF_LINES} lines):`);
  out.push(...lines.slice(0, HANDOFF_LINES));
  const later = lines
    .slice(HANDOFF_LINES)
    .filter((line) => line.startsWith("## "));
  if (later.length > 0) {
    out.push(
      "",
      `Further sections: ${later.map((line) => line.slice(3)).join(" · ")}`,
    );
  }
  out.push(
    `Read the full ${HANDOFF} (and the capsule HANDOFF for capsule work) before acting.`,
  );
} catch {
  out.push("", `${HANDOFF} not found.`);
}

process.stdout.write(`${out.join("\n")}\n`);
process.exit(0);
