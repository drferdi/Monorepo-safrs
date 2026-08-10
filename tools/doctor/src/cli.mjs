import { runDoctor } from "./checks.mjs";

try {
  const report = await runDoctor();
  console.log(report.human);
  if (process.argv.includes("--technical") && report.technical) {
    console.log(`\nRincian teknis:\n${report.technical}`);
  }
  process.exitCode = report.exitCode;
} catch {
  console.log(
    "[DOCTOR] BELUM SIAP: Pemeriksaan tidak dapat diselesaikan. Jalankan pnpm run doctor lagi.",
  );
  process.exitCode = 1;
}
