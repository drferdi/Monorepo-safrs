import assert from "node:assert/strict";
import { test } from "node:test";

import type { LiveSnapshot } from "./control-center.ts";
import { deriveSituation } from "./situation.ts";

function baseLive(overrides: Partial<LiveSnapshot> = {}): LiveSnapshot {
  return {
    readAt: "2026-09-21T00:00:00.000Z",
    repoRoot: "D:/DEV/Monorepo",
    branch: "main",
    head: "abc1234",
    dirtyPaths: 0,
    gitAvailable: true,
    unmergedBranches: [],
    features: [],
    counts: {},
    problems: [],
    workspace: { members: [], groups: [], problems: [] },
    activity: {
      available: true,
      recent: [],
      lastMonth: 0,
      contributors: [],
      hotPaths: [],
    },
    health: {
      available: true,
      ok: true,
      exitCode: 0,
      checks: [],
      problem: null,
    },
    library: {
      available: false,
      sourcePdfs: null,
      canonicalDocuments: null,
      manifestEntries: 0,
      parsed: 0,
      failed: 0,
      readyToUse: null,
      readyUnknownReason: null,
      unrecorded: null,
      notYetParsed: null,
      failures: [],
      problems: ["Pustaka tidak tersedia dalam uji."],
    },
    plane: {
      available: true,
      status: "PASS",
      observedAt: null,
      tasks: [],
      activeTasks: [],
      ownershipOk: true,
      conflicts: [],
      governance: "PASS",
      failedChecks: [],
      leases: [],
      nextAction: null,
      warnings: [],
      problem: null,
    },
    gates: {
      available: true,
      gates: [
        {
          check_id: "capsule",
          verdict: "PASS",
          reason: "ok",
          checked: 1,
          errors: [],
        },
      ],
      problem: null,
    },
    roles: { available: true, roles: {} },
    knowledge: { available: true, documents: [] },
    ...overrides,
  };
}

test("semua pembaca bersih menghasilkan verdict Siap", () => {
  const view = deriveSituation(baseLive());
  assert.equal(view.level, "pass");
  assert.equal(view.verdictWord, "Siap");
  assert.equal(view.primaryActionId, null);
  assert.equal(view.counts.failed, 0);
});

test("gerbang gagal menghasilkan Belum siap dan aksi saf-gate-all", () => {
  const view = deriveSituation(
    baseLive({
      gates: {
        available: true,
        gates: [
          {
            check_id: "publish",
            verdict: "FAIL",
            reason: "branch protection missing",
            checked: 0,
            errors: [],
          },
        ],
        problem: null,
      },
    }),
  );
  assert.equal(view.level, "fail");
  assert.equal(view.verdictWord, "Belum siap");
  assert.equal(view.summary.gatesFail, 1);
  assert.equal(view.primaryActionId, "saf-gate-all");
  assert.ok(view.attention.some((row) => row.id === "gate-publish"));
});

test("kesiapan gagal dengan recovery memilih aksi perbaikan", () => {
  const view = deriveSituation(
    baseLive({
      health: {
        available: true,
        ok: false,
        exitCode: 1,
        checks: [
          {
            id: "postgres-ready",
            area: "DATABASE",
            ok: false,
            severity: "blocked",
            summary: "PostgreSQL lokal tidak menjawab",
            recovery: "Nyalakan basis data lokal",
            technical: "connection refused",
          },
        ],
        problem: null,
      },
    }),
  );
  assert.equal(view.level, "fail");
  assert.equal(view.primaryActionId, "db-start");
  assert.match(view.primaryActionWhy ?? "", /Nyalakan basis data lokal/);
});

test("fitur non-connected tanpa kegagalan keras = Perlu dilihat", () => {
  const view = deriveSituation(
    baseLive({
      features: [
        {
          id: "corpus",
          name: "Corpus engine",
          area: "knowledge",
          purpose: "Parse medical PDFs",
          userValue: "Ask the corpus",
          whenToUse: "When researching",
          entryPoint: null,
          risk: "R2",
          status: "requires-human-action",
          statusReason: "Kode ada di branch feat/corpus",
          evidence: [],
          branch: "feat/corpus",
        },
      ],
    }),
  );
  assert.equal(view.level, "attention");
  assert.equal(view.verdictWord, "Perlu dilihat");
  assert.equal(view.summary.featuresAttention, 1);
});

test("papan WARN bukan Rusak — hanya Perlu dilihat", () => {
  const view = deriveSituation(
    baseLive({
      plane: {
        available: true,
        status: "WARN",
        observedAt: null,
        tasks: [],
        activeTasks: [],
        ownershipOk: true,
        conflicts: [],
        governance: "PASS",
        failedChecks: [],
        leases: [],
        nextAction: "Periksa peringatan status",
        warnings: ["task X: allowed_tools id not in tool-inventory: pnpm"],
        problem: null,
      },
    }),
  );
  assert.equal(view.level, "attention");
  assert.equal(view.verdictWord, "Perlu dilihat");
  assert.match(view.verdictSentence, /peringatan di papan pekerjaan/i);
  assert.ok(
    view.attention.some(
      (row) => row.id === "plane-status" && row.statusClass === "warn",
    ),
  );
});

test("semua pembaca mati = Tidak terbaca", () => {
  const view = deriveSituation(
    baseLive({
      gates: { available: false, gates: [], problem: "gate down" },
      plane: {
        available: false,
        status: "",
        observedAt: null,
        tasks: [],
        activeTasks: [],
        ownershipOk: false,
        conflicts: [],
        governance: null,
        failedChecks: [],
        leases: [],
        nextAction: null,
        warnings: [],
        problem: "status down",
      },
      health: {
        available: false,
        ok: false,
        exitCode: 1,
        checks: [],
        problem: "doctor down",
      },
    }),
  );
  assert.equal(view.level, "unknown");
  assert.equal(view.verdictWord, "Tidak terbaca");
});
