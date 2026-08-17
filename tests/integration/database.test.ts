import { spawnSync } from "node:child_process";
import { randomUUID } from "node:crypto";
import { fileURLToPath } from "node:url";
import { Client } from "pg";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { resolveLocalToolingDatabaseUrl } from "../../packages/database/src/local-tooling.js";
import { assertDisposableTestDatabase } from "../../packages/database/src/reset-guard.js";

const integrationDescribe =
  process.env.DATABASE_INTEGRATION_TESTS === "1" ? describe : describe.skip;
const rootDirectory = fileURLToPath(new URL("../../", import.meta.url));
const runner = fileURLToPath(
  new URL(
    "../../packages/database/scripts/run-local-prisma.mjs",
    import.meta.url,
  ),
);
const localDatabaseUrl = resolveLocalToolingDatabaseUrl(
  process.env,
  rootDirectory,
);
const testDatabaseName = `safrs_contract_${process.pid}_${randomUUID().replaceAll("-", "").slice(0, 16)}_test`;
const testDatabaseUrl = databaseUrlFor(testDatabaseName);
const adminDatabaseUrl = databaseUrlFor("postgres");
const database = new Client({ connectionString: testDatabaseUrl });
const admin = new Client({ connectionString: adminDatabaseUrl });
const quotedDatabaseName = `"${testDatabaseName}"`;

let adminConnected = false;
let databaseCreated = false;
let databaseConnected = false;

function databaseUrlFor(databaseName: string): string {
  const target = new URL(localDatabaseUrl);
  target.pathname = `/${databaseName}`;
  target.search = "";
  target.hash = "";
  return target.toString();
}

function runPrisma(command: "migrate" | "seed") {
  const result = spawnSync(
    process.execPath,
    ["--experimental-strip-types", runner, command],
    {
      cwd: rootDirectory,
      encoding: "utf8",
      env: { ...process.env, DATABASE_URL: testDatabaseUrl },
    },
  );

  expect(result.status, result.stderr).toBe(0);
}

integrationDescribe("isolated PostgreSQL behavior", () => {
  beforeAll(async () => {
    assertDisposableTestDatabase(testDatabaseUrl);
    await admin.connect();
    adminConnected = true;
    await admin.query(`CREATE DATABASE ${quotedDatabaseName}`);
    databaseCreated = true;
    runPrisma("migrate");
    runPrisma("seed");
    await database.connect();
    databaseConnected = true;
  });

  afterAll(async () => {
    try {
      if (databaseConnected) {
        await database.end();
      }
    } finally {
      try {
        if (adminConnected && databaseCreated) {
          await admin.query(
            "SELECT pg_terminate_backend(pid) FROM pg_stat_activity WHERE datname = $1 AND pid <> pg_backend_pid()",
            [testDatabaseName],
          );
          await admin.query(`DROP DATABASE IF EXISTS ${quotedDatabaseName}`);
        }
      } finally {
        if (adminConnected) {
          await admin.end();
        }
      }
    }
  });

  it("seeds, lists, creates, then removes a transaction only in a unique _test database", async () => {
    const activeDatabase = await database.query<{ database: string }>(
      "SELECT current_database() AS database",
    );
    expect(activeDatabase.rows[0]?.database).toBe(testDatabaseName);

    const seeded = await database.query<{ name: string }>(
      "SELECT name FROM demos WHERE id = $1",
      ["00000000-0000-4000-8000-000000000001"],
    );
    expect(seeded.rows).toEqual([{ name: "Sentra Demo" }]);

    const uniqueName = `Contract Demo ${randomUUID()}`;
    await database.query("INSERT INTO demos (name) VALUES ($1) RETURNING id", [
      uniqueName,
    ]);
    const created = await database.query<{ id: string; name: string }>(
      "SELECT id, name FROM demos WHERE name = $1",
      [uniqueName],
    );
    expect(created.rows[0]?.name).toBe(uniqueName);
    expect(created.rows[0]?.id).toMatch(
      /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i,
    );
    await database.query("DELETE FROM demos WHERE name = $1", [uniqueName]);
  });
});
