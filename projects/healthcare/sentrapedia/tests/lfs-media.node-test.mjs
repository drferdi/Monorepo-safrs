import assert from "node:assert/strict";
import { test } from "node:test";
import { execFileSync } from "node:child_process";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";

// Tech-debt row 36: video and WebP media go through Git LFS, so a re-render does not add a permanent blob to history.
export const lfsMediaExtensions = ["mp4", "webm", "webp"];
const capsule = fileURLToPath(new URL("../", import.meta.url));
const git = (...args) => execFileSync("git", args, { cwd: capsule, encoding: "utf8" });

test("every tracked mp4, webm and webp file in the capsule is stored in Git LFS", () => {
  const tracked = git("ls-files", "-z", "--", ...lfsMediaExtensions.map(ext => `*.${ext}`)).split("\0").filter(Boolean);
  // The blob in the index is what a commit stores: for an LFS file it is a small pointer, not the media bytes.
  const blobs = execFileSync("git", ["cat-file", "--batch"], { cwd: capsule, input: tracked.map(path => `:./${path}`).join("\n") + "\n", maxBuffer: 1 << 30 });
  const plain = [];
  for (let offset = 0, i = 0; i < tracked.length; i++) {
    const headerEnd = blobs.indexOf(10, offset);
    const size = Number(blobs.subarray(offset, headerEnd).toString().split(" ")[2]);
    if (!blobs.subarray(headerEnd + 1, headerEnd + 1 + size).toString("latin1").startsWith("version https://git-lfs.github.com/spec/v1")) plain.push(tracked[i]);
    offset = headerEnd + 1 + size + 1;
  }
  assert.ok(tracked.length > 0);
  assert.deepEqual(plain, []);
});

test(".gitattributes routes the three media extensions through LFS", () => {
  const attributes = readFileSync(new URL("../.gitattributes", import.meta.url), "utf8");
  for (const ext of lfsMediaExtensions) assert.match(attributes, new RegExp(`^\\*\\.${ext} filter=lfs diff=lfs merge=lfs -text$`, "m"));
});
