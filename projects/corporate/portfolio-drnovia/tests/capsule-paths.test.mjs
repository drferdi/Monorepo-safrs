import assert from "node:assert/strict";
import { existsSync } from "node:fs";
import { dirname, join } from "node:path";
import { test } from "node:test";
import { fileURLToPath } from "node:url";

const capsule = join(dirname(fileURLToPath(import.meta.url)), "..");

const required = [
  "AGENTS.md",
  "README.md",
  "SECURITY.md",
  "SUPPORT.md",
  "CONTRIBUTING.md",
  "CODE_OF_CONDUCT.md",
  "CHANGELOG.md",
  "ROADMAP.md",
  "docs/README.md",
  "docs/architecture.md",
  "docs/data.md",
  "docs/testing.md",
  "docs/overview.md",
  "docs/quickstart.md",
  "docs/security.md",
  "docs/decisions.md",
  "tests/README.md",
  "package.json",
  "server.js",
  "index.html",
  "favicon.ico",
  "assets/favicon.svg",
  "assets/favicon-32.png",
  "assets/hero-deepsea.jpg",
  "assets/hero-dolphin.jpg",
  "assets/hero-dolphin.webm",
  "assets/bg-beach-dramatic.jpg",
  "src/app.js",
  "src/portfolio-markup.js",
];

for (const relative of required) {
  test(`capsule path exists: ${relative}`, () => {
    assert.equal(existsSync(join(capsule, relative)), true, relative);
  });
}
