import { execFileSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import { resolveLocalToolingDatabaseUrl } from "./local-tooling.ts";
import { assertDisposableDatabase } from "./reset-guard.ts";

const rootDirectory = fileURLToPath(new URL("../../../", import.meta.url));
const databaseUrl = resolveLocalToolingDatabaseUrl(process.env, rootDirectory);

assertDisposableDatabase(databaseUrl);
process.env.DATABASE_URL = databaseUrl;

const prismaCli = fileURLToPath(
  new URL("../node_modules/prisma/build/index.js", import.meta.url),
);

execFileSync(process.execPath, [prismaCli, "migrate", "reset", "--force"], {
  cwd: fileURLToPath(new URL("..", import.meta.url)),
  stdio: "inherit",
});

execFileSync(process.execPath, [prismaCli, "db", "seed"], {
  cwd: fileURLToPath(new URL("..", import.meta.url)),
  stdio: "inherit",
});
