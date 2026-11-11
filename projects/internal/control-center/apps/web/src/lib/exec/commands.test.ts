import assert from "node:assert/strict";
import { test } from "node:test";

import {
  RECOVERY_COMMAND,
  RUNNABLE_COMMANDS,
  RUNNABLE_IDS,
  runnableById,
} from "./commands.ts";

test("setiap perintah mutasi membawa frasa konfirmasi", () => {
  for (const command of RUNNABLE_COMMANDS) {
    if (command.mutation) {
      assert.ok(
        command.confirmPhrase && command.confirmPhrase.length > 0,
        `${command.id} mutasi tanpa confirmPhrase`,
      );
    }
  }
});

test("R3 tidak pernah ada dalam allowlist", () => {
  for (const command of RUNNABLE_COMMANDS) {
    assert.notEqual(command.risk, "R3", `${command.id} membawa R3`);
  }
});

test("id perintah unik", () => {
  const ids = RUNNABLE_COMMANDS.map((command) => command.id);
  assert.equal(new Set(ids).size, ids.length);
});

test("setiap recovery menunjuk perintah yang benar-benar ada", () => {
  for (const [check, id] of Object.entries(RECOVERY_COMMAND)) {
    assert.ok(
      RUNNABLE_IDS.has(id),
      `recovery ${check} menunjuk ${id} yang tidak ada`,
    );
  }
});

test("runnableById mengembalikan undefined untuk id asing", () => {
  assert.equal(runnableById("id-yang-tidak-ada"), undefined);
});
