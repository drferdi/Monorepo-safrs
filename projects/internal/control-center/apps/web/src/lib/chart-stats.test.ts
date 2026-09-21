import assert from "node:assert/strict";
import { test } from "node:test";
import { featureWorkSplit, projectStatusBuckets } from "./chart-stats.ts";
import type { LiveFeature } from "./control-center.ts";

function feature(
  partial: Pick<LiveFeature, "id" | "name" | "area" | "status">,
): LiveFeature {
  return {
    purpose: "",
    userValue: "",
    whenToUse: "",
    entryPoint: null,
    risk: "R1",
    statusReason: "",
    evidence: [],
    ...partial,
  };
}

test("feature work split memisahkan connected vs lainnya", () => {
  const split = featureWorkSplit([
    feature({
      id: "a",
      name: "A",
      area: "apps",
      status: "connected",
    }),
    feature({
      id: "b",
      name: "B",
      area: "tooling",
      status: "error",
    }),
    feature({
      id: "c",
      name: "C",
      area: "apps",
      status: "partially-connected",
    }),
  ]);
  assert.equal(split.working, 1);
  assert.equal(split.notWorking, 2);
  assert.equal(split.total, 3);
});

test("project buckets hanya area apps dan berlabel Indonesia", () => {
  const buckets = projectStatusBuckets([
    feature({
      id: "golden-path",
      name: "Golden Path",
      area: "apps",
      status: "connected",
    }),
    feature({
      id: "control-center",
      name: "Control Center",
      area: "apps",
      status: "partially-connected",
    }),
    feature({
      id: "doctor",
      name: "Doctor",
      area: "tooling",
      status: "connected",
    }),
  ]);
  assert.equal(buckets.length, 2);
  assert.equal(buckets[0]?.label, "Jalan");
  assert.equal(buckets[0]?.count, 1);
  assert.equal(buckets[1]?.label, "Baru sebagian");
  assert.equal(buckets[1]?.count, 1);
});
