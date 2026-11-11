import { spawnSync } from "node:child_process";
import { randomUUID } from "node:crypto";
import { fileURLToPath } from "node:url";
import { Client } from "pg";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { resolveLocalToolingDatabaseUrl } from "./local-tooling.js";
import { assertDisposableTestDatabase } from "./reset-guard.js";

const integrationDescribe =
  process.env.DATABASE_INTEGRATION_TESTS === "1" ? describe : describe.skip;
const rootDirectory = fileURLToPath(new URL("../../../", import.meta.url));
const runner = fileURLToPath(
  new URL("../scripts/run-local-prisma.mjs", import.meta.url),
);
const sharedDatabaseUrl = resolveLocalToolingDatabaseUrl(
  process.env,
  rootDirectory,
);
const testDatabaseName = `safrs_seed_${process.pid}_${randomUUID().replaceAll("-", "").slice(0, 16)}_test`;
const testDatabaseUrl = databaseUrlFor(testDatabaseName);
const adminDatabaseUrl = databaseUrlFor("postgres");
const connection = new Client({ connectionString: testDatabaseUrl });
const adminConnection = new Client({ connectionString: adminDatabaseUrl });
const quotedTestDatabaseName = `"${testDatabaseName}"`;

let adminConnected = false;
let testDatabaseCreated = false;
let testDatabaseConnected = false;

function databaseUrlFor(databaseName: string): string {
  const target = new URL(sharedDatabaseUrl);
  target.pathname = `/${databaseName}`;
  target.search = "";
  target.hash = "";
  return target.toString();
}

function runDatabaseCommand(command: "migrate" | "seed") {
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

integrationDescribe("deterministic seed sequence", () => {
  beforeAll(async () => {
    assertDisposableTestDatabase(testDatabaseUrl);
    await adminConnection.connect();
    adminConnected = true;
    await adminConnection.query(`CREATE DATABASE ${quotedTestDatabaseName}`);
    testDatabaseCreated = true;
    runDatabaseCommand("migrate");
    await connection.connect();
    testDatabaseConnected = true;
  });

  afterAll(async () => {
    try {
      if (testDatabaseConnected) {
        await connection.end();
      }
    } finally {
      try {
        if (adminConnected && testDatabaseCreated) {
          await adminConnection.query(
            "SELECT pg_terminate_backend(pid) FROM pg_stat_activity WHERE datname = $1 AND pid <> pg_backend_pid()",
            [testDatabaseName],
          );
          await adminConnection.query(
            `DROP DATABASE IF EXISTS ${quotedTestDatabaseName}`,
          );
        }
      } finally {
        if (adminConnected) {
          await adminConnection.end();
        }
      }
    }
  });

  it("uses only a dedicated disposable test database", async () => {
    const result = await connection.query<{ database: string }>(
      "SELECT current_database() AS database",
    );

    expect(result.rows[0]?.database).toBe(testDatabaseName);
  });

  it("leaves a single demo row after repeated seeds", async () => {
    runDatabaseCommand("seed");
    runDatabaseCommand("seed");

    const result = await connection.query<{ count: number }>(
      "SELECT COUNT(*)::int AS count FROM demos",
    );

    expect(result.rows[0]?.count).toBe(1);
  });
});
