const http = require("node:http");
const fs = require("node:fs");
const path = require("node:path");

const root = __dirname;
const port = Number(process.env.PORT || 4173);
const host = process.env.HOST || "127.0.0.1";
const mime = {
  ".html": "text/html; charset=utf-8",
  ".js": "application/javascript; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".svg": "image/svg+xml",
  ".ico": "image/x-icon",
  ".webp": "image/webp",
  ".webm": "video/webm",
  ".mp4": "video/mp4",
  ".woff2": "font/woff2",
};

function safeFile(urlPath) {
  const clean = decodeURIComponent(urlPath.split("?")[0]).replace(/^\/+/, "");
  const rel = clean || "index.html";
  const full = path.resolve(root, rel);
  if (!full.startsWith(path.resolve(root))) return null;
  return full;
}

const server = http.createServer((req, res) => {
  let file = safeFile(req.url || "/");
  if (!file) {
    res.writeHead(403);
    return res.end("Forbidden");
  }
  fs.stat(file, (err, stat) => {
    if (err || !stat.isFile()) file = path.join(root, "index.html");
    fs.readFile(file, (readErr, data) => {
      if (readErr) {
        res.writeHead(500);
        return res.end("Server error");
      }
      const ext = path.extname(file).toLowerCase();
      const noCacheExt = ext === ".html" || ext === ".js" || ext === ".css";
      res.writeHead(200, {
        "Content-Type": mime[ext] || "application/octet-stream",
        "Cache-Control": noCacheExt ? "no-cache" : "public, max-age=3600",
      });
      res.end(data);
    });
  });
});

server.listen(port, host, () => {
  console.log(`NOVIA STUDIO React running at http://${host}:${port}`);
});
