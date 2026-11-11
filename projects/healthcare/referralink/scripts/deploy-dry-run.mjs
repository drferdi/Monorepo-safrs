#!/usr/bin/env node
/**
 * Deploy dry-run capsule-local, tanpa efek samping: tidak menyentuh jaringan dan
 * tidak membaca kredensial. Memastikan artefak build Vite produksi ada, lalu
 * memastikan nama variabel server tidak bocor ke bundel klien.
 */
import { existsSync, readdirSync, readFileSync, statSync } from "node:fs";
import { join } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = fileURLToPath(new URL("../", import.meta.url));
const BUILD = join(ROOT, "dist");
const SERVER_ONLY = ["OPENAI_API_KEY", "GEMINI_API_KEY", "SANDBOX_AUTH_SECRET", "UPSTASH_REDIS_REST_TOKEN", "UPSTASH_VECTOR_REST_TOKEN", "RESEND_API_KEY"];

if (!existsSync(join(BUILD, "index.html"))) {
  console.error("FAIL dist/index.html tidak ada; jalankan build dulu.");
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

const leaks = walk(BUILD).flatMap((file) => {
  const text = readFileSync(file, "utf8");
  return SERVER_ONLY.filter((name) => text.includes(name)).map((name) => `${name} in ${file}`);
});
if (leaks.length > 0) {
  for (const leak of leaks) console.error(`FAIL ${leak}`);
  process.exit(1);
}
console.log("Deploy dry-run passed: production artifact present, no server-only names in client bundle.");
