import assert from "node:assert/strict";
import { test } from "node:test";

import type { LiveSnapshot } from "./control-center.ts";
import { deriveSectionLead } from "./section-lead.ts";

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
    workspace: {
      members: [
        {
          name: "@safrs/api",
          path: "packages/api",
          group: "packages",
          version: "0.0.0",
          dependsOn: [],
          usedBy: [],
          blastRadius: [],
        },
      ],
      groups: [{ group: "packages", count: 1 }],
      problems: [],
    },
    activity: {
      available: true,
      recent: [
        {
          hash: "abc",
          subject: "test",
          author: "Chief",
          relative: "1 day ago",
          isMerge: false,
        },
      ],
      lastMonth: 1,
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
      problems: ["n/a"],
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
    knowledge: {
      available: true,
      documents: [
        {
          id: "agents",
          path: "AGENTS.md",
          type: "md",
          status: "active",
          normativity: "normative",
          scope: "repo",
        },
      ],
    },
    ...overrides,
  };
}

test("setiap section punya nama, tujuan, dan status beralasan", () => {
  const live = baseLive();
  for (const id of [
    "home",
    "projects",
    "agents",
    "tasks",
    "health",
    "activity",
    "governance",
    "knowledge",
  ] as const) {
    const lead = deriveSectionLead(id, live);
    assert.ok(lead.name.length > 0, id);
    assert.ok(lead.purpose.length > 0, id);
    assert.ok(lead.statusReason.length > 0, id);
    assert.ok(
      ["Baik", "Rusak / belum siap", "Perlu dilihat"].includes(
        lead.statusLabel,
      ),
    );
  }
});

test("health gagal menandai section Rusak / belum siap", () => {
  const lead = deriveSectionLead(
    "health",
    baseLive({
      health: {
        available: true,
        ok: false,
        exitCode: 1,
        checks: [
          {
            id: "docker",
            area: "DOCKER",
            ok: false,
            severity: "blocked",
            summary: "Docker mati",
            recovery: "Nyalakan Docker",
            technical: "down",
          },
        ],
        problem: null,
      },
    }),
  );
  assert.equal(lead.status, "failed");
  assert.equal(lead.statusLabel, "Rusak / belum siap");
});

test("knowledge tidak terbaca = failed", () => {
  const lead = deriveSectionLead(
    "knowledge",
    baseLive({
      knowledge: { available: false, documents: [] },
    }),
  );
  assert.equal(lead.status, "failed");
});

test("governance selalu Baik sebagai penjelasan tetap", () => {
  const lead = deriveSectionLead("governance", baseLive());
  assert.equal(lead.status, "active");
  assert.match(lead.statusReason, /penjelasan tetap/i);
});
