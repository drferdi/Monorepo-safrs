import { randomUUID } from "node:crypto";

import { Client } from "pg";
import {
  assertDisposableDatabase,
  assertDisposableTestDatabase,
} from "../packages/database/src/reset-guard.ts";
import { loadCanonicalEnvironment } from "../tools/doctor/src/checks.mjs";
import { packageManagerCommand, runCommand } from "./lib/process.mjs";

const rootDirectory = process.cwd();

function e2eFailure(message) {
  throw new Error(`[E2E] DATABASE_URL DITOLAK: ${message}`);
}

function uniqueTestDatabaseUrl(baseUrl) {
  const target = assertDisposableDatabase(baseUrl);
  const databaseName = `safrs_e2e_${randomUUID().replaceAll("-", "")}_test`;
  target.pathname = `/${databaseName}`;
  target.search = "";
  target.hash = "";
  assertDisposableTestDatabase(target.toString());
  return target.toString();
}

function e2eEnvironment() {
  if (process.env.DATABASE_URL) {
    try {
      assertDisposableTestDatabase(process.env.DATABASE_URL);
    } catch {
      return e2eFailure(
        "variabel lingkungan harus menunjuk PostgreSQL lokal berakhiran _test.",
      );
    }
    return {
      APP_URL: process.env.APP_URL ?? "http://127.0.0.1:3001",
      DATABASE_URL: process.env.DATABASE_URL,
      NODE_ENV: "test",
      createdByRunner: false,
    };
  }

  const canonicalEnvironment = loadCanonicalEnvironment({ rootDirectory });
  return {
    APP_URL: "http://127.0.0.1:3001",
    DATABASE_URL: uniqueTestDatabaseUrl(canonicalEnvironment.DATABASE_URL),
    NODE_ENV: "test",
    createdByRunner: true,
  };
}

function databaseNameFrom(url) {
  const name = new URL(url).pathname.slice(1);
  if (!/^safrs_e2e_[a-f0-9]{32}_test$/u.test(name)) {
    return undefined;
  }
  return name;
}

function adminDatabaseUrl(databaseUrl) {
  const adminUrl = new URL(databaseUrl);
  adminUrl.pathname = "/postgres";
  return adminUrl.toString();
}

async function runPnpm(argumentsList, environment) {
  const result = await runCommand(packageManagerCommand, argumentsList, {
    cwd: rootDirectory,
    env: { ...process.env, ...environment },
  });
  process.stdout.write(result.stdout);
  process.stderr.write(result.stderr);
  if (result.exitCode !== 0) {
    throw new Error("[E2E] Penyiapan database uji belum berhasil.");
  }
}

async function createTestDatabase(databaseUrl) {
  const databaseName = databaseNameFrom(databaseUrl);
  if (!databaseName) {
    return e2eFailure("nama database uji unik tidak valid.");
  }
  const admin = new Client({ connectionString: adminDatabaseUrl(databaseUrl) });
  await admin.connect();
  try {
    await admin.query(`CREATE DATABASE "${databaseName}"`);
  } finally {
    await admin.end();
  }
}

async function removeTestDatabase(databaseUrl) {
  const databaseName = databaseNameFrom(databaseUrl);
  if (!databaseName) {
    return;
  }
  const admin = new Client({ connectionString: adminDatabaseUrl(databaseUrl) });
  await admin.connect();
  try {
    await admin.query(
      "SELECT pg_terminate_backend(pid) FROM pg_stat_activity WHERE datname = $1 AND pid <> pg_backend_pid()",
      [databaseName],
    );
    await admin.query(`DROP DATABASE IF EXISTS "${databaseName}"`);
  } finally {
    await admin.end();
  }
}

const environment = e2eEnvironment();

try {
  if (environment.createdByRunner) {
    await createTestDatabase(environment.DATABASE_URL);
  }
  await runPnpm(["--filter", "@safrs/database", "migrate"], environment);
  await runPnpm(["--filter", "@safrs/database", "seed"], environment);
  await runPnpm(["turbo", "run", "test:e2e"], environment);
} finally {
  if (environment.createdByRunner) {
    await removeTestDatabase(environment.DATABASE_URL);
  }
}
