import { execFile } from "node:child_process";
import { join } from "node:path";

import { repoRoot } from "./root.ts";

/**
 * The SAFRS control plane, read through `tools/status --json`.
 *
 * The board re-implements none of this. Task states, lease chains, ownership
 * conflicts, and the governance verdict all come from the repository's own
 * status command, so there is one definition of each and the board cannot
 * drift from it.
 */

export type PlaneTask = {
  id: string;
  title: string;
  state: string;
  risk: string;
  owner_label?: string;
  owner_id?: string;
  worktree_id?: string;
  scope_prefixes?: string[];
  updated_at?: string;
};

export type PlaneLease = {
  task_id: string;
  events: number;
  chain_valid: boolean;
};

export type ControlPlaneSnapshot = {
  available: boolean;
  /** PASS or FAIL, as the status command reports it. */
  status: string;
  observedAt: string | null;
  tasks: PlaneTask[];
  /** Tasks in a state that still permits mutation. */
  activeTasks: PlaneTask[];
  ownershipOk: boolean;
  conflicts: string[];
  governance: string | null;
  failedChecks: string[];
  leases: PlaneLease[];
  /** The repository's own recommended next action. */
  nextAction: string | null;
  warnings: string[];
  problem: string | null;
};

/** States in which a task may still be changing the repository. */
const MUTATING_STATES = new Set([
  "CLAIMED",
  "PLANNED",
  "EXECUTING",
  "VERIFYING",
  "REVIEW",
  "BLOCKED",
  "CONFLICT",
]);

const STATUS_CLI = ["tools", "status", "src", "cli.mjs"];

/**
 * Capture stdout whatever the exit status.
 *
 * The status command exits non-zero when governance fails — which is exactly
 * the state this screen exists to show — so the output is taken from the error
 * path too.
 */
function runStatusJson(cwd: string): Promise<string> {
  return new Promise((resolve, reject) => {
    execFile(
      process.execPath,
      [join(cwd, ...STATUS_CLI), "--json"],
      { cwd, timeout: 120_000, maxBuffer: 8 * 1024 * 1024, windowsHide: true },
      (error, stdout) => {
        if (stdout.trim().length > 0) {
          resolve(stdout);
          return;
        }
        reject(error ?? new Error("status produced no output"));
      },
    );
  });
}

const UNAVAILABLE: ControlPlaneSnapshot = {
  available: false,
  status: "UNKNOWN",
  observedAt: null,
  tasks: [],
  activeTasks: [],
  ownershipOk: true,
  conflicts: [],
  governance: null,
  failedChecks: [],
  leases: [],
  nextAction: null,
  warnings: [],
  problem:
    "Laporan bidang kendali tidak dapat dijalankan pada checkout ini. Jalankan pnpm saf:status di terminal untuk melihat penyebabnya.",
};

export async function readControlPlane(): Promise<ControlPlaneSnapshot> {
  let parsed: {
    status?: string;
    observed_at?: string;
    tasks?: PlaneTask[];
    ownership?: { ok?: boolean; conflicts?: unknown[] };
    verification?: { governance?: string; failed_checks?: string[] };
    leases?: PlaneLease[];
    next_action?: string;
    warnings?: string[];
  };

  try {
    parsed = JSON.parse(await runStatusJson(await repoRoot()));
  } catch {
    return UNAVAILABLE;
  }

  const tasks = parsed.tasks ?? [];

  return {
    available: true,
    status: parsed.status ?? "UNKNOWN",
    observedAt: parsed.observed_at ?? null,
    tasks,
    activeTasks: tasks.filter((task) => MUTATING_STATES.has(task.state)),
    ownershipOk: parsed.ownership?.ok !== false,
    conflicts: (parsed.ownership?.conflicts ?? []).map((conflict) =>
      typeof conflict === "string" ? conflict : JSON.stringify(conflict),
    ),
    governance: parsed.verification?.governance ?? null,
    failedChecks: parsed.verification?.failed_checks ?? [],
    leases: parsed.leases ?? [],
    nextAction: parsed.next_action ?? null,
    warnings: parsed.warnings ?? [],
    problem: null,
  };
}
