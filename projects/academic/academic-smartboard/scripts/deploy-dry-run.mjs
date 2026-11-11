#!/usr/bin/env node
/**
 * Deploy dry-run capsule-local. Tanpa side effect produksi.
 *
 * Memverifikasi artefak deploy static-export kedua apps:
 *   1. apps/site/out dan apps/web/out ada dan berisi index.html.
 *   2. Setiap halaman HTML tidak mereferensikan path absolut mesin lokal.
 *   3. Ringkasan ukuran artefak dilaporkan.
 *
 * Exit 0 = artefak siap diserahkan ke static host mana pun.
 */
import { readdirSync, readFileSync, statSync } from "node:fs";
import { extname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = fileURLToPath(new URL("../", import.meta.url));
const TARGETS = [
  resolve(ROOT, "apps/site/out"),
  resolve(ROOT, "apps/web/out"),
];

let failures = 0;
const fail = (msg) => {
  failures += 1;
  console.error(`FAIL ${msg}`);
};

function walk(dir, out = []) {
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    const p = join(dir, entry.name);
    if (entry.isDirectory()) walk(p, out);
    else out.push(p);
  }
  return out;
}

for (const target of TARGETS) {
  let files;
  try {
    files = walk(target);
  } catch {
    fail(`${target} tidak ada — jalankan build dulu.`);
    continue;
  }
  if (!files.some((f) => f.endsWith("index.html"))) {
    fail(`${target} tidak berisi index.html.`);
    continue;
  }
  let bytes = 0;
  for (const f of files) bytes += statSync(f).size;
  // Deteksi kebocoran path build machine: drive path Windows nyata
  // (bukan artefak flight-data Next seperti `b:\"`) atau URL file://.
  const leak = /[A-Za-z]:(?:\\|\\\\)[A-Za-z0-9_.-]+(?:\\|\\\\)|file:\/\//;
  for (const f of files.filter((f) => extname(f) === ".html")) {
    if (leak.test(readFileSync(f, "utf8"))) {
      fail(`${f} mereferensikan path mesin lokal.`);
    }
  }
  console.log(
    `OK   ${target} — ${files.length} berkas, ${(bytes / 1024 / 1024).toFixed(1)} MB`,
  );
}

if (failures > 0) {
  console.error(`deploy dry-run GAGAL (${failures} masalah).`);
  process.exit(1);
}
console.log("deploy dry-run lolos: artefak static siap deploy.");
