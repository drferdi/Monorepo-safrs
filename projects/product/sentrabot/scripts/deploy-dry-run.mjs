#!/usr/bin/env node
/**
 * Offline deploy dry run for project.contract.json. It builds no image, opens no
 * network connection, reads no credential, and writes nothing.
 *
 * Checks that the inputs publish-server-image.yml hands to `docker build` exist:
 * the built web client, the Dockerfiles, the production Compose file, the
 * lockfile, and the Prisma schema with its migrations.
 */
import { existsSync, readdirSync } from "node:fs";
import { join } from "node:path";
import { fileURLToPath } from "node:url";

const root = fileURLToPath(new URL("../", import.meta.url));

const releaseInputs = [
  "apps/web/dist/index.html",
  "infra/compose/Dockerfile",
  "infra/compose/docker-compose.prod.yml",
  "infra/updater/Dockerfile",
  "pnpm-lock.yaml",
  "packages/db/prisma/schema.prisma",
];

let failures = 0;
const fail = (message) => {
  failures += 1;
  console.error(`FAIL ${message}`);
};

for (const input of releaseInputs) {
  if (!existsSync(join(root, input))) fail(`${input} is missing.`);
}

const migrations = join(root, "packages/db/prisma/migrations");
if (!existsSync(migrations) || readdirSync(migrations).length === 0) {
  fail("packages/db/prisma/migrations is missing or empty.");
}

if (failures > 0) {
  console.error(`deploy dry run failed (${failures} problem(s)).`);
  process.exit(1);
}
console.log("deploy dry run passed: release inputs present, no side effects.");
