import { createHash } from "node:crypto";
import { lstat, readdir, readFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const output = path.join(root, "dist");
const pinnedImage =
  "node:24-alpine3.22@sha256:191c9f0080fcbbc6547a85dc0ff7988072214a355aabdc1d2ec55a7dae5eea8a";

const outputInfo = await lstat(output);
if (!outputInfo.isDirectory() || outputInfo.isSymbolicLink()) {
  throw new Error(
    "Deployment dry-run requires a safe capsule-owned dist directory. Run build first.",
  );
}

const manifest = JSON.parse(
  await readFile(path.join(output, "build-manifest.json"), "utf8"),
);
if (manifest.schemaVersion !== 1 || !Array.isArray(manifest.files)) {
  throw new Error("Deployment dry-run found an invalid build manifest.");
}

async function artifactPaths(directory, prefix = "") {
  const paths = [];
  const entries = await readdir(directory, { withFileTypes: true });
  for (const entry of entries.sort((first, second) =>
    first.name.localeCompare(second.name),
  )) {
    const relative = path.posix.join(prefix, entry.name);
    const candidate = path.join(directory, entry.name);
    const info = await lstat(candidate);
    if (info.isSymbolicLink()) {
      throw new Error(
        `Deployment artifact contains a symbolic link: ${relative}`,
      );
    }
    if (info.isDirectory()) {
      paths.push(...(await artifactPaths(candidate, relative)));
    } else if (info.isFile() && relative !== "build-manifest.json") {
      paths.push(relative);
    } else if (!info.isFile()) {
      throw new Error(
        `Deployment artifact contains an unsupported entry: ${relative}`,
      );
    }
  }
  return paths;
}

if (
  manifest.files.some(
    (entry) =>
      entry === null || typeof entry !== "object" || Array.isArray(entry),
  )
) {
  throw new Error("Build manifest entries must be objects.");
}
const declaredPaths = manifest.files.map((entry) => entry.path).sort();
if (
  declaredPaths.some((entry) => typeof entry !== "string") ||
  new Set(declaredPaths).size !== declaredPaths.length
) {
  throw new Error("Build manifest paths must be unique strings.");
}
const actualPaths = (await artifactPaths(output)).sort();
if (JSON.stringify(actualPaths) !== JSON.stringify(declaredPaths)) {
  throw new Error("Deployment artifact contains missing or undeclared files.");
}
for (const entry of manifest.files) {
  const candidate = path.resolve(output, entry.path);
  const relative = path.relative(output, candidate);
  if (relative.startsWith("..") || path.isAbsolute(relative)) {
    throw new Error(`Build manifest path escapes dist: ${entry.path}`);
  }
  const info = await lstat(candidate);
  if (!info.isFile() || info.isSymbolicLink()) {
    throw new Error(`Build manifest entry is unsafe: ${entry.path}`);
  }
  const content = await readFile(candidate);
  if (
    !Number.isInteger(entry.bytes) ||
    entry.bytes < 0 ||
    typeof entry.sha256 !== "string" ||
    !/^[a-f0-9]{64}$/u.test(entry.sha256)
  ) {
    throw new Error(`Build manifest metadata is invalid: ${entry.path}`);
  }
  const digest = createHash("sha256").update(content).digest("hex");
  if (content.length !== entry.bytes || digest !== entry.sha256) {
    throw new Error(`Build manifest integrity mismatch: ${entry.path}`);
  }
}

const dockerfile = await readFile(path.join(root, "Dockerfile"), "utf8");
if (dockerfile.split(pinnedImage).length - 1 !== 2) {
  throw new Error(
    "Dockerfile must pin both build and runtime images by the approved digest.",
  );
}
if (dockerfile.includes("../")) {
  throw new Error("Dockerfile must not reference a parent path.");
}
for (const required of [
  'RUN ["node", "scripts/install.mjs"]',
  'RUN ["node", "scripts/build.mjs"]',
  "COPY --from=build --chown=node:node /workspace/dist/ ./",
  "USER node",
  'CMD ["node", "server.js"]',
]) {
  if (!dockerfile.includes(required)) {
    throw new Error(`Dockerfile deployment contract is missing: ${required}`);
  }
}

console.log(
  `Deployment dry-run: PASS (${manifest.files.length} verified artifact files; no external write).`,
);
