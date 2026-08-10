#!/usr/bin/env node
import { randomUUID } from "node:crypto";
import {
  lstat,
  mkdir,
  mkdtemp,
  open,
  readFile,
  realpath,
  rename,
  rm,
  unlink,
  writeFile,
} from "node:fs/promises";
import path from "node:path";
import { stderr, stdin, stdout } from "node:process";
import { createInterface } from "node:readline/promises";
import { normalizeProjectAnswers } from "./model.mjs";
import { renderProjectCapsule } from "./render.mjs";

function parseArgs(args) {
  const options = { repoRoot: process.cwd() };
  for (let index = 0; index < args.length; index += 1) {
    const argument = args[index];
    if (argument === "--") {
    } else if (argument === "--preview" || argument === "--apply") {
      if (options.mode)
        throw new Error("Use only one of --preview or --apply.");
      options.mode = argument.slice(2);
    } else if (
      argument === "--input" ||
      argument === "--repo-root" ||
      argument === "--confirm"
    ) {
      const value = args[index + 1];
      if (!value || value.startsWith("--"))
        throw new Error(`${argument} requires a value.`);
      options[
        argument
          .slice(2)
          .replace(/-([a-z])/g, (_, letter) => letter.toUpperCase())
      ] = value;
      index += 1;
    } else {
      throw new Error(`Unknown argument: ${argument}`);
    }
  }
  return options;
}

function sameIdentity(first, second) {
  return first.dev === second.dev && first.ino === second.ino;
}

function isWithin(candidate, root) {
  const relative = path.relative(root, candidate);
  return (
    relative === "" ||
    (!relative.startsWith("..") && !path.isAbsolute(relative))
  );
}

async function canonicalDirectory(directory, label) {
  const resolved = path.resolve(directory);
  const root = path.parse(resolved).root;
  const segments = [];
  for (
    let current = resolved;
    current !== root;
    current = path.dirname(current)
  ) {
    segments.unshift(path.basename(current));
  }

  let current = root;
  let canonicalParent = await realpath(root);
  for (const segment of segments) {
    current = path.join(current, segment);
    const info = await lstat(current);
    if (!info.isDirectory() || info.isSymbolicLink()) {
      throw new Error(
        `${label} must be a real directory, not a symbolic link.`,
      );
    }
    const canonical = await realpath(current);
    if (!isWithin(canonical, canonicalParent)) {
      throw new Error(`${label} contains a symbolic link or junction.`);
    }
    canonicalParent = canonical;
  }
  return canonicalParent;
}

async function loadInput(inputPath) {
  const source = await readFile(path.resolve(inputPath), "utf8");
  try {
    const parsed = JSON.parse(source);
    if (!parsed || typeof parsed !== "object" || Array.isArray(parsed))
      throw new Error("Input JSON must be an object.");
    return parsed;
  } catch (error) {
    if (error instanceof SyntaxError)
      throw new Error(`Input JSON is invalid: ${error.message}`);
    throw error;
  }
}

async function askForInput() {
  const prompt = createInterface({ input: stdin, output: stdout });
  try {
    const name = await prompt.question("Nama proyek: ");
    const problem = await prompt.question("Masalah yang diselesaikan: ");
    const kind = await prompt.question("Jenis (web/desktop/extension): ");
    const capabilities = await prompt.question(
      "Kemampuan (pisahkan dengan koma, atau kosong): ",
    );
    const sensitiveDomains = await prompt.question(
      "Domain sensitif (pisahkan dengan koma, atau kosong): ",
    );
    return {
      name,
      problem,
      kind,
      capabilities: capabilities.trim()
        ? capabilities.split(",").map((item) => item.trim())
        : [],
      sensitiveDomains: sensitiveDomains.trim()
        ? sensitiveDomains.split(",").map((item) => item.trim())
        : [],
    };
  } finally {
    prompt.close();
  }
}

export function previewText(model, files) {
  const destination = `projects/${model.slug}`;
  return [
    "Pratinjau kapsul proyek SAFRS",
    `Destination: ${destination}`,
    `App binding: ${model.appBinding}`,
    `Capabilities: ${model.capabilities.length ? model.capabilities.join(", ") : "none"}`,
    `Sensitive domains: ${model.sensitiveDomains.length ? model.sensitiveDomains.join(", ") : "none"}`,
    `Computed risk: ${model.risk}`,
    "Files:",
    ...files.map((file) => `- ${destination}/${file.relativePath}`),
  ].join("\n");
}

async function destinationExists(destination) {
  try {
    await lstat(destination);
    return true;
  } catch (error) {
    if (error && error.code === "ENOENT") return false;
    throw error;
  }
}

