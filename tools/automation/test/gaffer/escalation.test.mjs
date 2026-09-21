import assert from "node:assert/strict";
import test from "node:test";
import { FailureClass, WorkerClass } from "../../src/gaffer/constants.mjs";
import { escalationDecision } from "../../src/gaffer/escalation.mjs";

test("capability mismatch escalates economy immediately", () => {
  assert.deepEqual(
    escalationDecision({
      failureClass: FailureClass.CAPABILITY_MISMATCH,
      currentClass: WorkerClass.ECONOMY,
      attempts: 1,
    }),
    { action: "ESCALATE", workerClass: WorkerClass.STRONG },
  );
});

test("spec error allows one economy correction", () => {
  assert.deepEqual(
    escalationDecision({
      failureClass: FailureClass.SPEC_ERROR,
      currentClass: WorkerClass.ECONOMY,
      attempts: 1,
      maxAttempts: 2,
    }),
    { action: "RETRY_SAME", workerClass: WorkerClass.ECONOMY },
  );
});

test("scope violation blocks", () => {
  const result = escalationDecision({
    failureClass: FailureClass.SCOPE_VIOLATION,
    currentClass: WorkerClass.ECONOMY,
    attempts: 1,
  });
  assert.equal(result.action, "BLOCK");
});
