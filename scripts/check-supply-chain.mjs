#!/usr/bin/env node
/**
 * Supply-chain security gate.
 *
 * Runs `pnpm audit` (the built-in npm advisory audit, no key required) and,
 * when the `osv-scanner` binary is available, the OSV vulnerability scanner.
 * Both are advisory sources; the script fails the build when advisories at or
 * above the configured severity are found.
 *
 * Usage:
 *   node scripts/check-supply-chain.mjs            # pnpm audit (default)
 *   node scripts/check-supply-chain.mjs --osv      # also run osv-scanner if present
 *   node scripts/check-supply-chain.mjs --pedantic # fail on any advisory
 */
import { access } from "node:fs/promises";
import { packageManagerCommand, runCommand } from "./lib/process.mjs";

const PEDANTIC = process.argv.includes("--pedantic");
const RUN_OSV = process.argv.includes("--osv");
// Only fail on high/critical by default; pedantic fails on any advisory.
const AUDIT_LEVEL = PEDANTIC ? "low" : "high";

async function main() {
  let failed = false;

  console.log(`[SUPPLY-CHAIN] Running npm audit (level: ${AUDIT_LEVEL})...`);
  const audit = await runCommand(packageManagerCommand, [
    "audit",
    `--audit-level=${AUDIT_LEVEL}`,
    "--json",
  ]);
  if (audit.stdout) {
    try {
      const report = JSON.parse(audit.stdout);
      const vulns = report.metadata?.vulnerabilities ?? {};
      const total =
        (vulns.critical ?? 0) +
        (vulns.high ?? 0) +
        (vulns.moderate ?? 0) +
        (vulns.low ?? 0) +
        (vulns.info ?? 0);
      console.log(
        `  vulnerabilities: critical=${vulns.critical ?? 0} high=${vulns.high ?? 0} moderate=${vulns.moderate ?? 0} low=${vulns.low ?? 0} info=${vulns.info ?? 0}`,
      );
      if (total === 0) console.log("  no advisories found.");
      if (
        audit.exitCode !== 0 &&
        !PEDANTIC &&
        vulns.high + vulns.critical === 0
      ) {
        // npm audit exits non-zero on moderate/low too; only hard-fail on
        // high/critical unless pedantic.
        failed = false;
      } else if (audit.exitCode !== 0) {
        failed = true;
      }
    } catch {
      console.log(audit.stderr || audit.stdout);
    }
  } else {
    console.log(audit.stderr || "  audit produced no output.");
  }

  if (RUN_OSV) {
    try {
      await access("osv-scanner");
    } catch {
      console.log("[SUPPLY-CHAIN] osv-scanner not found; skipping OSV scan.");
      return finalize(failed);
    }
    console.log("[SUPPLY-CHAIN] Running osv-scanner...");
    const osv = await runCommand("osv-scanner", ["-r", "."]);
    process.stdout.write(osv.stdout);
    if (osv.exitCode !== 0) failed = true;
  }

  return finalize(failed);
}

function finalize(failed) {
  if (failed) {
    console.error(
      "[SUPPLY-CHAIN] FAILED: advisories found at or above configured severity.",
    );
    process.exitCode = 1;
    return;
  }
  console.log("[SUPPLY-CHAIN] OK: no blocking advisories.");
}

main().catch((error) => {
  console.error(`[SUPPLY-CHAIN] ${error.message}`);
  process.exitCode = 1;
});
