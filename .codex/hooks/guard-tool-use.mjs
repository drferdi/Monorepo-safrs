#!/usr/bin/env node
/**
 * Codex PreToolUse hook — thin translator into the shared SAFRS guard.
 * All policy lives in tools/automation/src/guard.mjs; this file only parses
 * the native payload, resolves the repository root, and renders the verdict
 * back into the Codex protocol (exit 2 blocks; stdout may carry context).
 */
import { existsSync, readFileSync } from "node:fs";
import path from "node:path";
import { pathToFileURL } from "node:url";

function findRepositoryRoot(start) {
  let current = path.resolve(start);
  while (true) {
    if (existsSync(path.join(current, ".git"))) return current;
    const parent = path.dirname(current);
    if (parent === current) return path.resolve(start);
    current = parent;
  }
}

let payload;
try {
  const raw = readFileSync(0, "utf8").trim();
  payload = raw ? JSON.parse(raw) : {};
} catch (error) {
  console.error(
    `SAFRS guard: hook payload could not be parsed (${error.message}).`,
  );
  process.exit(0);
}

const root = findRepositoryRoot(String(payload.cwd ?? process.cwd()));

const [{ authorize }, codex, sensitivePaths] = await Promise.all([
  import(pathToFileURL(path.join(root, "tools/automation/src/guard.mjs")).href),
  import(
    pathToFileURL(path.join(root, "tools/automation/src/adapters/codex.mjs"))
      .href
  ),
  Promise.resolve().then(() => {
    try {
      return JSON.parse(
        readFileSync(path.join(root, ".safrs/sensitive-paths.json"), "utf8"),
      );
    } catch {
      return { patterns: [], verification_control_patterns: [] };
    }
  }),
]);

for (const event of codex.translate(payload, root)) {
  const rendered = codex.render(authorize(event, { sensitivePaths }));
  if (rendered.stderr) {
    console.error(rendered.stderr);
  }
  if (rendered.stdout) {
    process.stdout.write(rendered.stdout);
  }
  if (rendered.exitCode !== 0) {
    process.exit(rendered.exitCode);
  }
}
process.exit(0);
