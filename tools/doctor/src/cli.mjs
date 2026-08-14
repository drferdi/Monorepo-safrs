import { runDoctor } from "./checks.mjs";

/**
 * `--json` emits the same checks as machine-readable output so a caller can
 * consume the result without parsing prose. The human report is the default and
 * is unchanged; parsing that text would break silently the first time a message
 * is reworded.
 *
 * Only fields already built for display are emitted. Each check's `technical`
 * string is redacted at construction (see `redactText` in checks.mjs), so no
 * secret reaches this output.
 */
const wantsJson = process.argv.includes("--json");

try {
  const report = await runDoctor();

  if (wantsJson) {
    console.log(
      JSON.stringify(
        {
          version: 1,
          ok: report.ok,
          exitCode: report.exitCode,
          checks: report.checks.map((check) => ({
            id: check.id,
            area: check.area,
            ok: check.ok,
            severity: check.severity,
            summary: check.summary,
            recovery: check.recovery,
            technical: check.technical,
          })),
        },
        null,
        2,
      ),
    );
  } else {
    console.log(report.human);
    if (process.argv.includes("--technical") && report.technical) {
      console.log(`\nRincian teknis:\n${report.technical}`);
    }
  }

  process.exitCode = report.exitCode;
} catch {
  if (wantsJson) {
    console.log(
      JSON.stringify(
        {
          version: 1,
          ok: false,
          exitCode: 1,
          checks: [],
          error:
            "Pemeriksaan tidak dapat diselesaikan. Jalankan pnpm run doctor lagi.",
        },
        null,
        2,
      ),
    );
  } else {
    console.log(
      "[DOCTOR] BELUM SIAP: Pemeriksaan tidak dapat diselesaikan. Jalankan pnpm run doctor lagi.",
    );
  }
  process.exitCode = 1;
}
