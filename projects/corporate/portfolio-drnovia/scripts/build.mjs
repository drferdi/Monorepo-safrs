import { createHash } from "node:crypto";
import {
  chmod,
  copyFile,
  lstat,
  mkdir,
  readdir,
  readFile,
  rm,
  writeFile,
} from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const output = path.join(root, "dist");
const sourceDirectories = ["assets", "src", "styles", "vendor"];
const sourceFiles = ["favicon.ico", "index.html", "server.js"];

if (path.dirname(output) !== root || path.basename(output) !== "dist") {
  throw new Error(
    "Refusing to build outside the capsule-owned dist directory.",
  );
}

async function copyTree(source, destination, relativeRoot) {
  const entries = await readdir(source, { withFileTypes: true });
  for (const entry of entries.sort((first, second) =>
    first.name.localeCompare(second.name),
  )) {
    const sourcePath = path.join(source, entry.name);
    const destinationPath = path.join(destination, entry.name);
    const relative = path.posix.join(relativeRoot, entry.name);
    const info = await lstat(sourcePath);
    if (info.isSymbolicLink()) {
      throw new Error(`Build source contains a symbolic link: ${relative}`);
    }
    if (info.isDirectory()) {
      await mkdir(destinationPath);
      await copyTree(sourcePath, destinationPath, relative);
    } else if (info.isFile()) {
      await copyFile(sourcePath, destinationPath);
      await chmod(destinationPath, info.mode);
    } else {
      throw new Error(
        `Build source contains an unsupported entry: ${relative}`,
      );
    }
  }
}

async function artifactFiles(directory, prefix = "") {
  const files = [];
  const entries = await readdir(directory, { withFileTypes: true });
  for (const entry of entries.sort((first, second) =>
    first.name.localeCompare(second.name),
  )) {
    const relative = path.posix.join(prefix, entry.name);
    const candidate = path.join(directory, entry.name);
    if (entry.isDirectory()) {
      files.push(...(await artifactFiles(candidate, relative)));
    } else if (entry.isFile() && relative !== "build-manifest.json") {
      const content = await readFile(candidate);
      files.push({
        path: relative,
        bytes: content.length,
        sha256: createHash("sha256").update(content).digest("hex"),
      });
    } else {
      throw new Error(
        `Build artifact contains an unsupported entry: ${relative}`,
      );
    }
  }
  return files;
}

await rm(output, { recursive: true, force: true });
await mkdir(output);
for (const directory of sourceDirectories) {
  const destination = path.join(output, directory);
  await mkdir(destination);
  await copyTree(path.join(root, directory), destination, directory);
}
for (const file of sourceFiles) {
  const info = await lstat(path.join(root, file));
  if (!info.isFile() || info.isSymbolicLink()) {
    throw new Error(`Build source file is unsafe: ${file}`);
  }
  await copyFile(path.join(root, file), path.join(output, file));
}

const files = await artifactFiles(output);
await writeFile(
  path.join(output, "build-manifest.json"),
  `${JSON.stringify({ schemaVersion: 1, files }, null, 2)}\n`,
  "utf8",
);
console.log(`Build complete: dist (${files.length} deterministic files).`);
