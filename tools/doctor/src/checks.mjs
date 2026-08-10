import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";

import { assertDisposableDatabase } from "../../../packages/database/src/reset-guard.ts";
import {
  packageManagerCommand,
  runCommand,
} from "../../../scripts/lib/process.mjs";
import {
  redactText,
  renderDoctorReport,
  renderTechnicalReport,
} from "./messages.mjs";

const nodePolicy = { major: 24, minimumMinor: 18 };
const generatedClientFile = "packages/database/src/generated/prisma/client.ts";

function result(
  ok,
  area,
  id,
  summary,
  recovery,
  technical = "",
  severity = "recoverable",
) {
  return {
    id,
    ok,
    severity: ok ? "info" : severity,
    area,
    summary,
    recovery,
    technical,
  };
}

function commandSucceeded(commandResult) {
  return (
    commandResult &&
    (commandResult.exitCode === undefined || commandResult.exitCode === 0)
  );
}

function compactFailure(commandResult, environment) {
  return redactText(
    commandResult?.stderr || commandResult?.stdout || "perintah tidak tersedia",
    environment,
  )
    .replace(/\s+/gu, " ")
    .slice(0, 180);
}

function parseEnvironmentDatabaseUrl(source) {
  const line = String(source)
    .split(/\r?\n/u)
    .find((entry) => /^\s*(?:export\s+)?DATABASE_URL\s*=/u.test(entry));
  if (!line) {
    return undefined;
  }
  const rawValue = line
    .replace(/^\s*(?:export\s+)?DATABASE_URL\s*=\s*/u, "")
    .trim();
  const quote = rawValue.at(0);
  return (quote === '"' || quote === "'") && rawValue.endsWith(quote)
    ? rawValue.slice(1, -1)
    : rawValue;
}

export function nodeCompatible(version) {
  const match = /^v?(\d+)\.(\d+)\.(\d+)/u.exec(version ?? "");
  if (!match) {
    return false;
  }
  const major = Number(match[1]);
  const minor = Number(match[2]);
  return major === nodePolicy.major && minor >= nodePolicy.minimumMinor;
}

function defaultFileSystem() {
  return { exists: existsSync, readFile: readFileSync };
}

