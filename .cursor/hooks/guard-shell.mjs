#!/usr/bin/env node
/**
 * Cursor beforeShellExecution — thin translator into the shared SAFRS guard.
 * Cursor keeps its native tri-state: canonical "ask" verdicts surface as
 * permission "ask"; deny/stop surface as "deny".
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
  // hooks.json declares failClosed: an unreadable payload must not run unguarded.
  const message = "SAFRS guard: hook payload could not be parsed; command blocked.";
  respond({ permission: "deny", user_message: message, agent_message: message });
}

const root = process.cwd();
const [{ authorize }, cursor] = await Promise.all([
  import(pathToFileURL(path.join(root, "tools/automation/src/guard.mjs")).href),
  import(
    pathToFileURL(path.join(root, "tools/automation/src/adapters/cursor.mjs"))
      .href
  ),
]);

const events = cursor.translate(payload);
if (events.length === 0) {
  respond({ permission: "allow", user_message: "", agent_message: "" });
}
respond(cursor.render(authorize(events[0], {})));
