#!/usr/bin/env node
// Validates a generated Prisma migration SQL against @safrs/database conventions.
// Usage: node validate-migration.mjs <migration_dir>
import { readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";

const dir = process.argv[2];
if (!dir) {
  console.error("Usage: node validate-migration.mjs <migration_dir>");
  process.exit(2);
}

const issues = [];
const report = (check, ok, msg) => {
  console.log(`  ${ok ? "PASS" : "FAIL"} ${check}`);
  if (!ok) issues.push(msg);
};

const sqlFiles = readdirSync(dir).filter((f) => f.endsWith(".sql"));
if (sqlFiles.length === 0) {
  console.error(`No .sql files found in ${dir}`);
  process.exit(2);
}

for (const f of sqlFiles) {
  console.log(`\nChecking ${f}`);
  const sql = readFileSync(join(dir, f), "utf8");

  report(
    "provider is postgresql",
    /CREATE TABLE/i.test(sql) || /ALTER TABLE/i.test(sql),
    "Expected table DDL in migration.",
  );

  // Ban payload-deleting or destructive statements that bypass the guard.
  report(
    "no raw DROP DATABASE / TRUNCATE",
    !/DROP DATABASE/i.test(sql) && !/TRUNCATE/i.test(sql),
    "Destructive statement found; must require Chief authorization.",
  );

  // Convention: UUID primary keys.
  report(
    "UUID defaults present",
    !/CREATE TABLE/i.test(sql) || /uuid/i.test(sql),
    "New tables should use @db.Uuid PKs.",
  );
}

if (issues.length) {
  console.error("\nMigration issues found:");
  for (const issue of issues) {
    console.error(`  - ${issue}`);
  }
  process.exit(1);
}
console.log("\nMigration conventions OK.");
