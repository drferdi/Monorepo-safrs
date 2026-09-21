import assert from "node:assert/strict";
import test from "node:test";
import { TaskState } from "../../src/gaffer/constants.mjs";
import {
  createTaskGraph,
  readyTasks,
  refreshTaskReadiness,
} from "../../src/gaffer/scheduler.mjs";

const task = (id, dependencies = []) => ({
  id,
  objective: id,
  acceptance: [],
  ownedPaths: [`src/${id}.ts`],
  verification: ["test"],
  dependencies,
});

test("root dependency becomes ready first", () => {
  let graph = createTaskGraph([task("T1"), task("T2", ["T1"])]);
  graph = refreshTaskReadiness(graph);
  assert.deepEqual(
    readyTasks(graph).map((x) => x.id),
    ["T1"],
  );
});

test("verified dependency unlocks child", () => {
  let graph = createTaskGraph([task("T1"), task("T2", ["T1"])]);
  graph.get("T1").state = TaskState.VERIFIED;
  graph = refreshTaskReadiness(graph);
  assert.equal(graph.get("T2").state, TaskState.READY);
});

test("failed dependency blocks child", () => {
  let graph = createTaskGraph([task("T1"), task("T2", ["T1"])]);
  graph.get("T1").state = TaskState.FAILED;
  graph = refreshTaskReadiness(graph);
  assert.equal(graph.get("T2").state, TaskState.BLOCKED);
});

test("cycles are rejected", () => {
  assert.throws(
    () => createTaskGraph([task("T1", ["T2"]), task("T2", ["T1"])]),
    /cycle/i,
  );
});
