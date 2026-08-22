import assert from "node:assert/strict";
import { test } from "node:test";

import { actionStatus } from "./action-status.ts";

test("aksi dalam allowlist berstatus available", () => {
  assert.equal(actionStatus("doctor"), "available");
  assert.equal(actionStatus("setup"), "available");
});

test("aksi di luar allowlist berstatus unavailable", () => {
  assert.equal(actionStatus("deploy-production"), "unavailable");
  assert.equal(actionStatus("db-studio"), "unavailable");
});
