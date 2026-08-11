#!/usr/bin/env node
/**
 * Cursor beforeShellExecution — ask/deny for destructive or secret-adjacent commands.
 * Adapter only; canonical policy remains AGENTS.md / SECURITY.md / packages/database.
 */
import { readFileSync } from "node:fs";

function readPayload() {
  try {
    const raw = readFileSync(0, "utf8").trim();
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

function respond(permission, userMessage, agentMessage) {
  process.stdout.write(
    JSON.stringify({
      permission,
      user_message: userMessage,
      agent_message: agentMessage,
    }),
  );
  process.exit(0);
}

const payload = readPayload();
const command = String(payload?.command ?? "");

if (!command.trim()) {
  respond("allow", "", "");
}

const denyPatterns = [
  {
    re: /\bgit\s+push\s+[^\n]*--force\b/i,
    user: "Force-push blocked by project hook.",
    agent:
      "Do not force-push. Use a normal push or ask Chief for an explicit override.",
  },
  {
    re: /\bgit\s+push\s+[^\n]*-f\b/i,
    user: "Force-push (-f) blocked by project hook.",
    agent:
      "Do not force-push. Use a normal push or ask Chief for an explicit override.",
  },
];

for (const rule of denyPatterns) {
  if (rule.re.test(command)) {
    respond("deny", rule.user, rule.agent);
  }
}

const askPatterns = [
  {
    re: /\b(?:pnpm\s+)?db:reset\b/i,
    user: "Confirm destructive local database reset (db:reset).",
    agent:
      "db:reset is local-only and requires explicit reset authorization. Wait for Chief confirmation; never bypass the reset guard.",
  },
  {
    re: /\bprisma\s+migrate\s+reset\b/i,
    user: "Confirm prisma migrate reset.",
    agent:
      "Prisma migrate reset is destructive. Prefer pnpm db:migrate / documented reset path with Chief authorization.",
  },
  {
    re: /\b(?:DROP\s+DATABASE|dropdb)\b/i,
    user: "Confirm database drop command.",
    agent:
      "Destructive SQL/admin command detected. Obtain explicit human authorization.",
  },
  {
    re: /(?:^|[\s"'=])\.env(?:\.[A-Za-z0-9_-]+)?(?:[\s"'=]|$)/i,
    user: "Command references .env — review before continuing.",
    agent:
      "Avoid reading, printing, or writing .env files. Use .env.example and ask the human to apply secrets.",
  },
  {
    re: /\b(?:cat|type|Get-Content|less|more)\s+[^\n]*\.env\b/i,
    user: "Command may print env/secret files.",
    agent: "Do not print credential files. Follow AGENTS.md rule 4.",
  },
];

for (const rule of askPatterns) {
  if (rule.re.test(command)) {
    respond("ask", rule.user, rule.agent);
  }
}

respond("allow", "", "");
