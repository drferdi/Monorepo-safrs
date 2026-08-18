import { resolve } from "node:path";
import { fileURLToPath } from "node:url";

import {
  loadCanonicalEnvironment,
  runDoctor,
} from "../tools/doctor/src/checks.mjs";
import {
  createAllowlistedEnvironment,
  installSignalCleanup,
  packageManagerCommand,
  runCommand,
  startManagedProcess,
  stopManagedProcess,
} from "./lib/process.mjs";

function developmentFailure(summary, recovery) {
  return {
    exitCode: 1,
    human: `[PENGEMBANGAN] BELUM SIAP: ${summary}\n  Solusi: ${recovery}`,
  };
}

async function startTurboDevelopment(rootDirectory, environment) {
  const child = startManagedProcess(
    packageManagerCommand,
    ["turbo", "run", "dev", "--parallel"],
    {
      cwd: rootDirectory,
      env: environment,
      stdio: "inherit",
    },
  );
  const removeSignalCleanup = installSignalCleanup(() =>
    stopManagedProcess(child),
  );
  const exitCode = await new Promise((resolveExit) => {
    child.once("error", () => resolveExit(1));
    child.once("exit", (code) => resolveExit(code ?? 1));
  });
  removeSignalCleanup();
  return exitCode;
}

export async function runDevelopment(options = {}) {
  const rootDirectory = options.rootDirectory ?? process.cwd();
  const command = options.command ?? runCommand;
  const doctor = options.runDoctor ?? runDoctor;
  const loadEnvironment =
    options.loadCanonicalEnvironment ?? loadCanonicalEnvironment;
  let canonicalEnvironment;
  try {
    canonicalEnvironment = loadEnvironment({ rootDirectory });
  } catch {
    return developmentFailure(
      "File .env lokal belum aman atau belum tersedia.",
      "Jalankan pnpm run setup, lalu jalankan pnpm dev.",
    );
  }
  const developmentEnvironment =
    createAllowlistedEnvironment(canonicalEnvironment);
  const report = await doctor({
    rootDirectory,
    environment: canonicalEnvironment,
  });
  const blockingChecks = (report.checks ?? []).filter(
    (check) =>
      !check.ok && !["postgres-ready", "prisma-client"].includes(check.id),
  );
  if (report.exitCode === 2 || blockingChecks.length > 0) {
    return { exitCode: report.exitCode || 1, human: report.human };
  }

  const databaseStart = await command(
    "docker",
    ["compose", "up", "-d", "--force-recreate", "--wait", "postgres"],
    { cwd: rootDirectory, env: developmentEnvironment },
  );
  if (databaseStart.exitCode !== 0) {
    return developmentFailure(
      "PostgreSQL lokal belum dapat dijalankan.",
      "Buka Docker Desktop, tunggu sampai siap, lalu jalankan pnpm dev.",
    );
  }
  const generate = await command(
    packageManagerCommand,
    ["--filter", "@safrs/database", "generate"],
    { cwd: rootDirectory, env: developmentEnvironment },
  );
  if (generate.exitCode !== 0) {
    return developmentFailure(
      "Prisma Client belum dapat dibuat.",
      "Jalankan pnpm db:generate, lalu jalankan pnpm dev.",
    );
  }

  const startTurbo =
    options.startTurbo ??
    ((environment) => startTurboDevelopment(rootDirectory, environment));
  const exitCode = await startTurbo(developmentEnvironment);
  return { exitCode, human: "" };
}

const isMainModule =
  process.argv[1] &&
  resolve(process.argv[1]) === fileURLToPath(import.meta.url);
if (isMainModule) {
  try {
    const result = await runDevelopment();
    if (result.human) {
      console.log(result.human);
    }
    process.exitCode = result.exitCode;
  } catch {
    console.log(
      "[PENGEMBANGAN] BELUM SIAP: Startup tidak dapat diselesaikan. Jalankan pnpm run doctor.",
    );
    process.exitCode = 1;
  }
}
