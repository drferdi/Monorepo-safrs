"use server";

import { execFile } from "node:child_process";
import { access, appendFile } from "node:fs/promises";
import { delimiter, dirname, join } from "node:path";

import { repoRoot } from "../repo/root.ts";
import { runnableById } from "./commands.ts";

/**
 * The command executor.
 *
 * The browser sends an id and nothing else. This module looks the id up in the
 * allowlist and runs the fixed executable and argument array recorded there —
 * no shell, no string building, no value from the request reaching a command
 * line. An id that is not in the table is refused before anything runs.
 *
 * Mutating commands additionally require the operator to type the exact
 * confirmation phrase the allowlist records. The phrase is compared, never
 * interpolated.
 *
 * Every attempt is appended to an audit log, including the refused ones.
 */

export type RunOutcome = {
  ok: boolean;
  /** Indonesian, safe to show directly. */
  summary: string;
  exitCode: number | null;
  stdout: string;
  stderr: string;
  durationMs: number;
  /** Set when the request was refused before execution. */
  refused: string | null;
};

/** Output beyond this is truncated; a page does not need megabytes of log. */
const MAX_OUTPUT_CHARS = 40_000;

function truncate(text: string): string {
  if (text.length <= MAX_OUTPUT_CHARS) {
    return text;
  }
  return `${text.slice(0, MAX_OUTPUT_CHARS)}\n… dipotong pada ${MAX_OUTPUT_CHARS} karakter.`;
}

/**
 * Append one line to the audit trail.
 *
 * Written to the gitignored data root rather than into the repository tree, so
 * a local run never shows up as an uncommitted change. A failure to write the
 * audit line is reported, never swallowed — an unrecorded run is exactly what
 * this file exists to prevent.
 */
async function audit(entry: Record<string, unknown>): Promise<string | null> {
  try {
    const root = await repoRoot();
    const line = `${JSON.stringify({ at: new Date().toISOString(), ...entry })}\n`;
    await appendFile(
      join(root, "database", "logs", "control-center.log"),
      line,
      "utf8",
    );
    return null;
  } catch (error) {
    return `Jejak audit gagal ditulis: ${(error as Error).message}`;
  }
}

/**
 * Resolve `pnpm` to a JavaScript entry point runnable by node.
 *
 * On Windows `pnpm` on PATH is `pnpm.cmd`, and execFile without a shell cannot
 * launch a .cmd — the spawn fails in milliseconds with no output, which is
 * exactly how this was found. Adding `shell: true` would fix it by reintroducing
 * the one thing this executor is built to avoid, so instead the CLI's own .cjs
 * is located and handed to node directly.
 *
 * Returns null when pnpm cannot be found, so the caller can refuse honestly
 * rather than run something unexpected.
 */
async function resolvePnpm(): Promise<string | null> {
  const candidates: string[] = [];

  if (process.env.PNPM_HOME) {
    candidates.push(join(process.env.PNPM_HOME, "pnpm.cjs"));
  }
  if (process.env.APPDATA) {
    candidates.push(
      join(
        process.env.APPDATA,
        "npm",
        "node_modules",
        "pnpm",
        "bin",
        "pnpm.cjs",
      ),
    );
  }
  candidates.push(
    join(dirname(process.execPath), "node_modules", "pnpm", "bin", "pnpm.cjs"),
  );

  // Anything on PATH that ships the CLI beside its shim.
  for (const entry of (process.env.PATH ?? "").split(delimiter)) {
    if (entry.trim().length > 0) {
      candidates.push(join(entry, "node_modules", "pnpm", "bin", "pnpm.cjs"));
    }
  }

  for (const candidate of candidates) {
    try {
      await access(candidate);
      return candidate;
    } catch {
      // Try the next one.
    }
  }

  return null;
}

export async function runCommand(
  id: string,
  confirmation?: string,
): Promise<RunOutcome> {
  const started = Date.now();
  const command = runnableById(id);

  if (!command) {
    await audit({ id, result: "refused", reason: "not-in-allowlist" });
    return {
      ok: false,
      summary:
        "Perintah ini tidak ada dalam daftar yang diizinkan, jadi tidak dijalankan.",
      exitCode: null,
      stdout: "",
      stderr: "",
      durationMs: 0,
      refused: "not-in-allowlist",
    };
  }

  if (command.mutation) {
    if (!command.confirmPhrase) {
      await audit({ id, result: "refused", reason: "no-confirm-phrase" });
      return {
        ok: false,
        summary:
          "Perintah ini mengubah mesin tetapi tidak memiliki frasa konfirmasi, jadi ditolak.",
        exitCode: null,
        stdout: "",
        stderr: "",
        durationMs: 0,
        refused: "no-confirm-phrase",
      };
    }
    if (confirmation !== command.confirmPhrase) {
      await audit({ id, result: "refused", reason: "confirmation-mismatch" });
      return {
        ok: false,
        summary: `Frasa konfirmasi tidak cocok. Ketik persis: ${command.confirmPhrase}`,
        exitCode: null,
        stdout: "",
        stderr: "",
        durationMs: 0,
        refused: "confirmation-mismatch",
      };
    }
  }

  const cwd = await repoRoot();

  // pnpm is invoked through node rather than through its platform shim; see
  // resolvePnpm for why.
  let file = command.file;
  let args = command.args;

  if (file === "pnpm") {
    const cli = await resolvePnpm();
    if (!cli) {
      await audit({ id, result: "refused", reason: "pnpm-not-found" });
      return {
        ok: false,
        summary:
          "pnpm tidak ditemukan di komputer ini, jadi perintah tidak dijalankan.",
        exitCode: null,
        stdout: "",
        stderr: "",
        durationMs: Date.now() - started,
        refused: "pnpm-not-found",
      };
    }
    file = process.execPath;
    args = [cli, ...command.args];
  }

  const outcome = await new Promise<RunOutcome>((resolve) => {
    execFile(
      file,
      args,
      {
        cwd,
        timeout: command.timeoutMs,
        maxBuffer: 8 * 1024 * 1024,
        windowsHide: true,
        // The child inherits the environment it needs to run, but this process
        // never reads or forwards a secret value itself.
        env: process.env,
      },
      (error, stdout, stderr) => {
        const durationMs = Date.now() - started;
        const exitCode =
          error && typeof (error as { code?: unknown }).code === "number"
            ? ((error as { code: number }).code ?? null)
            : error
              ? null
              : 0;

        const timedOut =
          error !== null && (error as { killed?: boolean }).killed === true;

        resolve({
          ok: !error,
          summary: timedOut
            ? `Dihentikan karena melewati batas waktu ${Math.round(command.timeoutMs / 1000)} detik.`
            : error
              ? `Selesai dengan kegagalan. Baca keluarannya di bawah untuk penyebabnya.`
              : "Selesai tanpa kesalahan.",
          exitCode,
          stdout: truncate(stdout ?? ""),
          stderr: truncate(stderr ?? ""),
          durationMs,
          refused: null,
        });
      },
    );
  });

  const auditProblem = await audit({
    id,
    result: outcome.ok ? "ok" : "failed",
    exitCode: outcome.exitCode,
    durationMs: outcome.durationMs,
  });

  if (auditProblem) {
    return { ...outcome, summary: `${outcome.summary} ${auditProblem}` };
  }

  return outcome;
}
