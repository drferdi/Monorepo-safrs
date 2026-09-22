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
  respond({
    permission: "deny",
    user_message: "Blocked: SAFRS hook payload could not be parsed.",
    agent_message: "Denying malformed hook payload.",
  });
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
  respond({
    permission: "deny",
    user_message: "Blocked: SAFRS could not classify this shell request.",
    agent_message: "Denying an unclassifiable hook payload.",
  });
}
respond(cursor.render(authorize(events[0], {})));
