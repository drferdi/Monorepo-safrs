#!/usr/bin/env node
/**
 * Static server capsule-local untuk hasil `output: "export"` Next.js.
 * Tanpa dependency eksternal — kedua apps dilayani dari direktori out/:
 *
 *   site  -> http://127.0.0.1:4310  (apps/site/out)
 *   web   -> http://127.0.0.1:4311  (apps/web/out)
 *
 * `next start` tidak berlaku untuk static export; server ini adalah
 * komando `run` pada project.contract.json.
 */
import { createReadStream, existsSync, statSync } from "node:fs";
import { createServer } from "node:http";
import { extname, join, normalize, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = fileURLToPath(new URL("../", import.meta.url));
const HOST = "127.0.0.1";
const APPS = [
  { name: "site", dir: resolve(ROOT, "apps/site/out"), port: 4310 },
  { name: "web", dir: resolve(ROOT, "apps/web/out"), port: 4311 },
];

const MIME = {
  ".html": "text/html; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".svg": "image/svg+xml",
  ".png": "image/png",
  ".webp": "image/webp",
  ".ico": "image/x-icon",
  ".woff2": "font/woff2",
  ".txt": "text/plain; charset=utf-8",
  ".xml": "application/xml; charset=utf-8",
};

function resolveFile(dir, urlPath) {
  const clean = normalize(decodeURIComponent(urlPath)).replace(/^([/\\])+/, "");
  const base = join(dir, clean);
  if (!base.startsWith(dir)) return null; // path traversal
  const candidates = [base, `${base}.html`, join(base, "index.html")];
  for (const p of candidates) {
    if (existsSync(p) && statSync(p).isFile()) return p;
  }
  return null;
}

for (const app of APPS) {
  if (!existsSync(app.dir)) {
    console.error(`[serve] ${app.name}: ${app.dir} tidak ada — jalankan build dulu.`);
    process.exit(1);
  }
  createServer((req, res) => {
    const file = resolveFile(app.dir, new URL(req.url, `http://${HOST}`).pathname);
    if (!file) {
      const notFound = join(app.dir, "404.html");
      res.writeHead(404, { "content-type": "text/html; charset=utf-8" });
      if (existsSync(notFound)) createReadStream(notFound).pipe(res);
      else res.end("404");
      return;
    }
    res.writeHead(200, {
      "content-type": MIME[extname(file)] ?? "application/octet-stream",
    });
    createReadStream(file).pipe(res);
  }).listen(app.port, HOST, () => {
    console.log(`[serve] ${app.name}: http://${HOST}:${app.port}`);
  });
}
