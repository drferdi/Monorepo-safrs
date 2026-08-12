#!/usr/bin/env node
/**
 * Claude Code PreToolUse guard — thin translator into the shared SAFRS
 * guard (tools/automation/src/guard.mjs). Exit 2 blocks; stderr carries the
 * reason or an R2 notice. Writes outside the repository are now denied
 * (previously warn-only) to match the canonical verdict set.
 */
import { readFileSync } from "node:fs";
import path from "node:path";
import { pathToFileURL } from "node:url";

let payload = null;
try {
  const raw = readFileSync(0, "utf8").trim();
  payload = raw ? JSON.parse(raw) : null;
} catch (error) {
  console.error(
    `SAFRS guard: hook payload could not be parsed (${error.message}); path classification was skipped.`,
  );
  process.exit(0);
}

const root = process.cwd();
const [{ authorize }, claude] = await Promise.all([
  import(pathToFileURL(path.join(root, "tools/automation/src/guard.mjs")).href),
  import(
    pathToFileURL(path.join(root, "tools/automation/src/adapters/claude.mjs"))
      .href
  ),
]);

let sensitivePaths;
try {
  sensitivePaths = JSON.parse(
    readFileSync(path.join(root, ".safrs/sensitive-paths.json"), "utf8"),
  );
} catch {
  sensitivePaths = { patterns: [], verification_control_patterns: [] };
}

for (const event of claude.translate(payload, root)) {
  const rendered = claude.render(authorize(event, { sensitivePaths }));
  if (rendered.stderr) {
    console.error(rendered.stderr);
  }
  if (rendered.exitCode !== 0) {
    process.exit(rendered.exitCode);
  }
}
process.exit(0);
