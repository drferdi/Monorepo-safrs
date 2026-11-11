import { assertDisposableTestDatabase } from "@safrs/database/reset-guard";

type Environment = Readonly<Record<string, string | undefined>>;

function rejectEnvironment(): never {
  throw new Error(
    "[E2E] DATABASE_URL DITOLAK: gunakan database PostgreSQL lokal disposable berakhiran _test melalui pnpm test:e2e.",
  );
}

export function resolvePlaywrightEnvironment(environment: Environment) {
  const databaseUrl = environment.DATABASE_URL;

  if (!databaseUrl) {
    return rejectEnvironment();
  }

  try {
    assertDisposableTestDatabase(databaseUrl);
  } catch {
    return rejectEnvironment();
  }

  return {
    APP_URL: environment.APP_URL ?? "http://127.0.0.1:3001",
    DATABASE_URL: databaseUrl,
    NODE_ENV: "test",
  };
}
