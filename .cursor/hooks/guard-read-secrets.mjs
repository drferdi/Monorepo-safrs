#!/usr/bin/env node
/**
 * Cursor beforeReadFile — thin translator into the shared SAFRS guard.
 * Denies credential-shaped reads; complements `.cursorignore`.
 */
import { readFileSync } from "node:fs";
import path from "node:path";
import { pathToFileURL } from "node:url";

function respond(body) {
  process.stdout.write(JSON.stringify(body));
  process.exit(0);
}

let payload = null;
try {
  const raw = readFileSync(0, "utf8").trim();
  payload = raw ? JSON.parse(raw) : null;
} catch {
  respond({ permission: "allow" });
}

const target = payload?.file_path ?? null;
if (!target) {
  respond({ permission: "allow" });
}

const root = process.cwd();
const [{ authorize }, cursor] = await Promise.all([
  import(pathToFileURL(path.join(root, "tools/automation/src/guard.mjs")).href),
  import(
    pathToFileURL(path.join(root, "tools/automation/src/adapters/cursor.mjs"))
      .href
  ),
]);

const relative = path
  .relative(root, path.resolve(root, String(target)))
  .split(path.sep)
  .join("/");
const events = cursor.translate({ file_path: relative });
const verdict = authorize(events[0], {});
if (verdict.decision === "allow") {
  respond({ permission: "allow" });
}
respond({
  permission: "deny",
  user_message: `Blocked read of credential-shaped path "${relative}". Use .env.example and ask the human for secrets.`,
});
