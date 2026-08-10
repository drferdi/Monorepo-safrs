import { existsSync } from "node:fs";
import { copyFile, readFile } from "node:fs/promises";
import { resolve } from "node:path";
import { fileURLToPath } from "node:url";

import { assertDisposableDatabase } from "../packages/database/src/reset-guard.ts";
import { nodeCompatible, runDoctor } from "../tools/doctor/src/checks.mjs";
import { packageManagerCommand, runCommand } from "./lib/process.mjs";

function readDatabaseUrl(source) {
  const line = String(source)
    .split(/\r?\n/u)
    .find((entry) => /^\s*(?:export\s+)?DATABASE_URL\s*=/u.test(entry));
  if (!line) {
    return undefined;
  }
  const value = line
    .replace(/^\s*(?:export\s+)?DATABASE_URL\s*=\s*/u, "")
    .trim();
  const quote = value.at(0);
  return (quote === '"' || quote === "'") && value.endsWith(quote)
    ? value.slice(1, -1)
    : value;
}

function setupFailure(summary, recovery) {
  return {
    exitCode: 1,
    human: `[PENYIAPAN] BELUM SIAP: ${summary}\n  Solusi: ${recovery}`,
  };
}

async function commandIsAvailable(
  commandRunner,
  command,
  argumentsList,
  rootDirectory,
) {
  return (
    (await commandRunner(command, argumentsList, { cwd: rootDirectory }))
      .exitCode === 0
  );
}

function defaultFileSystem() {
  return { exists: existsSync, copyFile, readFile };
}

export async function runSetup(options = {}) {
  const rootDirectory = options.rootDirectory ?? process.cwd();
  const command = options.command ?? runCommand;
  const fileSystem = options.fileSystem ?? defaultFileSystem();
  const doctor = options.runDoctor ?? runDoctor;
  const environmentFile = resolve(rootDirectory, ".env");
  const exampleFile = resolve(rootDirectory, ".env.example");

  if (!nodeCompatible(options.nodeVersion ?? process.version)) {
    return setupFailure(
      "Node.js 24 LTS belum kompatibel.",
      "Pasang Node.js 24 LTS, lalu jalankan pnpm run setup.",
    );
  }
  if (
    !(await commandIsAvailable(
      command,
      packageManagerCommand,
      ["--version"],
      rootDirectory,
    ))
  ) {
    return setupFailure(
      "pnpm belum tersedia.",
      "Aktifkan Corepack atau pasang pnpm, lalu jalankan pnpm run setup.",
    );
  }
  if (
    !(await commandIsAvailable(command, "git", ["--version"], rootDirectory))
  ) {
    return setupFailure(
      "Git belum tersedia.",
      "Pasang Git, lalu jalankan pnpm run setup.",
    );
  }

  if (!fileSystem.exists(environmentFile)) {
    if (!fileSystem.exists(exampleFile)) {
      return setupFailure(
        "Template .env.example tidak ditemukan.",
        "Pulihkan .env.example, lalu jalankan pnpm run setup.",
      );
    }
    await fileSystem.copyFile(exampleFile, environmentFile);
  }

  const databaseUrl =
    options.environment?.DATABASE_URL ??
    process.env.DATABASE_URL ??
    readDatabaseUrl(await fileSystem.readFile(environmentFile, "utf8"));
  try {
    assertDisposableDatabase(databaseUrl ?? "");
  } catch {
    return {
      exitCode: 2,
      human:
        "[DATABASE] DITOLAK: DATABASE_URL harus berupa PostgreSQL lokal disposable.\n  Solusi: Gunakan nilai dari .env.example, lalu jalankan pnpm run setup.",
    };
  }

  if (
    !(await commandIsAvailable(
      command,
      packageManagerCommand,
      ["install", "--frozen-lockfile=false"],
      rootDirectory,
    ))
  ) {
    return setupFailure(
      "Pemasangan paket belum selesai.",
      "Periksa koneksi paket lalu jalankan pnpm run setup lagi.",
    );
  }

  if (
    !(await commandIsAvailable(command, "docker", ["--version"], rootDirectory))
  ) {
    return setupFailure(
      "Docker belum tersedia.",
      "Pasang atau buka Docker Desktop, lalu jalankan pnpm run setup.",
    );
  }
  if (
    !(await commandIsAvailable(
      command,
      "docker",
      ["compose", "up", "-d", "--wait", "postgres"],
      rootDirectory,
    ))
  ) {
    return setupFailure(
      "PostgreSQL lokal belum dapat dijalankan.",
      "Buka Docker Desktop, tunggu sampai siap, lalu jalankan pnpm run setup.",
    );
  }

  for (const databaseCommand of ["generate", "migrate", "seed"]) {
    if (
      !(await commandIsAvailable(
        command,
        packageManagerCommand,
        ["--filter", "@safrs/database", databaseCommand],
        rootDirectory,
      ))
    ) {
      return setupFailure(
        "Database lokal belum selesai disiapkan.",
        "Jalankan pnpm run setup lagi setelah Docker Desktop siap.",
      );
    }
  }

  const report = await doctor({ rootDirectory });
  return { exitCode: report.exitCode, human: report.human };
}

const isMainModule =
  process.argv[1] &&
  resolve(process.argv[1]) === fileURLToPath(import.meta.url);
if (isMainModule) {
  try {
    const result = await runSetup();
    console.log(result.human);
    process.exitCode = result.exitCode;
  } catch {
    console.log(
      "[PENYIAPAN] BELUM SIAP: Penyiapan tidak dapat diselesaikan. Jalankan pnpm run setup lagi.",
    );
    process.exitCode = 1;
  }
}
