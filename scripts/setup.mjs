import { constants, existsSync } from "node:fs";
import { copyFile, lstat, readFile } from "node:fs/promises";
import { resolve } from "node:path";
import { fileURLToPath } from "node:url";

import { assertDisposableDatabase } from "../packages/database/src/reset-guard.ts";
import { nodeCompatible, runDoctor } from "../tools/doctor/src/checks.mjs";
import {
  createAllowlistedEnvironment,
  packageManagerCommand,
  runCommand,
} from "./lib/process.mjs";

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

function readEnvironmentValue(source, name) {
  const escapedName = name.replace(/[.*+?^${}()|[\]\\]/gu, "\\$&");
  const expression = new RegExp(
    `^\\s*(?:export\\s+)?${escapedName}\\s*=\\s*(.*)$`,
    "mu",
  );
  const line = String(source)
    .split(/\r?\n/u)
    .find((entry) => expression.test(entry));
  if (!line) {
    return undefined;
  }
  const rawValue = line.replace(expression, "$1").trim();
  const quote = rawValue.at(0);
  return (quote === '"' || quote === "'") && rawValue.endsWith(quote)
    ? rawValue.slice(1, -1)
    : rawValue;
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
  environment,
) {
  return (
    (
      await commandRunner(command, argumentsList, {
        cwd: rootDirectory,
        env: environment,
      })
    ).exitCode === 0
  );
}

function defaultFileSystem() {
  return { exists: existsSync, copyFile, lstat, readFile };
}

async function ensureEnvironmentFile(fileSystem, exampleFile, environmentFile) {
  if (!fileSystem.exists(exampleFile)) {
    return false;
  }
  if (fileSystem.lstat) {
    try {
      if ((await fileSystem.lstat(environmentFile)).isSymbolicLink()) {
        return false;
      }
    } catch (error) {
      if (error?.code !== "ENOENT") {
        return false;
      }
    }
  }
  try {
    await fileSystem.copyFile(
      exampleFile,
      environmentFile,
      constants.COPYFILE_EXCL,
    );
    return true;
  } catch (error) {
    if (error?.code !== "EEXIST") {
      return false;
    }
    try {
      await fileSystem.readFile(environmentFile, "utf8");
      return true;
    } catch {
      return false;
    }
  }
}

export async function runSetup(options = {}) {
  const rootDirectory = options.rootDirectory ?? process.cwd();
  const command = options.command ?? runCommand;
  const fileSystem = options.fileSystem ?? defaultFileSystem();
  const doctor = options.runDoctor ?? runDoctor;
  const environmentFile = resolve(rootDirectory, ".env");
  const exampleFile = resolve(rootDirectory, ".env.example");
  const hostEnvironment = createAllowlistedEnvironment({});

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
      hostEnvironment,
    ))
  ) {
    return setupFailure(
      "pnpm belum tersedia.",
      "Aktifkan Corepack atau pasang pnpm, lalu jalankan pnpm run setup.",
    );
  }
  if (
    !(await commandIsAvailable(
      command,
      "git",
      ["--version"],
      rootDirectory,
      hostEnvironment,
    ))
  ) {
    return setupFailure(
      "Git belum tersedia.",
      "Pasang Git, lalu jalankan pnpm run setup.",
    );
  }

  if (
    !(await ensureEnvironmentFile(fileSystem, exampleFile, environmentFile))
  ) {
    return setupFailure(
      "File .env tidak dapat dibuat dengan aman.",
      "Periksa .env dan .env.example, lalu jalankan pnpm run setup.",
    );
  }

  let canonicalEnvironment;
  try {
    const source = await fileSystem.readFile(environmentFile, "utf8");
    canonicalEnvironment = {
      DATABASE_URL:
        options.environment?.DATABASE_URL ?? readDatabaseUrl(source),
      APP_URL: readEnvironmentValue(source, "APP_URL"),
      NODE_ENV: readEnvironmentValue(source, "NODE_ENV"),
    };
  } catch {
    return setupFailure(
      "File .env tidak dapat dibaca dengan aman.",
      "Periksa .env, lalu jalankan pnpm run setup.",
    );
  }
  try {
    assertDisposableDatabase(canonicalEnvironment.DATABASE_URL ?? "");
  } catch {
    return {
      exitCode: 2,
      human:
        "[DATABASE] DITOLAK: DATABASE_URL harus berupa PostgreSQL lokal disposable.\n  Solusi: Gunakan nilai dari .env.example, lalu jalankan pnpm run setup.",
    };
  }
  const setupEnvironment = createAllowlistedEnvironment(canonicalEnvironment);

  if (
    !(await commandIsAvailable(
      command,
      packageManagerCommand,
      ["install", "--frozen-lockfile=false"],
      rootDirectory,
      setupEnvironment,
    ))
  ) {
    return setupFailure(
      "Pemasangan paket belum selesai.",
      "Periksa koneksi paket lalu jalankan pnpm run setup lagi.",
    );
  }

  if (
    !(await commandIsAvailable(
      command,
      "docker",
      ["--version"],
      rootDirectory,
      setupEnvironment,
    ))
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
      ["compose", "up", "-d", "--force-recreate", "--wait", "postgres"],
      rootDirectory,
      setupEnvironment,
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
        setupEnvironment,
      ))
    ) {
      return setupFailure(
        "Database lokal belum selesai disiapkan.",
        "Jalankan pnpm run setup lagi setelah Docker Desktop siap.",
      );
    }
  }

  const report = await doctor({
    ...options.doctorOptions,
    rootDirectory,
    environment: canonicalEnvironment,
  });
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
