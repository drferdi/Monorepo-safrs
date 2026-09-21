import assert from "node:assert/strict";
import { test } from "node:test";

import type { LiveFeature } from "./control-center.ts";
import {
  featureEvidenceMetric,
  featureStatusLabel,
  groupFeaturesForBoard,
  sortFeaturesForBoard,
  splitFeatureBoardColumns,
} from "./feature-board.ts";

function feature(
  partial: Pick<LiveFeature, "id" | "name" | "status" | "area"> & {
    evidence?: LiveFeature["evidence"];
  },
): LiveFeature {
  return {
    purpose: "Ini adalah feature di dalam Monorepo.",
    userValue: "",
    whenToUse: "",
    entryPoint: null,
    risk: "R1",
    statusReason: "",
    evidence: partial.evidence ?? [
      { path: "a", proves: "x", present: true },
      { path: "b", proves: "y", present: false },
    ],
    ...partial,
  };
}

test("status label memakai bahasa biasa", () => {
  assert.equal(featureStatusLabel("connected"), "Jalan");
  assert.equal(featureStatusLabel("error"), "Rusak");
  assert.equal(
    featureStatusLabel("requires-human-action"),
    "Perlu keputusan Anda",
  );
});

test("metrik bukti menghitung present", () => {
  const metric = featureEvidenceMetric(
    feature({
      id: "x",
      name: "X",
      area: "tooling",
      status: "partially-connected",
    }),
  );
  assert.equal(metric.found, 1);
  assert.equal(metric.total, 2);
  assert.equal(metric.label, "1/2 bukti");
});

test("urutkan rusak dulu", () => {
  const sorted = sortFeaturesForBoard([
    feature({ id: "a", name: "A", area: "apps", status: "connected" }),
    feature({ id: "b", name: "B", area: "apps", status: "error" }),
    feature({
      id: "c",
      name: "C",
      area: "apps",
      status: "requires-human-action",
    }),
  ]);
  assert.deepEqual(
    sorted.map((f) => f.id),
    ["b", "c", "a"],
  );
});

test("proyek dipisah dari alat dan paket", () => {
  const buckets = groupFeaturesForBoard([
    feature({
      id: "gaffer-engine",
      name: "Gaffer Engine",
      area: "automation",
      status: "connected",
    }),
    feature({
      id: "capsule-sentrabot",
      name: "SentraBot",
      area: "apps",
      status: "connected",
    }),
    feature({
      id: "doctor",
      name: "Doctor",
      area: "tooling",
      status: "connected",
    }),
    feature({
      id: "package-env",
      name: "Env",
      area: "packages",
      status: "connected",
    }),
  ]);
  assert.deepEqual(
    buckets.map((b) => b.group.id),
    ["projects", "rules", "tools", "packages"],
  );
  assert.equal(buckets[0]?.features[0]?.name, "SentraBot");
  assert.equal(buckets[1]?.features[0]?.name, "Gaffer Engine");
  assert.equal(buckets[2]?.features[0]?.name, "Doctor");
  assert.equal(buckets[3]?.features[0]?.name, "Env");
});

test("kolom kiri proyek+aturan+alat; kanan paket+", () => {
  const { left, right } = splitFeatureBoardColumns([
    feature({
      id: "capsule-sentrabot",
      name: "SentraBot",
      area: "apps",
      status: "connected",
    }),
    feature({
      id: "doctor",
      name: "Doctor",
      area: "tooling",
      status: "connected",
    }),
    feature({
      id: "package-env",
      name: "Env",
      area: "packages",
      status: "connected",
    }),
    feature({
      id: "wiki",
      name: "Wiki",
      area: "knowledge",
      status: "connected",
    }),
  ]);
  assert.deepEqual(
    left.map((b) => b.group.id),
    ["projects", "tools"],
  );
  assert.deepEqual(
    right.map((b) => b.group.id),
    ["packages", "knowledge"],
  );
});