async function acquireSlugLock(projectsRoot, slug) {
  const lockPath = path.join(projectsRoot, `.${slug}.lock`);
  const marker = randomUUID();
  let handle;
  try {
    handle = await open(lockPath, "wx");
    await handle.writeFile(marker, "utf8");
    return { handle, identity: await handle.stat(), lockPath, marker };
  } catch (error) {
    await handle?.close();
    if (error?.code === "EEXIST") {
      throw new Error(`Project creation is already in progress for ${slug}.`);
    }
    throw error;
  }
}

async function releaseSlugLock(lock) {
  try {
    const current = await lstat(lock.lockPath);
    const content = await readFile(lock.lockPath, "utf8");
    if (
      !current.isSymbolicLink() &&
      sameIdentity(current, lock.identity) &&
      content === lock.marker
    ) {
      await unlink(lock.lockPath);
    }
  } catch (error) {
    if (error?.code !== "ENOENT") throw error;
  } finally {
    await lock.handle.close();
  }
}

async function createOwnedDirectory(parent, prefix, markerName) {
  const directory = await mkdtemp(path.join(parent, prefix));
  const marker = randomUUID();
  const directoryIdentity = await lstat(directory);
  const markerPath = path.join(directory, markerName);
  await writeFile(markerPath, marker, { encoding: "utf8", flag: "wx" });
  return {
    directory,
    directoryIdentity,
    marker,
    markerIdentity: await lstat(markerPath),
    markerName,
  };
}

async function ownsDirectory(state) {
  try {
    const directory = await lstat(state.directory);
    const markerPath = path.join(state.directory, state.markerName);
    const marker = await lstat(markerPath);
    if (
      !directory.isDirectory() ||
      directory.isSymbolicLink() ||
      marker.isSymbolicLink() ||
      !marker.isFile() ||
      !sameIdentity(directory, state.directoryIdentity) ||
      !sameIdentity(marker, state.markerIdentity)
    ) {
      return false;
    }
    return (await readFile(markerPath, "utf8")) === state.marker;
  } catch (error) {
    if (error?.code === "ENOENT") return false;
    throw error;
  }
}

async function cleanupOwnedDirectory(state) {
  if (await ownsDirectory(state)) {
    await rm(state.directory, { recursive: true, force: true });
    return true;
  }
  return false;
}

async function removeCompletionMarker(state) {
  if (!(await ownsDirectory(state))) {
    throw new Error("Published project changed before completion.");
  }
  await unlink(path.join(state.directory, state.markerName));
}

async function ensureOwnedDirectoryTree(root, target) {
  const relative = path.relative(root, path.dirname(target));
  let current = root;
  for (const segment of relative === "" ? [] : relative.split(path.sep)) {
    current = path.join(current, segment);
    const info = await lstat(current);
    if (!info.isDirectory() || info.isSymbolicLink()) {
      throw new Error("Project write path contains a symbolic link.");
    }
  }
}

async function writeCapsuleFiles(files, root) {
  for (const file of files) {
    if (
      !file ||
      typeof file.relativePath !== "string" ||
      typeof file.content !== "string"
    ) {
      throw new TypeError(
        "Rendered capsule files must contain paths and text.",
      );
    }
    const target = path.resolve(root, ...file.relativePath.split("/"));
    if (!isWithin(target, root) || target === root) {
      throw new Error("Rendered file escapes its owned directory.");
    }
    await mkdir(path.dirname(target), { recursive: true });
    await ensureOwnedDirectoryTree(root, target);
    await writeFile(target, file.content, { encoding: "utf8", flag: "wx" });
  }
}

async function reserveDestination(projectsRoot, slug) {
  const destination = path.join(projectsRoot, slug);
  try {
    await mkdir(destination);
  } catch (error) {
    if (error?.code === "EEXIST") {
      throw new Error(`Destination already exists: projects/${slug}`);
    }
    throw error;
  }
  const markerName = ".safrs-project-wizard-incomplete";
  const marker = randomUUID();
  const directoryIdentity = await lstat(destination);
  const markerPath = path.join(destination, markerName);
  await writeFile(markerPath, marker, { encoding: "utf8", flag: "wx" });
  return {
    directory: destination,
    directoryIdentity,
    marker,
    markerIdentity: await lstat(markerPath),
    markerName,
  };
}

