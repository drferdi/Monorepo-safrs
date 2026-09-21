import { access } from "node:fs/promises";
import { join } from "node:path";

const buildId = join(process.cwd(), ".next", "BUILD_ID");
await access(buildId);
console.log("Deploy dry-run passed: Next.js production artifact is present.");
