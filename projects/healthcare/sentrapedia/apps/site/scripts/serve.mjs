import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { createContactHandler } from './contact.mjs';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const types = { '.html': 'text/html; charset=utf-8', '.css': 'text/css', '.js': 'text/javascript', '.json': 'application/json', '.svg': 'image/svg+xml', '.jpg': 'image/jpeg', '.jpeg': 'image/jpeg', '.png': 'image/png', '.webp': 'image/webp', '.gif': 'image/gif', '.ico': 'image/x-icon', '.ttf': 'font/ttf', '.woff': 'font/woff', '.woff2': 'font/woff2', '.mp4': 'video/mp4', '.webm': 'video/webm' };

export function createServer(siteRoot = path.join(root, 'site')) {
  const resolvedRoot = path.resolve(siteRoot);
  const handleContact = createContactHandler();
  return http.createServer((req, res) => {
    let pathname;
    try { pathname = decodeURIComponent((req.url || '/').split('?')[0]); }
    catch { res.writeHead(400); res.end('Malformed path'); return; }
    if (req.method === 'POST' && pathname === '/api/contact') {
      handleContact(req, res).catch(() => {
        if (!res.headersSent) {
          res.writeHead(400, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ status: 'invalid', message: 'Formulir tidak valid.' }));
        }
      });
      return;
    }
    if (req.method !== 'GET' && req.method !== 'HEAD') {
      res.writeHead(501, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ status: 'unavailable', message: 'The contact backend is unavailable. Nothing was submitted or sent.' }));
      return;
    }
    let file = path.resolve(resolvedRoot, '.' + pathname);
    const relative = path.relative(resolvedRoot, file);
    if (relative.startsWith('..') || path.isAbsolute(relative) || pathname.includes('\\')) {
      res.writeHead(403); res.end('Forbidden'); return;
    }
    if (fs.existsSync(file) && fs.statSync(file).isDirectory()) file = path.join(file, 'index.html');
    if (!fs.existsSync(file) || !fs.statSync(file).isFile()) {
      res.writeHead(404); res.end('Not found'); return;
    }
    const stat = fs.statSync(file);
    const headers = { 'Content-Type': types[path.extname(file)] || 'application/octet-stream', 'Accept-Ranges': 'bytes', 'Cache-Control': 'no-cache', 'X-Content-Type-Options': 'nosniff' };
    // Restrict connections and submissions to the local origin.
    if (path.extname(file) === '.html') {
      headers['Content-Security-Policy'] = "connect-src 'self'; form-action 'self'; object-src 'none'";
    }
    let start = 0;
    let end = stat.size - 1;
    let status = 200;
    if (req.headers.range) {
      const range = /^bytes=(\d*)-(\d*)$/.exec(req.headers.range);
      if (!range || (!range[1] && !range[2])) {
        res.writeHead(416, { 'Content-Range': `bytes */${stat.size}` }); res.end(); return;
      }
      start = range[1] ? Number(range[1]) : Math.max(0, stat.size - Number(range[2]));
      end = range[1] && range[2] ? Math.min(Number(range[2]), end) : end;
      if (start > end || start >= stat.size) {
        res.writeHead(416, { 'Content-Range': `bytes */${stat.size}` }); res.end(); return;
      }
      status = 206;
      headers['Content-Range'] = `bytes ${start}-${end}/${stat.size}`;
    }
    if (stat.size === 0) {
      headers['Content-Length'] = 0;
      res.writeHead(200, headers);
      res.end();
      return;
    }
    headers['Content-Length'] = end - start + 1;
    res.writeHead(status, headers);
    if (req.method === 'HEAD') { res.end(); return; }
    fs.createReadStream(file, { start, end }).pipe(res);
  });
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const port = Number(process.env.PORT || 3401);
  const folder = process.argv[2] ? path.resolve(root, process.argv[2]) : path.join(root, 'site');
  const server = createServer(folder);
  server.on('error', error => { console.error(error.message); process.exitCode = 1; });
  server.listen(port, '127.0.0.1', () => console.log(`Sentrapedia: http://127.0.0.1:${port} (${folder})`));
}
