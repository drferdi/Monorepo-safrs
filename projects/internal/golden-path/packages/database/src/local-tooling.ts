import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { assertDisposableDatabase } from "./reset-guard.ts";

type Environment = Readonly<Record<string, string | undefined>>;

function rejectLocalTooling(): never {
  throw new Error(
    "[DATABASE] LOCAL TOOLING DITOLAK: DATABASE_URL lokal yang valid wajib tersedia.",
  );
}

function readDatabaseUrl(environmentFile: string): string | undefined {
  const databaseUrlLine = readFileSync(environmentFile, "utf8")
    .split(/\r?\n/u)
    .find((line) => /^\s*(?:export\s+)?DATABASE_URL\s*=/u.test(line));

  if (!databaseUrlLine) {
    return undefined;
  }

  const value = databaseUrlLine.replace(
    /^\s*(?:export\s+)?DATABASE_URL\s*=\s*/u,
    "",
  );
  const quote = value.at(0);

  if ((quote === '"' || quote === "'") && value.endsWith(quote)) {
    return value.slice(1, -1);
  }

  return value.trim();
}

export function resolveLocalToolingDatabaseUrl(
  environment: Environment,
  rootDirectory: string,
): string {
  if (environment.DATABASE_URL !== undefined) {
    assertDisposableDatabase(environment.DATABASE_URL);
    return environment.DATABASE_URL;
  }

  const environmentFile = join(rootDirectory, ".env");
  const fallbackFile = join(rootDirectory, ".env.example");
  const declaredDatabaseUrl = existsSync(environmentFile)
    ? readDatabaseUrl(environmentFile)
    : existsSync(fallbackFile)
      ? readDatabaseUrl(fallbackFile)
      : undefined;

  if (!declaredDatabaseUrl) {
    return rejectLocalTooling();
  }

  assertDisposableDatabase(declaredDatabaseUrl);
  return declaredDatabaseUrl;
}
