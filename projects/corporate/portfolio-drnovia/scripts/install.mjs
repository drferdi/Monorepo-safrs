import { lstat, readFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const requiredFiles = [
  "index.html",
  "server.js",
  "src/app.js",
  "src/portfolio-markup.js",
  "styles/framer.css",
  "styles/lenis.css",
  "styles/novia.css",
  "vendor/react.production.min.js",
  "vendor/react-dom.production.min.js",
  "vendor/lenis.min.js",
];

const major = Number(process.versions.node.split(".")[0]);
if (major !== 24) {
  throw new Error(
    `NOVIA STUDIO requires Node.js 24.x; received ${process.versions.node}.`,
  );
}

const manifest = JSON.parse(
  await readFile(path.join(root, "package.json"), "utf8"),
);
for (const field of [
  "dependencies",
  "devDependencies",
  "peerDependencies",
  "optionalDependencies",
]) {
  if (manifest[field] !== undefined) {
    throw new Error(
      `Dependency-free install forbids package.json field ${field}.`,
    );
  }
}

for (const relative of requiredFiles) {
  const info = await lstat(path.join(root, relative));
  if (!info.isFile() || info.isSymbolicLink()) {
    throw new Error(`Required vendored runtime file is unsafe: ${relative}`);
  }
}

console.log(
  `Install verified: Node ${process.versions.node}, ${requiredFiles.length} capsule-owned runtime files.`,
);
