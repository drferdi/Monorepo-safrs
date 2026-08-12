import assert from "node:assert/strict";
import { test } from "node:test";
import { dependentsOf, detectCycle } from "../src/graph.mjs";

test("detectCycle returns null for a DAG", () => {
  const edges = new Map([
    ["a", new Set(["b"])],
    ["b", new Set(["c"])],
    ["c", new Set()],
  ]);
  assert.equal(detectCycle(edges), null);
});

test("detectCycle finds a two-node cycle", () => {
  const edges = new Map([
    ["a", new Set(["b"])],
    ["b", new Set(["a"])],
  ]);
  const cycle = detectCycle(edges);
  assert.ok(cycle);
  assert.equal(cycle.length, 3);
  assert.equal(cycle[0], cycle[cycle.length - 1]);
});

test("detectCycle finds a three-node cycle", () => {
  const edges = new Map([
    ["a", new Set(["b"])],
    ["b", new Set(["c"])],
    ["c", new Set(["a"])],
  ]);
  const cycle = detectCycle(edges);
  assert.ok(cycle);
  assert.equal(cycle[0], cycle[cycle.length - 1]);
});

test("detectCycle ignores self-loops", () => {
  const edges = new Map([["a", new Set(["a"])]]);
  const cycle = detectCycle(edges);
  assert.ok(cycle);
  assert.deepEqual(cycle, ["a", "a"]);
});

test("dependentsOf returns reverse edges sorted", () => {
  const edges = new Map([
    ["a", new Set(["x"])],
    ["b", new Set(["x"])],
    ["c", new Set()],
  ]);
  assert.deepEqual(dependentsOf(edges, "x"), ["a", "b"]);
  assert.deepEqual(dependentsOf(edges, "missing"), []);
});
