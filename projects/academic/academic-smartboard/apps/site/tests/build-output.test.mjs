import { strict as assert } from "node:assert";
import { existsSync } from "node:fs";
import { dirname, join } from "node:path";
import { test } from "node:test";
import { fileURLToPath } from "node:url";

const out = join(dirname(fileURLToPath(import.meta.url)), "..", "out");
const ROUTES = [
  "",
  "cara-belajar",
  "tentang",
  "wawasan",
  "program/pemetaan-belajar",
  "program/pendampingan-personal",
  "program/pemantauan-perkembangan",
  "smartboard",
  "kebijakan-privasi",
  "ketentuan-layanan",
];
for (const route of ROUTES) {
  test(`route /${route} diekspor`, () => {
    assert.ok(
      existsSync(join(out, route, "index.html")),
      `hilang: ${route}/index.html`,
    );
  });
}
test("tidak ada referensi vendor aeline/temlis di output", async () => {
  const { readFileSync, readdirSync } = await import("node:fs");
  const walk = (d) =>
    readdirSync(d, { withFileTypes: true }).flatMap((e) =>
      e.isDirectory() ? walk(join(d, e.name)) : [join(d, e.name)],
    );
  const offenders = walk(out)
    .filter((f) => /\.(html|js|css|txt)$/.test(f))
    // \b ditambahkan: regex verbatim dari brief (/temlis|aeline/i) false-positive
    // pada "ItemList" (mis. DataTransferItemList) di chunk runtime Next.js sendiri
    // ("temLis" cocok tanpa word boundary) — bukan kebocoran referensi vendor asli.
    .filter((f) => /\b(?:temlis|aeline)/i.test(readFileSync(f, "utf8")));
  assert.deepEqual(offenders, []);
});
