import { execFileSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import { resolveLocalToolingDatabaseUrl } from "../src/local-tooling.ts";

const commandArguments = {
  generate: ["generate"],
  migrate: ["migrate", "deploy"],
  seed: ["db", "seed"],
  studio: ["studio"],
};

const command = process.argv[2];
const prismaArguments = commandArguments[command];

if (!prismaArguments) {
  throw new Error(
    "[DATABASE] LOCAL TOOLING DITOLAK: perintah Prisma tidak dikenal.",
  );
}

const packageDirectory = fileURLToPath(new URL("..", import.meta.url));
const rootDirectory = fileURLToPath(new URL("../../../", import.meta.url));
const databaseUrl = resolveLocalToolingDatabaseUrl(process.env, rootDirectory);
const prismaCli = fileURLToPath(
  new URL("../node_modules/prisma/build/index.js", import.meta.url),
);

execFileSync(process.execPath, [prismaCli, ...prismaArguments], {
  cwd: packageDirectory,
  env: { ...process.env, DATABASE_URL: databaseUrl },
  stdio: "inherit",
});
