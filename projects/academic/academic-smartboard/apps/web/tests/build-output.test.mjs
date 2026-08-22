import { strict as assert } from "node:assert";
import { existsSync } from "node:fs";
import { dirname, join } from "node:path";
import { test } from "node:test";
import { fileURLToPath } from "node:url";

const out = join(dirname(fileURLToPath(import.meta.url)), "..", "out");
const ROUTES = ["", "login", "master/murid"];

for (const route of ROUTES) {
  test(`route /${route} diekspor`, () => {
    assert.ok(
      existsSync(join(out, route, "index.html")),
      `hilang: ${route}/index.html`,
    );
  });
}
