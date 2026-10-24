import { appendFileSync, closeSync, mkdirSync, openSync, readSync, statSync, writeFileSync, writeSync } from "node:fs";
import { createHash } from "node:crypto";
import { join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

// Keep each private GitHub artifact below the connected download tool's 512 MiB limit.
export function splitReleaseArtifact(input, directory, partBytes = 256 * 1024 * 1024) {
  const size = statSync(input).size;
  if (!Number.isSafeInteger(partBytes) || partBytes < 1 || size < 1 || Math.ceil(size / partBytes) > 4) throw new Error("Image archive must fit in one to four bounded parts");
  mkdirSync(directory);
  const source = openSync(input, "r");
  const archiveHash = createHash("sha256");
  const parts = [];
  const buffer = Buffer.alloc(Math.min(partBytes, 1024 * 1024));
  try {
    let position = 0;
    while (position < size) {
      const file = `image.tar.part-${String(parts.length).padStart(2, "0")}`;
      const target = openSync(join(directory, file), "wx");
      const hash = createHash("sha256");
      let bytes = 0;
      try {
        while (bytes < partBytes && position < size) {
          const count = readSync(source, buffer, 0, Math.min(buffer.length, partBytes - bytes, size - position), position);
          if (count === 0) throw new Error("Image archive changed during splitting");
          const payload = buffer.subarray(0, count);
          let written = 0;
          while (written < count) written += writeSync(target, payload, written, count - written);
          hash.update(payload); archiveHash.update(payload);
          bytes += count; position += count;
        }
      } finally { closeSync(target); }
      parts.push({ file, bytes, sha256: hash.digest("hex") });
    }
  } finally { closeSync(source); }
  if (statSync(input).size !== size) throw new Error("Image archive changed during splitting");
  const manifest = { bytes: size, sha256: archiveHash.digest("hex"), parts };
  writeFileSync(join(directory, "manifest.json"), JSON.stringify(manifest, null, 2) + "\n", { flag: "wx" });
  return manifest;
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const manifest = splitReleaseArtifact(process.argv[2], process.argv[3]);
  appendFileSync(process.env.GITHUB_OUTPUT, `parts=${manifest.parts.length}\n`);
  console.log(`Private image prepared in ${manifest.parts.length} verified parts.`);
}
