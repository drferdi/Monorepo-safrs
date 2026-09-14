import { strict as assert } from "node:assert";
import { existsSync } from "node:fs";
import { dirname, join } from "node:path";
import { test } from "node:test";
import { fileURLToPath } from "node:url";

const out = join(dirname(fileURLToPath(import.meta.url)), "..", "out");
const ROUTES = [
  "",
  "login",
  "dashboard",
  "pengajar",
  "tutorial",
  "master/murid",
  "master/tim",
  "master/orang-tua",
  "master/sekolah",
  "master/mata-pelajaran",
  "master/jenjang",
  "master/tahun-ajaran",
  "jadwal",
  "sesi",
  "sesi/placeholder",
  "evaluasi",
  "akademik/kurikulum",
  "akademik/keselarasan",
  "akademik/cakupan",
  "akademik/perkembangan",
  "akademik/perkembangan/placeholder",
  "keuangan/honor",
  "keuangan/payroll",
  "keuangan/pembayaran",
  "keuangan/tarif",
  "lembur",
  "pengumuman",
  "komunikasi",
  "tasks",
  "laporan",
  "aktivasi-tutor",
  "aktivasi-owner",
];

for (const route of ROUTES) {
  test(`route /${route} diekspor`, () => {
    assert.ok(
      existsSync(join(out, route, "index.html")),
      `hilang: ${route}/index.html`,
    );
  });
}
