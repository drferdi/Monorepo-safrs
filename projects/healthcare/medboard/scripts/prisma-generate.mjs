// Menjalankan `prisma generate` tanpa database: prisma.config.ts membaca DATABASE_URL,
// jadi placeholder lokal dipakai bila variabel itu belum di-set. Tidak ada koneksi dibuat.
import { spawnSync } from "node:child_process";

process.env.DATABASE_URL ||= "postgresql://placeholder:placeholder@127.0.0.1:5432/placeholder?schema=public";
const result = spawnSync(process.execPath, ["./node_modules/prisma/build/index.js", "generate"], {
  stdio: "inherit",
  env: process.env,
});
process.exit(result.status ?? 1);
