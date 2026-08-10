import { loadCanonicalEnvironment } from "../tools/doctor/src/checks.mjs";
import { packageManagerCommand, runCommand } from "./lib/process.mjs";

const rootDirectory = process.cwd();
const environment = {
  ...process.env,
  ...loadCanonicalEnvironment({ rootDirectory }),
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
