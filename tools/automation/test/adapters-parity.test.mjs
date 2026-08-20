import assert from "node:assert/strict";
import test from "node:test";

import * as claude from "../src/adapters/claude.mjs";
import * as codex from "../src/adapters/codex.mjs";
import * as cursor from "../src/adapters/cursor.mjs";
import * as droid from "../src/adapters/droid.mjs";
import { authorize } from "../src/guard.mjs";

const ROOT = process.cwd();
const SENSITIVE = {
  patterns: [".safrs/**"],
  verification_control_patterns: [".safrs/**"],
};

/**
 * One behavior, three native payload shapes. Every enforceable adapter must
 * reach the same canonical verdict + reason for the same behavior.
 */
const MATRIX = [
  {
    name: "force push",
    expect: { decision: "deny", reasonCode: "FORCE_PUSH" },
    codex: {
      tool_name: "Bash",
      tool_input: { command: "git push origin main --force" },
    },
    claude: {
      tool_name: "Bash",
      tool_input: { command: "git push origin main --force" },
    },
    cursor: { command: "git push origin main --force" },
  },
  {
    name: "force with lease allowed",
    expect: { decision: "allow", reasonCode: "OK" },
    codex: {
      tool_name: "Bash",
      tool_input: { command: "git push origin main --force-with-lease" },
    },
    claude: {
      tool_name: "Bash",
      tool_input: { command: "git push origin main --force-with-lease" },
    },
    cursor: { command: "git push origin main --force-with-lease" },
  },
  {
    name: "destructive database",
    expect: { decision: "ask", reasonCode: "DB_DESTRUCTIVE" },
    codex: { tool_name: "Bash", tool_input: { command: "dropdb production" } },
    claude: { tool_name: "Bash", tool_input: { command: "dropdb production" } },
    cursor: { command: "dropdb production" },
  },
  {
    name: "credential print",
    expect: { decision: "deny", reasonCode: "CREDENTIAL_ACCESS" },
    codex: { tool_name: "Bash", tool_input: { command: "cat .env" } },
    claude: { tool_name: "Bash", tool_input: { command: "cat .env" } },
    cursor: { command: "cat .env" },
  },
  {
    name: "credential write",
    expect: { decision: "deny", reasonCode: "CREDENTIAL_WRITE" },
    codex: {
      tool_name: "apply_patch",
      tool_input: {
        command: "*** Begin Patch\n*** Update File: .env\n*** End Patch",
      },
    },
    claude: { tool_name: "Write", tool_input: { file_path: ".env" } },
    cursor: null, // cursor write hook is read/shell only today
  },
  {
    name: "template write allowed",
    expect: { decision: "allow", reasonCode: "OK" },
    codex: {
      tool_name: "apply_patch",
      tool_input: {
        command:
          "*** Begin Patch\n*** Update File: .env.example\n*** End Patch",
      },
    },
    claude: { tool_name: "Write", tool_input: { file_path: ".env.example" } },
    cursor: null,
  },
  {
    name: "verification control context",
    expect: { decision: "allow", reasonCode: "VERIFICATION_R2" },
    codex: {
      tool_name: "apply_patch",
      tool_input: {
        command:
          "*** Begin Patch\n*** Update File: .safrs/policy.json\n*** End Patch",
      },
    },
    claude: {
      tool_name: "Edit",
      tool_input: { file_path: ".safrs/policy.json" },
    },
    cursor: null,
  },
];

const ADAPTERS = { codex, claude, cursor };

test("all enforceable adapters produce identical verdicts for the shared matrix", () => {
  for (const entry of MATRIX) {
    for (const [name, adapter] of Object.entries(ADAPTERS)) {
      const payload = entry[name];
      if (payload === null || payload === undefined) {
        continue;
      }
      const events = adapter.translate(payload, ROOT);
      assert.equal(events.length > 0, true, `${entry.name}/${name}: no event`);
      const verdict = authorize(events[0], { sensitivePaths: SENSITIVE });
      assert.equal(
        verdict.decision,
        entry.expect.decision,
        `${entry.name}/${name}: ${verdict.message}`,
      );
      assert.equal(
        verdict.reasonCode,
        entry.expect.reasonCode,
        `${entry.name}/${name}`,
      );
    }
  }
});

test("adapters without an ask channel render ask as a block", () => {
  const ask = { decision: "ask", reasonCode: "DB_DESTRUCTIVE", message: "x" };
  assert.equal(codex.render(ask).exitCode, 2);
  assert.equal(claude.render(ask).exitCode, 2);
  assert.equal(cursor.render(ask).permission, "ask");
});

test("droid adapter denies every mutation while disabled", () => {
  const events = droid.translate({ command: "echo hi" });
  const override = droid.authorizeOverride(events[0]);
  assert.equal(override.decision, "deny");
  assert.equal(override.reasonCode, "ADAPTER_DISABLED");
  assert.equal(droid.authorizeOverride({ type: "read", paths: ["a"] }), null);
});
