import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";

const root = fileURLToPath(new URL("../../../", import.meta.url));
const result = spawnSync(process.execPath, ["--test", "tools/automation/test/**/*.test.mjs"], {
  cwd: root,
  stdio: "inherit",
  shell: false,
});
if (result.error) throw result.error;
process.exitCode = result.status ?? 1;
