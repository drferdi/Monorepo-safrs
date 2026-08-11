#!/usr/bin/env node
import { readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";

const directory = process.argv[2];
if (!directory) {
  console.error(
    "Usage: node .agents/skills/prisma-migration/scripts/validate-migration.mjs MIGRATION_DIRECTORY",
  );
  process.exit(2);
}

const issues = [];
const report = (check, ok, message) => {
  console.log(`  ${ok ? "PASS" : "FAIL"} ${check}`);
  if (!ok) issues.push(message);
};
const sqlFiles = readdirSync(directory).filter((file) => file.endsWith(".sql"));
if (sqlFiles.length === 0) {
  console.error(`No .sql files found in ${directory}`);
  process.exit(2);
}

for (const file of sqlFiles) {
  const sql = readFileSync(join(directory, file), "utf8");
  report(
    "provider is postgresql",
    /CREATE TABLE|ALTER TABLE/iu.test(sql),
    "Expected PostgreSQL table DDL in migration.",
  );
  report(
    "no raw DROP DATABASE / TRUNCATE",
    !/DROP DATABASE|TRUNCATE/iu.test(sql),
    "Destructive statement found; explicit authorization and a repository-safe path are required.",
  );
  report(
    "UUID defaults present",
    !/CREATE TABLE/iu.test(sql) || /uuid/iu.test(sql),
    "New tables should use @db.Uuid primary keys.",
  );
}

if (issues.length > 0) {
  console.error("\nMigration issues found:");
  for (const issue of issues) console.error(`  - ${issue}`);
  process.exit(1);
}
console.log("\nMigration conventions OK.");
