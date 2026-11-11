// Offline deploy dry-run for project.contract.json: no network, no writes.
// The Control Center is a local operator surface and is never deployed, so the
// dry-run proves only that the runnable inputs exist.
import { existsSync } from "node:fs";
import { fileURLToPath } from "node:url";

const root = fileURLToPath(new URL("..", import.meta.url));
const required = ["apps/web/.next/BUILD_ID", "pnpm-lock.yaml"];

const failures = required.filter((path) => !existsSync(`${root}/${path}`));
for (const path of failures) {
  console.error(`FAIL missing ${path}`);
}
if (failures.length > 0) {
  process.exit(1);
}
console.log("deploy dry-run passed: build output and lockfile present, no side effects.");
