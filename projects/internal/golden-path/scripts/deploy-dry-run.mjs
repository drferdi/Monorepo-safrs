// Offline deploy dry-run for project.contract.json: no network, no database, no writes.
// Production deployment is a non-goal for this capsule, so the dry-run proves the
// deployable inputs exist: the Next.js build output and the Prisma schema with migrations.
import { existsSync, readdirSync } from "node:fs";
import { fileURLToPath } from "node:url";

const root = fileURLToPath(new URL("..", import.meta.url));
const required = [
  "apps/web/.next/BUILD_ID",
  "packages/database/prisma/schema.prisma",
  "packages/database/prisma/migrations/migration_lock.toml",
  "pnpm-lock.yaml",
];

const failures = required.filter((path) => !existsSync(`${root}/${path}`));
const migrations = readdirSync(`${root}/packages/database/prisma/migrations`, {
  withFileTypes: true,
}).filter((entry) => entry.isDirectory());
if (migrations.length === 0) {
  failures.push("packages/database/prisma/migrations/<migration>");
}

for (const path of failures) {
  console.error(`FAIL missing ${path}`);
}
if (failures.length > 0) {
  process.exit(1);
}
console.log(
  `deploy dry-run passed: build output and ${migrations.length} migrations present, no side effects.`,
);
