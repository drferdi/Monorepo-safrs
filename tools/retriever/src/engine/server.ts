import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';

const MIME_TYPES: Record<string, string> = {
  '.html': 'text/html; charset=utf-8',
  '.htm': 'text/html; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.js': 'application/javascript; charset=utf-8',
  '.mjs': 'application/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.gif': 'image/gif',
  '.webp': 'image/webp',
  '.ico': 'image/x-icon',
  '.woff': 'font/woff',
  '.woff2': 'font/woff2',
  '.ttf': 'font/ttf',
  '.otf': 'font/otf',
  '.wasm': 'application/wasm',
  '.riv': 'application/octet-stream',
  '.glb': 'model/gltf-binary',
  '.gltf': 'model/gltf+json',
  '.bin': 'application/octet-stream',
  '.hdr': 'image/vnd.radiance',
  '.mp4': 'video/mp4',
  '.webm': 'video/webm',
  '.mp3': 'audio/mpeg',
  '.wav': 'audio/wav',
  '.pdf': 'application/pdf',
  '.txt': 'text/plain; charset=utf-8',
  '.md': 'text/markdown; charset=utf-8'
};

export interface PreviewServerInstance {
  server: http.Server;
  port: number;
  url: string;
  rootDir: string;
  close: () => Promise<void>;
}

let activeServer: PreviewServerInstance | null = null;

export function findSiteRoot(targetPath: string): string {
  const resolved = path.resolve(targetPath);
  if (!fs.existsSync(resolved)) return resolved;

  const stat = fs.statSync(resolved);
  if (stat.isFile()) {
    return path.dirname(resolved);
  }

  // 1. If this directory itself has _next, it's definitely the site root
  if (fs.existsSync(path.join(resolved, '_next'))) {
    return resolved;
  }

  // 2. Deep search for the actual site folder (avoiding HTTrack wrapper index.html)
  function searchDeep(curr: string, depth = 0): string | null {
    if (depth > 3) return null;
    try {
      const entries = fs.readdirSync(curr, { withFileTypes: true });

      // Priority A: Folder containing _next or public asset directories
      for (const entry of entries) {
        if (entry.isDirectory() && entry.name !== 'hts-cache' && entry.name !== 'markdown_corpus') {
          const sub = path.join(curr, entry.name);
          if (fs.existsSync(path.join(sub, '_next'))) {
            return sub;
          }
        }
      }

      // Priority B: Folder containing index.html that is NOT the HTTrack wrapper
      for (const entry of entries) {
        if (entry.isDirectory() && entry.name !== 'hts-cache' && entry.name !== 'markdown_corpus') {
          const sub = path.join(curr, entry.name);
          const idxPath = path.join(sub, 'index.html');
          if (fs.existsSync(idxPath)) {
            const headSnippet = fs.readFileSync(idxPath, 'utf-8').slice(0, 4000);
            if (!headSnippet.includes('HTTrack Website Copier')) {
              return sub;
            }
          }
          const deep = searchDeep(sub, depth + 1);
          if (deep) return deep;
        }
      }
    } catch {}
    return null;
  }

  const found = searchDeep(resolved);
  return found || resolved;
}

export function startPreviewServer(targetDir: string, port = 0): Promise<PreviewServerInstance> {
  return new Promise((resolve, reject) => {
    if (activeServer) {
      activeServer.server.close();
      activeServer = null;
    }

    const rootDir = findSiteRoot(targetDir);

    const server = http.createServer((req, res) => {
      // Enable CORS for all assets
      res.setHeader('Access-Control-Allow-Origin', '*');
      res.setHeader('Access-Control-Allow-Methods', 'GET, HEAD, OPTIONS');

      if (req.method === 'OPTIONS') {
        res.writeHead(204);
        res.end();
        return;
      }

      const reqUrl = req.url || '/';
      const cleanPath = decodeURIComponent(reqUrl.split('?')[0]);
      let filePath = path.join(rootDir, cleanPath);

      // Prevent directory traversal attacks
      if (!filePath.startsWith(rootDir)) {
        res.writeHead(403);
        res.end('Access Denied');
        return;
      }

      // If directory, look for index.html
      if (fs.existsSync(filePath) && fs.statSync(filePath).isDirectory()) {
        filePath = path.join(filePath, 'index.html');
      }

      // If no file extension and not existing, try appending .html
      if (!fs.existsSync(filePath) && !path.extname(filePath)) {
        if (fs.existsSync(filePath + '.html')) {
          filePath = filePath + '.html';
        }
      }

      // Intelligent HTTrack 4-hex suffix fallback (e.g. 1c21992ade81f5f5.js <-> 1c21992ade81f5f534dc.js)
      if (!fs.existsSync(filePath)) {
        const ext = path.extname(filePath);
        const base = path.basename(filePath, ext);
        const dir = path.dirname(filePath);
        if (fs.existsSync(dir)) {
          const candidates = [
            path.join(dir, `${base}34dc${ext}`),
            path.join(dir, `${base.replace(/[0-9a-fA-F]{4}$/, '')}${ext}`)
          ];
          for (const cand of candidates) {
            if (fs.existsSync(cand) && fs.statSync(cand).isFile()) {
              filePath = cand;
              break;
            }
          }
        }
      }

      if (fs.existsSync(filePath) && fs.statSync(filePath).isFile()) {
        const ext = path.extname(filePath).toLowerCase();
        const contentType = MIME_TYPES[ext] || 'application/octet-stream';

        if (ext === '.html') {
          let html = fs.readFileSync(filePath, 'utf-8');
          const unblockSnippet = `\n<style id="retriever-preview-unblock">
  #site-nav { clip-path: none !important; opacity: 1 !important; display: grid !important; }
  output[aria-label="Loading"] { display: none !important; }
  [style*="clip-path:inset(0 100% 0 0)"] { clip-path: none !important; }
  [style*="filter:blur"], [style*="filter: blur"] { filter: none !important; opacity: 1 !important; }
  span[style*="color:#c7cccb"], span[style*="color: #c7cccb"] { color: #24363F !important; }
</style>\n`;
          if (html.includes('<head>') && !html.includes('retriever-preview-unblock')) {
            html = html.replace('<head>', '<head>' + unblockSnippet);
          }
          res.writeHead(200, {
            'Content-Type': 'text/html; charset=utf-8',
            'Content-Length': Buffer.byteLength(html)
          });
          res.end(html);
          return;
        }

        res.writeHead(200, { 'Content-Type': contentType });
        fs.createReadStream(filePath).pipe(res);
      } else {
        res.writeHead(404, { 'Content-Type': 'text/plain; charset=utf-8' });
        res.end(`404 Not Found: ${cleanPath}`);
      }
    });

    server.on('error', (err) => {
      reject(err);
    });

    server.listen(port, '127.0.0.1', () => {
      const address = server.address();
      const actualPort = typeof address === 'object' && address ? address.port : port;
      const url = `http://127.0.0.1:${actualPort}`;

      activeServer = {
        server,
        port: actualPort,
        url,
        rootDir,
        close: () =>
          new Promise<void>((resClose) => {
            server.close(() => resClose());
          })
      };

      resolve(activeServer);
    });
  });
}

export function stopPreviewServer(): Promise<void> {
  if (!activeServer) return Promise.resolve();
  const current = activeServer;
  activeServer = null;
  return current.close();
}
