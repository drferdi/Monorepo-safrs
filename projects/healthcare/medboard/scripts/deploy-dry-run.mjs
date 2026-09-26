#!/usr/bin/env node
/**
 * Deploy dry-run capsule-local, tanpa efek samping: tidak menyentuh jaringan dan
 * tidak membaca kredensial. Memastikan artefak build Next.js produksi ada, lalu
 * memastikan nama variabel server tidak bocor ke bundel klien.
 */
import { existsSync, readdirSync, readFileSync, statSync } from "node:fs";
import { join } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = fileURLToPath(new URL("../", import.meta.url));
const BUILD = join(ROOT, ".next");
// DATABASE_URL tidak diperiksa: halaman panduan menyebut NAMA variabel itu sebagai teks.
const SERVER_ONLY = ["CREW_ACCESS_SECRET", "CREW_ACCESS_AUTOMATION_TOKEN", "DEEPSEEK_API_KEY", "GROQ_API_KEY", "PERPLEXITY_API_KEY", "LIVEKIT_API_SECRET", "RESEND_API_KEY", "WHATSAPP_CLOUD_API_TOKEN"];

if (!existsSync(join(BUILD, "BUILD_ID"))) {
  console.error("FAIL .next/BUILD_ID tidak ada; jalankan build dulu.");
  process.exit(1);
}

function walk(dir, out = []) {
  for (const name of readdirSync(dir)) {
    const full = join(dir, name);
    if (statSync(full).isDirectory()) walk(full, out);
    else if (full.endsWith(".js")) out.push(full);
  }
  return out;
}

const leaks = walk(join(BUILD, "static")).flatMap((file) => {
  const text = readFileSync(file, "utf8");
  return SERVER_ONLY.filter((name) => text.includes(name)).map((name) => `${name} in ${file}`);
});
if (leaks.length > 0) {
  for (const leak of leaks) console.error(`FAIL ${leak}`);
  process.exit(1);
}
console.log("Deploy dry-run passed: production artifact present, no server-only names in client bundle.");
