import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import test from "node:test";

import { runDevelopment } from "../../scripts/dev.mjs";
import { runSetup } from "../../scripts/setup.mjs";

const localUrl = "postgresql://safrs:safrs@127.0.0.1:54329/safrs_local";

function successfulCommand(calls) {
  return async (program, argumentsList) => {
    calls.push([program.replace(/\.cmd$/iu, ""), ...argumentsList].join(" "));
    return { exitCode: 0, stdout: "ok", stderr: "" };
  };
}

test("uses pnpm run for doctor because bare pnpm doctor is reserved by pnpm", () => {
  const pnpm = process.platform === "win32" ? "pnpm.cmd" : "pnpm";
  const result =
    process.platform === "win32"
      ? spawnSync(
          process.env.ComSpec ?? "cmd.exe",
          ["/d", "/s", "/c", pnpm, "doctor", "--help"],
          { encoding: "utf8" },
        )
      : spawnSync(pnpm, ["doctor", "--help"], { encoding: "utf8" });

  assert.equal(result.status, 0);
  assert.match(result.stdout, /Run diagnostics on the pnpm installation/u);
});

test("setup creates a missing environment file once and runs the safe local sequence", async () => {
  const calls = [];
  let copied = 0;
  const result = await runSetup({
    rootDirectory: "/fixture",
    nodeVersion: "v24.18.0",
    command: successfulCommand(calls),
    fileSystem: {
      exists: (file) => !file.endsWith(".env"),
      copyFile: async () => {
        copied += 1;
      },
      readFile: async () => `DATABASE_URL=${localUrl}\n`,
    },
    runDoctor: async () => ({ ok: true, exitCode: 0, human: "[DOCTOR] SIAP" }),
  });

  assert.equal(result.exitCode, 0);
  assert.equal(copied, 1);
  assert.deepEqual(calls, [
    "pnpm --version",
    "git --version",
    "pnpm install --frozen-lockfile=false",
    "docker --version",
    "docker compose up -d --wait postgres",
    "pnpm --filter @safrs/database generate",
    "pnpm --filter @safrs/database migrate",
    "pnpm --filter @safrs/database seed",
  ]);
});

test("setup never overwrites an existing environment file", async () => {
  const calls = [];
  let copied = 0;
  await runSetup({
    rootDirectory: "/fixture",
    nodeVersion: "v24.18.0",
    command: successfulCommand(calls),
    fileSystem: {
      exists: () => true,
      copyFile: async () => {
        copied += 1;
      },
      readFile: async () => `DATABASE_URL=${localUrl}\n`,
    },
    runDoctor: async () => ({ ok: true, exitCode: 0, human: "[DOCTOR] SIAP" }),
  });

  assert.equal(copied, 0);
  assert.ok(calls.includes("pnpm --filter @safrs/database seed"));
});

test("setup creates an environment file in a temporary fixture with its default filesystem", async () => {
  const rootDirectory = await mkdtemp(join(tmpdir(), "safrs-setup-"));
  const calls = [];
  try {
    await writeFile(
      join(rootDirectory, ".env.example"),
      `DATABASE_URL=${localUrl}\n`,
    );
    const result = await runSetup({
      rootDirectory,
      nodeVersion: "v24.18.0",
      command: successfulCommand(calls),
      environment: { DATABASE_URL: localUrl },
      runDoctor: async () => ({
        ok: true,
        exitCode: 0,
        human: "[DOCTOR] SIAP",
      }),
    });

    assert.equal(result.exitCode, 0);
    assert.equal(
      await readFile(join(rootDirectory, ".env"), "utf8"),
      `DATABASE_URL=${localUrl}\n`,
    );
  } finally {
    await rm(rootDirectory, { recursive: true, force: true });
  }
});

test("development stops before side effects when Docker engine is not ready", async () => {
  const calls = [];
  const report = {
    ok: false,
    exitCode: 1,
    checks: [{ id: "docker-engine", ok: false, severity: "recoverable" }],
    human:
      "[DOCKER] BELUM SIAP: Mesin Docker belum berjalan.\n  Solusi: Buka Docker Desktop, tunggu sampai siap, lalu jalankan pnpm dev.",
  };

  const result = await runDevelopment({
    command: successfulCommand(calls),
    runDoctor: async () => report,
  });

  assert.equal(result.exitCode, 1);
  assert.equal(result.human, report.human);
  assert.deepEqual(calls, []);
});

test("development repairs local PostgreSQL and Prisma before handing off to Turbo", async () => {
  const calls = [];
  let spawned = 0;
  const result = await runDevelopment({
    rootDirectory: "/fixture",
    command: successfulCommand(calls),
    runDoctor: async () => ({
      ok: false,
      exitCode: 1,
      checks: [
        { id: "postgres-ready", ok: false, severity: "recoverable" },
        { id: "prisma-client", ok: false, severity: "recoverable" },
      ],
      human: "perbaikan lokal diperlukan",
    }),
    startTurbo: async () => {
      spawned += 1;
      return 0;
    },
  });

  assert.equal(result.exitCode, 0);
  assert.equal(spawned, 1);
  assert.deepEqual(calls, [
    "docker compose up -d --wait postgres",
    "pnpm --filter @safrs/database generate",
  ]);
});
