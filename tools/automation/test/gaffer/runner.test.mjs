import assert from "node:assert/strict";
import test from "node:test";
import {
  FailureClass,
  Route,
  WorkerClass,
} from "../../src/gaffer/constants.mjs";
import { runGaffer } from "../../src/gaffer/runner.mjs";

function basePorts(overrides = {}) {
  return {
    discoverProject: async () => ({ id: "demo", path: "projects/demo" }),
    authorize: async () => ({ allowed: true, highRisk: false }),
    rootPlan: async () => ({ route: Route.SOLO }),
    rootImplement: async () => ({ changedFiles: ["x"] }),
    executeWorker: async () => ({
      status: "complete",
      changedFiles: ["src/t1.ts"],
    }),
    verify: async () => ({ passed: true }),
    rootAccept: async () => ({ accepted: true }),
    listAvailableWorkers: async ({ requestedClass }) => [
      {
        id: `worker-${requestedClass}`,
        class: requestedClass,
        classes: [requestedClass],
        certified: true,
        expectedCost: 1,
      },
    ],
    ...overrides,
  };
}

test("SOLO path reaches READY", async () => {
  const result = await runGaffer({
    intent: "small change",
    ports: basePorts(),
  });
  assert.equal(result.status, "READY");
  assert.equal(result.route, Route.SOLO);
});

test("decomposed task executes economy and verifies", async () => {
  const calls = [];
  const ports = basePorts({
    rootPlan: async () => ({
      route: Route.DECOMPOSE,
      tasks: [
        {
          id: "T1",
          objective: "implement",
          acceptance: [],
          ownedPaths: ["src/t1.ts"],
          verification: ["test"],
          dependencies: [],
          architectureSettled: true,
        },
      ],
    }),
    executeWorker: async ({ workerClass }) => {
      calls.push(workerClass);
      return { status: "complete", changedFiles: ["src/t1.ts"] };
    },
  });
  const result = await runGaffer({ intent: "feature", ports });
  assert.equal(result.status, "READY");
  assert.deepEqual(calls, [WorkerClass.ECONOMY]);
});

test("capability mismatch escalates economy to strong", async () => {
  const calls = [];
  let verificationCount = 0;
  const ports = basePorts({
    rootPlan: async () => ({
      route: Route.DECOMPOSE,
      tasks: [
        {
          id: "T1",
          objective: "implement",
          acceptance: [],
          ownedPaths: ["src/t1.ts"],
          verification: ["test"],
          dependencies: [],
          architectureSettled: true,
        },
      ],
    }),
    executeWorker: async ({ workerClass }) => {
      calls.push(workerClass);
      return { status: "complete", changedFiles: ["src/t1.ts"] };
    },
    verify: async ({ mode }) => {
      if (mode !== "TASK") return { passed: true };
      verificationCount += 1;
      if (verificationCount === 1)
        return {
          passed: false,
          failureClass: FailureClass.CAPABILITY_MISMATCH,
        };
      return { passed: true };
    },
  });
  const result = await runGaffer({ intent: "feature", ports });
  assert.equal(result.status, "READY");
  assert.deepEqual(calls, [WorkerClass.ECONOMY, WorkerClass.STRONG]);
});

test("scope violation prevents readiness", async () => {
  const ports = basePorts({
    rootPlan: async () => ({
      route: Route.DECOMPOSE,
      tasks: [
        {
          id: "T1",
          objective: "implement",
          acceptance: [],
          ownedPaths: ["src/t1.ts"],
          verification: ["test"],
          dependencies: [],
          architectureSettled: true,
        },
      ],
    }),
    executeWorker: async () => ({
      status: "complete",
      changedFiles: ["package.json"],
    }),
  });
  const result = await runGaffer({
    intent: "feature",
    ports,
    policy: { maxAttemptsPerTask: 1 },
  });
  assert.equal(result.status, "BLOCKED");
});
