import { loadCanonicalEnvironment } from "../tools/doctor/src/checks.mjs";
import { packageManagerCommand, runCommand } from "./lib/process.mjs";

const rootDirectory = process.cwd();
const canonicalEnvironment = process.env.DATABASE_URL
  ? {
      APP_URL: process.env.APP_URL ?? "http://127.0.0.1:3000",
      DATABASE_URL: process.env.DATABASE_URL,
      NODE_ENV: process.env.NODE_ENV ?? "test",
    }
  : loadCanonicalEnvironment({ rootDirectory });
const environment = {
  ...process.env,
  ...canonicalEnvironment,
  DATABASE_INTEGRATION_TESTS: "1",
};

for (const argumentsList of [["test:contracts"], ["turbo", "run", "test"]]) {
  const result = await runCommand(packageManagerCommand, argumentsList, {
    cwd: rootDirectory,
    env: environment,
  });
  process.stdout.write(result.stdout);
  process.stderr.write(result.stderr);

  if (result.exitCode !== 0) {
    process.exitCode = result.exitCode;
    break;
  }
}
