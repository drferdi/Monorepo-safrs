import { existsSync, readFileSync, readdirSync, statSync } from "node:fs";
import { dirname, isAbsolute, relative, resolve } from "node:path";

const capsule = process.cwd();
const inside = (file) => { const path = relative(capsule, file); return !path.startsWith("..") && !isAbsolute(path); };
const required = ["package-lock.json", "next.config.ts", ".next/BUILD_ID", ".next/standalone/server.js", ".next/standalone/package.json", ".next/static", "Dockerfile", ".next/standalone/mira/service/app.py", ".next/standalone/mira/requirements.lock", ".next/standalone/mira/SOURCE.json", ".next/standalone/scripts/run-system.mjs", ".next/standalone/scripts/install-mira.mjs"];
for (const file of required) {
  if (!existsSync(resolve(capsule, file))) throw new Error(`Missing deploy input: ${file}. Run npm ci and npm run build first.`);
}
let traces = 0;
function checkTraces(folder) {
  for (const name of readdirSync(folder)) {
    const file = resolve(folder, name);
    if (statSync(file).isDirectory()) { if (!["cache", "dev", "standalone"].includes(name)) checkTraces(file); }
    else if (name.endsWith(".nft.json")) {
      traces++;
      const trace = JSON.parse(readFileSync(file, "utf8"));
      for (const entry of trace.files) { const target = resolve(dirname(file), entry); if (!inside(target)) throw new Error(`Build trace escapes capsule: ${entry}`); if (!existsSync(target)) throw new Error(`Missing traced dependency: ${entry}`); }
    }
  }
}
checkTraces(resolve(capsule, ".next"));
const pkg = JSON.parse(readFileSync(resolve(capsule, "package.json"), "utf8"));
for (const [name, version] of Object.entries({ ...pkg.dependencies, ...pkg.devDependencies })) {
  if (/^(workspace:|file:|link:)/.test(version)) throw new Error(`Non-registry dependency: ${name}`);
}
console.log(JSON.stringify({ status: "PASS", project: pkg.name, buildId: readFileSync(resolve(capsule, ".next/BUILD_ID"), "utf8").trim(), tracesValidated: traces, externalSourceDependencies: 0, bundledMira: true, deployment: "Docker installs bundled MIRA and starts one managed system; exposes port 3000", sideEffects: "none - no deployment, credentials, containers, or remote writes" }, null, 2));
