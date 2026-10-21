// Public code, private data (Gaffer, 2026-10-19): scripts/export-split.mjs turns the capsule into a public code tree
// and a private data tree. Run on byte-identical script copies in a temporary git repository.
import assert from "node:assert/strict";
import { test } from "node:test";
import { execFileSync, spawnSync } from "node:child_process";
import { copyFileSync, existsSync, mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join, resolve } from "node:path";
import { isPrivate } from "../scripts/private-data.mjs";

test("private paths cover the database, verification evidence, internal notes and the beta server setup, not the code", () => {
  for (const file of ["theoracle/ssot/sentrapedia-knowledge-ssot.json", "theoracle/index/chunks.jsonl", "theoracle/index/vectors.f32", "theoracle/index/manifest.json", "oracle/sentrapedia.json", "docs/verification/x.json", ".agents/HANDOFF.md", "oracle-ii/x.sqlite-shm", "deploy/beta/update.sh", "aadi/service/DESIGN.md"]) assert.equal(isPrivate(file), true, file);
  for (const file of ["src/lib/theoracle-grounding.ts", "oracle/sentrapedia.sample.json", "scripts/export-split.mjs", "README.md", "LICENSE", "aadi/service/app.py", "tests/public-data.test.ts", "apps/site/source/index.html", "docs/data.md", "docs/verificationx.md", "Dockerfile"]) assert.equal(isPrivate(file), false, file);
});

const SAMPLE = '{"metadata":{"sample":true},"categories":[],"diseases":[]}\n';
const REAL = '{"metadata":{"version":"1.0.0"},"categories":[],"diseases":[]}\n';
function capsule() {
  const root = mkdtempSync(join(tmpdir(), "sentrapedia-split-"));
  const write = (file, content) => { mkdirSync(dirname(join(root, file)), { recursive: true }); writeFileSync(join(root, file), content); };
  for (const name of ["export-split.mjs", "private-data.mjs"]) { mkdirSync(join(root, "scripts"), { recursive: true }); copyFileSync(resolve("scripts", name), join(root, "scripts", name)); }
  write("src/a.ts", "export const a = 1;\n");
  write("LICENSE", "license\n");
  write("oracle/sentrapedia.json", REAL);
  write("oracle/sentrapedia.sample.json", SAMPLE);
  write("theoracle/index/chunks.jsonl", '{"id":"1","text":"passage"}\n');
  write("theoracle/index/vectors.f32", Buffer.from(new Float32Array([1, 0]).buffer));
  write(".agents/HANDOFF.md", "notes\n");
  write("docs/data.md", "data\n");
  execFileSync("git", ["init", "-q"], { cwd: root });
  execFileSync("git", ["add", "-A"], { cwd: root });
  write("untracked.env", "SECRET=1\n");
  return root;
}
const run = (root, ...args) => spawnSync(process.execPath, ["scripts/export-split.mjs", ...args], { cwd: root, encoding: "utf8" });

test("export-split writes tracked code to public and the database to data", () => {
  const root = capsule(); const out = mkdtempSync(join(tmpdir(), "sentrapedia-out-"));
  try {
    const result = run(root, out);
    assert.equal(result.status, 0, result.stderr);
    const pub = join(out, "public"), data = join(out, "data");
    assert.equal(readFileSync(join(pub, "src/a.ts"), "utf8"), "export const a = 1;\n");
    assert.equal(readFileSync(join(pub, "oracle/sentrapedia.json"), "utf8"), SAMPLE);
    assert.ok(existsSync(join(pub, "scripts/export-split.mjs")) && existsSync(join(pub, "LICENSE")) && existsSync(join(pub, "docs/data.md")));
    for (const file of ["theoracle/index/chunks.jsonl", "theoracle/index/vectors.f32", ".agents/HANDOFF.md", "untracked.env"]) assert.ok(!existsSync(join(pub, file)), file);
    assert.equal(readFileSync(join(data, "oracle/sentrapedia.json"), "utf8"), REAL);
    for (const file of ["theoracle/index/chunks.jsonl", "theoracle/index/vectors.f32", ".agents/HANDOFF.md", "README.md"]) assert.ok(existsSync(join(data, file)), file);
    for (const file of ["src/a.ts", "untracked.env", "LICENSE"]) assert.ok(!existsSync(join(data, file)), file);
  } finally { rmSync(root, { recursive: true, force: true }); rmSync(out, { recursive: true, force: true }); }
});

test("export-split refuses a non-empty output, an output inside the capsule and an LFS pointer", () => {
  const root = capsule(); const out = mkdtempSync(join(tmpdir(), "sentrapedia-out-"));
  try {
    writeFileSync(join(out, "old.txt"), "x");
    assert.notEqual(run(root, out).status, 0);
    assert.notEqual(run(root, join(root, "export")).status, 0);
    assert.notEqual(run(root).status, 0);
    rmSync(join(out, "old.txt"));
    writeFileSync(join(root, "theoracle/index/vectors.f32"), "version https://git-lfs.github.com/spec/v1\noid sha256:abc\nsize 8\n");
    const pointer = run(root, out);
    assert.notEqual(pointer.status, 0);
    assert.match(pointer.stderr, /LFS/);
  } finally { rmSync(root, { recursive: true, force: true }); rmSync(out, { recursive: true, force: true }); }
});
