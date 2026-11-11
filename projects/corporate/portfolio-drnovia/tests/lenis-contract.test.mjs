import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { test } from "node:test";
import { fileURLToPath } from "node:url";

const capsule = join(dirname(fileURLToPath(import.meta.url)), "..");
const site = capsule;

function read(relative) {
  return readFileSync(join(site, relative), "utf8");
}

test("Lenis vendor is pinned 1.3.26 and exposes globalThis.Lenis", () => {
  const source = read("vendor/lenis.min.js");
  assert.match(source, /1\.3\.26/);
  assert.match(source, /globalThis\.Lenis/);
  assert.doesNotMatch(source, /sourceMappingURL/);
});

test("index.html loads local Lenis before app.js", () => {
  const html = read("index.html");
  const lenisAt = html.indexOf("vendor/lenis.min.js");
  const appAt = html.indexOf("src/app.js");
  assert.ok(lenisAt > 0, "Lenis script tag");
  assert.ok(appAt > lenisAt, "app.js after Lenis");
  assert.match(html, /styles\/lenis\.css/);
});

test("app.js binds Lenis to the Framer Content-Wrapper, not window", () => {
  const app = read("src/app.js");
  assert.match(app, /querySelector\(["']\.framer-bpy7lj["']\)/);
  assert.match(app, /wrapper:\s*wrapper/);
  assert.match(app, /lerp:\s*0\.12/);
  assert.doesNotMatch(app, /wrapper:\s*window/);
  assert.match(app, /new LenisCtor/);
});

test("server.js keeps resolved files under the site root", () => {
  const server = read("server.js");
  assert.match(server, /full\.startsWith\(path\.resolve\(root\)\)/);
  assert.match(server, /writeHead\(403\)/);
});
