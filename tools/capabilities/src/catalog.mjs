import {
  lstat,
  readdir,
  readFile,
  realpath,
  writeFile,
} from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import {
  maximumRisk,
  safeProjectSlug,
  validateCapabilities,
  validateManifest,
  validateText,
} from "./schema.mjs";

const moduleDirectory = path.dirname(fileURLToPath(import.meta.url));
const manifestsDirectory = path.resolve(moduleDirectory, "../manifests");

function isWithin(candidate, root) {
  const relative = path.relative(root, candidate);
  return (
    relative === "" ||
    (!relative.startsWith("..") && !path.isAbsolute(relative))
  );
}

async function canonicalDirectory(directory, label) {
  const resolved = path.resolve(directory);
  const info = await lstat(resolved);
  if (!info.isDirectory() || info.isSymbolicLink()) {
    throw new Error(
      `${label} must be a real directory, not a symbolic link or junction.`,
    );
  }
  return realpath(resolved);
}

async function projectDirectory(repoRoot, project) {
  const slug = safeProjectSlug(project);
  const canonicalRoot = await canonicalDirectory(repoRoot, "Repository root");
  const projectsRoot = await canonicalDirectory(
    path.join(canonicalRoot, "projects"),
    "projects directory",
  );
  const target = path.join(projectsRoot, slug);
  const info = await lstat(target);
  if (!info.isDirectory() || info.isSymbolicLink()) {
    throw new Error(
      "Project directory must be a real directory, not a symbolic link or junction.",
    );
  }
  const canonicalTarget = await realpath(target);
  if (!isWithin(canonicalTarget, projectsRoot)) {
    throw new Error("Project directory escapes the projects directory.");
  }
  return canonicalTarget;
}

export async function loadCatalog() {
  const names = (await readdir(manifestsDirectory))
    .filter((name) => name.endsWith(".json"))
    .sort();
  const catalog = new Map();
  for (const name of names) {
    const manifest = validateManifest(
      JSON.parse(await readFile(path.join(manifestsDirectory, name), "utf8")),
    );
    if (
      path.basename(name, ".json") !== manifest.id ||
      catalog.has(manifest.id)
    ) {
      throw new Error("Capability manifest identity is invalid.");
    }
    catalog.set(manifest.id, manifest);
  }
  return catalog;
}

async function selectedCapabilities(target) {
  const capsule = path.join(target, "capabilities.json");
  try {
    const info = await lstat(capsule);
    if (!info.isFile() || info.isSymbolicLink()) {
      throw new Error(
        "capabilities.json must be a regular file, not a symbolic link.",
      );
    }
    return validateCapabilities(JSON.parse(await readFile(capsule, "utf8")));
  } catch (error) {
    if (error?.code === "ENOENT") return { version: 1, capabilities: [] };
    throw error;
  }
}

function manifestFor(catalog, capabilityId) {
  if (typeof capabilityId !== "string" || !catalog.has(capabilityId)) {
    throw new Error("Unknown optional capability.");
  }
  return catalog.get(capabilityId);
}

export async function capabilityPreview({
  capabilityId,
  project,
  repoRoot = process.cwd(),
}) {
  const catalog = await loadCatalog();
  const manifest = manifestFor(catalog, capabilityId);
  safeProjectSlug(project);
  await projectDirectory(repoRoot, project);
  return [
    `Capability: ${manifest.label} (${manifest.id})`,
    `Project: ${project}`,
    `Risk: ${manifest.risk}`,
    `Files that will change: projects/${project}/capabilities.json`,
    `Dependencies: ${manifest.dependencies.join(", ") || "none"}`,
    `Environment: ${manifest.environment.join(", ") || "none"}`,
    `Commands: ${manifest.commands.join(", ") || "none"}`,
    `Tests: ${manifest.tests.join(", ") || "none"}`,
    `Sensitive paths: ${manifest.sensitivePaths.join(", ") || "none"}`,
    `Side effects: ${manifest.sideEffects.join("; ") || "none"}`,
    `Removal: ${manifest.removal}`,
    "Runtime integration is not installed by this selector; it remains a project-scoped R2 task.",
  ].join("\n");
}

export async function applyCapability({
  capabilityId,
  project,
  repoRoot = process.cwd(),
  confirmation,
  justification,
}) {
  const catalog = await loadCatalog();
  const manifest = manifestFor(catalog, capabilityId);
  const slug = safeProjectSlug(project);
  if (confirmation !== `ENABLE ${manifest.id} FOR ${slug}`) {
    throw new Error(
      `Confirmation must exactly equal ENABLE ${manifest.id} FOR ${slug}. No files were written.`,
    );
  }
  const pythonJustification =
    manifest.id === "python"
      ? validateText(justification, "technical justification")
      : undefined;
  const target = await projectDirectory(repoRoot, slug);
  const current = await selectedCapabilities(target);
  const retained = current.capabilities.map((selected) => ({ ...selected }));
  const existingIndex = retained.findIndex(
    (selected) => selected.id === manifest.id,
  );
  const next = { id: manifest.id, risk: manifest.risk };
  if (manifest.id === "python") next.justification = pythonJustification;
  if (existingIndex === -1) retained.push(next);
  else
    retained[existingIndex] = {
      ...retained[existingIndex],
      ...next,
      risk: maximumRisk(retained[existingIndex].risk, manifest.risk),
    };
  retained.sort((first, second) => first.id.localeCompare(second.id));
  const capsule = path.join(target, "capabilities.json");
  await writeFile(
    capsule,
    `${JSON.stringify({ version: 1, capabilities: retained }, null, 2)}\n`,
    { encoding: "utf8", flag: "w" },
  );
  return { version: 1, capabilities: retained };
}
