import assert from "node:assert/strict";
import { test } from "node:test";

import { runCommand } from "./run.ts";

// Both cases below are refused BEFORE any process spawns; the only side effect
// is one audit line in database/logs/control-center.log (gitignored).

test("id di luar allowlist ditolak sebelum eksekusi", async () => {
  const outcome = await runCommand("rm-rf-yang-tidak-diizinkan");
  assert.equal(outcome.refused, "not-in-allowlist");
  assert.equal(outcome.ok, false);
  assert.equal(outcome.exitCode, null);
  assert.equal(outcome.stdout, "");
});

test("perintah mutasi dengan frasa salah ditolak", async () => {
  const outcome = await runCommand("setup", "frasa yang salah");
  assert.equal(outcome.refused, "confirmation-mismatch");
  assert.equal(outcome.ok, false);
});

test("perintah mutasi tanpa frasa sama sekali ditolak", async () => {
  const outcome = await runCommand("db-start");
  assert.equal(outcome.refused, "confirmation-mismatch");
});
