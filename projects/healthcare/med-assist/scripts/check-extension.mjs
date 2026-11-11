#!/usr/bin/env node
/**
 * "Run" untuk ekstensi: memuat hasil build seperti Chrome memuat ekstensi unpacked.
 * Memeriksa manifest MV3 di .output/chrome-mv3-dev dan memastikan setiap berkas yang
 * dirujuk manifest (service worker, side panel, content script, ikon) serta setiap
 * script/stylesheet yang dirujuk halaman HTML ekstensi benar-benar ada.
 * Exit 0 = ekstensi siap dimuat lewat chrome://extensions.
 */
import { existsSync, readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";
import { fileURLToPath } from "node:url";

const OUT = fileURLToPath(new URL("../.output/chrome-mv3-dev/", import.meta.url));
const failures = [];
const need = (relative, why) => {
  if (!existsSync(join(OUT, relative))) failures.push(`${why}: ${relative}`);
};

if (!existsSync(join(OUT, "manifest.json"))) {
  console.error("FAIL .output/chrome-mv3-dev/manifest.json tidak ada; jalankan build dulu.");
  process.exit(1);
}
const manifest = JSON.parse(readFileSync(join(OUT, "manifest.json"), "utf8"));

if (manifest.manifest_version !== 3) failures.push("manifest_version harus 3");
need(manifest.background?.service_worker ?? "background.js", "service worker");
need(manifest.side_panel?.default_path ?? "sidepanel.html", "side panel");
for (const icon of Object.values(manifest.icons ?? {})) need(icon, "icon");
for (const script of manifest.content_scripts ?? []) {
  for (const file of script.js ?? []) need(file, "content script");
}

for (const page of readdirSync(OUT).filter((name) => name.endsWith(".html"))) {
  const html = readFileSync(join(OUT, page), "utf8");
  for (const [, ref] of html.matchAll(/(?:src|href)="\/?([^"#?:]+\.(?:js|css))"/g)) {
    need(ref, `aset di ${page}`);
  }
}

if (failures.length > 0) {
  for (const failure of failures) console.error(`FAIL ${failure}`);
  process.exit(1);
}
console.log(`Extension loads: ${manifest.name} ${manifest.version} (MV3), all referenced files present.`);
