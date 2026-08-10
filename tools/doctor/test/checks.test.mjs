import assert from "node:assert/strict";
import test from "node:test";

import { runDoctor } from "../src/checks.mjs";

const localUrl = "postgresql://safrs:safrs@127.0.0.1:54329/safrs_local";

function fakeCommand(overrides = {}) {
  const calls = [];
  const responses = {
    "pnpm --version": { stdout: "11.21.0" },
    "git --version": { stdout: "git version 2.50.0" },
    "docker --version": { stdout: "Docker version 28.0.0" },
    "docker info --format {{.ServerVersion}}": { stdout: "28.0.0" },
    "docker compose exec -T postgres pg_isready -U safrs -d safrs_local": {
      stdout: "localhost:5432 - accepting connections",
    },
    ...overrides,
  };

  return {
    calls,
    command: async (program, argumentsList) => {
      const key = [program.replace(/\.cmd$/iu, ""), ...argumentsList].join(" ");
      calls.push(key);
      return responses[key] ?? { exitCode: 1, stderr: "not found" };
    },
  };
}

function healthyOptions(overrides = {}) {
  const command = fakeCommand(overrides.commands);
  return {
    command,
    options: {
      rootDirectory: "/workspace",
      nodeVersion: "v24.18.0",
      command: command.command,
      environment: {
        DATABASE_URL: localUrl,
        API_TOKEN: "token-sentinel",
      },
      fileSystem: {
        exists: (file) => file.endsWith(".env") || file.includes("generated"),
        readFile: () => `DATABASE_URL=${localUrl}\nAPI_TOKEN=file-sentinel\n`,
      },
      ...overrides,
    },
  };
}

test("reports a human recovery when Docker is installed but its engine is stopped", async () => {
  const { options } = healthyOptions({
    commands: {
      "docker info --format {{.ServerVersion}}": {
        exitCode: 1,
        stderr: "daemon is not running",
      },
    },
  });

  const report = await runDoctor(options);

  assert.equal(report.ok, false);
  assert.equal(report.exitCode, 1);
  assert.match(report.human, /\[DOCKER\] BELUM SIAP/u);
  assert.match(report.human, /Buka Docker Desktop/u);
  assert.match(report.human, /pnpm dev/u);
});

test("marks an incompatible Node runtime as a recoverable setup issue", async () => {
  const { options } = healthyOptions({ nodeVersion: "v22.17.0" });

  const report = await runDoctor(options);

  assert.equal(report.exitCode, 1);
  assert.match(report.human, /\[NODE\] BELUM SIAP/u);
  assert.match(report.human, /Node.js 24 LTS/u);
});

test("reports a missing root environment file without creating it", async () => {
  let writes = 0;
  const { options } = healthyOptions({
    fileSystem: {
      exists: (file) => file.includes("generated"),
      readFile: () => {
        throw new Error(".env must not be read when it does not exist");
      },
      writeFile: () => {
        writes += 1;
      },
    },
  });

  const report = await runDoctor(options);

  assert.equal(report.exitCode, 1);
  assert.match(report.human, /\[ENV\] BELUM SIAP/u);
  assert.match(report.human, /pnpm run setup/u);
  assert.equal(writes, 0);
});

test("rejects a non-local database URL before any database probe", async () => {
  const unsafeUrl =
    "postgresql://admin:password-sentinel@db.example.com:5432/production";
  const { command, options } = healthyOptions({
    environment: { DATABASE_URL: unsafeUrl, API_TOKEN: "token-sentinel" },
    fileSystem: {
      exists: () => true,
      readFile: () => `DATABASE_URL=${unsafeUrl}\nAPI_TOKEN=file-sentinel\n`,
    },
  });

  const report = await runDoctor(options);

  assert.equal(report.exitCode, 2);
  assert.match(report.human, /\[DATABASE\] DITOLAK/u);
  assert.equal(
    command.calls.some((call) => call.startsWith("docker compose exec")),
    false,
  );
  assert.doesNotMatch(
    report.human,
    /password-sentinel|token-sentinel|file-sentinel|db\.example/u,
  );
  assert.doesNotMatch(
    report.technical,
    /password-sentinel|token-sentinel|file-sentinel|db\.example/u,
  );
});

test("rejects an unsafe supplied database URL even when the root environment file is missing", async () => {
  const unsafeUrl =
    "postgresql://admin:password-sentinel@db.example.com:5432/production";
  const { options } = healthyOptions({
    environment: { DATABASE_URL: unsafeUrl, API_TOKEN: "token-sentinel" },
    fileSystem: {
      exists: (file) => file.includes("generated"),
      readFile: () => {
        throw new Error("missing .env must not be read");
      },
    },
  });

  const report = await runDoctor(options);

  assert.equal(report.exitCode, 2);
  assert.match(report.human, /\[DATABASE\] DITOLAK/u);
  assert.doesNotMatch(
    report.human,
    /password-sentinel|token-sentinel|db\.example/u,
  );
});

test("reports a healthy local development machine using read-only boundaries", async () => {
  const { command, options } = healthyOptions();

  const report = await runDoctor(options);

  assert.equal(report.ok, true);
  assert.equal(report.exitCode, 0);
  assert.equal(report.checks.length, 9);
  assert.match(report.human, /^\[NODE\] SIAP/mu);
  assert.doesNotMatch(
    report.human,
    /token-sentinel|file-sentinel|safrs:safrs/u,
  );
  assert.equal(
    command.calls.some((call) =>
      /\b(up|generate|migrate|seed|install)\b/u.test(call),
    ),
    false,
  );
});
