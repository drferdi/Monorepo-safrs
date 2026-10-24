// Splits the capsule into two folders (Gaffer, 2026-10-19: public code, private database):
//   <out>/public  every file git tracks except the private ones; the clinical catalogue is replaced by the sample
//   <out>/data    the private files (scripts/private-data.mjs) with the same paths, ready for the private data repository
// Copies tracked files, never writes inside the capsule, and stops before copying if any file is a Git LFS pointer.
// theoracle/index/vectors.f32 is the one exception: since 2026-10-25 it is not in git at all
// (scripts/theoracle-index.mjs), so it is copied from the working tree into <out>/data, where the data
// repository keeps the whole index together.
// Usage, from the capsule folder: node scripts/export-split.mjs <empty folder outside the capsule>
import { execFileSync } from "node:child_process";
import { closeSync, copyFileSync, existsSync, mkdirSync, openSync, readSync, readdirSync, statSync, writeFileSync } from "node:fs";
import { dirname, isAbsolute, join, relative, resolve } from "node:path";
import { isPrivate, SAMPLE_CATALOG } from "./private-data.mjs";

const fail = message => { console.error(`export-split: ${message}`); process.exit(1); };
const capsule = process.cwd();
if (!process.argv[2]) fail("give an empty output folder outside the capsule.");
const out = resolve(process.argv[2]);
const where = relative(capsule, out);
if (!where || (!where.startsWith("..") && !isAbsolute(where))) fail("the output folder must be outside the capsule.");
if (existsSync(out) && readdirSync(out).length) fail("the output folder must be empty.");

const files = execFileSync("git", ["ls-files", "-z"], { cwd: capsule, encoding: "utf8" }).split("\0").filter(file => file && existsSync(join(capsule, file)) && statSync(join(capsule, file)).isFile());
if (!files.length) fail("git lists no tracked files here; run this from the capsule folder.");
if (!files.includes(SAMPLE_CATALOG.from)) fail(`${SAMPLE_CATALOG.from} is missing or not tracked.`);
const isPointer = file => { const fd = openSync(file, "r"); const head = Buffer.alloc(40); const size = readSync(fd, head, 0, 40, 0); closeSync(fd); return head.subarray(0, size).toString("utf8").startsWith("version https://git-lfs"); };
const pointers = files.filter(file => isPointer(join(capsule, file)));
if (pointers.length) fail(`${pointers.length} file(s) are Git LFS pointers, for example ${pointers[0]}; run "git lfs pull" first.`);

const count = { public: 0, data: 0 };
for (const file of files) {
  const side = isPrivate(file) ? "data" : "public";
  const target = join(out, side, file);
  mkdirSync(dirname(target), { recursive: true });
  copyFileSync(join(capsule, file), target);
  count[side]++;
}
copyFileSync(join(capsule, SAMPLE_CATALOG.from), join(out, "public", SAMPLE_CATALOG.to));
mkdirSync(join(out, "data"), { recursive: true });
// The generated vectors: untracked since 2026-10-25, so git lists them nowhere, but the data side is
// incomplete without them.
const vectors = join(capsule, "theoracle/index/vectors.f32");
if (existsSync(vectors)) {
  if (isPointer(vectors)) fail('theoracle/index/vectors.f32 is a Git LFS pointer; run "npm run knowledge:install" first.');
  mkdirSync(join(out, "data", "theoracle", "index"), { recursive: true });
  copyFileSync(vectors, join(out, "data", "theoracle", "index", "vectors.f32"));
  count.data++;
} else {
  console.warn('export-split: theoracle/index/vectors.f32 is not installed here, so the data folder has no vectors; run "npm run knowledge:install".');
}
writeFileSync(join(out, "data", "README.md"), "# Sentrapedia private data\n\nConfidential. Not covered by the public Sentrapedia licence and not for redistribution.\n\nThe folders mirror the paths of the Sentrapedia code repository. To build with the data, copy this folder's contents over a checkout of the code repository before `npm run build` (or `docker build`).\n\n`theoracle/index/vectors.f32` is generated from `chunks.jsonl` and is not kept in the code repository's git history; `npm run knowledge:install` fetches the same bytes from the pinned release artefact.\n");
writeFileSync(join(out, "data", ".gitattributes"), "*.zip filter=lfs diff=lfs merge=lfs -text\n");
console.log(`export-split: ${count.public} file(s) to ${join(out, "public")}, ${count.data} file(s) to ${join(out, "data")}; the public catalogue is the fictional sample.`);