export async function runDoctor(options = {}) {
  const rootDirectory = options.rootDirectory ?? process.cwd();
  const environment = {
    DATABASE_URL: options.environment?.DATABASE_URL ?? process.env.DATABASE_URL,
  };
  const suppliedEnvironment = options.environment ?? environment;
  const fileSystem = options.fileSystem ?? defaultFileSystem();
  const command = options.command ?? runCommand;
  const environmentFile = join(rootDirectory, ".env");
  const checks = [];

  checks.push(
    nodeCompatible(options.nodeVersion ?? process.version)
      ? result(true, "NODE", "node", "Node.js 24 LTS kompatibel.", "")
      : result(
          false,
          "NODE",
          "node",
          "Node.js 24 LTS belum kompatibel.",
          "Pasang Node.js 24 LTS, lalu jalankan pnpm run doctor.",
        ),
  );

  const pnpm = await command(packageManagerCommand, ["--version"], {
    cwd: rootDirectory,
  });
  checks.push(
    commandSucceeded(pnpm)
      ? result(true, "PNPM", "pnpm", "pnpm tersedia.", "")
      : result(
          false,
          "PNPM",
          "pnpm",
          "pnpm belum tersedia.",
          "Aktifkan Corepack atau pasang pnpm, lalu jalankan pnpm run doctor.",
          compactFailure(pnpm, suppliedEnvironment),
        ),
  );

  const git = await command("git", ["--version"], { cwd: rootDirectory });
  checks.push(
    commandSucceeded(git)
      ? result(true, "GIT", "git", "Git tersedia.", "")
      : result(
          false,
          "GIT",
          "git",
          "Git belum tersedia.",
          "Pasang Git, lalu jalankan pnpm run doctor.",
          compactFailure(git, suppliedEnvironment),
        ),
  );

  const dockerVersion = await command("docker", ["--version"], {
    cwd: rootDirectory,
  });
  checks.push(
    commandSucceeded(dockerVersion)
      ? result(true, "DOCKER", "docker-installed", "Docker tersedia.", "")
      : result(
          false,
          "DOCKER",
          "docker-installed",
          "Docker belum tersedia.",
          "Pasang Docker Desktop, lalu jalankan pnpm run doctor.",
          compactFailure(dockerVersion, suppliedEnvironment),
        ),
  );

  const dockerEngine = commandSucceeded(dockerVersion)
    ? await command("docker", ["info", "--format", "{{.ServerVersion}}"], {
        cwd: rootDirectory,
      })
    : { exitCode: 1, stderr: "Docker belum terpasang" };
  checks.push(
    commandSucceeded(dockerEngine)
      ? result(
          true,
          "DOCKER",
          "docker-engine",
          "Docker Desktop sedang berjalan.",
          "",
        )
      : result(
          false,
          "DOCKER",
          "docker-engine",
          "Mesin Docker belum berjalan.",
          "Buka Docker Desktop, tunggu sampai siap, lalu jalankan pnpm dev.",
          compactFailure(dockerEngine, suppliedEnvironment),
        ),
  );

  const environmentExists = fileSystem.exists(environmentFile);
  checks.push(
    environmentExists
      ? result(true, "ENV", "environment-file", "File .env tersedia.", "")
      : result(
          false,
          "ENV",
          "environment-file",
          "File .env belum tersedia.",
          "Jalankan pnpm run setup untuk membuat .env dari .env.example.",
        ),
  );

  let databaseUrl = environment.DATABASE_URL;
  if (!databaseUrl && environmentExists) {
    databaseUrl = parseEnvironmentDatabaseUrl(
      fileSystem.readFile(environmentFile, "utf8"),
    );
  }
  let databaseSafe = false;
  if (databaseUrl) {
    try {
      assertDisposableDatabase(databaseUrl);
      databaseSafe = true;
    } catch {
      databaseSafe = false;
    }
  }
  checks.push(
    databaseSafe
      ? result(
          true,
          "DATABASE",
          "database-url",
          "DATABASE_URL menunjuk PostgreSQL lokal disposable.",
          "",
        )
      : result(
          false,
          "DATABASE",
          "database-url",
          "DATABASE_URL lokal yang aman belum tersedia.",
          "Gunakan DATABASE_URL dari .env.example; jangan gunakan database eksternal atau produksi.",
          "Nilai DATABASE_URL ditolak atau tidak tersedia.",
          databaseUrl ? "unsafe" : "recoverable",
        ),
  );

  const databaseReady =
    databaseSafe && commandSucceeded(dockerEngine)
      ? await command(
          "docker",
          [
            "compose",
            "exec",
            "-T",
            "postgres",
            "pg_isready",
            "-U",
            "safrs",
            "-d",
            "safrs_local",
          ],
          { cwd: rootDirectory },
        )
      : { exitCode: 1, stderr: "prasyarat database belum siap" };
  checks.push(
    commandSucceeded(databaseReady)
      ? result(true, "POSTGRES", "postgres-ready", "PostgreSQL lokal siap.", "")
      : result(
          false,
          "POSTGRES",
          "postgres-ready",
          "PostgreSQL lokal belum siap.",
          "Buka Docker Desktop lalu jalankan pnpm run setup atau pnpm dev.",
          compactFailure(databaseReady, suppliedEnvironment),
        ),
  );

  const clientReady = fileSystem.exists(
    join(rootDirectory, generatedClientFile),
  );
  checks.push(
    clientReady
      ? result(
          true,
          "PRISMA",
          "prisma-client",
          "Prisma Client sudah dibuat.",
          "",
        )
      : result(
          false,
          "PRISMA",
          "prisma-client",
          "Prisma Client belum dibuat.",
          "Jalankan pnpm db:generate, lalu jalankan pnpm run doctor.",
        ),
  );

  const unsafe = checks.some((check) => check.severity === "unsafe");
  const ok = checks.every((check) => check.ok);
  return {
    ok,
    exitCode: unsafe ? 2 : ok ? 0 : 1,
    checks,
    human: renderDoctorReport(checks, suppliedEnvironment),
    technical: renderTechnicalReport(checks, suppliedEnvironment),
  };
}