async function publishWithoutClobber(files, projectsRoot, slug, hooks) {
  if (hooks?.beforePublish) await hooks.beforePublish();
  const destination = path.join(projectsRoot, slug);
  if (!isWithin(destination, projectsRoot)) {
    throw new Error("Project destination escapes the projects directory.");
  }

  if (process.platform === "win32") {
    if (await destinationExists(destination)) {
      throw new Error(`Destination already exists: projects/${slug}`);
    }
    return null;
  }

  const reservation = await reserveDestination(projectsRoot, slug);
  try {
    await writeCapsuleFiles(files, reservation.directory);
    await removeCompletionMarker(reservation);
    return reservation;
  } catch (error) {
    await cleanupOwnedDirectory(reservation);
    throw error;
  }
}

/**
 * Apply a complete capsule with one exclusive per-slug lock and no replacement.
 * The optional fourth argument provides deterministic race hooks for tests only.
 */
export async function applyProjectCapsule(files, projectsRoot, slug, hooks) {
  const canonicalProjectsRoot = await canonicalDirectory(
    projectsRoot,
    "projects directory",
  );
  const lock = await acquireSlugLock(canonicalProjectsRoot, slug);
  let stage;
  let published = false;
  try {
    const destination = path.join(canonicalProjectsRoot, slug);
    if (!isWithin(destination, canonicalProjectsRoot)) {
      throw new Error("Project destination escapes the projects directory.");
    }
    if (await destinationExists(destination)) {
      throw new Error(`Destination already exists: projects/${slug}`);
    }

    stage = await createOwnedDirectory(
      canonicalProjectsRoot,
      `.${slug}-stage-`,
      ".safrs-project-wizard-stage.json",
    );
    if (hooks?.afterStageReady) await hooks.afterStageReady(stage.directory);
    if (!(await ownsDirectory(stage))) {
      throw new Error(
        "Project staging directory changed while being prepared.",
      );
    }
    await writeCapsuleFiles(files, stage.directory);
    if (!(await ownsDirectory(stage))) {
      throw new Error(
        "Project staging directory changed while being prepared.",
      );
    }

    const revalidatedProjectsRoot = await canonicalDirectory(
      projectsRoot,
      "projects directory",
    );
    if (revalidatedProjectsRoot !== canonicalProjectsRoot) {
      throw new Error("projects directory changed while being prepared.");
    }

    const reservation = await publishWithoutClobber(
      files,
      canonicalProjectsRoot,
      slug,
      hooks,
    );
    if (process.platform === "win32") {
      const destination = path.join(canonicalProjectsRoot, slug);
      try {
        await rename(stage.directory, destination);
      } catch (error) {
        if (error?.code === "EEXIST" || error?.code === "ENOTEMPTY") {
          throw new Error(`Destination already exists: projects/${slug}`);
        }
        throw error;
      }
      stage.directory = destination;
      await removeCompletionMarker(stage);
    } else if (!reservation) {
      throw new Error("Project destination reservation failed.");
    }
    published = true;
  } finally {
    if (stage && !published) await cleanupOwnedDirectory(stage);
    if (stage && published && process.platform !== "win32") {
      await cleanupOwnedDirectory(stage);
    }
    await releaseSlugLock(lock);
  }
}

async function interactiveConfirmation(slug) {
  const prompt = createInterface({ input: stdin, output: stdout });
  try {
    return await prompt.question(
      `Ketik CREATE ${slug} untuk membuat kapsul, atau tekan Enter untuk batal: `,
    );
  } finally {
    prompt.close();
  }
}

export async function run(options) {
  const repoRoot = await canonicalDirectory(
    options.repoRoot,
    "Repository root",
  );
  const projectsRoot = await canonicalDirectory(
    path.join(repoRoot, "projects"),
    "projects directory",
  );
  const templateRoot = path.join(projectsRoot, "_template");
  const rawInput = options.input
    ? await loadInput(options.input)
    : await askForInput();
  const model = normalizeProjectAnswers(rawInput);
  const files = renderProjectCapsule(model, templateRoot);

  stdout.write(`${previewText(model, files)}\n`);
  if (options.mode === "preview" || (!options.mode && options.input)) return 0;

  const confirmation =
    options.confirm ??
    rawInput.confirmation ??
    (options.input ? undefined : await interactiveConfirmation(model.slug));
  if (confirmation !== `CREATE ${model.slug}`) {
    throw new Error(
      `Confirmation must exactly equal CREATE ${model.slug}. No files were written.`,
    );
  }
  await applyProjectCapsule(files, projectsRoot, model.slug);
  stdout.write(`Created: projects/${model.slug}\n`);
  return 0;
}

async function main() {
  try {
    process.exitCode = await run(parseArgs(process.argv.slice(2)));
  } catch (error) {
    stderr.write(`Error: ${error.message}\n`);
    process.exitCode = 1;
  }
}

if (import.meta.main) await main();
