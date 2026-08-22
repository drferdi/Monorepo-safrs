import { execFile } from "node:child_process";
import { join } from "node:path";

import { repoRoot } from "./root.ts";

/**
 * Segments, joined against the repository root at call time.
 *
 * A path-shaped string literal in an execFile argument is read by the bundler
 * as a module specifier, and the build fails trying to resolve it. Building the
 * path from a runtime value avoids that, and keeps the separator correct on
 * every platform.
 */
const DOCTOR_SEGMENTS = ["tools", "doctor", "src", "cli.mjs"];

/**
 * Machine readiness, read from the repository's own doctor.
 *
 * The dashboard does not re-implement any check. It runs `tools/doctor` in its
 * `--json` mode and renders the result, so there is exactly one definition of
 * "ready" in this repository and the board cannot drift from it.
 */

export type HealthCheck = {
  id: string;
  area: string;
  ok: boolean;
  severity: string;
  summary: string;
  recovery: string;
  technical: string;
};

export type HealthSnapshot = {
  available: boolean;
  ok: boolean;
  /** 0 ready · 1 not ready · 2 unsafe, from the doctor's own exit codes. */
  exitCode: number;
  checks: HealthCheck[];
  blocked: HealthCheck[];
  /** Indonesian explanation when the reading itself failed. */
  problem: string | null;
};

const UNAVAILABLE: HealthSnapshot = {
  available: false,
  ok: false,
  exitCode: 1,
  checks: [],
  blocked: [],
  problem:
    "Pemeriksaan kesiapan tidak dapat dijalankan pada checkout ini. Jalankan pnpm doctor di terminal untuk melihat penyebabnya.",
};

/**
 * Run the doctor and capture stdout regardless of exit status.
 *
 * `execFile` rejects on a non-zero exit, but the doctor exits 1 precisely when
 * something is not ready — the case this screen exists to show. The output is
 * what matters, not the status, so it is read from the error too.
 */
function runDoctorJson(cwd: string): Promise<string> {
  return new Promise((resolve, reject) => {
    execFile(
      "node",
      [join(cwd, ...DOCTOR_SEGMENTS), "--json"],
      { cwd, timeout: 120_000, maxBuffer: 4 * 1024 * 1024, windowsHide: true },
      (error, stdout) => {
        if (stdout.trim().length > 0) {
          resolve(stdout);
          return;
        }
        reject(error ?? new Error("doctor produced no output"));
      },
    );
  });
}

export async function readHealth(): Promise<HealthSnapshot> {
  let parsed: {
    ok?: boolean;
    exitCode?: number;
    checks?: HealthCheck[];
    error?: string;
  };

  try {
    parsed = JSON.parse(await runDoctorJson(await repoRoot()));
  } catch {
    return UNAVAILABLE;
  }

  if (parsed.error) {
    return { ...UNAVAILABLE, available: true, problem: parsed.error };
  }

  const checks = parsed.checks ?? [];

  return {
    available: true,
    ok: parsed.ok === true,
    exitCode: parsed.exitCode ?? 1,
    checks,
    blocked: checks.filter((check) => !check.ok),
    problem: null,
  };
}
