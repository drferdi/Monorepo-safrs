#!/usr/bin/env node
/**
 * Deploy dry-run capsule-local, tanpa efek samping: tidak menyentuh jaringan dan
 * tidak membaca kredensial. Memastikan artefak build tiap bagian yang dideploy ada.
 */
import { existsSync } from "node:fs";
import { fileURLToPath } from "node:url";

const ROOT = fileURLToPath(new URL("../", import.meta.url));
const REQUIRED = [
  "artifacts/stride-dashboard/dist/public/index.html",
  "artifacts/api-server/dist/index.mjs",
  "artifacts/sidelab-video/dist/public/index.html",
  "artifacts/mockup-sandbox/dist/index.html",
];
const missing = REQUIRED.filter((relative) => !existsSync(`${ROOT}${relative}`));
if (missing.length > 0) {
  for (const relative of missing) console.error(`FAIL artefak tidak ada: ${relative}`);
  process.exit(1);
}
console.log(`Deploy dry-run passed: ${REQUIRED.length} build artifacts present.`);
