import { randomUUID } from "node:crypto";
import {
  chmod,
  copyFile,
  lstat,
  mkdir,
  mkdtemp,
  readdir,
  readFile,
  realpath,
  rename,
  rm,
  writeFile,
} from "node:fs/promises";
import os from "node:os";
import path from "node:path";

function isWithin(candidate, boundary) {
  const relative = path.relative(boundary, candidate);
  return (
    relative === "" ||
    (!relative.startsWith("..") && !path.isAbsolute(relative))
  );
}

function sameIdentity(first, second) {
  return first.dev === second.dev && first.ino === second.ino;
}

function portableRelative(value) {
  return path.normalize(
    value.replaceAll("/", path.sep).replaceAll("\\", path.sep),
  );
}

function excluded(relative, exclusions) {
  const segments = relative.split(path.sep);
  if (segments.includes(".git")) return true;
  return exclusions.some(
    (item) => relative === item || relative.startsWith(`${item}${path.sep}`),
  );
}

async function assertRealDirectory(directory, label) {
  const info = await lstat(directory);
  if (!info.isDirectory() || info.isSymbolicLink()) {
    throw new Error(
      `${label} must be a real directory, not a symbolic link or reparse point.`,
    );
  }
  return info;
}

export async function assertSafeTree(root) {
  await assertRealDirectory(root, "Capsule root");
  const canonicalRoot = await realpath(root);

  async function visit(directory) {
    const entries = await readdir(directory, { withFileTypes: true });
    for (const entry of entries.sort((first, second) =>
      first.name.localeCompare(second.name),
    )) {
      const candidate = path.join(directory, entry.name);
      const info = await lstat(candidate);
      if (info.isSymbolicLink()) {
        throw new Error(
          `Capsule tree contains a symbolic link or reparse point: ${path.relative(root, candidate)}`,
        );
      }
      const canonical = await realpath(candidate);
      if (!isWithin(canonical, canonicalRoot)) {
        throw new Error(
          `Capsule tree escapes through a reparse point: ${path.relative(root, candidate)}`,
        );
      }
      if (info.isDirectory()) {
        await visit(candidate);
      } else if (!info.isFile()) {
        throw new Error(
          `Capsule tree contains an unsupported filesystem entry: ${path.relative(root, candidate)}`,
        );
      }
    }
  }

  await visit(root);
  return canonicalRoot;
}

export async function copyCapsule(source, destination, contract) {
  const canonicalSource = await assertSafeTree(source);
  await assertRealDirectory(destination, "Extraction destination");
  const canonicalDestination = await realpath(destination);
  const exclusions = [...contract.artifacts, ...contract.mutableStatePaths]
    .map(portableRelative)
    .sort();

  async function copyDirectory(sourceDirectory) {
    const entries = await readdir(sourceDirectory, { withFileTypes: true });
    for (const entry of entries.sort((first, second) =>
      first.name.localeCompare(second.name),
    )) {
      const sourcePath = path.join(sourceDirectory, entry.name);
      const relative = path.relative(source, sourcePath);
      if (excluded(relative, exclusions)) continue;
      const destinationPath = path.join(destination, relative);
      if (!isWithin(path.resolve(destinationPath), canonicalDestination)) {
        throw new Error(`Extraction target escapes destination: ${relative}`);
      }
      const sourceInfo = await lstat(sourcePath);
      if (sourceInfo.isSymbolicLink()) {
        throw new Error(
          `Capsule tree contains a symbolic link or reparse point: ${relative}`,
        );
      }
      const canonicalPath = await realpath(sourcePath);
      if (!isWithin(canonicalPath, canonicalSource)) {
        throw new Error(
          `Capsule source escapes through a reparse point: ${relative}`,
        );
      }
      if (sourceInfo.isDirectory()) {
        await mkdir(destinationPath);
        await copyDirectory(sourcePath);
      } else if (sourceInfo.isFile()) {
        await copyFile(sourcePath, destinationPath);
        await chmod(destinationPath, sourceInfo.mode);
      } else {
        throw new Error(
          `Capsule tree contains an unsupported filesystem entry: ${relative}`,
        );
      }
    }
  }

  await copyDirectory(source);
  await assertSafeTree(destination);
}

export async function createExtraction() {
  const temporaryRoot = await mkdtemp(
    path.join(os.tmpdir(), "safrs-project-standalone-"),
  );
  const rootIdentity = await assertRealDirectory(
    temporaryRoot,
    "Temporary extraction root",
  );
  const canonicalTemporary = await realpath(os.tmpdir());
  const canonicalRoot = await realpath(temporaryRoot);
  if (
    !isWithin(canonicalRoot, canonicalTemporary) ||
    canonicalRoot === canonicalTemporary
  ) {
    throw new Error(
      "Temporary extraction root is not safely contained by the OS temporary directory.",
    );
  }
  const marker = randomUUID();
  const markerPath = path.join(
    temporaryRoot,
    ".safrs-project-standalone-owner",
  );
  await writeFile(markerPath, marker, { encoding: "utf8", flag: "wx" });
  const markerIdentity = await lstat(markerPath);
  const capsule = path.join(temporaryRoot, "capsule");
  const home = path.join(temporaryRoot, "home");
  await mkdir(capsule);
  await mkdir(home);
  await mkdir(path.join(home, "tmp"));
  return {
    root: temporaryRoot,
    rootIdentity,
    canonicalTemporary,
    marker,
    markerIdentity,
    markerPath,
    capsule,
    home,
  };
}

async function ownsExtraction(state) {
  try {
    const rootInfo = await lstat(state.root);
    const markerInfo = await lstat(state.markerPath);
    if (
      !rootInfo.isDirectory() ||
      rootInfo.isSymbolicLink() ||
      !markerInfo.isFile() ||
      markerInfo.isSymbolicLink() ||
      !sameIdentity(rootInfo, state.rootIdentity) ||
      !sameIdentity(markerInfo, state.markerIdentity)
    ) {
      return false;
    }
    const canonicalRoot = await realpath(state.root);
    return (
      isWithin(canonicalRoot, state.canonicalTemporary) &&
      canonicalRoot !== state.canonicalTemporary &&
      (await readFile(state.markerPath, "utf8")) === state.marker
    );
  } catch (error) {
    if (error?.code === "ENOENT") return false;
    throw error;
  }
}

export async function removeExtraction(state) {
  if (!(await ownsExtraction(state))) {
    throw new Error("Refusing cleanup because extraction ownership changed.");
  }
  const quarantine = path.join(
    path.dirname(state.root),
    `.safrs-project-standalone-quarantine-${randomUUID()}`,
  );
  await rename(state.root, quarantine);
  const movedState = {
    ...state,
    root: quarantine,
    markerPath: path.join(quarantine, path.basename(state.markerPath)),
  };
  if (!(await ownsExtraction(movedState))) {
    throw new Error(
      "Refusing cleanup because extraction changed during quarantine.",
    );
  }
  await rm(quarantine, { recursive: true, force: true });
}
