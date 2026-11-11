#!/usr/bin/env node
/**
 * Deploy dry-run capsule-local. Tanpa efek samping produksi: tidak menyentuh
 * jaringan, tidak menulis ke luar capsule, tidak membaca kredensial.
 *
 * Yang diverifikasi:
 *   1. Artefak build apps/web/.next ada beserta manifest produksi wajibnya.
 *   2. Kontrak environment lengkap — setiap variabel di .env.example terdaftar,
 *      dan tidak ada NILAI yang ikut tercatat di sana.
 *   3. Tidak ada rahasia server yang bocor ke bundel klien: nama variabel
 *      sensitif tidak boleh muncul di apps/web/.next/static.
 *
 * Exit 0 = artefak layak diserahkan ke target deploy Node mana pun.
 */
import { existsSync, readdirSync, readFileSync, statSync } from "node:fs";
import { extname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = fileURLToPath(new URL("../", import.meta.url));
const BUILD = resolve(ROOT, "apps/web/.next");
const STATIC = join(BUILD, "static");
const ENV_EXAMPLE = resolve(ROOT, ".env.example");

/* Nama variabel yang hanya boleh hidup di server. Kebocorannya ke bundel
   klien adalah kegagalan rilis, bukan peringatan. */
const SERVER_ONLY = [
  "PAYLOAD_SECRET",
  "PREVIEW_SECRET",
  "DATABASE_URL",
  "S3_SECRET_ACCESS_KEY",
  "S3_ACCESS_KEY_ID",
];

let failures = 0;
const fail = (message) => {
  failures += 1;
  console.error(`FAIL ${message}`);
};

function walk(dir, out = []) {
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    const target = join(dir, entry.name);
    if (entry.isDirectory()) walk(target, out);
    else out.push(target);
  }
  return out;
}

/* 1 — artefak build */
if (!existsSync(BUILD)) {
  fail("apps/web/.next tidak ada — jalankan `pnpm run build` lebih dulu.");
} else {
  for (const manifest of ["BUILD_ID", "routes-manifest.json"]) {
    if (!existsSync(join(BUILD, manifest))) {
      fail(`apps/web/.next/${manifest} tidak ada — build tidak lengkap.`);
    }
  }
  const files = walk(BUILD);
  const bytes = files.reduce((sum, file) => sum + statSync(file).size, 0);
  console.log(
    `OK   apps/web/.next — ${files.length} berkas, ${(bytes / 1024 / 1024).toFixed(1)} MB`,
  );
}

/* 2 — kontrak environment */
if (!existsSync(ENV_EXAMPLE)) {
  fail(".env.example tidak ada — kontrak environment tidak terdokumentasi.");
} else {
  const lines = readFileSync(ENV_EXAMPLE, "utf8").split("\n");
  const names = [];
  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const [name, ...rest] = trimmed.split("=");
    names.push(name);
    if (rest.join("=").trim() !== "") {
      fail(`.env.example memuat nilai untuk ${name} — hanya nama yang boleh.`);
    }
  }
  for (const required of [
    "DATABASE_URL",
    "PAYLOAD_SECRET",
    "PREVIEW_SECRET",
    "NEXT_PUBLIC_SITE_URL",
  ]) {
    if (!names.includes(required)) {
      fail(`.env.example tidak mendeklarasikan ${required}.`);
    }
  }
  console.log(`OK   .env.example — ${names.length} variabel, 0 nilai tertulis`);
}

/* 3 — kebocoran rahasia ke bundel klien */
if (existsSync(STATIC)) {
  const clientFiles = walk(STATIC).filter((file) =>
    [".js", ".mjs", ".css", ".json"].includes(extname(file)),
  );
  let leaks = 0;
  for (const file of clientFiles) {
    const source = readFileSync(file, "utf8");
    for (const name of SERVER_ONLY) {
      if (source.includes(name)) {
        fail(`${file} menyebut variabel server-only ${name}.`);
        leaks += 1;
      }
    }
  }
  if (leaks === 0) {
    console.log(
      `OK   bundel klien — ${clientFiles.length} berkas dipindai, 0 rahasia server`,
    );
  }
}

if (failures > 0) {
  console.error(`\ndeploy dry-run GAGAL (${failures} masalah).`);
  process.exit(1);
}
console.log("\ndeploy dry-run lolos: artefak siap deploy, tanpa efek samping.");
