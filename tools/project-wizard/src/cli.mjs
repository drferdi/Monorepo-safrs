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

async function acquireSlugLock(projectsRoot, slug, hooks) {
  const lockPath = path.join(projectsRoot, `.${slug}.lock`);
  const marker = randomUUID();
  let handle;
  let identity;
  try {
    handle = await open(lockPath, "wx");
    if (hooks?.afterLockOpen)
      await hooks.afterLockOpen({ handle, lockPath, marker });
    identity = await handle.stat();
    if (hooks?.afterLockStat)
      await hooks.afterLockStat({ handle, identity, lockPath, marker });
    await handle.writeFile(marker, "utf8");
    if (hooks?.afterLockWrite)
      await hooks.afterLockWrite({ handle, identity, lockPath, marker });
    return { handle, identity, lockPath, marker };
  } catch (error) {
    const cleanupErrors = [];
    if (!identity && handle) {
      try {
        identity = await handle.stat();
      } catch (cleanupError) {
        cleanupErrors.push(cleanupError);
      }
    }
    try {
      await handle?.close();
    } catch (cleanupError) {
      cleanupErrors.push(cleanupError);
    }
    if (identity) {
      const quarantine = path.join(
        path.dirname(lockPath),
        `.${path.basename(lockPath)}.quarantine-${randomUUID()}`,
      );
      try {
        const current = await lstat(lockPath);
        if (sameIdentity(current, identity)) {
          await rename(lockPath, quarantine);
          if (sameIdentity(await lstat(quarantine), identity))
            await unlink(quarantine);
        }
      } catch (cleanupError) {
        if (cleanupError?.code !== "ENOENT") cleanupErrors.push(cleanupError);
      }
    }
    if (cleanupErrors.length) {
      throw new AggregateError(
        [error, ...cleanupErrors],
        "Lock initialization failed with cleanup failure.",
      );
    }
    if (error?.code === "EEXIST") {
      throw new Error(`Project creation is already in progress for ${slug}.`);
    }
    throw error;
  }
}

async function cleanupBareDirectory(directory, directoryIdentity) {
  const quarantine = path.join(
    path.dirname(directory),
    `.${path.basename(directory)}.quarantine-${randomUUID()}`,
  );
  const current = await lstat(directory);
  if (
    !current.isDirectory() ||
    current.isSymbolicLink() ||
    !sameIdentity(current, directoryIdentity)
  )
    return false;
  await rename(directory, quarantine);
  const moved = await lstat(quarantine);
  if (!sameIdentity(moved, directoryIdentity))
    throw new Error(
      "Directory changed while quarantining; quarantine preserved.",
    );
  await rm(quarantine, { recursive: true, force: true });
  return true;
}

async function releaseSlugLock(lock) {
  await lock.handle.close();
  const quarantine = path.join(
    path.dirname(lock.lockPath),
    `.${path.basename(lock.lockPath)}.quarantine-${randomUUID()}`,
  );
  try {
    const current = await lstat(lock.lockPath);
    const content = await readFile(lock.lockPath, "utf8");
    if (
      !current.isSymbolicLink() &&
      sameIdentity(current, lock.identity) &&
      content === lock.marker
    ) {
      await rename(lock.lockPath, quarantine);
      const moved = await lstat(quarantine);
      if (
        !sameIdentity(moved, lock.identity) ||
        (await readFile(quarantine, "utf8")) !== lock.marker
      ) {
        throw new Error(
          "Slug lock changed while being released; quarantine preserved.",
        );
      }
      await unlink(quarantine);
    }
  } catch (error) {
    if (error?.code !== "ENOENT") throw error;
  }
}

