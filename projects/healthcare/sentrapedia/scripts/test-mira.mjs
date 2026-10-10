import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import { resolve } from "node:path";
import { installedPython } from "./mira-runtime.mjs";

const root = fileURLToPath(new URL("../", import.meta.url));
const result = spawnSync(installedPython(root), ["-I", resolve(root, "mira/test.py")], { cwd: root, stdio: "inherit", windowsHide: true });
process.exit(result.status ?? 1);
