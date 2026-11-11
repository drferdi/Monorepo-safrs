import { execFile } from "node:child_process";
import { join } from "node:path";

import { type GateResult, parseGates } from "./gates-parse.ts";
import { repoRoot } from "./root.ts";

/**
 * The eight publication gates, read from the repository's own automation CLI.
 * The board re-implements none of the gate logic.
 */

export type GatesSnapshot = {
  available: boolean;
  gates: GateResult[];
  problem: string | null;
};

const GATE_CLI = ["tools", "automation", "src", "cli.mjs"];

/**
 * Capture stdout whatever the exit status: a FAIL verdict exits non-zero, and
 * that is exactly the state this screen exists to show.
 */
function runGateAll(cwd: string): Promise<string> {
  return new Promise((resolve, reject) => {
    execFile(
      process.execPath,
      [join(cwd, ...GATE_CLI), "gate", "--all"],
      { cwd, timeout: 120_000, maxBuffer: 8 * 1024 * 1024, windowsHide: true },
      (error, stdout) => {
        if (stdout.trim().length > 0) {
          resolve(stdout);
          return;
        }
        reject(error ?? new Error("gate produced no output"));
      },
    );
  });
}

export async function readGates(): Promise<GatesSnapshot> {
  try {
    const gates = parseGates(await runGateAll(await repoRoot()));
    return { available: true, gates, problem: null };
  } catch {
    return {
      available: false,
      gates: [],
      problem:
        "Gerbang publikasi tidak dapat dievaluasi pada checkout ini. Jalankan pnpm saf gate --all di terminal untuk melihat penyebabnya.",
    };
  }
}