async function createOwnedDirectory(parent, prefix, markerName, hooks) {
  const directory = await mkdtemp(path.join(parent, prefix));
  const directoryIdentity = await lstat(directory);
  try {
    if (hooks?.afterMkdtemp)
      await hooks.afterMkdtemp({ directory, directoryIdentity });
    const marker = randomUUID();
    const markerPath = path.join(directory, markerName);
    await writeFile(markerPath, marker, { encoding: "utf8", flag: "wx" });
    if (hooks?.afterMarkerWrite)
      await hooks.afterMarkerWrite({
        directory,
        directoryIdentity,
        marker,
        markerPath,
      });
    const markerIdentity = await lstat(markerPath);
    if (hooks?.afterMarkerStat) {
      await hooks.afterMarkerStat({
        directory,
        directoryIdentity,
        marker,
        markerPath,
        markerIdentity,
      });
    }
    return {
      directory,
      directoryIdentity,
      marker,
      markerIdentity,
      markerName,
    };
  } catch (error) {
    try {
      await cleanupBareDirectory(directory, directoryIdentity);
    } catch (cleanupError) {
      throw new AggregateError(
        [error, cleanupError],
        "Stage initialization failed with cleanup failure.",
      );
    }
    throw error;
  }
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

async function cleanupOwnedDirectory(state, hooks) {
  if (!(await ownsDirectory(state))) return false;
  if (hooks?.beforeQuarantineRename) {
    await hooks.beforeQuarantineRename(state);
  }
  const quarantine = path.join(
    path.dirname(state.directory),
    `.${path.basename(state.directory)}.quarantine-${randomUUID()}`,
  );
  await rename(state.directory, quarantine);
  const moved = { ...state, directory: quarantine };
  if (!(await ownsDirectory(moved))) {
    throw new Error(
      "Owned cleanup candidate changed while quarantining; quarantine preserved.",
    );
  }
  await rm(quarantine, { recursive: true, force: true });
  return true;
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

async function reserveDestination(projectsRoot, slug, hooks) {
  const destination = path.join(projectsRoot, slug);
  try {
    await mkdir(destination);
  } catch (error) {
    if (error?.code === "EEXIST") {
      throw new Error(`Destination already exists: projects/${slug}`);
    }
    throw error;
  }
  const directoryIdentity = await lstat(destination);
  try {
    if (hooks?.afterDestinationMkdir)
      await hooks.afterDestinationMkdir({
        directory: destination,
        directoryIdentity,
      });
    const markerName = ".safrs-project-wizard-incomplete";
    const marker = randomUUID();
    const markerPath = path.join(destination, markerName);
    await writeFile(markerPath, marker, { encoding: "utf8", flag: "wx" });
    if (hooks?.afterDestinationMarkerWrite)
      await hooks.afterDestinationMarkerWrite({
        directory: destination,
        directoryIdentity,
        marker,
        markerPath,
      });
    const markerIdentity = await lstat(markerPath);
    if (hooks?.afterDestinationMarkerStat) {
      await hooks.afterDestinationMarkerStat({
        directory: destination,
        directoryIdentity,
        marker,
        markerPath,
        markerIdentity,
      });
    }
    return {
      directory: destination,
      directoryIdentity,
      marker,
      markerIdentity,
      markerName,
    };
  } catch (error) {
    try {
      await cleanupBareDirectory(destination, directoryIdentity);
    } catch (cleanupError) {
      throw new AggregateError(
        [error, cleanupError],
        "Destination reservation failed with cleanup failure.",
      );
    }
    throw error;
  }
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

  const reservation = await reserveDestination(projectsRoot, slug, hooks);
  try {
    await writeCapsuleFiles(files, reservation.directory);
    await removeCompletionMarker(reservation);
    return reservation;
  } catch (error) {
    await cleanupOwnedDirectory(reservation, hooks);
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
  const lock = await acquireSlugLock(canonicalProjectsRoot, slug, hooks);
  let stage;
  let published = false;
  let primaryError;
  const cleanupErrors = [];
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
      hooks,
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
  } catch (error) {
    primaryError = error;
  } finally {
    if (stage && !published) {
      try {
        await cleanupOwnedDirectory(stage, hooks);
      } catch (error) {
        cleanupErrors.push(error);
      }
    }
    if (stage && published && process.platform !== "win32") {
      try {
        await cleanupOwnedDirectory(stage, hooks);
      } catch (error) {
        cleanupErrors.push(error);
      }
    }
    try {
      await releaseSlugLock(lock);
    } catch (error) {
      cleanupErrors.push(error);
    }
  }
  if (primaryError && cleanupErrors?.length) {
    throw new AggregateError(
      [primaryError, ...cleanupErrors],
      "Project capsule failed with cleanup errors.",
    );
  }
  if (primaryError) throw primaryError;
  if (cleanupErrors?.length)
    throw new AggregateError(cleanupErrors, "Project capsule cleanup failed.");
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
